/**
 * Executor de SQL: a ponte entre o servidor HTTP e a thread do banco.
 *
 * O banco mora em `trabalhador.js`. Aqui ficam três responsabilidades:
 *
 *   - subir a thread só quando alguém pedir SQL (o laboratório abre sem ela);
 *   - casar cada resposta com o pedido que a originou (um `id` por mensagem,
 *     porque a conversa com uma thread é assíncrona, como uma rede);
 *   - o TEMPO LIMITE: se a consulta não voltar, a thread é encerrada à força e
 *     a próxima consulta sobe uma nova. É o equivalente caseiro do
 *     `statement_timeout`, que o PGlite não tem.
 *
 * Sem a dependência instalada, devolve o comando de instalação em vez de quebrar.
 */

import { Worker } from 'node:worker_threads';
import { createRequire } from 'node:module';

const exigir = createRequire(import.meta.url);
const TEMPO_PADRAO_MS = 8000;

export function sqlDisponivel() {
  try {
    exigir.resolve('@electric-sql/pglite');
    exigir.resolve('@electric-sql/pglite-pgvector');
    return true;
  } catch {
    return false;
  }
}

let trabalhador = null;
let proximoId = 1;
const pendentes = new Map(); // id → { resolver, relogio }

function encerrar(motivo) {
  if (!trabalhador) return;
  const antigo = trabalhador;
  trabalhador = null;
  for (const { resolver, relogio } of pendentes.values()) {
    clearTimeout(relogio);
    resolver({ ok: false, erro: { mensagem: motivo }, ms: 0 });
  }
  pendentes.clear();
  antigo.terminate();
}

function obterTrabalhador() {
  if (trabalhador) return trabalhador;
  const novo = new Worker(new URL('./trabalhador.js', import.meta.url));
  novo.unref(); // não segura o processo aberto (os testes precisam terminar)
  novo.on('message', (m) => {
    if (m.id === undefined) return; // aviso de "pronto"
    const espera = pendentes.get(m.id);
    if (!espera) return;
    clearTimeout(espera.relogio);
    pendentes.delete(m.id);
    const { id, ...resposta } = m;
    espera.resolver(resposta);
  });
  novo.on('error', (e) => {
    if (trabalhador === novo) encerrar(`O banco parou com um erro: ${e.message}`);
  });
  trabalhador = novo;
  return novo;
}

/**
 * Roda um ou mais comandos SQL numa cópia descartável do banco do laboratório.
 * Devolve `{ ok, resultados: [{ campos, linhas, total, afetadas }], ms }`
 * ou `{ ok: false, erro: { mensagem, codigo, dica, posicao } }`.
 */
export function executarSQL(sql, tempoMs = TEMPO_PADRAO_MS) {
  if (!sqlDisponivel()) {
    return Promise.resolve({ ok: false, erro: { mensagem: 'O PostgreSQL do laboratório (PGlite) não está instalado.' }, instalar: 'npm install', ms: 0 });
  }
  return new Promise((resolver) => {
    const id = proximoId++;
    const t = obterTrabalhador();
    const relogio = setTimeout(() => {
      // A thread está presa na consulta: não adianta pedir, tem de encerrar.
      pendentes.delete(id);
      encerrar('O banco foi reiniciado porque outra consulta passou do tempo limite.');
      resolver({
        ok: false,
        expirou: true,
        erro: { mensagem: `A consulta passou de ${Math.round(tempoMs / 1000)} s e foi cancelada.`, dica: 'Um JOIN sem condição ou um laço sem fim costumam ser a causa.' },
        ms: tempoMs,
      });
    }, tempoMs);
    pendentes.set(id, { resolver, relogio });
    t.postMessage({ id, sql });
  });
}

/** Encerra a thread do banco. Usado pelos testes e pela ferramenta de verificação. */
export function fecharSQL() {
  encerrar('O banco foi encerrado.');
}
