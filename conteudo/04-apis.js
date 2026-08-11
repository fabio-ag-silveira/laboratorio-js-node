export const modulo = {
  id: 'apis',
  titulo: 'Backend e APIs',
  subtitulo: 'HTTP na unha, depois Express — e uma API rodando de verdade',
  cor: '#6aa9f0',
  licoes: [
    // ------------------------------------------------------------------
    {
      id: 'http',
      titulo: 'HTTP: o que passa no fio',
      minutos: 10,
      resumo: 'Métodos, status, cabeçalhos — o vocabulário que todo backend usa.',
      blocos: [
        {
          t: 'texto',
          md: `Antes de escrever servidor, vale fixar o protocolo. HTTP é simples: o cliente manda um **pedido** em texto, o servidor devolve uma **resposta** em texto.

Um pedido tem quatro partes: **método**, **caminho**, **cabeçalhos** e (às vezes) **corpo**.

\`\`\`
POST /api/lab/deteccoes HTTP/1.1        ← método + caminho
Host: localhost:3000                     ← cabeçalhos
Content-Type: application/json
Authorization: Bearer abc123

{"classe":"pessoa","confianca":0.9}      ← corpo
\`\`\`

E a resposta:

\`\`\`
HTTP/1.1 201 Created                     ← status
Content-Type: application/json
Location: /api/lab/deteccoes/7

{"id":7,"classe":"pessoa", ...}
\`\`\``,
        },
        {
          t: 'texto',
          md: `### Os métodos

| Método | Uso | Seguro? | Idempotente? |
|---|---|---|---|
| \`GET\` | ler | sim | sim |
| \`POST\` | criar | não | **não** |
| \`PUT\` | substituir inteiro | não | sim |
| \`PATCH\` | atualizar em parte | não | não |
| \`DELETE\` | remover | não | sim |

**Idempotente** = repetir o mesmo pedido dá o mesmo resultado final. \`DELETE\` duas vezes deixa o recurso apagado do mesmo jeito. \`POST\` duas vezes cria **dois** registros — por isso o clique duplo no botão "Salvar" é um problema clássico.`,
        },
        {
          t: 'texto',
          md: `### Os status que importam

Você não precisa decorar os 60. Precisa desses:`,
        },
        {
          t: 'visual',
          componente: 'tabela-status',
        },
        {
          t: 'nota',
          estilo: 'dica',
          md: `A regra mental: **4xx é culpa de quem pediu, 5xx é culpa de quem respondeu.** Se o cliente mandou JSON malformado, é 400 — não 500. Trocar isso confunde quem vai depurar (inclusive você, às 2 da manhã).`,
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'servidor-cru',
      titulo: 'Um servidor HTTP do zero',
      minutos: 12,
      resumo: 'Sem framework, para ver o que o Express esconde.',
      blocos: [
        {
          t: 'texto',
          md: `Vamos escrever um servidor com o módulo \`http\` puro. Ninguém faz isso em produção — mas fazer **uma vez** muda sua relação com frameworks. Depois disso, Express deixa de ser mágica e vira conveniência.

Aliás: o servidor que está servindo esta página é exatamente isso. Abra \`servidor/index.js\` no seu editor depois.`,
        },
        {
          t: 'codigo',
          titulo: 'O servidor mínimo',
          rodar: 'node',
          codigo: `import { createServer } from 'node:http';

const servidor = createServer((req, res) => {
  // req  = o pedido  (método, url, cabeçalhos, corpo em stream)
  // res  = a resposta (você escreve nela)
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Olá do Node!');
});

servidor.listen(0, () => {
  // porta 0 = "sistema, escolhe uma livre" — útil para testes
  const { port } = servidor.address();
  console.log('escutando na porta', port);

  // provamos que funciona batendo em nós mesmos:
  fetch(\`http://localhost:\${port}/\`)
    .then((r) => r.text())
    .then((texto) => {
      console.log('resposta recebida:', texto);
      servidor.close();      // sem isso o processo nunca termina
    });
});`,
        },
        {
          t: 'texto',
          md: `### Roteamento na mão

Não existe "rota" no módulo \`http\`. Existe \`req.url\` e \`req.method\`, e você decide o que fazer. Roteamento é só um \`if\` bem organizado.`,
        },
        {
          t: 'codigo',
          titulo: 'Rotas, query string e JSON',
          rodar: 'node',
          codigo: `import { createServer } from 'node:http';

const deteccoes = [
  { id: 1, classe: 'pessoa', conf: 0.94 },
  { id: 2, classe: 'caixa', conf: 0.55 },
];

const servidor = createServer((req, res) => {
  const url = new URL(req.url, \`http://\${req.headers.host}\`);

  const json = (status, dados) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(dados));
  };

  // GET /deteccoes?min=0.6
  if (req.method === 'GET' && url.pathname === '/deteccoes') {
    const min = Number(url.searchParams.get('min') ?? 0);
    return json(200, deteccoes.filter((d) => d.conf >= min));
  }

  // GET /deteccoes/1  — parâmetro na URL, extraído na mão
  const m = url.pathname.match(/^\\/deteccoes\\/(\\d+)$/);
  if (req.method === 'GET' && m) {
    const achado = deteccoes.find((d) => d.id === Number(m[1]));
    return achado ? json(200, achado) : json(404, { erro: 'não encontrado' });
  }

  return json(404, { erro: 'rota inexistente' });
});

servidor.listen(0, async () => {
  const { port } = servidor.address();
  const base = \`http://localhost:\${port}\`;

  console.log('todas:   ', await (await fetch(\`\${base}/deteccoes\`)).json());
  console.log('filtrada:', await (await fetch(\`\${base}/deteccoes?min=0.6\`)).json());
  console.log('uma:     ', await (await fetch(\`\${base}/deteccoes/1\`)).json());
  console.log('404:     ', await (await fetch(\`\${base}/deteccoes/99\`)).json());

  servidor.close();
});`,
        },
        {
          t: 'nota',
          estilo: 'atencao',
          md: `Repare no trabalho manual: extrair o \`id\` com expressão regular, converter para número, montar o JSON, escolher o status. Multiplique por 40 rotas e você entende por que frameworks existem. **Mas você agora sabe que não tem mágica nenhuma embaixo.**`,
        },
        {
          t: 'texto',
          md: `### Lendo o corpo da requisição

Esta parte assusta e vale ver uma vez. O corpo **não** vem pronto: \`req\` é uma *stream*, e os dados chegam em pedaços. Você acumula e só depois converte.`,
        },
        {
          t: 'codigo',
          titulo: 'Corpo em stream — o que o express.json() faz por você',
          rodar: 'node',
          codigo: `import { createServer } from 'node:http';

function lerCorpo(req) {
  return new Promise((resolver, rejeitar) => {
    let bruto = '';
    req.on('data', (pedaco) => { bruto += pedaco; });  // chega aos poucos
    req.on('end', () => {                                // acabou
      try { resolver(bruto ? JSON.parse(bruto) : {}); }
      catch { rejeitar(new Error('JSON inválido')); }
    });
    req.on('error', rejeitar);
  });
}

const servidor = createServer(async (req, res) => {
  if (req.method === 'POST') {
    try {
      const corpo = await lerCorpo(req);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ recebi: corpo }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ erro: e.message }));
    }
  }
  res.writeHead(405).end();
});

servidor.listen(0, async () => {
  const { port } = servidor.address();

  const r = await fetch(\`http://localhost:\${port}/\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ classe: 'pessoa', conf: 0.9 }),
  });
  console.log(r.status, await r.json());

  const ruim = await fetch(\`http://localhost:\${port}/\`, {
    method: 'POST',
    body: 'isto não é json {{{',
  });
  console.log(ruim.status, await ruim.json());

  servidor.close();
});`,
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'rest',
      titulo: 'Desenhando uma API REST',
      minutos: 8,
      resumo: 'Como nomear rotas para que ninguém precise perguntar.',
      blocos: [
        {
          t: 'texto',
          md: `REST não é um protocolo nem uma biblioteca. É um conjunto de convenções sobre **como nomear coisas**. Seguir a convenção significa que qualquer pessoa adivinha suas rotas sem ler documentação.

A regra central: **URLs identificam recursos (substantivos), métodos definem a ação (verbos).**`,
        },
        {
          t: 'py-js',
          tituloEsq: '❌ Verbos na URL',
          tituloDir: '✅ Substantivos + método HTTP',
          langEsq: 'text',
          langDir: 'text',
          py: `GET  /pegarDeteccoes
POST /criarDeteccao
POST /deletarDeteccao?id=3
POST /atualizarConfianca
GET  /listarDeteccoesDaCamera1`,
          js: `GET    /deteccoes
POST   /deteccoes
DELETE /deteccoes/3
PATCH  /deteccoes/3
GET    /deteccoes?camera=doca-01`,
          nota: 'Do lado direito, você já sabe como remover uma câmera sem ler nada: `DELETE /cameras/5`. Essa previsibilidade é o produto inteiro do REST.',
        },
        {
          t: 'texto',
          md: `### O desenho padrão de um recurso

Para qualquer recurso — \`deteccoes\`, \`cameras\`, \`modelos\` — o conjunto é sempre o mesmo:

| Método + rota | Faz | Sucesso |
|---|---|---|
| \`GET /deteccoes\` | lista (com filtros na query) | 200 |
| \`GET /deteccoes/:id\` | busca uma | 200 / 404 |
| \`POST /deteccoes\` | cria | 201 + \`Location\` |
| \`PUT /deteccoes/:id\` | substitui inteira | 200 |
| \`PATCH /deteccoes/:id\` | altera campos | 200 |
| \`DELETE /deteccoes/:id\` | remove | 204 (sem corpo) |

**Filtro, ordenação e paginação vão na query string**, nunca no caminho:

\`\`\`
GET /deteccoes?classe=pessoa&min_conf=0.8&ordenar=confianca&limite=10
\`\`\`

E relações aninham: \`GET /cameras/doca-01/deteccoes\`.`,
        },
        {
          t: 'nota',
          estilo: 'dica',
          md: `Agora abra o **Explorador de API** no menu lateral. A API que você vai chamar lá é real, está rodando neste servidor, e implementa exatamente esta tabela. Bata em todas as rotas, mande dados inválidos de propósito, veja os status. Depois abra \`servidor/api-lab.js\` e leia como ela foi feita.`,
        },
        {
          t: 'visual',
          componente: 'atalho-explorador',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'express',
      titulo: 'Express: o mesmo, sem a dor',
      minutos: 12,
      resumo: 'O Flask do JavaScript — rotas, middleware e tratamento de erro.',
      blocos: [
        {
          t: 'texto',
          md: `Express é o framework mais usado do Node. Se você conhece Flask, vai se sentir em casa: é minimalista, não impõe estrutura, e você monta o resto.

Para esta lição, instale-o de verdade. No terminal, dentro da pasta do laboratório:`,
        },
        {
          t: 'codigo',
          rodar: null,
          lang: 'bash',
          codigo: `npm install express`,
        },
        {
          t: 'nota',
          estilo: 'dica',
          md: `Os blocos desta lição rodam de verdade no Node — mas só **depois** que você instalar o Express. Se aparecer \`ERR_MODULE_NOT_FOUND\`, é isso que falta. (O resto do laboratório continua funcionando sem nenhuma dependência.)`,
        },
        {
          t: 'py-js',
          tituloEsq: 'Flask',
          tituloDir: 'Express',
          langEsq: 'python',
          py: `from flask import Flask, request, jsonify

app = Flask(__name__)

@app.get("/deteccoes")
def listar():
    classe = request.args.get("classe")
    return jsonify(buscar(classe))

@app.post("/deteccoes")
def criar():
    dados = request.get_json()
    return jsonify(salvar(dados)), 201

@app.get("/deteccoes/<int:id>")
def uma(id):
    return jsonify(pegar(id))

app.run(port=3000)`,
          js: `import express from 'express';

const app = express();
app.use(express.json());   // ← precisa habilitar!

app.get('/deteccoes', (req, res) => {
  const { classe } = req.query;
  res.json(buscar(classe));
});

app.post('/deteccoes', (req, res) => {
  const dados = req.body;
  res.status(201).json(salvar(dados));
});

app.get('/deteccoes/:id', (req, res) => {
  res.json(pegar(Number(req.params.id)));
});

app.listen(3000);`,
          nota: '`express.json()` **não vem ligado** por padrão. Sem essa linha, `req.body` é `undefined` — o erro de estreia de todo mundo.',
        },
        {
          t: 'codigo',
          titulo: 'Uma API REST completa em Express',
          rodar: 'node',
          codigo: `import express from 'express';

const app = express();
app.use(express.json());

let proximoId = 3;
let deteccoes = [
  { id: 1, classe: 'pessoa', conf: 0.94 },
  { id: 2, classe: 'caixa', conf: 0.55 },
];

// LISTAR — com filtro opcional
app.get('/deteccoes', (req, res) => {
  const { min_conf } = req.query;
  let itens = deteccoes;
  if (min_conf) itens = itens.filter((d) => d.conf >= Number(min_conf));
  res.json({ total: itens.length, itens });
});

// BUSCAR UMA
app.get('/deteccoes/:id', (req, res) => {
  const d = deteccoes.find((x) => x.id === Number(req.params.id));
  if (!d) return res.status(404).json({ erro: 'não encontrada' });
  res.json(d);
});

// CRIAR — com validação
app.post('/deteccoes', (req, res) => {
  const { classe, conf } = req.body ?? {};
  const erros = [];
  if (typeof classe !== 'string' || !classe) erros.push('classe é obrigatória');
  if (typeof conf !== 'number' || conf < 0 || conf > 1) erros.push('conf deve ser 0..1');
  if (erros.length) return res.status(400).json({ erro: 'inválido', detalhes: erros });

  const nova = { id: proximoId++, classe, conf };
  deteccoes.push(nova);
  res.status(201).location(\`/deteccoes/\${nova.id}\`).json(nova);
});

// REMOVER
app.delete('/deteccoes/:id', (req, res) => {
  const antes = deteccoes.length;
  deteccoes = deteccoes.filter((d) => d.id !== Number(req.params.id));
  if (deteccoes.length === antes) return res.status(404).json({ erro: 'não encontrada' });
  res.status(204).end();
});

// --- exercitando a API acima -------------------------------------------
const servidor = app.listen(0, async () => {
  const base = \`http://localhost:\${servidor.address().port}\`;
  const pedir = async (metodo, rota, corpo) => {
    const r = await fetch(base + rota, {
      method: metodo,
      headers: corpo ? { 'Content-Type': 'application/json' } : {},
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    const texto = await r.text();
    console.log(\`\${metodo} \${rota} → \${r.status}\`, texto.slice(0, 90));
  };

  await pedir('GET', '/deteccoes');
  await pedir('GET', '/deteccoes?min_conf=0.9');
  await pedir('GET', '/deteccoes/99');
  await pedir('POST', '/deteccoes', { classe: 'capacete', conf: 0.8 });
  await pedir('POST', '/deteccoes', { classe: '', conf: 5 });
  await pedir('DELETE', '/deteccoes/1');
  await pedir('GET', '/deteccoes');

  servidor.close();
});`,
        },
        {
          t: 'texto',
          md: `### Middleware

Um *middleware* é uma função que roda **entre** o pedido e a rota. Ele recebe \`(req, res, next)\` e ou responde, ou chama \`next()\` para passar adiante. É o mesmo conceito de decorator/before_request do Flask, mas mais central: no Express, quase tudo é middleware.

Logs, autenticação, CORS, parsing de corpo, medição de tempo — tudo isso é middleware.`,
        },
        {
          t: 'codigo',
          titulo: 'Middleware: log, autenticação e erro',
          rodar: 'node',
          codigo: `import express from 'express';
const app = express();
app.use(express.json());

// 1. Middleware global — roda em TODA requisição
app.use((req, res, next) => {
  const t0 = Date.now();
  res.on('finish', () => {
    console.log(\`\${req.method} \${req.originalUrl} → \${res.statusCode} (\${Date.now() - t0}ms)\`);
  });
  next();                    // ← sem isso, a requisição trava para sempre
});

// 2. Middleware de rota — aplicado só onde você pendura
function exigirToken(req, res, next) {
  if (req.headers.authorization !== 'Bearer segredo') {
    return res.status(401).json({ erro: 'não autenticado' });
  }
  req.usuario = { nome: 'fabio' };   // enriquece o req para a rota usar
  next();
}

app.get('/publico', (req, res) => res.json({ ok: true }));
app.get('/privado', exigirToken, (req, res) => {
  res.json({ ok: true, usuario: req.usuario });
});

// 3. Rota que estoura de propósito
app.get('/quebrado', () => {
  throw new Error('algo explodiu lá dentro');
});

// 4. 404 — vem DEPOIS de todas as rotas
app.use((req, res) => res.status(404).json({ erro: 'rota não existe' }));

// 5. Tratador de erro — 4 parâmetros, e é assim que o Express o reconhece
app.use((erro, req, res, next) => {
  console.error('[erro]', erro.message);
  res.status(500).json({ erro: 'erro interno' });   // não vaze o stack!
});

const s = app.listen(0, async () => {
  const base = \`http://localhost:\${s.address().port}\`;
  const ver = async (rota, opcoes) => {
    const r = await fetch(base + rota, opcoes);
    console.log('   →', r.status, (await r.text()).slice(0, 60));
  };
  await ver('/publico');
  await ver('/privado');
  await ver('/privado', { headers: { Authorization: 'Bearer segredo' } });
  await ver('/quebrado');
  await ver('/nao-existe');
  s.close();
});`,
        },
        {
          t: 'nota',
          estilo: 'pegadinha',
          md: `**A ordem dos \`app.use\` importa.** O Express percorre a lista de cima para baixo e para no primeiro que responder. Se você registrar o 404 antes das rotas, tudo vira 404. O tratador de erro tem que ser o **último**, e precisa ter exatamente 4 parâmetros — se você escrever 3, o Express o trata como middleware comum e o erro passa direto.`,
        },
        {
          t: 'exercicio',
          enunciado: `Escreva o middleware \`validarDeteccao(req, res, next)\`:

- se \`req.body.classe\` não for uma string não vazia **ou** \`req.body.conf\` não for número entre 0 e 1, responda **400** com \`{ erro: "inválido" }\`;
- caso contrário, chame \`next()\`.

Os objetos \`req\`/\`res\` já são simulados no teste — \`res.status(n)\` devolve o próprio \`res\` (encadeável) e \`res.json(x)\` registra a resposta.`,
          inicial: `function validarDeteccao(req, res, next) {
  // seu código aqui

}`,
          preludio: `function criarRes() {
  const r = { statusCode: null, corpo: null };
  r.status = (n) => { r.statusCode = n; return r; };
  r.json = (x) => { r.corpo = x; return r; };
  return r;
}`,
          testes: [
            {
              nome: 'corpo válido chama next()',
              codigo: `let chamou = false;
validarDeteccao({ body: { classe: 'pessoa', conf: 0.9 } }, criarRes(), () => { chamou = true; });
esperar(chamou).verdadeiro()`,
            },
            {
              nome: 'classe vazia → 400',
              codigo: `const res = criarRes();
validarDeteccao({ body: { classe: '', conf: 0.9 } }, res, () => {});
esperar(res.statusCode).igualA(400)`,
            },
            {
              nome: 'conf acima de 1 → 400',
              codigo: `const res = criarRes();
validarDeteccao({ body: { classe: 'x', conf: 5 } }, res, () => {});
esperar(res.statusCode).igualA(400)`,
            },
            {
              nome: 'conf igual a 0 é VÁLIDO',
              codigo: `let chamou = false;
validarDeteccao({ body: { classe: 'x', conf: 0 } }, criarRes(), () => { chamou = true; });
esperar(chamou).verdadeiro()`,
            },
            {
              nome: 'inválido NÃO chama next()',
              codigo: `let chamou = false;
validarDeteccao({ body: {} }, criarRes(), () => { chamou = true; });
esperar(chamou).igualA(false)`,
            },
          ],
          dica: 'Cuidado com `conf: 0` — se você testar `if (!conf)`, o zero cai como inválido. Use `typeof conf !== "number"` e compare os limites separadamente. E lembre do `return` antes do `res.status(400)`, senão o `next()` roda também.',
          solucao: `function validarDeteccao(req, res, next) {
  const { classe, conf } = req.body ?? {};
  const classeOk = typeof classe === 'string' && classe.length > 0;
  const confOk = typeof conf === 'number' && conf >= 0 && conf <= 1;

  if (!classeOk || !confOk) {
    return res.status(400).json({ erro: 'inválido' });
  }
  next();
}`,
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'consumir',
      titulo: 'Consumindo APIs com fetch',
      minutos: 9,
      resumo: 'O requests do JavaScript — com timeout, retry e tratamento decente.',
      blocos: [
        {
          t: 'texto',
          md: `\`fetch\` é global no Node 18+ e no navegador. Mesma API nos dois lados — o que é ótimo: o que você aprender aqui vale no front também.`,
        },
        {
          t: 'py-js',
          py: `import requests

r = requests.get(url, timeout=5)
r.raise_for_status()      # lança em 4xx/5xx
dados = r.json()

r = requests.post(
    url,
    json={"classe": "pessoa"},
    headers={"Authorization": "Bearer x"},
)`,
          js: `const r = await fetch(url);

// NÃO lança em 4xx/5xx — cheque na mão:
if (!r.ok) throw new Error(\`HTTP \${r.status}\`);
const dados = await r.json();

const r2 = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer x',
  },
  body: JSON.stringify({ classe: 'pessoa' }),
});`,
          nota: '`body` precisa ser **string**: o `JSON.stringify` é obrigatório, e o `Content-Type` também. O `requests` faz os dois por você com `json=`; o `fetch` não faz nenhum.',
        },
        {
          t: 'codigo',
          titulo: 'Um cliente decente — timeout, erro e retry',
          rodar: 'browser',
          codigo: `async function pedirJSON(url, opcoes = {}) {
  const { tentativas = 3, timeoutMs = 3000, ...resto } = opcoes;

  for (let i = 1; i <= tentativas; i++) {
    try {
      const resposta = await fetch(url, {
        ...resto,
        // cancela de verdade a requisição se estourar o tempo
        signal: AbortSignal.timeout(timeoutMs),
      });

      // 4xx = culpa nossa: não adianta repetir
      if (resposta.status >= 400 && resposta.status < 500) {
        const corpo = await resposta.json().catch(() => ({}));
        throw new Error(\`HTTP \${resposta.status}: \${corpo.erro ?? 'pedido inválido'}\`);
      }

      // 5xx = pode ser passageiro: vale repetir
      if (!resposta.ok) throw new Error(\`HTTP \${resposta.status}\`);

      return await resposta.json();
    } catch (erro) {
      const ultima = i === tentativas;
      const naoRepetir = erro.message.startsWith('HTTP 4');
      if (ultima || naoRepetir) throw erro;

      const espera = 2 ** i * 100;   // backoff exponencial: 200, 400, 800ms
      console.log(\`tentativa \${i} falhou (\${erro.message}) — repetindo em \${espera}ms\`);
      await new Promise((r) => setTimeout(r, espera));
    }
  }
}

// A rota /api/lab/instavel falha ~50% das vezes de propósito.
try {
  console.log('resultado:', await pedirJSON('/api/lab/instavel'));
} catch (e) {
  console.log('desistiu:', e.message);
}

// E esta devolve 400 — repare que ele NÃO tenta de novo.
try {
  await pedirJSON('/api/lab/deteccoes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ classe: 'inexistente' }),
  });
} catch (e) {
  console.log('erro de cliente:', e.message);
}`,
        },
        {
          t: 'nota',
          estilo: 'dica',
          md: `Aquela distinção — **repetir em 5xx, desistir em 4xx** — é o que separa um cliente HTTP amador de um profissional. Repetir um 400 é desperdício garantido: a resposta vai ser a mesma. E repetir um \`POST\` sem cuidado pode criar registros duplicados, porque \`POST\` não é idempotente.`,
        },
      ],
    },
  ],
};
