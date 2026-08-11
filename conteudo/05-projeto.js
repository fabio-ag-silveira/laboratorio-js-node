export const modulo = {
  id: 'projeto',
  titulo: 'Testes e projeto final',
  subtitulo: 'Juntando tudo — e conectando com o seu mundo',
  cor: '#e88fb8',
  licoes: [
    // ------------------------------------------------------------------
    {
      id: 'testes',
      titulo: 'Testes automatizados',
      minutos: 9,
      resumo: 'O pytest do Node já vem instalado — e você nem sabia.',
      blocos: [
        {
          t: 'texto',
          md: `Durante anos, testar em Node significava instalar Jest ou Mocha. Desde o Node 18 existe um **executor de testes nativo**: \`node --test\`. Zero dependências, e é suficiente para a maioria dos projetos.`,
        },
        {
          t: 'py-js',
          py: `# test_mat.py
import pytest
from mat import somar

def test_soma_positivos():
    assert somar(2, 3) == 5

def test_soma_negativos():
    assert somar(-1, -1) == -2

class TestDivisao:
    def test_por_zero(self):
        with pytest.raises(ValueError):
            dividir(1, 0)

# rodar:  pytest`,
          js: `// mat.test.js
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { somar } from './mat.js';

test('soma positivos', () => {
  assert.equal(somar(2, 3), 5);
});

test('soma negativos', () => {
  assert.equal(somar(-1, -1), -2);
});

describe('divisão', () => {
  test('por zero lança', () => {
    assert.throws(() => dividir(1, 0));
  });
});

// rodar:  node --test`,
          nota: 'Use sempre `node:assert/strict`. A versão não estrita usa `==` nas comparações — a mesma armadilha da lição de igualdade.',
        },
        {
          t: 'codigo',
          titulo: 'Um arquivo de teste completo, rodando de verdade',
          rodar: 'node',
          codigo: `import test, { describe, before } from 'node:test';
import assert from 'node:assert/strict';

// --- o código sob teste (normalmente viria de um import) ---------------
function filtrarPorConfianca(deteccoes, limiar = 0.5) {
  if (!Array.isArray(deteccoes)) throw new TypeError('esperava um array');
  return deteccoes.filter((d) => d.conf >= limiar);
}

const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
async function carregarModelo(nome) {
  await dorme(10);
  if (!nome) throw new Error('nome obrigatório');
  return { nome, pronto: true };
}

// --- os testes ---------------------------------------------------------
describe('filtrarPorConfianca', () => {
  const amostra = [
    { classe: 'pessoa', conf: 0.9 },
    { classe: 'caixa', conf: 0.3 },
    { classe: 'colete', conf: 0.5 },
  ];

  test('mantém quem passa do limiar', () => {
    const r = filtrarPorConfianca(amostra, 0.5);
    assert.equal(r.length, 2);
  });

  test('o limiar é inclusivo', () => {
    const r = filtrarPorConfianca(amostra, 0.5);
    assert.ok(r.some((d) => d.classe === 'colete'));
  });

  test('usa 0.5 como padrão', () => {
    assert.deepEqual(
      filtrarPorConfianca(amostra).map((d) => d.classe),
      ['pessoa', 'colete'],
    );
  });

  test('lança se não for array', () => {
    assert.throws(() => filtrarPorConfianca('nada'), TypeError);
  });
});

describe('carregarModelo (assíncrono)', () => {
  test('resolve com o modelo', async () => {
    const m = await carregarModelo('yolo');
    assert.deepEqual(m, { nome: 'yolo', pronto: true });
  });

  test('rejeita sem nome', async () => {
    // repare no await: rejects devolve promise
    await assert.rejects(() => carregarModelo(''), /obrigatório/);
  });
});`,
        },
        {
          t: 'texto',
          md: `### As asserções que você vai usar

| Asserção | Para quê |
|---|---|
| \`assert.equal(a, b)\` | valores primitivos (usa \`===\` no modo strict) |
| \`assert.deepEqual(a, b)\` | objetos e arrays, comparando conteúdo |
| \`assert.ok(x)\` | x é verdadeiro |
| \`assert.throws(fn, Erro)\` | a função lança |
| \`await assert.rejects(fn)\` | a promise rejeita |
| \`assert.match(txt, /re/)\` | texto casa com a expressão |

E no \`package.json\`:

\`\`\`json
"scripts": {
  "test": "node --test",
  "test:watch": "node --test --watch"
}
\`\`\`

O Node encontra sozinho arquivos \`*.test.js\`, \`*.spec.js\` e qualquer coisa dentro de \`test/\`.`,
        },
        {
          t: 'nota',
          estilo: 'dica',
          md: `Se o projeto crescer, o **Vitest** é o padrão de mercado hoje — mais rápido, com cobertura e mocks melhores. Mas a API é quase idêntica à nativa, então começar com \`node --test\` não é jogar tempo fora.`,
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'orquestrar-python',
      titulo: 'Node orquestrando Python',
      minutos: 12,
      resumo: 'O padrão que faz mais sentido para a sua carreira: cada linguagem no que é boa.',
      blocos: [
        {
          t: 'texto',
          md: `Aqui está a resposta honesta para "devo reescrever minha visão computacional em JavaScript?": **não.**

Node é ruim em CPU pesada — uma thread só, e inferência trava tudo. Python tem OpenCV, PyTorch, NumPy. A arquitetura que se usa de verdade no mercado é esta:

> **Node na frente** — API, autenticação, fila, WebSocket, banco, tempo real.
> **Python atrás** — o modelo, o processamento pesado.

Você já domina metade dessa arquitetura. Aprender Node te dá a outra metade — e é exatamente isso que amplia seu mercado.

Há duas formas de ligar os dois.`,
        },
        {
          t: 'texto',
          md: `### Forma 1 — Node chama um processo Python

Simples, sem infra extra. Bom para lotes e tarefas pontuais. É o \`subprocess\` do Python, ao contrário.`,
        },
        {
          t: 'codigo',
          titulo: 'spawn: rodando um script Python a partir do Node',
          rodar: 'node',
          codigo: `import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

// 1. Escrevemos um script Python de exemplo num arquivo temporário.
const pasta = os.tmpdir();
const script = path.join(pasta, 'worker_lab.py');

await fs.writeFile(script, \`
import sys, json

# lê JSON da entrada padrão, "processa", devolve JSON na saída padrão
entrada = json.load(sys.stdin)
deteccoes = entrada["deteccoes"]
limiar = entrada.get("limiar", 0.5)

resultado = {
    "mantidas": [d for d in deteccoes if d["conf"] >= limiar],
    "descartadas": len([d for d in deteccoes if d["conf"] < limiar]),
}
print(json.dumps(resultado))
\`, 'utf8');

// 2. Uma função que embrulha o subprocesso numa promise.
function chamarPython(script, entrada) {
  return new Promise((resolver, rejeitar) => {
    const py = spawn('python', [script]);

    let saida = '';
    let erro = '';
    py.stdout.on('data', (d) => { saida += d; });
    py.stderr.on('data', (d) => { erro += d; });

    py.on('error', () => rejeitar(new Error('Python não encontrado no PATH')));

    py.on('close', (codigo) => {
      if (codigo !== 0) return rejeitar(new Error(erro || \`saiu com código \${codigo}\`));
      try { resolver(JSON.parse(saida)); }
      catch { rejeitar(new Error('Python não devolveu JSON: ' + saida.slice(0, 200))); }
    });

    // 3. Mandamos os dados pela entrada padrão e fechamos.
    py.stdin.write(JSON.stringify(entrada));
    py.stdin.end();
  });
}

// 4. Usando.
try {
  const resultado = await chamarPython(script, {
    deteccoes: [
      { classe: 'pessoa', conf: 0.94 },
      { classe: 'caixa', conf: 0.31 },
      { classe: 'colete', conf: 0.72 },
    ],
    limiar: 0.5,
  });
  console.log('o Python respondeu:', resultado);
} catch (e) {
  console.log('falhou:', e.message);
  console.log('(se o Python não estiver no PATH como "python", troque para "python3")');
} finally {
  await fs.unlink(script).catch(() => {});
}`,
        },
        {
          t: 'nota',
          estilo: 'atencao',
          md: `\`spawn\` paga o custo de subir o interpretador **a cada chamada** — e, se o script carrega um modelo, o custo é enorme. Serve para lotes, não para requisições em tempo real. Para isso, use a forma 2.`,
        },
        {
          t: 'texto',
          md: `### Forma 2 — Python vira um serviço HTTP

O Python sobe uma vez (FastAPI), carrega o modelo uma vez, e fica esperando. O Node conversa com ele por HTTP. É o padrão de produção.

\`\`\`
navegador  →  Node (API, auth, banco)  →  FastAPI (modelo carregado)
\`\`\`

Cada um escala separado, cada um cai separado, e você pode ter três réplicas do worker e uma do Node.`,
        },
        {
          t: 'codigo',
          titulo: 'O lado Node: chamando o serviço de inferência',
          rodar: null,
          codigo: `// servico-inferencia.js
const URL_INFERENCIA = process.env.URL_INFERENCIA ?? 'http://localhost:8000';

export async function inferir(imagemBase64, { limiar = 0.5 } = {}) {
  const resposta = await fetch(\`\${URL_INFERENCIA}/predict\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imagem: imagemBase64, limiar }),
    // inferência pode demorar — timeout generoso, mas existente
    signal: AbortSignal.timeout(30_000),
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text();
    throw new Error(\`worker respondeu \${resposta.status}: \${detalhe.slice(0, 200)}\`);
  }
  return resposta.json();
}

// E no seu Express:
//
//   app.post('/api/analisar', async (req, res, next) => {
//     try {
//       const resultado = await inferir(req.body.imagem);
//       await salvarNoBanco(resultado);          // Node cuida do banco
//       res.status(201).json(resultado);
//     } catch (erro) {
//       next(erro);                               // vai para o tratador
//     }
//   });`,
        },
        {
          t: 'nota',
          estilo: 'dica',
          md: `Repare no \`try/catch\` com \`next(erro)\` na rota assíncrona. **No Express 4, um erro dentro de uma função \`async\` não é capturado automaticamente** — a promise rejeita e ninguém pega, e a requisição fica pendurada até dar timeout. Ou você embrulha em \`try/catch\`, ou usa um wrapper. (O Express 5 corrigiu isso.)`,
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'projeto-final',
      titulo: 'Projeto final: API de detecções',
      minutos: 45,
      resumo: 'Construa do zero, com roteiro e critérios de aceitação.',
      blocos: [
        {
          t: 'texto',
          md: `Chegou a hora de escrever sozinho. Você vai construir uma API que armazena e consulta detecções — o mesmo domínio que você viu no laboratório, mas agora **do seu jeito**, num projeto separado.

Não copie o \`servidor/api-lab.js\`. Consulte se travar, mas escreva do zero: é a diferença entre reconhecer e saber.`,
        },
        {
          t: 'texto',
          md: `### Passo 0 — Montar o projeto

\`\`\`bash
mkdir api-deteccoes
cd api-deteccoes
npm init -y
npm install express
npm pkg set type=module
npm pkg set scripts.dev="node --watch src/index.js"
npm pkg set scripts.test="node --test"
\`\`\`

Estrutura sugerida — separar em camadas é o que torna o projeto testável:

\`\`\`
api-deteccoes/
├── package.json
├── .env                 (PORTA=3000, e NO .gitignore)
├── src/
│   ├── index.js         sobe o servidor
│   ├── app.js           monta o express (sem listen — para testar!)
│   ├── rotas.js         as rotas
│   ├── repositorio.js   os dados (array na memória, por enquanto)
│   └── validacao.js     as regras de validação
└── test/
    └── api.test.js
\`\`\``,
        },
        {
          t: 'nota',
          estilo: 'dica',
          md: `Aquele detalhe de \`app.js\` **não** chamar \`listen()\` é o truque mais valioso desta lição. Com o app separado, seus testes importam o app e sobem ele numa porta aleatória — sem depender de servidor rodando, sem conflito de porta, e podendo rodar vários testes em paralelo.`,
        },
        {
          t: 'texto',
          md: `### Passo 1 — Os requisitos

| Rota | Comportamento |
|---|---|
| \`GET /saude\` | \`200\` com \`{ ok: true, tempoNoAr: <segundos> }\` |
| \`GET /deteccoes\` | lista; aceita \`?classe=\`, \`?min_conf=\`, \`?limite=\` |
| \`GET /deteccoes/:id\` | \`200\` ou \`404\` |
| \`POST /deteccoes\` | valida; \`201\` + \`Location\`, ou \`400\` com a lista de erros |
| \`PATCH /deteccoes/:id\` | atualiza parcial; \`200\`, \`400\` ou \`404\` |
| \`DELETE /deteccoes/:id\` | \`204\` ou \`404\` |
| \`GET /estatisticas\` | total, contagem por classe, confiança média |

Regras de validação para \`POST\`:

- \`classe\`: string não vazia, **obrigatória**
- \`confianca\`: número entre 0 e 1, **obrigatória** (e \`0\` é válido!)
- \`caixa\`: array de exatamente 4 números, **obrigatória**
- \`camera\`: string, opcional, padrão \`"desconhecida"\`

Erros devem sair assim: \`{ "erro": "Dados inválidos", "detalhes": ["classe: obrigatória", ...] }\``,
        },
        {
          t: 'texto',
          md: `### Passo 2 — Critérios de aceitação

Considere pronto quando **todos** estes passarem:

- [ ] \`npm run dev\` sobe e \`GET /saude\` responde 200
- [ ] \`POST\` com corpo válido devolve **201** e o cabeçalho \`Location\`
- [ ] \`POST\` com \`confianca: 0\` é **aceito** (não caia na armadilha do falsy)
- [ ] \`POST\` com \`confianca: 5\` devolve **400** e lista o motivo
- [ ] \`POST\` sem \`Content-Type: application/json\` não derruba o servidor
- [ ] \`GET /deteccoes/999\` devolve **404** com JSON, não uma página de erro HTML
- [ ] \`DELETE\` devolve **204** sem corpo
- [ ] Uma rota que estoura devolve **500** com JSON, e o processo **continua vivo**
- [ ] Rota inexistente devolve **404** em JSON
- [ ] \`npm test\` passa com pelo menos 6 testes
- [ ] Nenhum segredo no código: porta vem de \`process.env\``,
        },
        {
          t: 'codigo',
          titulo: 'Ponto de partida — app.js separado do listen',
          rodar: null,
          codigo: `// src/app.js — monta e devolve o app, SEM subir o servidor
import express from 'express';
import { rotas } from './rotas.js';

export function criarApp() {
  const app = express();

  app.use(express.json());

  // log simples de requisições
  app.use((req, res, next) => {
    const t0 = Date.now();
    res.on('finish', () =>
      console.log(\`\${req.method} \${req.originalUrl} \${res.statusCode} \${Date.now() - t0}ms\`),
    );
    next();
  });

  app.use(rotas);

  // 404 em JSON
  app.use((req, res) => res.status(404).json({ erro: 'rota não encontrada' }));

  // tratador de erro — 4 parâmetros, sempre por último
  app.use((erro, req, res, _next) => {
    console.error(erro);
    // erro de JSON malformado vem do express.json() com status 400
    if (erro.type === 'entity.parse.failed') {
      return res.status(400).json({ erro: 'JSON malformado' });
    }
    res.status(500).json({ erro: 'erro interno' });
  });

  return app;
}

// ---------------------------------------------------------------
// src/index.js — só este arquivo sobe o servidor
//
//   import { criarApp } from './app.js';
//   const PORTA = Number(process.env.PORTA ?? 3000);
//   criarApp().listen(PORTA, () => console.log('no ar em ' + PORTA));
// ---------------------------------------------------------------`,
        },
        {
          t: 'codigo',
          titulo: 'Ponto de partida — o teste de integração',
          rodar: null,
          codigo: `// test/api.test.js
import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { criarApp } from '../src/app.js';

let servidor;
let base;

before(async () => {
  // porta 0 = o sistema escolhe uma livre. Sem conflito, sempre.
  servidor = criarApp().listen(0);
  await new Promise((r) => servidor.once('listening', r));
  base = \`http://localhost:\${servidor.address().port}\`;
});

after(() => servidor.close());

const pedir = (rota, opcoes = {}) =>
  fetch(base + rota, {
    ...opcoes,
    headers: opcoes.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opcoes.body ? JSON.stringify(opcoes.body) : undefined,
  });

describe('POST /deteccoes', () => {
  test('cria e devolve 201 com Location', async () => {
    const r = await pedir('/deteccoes', {
      method: 'POST',
      body: { classe: 'pessoa', confianca: 0.9, caixa: [0, 0, 10, 10] },
    });
    assert.equal(r.status, 201);
    assert.ok(r.headers.get('location'));
  });

  test('aceita confianca igual a 0', async () => {
    const r = await pedir('/deteccoes', {
      method: 'POST',
      body: { classe: 'caixa', confianca: 0, caixa: [0, 0, 1, 1] },
    });
    assert.equal(r.status, 201);
  });

  test('rejeita confianca fora do intervalo', async () => {
    const r = await pedir('/deteccoes', {
      method: 'POST',
      body: { classe: 'caixa', confianca: 5, caixa: [0, 0, 1, 1] },
    });
    assert.equal(r.status, 400);
    const corpo = await r.json();
    assert.ok(Array.isArray(corpo.detalhes));
  });
});

describe('GET /deteccoes/:id', () => {
  test('404 para id inexistente', async () => {
    const r = await pedir('/deteccoes/999999');
    assert.equal(r.status, 404);
    assert.equal(r.headers.get('content-type')?.includes('json'), true);
  });
});`,
        },
        {
          t: 'texto',
          md: `### Passo 3 — Se sobrar fôlego

Extensões em ordem de utilidade para o seu currículo:

1. **Persistir em arquivo** — salve num \`dados.json\` com \`fs/promises\`, carregue na inicialização.
2. **Trocar por SQLite** — o Node 22+ tem \`node:sqlite\` embutido. Zero dependências, SQL de verdade.
3. **Validação com Zod** — \`npm i zod\`. É o Pydantic do JavaScript, e a comparação vai fazer sentido imediato para você.
4. **Documentar com OpenAPI** — para chegar perto do \`/docs\` automático do FastAPI.
5. **Dockerizar** — \`Dockerfile\` com \`node:22-alpine\`, e um \`docker-compose\` subindo Node + o worker Python.
6. **Ligar no worker Python** — o passo que junta tudo: um endpoint \`POST /analisar\` que recebe imagem, chama o FastAPI com o modelo, guarda o resultado e devolve.

O item 6 é o projeto de portfólio. "API em Node orquestrando inferência em Python, com testes e Docker" é uma frase que abre portas — e cobre as duas pontas que você quer dominar.`,
        },
        {
          t: 'nota',
          estilo: 'dica',
          md: `Quando terminar, volte aqui e compare sua solução com \`servidor/api-lab.js\`. Diferenças não significam erro — significam decisões de projeto diferentes. Mas vale entender **por que** cada um escolheu o que escolheu.`,
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'proximos-passos',
      titulo: 'Para onde ir depois',
      minutos: 5,
      resumo: 'O mapa do que existe além, e em que ordem faz sentido.',
      blocos: [
        {
          t: 'texto',
          md: `Terminando os módulos 1 a 4 você tem o fundamental. A partir daqui, a ordem depende do que você quer. Minha sugestão, na ordem de melhor retorno para quem vem de Python e visão computacional:`,
        },
        {
          t: 'tabela',
          colunas: ['Ordem', 'O quê', 'Por quê', 'Análogo Python'],
          linhas: [
            ['1', 'TypeScript', 'É o padrão de mercado. Você já pensa com tipos.', 'type hints + mypy'],
            ['2', 'Zod', 'Validar entrada de API sem escrever if à mão.', 'Pydantic'],
            ['3', 'SQLite / Postgres + Drizzle', 'Persistência de verdade.', 'SQLAlchemy'],
            ['4', 'Docker', 'Empacotar Node e Python juntos.', 'igual'],
            ['5', 'Vitest', 'Testes com cobertura e mocks.', 'pytest'],
            ['6', 'Fastify', 'Alternativa ao Express: mais rápida, valida por padrão.', 'FastAPI'],
            ['7', 'WebSocket / SSE', 'Enviar detecções ao vivo para o navegador.', 'websockets'],
            ['8', 'Filas (BullMQ)', 'Processar inferência em segundo plano.', 'Celery'],
            ['9', 'React ou Svelte', 'Só se quiser fazer a interface também.', '—'],
          ],
        },
        {
          t: 'nota',
          estilo: 'dica',
          md: `**TypeScript primeiro, sempre.** Você vem de um mundo com tipagem opcional e provavelmente já usa type hints. O TypeScript resolve exatamente aquela classe de bug que mais incomoda no JavaScript — o \`undefined\` que aparece três funções depois. E hoje quase toda vaga de backend Node pede.`,
        },
        {
          t: 'texto',
          md: `### O que você já consegue fazer

Se você fez os exercícios e o projeto final, hoje você consegue:

- ler e escrever JavaScript moderno sem consultar sintaxe a cada linha;
- entender por que um código assíncrono roda "fora de ordem" — e consertar;
- construir uma API REST com validação, erros e testes;
- consumir APIs de terceiros com timeout e retry decentes;
- explicar numa entrevista por que Node é bom para I/O e ruim para CPU;
- desenhar uma arquitetura Node + Python que aproveita o melhor dos dois.

Isso é o fundamental. O resto é vocabulário, e vocabulário se aprende construindo.`,
        },
        {
          t: 'texto',
          md: `### Referências que valem a pena

- **MDN Web Docs** — a documentação de JavaScript. Não use W3Schools.
- **javascript.info** — o melhor tutorial gratuito, muito bem escrito.
- **Documentação oficial do Node** — surpreendentemente boa. Leia a página do módulo antes de instalar um pacote; muita coisa já vem embutida.
- **You Don't Know JS** (Kyle Simpson) — de graça no GitHub, para quando quiser entender o *porquê* das esquisitices.`,
        },
      ],
    },
  ],
};
