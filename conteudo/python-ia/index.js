/**
 * Trilha "Python para IA" — para quem já programa em Python.
 *
 * Não ensina a linguagem: atualiza o ferramental, abre por dentro o que se usa
 * todo dia (NumPy, PyTorch) e leva um modelo até virar serviço.
 */

import { moderno } from './01-python-moderno.js';
import { pytorch } from './02-pytorch.js';
import { servico } from './03-servico.js';

export const trilha = {
  id: 'python-ia',
  ordem: 70,
  titulo: 'Python para IA',
  subtitulo: 'Ferramental moderno, NumPy e PyTorch por dentro, servir modelo e usar modelos de linguagem com visão',
  icone: '🐍',
  cor: '#f0c14b',
  ponte: 'reforço: você já é avançado',
  modulos: [moderno, pytorch, servico],
};
