/**
 * Realce de sintaxe caseiro — pequeno o suficiente para você ler inteiro.
 *
 * Não é um parser: é um tokenizador por expressão regular. A ordem das
 * alternativas importa muito. Comentários e strings vêm primeiro, porque o
 * conteúdo deles não deve ser interpretado como código.
 *
 * Cada linguagem é só uma linha de tabela: como é o comentário, quais são as
 * palavras-chave e quais são os literais. Acrescentar uma linguagem é
 * acrescentar uma entrada em LINGUAGENS.
 */

const COMENTARIO_C = '\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/';
const COMENTARIO_HASH = '#[^\\n]*';

const JS = {
  comentario: COMENTARIO_C,
  palavras:
    'const let var function return if else for while of in new class extends import export from as default async await try catch finally throw typeof instanceof delete switch case break continue yield do static get set void',
  literais: 'true false null undefined this super NaN Infinity',
};

const LINGUAGENS = {
  js: JS,
  json: JS,
  jsx: JS,
  ts: {
    ...JS,
    palavras:
      JS.palavras +
      ' type interface enum implements readonly public private protected abstract declare namespace keyof infer satisfies is',
    literais: JS.literais + ' string number boolean any unknown never object',
  },
  python: {
    comentario: COMENTARIO_HASH,
    palavras:
      'def class return if elif else for while in not and or import from as with try except finally raise lambda async await yield pass break continue global nonlocal assert del is match case',
    literais: 'True False None self cls',
  },
  csharp: {
    comentario: COMENTARIO_C,
    palavras:
      'using namespace class struct record interface enum public private protected internal static readonly const new return if else for foreach while do in out ref var void async await try catch finally throw switch case break continue default this base is as null when where get set init required sealed abstract virtual override partial yield lock typeof nameof params with not and or delegate event operator implicit explicit',
    literais:
      'true false null string int long double float decimal bool char object byte short uint ulong dynamic Task List Dictionary IEnumerable',
  },
  sql: {
    comentario: '--[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/',
    semCaixa: true, // SELECT, select e Select são a mesma coisa
    palavras:
      'select from where and or not in is null as join inner left right full outer cross on group by order having limit offset insert into values update set delete create table index unique primary key foreign references drop alter add column constraint default check distinct union all except intersect with recursive case when then else end exists between like ilike asc desc returning over partition window rows range preceding following unbounded current row filter using view materialized explain analyze begin commit rollback transaction if cascade lateral nulls first last grant revoke to extension schema',
    literais:
      'true false integer int bigint smallint serial bigserial text varchar char boolean numeric decimal real double precision date time timestamp timestamptz interval jsonb json uuid bytea vector',
  },
  yaml: {
    comentario: COMENTARIO_HASH,
    palavras:
      'trigger pr pool stages stage jobs job steps script task displayName inputs variables dependsOn condition parameters template name on runs uses env with services image deployment environment strategy',
    literais: 'true false null yes no',
  },
  bash: {
    comentario: COMENTARIO_HASH,
    palavras: 'if then else elif fi for in do done while case esac function export return echo cd sudo',
    literais: 'true false',
  },
};
LINGUAGENS.tsx = LINGUAGENS.ts;
LINGUAGENS.javascript = JS;
LINGUAGENS.py = LINGUAGENS.python;
LINGUAGENS.cs = LINGUAGENS.csharp;
LINGUAGENS.yml = LINGUAGENS.yaml;
LINGUAGENS.sh = LINGUAGENS.bash;

function escapar(txt) {
  return String(txt).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function construirRegex(def) {
  const lista = (texto) => texto.trim().split(/\s+/).join('|');
  return new RegExp(
    [
      `(${def.comentario})`, // 1 comentário
      // 2 string: aspas triplas do Python, template do JS, simples e duplas
      '("""[\\s\\S]*?"""|\'\'\'[\\s\\S]*?\'\'\'|`(?:\\\\.|\\$\\{[^}]*\\}|[^`\\\\])*`|\'(?:\\\\.|[^\'\\\\\\n])*\'|"(?:\\\\.|[^"\\\\\\n])*")',
      '(\\b\\d[\\d_]*\\.?\\d*(?:e[+-]?\\d+)?\\b)', // 3 número
      `\\b(${lista(def.literais)})\\b`, // 4 literal / tipo
      `\\b(${lista(def.palavras)})\\b`, // 5 palavra-chave
      '([A-Za-z_$][\\w$]*)(?=\\s*\\()', // 6 chamada de função
    ].join('|'),
    def.semCaixa ? 'gi' : 'g',
  );
}

const CACHE = new Map();

/** Devolve HTML com as classes .tk-* aplicadas. */
export function realcar(codigo, lang = 'js') {
  const def = LINGUAGENS[lang];
  if (!def) return escapar(codigo); // 'text' e linguagens desconhecidas

  if (!CACHE.has(lang)) CACHE.set(lang, construirRegex(def));
  const base = CACHE.get(lang);
  const regex = new RegExp(base.source, base.flags);

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
