/**
 * Trilha "Visão Computacional" — do pixel ao estado da arte.
 *
 * Cada lição combina três coisas: um componente interativo no navegador
 * (canvas puro), blocos de Python que rodam na sua máquina (OpenCV e PyTorch)
 * e perguntas de fixação que alimentam a página de revisão.
 */

import { modulo as partida } from './00-partida.js';
import { modulo as imagem } from './01-imagem.js';
import { modulo as classico } from './02-classico.js';
import { modulo as aprendizado } from './03-aprendizado.js';
import { modulo as deteccao } from './04-deteccao.js';
import { modulo as avaliacao } from './05-avaliacao.js';
import { modulo as laboratorio } from './06-laboratorio.js';
import { modulo as pequenos } from './07-pequenos.js';
import { modulo as dados } from './08-dados.js';

export const trilha = {
  id: 'visao',
  ordem: 10,
  titulo: 'Visão Computacional',
  subtitulo: 'Do pixel ao estado da arte: clássico, deep learning, detecção, avaliação e produção',
  icone: '👁️',
  cor: '#5ec9a7',
  ponte: 'reforço e aprofundamento',
  modulos: [partida, imagem, classico, aprendizado, deteccao, avaliacao, laboratorio, pequenos, dados],
};
