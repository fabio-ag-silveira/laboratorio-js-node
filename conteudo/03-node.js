export const modulo = {
  id: 'node',
  titulo: 'Node.js',
  subtitulo: 'Módulos, arquivos, npm e linha de comando',
  cor: '#7ec96a',
  licoes: [
    // ------------------------------------------------------------------
    {
      id: 'modulos',
      titulo: 'Módulos: ESM e CommonJS',
      minutos: 9,
      resumo: 'Os dois sistemas de import — e como não se enrolar entre eles.',
      blocos: [
        {
          t: 'texto',
          md: `O Node tem **dois** sistemas de módulos convivendo. Isso é dívida histórica, e é a primeira coisa que confunde.

- **CommonJS (CJS)** — o antigo. \`require()\` e \`module.exports\`. Ainda domina o código existente.
- **ES Modules (ESM)** — o padrão oficial. \`import\` / \`export\`. É o que você deve escrever hoje.

Como o Node decide qual usar? Pelo \`package.json\`:

- \`"type": "module"\` → arquivos \`.js\` são ESM
- sem isso (ou \`"type": "commonjs"\`) → arquivos \`.js\` são CJS

Você também pode forçar pela extensão: \`.mjs\` é sempre ESM, \`.cjs\` é sempre CJS.`,
        },
        {
          t: 'py-js',
          tituloEsq: 'CommonJS (antigo)',
          tituloDir: 'ES Modules (use este)',
          langEsq: 'js',
          py: `// exportar
module.exports = { somar, PI };
// ou
exports.somar = somar;

// importar
const { somar } = require('./mat');
const fs = require('fs');

// atalhos que EXISTEM aqui:
__dirname
__filename`,
          js: `// exportar
export function somar(a, b) { ... }
export const PI = 3.14;
export default algo;

// importar
import { somar } from './mat.js';
import fs from 'node:fs';

// __dirname NÃO existe. Receita:
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(
  fileURLToPath(import.meta.url)
);`,
          nota: 'Em ESM, a **extensão do arquivo é obrigatória**: `./mat.js`, não `./mat`. Quem vem de Python ou de CJS esquece disso o tempo todo.',
        },
        {
          t: 'codigo',
          titulo: 'Exportar e importar na prática',
          rodar: 'node',
          codigo: `// Este bloco simula dois arquivos num só, para você ver a forma.
// Num projeto real seriam mat.js e index.js.

/* ---- arquivo mat.js -------------------------------
export const PI = 3.14159;                 // exportação nomeada
export function area(r) { return PI * r * r; }
export default function circunferencia(r) { return 2 * PI * r; }
---------------------------------------------------- */

/* ---- arquivo index.js -----------------------------
import circunferencia, { PI, area } from './mat.js';
//     ^ default        ^ nomeadas (chaves obrigatórias)

import * as mat from './mat.js';           // tudo num objeto
import { area as areaDoCirculo } from './mat.js';  // renomear
---------------------------------------------------- */

// Módulos internos do Node: prefixe com "node:" — deixa explícito
// que não é um pacote do npm com o mesmo nome.
import path from 'node:path';
import os from 'node:os';

console.log('separador de caminho:', path.sep);
console.log('sistema:', os.platform());
console.log('CPUs:', os.cpus().length);
console.log('pasta temporária:', os.tmpdir());`,
        },
        {
          t: 'nota',
          estilo: 'dica',
          md: `Diferente do Python, **não existe \`import *\` que despeja nomes no escopo**. Você importa explicitamente ou pega tudo num objeto (\`import * as mat\`). Isso é bom: nunca fica dúvida de onde um nome veio.`,
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'arquivos',
      titulo: 'Arquivos e caminhos',
      minutos: 9,
      resumo: 'fs/promises e path — sem apanhar do Windows.',
      blocos: [
        {
          t: 'texto',
          md: `O módulo \`fs\` tem **três** versões de cada função. Use sempre a primeira:

1. \`fs/promises\` — assíncrona com promises. **É esta.**
2. \`fs\` com callback — o estilo antigo, \`fs.readFile(caminho, (erro, dados) => ...)\`.
3. \`fs\` síncrona — \`readFileSync\`. Bloqueia o event loop. Só na inicialização, nunca durante o atendimento de requisições.`,
        },
        {
          t: 'py-js',
          py: `from pathlib import Path
import json

texto = Path("dados.json").read_text()
dados = json.loads(texto)

Path("saida.json").write_text(
    json.dumps(dados, indent=2)
)

Path("pasta").mkdir(parents=True,
                    exist_ok=True)

for p in Path(".").glob("*.json"):
    print(p.name)`,
          js: `import fs from 'node:fs/promises';

const texto = await fs.readFile('dados.json', 'utf8');
const dados = JSON.parse(texto);

await fs.writeFile(
  'saida.json',
  JSON.stringify(dados, null, 2)
);

await fs.mkdir('pasta', { recursive: true });

const arquivos = await fs.readdir('.');
for (const a of arquivos.filter(a => a.endsWith('.json'))) {
  console.log(a);
}`,
          nota: 'Sem o `"utf8"` no `readFile`, você recebe um **Buffer** (bytes crus), não uma string. Esquecer disso rende `<Buffer 7b 0a 20...>` no console.',
        },
        {
          t: 'codigo',
          titulo: 'Ler, escrever e limpar — de verdade, na sua máquina',
          rodar: 'node',
          codigo: `import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

// Trabalhamos na pasta temporária para não sujar seu projeto.
const pasta = path.join(os.tmpdir(), 'lab-js');
await fs.mkdir(pasta, { recursive: true });

const arquivo = path.join(pasta, 'deteccoes.json');

const dados = [
  { classe: 'pessoa', conf: 0.94 },
  { classe: 'capacete', conf: 0.88 },
];

await fs.writeFile(arquivo, JSON.stringify(dados, null, 2), 'utf8');
console.log('escrevi em:', arquivo);

const texto = await fs.readFile(arquivo, 'utf8');
const lidos = JSON.parse(texto);
console.log('li de volta:', lidos.length, 'itens');
console.log('primeira classe:', lidos[0].classe);

// listar
console.log('conteúdo da pasta:', await fs.readdir(pasta));

// existe? Não há fs.exists — o idioma é tentar e capturar.
try {
  await fs.access(arquivo);
  console.log('o arquivo existe');
} catch {
  console.log('não existe');
}

await fs.rm(pasta, { recursive: true, force: true });
console.log('limpei tudo');`,
        },
        {
          t: 'nota',
          estilo: 'atencao',
          md: `**Nunca monte caminhos concatenando strings** com \`'/'\`. No Windows o separador é \`\\\`. Use \`path.join()\` — ele resolve isso, além de normalizar \`..\` e barras duplicadas. É o equivalente do \`os.path.join\` / \`Path()\` do Python, e o mesmo motivo para existir.`,
        },
        {
          t: 'codigo',
          titulo: 'path: as funções que importam',
          rodar: 'node',
          codigo: `import path from 'node:path';

const p = path.join('projeto', 'dados', 'lote.json');
console.log('join:      ', p);            // usa \\ no Windows, / no Linux
console.log('resolve:   ', path.resolve(p));  // vira caminho absoluto
console.log('dirname:   ', path.dirname(p));
console.log('basename:  ', path.basename(p));
console.log('sem ext:   ', path.basename(p, '.json'));
console.log('extname:   ', path.extname(p));

// A receita do __dirname em ESM — decore, você vai usar sempre:
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
console.log('__dirname: ', __dirname);`,
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'npm',
      titulo: 'npm e package.json',
      minutos: 8,
      resumo: 'O pip e o requirements.txt do mundo JS — com uma diferença importante.',
      blocos: [
        {
          t: 'texto',
          md: `A grande diferença cultural: no Python você cria um **ambiente virtual** e instala pacotes nele. No Node, as dependências vão para uma pasta \`node_modules/\` **dentro do próprio projeto**, sempre.

Ou seja: o isolamento é automático e por projeto. Não existe \`venv\` porque não é preciso. E você **nunca** commita \`node_modules/\` — é por isso que ela está no \`.gitignore\` deste laboratório.`,
        },
        {
          t: 'tabela',
          colunas: ['Objetivo', 'Python', 'npm'],
          linhas: [
            ['Iniciar projeto', 'poetry init', 'npm init -y'],
            ['Instalar pacote', 'pip install express', 'npm install express'],
            ['Só para dev', 'pip install -G dev pytest', 'npm install -D vitest'],
            ['Instalar tudo', 'pip install -r requirements.txt', 'npm install'],
            ['Lista travada', 'requirements.txt / poetry.lock', 'package-lock.json'],
            ['Remover', 'pip uninstall x', 'npm uninstall x'],
            ['Rodar script', 'python -m pytest', 'npm run test'],
            ['Executar sem instalar', 'pipx run x', 'npx x'],
            ['Ver desatualizados', 'pip list --outdated', 'npm outdated'],
            ['Auditar segurança', 'pip-audit', 'npm audit'],
          ],
        },
        {
          t: 'codigo',
          titulo: 'Anatomia de um package.json',
          rodar: null,
          lang: 'json',
          codigo: `{
  "name": "minha-api",
  "version": "1.0.0",
  "type": "module",              // ← ativa import/export nos .js
  "main": "src/index.js",

  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js",   // reinicia ao salvar
    "test": "node --test"                  // test runner nativo!
  },

  "dependencies": {
    "express": "^4.19.2"          // vai para produção
  },
  "devDependencies": {
    "vitest": "^1.6.0"            // só na sua máquina / CI
  }
}`,
        },
        {
          t: 'texto',
          md: `### Os símbolos de versão

\`"express": "^4.19.2"\` — aquele \`^\` diz **quanto** o npm pode atualizar sozinho:

- \`^4.19.2\` — aceita qualquer \`4.x.x\` a partir de 4.19.2. **Não** sobe para 5. *(padrão)*
- \`~4.19.2\` — aceita só \`4.19.x\`. Mais conservador.
- \`4.19.2\` — exatamente esta. Mais rígido.

Isso funciona porque o ecossistema segue **versionamento semântico**: \`MAIOR.MENOR.CORREÇÃO\`, onde só o número MAIOR pode quebrar sua aplicação.

O \`package-lock.json\` grava as versões **exatas** que foram instaladas, para que a máquina do colega e o servidor tenham exatamente o mesmo. **Commite sempre o lock.**`,
        },
        {
          t: 'nota',
          estilo: 'dica',
          md: `Em CI ou em produção, use \`npm ci\` em vez de \`npm install\`. Ele instala **exatamente** o que está no lock, apaga \`node_modules\` antes e é bem mais rápido. \`npm install\` pode atualizar o lock; \`npm ci\` nunca.`,
        },
        {
          t: 'codigo',
          titulo: 'Os comandos do dia a dia',
          rodar: null,
          lang: 'bash',
          codigo: `npm init -y                # cria package.json com padrões
npm install express        # instala e grava em dependencies
npm install -D vitest      # instala como dependência de desenvolvimento
npm ci                     # instalação limpa e reproduzível (CI/produção)

npm run dev                # roda o script "dev"
npm start                  # atalho: "start" dispensa o "run"

npx create-vite minha-app  # roda um pacote SEM instalar globalmente
npm outdated               # o que está velho
npm audit fix              # corrige vulnerabilidades conhecidas`,
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'process',
      titulo: 'process, ambiente e CLI',
      minutos: 8,
      resumo: 'Configuração, argumentos e como não vazar segredo no git.',
      blocos: [
        {
          t: 'texto',
          md: `O objeto global \`process\` é a sua janela para o sistema operacional. É o \`sys\` + \`os\` + \`argparse\` do Python, tudo num lugar.`,
        },
        {
          t: 'py-js',
          py: `import sys, os

sys.argv[1:]
os.environ.get("API_KEY")
os.environ["PORTA"] = "3000"
sys.exit(1)
os.getcwd()
sys.version`,
          js: `// process é global — não precisa importar

process.argv.slice(2)
process.env.API_KEY
process.env.PORTA = '3000'
process.exit(1)
process.cwd()
process.version`,
          nota: '`process.argv[0]` é o caminho do node e `[1]` é o do seu script. Por isso o `.slice(2)` — equivalente ao `sys.argv[1:]`.',
        },
        {
          t: 'codigo',
          titulo: 'Lendo configuração do ambiente',
          rodar: 'node',
          codigo: `// Padrão de ouro: valor do ambiente, com fallback sensato.
const PORTA = Number(process.env.PORTA ?? 3000);
const AMBIENTE = process.env.NODE_ENV ?? 'desenvolvimento';
const DEBUG = process.env.DEBUG === 'true';   // env é SEMPRE string!

console.log({ PORTA, AMBIENTE, DEBUG });

console.log('node:', process.version);
console.log('plataforma:', process.platform);
console.log('pasta atual:', process.cwd());
console.log('argumentos:', process.argv.slice(2));

// memória em uso (útil para diagnosticar vazamento)
const mem = process.memoryUsage();
console.log('heap:', (mem.heapUsed / 1024 / 1024).toFixed(1), 'MB');`,
        },
        {
          t: 'nota',
          estilo: 'atencao',
          md: `**Toda variável de ambiente é string.** \`process.env.PORTA\` é \`"3000"\`, não \`3000\`. E \`process.env.DEBUG\` valendo a string \`"false"\` é **verdadeiro** num \`if\`, porque toda string não vazia é verdadeira. Sempre converta explicitamente: \`Number(...)\` ou \`=== 'true'\`.`,
        },
        {
          t: 'texto',
          md: `### Segredos: o arquivo \`.env\`

A convenção universal é guardar segredos num arquivo \`.env\` na raiz do projeto, **que nunca vai para o git**. O Node 20+ lê esse arquivo nativamente — não precisa mais do pacote \`dotenv\`.`,
        },
        {
          t: 'codigo',
          titulo: '.env na prática',
          rodar: null,
          lang: 'bash',
          codigo: `# arquivo .env (na raiz, e NO .gitignore)
PORTA=8080
API_KEY=sk-secreto-nao-commite
NODE_ENV=desenvolvimento

# Node 20.6+ carrega sozinho:
node --env-file=.env src/index.js

# ou no package.json:
#   "dev": "node --env-file=.env --watch src/index.js"`,
        },
        {
          t: 'texto',
          md: `### Um CLI de verdade

Com \`process.argv\` e o \`parseArgs\` nativo você monta uma ferramenta de linha de comando sem instalar nada — o \`argparse\` do Node.`,
        },
        {
          t: 'codigo',
          titulo: 'CLI com parseArgs nativo',
          rodar: 'node',
          codigo: `import { parseArgs } from 'node:util';

// Simulamos os argumentos para o exemplo rodar aqui.
// Num script de verdade você omite "args" e ele usa process.argv.
const argumentosDeTeste = ['--entrada', 'lote.json', '--limiar', '0.7', '--verbose'];

const { values } = parseArgs({
  args: argumentosDeTeste,
  options: {
    entrada: { type: 'string', short: 'e' },
    limiar:  { type: 'string', short: 'l', default: '0.5' },
    verbose: { type: 'boolean', short: 'v', default: false },
  },
});

const limiar = Number(values.limiar);

console.log('entrada:', values.entrada);
console.log('limiar: ', limiar, '(agora é número:', typeof limiar + ')');
console.log('verbose:', values.verbose);

if (!values.entrada) {
  console.error('uso: node cli.js --entrada <arquivo> [--limiar 0.7] [-v]');
  process.exit(1);   // código != 0 sinaliza erro para o shell
}`,
        },
      ],
    },
  ],
};
