/**
 * A thread que hospeda o PostgreSQL do laboratório.
 *
 * O banco é o PGlite: o PostgreSQL de verdade compilado para WebAssembly, que
 * roda dentro do processo do Node, sem instalar nada. Mesmo SQL, mesmo
 * planejador, mesmos tipos (JSONB, arrays, intervalos) e extensões (pgvector).
 *
 * POR QUE NUMA THREAD: o PGlite executa a consulta de forma síncrona. Um
 * `SELECT pg_sleep(600)` ou um produto cartesiano de milhões de linhas
 * travaria o servidor inteiro, e o `statement_timeout` não funciona aqui.
 * Numa thread, quem fica travada é ela; o servidor a encerra e sobe outra.
 *
 * ISOLAMENTO: cada execução roda numa CÓPIA do banco-base (`clone()`, ~150 ms).
 * Um bloco pode apagar tabelas, abrir e confirmar transações, criar índices:
 * nada vaza para o bloco seguinte, e toda lição parte do mesmo estado.
 */

import { parentPort } from 'node:worker_threads';
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite-pgvector';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';

import { ESQUEMA, DADOS } from './semente.js';

const EXTENSOES = { vector, pg_trgm };
const MAX_LINHAS = 200;

// Os tipos mais comuns, pelo identificador interno (OID) que o Postgres devolve.
const TIPOS = {
  16: 'boolean', 20: 'bigint', 21: 'smallint', 23: 'integer', 25: 'text', 114: 'json', 700: 'real', 701: 'double precision',
  1005: 'smallint[]', 1007: 'integer[]', 1009: 'text[]', 1016: 'bigint[]', 1021: 'real[]', 1022: 'double precision[]',
  1042: 'char', 1043: 'varchar', 1082: 'date', 1083: 'time', 1114: 'timestamp', 1184: 'timestamptz', 1186: 'interval',
  1700: 'numeric', 2950: 'uuid', 3802: 'jsonb', 3807: 'jsonb[]', 2249: 'record', 705: 'unknown', 26: 'oid', 19: 'name',
};

// Datas e horários chegam como o Postgres os escreve ("2026-03-03 07:37:00-04"),
// em vez de virarem `Date` do JavaScript: a lição de fuso horário depende disso.
const TEXTO_PURO = { 1082: (v) => v, 1083: (v) => v, 1114: (v) => v, 1184: (v) => v, 1186: (v) => v };

/** Tipos fora da tabela acima (enums, vector, tipos criados na lição): pergunta ao catálogo. */
async function nomesDeTipos(db, resultados) {
  const desconhecidos = [...new Set(resultados.flatMap((r) => r.fields.map((f) => f.dataTypeID)).filter((oid) => !TIPOS[oid]))];
  if (!desconhecidos.length) return new Map();
  const r = await db.query('SELECT oid::int AS oid, format_type(oid, NULL) AS nome FROM pg_type WHERE oid = ANY($1::oid[])', [desconhecidos]);
  return new Map(r.rows.map((l) => [l.oid, l.nome]));
}

// Uma sequência reserva 32 valores por vez. A cópia do banco se comporta como
// uma recuperação depois de queda, e pula os reservados: o próximo id sairia 34
// em vez de 5. Isto realinha cada sequência com o maior id da tabela.
const ACERTAR_SEQUENCIAS = `
DO $$
DECLARE c record;
BEGIN
  FOR c IN SELECT table_name, column_name FROM information_schema.columns
           WHERE table_schema = 'public' AND is_identity = 'YES' LOOP
    EXECUTE format('SELECT setval(pg_get_serial_sequence(%L, %L), coalesce((SELECT max(%I) FROM %I), 0) + 1, false)',
                   c.table_name, c.column_name, c.column_name, c.table_name);
  END LOOP;
END $$;`;

let base;
async function bancoBase() {
  if (!base) {
    const db = new PGlite({ extensions: EXTENSOES });
    await db.exec(ESQUEMA);
    await db.exec(DADOS);
    await db.exec('ANALYZE;'); // estatísticas em dia: os planos do EXPLAIN ficam realistas
    base = db;
  }
  return base;
}

/** Escreve um array como o Postgres o mostra: {a,b,NULL}. */
function emArray(lista) {
  const item = (x) => (x === null ? 'NULL' : Array.isArray(x) ? emArray(x) : typeof x === 'object' ? JSON.stringify(x) : String(x));
  return `{${lista.map(item).join(',')}}`;
}

/** Deixa um valor pronto para virar JSON e aparecer numa célula. */
function serializar(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'bigint') return v.toString();
  if (v instanceof Date) return v.toISOString();
  if (v instanceof Uint8Array) return `\\x${Buffer.from(v).toString('hex')}`;
  if (Array.isArray(v)) return emArray(v); // array do Postgres: {a,b,c}
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

/**
 * Divide um texto SQL em comandos, pelo ponto e vírgula.
 *
 * Não dá para usar `split(';')`: o ponto e vírgula pode estar dentro de um
 * texto ('a;b'), de um identificador ("a;b"), de um comentário ou de um corpo
 * de função entre cifrões ($$ ... $$). Este leitor anda caractere a caractere
 * sabendo em qual desses contextos está. Devolve cada comando com a posição
 * em que começa, para a mensagem de erro apontar o lugar certo.
 */
export function dividirComandos(sql) {
  const comandos = [];
  let inicio = 0;
  let i = 0;
  const fechar = (fim) => {
    const texto = sql.slice(inicio, fim);
    // só comentário e espaço não é um comando
    if (texto.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim()) comandos.push({ texto, inicio });
    inicio = fim + 1;
  };
  while (i < sql.length) {
    const c = sql[i];
    const dois = sql.slice(i, i + 2);
    if (dois === '--') {
      const fim = sql.indexOf('\n', i);
      i = fim === -1 ? sql.length : fim + 1;
    } else if (dois === '/*') {
      const fim = sql.indexOf('*/', i + 2);
      i = fim === -1 ? sql.length : fim + 2;
    } else if (c === "'" || c === '"') {
      i++;
      while (i < sql.length) {
        if (sql[i] === c && sql[i + 1] === c) i += 2; // aspas dobradas = aspas literais
        else if (sql[i] === c) break;
        else i++;
      }
      i++;
    } else if (c === '$') {
      const marca = /^\$[A-Za-z_]*\$/.exec(sql.slice(i))?.[0];
      if (marca) {
        const fim = sql.indexOf(marca, i + marca.length);
        i = fim === -1 ? sql.length : fim + marca.length;
      } else i++;
    } else if (c === ';') {
      fechar(i);
      i++;
    } else i++;
  }
  fechar(sql.length);
  return comandos;
}

async function executar(sql) {
  const inicio = Date.now();
  const copia = await (await bancoBase()).clone();
  const resultados = [];
  let erro;
  let preparo = 0;
  try {
    await copia.exec("SET TIME ZONE 'America/Campo_Grande';" + ACERTAR_SEQUENCIAS);
    preparo = Date.now() - inicio;

    // Um comando por vez: se o terceiro falhar, os dois primeiros já têm
    // resultado para mostrar. A sessão é a mesma, então BEGIN e COMMIT em
    // comandos separados funcionam como num cliente comum.
    for (const comando of dividirComandos(sql)) {
      try {
        const brutos = await copia.exec(comando.texto, { rowMode: 'array', parsers: TEXTO_PURO });
        const nomes = await nomesDeTipos(copia, brutos);
        for (const r of brutos) {
          resultados.push({
            campos: r.fields.map((f) => ({ nome: f.name, tipo: TIPOS[f.dataTypeID] ?? nomes.get(f.dataTypeID) ?? `oid ${f.dataTypeID}` })),
            linhas: r.rows.slice(0, MAX_LINHAS).map((linha) => linha.map(serializar)),
            total: r.rows.length,
            afetadas: r.affectedRows ?? 0,
          });
        }
      } catch (e) {
        erro = {
          mensagem: e.message,
          codigo: e.code, // SQLSTATE: 42P01 = tabela não existe, 23505 = unicidade violada...
          detalhe: e.detail,
          dica: e.hint,
          posicao: e.position ? comando.inicio + Number(e.position) : undefined,
        };
        break;
      }
    }
  } catch (e) {
    erro = { mensagem: `Falha interna do banco: ${e.message}` };
  } finally {
    await copia.close().catch(() => {});
  }
  return { ok: !erro, resultados, erro, ms: Date.now() - inicio - preparo };
}

parentPort.on('message', async ({ id, sql }) => {
  try {
    parentPort.postMessage({ id, ...(await executar(sql)) });
  } catch (e) {
    parentPort.postMessage({ id, ok: false, erro: { mensagem: `Falha interna do banco: ${e.message}` }, ms: 0 });
  }
});

// Monta o banco-base já na subida, para a primeira consulta não pagar por isso.
bancoBase().then(
  () => parentPort.postMessage({ pronto: true }),
  (e) => parentPort.postMessage({ pronto: false, erro: e.message }),
);
