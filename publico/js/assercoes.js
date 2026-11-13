/**
 * As asserções disponíveis dentro dos testes dos exercícios.
 *
 * Ficam num arquivo próprio, sem tocar no DOM, porque são usadas em dois
 * lugares: no navegador (quando você clica em "Rodar testes") e no Node
 * (`npm test` confere que toda solução passa nos próprios testes).
 */

import { formatar } from './execucao.js';

/** Comparação profunda, para arrays e objetos. */
export function iguaisProfundo(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  const ca = Object.keys(a);
  const cb = Object.keys(b);
  if (ca.length !== cb.length) return false;
  return ca.every((k) => Object.hasOwn(b, k) && iguaisProfundo(a[k], b[k]));
}

export function esperar(valor) {
  return {
    igualA(esperado) {
      if (!Object.is(valor, esperado)) {
        throw new Error(`esperava ${formatar(esperado, 1)}, recebi ${formatar(valor, 1)}`);
      }
    },
    pareceCom(esperado) {
      if (!iguaisProfundo(valor, esperado)) {
        throw new Error(`esperava ${formatar(esperado, 1)}\nrecebi   ${formatar(valor, 1)}`);
      }
    },
    verdadeiro() {
      if (valor !== true) throw new Error(`esperava true, recebi ${formatar(valor, 1)}`);
    },
    proximoDe(esperado, tolerancia = 1e-6) {
      if (typeof valor !== 'number' || Math.abs(valor - esperado) > tolerancia) {
        throw new Error(`esperava ~${formatar(esperado, 1)}, recebi ${formatar(valor, 1)}`);
      }
    },
    contem(item) {
      const tem = Array.isArray(valor) ? valor.some((v) => iguaisProfundo(v, item)) : String(valor).includes(item);
      if (!tem) throw new Error(`esperava que ${formatar(valor, 1)} contivesse ${formatar(item, 1)}`);
    },
  };
}

/**
 * Roda um teste num escopo novo: prelúdio + código do aluno + código do teste.
 * Escopo novo a cada teste significa que um não contamina o outro —
 * exatamente o que o pytest faz recriando as fixtures.
 */
export async function rodarUmTeste({ preludio = '', codigoUsuario, codigoTeste }) {
  const fabrica = new Function(
    'esperar',
    'console',
    `return (async () => {
${preludio}
${codigoUsuario}
${codigoTeste}
})();`,
  );
  // console silencioso: o print do aluno não polui a lista de testes
  await fabrica(esperar, { log() {}, error() {}, warn() {}, info() {}, debug() {} });
}
