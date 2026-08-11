/**
 * Testes da API do laboratório.
 *
 * Isto não é só verificação: é o EXEMPLO REAL da lição "Testes automatizados"
 * e o modelo que você vai copiar no projeto final. Repare em três coisas:
 *
 *   1. subimos o servidor na porta 0 (o sistema escolhe uma livre) — assim os
 *      testes nunca brigam por porta com nada que esteja rodando;
 *   2. `before` sobe e `after` derruba, então o teste é autocontido;
 *   3. zero dependências: é tudo `node:test` + `node:assert`.
 *
 * Rode com:  npm test
 */

import test, { describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';

import { rotearLab } from '../servidor/api-lab.js';
import { lerCorpoJSON } from '../servidor/util-http.js';

let servidor;
let base;

before(async () => {
  servidor = createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const corpo = ['POST', 'PUT', 'PATCH'].includes(req.method)
      ? await lerCorpoJSON(req).catch(() => null)
      : null;
    rotearLab({ req, res, url, corpo });
  });

  servidor.listen(0);
  await new Promise((r) => servidor.once('listening', r));
  base = `http://localhost:${servidor.address().port}`;
});

after(() => servidor.close());

// Cada teste começa com os dados de exemplo recém-carregados.
beforeEach(() => fetch(`${base}/api/lab/reiniciar`, { method: 'POST' }));

/** Atalho para não repetir headers e JSON.stringify em todo teste. */
function pedir(rota, { metodo = 'GET', corpo, cabecalhos } = {}) {
  return fetch(base + rota, {
    method: metodo,
    headers: {
      ...(corpo ? { 'Content-Type': 'application/json' } : {}),
      ...cabecalhos,
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
}

const VALIDA = {
  classe: 'capacete',
  confianca: 0.91,
  caixa: [10, 20, 90, 120],
};

describe('GET /deteccoes', () => {
  test('lista tudo', async () => {
    const r = await pedir('/api/lab/deteccoes');
    assert.equal(r.status, 200);

    const corpo = await r.json();
    assert.equal(corpo.total, 6);
    assert.equal(corpo.itens.length, 6);
  });

  test('filtra por classe', async () => {
    const { itens } = await (await pedir('/api/lab/deteccoes?classe=pessoa')).json();
    assert.ok(itens.length > 0);
    assert.ok(itens.every((d) => d.classe === 'pessoa'));
  });

  test('filtra por confiança mínima', async () => {
    const { itens } = await (await pedir('/api/lab/deteccoes?min_conf=0.9')).json();
    assert.ok(itens.every((d) => d.confianca >= 0.9));
  });

  test('ordena por confiança decrescente', async () => {
    const { itens } = await (await pedir('/api/lab/deteccoes?ordenar=confianca')).json();
    const confs = itens.map((d) => d.confianca);
    assert.deepEqual(confs, [...confs].sort((a, b) => b - a));
  });

  test('limita a quantidade', async () => {
    const { itens } = await (await pedir('/api/lab/deteccoes?limite=2')).json();
    assert.equal(itens.length, 2);
  });
});

describe('GET /deteccoes/:id', () => {
  test('devolve 200 para id existente', async () => {
    const r = await pedir('/api/lab/deteccoes/1');
    assert.equal(r.status, 200);
    assert.equal((await r.json()).id, 1);
  });

  test('devolve 404 em JSON para id inexistente', async () => {
    const r = await pedir('/api/lab/deteccoes/9999');
    assert.equal(r.status, 404);
    assert.match(r.headers.get('content-type'), /json/);
    assert.ok((await r.json()).erro);
  });
});

describe('POST /deteccoes', () => {
  test('cria e devolve 201 com Location', async () => {
    const r = await pedir('/api/lab/deteccoes', { metodo: 'POST', corpo: VALIDA });
    assert.equal(r.status, 201);

    const criada = await r.json();
    assert.equal(r.headers.get('location'), `/api/lab/deteccoes/${criada.id}`);
    assert.equal(criada.classe, 'capacete');
    assert.ok(criada.criadoEm, 'deveria carimbar a data de criação');
  });

  test('aceita confianca igual a 0 (a armadilha do falsy)', async () => {
    const r = await pedir('/api/lab/deteccoes', {
      metodo: 'POST',
      corpo: { ...VALIDA, confianca: 0 },
    });
    assert.equal(r.status, 201);
    assert.equal((await r.json()).confianca, 0);
  });

  test('rejeita confianca fora de 0..1 com 400 e detalhes', async () => {
    const r = await pedir('/api/lab/deteccoes', {
      metodo: 'POST',
      corpo: { ...VALIDA, confianca: 5 },
    });
    assert.equal(r.status, 400);

    const corpo = await r.json();
    assert.ok(Array.isArray(corpo.detalhes));
    assert.match(corpo.detalhes.join(' '), /confianca/);
  });

  test('rejeita corpo vazio listando todos os campos faltando', async () => {
    const r = await pedir('/api/lab/deteccoes', { metodo: 'POST', corpo: {} });
    assert.equal(r.status, 400);
    assert.equal((await r.json()).detalhes.length, 3);
  });

  test('rejeita caixa que não é array de 4 números', async () => {
    const r = await pedir('/api/lab/deteccoes', {
      metodo: 'POST',
      corpo: { ...VALIDA, caixa: [1, 2] },
    });
    assert.equal(r.status, 400);
  });
});

describe('PATCH e PUT', () => {
  test('PATCH altera só o campo enviado', async () => {
    const antes = await (await pedir('/api/lab/deteccoes/1')).json();

    const r = await pedir('/api/lab/deteccoes/1', {
      metodo: 'PATCH',
      corpo: { confianca: 0.123 },
    });
    assert.equal(r.status, 200);

    const depois = await r.json();
    assert.equal(depois.confianca, 0.123);
    assert.equal(depois.classe, antes.classe, 'PATCH não deveria mexer na classe');
  });

  test('PATCH não deixa trocar o id', async () => {
    const r = await pedir('/api/lab/deteccoes/1', { metodo: 'PATCH', corpo: { id: 777 } });
    assert.equal((await r.json()).id, 1);
  });

  test('PUT exige o objeto completo', async () => {
    const r = await pedir('/api/lab/deteccoes/1', {
      metodo: 'PUT',
      corpo: { classe: 'colete' },
    });
    assert.equal(r.status, 400);
  });
});

describe('DELETE /deteccoes/:id', () => {
  test('devolve 204 sem corpo e remove de fato', async () => {
    const r = await pedir('/api/lab/deteccoes/2', { metodo: 'DELETE' });
    assert.equal(r.status, 204);
    assert.equal(await r.text(), '');

    assert.equal((await pedir('/api/lab/deteccoes/2')).status, 404);
  });

  test('devolve 404 ao remover o que não existe', async () => {
    const r = await pedir('/api/lab/deteccoes/9999', { metodo: 'DELETE' });
    assert.equal(r.status, 404);
  });
});

describe('rotas de apoio', () => {
  test('estatísticas agregam por classe', async () => {
    const stats = await (await pedir('/api/lab/estatisticas')).json();
    assert.equal(stats.total, 6);
    assert.equal(stats.porClasse.pessoa, 2);
    assert.ok(stats.confiancaMedia > 0 && stats.confiancaMedia <= 1);
  });

  test('rota protegida devolve 401 sem token', async () => {
    const r = await pedir('/api/lab/protegido');
    assert.equal(r.status, 401);
    assert.equal(r.headers.get('www-authenticate'), 'Bearer');
  });

  test('rota protegida devolve 200 com o token certo', async () => {
    const r = await pedir('/api/lab/protegido', {
      cabecalhos: { Authorization: 'Bearer segredo-do-lab' },
    });
    assert.equal(r.status, 200);
  });

  test('rota lenta respeita o parâmetro ms', async () => {
    const t0 = Date.now();
    const r = await pedir('/api/lab/lento?ms=300');
    assert.equal(r.status, 200);
    assert.ok(Date.now() - t0 >= 290, 'deveria ter demorado ~300ms');
  });

  test('rota desconhecida devolve 404 em JSON', async () => {
    const r = await pedir('/api/lab/nao-existe');
    assert.equal(r.status, 404);
    assert.ok((await r.json()).erro);
  });
});
