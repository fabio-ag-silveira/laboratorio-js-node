export const modulo = {
  id: 'javascript',
  titulo: 'JavaScript essencial',
  subtitulo: 'A linguagem, traduzida do Python',
  cor: '#f0c14b',
  licoes: [
    // ------------------------------------------------------------------
    {
      id: 'variaveis',
      titulo: 'Variáveis e tipos',
      minutos: 8,
      resumo: 'const, let, os tipos primitivos e os dois "nadas".',
      blocos: [
        {
          t: 'texto',
          md: `No Python você escreve \`x = 10\` e pronto. Em JavaScript você declara **como** a variável se comporta:

- \`const\` — não pode ser reatribuída. **Use isto por padrão.**
- \`let\` — pode ser reatribuída. Use quando o valor realmente muda.
- \`var\` — o jeito antigo. Tem regras de escopo confusas. **Nunca use.** Só saiba reconhecer em código velho.`,
        },
        {
          t: 'py-js',
          py: `nome = "Fábio"
idade = 38
idade = 39          # ok

PI = 3.14159        # convenção: maiúscula
PI = 3              # Python deixa!`,
          js: `const nome = "Fábio";
let idade = 38;
idade = 39;         // ok

const PI = 3.14159;
PI = 3;             // ERRO de verdade:
                    // Assignment to constant variable.`,
          nota: 'Em Python, `PI` maiúsculo é só um acordo de cavalheiros. Em JS, `const` é uma trava real do interpretador.',
        },
        {
          t: 'nota',
          estilo: 'pegadinha',
          md: `\`const\` trava a **variável**, não o **conteúdo**. Um array declarado com \`const\` ainda aceita \`.push()\`. O que você não pode é apontar a variável para outro array. É a mesma distinção de "rebind" vs "mutate" que existe no Python.`,
        },
        {
          t: 'codigo',
          titulo: 'const trava o vínculo, não o conteúdo',
          rodar: 'browser',
          codigo: `const deteccoes = ['pessoa', 'capacete'];

deteccoes.push('colete');   // permitido: mudou o CONTEÚDO
console.log(deteccoes);

// deteccoes = [];           // erro: mudaria o VÍNCULO
                             // descomente para ver`,
        },
        {
          t: 'texto',
          md: `### Os tipos

JavaScript tem 7 tipos primitivos, mas na prática você usa 5:

| Tipo | Exemplo | No Python |
|---|---|---|
| \`number\` | \`42\`, \`3.14\`, \`-0.5\` | int **e** float juntos |
| \`string\` | \`"oi"\`, \`'oi'\`, \`\\\`oi\\\`\` | str |
| \`boolean\` | \`true\`, \`false\` | True, False |
| \`null\` | \`null\` | None |
| \`undefined\` | \`undefined\` | *(não existe equivalente)* |

Repare no primeiro: **não existe \`int\` e \`float\` separados.** Todo número é ponto flutuante de 64 bits. \`10 / 3\` dá \`3.3333...\` e \`10 / 2\` dá \`5\` — nunca \`5.0\`. Para divisão inteira, use \`Math.floor(10 / 3)\`.`,
        },
        {
          t: 'codigo',
          titulo: 'Números não se comportam como no Python',
          rodar: 'browser',
          codigo: `console.log(10 / 3);          // 3.3333333333333335
console.log(10 / 2);          // 5      (não 5.0)
console.log(Math.floor(10/3)); // 3     (o // do Python)
console.log(7 % 3);           // 1      (igual)
console.log(2 ** 10);         // 1024   (igual)

console.log(0.1 + 0.2);       // 0.30000000000000004
// (o mesmo problema de ponto flutuante do Python — não é bug do JS)

console.log(typeof 42);       // "number"
console.log(typeof "oi");     // "string"
console.log(1 / 0);           // Infinity  (Python daria ZeroDivisionError)
console.log(Number('abc'));   // NaN — "não é um número"`,
        },
        {
          t: 'texto',
          md: `### Os dois "nadas"

Esta é a diferença que mais confunde quem vem do Python. Lá existe só \`None\`. Aqui existem dois:

- \`undefined\` — "esta caixa nunca foi preenchida". O JavaScript coloca sozinho: variável declarada sem valor, parâmetro que você não passou, propriedade que não existe no objeto, função sem \`return\`.
- \`null\` — "esta caixa está vazia **de propósito**". Só aparece se **você** escrever.

A regra prática: \`undefined\` é acidente do sistema, \`null\` é decisão sua.`,
        },
        {
          t: 'codigo',
          titulo: 'undefined vs null',
          rodar: 'browser',
          codigo: `let semValor;
console.log(semValor);              // undefined — nunca preenchi

const config = { camera: 'doca-01' };
console.log(config.resolucao);      // undefined — a chave não existe
// (no Python isso seria KeyError!)

const modelo = null;                 // eu decidi: "ainda não carregou"
console.log(modelo);                 // null

console.log(typeof undefined);       // "undefined"
console.log(typeof null);            // "object"  ← bug histórico do JS,
                                     //   nunca corrigido por compatibilidade

console.log(null == undefined);      // true   (com ==, são "iguais")
console.log(null === undefined);     // false  (com ===, são diferentes)`,
        },
        {
          t: 'nota',
          estilo: 'atencao',
          md: `Acessar uma chave inexistente num objeto devolve \`undefined\` **em silêncio** — não levanta \`KeyError\`. Isso significa que erros de digitação em nomes de propriedade não estouram na hora; eles viram \`undefined\` e explodem três funções depois. É o bug número 1 de quem vem do Python.`,
        },
        {
          t: 'exercicio',
          enunciado: `Escreva a função \`descrever(valor)\` que devolve uma string:

- se for \`undefined\` → \`"não definido"\`
- se for \`null\` → \`"vazio"\`
- se for um número → \`"número: X"\` (com o valor)
- qualquer outra coisa → \`"outro"\`

Dica: use \`typeof\` e compare com \`===\`.`,
          inicial: `function descrever(valor) {
  // seu código aqui

}`,
          testes: [
            { nome: 'descrever(undefined) → "não definido"', codigo: 'esperar(descrever(undefined)).igualA("não definido")' },
            { nome: 'descrever(null) → "vazio"', codigo: 'esperar(descrever(null)).igualA("vazio")' },
            { nome: 'descrever(42) → "número: 42"', codigo: 'esperar(descrever(42)).igualA("número: 42")' },
            { nome: 'descrever(0) → "número: 0"', codigo: 'esperar(descrever(0)).igualA("número: 0")' },
            { nome: 'descrever("oi") → "outro"', codigo: 'esperar(descrever("oi")).igualA("outro")' },
          ],
          dica: 'Teste `null` ANTES de usar `typeof`, porque `typeof null` devolve "object" e não "null".',
          solucao: `function descrever(valor) {
  if (valor === undefined) return 'não definido';
  if (valor === null) return 'vazio';
  if (typeof valor === 'number') return \`número: \${valor}\`;
  return 'outro';
}`,
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'funcoes',
      titulo: 'Funções e arrow functions',
      minutos: 10,
      resumo: 'Três formas de declarar, parâmetros e funções como valores.',
      blocos: [
        {
          t: 'texto',
          md: `Em JavaScript, funções são **valores**. Você guarda em variável, passa como argumento, devolve de outra função. No Python isso também é verdade, mas em JS é o estilo dominante — você vai fazer isso o tempo todo.

Existem três formas de escrever. Você precisa saber ler as três e escolher entre duas.`,
        },
        {
          t: 'py-js',
          py: `def somar(a, b):
    return a + b

# lambda: só uma expressão
dobrar = lambda x: x * 2

def saudar(nome, saudacao="Olá"):
    return f"{saudacao}, {nome}!"`,
          js: `// 1. declaração clássica
function somar(a, b) {
  return a + b;
}

// 2. arrow function (a mais comum hoje)
const dobrar = (x) => x * 2;

// 3. arrow com corpo em bloco
const saudar = (nome, saudacao = 'Olá') => {
  return \`\${saudacao}, \${nome}!\`;
};`,
          nota: 'A `lambda` do Python só aceita **uma expressão**. A arrow function do JS não tem esse limite: com chaves, ela vira uma função completa.',
        },
        {
          t: 'texto',
          md: `### A regra do \`return\` implícito

Este é o detalhe que mais confunde no começo:

- **Sem chaves**: \`x => x * 2\` — o valor da expressão é retornado automaticamente.
- **Com chaves**: \`x => { x * 2 }\` — é um bloco de código. Sem \`return\` explícito, devolve \`undefined\`.`,
        },
        {
          t: 'codigo',
          titulo: 'A pegadinha das chaves',
          rodar: 'browser',
          codigo: `const dobrarOk    = (x) => x * 2;
const dobrarBug   = (x) => { x * 2; };        // esqueceu o return
const dobrarCerto = (x) => { return x * 2; };

console.log(dobrarOk(5));     // 10
console.log(dobrarBug(5));    // undefined  ← o bug
console.log(dobrarCerto(5));  // 10

// Para RETORNAR um objeto numa arrow curta, envolva em parênteses:
const criarPonto = (x, y) => ({ x, y });
console.log(criarPonto(1, 2));
// sem os parênteses, o { } seria lido como bloco de código!`,
        },
        {
          t: 'texto',
          md: `### Parâmetros

Valores padrão funcionam igual ao Python. O \`*args\` vira \`...resto\` (chamado *rest*).

Uma diferença importante: **JavaScript não reclama** se você passar argumentos a mais ou a menos. Argumentos faltando viram \`undefined\`; sobrando são ignorados. No Python isso seria \`TypeError\`.`,
        },
        {
          t: 'codigo',
          titulo: 'Parâmetros: padrão, rest e a falta de reclamação',
          rodar: 'browser',
          codigo: `function conectar(host, porta = 3000) {
  console.log(\`ligando em \${host}:\${porta}\`);
}
conectar('localhost');           // usa o padrão
conectar('localhost', 8080);
conectar();                       // host = undefined... e roda mesmo assim!

// ...resto  ≈  *args do Python
function media(...numeros) {
  if (numeros.length === 0) return 0;
  const soma = numeros.reduce((a, b) => a + b, 0);
  return soma / numeros.length;
}
console.log(media(0.9, 0.8, 0.7));  // 0.7999999999999999
console.log(media());                // 0

// Não existe **kwargs. O padrão é receber um OBJETO:
function treinar({ epocas = 10, lote = 32, taxa = 0.001 } = {}) {
  console.log({ epocas, lote, taxa });
}
treinar({ epocas: 50, taxa: 0.01 });   // ≈ treinar(epocas=50, taxa=0.01)
treinar();`,
        },
        {
          t: 'nota',
          estilo: 'dica',
          md: `Esse último padrão — receber **um objeto** com desestruturação e valores padrão — é como o JavaScript resolve a falta de argumentos nomeados. Você vai ver isso em toda biblioteca séria. Vale internalizar.`,
        },
        {
          t: 'texto',
          md: `### Funções como valores

É aqui que o estilo JS se separa do Python. Passar função como argumento é a operação mais comum da linguagem — é assim que \`map\`, \`filter\`, eventos e código assíncrono funcionam.`,
        },
        {
          t: 'codigo',
          titulo: 'Funções que recebem e devolvem funções',
          rodar: 'browser',
          codigo: `const deteccoes = [
  { classe: 'pessoa', conf: 0.94 },
  { classe: 'caixa',  conf: 0.55 },
  { classe: 'pessoa', conf: 0.63 },
];

// passando uma função como argumento
const confiantes = deteccoes.filter((d) => d.conf > 0.6);
console.log(confiantes);

// uma função que FABRICA outra função (closure)
function filtroPorClasse(alvo) {
  return (d) => d.classe === alvo;
}
const soPessoas = filtroPorClasse('pessoa');
console.log(deteccoes.filter(soPessoas));`,
        },
        {
          t: 'exercicio',
          enunciado: `Escreva \`criarContador()\`, que devolve uma **função**. Cada vez que a função devolvida for chamada, ela retorna o próximo número, começando em 1.

Contadores criados separadamente não podem interferir um no outro.`,
          inicial: `function criarContador() {
  // seu código aqui

}`,
          testes: [
            { nome: 'primeira chamada devolve 1', codigo: 'const c = criarContador(); esperar(c()).igualA(1)' },
            { nome: 'chamadas seguintes: 1, 2, 3', codigo: 'const c = criarContador(); c(); c(); esperar(c()).igualA(3)' },
            { nome: 'contadores são independentes', codigo: 'const a = criarContador(); const b = criarContador(); a(); a(); esperar(b()).igualA(1)' },
            { nome: 'devolve mesmo uma função', codigo: 'esperar(typeof criarContador()).igualA("function")' },
          ],
          dica: 'Declare `let n = 0` DENTRO de `criarContador`, e devolva uma arrow que faz `n++`. A variável sobrevive porque a função devolvida "lembra" do escopo onde nasceu — isso se chama closure.',
          solucao: `function criarContador() {
  let n = 0;
  return () => {
    n = n + 1;
    return n;
  };
}`,
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'arrays',
      titulo: 'Arrays: map, filter, reduce',
      minutos: 12,
      resumo: 'O substituto das list comprehensions — e o pão com manteiga do dia a dia.',
      blocos: [
        {
          t: 'texto',
          md: `JavaScript não tem list comprehension. No lugar, tem **métodos encadeáveis** no array. Depois de acostumar, muita gente prefere — encadear lê melhor que comprehension aninhada.`,
        },
        {
          t: 'py-js',
          py: `nums = [1, 2, 3, 4, 5]

# map
[n * 2 for n in nums]

# filter
[n for n in nums if n % 2 == 0]

# map + filter
[n * 2 for n in nums if n % 2 == 0]

# reduce
sum(nums)

len(nums)
nums[0]
nums[-1]`,
          js: `const nums = [1, 2, 3, 4, 5];

// map
nums.map(n => n * 2)

// filter
nums.filter(n => n % 2 === 0)

// map + filter — encadeados
nums.filter(n => n % 2 === 0).map(n => n * 2)

// reduce
nums.reduce((soma, n) => soma + n, 0)

nums.length
nums[0]
nums.at(-1)    // índice negativo precisa do .at()`,
          nota: '`nums[-1]` **não** funciona em JS — devolve `undefined`. Use `.at(-1)` ou `nums[nums.length - 1]`.',
        },
        {
          t: 'codigo',
          titulo: 'Os métodos que você vai usar todo dia',
          rodar: 'browser',
          codigo: `const deteccoes = [
  { id: 1, classe: 'pessoa',      conf: 0.94 },
  { id: 2, classe: 'capacete',    conf: 0.88 },
  { id: 3, classe: 'colete',      conf: 0.71 },
  { id: 4, classe: 'pessoa',      conf: 0.63 },
  { id: 5, classe: 'empilhadeira',conf: 0.97 },
];

// map — transforma cada item (mesmo tamanho na saída)
console.log(deteccoes.map(d => d.classe));

// filter — seleciona (tamanho menor ou igual)
console.log(deteccoes.filter(d => d.conf >= 0.8).map(d => d.classe));

// find — o PRIMEIRO que bate, ou undefined
console.log(deteccoes.find(d => d.classe === 'pessoa'));

// some / every — booleanos (o any() e all() do Python)
console.log(deteccoes.some(d => d.conf > 0.95));    // algum?
console.log(deteccoes.every(d => d.conf > 0.5));    // todos?

// reduce — dobra a lista num único valor
const soma = deteccoes.reduce((acc, d) => acc + d.conf, 0);
console.log('média:', (soma / deteccoes.length).toFixed(3));

// reduce também agrupa (o Counter / defaultdict do Python)
const porClasse = deteccoes.reduce((acc, d) => {
  acc[d.classe] = (acc[d.classe] ?? 0) + 1;
  return acc;
}, {});
console.log(porClasse);`,
        },
        {
          t: 'nota',
          estilo: 'pegadinha',
          md: `\`.sort()\` **modifica o array original** e, sem argumento, ordena como **texto** — então \`[10, 9, 100].sort()\` devolve \`[10, 100, 9]\`. Para números, sempre passe a função de comparação: \`.sort((a, b) => a - b)\`. Para não mutar, copie antes: \`[...lista].sort(...)\`.`,
        },
        {
          t: 'codigo',
          titulo: 'sort: a armadilha clássica',
          rodar: 'browser',
          codigo: `const nums = [10, 9, 100, 1];

console.log([...nums].sort());              // [1, 10, 100, 9]  😱 texto!
console.log([...nums].sort((a, b) => a - b)); // [1, 9, 10, 100]  crescente
console.log([...nums].sort((a, b) => b - a)); // [100, 10, 9, 1]  decrescente

// e repare: o original continua intacto porque copiamos com [...]
console.log(nums);

// mutantes (mudam o original):  sort, reverse, push, pop, splice
// imutáveis (devolvem novo):    map, filter, slice, concat, toSorted`,
        },
        {
          t: 'texto',
          md: `### Espalhar e desestruturar

O \`...\` (spread) é o \`*lista\` do Python, e serve para copiar, juntar e desempacotar.`,
        },
        {
          t: 'codigo',
          titulo: 'Spread e destructuring',
          rodar: 'browser',
          codigo: `const a = [1, 2];
const b = [3, 4];

console.log([...a, ...b]);        // juntar → [1,2,3,4]
console.log([...a]);              // copiar (cópia rasa)
console.log(Math.max(...[5,2,9])); // desempacotar em argumentos

// destructuring — o a, b = par do Python
const [primeiro, segundo] = [10, 20];
console.log(primeiro, segundo);

const [cabeca, ...cauda] = [1, 2, 3, 4];
console.log(cabeca, cauda);       // 1  [2,3,4]

// trocar valores sem variável temporária
let x = 1, y = 2;
[x, y] = [y, x];
console.log(x, y);`,
        },
        {
          t: 'exercicio',
          enunciado: `Dada uma lista de detecções, escreva \`melhorPorClasse(lista)\` que devolve um objeto mapeando cada classe para a **maior confiança** vista naquela classe.

Exemplo: para \`[{classe:'a',conf:0.5},{classe:'a',conf:0.9},{classe:'b',conf:0.3}]\` o resultado é \`{ a: 0.9, b: 0.3 }\`.`,
          inicial: `function melhorPorClasse(lista) {
  // seu código aqui

}`,
          testes: [
            {
              nome: 'agrupa e pega o máximo',
              codigo: `esperar(melhorPorClasse([
  { classe: 'a', conf: 0.5 },
  { classe: 'a', conf: 0.9 },
  { classe: 'b', conf: 0.3 },
])).pareceCom({ a: 0.9, b: 0.3 })`,
            },
            { nome: 'lista vazia → objeto vazio', codigo: 'esperar(melhorPorClasse([])).pareceCom({})' },
            {
              nome: 'uma classe só',
              codigo: `esperar(melhorPorClasse([{ classe: 'x', conf: 0.1 }])).pareceCom({ x: 0.1 })`,
            },
            {
              nome: 'não se confunde com ordem',
              codigo: `esperar(melhorPorClasse([
  { classe: 'p', conf: 0.99 },
  { classe: 'p', conf: 0.10 },
])).pareceCom({ p: 0.99 })`,
            },
          ],
          dica: 'Use `reduce` com um objeto `{}` como valor inicial. Para cada item: `acc[d.classe] = Math.max(acc[d.classe] ?? 0, d.conf)`.',
          solucao: `function melhorPorClasse(lista) {
  return lista.reduce((acc, d) => {
    acc[d.classe] = Math.max(acc[d.classe] ?? 0, d.conf);
    return acc;
  }, {});
}`,
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'objetos',
      titulo: 'Objetos e desestruturação',
      minutos: 10,
      resumo: 'O dicionário do JS — e por que ele é mais central que no Python.',
      blocos: [
        {
          t: 'texto',
          md: `O objeto do JavaScript é o dicionário do Python, com duas diferenças importantes:

1. As **chaves não levam aspas** na declaração (mas são sempre strings por baixo).
2. Você acessa com **ponto**: \`obj.chave\`, não \`obj['chave']\` — embora as duas formas funcionem.

E, ao contrário do Python, chave inexistente devolve \`undefined\` em vez de estourar \`KeyError\`.`,
        },
        {
          t: 'py-js',
          py: `d = {
    "classe": "pessoa",
    "conf": 0.94,
}

d["classe"]
d.get("cor", "n/d")
d["cor"]            # KeyError!

"conf" in d
d.keys()
d.items()
del d["conf"]`,
          js: `const d = {
  classe: 'pessoa',
  conf: 0.94,
};

d.classe              // ou d['classe']
d.cor ?? 'n/d'
d.cor                 // undefined (sem erro)

'conf' in d
Object.keys(d)
Object.entries(d)
delete d.conf`,
        },
        {
          t: 'codigo',
          titulo: 'Objetos na prática',
          rodar: 'browser',
          codigo: `const classe = 'pessoa';
const conf = 0.94;

// atalho: se a variável tem o nome da chave, não repita
const deteccao = { classe, conf, camera: 'doca-01' };
console.log(deteccao);

// chave dinâmica (calculada)
const campo = 'conf';
console.log(deteccao[campo]);          // com ponto NÃO dá: deteccao.campo

// chave computada na criação
const chave = 'ts';
const evento = { [chave]: Date.now() };
console.log(evento);

// percorrer
for (const [k, v] of Object.entries(deteccao)) {
  console.log(k, '→', v);
}

// spread: cópia + sobrescrita (o {**a, **b} do Python)
const ajustada = { ...deteccao, conf: 0.99 };
console.log(ajustada);
console.log(deteccao.conf);   // original intacto`,
        },
        {
          t: 'texto',
          md: `### Desestruturação

Extrair campos de um objeto é tão comum que existe sintaxe dedicada. Você vai ver isso em **toda** biblioteca JavaScript.`,
        },
        {
          t: 'codigo',
          titulo: 'Destructuring de objetos',
          rodar: 'browser',
          codigo: `const resposta = {
  status: 200,
  dados: { itens: [1, 2, 3], total: 3 },
  cabecalhos: { 'content-type': 'application/json' },
};

// extrair campos
const { status, dados } = resposta;
console.log(status, dados);

// renomear na saída
const { status: codigo } = resposta;
console.log(codigo);

// valor padrão para o que não existe
const { erro = 'nenhum' } = resposta;
console.log(erro);

// aninhado
const { dados: { total } } = resposta;
console.log('total:', total);

// pegar o resto
const { status: s, ...resto } = resposta;
console.log(Object.keys(resto));

// e o uso mais comum: direto no parâmetro da função
function log({ status, dados }) {
  console.log(\`[\${status}] \${dados.total} itens\`);
}
log(resposta);`,
        },
        {
          t: 'nota',
          estilo: 'atencao',
          md: `Spread faz **cópia rasa** (*shallow copy*). \`{ ...obj }\` copia o primeiro nível; objetos aninhados continuam sendo a mesma referência. É o mesmo comportamento de \`dict(d)\` ou \`copy.copy()\` no Python. Para cópia profunda: \`structuredClone(obj)\`.`,
        },
        {
          t: 'codigo',
          titulo: 'Cópia rasa vs profunda',
          rodar: 'browser',
          codigo: `const original = { nome: 'lote-1', config: { epocas: 10 } };

const rasa = { ...original };
rasa.config.epocas = 999;
console.log(original.config.epocas);   // 999 😱 vazou!

const original2 = { nome: 'lote-2', config: { epocas: 10 } };
const profunda = structuredClone(original2);
profunda.config.epocas = 999;
console.log(original2.config.epocas);  // 10 ✅`,
        },
        {
          t: 'exercicio',
          enunciado: `Escreva \`resumir(deteccao)\` que recebe um objeto e devolve uma string no formato \`"pessoa (94%) @ doca-01"\`.

Regras:
- a confiança vira porcentagem inteira (0.94 → 94);
- se \`camera\` não vier no objeto, use \`"desconhecida"\`;
- use desestruturação no parâmetro.`,
          inicial: `function resumir(deteccao) {
  // seu código aqui

}`,
          testes: [
            {
              nome: 'formato completo',
              codigo: `esperar(resumir({ classe: 'pessoa', conf: 0.94, camera: 'doca-01' })).igualA('pessoa (94%) @ doca-01')`,
            },
            {
              nome: 'camera ausente vira "desconhecida"',
              codigo: `esperar(resumir({ classe: 'caixa', conf: 0.5 })).igualA('caixa (50%) @ desconhecida')`,
            },
            {
              nome: 'arredonda para inteiro',
              codigo: `esperar(resumir({ classe: 'x', conf: 0.876, camera: 'c' })).igualA('x (88%) @ c')`,
            },
          ],
          dica: 'Assinatura: `function resumir({ classe, conf, camera = "desconhecida" })`. Para a porcentagem: `Math.round(conf * 100)`. Monte a string com template literal.',
          solucao: `function resumir({ classe, conf, camera = 'desconhecida' }) {
  const pct = Math.round(conf * 100);
  return \`\${classe} (\${pct}%) @ \${camera}\`;
}`,
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'igualdade',
      titulo: 'Igualdade, truthiness e as pegadinhas',
      minutos: 9,
      resumo: 'A parte feia do JavaScript — e as três regras que te protegem.',
      blocos: [
        {
          t: 'texto',
          md: `Chegou a hora de encarar a fama do JavaScript. As esquisitices são reais, mas todas vêm de uma decisão só: **a linguagem converte tipos automaticamente** para tentar fazer a operação dar certo.

A boa notícia: três regras eliminam 95% dos problemas.`,
        },
        {
          t: 'texto',
          md: `### Regra 1 — Use sempre \`===\`, nunca \`==\`

\`==\` converte os tipos antes de comparar. \`===\` compara valor **e** tipo, como o \`==\` do Python.`,
        },
        {
          t: 'codigo',
          titulo: 'Por que == é proibido',
          rodar: 'browser',
          codigo: `console.log(1 == '1');        // true   😱
console.log(0 == false);      // true   😱
console.log('' == false);     // true   😱
console.log(null == undefined); // true 😱
console.log([] == false);     // true   😱😱

console.log(1 === '1');       // false  ✅
console.log(0 === false);     // false  ✅
console.log('' === false);    // false  ✅

// a única exceção tolerada por muitos times:
//   valor == null   →  true para null OU undefined (atalho útil)`,
        },
        {
          t: 'texto',
          md: `### Regra 2 — Conheça os 7 valores falsos

Em \`if (x)\`, o JavaScript converte \`x\` para booleano. Estes sete viram \`false\`:

\`false\` · \`0\` · \`-0\` · \`""\` (string vazia) · \`null\` · \`undefined\` · \`NaN\`

**Todo o resto é verdadeiro.** Inclusive — e aqui mora o perigo — \`[]\` e \`{}\`.`,
        },
        {
          t: 'codigo',
          titulo: 'A diferença que pega gente do Python',
          rodar: 'browser',
          codigo: `// No Python, lista vazia e dict vazio são FALSOS.
// No JavaScript, são VERDADEIROS.

if ([]) console.log('array vazio é verdadeiro!');   // executa
if ({}) console.log('objeto vazio é verdadeiro!');  // executa

// então isto está ERRADO:
const itens = [];
if (itens) console.log('tem itens?');   // sempre entra 😱

// o certo:
if (itens.length > 0) console.log('tem itens de verdade');

console.log('"0" é verdadeiro:', Boolean('0'));  // true! string não vazia
console.log('0 é falso:', Boolean(0));            // false`,
        },
        {
          t: 'texto',
          md: `### Regra 3 — Prefira \`??\` a \`||\` para valores padrão

\`||\` devolve o lado direito se o esquerdo for **falso**. \`??\` só devolve se for **\`null\` ou \`undefined\`**.

A diferença aparece quando \`0\` ou \`""\` são valores legítimos — e num sistema de visão computacional, \`0\` é legítimo o tempo todo.`,
        },
        {
          t: 'codigo',
          titulo: '?? vs || — um bug de produção esperando acontecer',
          rodar: 'browser',
          codigo: `const config = { limiar: 0, nome: '' };

console.log(config.limiar || 0.5);   // 0.5  😱 apagou o 0 do usuário!
console.log(config.limiar ?? 0.5);   // 0    ✅ respeitou o 0

console.log(config.nome || 'sem nome');  // 'sem nome' 😱
console.log(config.nome ?? 'sem nome');  // ''         ✅

// ?. — acesso opcional: para quando o caminho pode não existir
const resposta = { dados: null };
// console.log(resposta.dados.itens);   // TypeError, derruba tudo
console.log(resposta.dados?.itens);     // undefined, segue o jogo
console.log(resposta.dados?.itens ?? []); // [] — o combo mais útil do JS`,
        },
        {
          t: 'nota',
          estilo: 'dica',
          md: `O trio \`?.\` + \`??\` + \`===\` resolve quase toda a fama ruim da linguagem. Adote os três desde o primeiro dia e você não vai encontrar as esquisitices que aparecem nos memes.`,
        },
        {
          t: 'exercicio',
          enunciado: `Escreva \`limiarValido(config)\` que devolve o limiar de confiança a usar:

- se \`config\` for \`null\`/\`undefined\`, ou não tiver \`limiar\`, devolva \`0.5\`;
- se \`config.limiar\` existir (inclusive sendo \`0\`), devolva ele;
- se \`config.limiar\` não for um número, devolva \`0.5\`.`,
          inicial: `function limiarValido(config) {
  // seu código aqui

}`,
          testes: [
            { nome: 'sem config → 0.5', codigo: 'esperar(limiarValido(undefined)).igualA(0.5)' },
            { nome: 'null → 0.5', codigo: 'esperar(limiarValido(null)).igualA(0.5)' },
            { nome: 'objeto vazio → 0.5', codigo: 'esperar(limiarValido({})).igualA(0.5)' },
            { nome: 'limiar 0 é respeitado', codigo: 'esperar(limiarValido({ limiar: 0 })).igualA(0)' },
            { nome: 'limiar 0.8 funciona', codigo: 'esperar(limiarValido({ limiar: 0.8 })).igualA(0.8)' },
            { nome: 'texto não vale → 0.5', codigo: 'esperar(limiarValido({ limiar: "alto" })).igualA(0.5)' },
          ],
          dica: 'Comece com `const v = config?.limiar;` e depois teste `typeof v === "number"`.',
          solucao: `function limiarValido(config) {
  const v = config?.limiar;
  return typeof v === 'number' ? v : 0.5;
}`,
        },
      ],
    },
  ],
};
