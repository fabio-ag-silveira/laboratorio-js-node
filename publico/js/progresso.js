/**
 * Progresso do aluno, guardado no localStorage do navegador.
 *
 * localStorage é um armazenamento chave→valor que sobrevive a recarregar a
 * página e a fechar o navegador. Só guarda STRINGS — por isso o JSON.stringify
 * na ida e o JSON.parse na volta.
 */

const CHAVE = 'laboratorio-js:progresso';

function ler() {
  try {
    return new Set(JSON.parse(localStorage.getItem(CHAVE) ?? '[]'));
  } catch {
    return new Set();
  }
}

let feitas = ler();

export function estaFeita(id) {
  return feitas.has(id);
}

export function marcar(id, valor = true) {
  if (valor) feitas.add(id);
  else feitas.delete(id);
  localStorage.setItem(CHAVE, JSON.stringify([...feitas]));
}

export function alternar(id) {
  marcar(id, !feitas.has(id));
  return feitas.has(id);
}

export function total() {
  return feitas.size;
}

export function zerar() {
  feitas = new Set();
  localStorage.removeItem(CHAVE);
}
