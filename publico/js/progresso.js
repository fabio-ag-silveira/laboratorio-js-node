/**
 * Progresso do aluno, guardado no localStorage do navegador.
 *
 * localStorage é um armazenamento chave→valor que sobrevive a recarregar a
 * página e a fechar o navegador. Só guarda STRINGS — por isso o JSON.stringify
 * na ida e o JSON.parse na volta.
 *
 * As chaves são "trilha/modulo/licao". Quando o laboratório tinha uma trilha
 * só, eram "modulo/licao" — `migrar` converte o que estiver no formato antigo,
 * para ninguém perder o que já estudou.
 */

const CHAVE = 'laboratorio-js:progresso';
const CHAVE_ULTIMA = 'laboratorio-js:ultima-licao';

function migrar(chaves) {
  // formato antigo tem exatamente uma barra: "javascript/variaveis"
  return chaves.map((c) => (c.split('/').length === 2 ? `js-node/${c}` : c));
}

function ler() {
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE) ?? '[]');
    const migrado = migrar(bruto);
    if (migrado.some((c, i) => c !== bruto[i])) {
      localStorage.setItem(CHAVE, JSON.stringify(migrado));
    }
    return new Set(migrado);
  } catch {
    return new Set();
  }
}

let feitas = ler();

export function estaFeita(chave) {
  return feitas.has(chave);
}

export function marcar(chave, valor = true) {
  if (valor) feitas.add(chave);
  else feitas.delete(chave);
  localStorage.setItem(CHAVE, JSON.stringify([...feitas]));
}

export function alternar(chave) {
  marcar(chave, !feitas.has(chave));
  return feitas.has(chave);
}

/** Quantas das chaves dadas estão feitas. */
export function contar(chaves) {
  return chaves.filter((c) => feitas.has(c)).length;
}

export function zerar() {
  feitas = new Set();
  localStorage.removeItem(CHAVE);
  localStorage.removeItem(CHAVE_ULTIMA);
}

/** A última lição aberta, para o "continuar de onde parou" da página inicial. */
export function lembrarUltima(rota, titulo, trilha) {
  localStorage.setItem(CHAVE_ULTIMA, JSON.stringify({ rota, titulo, trilha }));
}

export function ultima() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_ULTIMA) ?? 'null');
  } catch {
    return null;
  }
}
