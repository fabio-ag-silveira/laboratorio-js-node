/**
 * Trilha "React" — do zero até um painel que consome uma API.
 *
 * Todo exemplo é uma prévia ao vivo: o código do editor é transformado pelo
 * servidor (esbuild) e montado num iframe isolado. Veja `servidor/vendor.js`
 * e `publico/js/previa.js`.
 */

import { modulo as partida } from './00-partida.js';
import { modulo as fundamentos } from './01-fundamentos.js';
import { modulo as hooks } from './02-hooks.js';
import { modulo as aplicacao } from './03-aplicacao.js';

export const trilha = {
  id: 'react',
  ordem: 30,
  titulo: 'React',
  subtitulo: 'Interface como função do estado: componentes, hooks, TypeScript e React 19',
  icone: '⚛️',
  cor: '#6aa9f0',
  ponte: 'depois de JavaScript e Node',
  modulos: [partida, fundamentos, hooks, aplicacao],
};
