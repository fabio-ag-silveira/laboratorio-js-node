/**
 * Monta o servidor HTTP do laboratório — SEM colocá-lo para escutar.
 *
 * Separar "montar" de "escutar" é o truque que torna um servidor testável: os
 * testes e a ferramenta de verificação importam `criarServidor()` e sobem numa
 * porta aleatória, sem depender de nada rodando. Quem escuta na porta de
 * verdade é só o `index.js`.
 *
 * Tudo aqui usa apenas a biblioteca padrão do Node. Compare com o Python:
 *
 *      # Python (FastAPI)                  // JavaScript (Node puro)
 *      app = FastAPI()                     const servidor = createServer(handler)
 *      uvicorn.run(app, port=4000)         servidor.listen(4000)
 */

import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { servirEstatico } from './estatico.js';
import { executar, ambiente, LINGUAGENS } from './executores/index.js';
import { rotearLab } from './api-lab.js';
import { servirVendor, transformar, previaDisponivel } from './vendor.js';
import { responderJSON, lerCorpoJSON } from './util-http.js';
import { carregarTrilhas, resumir } from '../conteudo/index.js';

// __dirname não existe em módulos ESM. Esta é a receita padrão para recriá-lo.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PASTA_PUBLICA = path.join(__dirname, '..', 'publico');

export function criarServidor() {
  return createServer(async (req, res) => {
    // `new URL` precisa de uma base porque req.url vem só com o caminho ("/api/x").
    const url = new URL(req.url, `http://${req.headers.host}`);
    const rota = url.pathname;

    try {
      // ---- 1. Catálogo: só títulos, para a página inicial e o menu ---------
      if (rota === '/api/conteudo') {
        const trilhas = await carregarTrilhas();
        return responderJSON(res, 200, trilhas.map(resumir));
      }

      // ---- 2. Uma trilha inteira, com todos os blocos ----------------------
      if (rota.startsWith('/api/conteudo/')) {
        const id = rota.slice('/api/conteudo/'.length);
        const trilha = (await carregarTrilhas()).find((t) => t.id === id);
        if (!trilha) return responderJSON(res, 404, { erro: `Trilha "${id}" não existe` });
        return responderJSON(res, 200, trilha);
      }

      // ---- 3. Executor de código (Node, Python, C#) ------------------------
      if (rota === '/api/executar' && req.method === 'POST') {
        const { codigo, linguagem = 'node', tempo } = await lerCorpoJSON(req);
        if (typeof codigo !== 'string') {
          return responderJSON(res, 400, { erro: 'Envie { "linguagem": "...", "codigo": "..." }' });
        }
        if (!LINGUAGENS.includes(linguagem)) {
          return responderJSON(res, 400, { erro: `linguagem deve ser uma de: ${LINGUAGENS.join(', ')}` });
        }
        const resultado = await executar(linguagem, codigo, typeof tempo === 'number' ? tempo : undefined);
        return responderJSON(res, 200, resultado);
      }

      // ---- 4. O que está instalado nesta máquina ---------------------------
      if (rota === '/api/ambiente') {
        return responderJSON(res, 200, { ...(await ambiente()), previa: { ok: previaDisponivel(), instalar: 'npm install' } });
      }

      // ---- 5. Prévia de React: bibliotecas empacotadas e JSX → JS -----------
      if (rota.startsWith('/vendor/') && req.method === 'GET') {
        return servirVendor(req, res, rota);
      }
      if (rota === '/api/transformar' && req.method === 'POST') {
        const { codigo } = await lerCorpoJSON(req);
        if (typeof codigo !== 'string') return responderJSON(res, 400, { erro: 'Envie { "codigo": "..." }' });
        return responderJSON(res, 200, await transformar(codigo));
      }

      // ---- 6. A API REST de treino -----------------------------------------
      if (rota.startsWith('/api/lab')) {
        const corpo = ['POST', 'PUT', 'PATCH'].includes(req.method)
          ? await lerCorpoJSON(req).catch(() => null)
          : null;
        return rotearLab({ req, res, url, corpo });
      }

      // ---- 7. Qualquer outra coisa: arquivos da interface ------------------
      return servirEstatico(req, res, PASTA_PUBLICA);
    } catch (erro) {
      console.error('[erro]', erro);
      return responderJSON(res, 500, { erro: erro.message });
    }
  });
}
