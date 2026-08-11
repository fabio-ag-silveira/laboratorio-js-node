/**
 * Realce de sintaxe caseiro — pequeno o suficiente para você ler inteiro.
 *
 * Não é um parser: é um tokenizador por expressão regular. A ordem das
 * alternativas importa muito. Comentários e strings vêm primeiro, porque o
 * conteúdo deles não deve ser interpretado como código.
 */

const PALAVRAS = [
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
  'of', 'in', 'new', 'class', 'extends', 'import', 'export', 'from', 'as',
  'default', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'typeof',
  'instanceof', 'delete', 'switch', 'case', 'break', 'continue', 'yield', 'do',
  'static', 'get', 'set', 'void',
];

const LITERAIS = ['true', 'false', 'null', 'undefined', 'this', 'super', 'NaN', 'Infinity'];

// Python (para os blocos de comparação)
const PALAVRAS_PY = [
  'def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'in', 'not',
  'and', 'or', 'import', 'from', 'as', 'with', 'try', 'except', 'finally',
  'raise', 'lambda', 'async', 'await', 'yield', 'pass', 'break', 'continue',
  'global', 'assert', 'del',
];
const LITERAIS_PY = ['True', 'False', 'None', 'self'];

function escapar(txt) {
  return txt
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function construirRegex(lang) {
  const comentario = lang === 'python' ? '#[^\\n]*' : '\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/';
  const chaves = lang === 'python' ? PALAVRAS_PY : PALAVRAS;
  const lits = lang === 'python' ? LITERAIS_PY : LITERAIS;

  return new RegExp(
    [
      `(${comentario})`, // 1 comentário
      // 2 string: template, aspas simples, duplas, f-string do Python
      '(`(?:\\\\.|\\$\\{[^}]*\\}|[^`\\\\])*`|\'(?:\\\\.|[^\'\\\\\\n])*\'|"(?:\\\\.|[^"\\\\\\n])*")',
      '(\\b\\d[\\d_]*\\.?\\d*(?:e[+-]?\\d+)?\\b)', // 3 número
      `\\b(${lits.join('|')})\\b`, // 4 literal
      `\\b(${chaves.join('|')})\\b`, // 5 palavra-chave
      '([A-Za-z_$][\\w$]*)(?=\\s*\\()', // 6 chamada de função
    ].join('|'),
    'g',
  );
}

const CACHE = new Map();

/** Devolve HTML com as classes .tk-* aplicadas. */
export function realcar(codigo, lang = 'js') {
  if (lang === 'text' || lang === 'bash') return escapar(codigo);

  if (!CACHE.has(lang)) CACHE.set(lang, construirRegex(lang));
  const regex = new RegExp(CACHE.get(lang).source, 'g');

  let saida = '';
  let ultimo = 0;
  let m;

  while ((m = regex.exec(codigo)) !== null) {
    saida += escapar(codigo.slice(ultimo, m.index));

    if (m[1]) saida += `<span class="tk-com">${escapar(m[1])}</span>`;
    else if (m[2]) saida += `<span class="tk-str">${escapar(m[2])}</span>`;
    else if (m[3]) saida += `<span class="tk-num">${escapar(m[3])}</span>`;
    else if (m[4]) saida += `<span class="tk-lit">${escapar(m[4])}</span>`;
    else if (m[5]) saida += `<span class="tk-key">${escapar(m[5])}</span>`;
    else if (m[6]) saida += `<span class="tk-fn">${escapar(m[6])}</span>`;

    ultimo = m.index + m[0].length;
  }

  saida += escapar(codigo.slice(ultimo));
  return saida;
}

export { escapar };
