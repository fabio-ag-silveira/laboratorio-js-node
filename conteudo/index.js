/**
 * Junta todos os módulos numa única trilha.
 *
 * Repare no padrão: cada arquivo exporta `modulo` (exportação nomeada), e aqui
 * renomeamos na importação com `as`. É o equivalente do
 * `from m0 import modulo as orientacao` do Python.
 */

import { modulo as orientacao } from './00-orientacao.js';
import { modulo as javascript } from './01-javascript.js';
import { modulo as async } from './02-async.js';
import { modulo as node } from './03-node.js';
import { modulo as apis } from './04-apis.js';
import { modulo as projeto } from './05-projeto.js';

export const trilha = [orientacao, javascript, async, node, apis, projeto];

/** Total de lições — usado na barra de progresso da interface. */
export const totalLicoes = trilha.reduce((n, m) => n + m.licoes.length, 0);
