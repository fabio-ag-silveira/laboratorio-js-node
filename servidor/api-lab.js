/**
 * ============================================================================
 *  API REST de treino — "Detecções"
 * ============================================================================
 *
 *  Uma API de verdade, rodando na sua máquina, para você praticar no
 *  Explorador de API do laboratório (e depois com fetch, curl, Postman...).
 *
 *  O domínio é propositalmente o SEU: uma API que guarda detecções de um
 *  modelo de visão computacional. Assim você não gasta energia entendendo o
 *  problema — só a mecânica do HTTP.
 *
 *  Rotas:
 *    GET    /api/lab/deteccoes            lista (aceita filtros por query)
 *    GET    /api/lab/deteccoes/:id        busca uma
 *    POST   /api/lab/deteccoes            cria           (valida! → 400)
 *    PATCH  /api/lab/deteccoes/:id        atualiza parcial
 *    PUT    /api/lab/deteccoes/:id        substitui
 *    DELETE /api/lab/deteccoes/:id        remove         (→ 204 sem corpo)
 *    GET    /api/lab/estatisticas         agregação
 *    GET    /api/lab/protegido            exige header Authorization (→ 401)
 *    GET    /api/lab/lento?ms=2000        demora de propósito (para async)
 *    GET    /api/lab/instavel             falha ~50% das vezes (→ 500)
 * ============================================================================
 */

import { responderJSON } from './util-http.js';

const CLASSES = ['pessoa', 'capacete', 'colete', 'empilhadeira', 'caixa'];

let proximoId = 1;

/** Banco de dados: um simples array na memória. Some quando o servidor cai. */
let deteccoes = [];

function semear() {
  deteccoes = [];
  proximoId = 1;
  const base = Date.parse('2026-08-11T08:00:00Z');
  const amostras = [
    ['pessoa', 0.94, [120, 80, 210, 400]],
    ['capacete', 0.88, [140, 60, 190, 110]],
    ['colete', 0.71, [125, 150, 215, 300]],
    ['empilhadeira', 0.97, [400, 200, 780, 520]],
    ['pessoa', 0.63, [810, 140, 890, 430]],
    ['caixa', 0.55, [300, 460, 380, 540]],
  ];
  for (const [classe, confianca, caixa] of amostras) {
    deteccoes.push({
      id: proximoId++,
      classe,
      confianca,
      caixa, // [x1, y1, x2, y2]
      camera: classe === 'empilhadeira' ? 'doca-02' : 'doca-01',
      criadoEm: new Date(base + proximoId * 60_000).toISOString(),
    });
  }
}
semear();

/** Valida o corpo de uma detecção. Devolve lista de erros (vazia = ok). */
function validar(corpo, { parcial = false } = {}) {
  const erros = [];
  if (!corpo || typeof corpo !== 'object') {
    return ['O corpo precisa ser um objeto JSON'];
  }

  const exige = (campo) => parcial === false || campo in corpo;

  if (exige('classe')) {
    if (typeof corpo.classe !== 'string' || !corpo.classe.trim()) {
      erros.push('classe: obrigatória, texto não vazio');
    } else if (!CLASSES.includes(corpo.classe)) {
      erros.push(`classe: precisa ser uma de ${CLASSES.join(', ')}`);
    }
  }

  if (exige('confianca')) {
    const c = corpo.confianca;
    if (typeof c !== 'number' || Number.isNaN(c) || c < 0 || c > 1) {
      erros.push('confianca: obrigatória, número entre 0 e 1');
    }
  }

  if (exige('caixa')) {
    const cx = corpo.caixa;
    const ok = Array.isArray(cx) && cx.length === 4 && cx.every((n) => typeof n === 'number');
    if (!ok) erros.push('caixa: obrigatória, array [x1, y1, x2, y2] de números');
  }

  return erros;
}

export function rotearLab({ req, res, url, corpo }) {
  const metodo = req.method;
  // "/api/lab/deteccoes/3" → ["deteccoes", "3"]
  const partes = url.pathname.replace('/api/lab', '').split('/').filter(Boolean);
  const [recurso, id] = partes;

  // ---- Rotas de apoio ------------------------------------------------------

  if (recurso === 'reiniciar' && metodo === 'POST') {
    semear();
    return responderJSON(res, 200, { ok: true, total: deteccoes.length });
  }

  if (recurso === 'estatisticas') {
    const porClasse = {};
    for (const d of deteccoes) porClasse[d.classe] = (porClasse[d.classe] ?? 0) + 1;
    const confiancas = deteccoes.map((d) => d.confianca);
    return responderJSON(res, 200, {
      total: deteccoes.length,
      porClasse,
      confiancaMedia: confiancas.length
        ? Number((confiancas.reduce((a, b) => a + b, 0) / confiancas.length).toFixed(4))
        : null,
    });
  }

  if (recurso === 'protegido') {
    const auth = req.headers.authorization;
    if (auth !== 'Bearer segredo-do-lab') {
      res.writeHead(401, {
        'Content-Type': 'application/json; charset=utf-8',
        // 401 educado avisa COMO se autenticar:
        'WWW-Authenticate': 'Bearer',
      });
      return res.end(
        JSON.stringify(
          {
            erro: 'Não autenticado',
            dica: 'Mande o cabeçalho: Authorization: Bearer segredo-do-lab',
          },
          null,
          2,
        ),
      );
    }
    return responderJSON(res, 200, { ok: true, mensagem: 'Você passou pela portaria.' });
  }

  if (recurso === 'lento') {
    const ms = Math.min(Number(url.searchParams.get('ms') ?? 1500), 10_000);
    return setTimeout(() => responderJSON(res, 200, { esperou: ms }), ms);
  }

  if (recurso === 'instavel') {
    if (Math.random() < 0.5) {
      return responderJSON(res, 500, { erro: 'Falha aleatória — tente de novo.' });
    }
    return responderJSON(res, 200, { ok: true, sorte: 'deu certo desta vez' });
  }

  // ---- CRUD de detecções ---------------------------------------------------

  if (recurso !== 'deteccoes') {
    return responderJSON(res, 404, { erro: `Rota desconhecida: ${url.pathname}` });
  }

  // --- Coleção: /api/lab/deteccoes
  if (!id) {
    if (metodo === 'GET') {
      let resultado = [...deteccoes];

      const classe = url.searchParams.get('classe');
      if (classe) resultado = resultado.filter((d) => d.classe === classe);

      const minConf = url.searchParams.get('min_conf');
      if (minConf) resultado = resultado.filter((d) => d.confianca >= Number(minConf));

      const camera = url.searchParams.get('camera');
      if (camera) resultado = resultado.filter((d) => d.camera === camera);

      const ordenar = url.searchParams.get('ordenar');
      if (ordenar === 'confianca') resultado.sort((a, b) => b.confianca - a.confianca);

      const limite = url.searchParams.get('limite');
      if (limite) resultado = resultado.slice(0, Number(limite));

      return responderJSON(res, 200, { total: resultado.length, itens: resultado });
    }

    if (metodo === 'POST') {
      const erros = validar(corpo);
      if (erros.length) {
        // 400 = "você errou o pedido". 422 também é usado; 400 basta aqui.
        return responderJSON(res, 400, { erro: 'Dados inválidos', detalhes: erros });
      }
      const nova = {
        id: proximoId++,
        classe: corpo.classe,
        confianca: corpo.confianca,
        caixa: corpo.caixa,
        camera: corpo.camera ?? 'doca-01',
        criadoEm: new Date().toISOString(),
      };
      deteccoes.push(nova);
      // 201 = criado. E o cabeçalho Location aponta para o recurso novo.
      res.writeHead(201, {
        'Content-Type': 'application/json; charset=utf-8',
        Location: `/api/lab/deteccoes/${nova.id}`,
      });
      return res.end(JSON.stringify(nova, null, 2));
    }

    res.writeHead(405, { Allow: 'GET, POST' });
    return res.end();
  }

  // --- Item: /api/lab/deteccoes/:id
  const indice = deteccoes.findIndex((d) => d.id === Number(id));
  if (indice === -1) {
    return responderJSON(res, 404, { erro: `Detecção ${id} não existe` });
  }

  if (metodo === 'GET') {
    return responderJSON(res, 200, deteccoes[indice]);
  }

  if (metodo === 'PATCH') {
    const erros = validar(corpo, { parcial: true });
    if (erros.length) return responderJSON(res, 400, { erro: 'Dados inválidos', detalhes: erros });
    // Spread: copia o antigo e sobrescreve só o que veio. É o `{**a, **b}`.
    deteccoes[indice] = { ...deteccoes[indice], ...corpo, id: deteccoes[indice].id };
    return responderJSON(res, 200, deteccoes[indice]);
  }

  if (metodo === 'PUT') {
    const erros = validar(corpo);
    if (erros.length) return responderJSON(res, 400, { erro: 'Dados inválidos', detalhes: erros });
    deteccoes[indice] = {
      id: deteccoes[indice].id,
      classe: corpo.classe,
      confianca: corpo.confianca,
      caixa: corpo.caixa,
      camera: corpo.camera ?? 'doca-01',
      criadoEm: deteccoes[indice].criadoEm,
    };
    return responderJSON(res, 200, deteccoes[indice]);
  }

  if (metodo === 'DELETE') {
    deteccoes.splice(indice, 1);
    // 204 = deu certo e NÃO tem corpo de resposta. Repare: res.end() vazio.
    res.writeHead(204);
    return res.end();
  }

  res.writeHead(405, { Allow: 'GET, PATCH, PUT, DELETE' });
  return res.end();
}
