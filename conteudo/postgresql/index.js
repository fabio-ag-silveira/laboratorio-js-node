/**
 * Trilha "PostgreSQL" — SQL que executa de verdade.
 *
 * Os blocos com `rodar: 'sql'` vão para um PostgreSQL embutido (PGlite), numa
 * cópia descartável do banco de exemplo. Veja `servidor/sql/`.
 */

import { partida, consultas } from './01-consultas.js';
import { modelagem } from './02-modelagem.js';
import { producao } from './03-producao.js';

export const trilha = {
  id: 'postgresql',
  ordem: 50,
  titulo: 'PostgreSQL',
  subtitulo: 'Consultas, modelagem, transações, índices e operação, num Postgres que roda aqui',
  icone: '🐘',
  cor: '#e08fb0',
  ponte: 'a partir do MySQL',
  modulos: [partida, consultas, modelagem, producao],
};
