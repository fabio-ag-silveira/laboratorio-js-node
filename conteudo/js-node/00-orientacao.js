export const modulo = {
  id: 'orientacao',
  titulo: 'Ponto de partida',
  subtitulo: 'O mapa antes da viagem',
  cor: '#8b8ff5',
  licoes: [
    {
      id: 'mapa',
      titulo: 'O mapa: o que você vai aprender',
      minutos: 5,
      resumo: 'Como as peças se encaixam e por onde atacar primeiro.',
      blocos: [
        {
          t: 'texto',
          md: `Você já programa. Isso muda tudo: você **não** precisa reaprender o que é uma variável, um laço ou uma função. Precisa aprender **três coisas** que o JavaScript faz diferente do Python, e depois o ecossistema em volta.

As três coisas que realmente pegam quem vem do Python:

1. **Assincronismo por padrão.** No Python, código assíncrono é opt-in (\`async def\`, \`asyncio\`). No Node, quase toda operação de entrada/saída é assíncrona, e você precisa entender o *event loop* para não escrever bugs silenciosos.
2. **Objetos e funções em todo lugar.** Funções são valores que você passa, retorna e guarda em variáveis o tempo todo. Existe no Python, mas em JS é o estilo dominante.
3. **Coerção de tipos e igualdade.** \`==\` do JavaScript faz coisas estranhas. Existem \`null\` e \`undefined\` (dois "nadas"). Isso gera as pegadinhas clássicas.

O resto — sintaxe, arrays, dicionários, módulos — é tradução quase direta do que você já sabe.`,
        },
        {
          t: 'nota',
          estilo: 'dica',
          md: `**Como usar este laboratório:** leia a lição, mas *rode todo bloco de código*. Os blocos com o botão ▶ executam de verdade — no navegador ou num processo Node na sua máquina. Mexa nos valores, quebre, veja o erro. Aprender lendo é ilusão; aprender quebrando é permanente.`,
        },
        {
          t: 'texto',
          md: `### A trilha

- **1 · JavaScript essencial** — a linguagem, com o Python ao lado como tradutor.
- **2 · Assincronismo** — o event loop, promises, \`async/await\`. É *o* assunto do Node.
- **3 · Node.js** — módulos, arquivos, npm, variáveis de ambiente, CLI.
- **4 · Backend e APIs** — HTTP na unha, depois Express, REST, validação, erros.
- **5 · Projeto final** — uma API de inferência de visão computacional, ponta a ponta.

Se você fizer só até o módulo 4, já consegue construir e manter um backend de verdade. Os módulos 1 a 4 dão umas 6 a 8 horas de estudo ativo.`,
        },
        {
          t: 'texto',
          md: `### Onde o JavaScript roda

Uma confusão comum: "JavaScript" e "Node" não são a mesma coisa.

**JavaScript** é a linguagem. **V8** é o motor do Google que a executa. **Node.js** é o V8 embrulhado com acesso ao sistema operacional — arquivos, rede, processos. O **navegador** é o V8 embrulhado com acesso à página — DOM, cliques, telas.

Mesma linguagem, dois ambientes com poderes diferentes:`,
        },
        {
          t: 'py-js',
          tituloEsq: 'No navegador existe',
          tituloDir: 'No Node existe',
          py: `document.querySelector('#botao')
window.location
alert('oi')
localStorage

// mas NÃO existe:
// fs, process.exit, __dirname`,
          js: `fs.readFile('dados.json')
process.env.API_KEY
process.argv
http.createServer()

// mas NÃO existe:
// document, window, alert`,
          langEsq: 'js',
          nota: 'Os dois têm em comum o núcleo da linguagem e coisas modernas como `fetch`, `JSON`, `setTimeout`, `console.log` e `URL`.',
        },
      ],
    },
    {
      id: 'traducao',
      titulo: 'Colinha Python → JavaScript',
      minutos: 6,
      resumo: 'A tabela de tradução para consultar sempre que travar.',
      blocos: [
        {
          t: 'texto',
          md: `Guarde esta lição nos favoritos. Ela não é para decorar — é para consultar nas primeiras semanas até virar reflexo.`,
        },
        {
          t: 'tabela',
          colunas: ['Conceito', 'Python', 'JavaScript'],
          linhas: [
            ['Variável', 'x = 10', 'const x = 10  /  let x = 10'],
            ['Bloco', 'indentação + :', 'chaves { }'],
            ['Fim de linha', 'quebra de linha', 'ponto e vírgula (opcional)'],
            ['Comentário', '# assim', '// assim  ou  /* assim */'],
            ['Lista', '[1, 2, 3]', '[1, 2, 3]'],
            ['Dicionário', "{'a': 1}", '{ a: 1 }'],
            ['Tupla', '(1, 2)', 'não existe (use array)'],
            ['None', 'None', 'null e undefined'],
            ['True / False', 'True / False', 'true / false'],
            ['f-string', 'f"oi {nome}"', '`oi ${nome}`'],
            ['len(x)', 'len(lista)', 'lista.length'],
            ['for item in lista', 'for x in lista:', 'for (const x of lista)'],
            ['range(5)', 'for i in range(5)', 'for (let i = 0; i < 5; i++)'],
            ['List comprehension', '[f(x) for x in l]', 'l.map(f)'],
            ['Filtro', '[x for x in l if p(x)]', 'l.filter(p)'],
            ['sum(l)', 'sum(lista)', 'lista.reduce((a,b) => a+b, 0)'],
            ['Função', 'def f(a, b=1):', 'function f(a, b = 1) {}'],
            ['Lambda', 'lambda x: x * 2', '(x) => x * 2'],
            ['*args / **kwargs', 'def f(*a, **kw)', 'function f(...a)'],
            ['Desempacotar', 'a, b = par', 'const [a, b] = par'],
            ['Espalhar', 'f(*lista)  /  {**d}', 'f(...lista)  /  { ...obj }'],
            ['Classe', 'class A:', 'class A {}'],
            ['self', 'self', 'this'],
            ['Import', 'from m import f', "import { f } from './m.js'"],
            ['Instalar', 'pip install x', 'npm install x'],
            ['requirements.txt', 'requirements.txt', 'package.json'],
            ['venv', 'python -m venv', 'node_modules/ (por projeto)'],
            ['try/except', 'except Exception as e:', 'catch (e)'],
            ['Assíncrono', 'async def / await', 'async function / await'],
            ['asyncio.gather', 'await gather(a, b)', 'await Promise.all([a, b])'],
            ['time.sleep(1)', 'time.sleep(1)', 'await new Promise(r => setTimeout(r, 1000))'],
            ['JSON', 'json.dumps / loads', 'JSON.stringify / parse'],
            ['requests.get', 'requests.get(url)', 'await fetch(url)'],
            ['FastAPI / Flask', 'FastAPI', 'Express (ou Fastify)'],
            ['pytest', 'pytest', 'node --test  /  vitest'],
          ],
        },
        {
          t: 'nota',
          estilo: 'atencao',
          md: `A diferença que **não** aparece em tabela nenhuma: no Python, \`requests.get(url)\` **bloqueia** até a resposta chegar. No JavaScript, \`fetch(url)\` devolve na hora uma **promessa** de resposta futura, e o programa segue correndo. Esse é o módulo 2, e é o que mais derruba gente vindo do Python.`,
        },
      ],
    },
  ],
};
