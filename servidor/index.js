/**
 * ============================================================================
 *  Laboratório JS — servidor
 * ============================================================================
 *
 *  Este arquivo é, ao mesmo tempo, a infraestrutura do laboratório E material
 *  de estudo. Ele usa APENAS a biblioteca padrão do Node (zero dependências),
 *  exatamente como você vai aprender na lição "HTTP do zero".
 *
 *  Compare com o Python que você já conhece:
 *
 *      # Python (FastAPI)                  // JavaScript (Node puro)
 *      app = FastAPI()                     const servidor = createServer(handler)
 *      uvicorn.run(app, port=3000)         servidor.listen(3000)
 *
 *  Rode com:  npm start
 * ============================================================================
 */

import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { servirEstatico } from './estatico.js';
import { executarNode } from './executor.js';
import { rotearLab } from './api-lab.js';
import { responderJSON, lerCorpoJSON } from './util-http.js';
import { trilha } from '../conteudo/index.js';

// __dirname não existe em módulos ESM. Esta é a receita padrão para recriá-lo.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PASTA_PUBLICA = path.join(__dirname, '..', 'publico');

// 4000 e não 3000: a porta 3000 é a preferida de quase todo projeto Node,
// então deixamos ela livre. Sobrescreva com  PORTA=5000 npm start  se quiser.
const PORTA = Number(process.env.PORTA ?? 4000);

const servidor = createServer(async (req, res) => {
  // `new URL` precisa de uma base porque req.url vem só com o caminho ("/api/x").
  const url = new URL(req.url, `http://${req.headers.host}`);
  const rota = url.pathname;

  try {
    // ---- 1. Conteúdo da trilha (todas as lições, como JSON) ---------------
    if (rota === '/api/conteudo') {
      return responderJSON(res, 200, trilha);
    }

    // ---- 2. Executor de código Node de verdade ----------------------------
    if (rota === '/api/executar' && req.method === 'POST') {
      const { codigo } = await lerCorpoJSON(req);
      if (typeof codigo !== 'string') {
        return responderJSON(res, 400, { erro: 'Envie { "codigo": "..." }' });
      }
      const resultado = await executarNode(codigo);
      return responderJSON(res, 200, resultado);
    }

    // ---- 3. A API REST de treino ------------------------------------------
    if (rota.startsWith('/api/lab')) {
      const corpo = ['POST', 'PUT', 'PATCH'].includes(req.method)
        ? await lerCorpoJSON(req).catch(() => null)
        : null;
      return rotearLab({ req, res, url, corpo });
    }

    // ---- 4. Qualquer outra coisa: arquivos da interface --------------------
    return servirEstatico(req, res, PASTA_PUBLICA);
  } catch (erro) {
    console.error('[erro]', erro);
    return responderJSON(res, 500, { erro: erro.message });
  }
});

servidor.listen(PORTA, '127.0.0.1', () => {
  const linha = '─'.repeat(52);
  console.log(`
┌${linha}┐
│  Laboratório JS + Node
│
│  Abra no navegador:  http://localhost:${PORTA}
│
│  Parar: Ctrl + C
└${linha}┘
`);
});
