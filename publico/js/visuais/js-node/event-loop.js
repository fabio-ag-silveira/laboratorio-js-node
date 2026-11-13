/**
 * Todo componente visual é um módulo com exportação padrão `criar(opcoes)`,
 * que devolve um elemento do DOM. A lição pede por nome
 * (`componente: 'js-node/event-loop'`) e o arquivo só é baixado se a lição
 * for aberta.
 */
import { criarEventLoop } from '../../eventloop.js';

export default function criar() {
  return criarEventLoop();
}
