/**
 * Catálogo de trilhas.
 *
 * Cada subpasta de `conteudo/` que tiver um `index.js` exportando `trilha` vira
 * uma trilha do laboratório. A descoberta é automática de propósito: assim as
 * trilhas não disputam um arquivo central de registro, e dá para escrever duas
 * ao mesmo tempo sem conflito.
 *
 * `import()` com caminho calculado é o `importlib.import_module()` do Python.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PASTA = path.dirname(fileURLToPath(import.meta.url));

let cache = null;

/** Carrega todas as trilhas, na ordem do campo `ordem`. */
export async function carregarTrilhas() {
  if (cache) return cache;

  const entradas = await fs.readdir(PASTA, { withFileTypes: true });
  const trilhas = [];

  for (const entrada of entradas) {
    if (!entrada.isDirectory()) continue;
    const arquivo = path.join(PASTA, entrada.name, 'index.js');
    try {
      await fs.access(arquivo);
    } catch {
      continue; // pasta sem index.js não é trilha
    }
    // No Windows, import() de caminho absoluto exige URL file://
    const modulo = await import(pathToFileURL(arquivo).href);
    if (modulo.trilha) trilhas.push(modulo.trilha);
  }

  trilhas.sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99));
  cache = trilhas;
  return trilhas;
}

/**
 * Versão enxuta para a página inicial e o menu: só títulos, sem os blocos.
 * O conteúdo completo de uma trilha só viaja quando ela é aberta.
 */
export function resumir(trilha) {
  return {
    id: trilha.id,
    ordem: trilha.ordem,
    titulo: trilha.titulo,
    subtitulo: trilha.subtitulo,
    icone: trilha.icone,
    cor: trilha.cor,
    ponte: trilha.ponte,
    estado: trilha.estado ?? (trilha.modulos.length ? 'pronta' : 'em-breve'),
    previsto: trilha.previsto ?? [],
    modulos: trilha.modulos.map((m) => ({
      id: m.id,
      titulo: m.titulo,
      cor: m.cor,
      licoes: m.licoes.map((l) => ({ id: l.id, titulo: l.titulo, minutos: l.minutos })),
    })),
  };
}
