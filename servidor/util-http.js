/**
 * Utilitários de HTTP compartilhados.
 *
 * Por que este arquivo existe: `index.js` importa `api-lab.js`, e `api-lab.js`
 * precisava de `responderJSON`. Se ele importasse de volta do `index.js`,
 * teríamos uma DEPENDÊNCIA CIRCULAR (A importa B, B importa A). O JavaScript
 * até tolera isso em alguns casos, mas é uma fonte clássica de bugs sutis
 * ("undefined is not a function" no meio da inicialização).
 *
 * A solução de sempre: extrair o pedaço comum para um terceiro módulo, do qual
 * os dois dependem. Mesma ideia de um `utils.py` no Python.
 */

/** Responde JSON com os cabeçalhos corretos. */
export function responderJSON(res, status, dados) {
  const corpo = JSON.stringify(dados, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(corpo),
    // Cabeçalho didático: aparece no "Explorador de API" do laboratório.
    'X-Laboratorio': 'js-node',
  });
  res.end(corpo);
}

/**
 * Lê o corpo da requisição e devolve como objeto JSON.
 *
 * Em Node "cru", o corpo chega em PEDAÇOS (chunks), porque `req` é uma Stream.
 * O Express esconde isso com `express.json()` — mas vale ver uma vez como é.
 */
export function lerCorpoJSON(req) {
  return new Promise((resolve, reject) => {
    let bruto = '';
    req.on('data', (pedaco) => {
      bruto += pedaco;
      if (bruto.length > 1_000_000) {
        req.destroy();
        reject(new Error('Corpo da requisição grande demais'));
      }
    });
    req.on('end', () => {
      if (!bruto) return resolve({});
      try {
        resolve(JSON.parse(bruto));
      } catch {
        reject(new Error('JSON inválido no corpo da requisição'));
      }
    });
    req.on('error', reject);
  });
}
