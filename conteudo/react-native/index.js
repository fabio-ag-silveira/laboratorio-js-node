/**
 * Trilha "React Native" — do React da web ao aplicativo no celular.
 *
 * As prévias usam o `react-native-web` numa moldura de celular
 * (`plataforma: 'nativo'` no bloco `previa`). O que depende do aparelho
 * (câmera, armazenamento, publicação) aparece como código para ler, com o
 * roteiro para rodar no Expo.
 */

import { partida, fundamentos } from './01-fundamentos.js';
import { interacao, aplicativo } from './02-aplicativo.js';

export const trilha = {
  id: 'react-native',
  ordem: 40,
  titulo: 'React Native',
  subtitulo: 'O mesmo React no celular: componentes nativos, Flexbox, offline e câmera, com Expo',
  icone: '📱',
  cor: '#58c4dc',
  ponte: 'a partir do Flutter e do React',
  modulos: [partida, fundamentos, interacao, aplicativo],
};
