/**
 * Prévia ao vivo de React: o que o servidor faz por ela.
 *
 * O navegador não entende JSX nem sabe o que é `import { useState } from 'react'`.
 * Num projeto real, quem resolve as duas coisas é o Vite. Aqui fazemos o mínimo,
 * à mão, com a mesma ferramenta que o Vite usa por baixo (o esbuild):
 *
 *   1. EMPACOTAR  o React inteiro num único arquivo ES (`/vendor/pacote.js`).
 *                 O React é publicado em CommonJS; o navegador só importa ESM.
 *   2. FACHADAS   `/vendor/react.js`, `/vendor/react-dom-client.js`... reexportam
 *                 pedaços do pacote. Um "import map" na página da prévia
 *                 (`/vendor/previa.html`) liga o nome `react` a essas URLs.
 *   3. TRANSFORMAR `POST /api/transformar` converte JSX/TSX em JavaScript puro.
 *
 * Por que UM pacote só e não um arquivo por biblioteca: se `react` e `react-dom`
 * fossem empacotados separados, cada um carregaria a própria cópia do React, e
 * os hooks quebrariam ("Invalid hook call"). É o erro clássico de React duplicado.
 *
 * As dependências são opcionais. Sem `npm install`, o resto do laboratório
 * funciona e a prévia mostra o comando que falta.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

import { responderJSON } from './util-http.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(__dirname, '..');
const exigir = createRequire(import.meta.url);

/** Cada biblioteca que a prévia pode importar: nome público → como aparece no pacote. */
const BIBLIOTECAS = {
  react: 'React',
  'react-dom': 'ReactDOM',
  'react-dom/client': 'ReactDOMClient',
  'react/jsx-runtime': 'JsxRuntime',
  'react/jsx-dev-runtime': 'JsxDevRuntime',
};

/**
 * `react-native` na prévia é o `react-native-web`: a mesma API (View, Text,
 * StyleSheet, FlatList...) implementada com elementos do navegador. É o que o
 * Expo usa para rodar um app no navegador. Só entra no pacote se estiver instalado.
 */
const APELIDOS_DE_PACOTE = { 'react-native': 'react-native-web' };
const pacoteDe = (nome) => APELIDOS_DE_PACOTE[nome] ?? nome;

const arquivoDe = (nome) => nome.replaceAll('/', '-') + '.js';

function tem(pacote) {
  try {
    exigir.resolve(pacote);
    return true;
  } catch {
    return false;
  }
}

if (tem('react-native-web')) BIBLIOTECAS['react-native'] = 'ReactNative';

export function previaDisponivel() {
  return tem('esbuild') && tem('react') && tem('react-dom');
}

export const INSTALAR_PREVIA = 'npm install';

let esbuildCarregado;
async function esbuild() {
  esbuildCarregado ??= import('esbuild');
  return esbuildCarregado;
}

// O empacotamento leva ~100 ms e o resultado não muda: guarda a promessa.
let pacotePronto;

async function empacotar() {
  const { build } = await esbuild();
  const entrada = Object.entries(BIBLIOTECAS)
    .map(([nome, apelido]) => `export * as ${apelido} from ${JSON.stringify(pacoteDe(nome))};`)
    .join('\n');

  const resultado = await build({
    stdin: { contents: entrada, resolveDir: RAIZ, loader: 'js' },
    bundle: true,
    format: 'esm',
    write: false,
    target: 'es2022',
    // "development" mantém as mensagens de erro completas do React — é o que
    // se quer num ambiente de estudo. Em produção seria "production".
    define: { 'process.env.NODE_ENV': '"development"' },
    logLevel: 'silent',
  });
  return resultado.outputFiles[0].text;
}

/** Quais nomes cada biblioteca exporta. Lido do próprio pacote, sem lista fixa. */
async function nomesExportados(nome) {
  const modulo = await import(pacoteDe(nome));
  const alvo = modulo.default && typeof modulo.default === 'object' ? modulo.default : modulo;
  return Object.keys(alvo).filter((k) => k !== 'default' && k !== '__esModule' && /^[A-Za-z_$][\w$]*$/.test(k));
}

async function fachada(nome) {
  const apelido = BIBLIOTECAS[nome];
  const nomes = await nomesExportados(nome);
  return [
    `import { ${apelido} as m } from './pacote.js';`,
    `const alvo = m.default ?? m;`,
    `export default alvo;`,
    `export const { ${nomes.join(', ')} } = alvo;`,
  ].join('\n');
}

/** O "import map" que liga cada nome de biblioteca ao arquivo empacotado. */
export function mapaDeImportacao() {
  const imports = { lab: '/vendor/lab.js' };
  for (const nome of Object.keys(BIBLIOTECAS)) imports[nome] = `/vendor/${arquivoDe(nome)}`;
  return { imports };
}

/**
 * A página que vai dentro do iframe da prévia.
 *
 * Ela é pedida por OUTRO nome de máquina (127.0.0.1 em vez de localhost, ou o
 * contrário). Mesmo servidor, mas para o navegador é outra ORIGEM, e origens
 * diferentes não enxergam o DOM nem o armazenamento uma da outra. É isolamento
 * de verdade sem precisar de um segundo servidor.
 *
 * A alternativa óbvia, `<iframe sandbox srcdoc>`, deixa o iframe com origem
 * "nula", e os navegadores atuais barram pedidos de uma origem nula para
 * endereços locais. Foi testado e descartado.
 */
function paginaDaPrevia() {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>prévia</title>
<link rel="stylesheet" href="/previa.css">
<script type="importmap">${JSON.stringify(mapaDeImportacao())}</script>
</head>
<body>
<div id="raiz"></div>
<script type="module" src="/js/previa/moldura.js"></script>
</body>
</html>`;
}

function responderJS(res, texto) {
  res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-cache' });
  res.end(texto);
}

/** GET /vendor/... */
export async function servirVendor(req, res, rota) {
  const arquivo = rota.slice('/vendor/'.length);

  // O módulo de apoio das lições (`import { ... } from 'lab'`) é código nosso.
  if (arquivo === 'lab.js') {
    return responderJS(res, await fs.readFile(path.join(RAIZ, 'publico', 'js', 'previa', 'lab.js'), 'utf8'));
  }

  if (!previaDisponivel()) {
    return responderJSON(res, 503, { erro: 'Dependências da prévia não instaladas', instalar: INSTALAR_PREVIA });
  }

  if (arquivo === 'previa.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    return res.end(paginaDaPrevia());
  }
  if (arquivo === 'pacote.js') {
    pacotePronto ??= empacotar();
    return responderJS(res, await pacotePronto);
  }
  const nome = Object.keys(BIBLIOTECAS).find((n) => arquivoDe(n) === arquivo);
  if (nome) return responderJS(res, await fachada(nome));

  return responderJSON(res, 404, { erro: `/vendor/${arquivo} não existe` });
}

/**
 * JSX/TSX → JavaScript. Devolve { js } ou { erro, linha, coluna }.
 *
 * `jsx: 'automatic'` é o modo moderno: `<div/>` vira `jsx('div', {})` importado
 * de `react/jsx-runtime`, e por isso o arquivo não precisa de `import React`.
 */
export async function transformar(codigo, { tsx = true } = {}) {
  if (!previaDisponivel()) return { erro: 'Dependências da prévia não instaladas', instalar: INSTALAR_PREVIA };
  const { transform } = await esbuild();
  try {
    const r = await transform(codigo, {
      loader: tsx ? 'tsx' : 'jsx',
      jsx: 'automatic',
      format: 'esm',
      target: 'es2022',
      sourcefile: 'App.tsx',
    });
    return { js: r.code };
  } catch (e) {
    const primeiro = e.errors?.[0];
    if (!primeiro) return { erro: e.message };
    return {
      erro: primeiro.text,
      linha: primeiro.location?.line,
      coluna: primeiro.location?.column,
      trecho: primeiro.location?.lineText,
    };
  }
}
