/**
 * Trilha "JavaScript e Node" — a primeira do laboratório.
 *
 * Cada trilha é uma pasta dentro de `conteudo/`, com um `index.js` que exporta
 * `trilha`. O `conteudo/index.js` descobre as pastas sozinho: para criar uma
 * trilha nova basta criar a pasta, sem registrar em lugar nenhum.
 */

import { modulo as orientacao } from './00-orientacao.js';
import { modulo as javascript } from './01-javascript.js';
import { modulo as async } from './02-async.js';
import { modulo as node } from './03-node.js';
import { modulo as apis } from './04-apis.js';
import { modulo as projeto } from './05-projeto.js';

export const trilha = {
  id: 'js-node',
  ordem: 20,
  titulo: 'JavaScript e Node',
  subtitulo: 'A linguagem, o assincronismo, o Node e uma API REST de verdade',
  icone: '⚡',
  cor: '#f0c14b',
  ponte: 'a partir do Python',
  modulos: [orientacao, javascript, async, node, apis, projeto],
};
