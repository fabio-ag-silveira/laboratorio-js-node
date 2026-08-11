/**
 * Servidor de arquivos estáticos — o mínimo necessário, escrito à mão.
 *
 * É basicamente o que o `express.static()` faz por baixo dos panos, e o
 * equivalente ao `StaticFiles` do FastAPI / `runserver` do Django.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * O navegador precisa saber COMO interpretar cada arquivo. Ele decide isso
 * pelo cabeçalho Content-Type, não pela extensão. Se você mandar um .css como
 * "text/plain", o navegador ignora o estilo — um clássico de quem escreve
 * servidor na mão pela primeira vez.
 */
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

export async function servirEstatico(req, res, pastaBase) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let caminhoRelativo = decodeURIComponent(url.pathname);

  if (caminhoRelativo === '/') caminhoRelativo = '/index.html';

  // SEGURANÇA: sem isso, alguém pediria "/../../../.ssh/id_rsa" e o servidor
  // entregaria. Chama-se "path traversal". Resolvemos o caminho absoluto e
  // conferimos se ele continua dentro da pasta pública.
  const caminhoAbsoluto = path.resolve(pastaBase, '.' + caminhoRelativo);
  if (!caminhoAbsoluto.startsWith(path.resolve(pastaBase))) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('403 — Acesso negado');
  }

  try {
    const conteudo = await fs.readFile(caminhoAbsoluto);
    const extensao = path.extname(caminhoAbsoluto).toLowerCase();
    res.writeHead(200, {
      'Content-Type': TIPOS[extensao] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(conteudo);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404</h1><p>Arquivo não encontrado.</p>');
  }
}
