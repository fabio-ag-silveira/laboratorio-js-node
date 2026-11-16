# Laboratório Dev

Uma ferramenta local de estudo em que **todo código da tela executa de verdade** — no
navegador, num processo Node, num processo Python com a sua GPU, ou num `dotnet run`.

Começou como laboratório de JavaScript e Node para quem vem do Python e está crescendo
para cobrir a stack inteira: visão computacional, React, React Native, C# .NET,
PostgreSQL, Python para IA e Azure.

## Rodar

```bash
npm start
```

Depois abra <http://localhost:4000>. O núcleo usa só a biblioteca padrão do Node: não há
nada para instalar. Outra porta, se precisar: `PORTA=5000 npm start`.

## Trilhas

| Trilha | Estado | Executa em |
|---|---|---|
| JavaScript e Node | pronta (24 lições) | navegador e Node |
| Visão Computacional | 50 lições em 13 módulos: clássico, deep learning, detecção, avaliação, laboratório de treino, objetos pequenos, dados, segmentação e rastreamento, modelos de fundação, produção, estado da arte e entrevista | navegador (canvas) e Python (OpenCV, PyTorch, Ultralytics) |
| React | 13 lições em 4 módulos: fundamentos, hooks, TypeScript, dados do servidor e React 19, projeto real; termina num painel que consome a API do laboratório | prévia ao vivo num iframe isolado, com exercícios testados clicando na tela |
| React Native | 10 lições em 4 módulos: componentes nativos, Flexbox, listas, formulários, navegação, offline, câmera, publicação e o projeto de registro de capturas sem sinal | prévia numa moldura de celular (react-native-web); câmera e publicação como código para ler |
| PostgreSQL | 12 lições em 4 módulos: consultas (NULL, junções, agregação, janelas), modelagem e transações, JSONB, índices e EXPLAIN, busca textual e pgvector, operação, e um projeto com desafios | PostgreSQL de verdade embutido (PGlite), numa cópia descartável do banco a cada execução |
| C# e .NET | a escrever: depende do SDK do .NET instalado (`winget install Microsoft.DotNet.SDK.10`), para que todo exemplo seja executado antes de virar lição | `dotnet run` (SDK 10+) |
| Python para IA | 10 lições em 3 módulos: uv e tipagem, NumPy e PyTorch por dentro, desempenho na GPU, FastAPI testado, concorrência e lote dinâmico, modelos de linguagem com visão, e o projeto do serviço de inferência | Python da sua máquina (com GPU, se houver) |
| Azure e Azure DevOps | 10 lições em 3 módulos: organização e identidade, onde rodar, dados e mensagens, Bicep, contêineres, Azure DevOps, pipelines em YAML, observabilidade e custo, e o projeto do sistema na nuvem | não executa (uma conta de nuvem não cabe aqui): arquitetura clicável, "onde eu rodo isto?" e um simulador de pipeline YAML |
| Projeto integrador | 4 lições: o sistema e o contrato, e seis etapas com critérios de aceitação, do banco à entrega na nuvem. Acompanha `projeto-integrador/`, com o esquema e um `docker compose` do PostgreSQL | roteiro; o esquema do banco roda no laboratório |

Cada trilha parte do que você já sabe: Python → JavaScript e C#, Flutter → React Native,
MySQL → PostgreSQL, Cloudflare → Azure.

## Ferramentas

- **Playground** — escreva e rode JavaScript (navegador ou Node), Python e C#.
- **Explorador de API** — um mini-Postman apontado para uma API REST de treino que sobe
  junto com o laboratório.
- **Colinha** — todas as tabelas de referência das trilhas, com busca.
- **Revisão** — perguntas sorteadas das lições que você já concluiu.

## Python com imagem

Os blocos de Python rodam no Python da sua máquina e podem mandar imagens para a tela:

```python
import cv2, lab

img = lab.amostra("armadilha")          # imagem sintética, com gabarito conhecido
bordas = cv2.Canny(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), 60, 140)
lab.mostrar(img, bordas, titulos=["original", "bordas"])
```

Para usar fotos suas, copie-as para `imagens/` e leia com `lab.imagem("foto.jpg")`. Essa
pasta está no `.gitignore`: o repositório é público, e foto de campo ou de cliente fica só
na sua máquina. A página inicial mostra o que está instalado (Python, pacotes, SDK do .NET)
e o comando para instalar o que faltar.

## Verificação

```bash
npm test            # API, formato de todas as lições e soluções dos exercícios
npm run verificar   # executa todos os blocos de código de todas as trilhas
```

`npm run verificar -- visao` restringe a uma trilha. Blocos demorados, como o treino de um detector, só entram com `--lentos`.

As prévias de React só rodam num navegador. `npm test` confere que todas compilam; para
conferir que montam e que cada exercício falha no código inicial e passa na solução, abra
o laboratório e rode no console:

```js
const { testarTrilha } = await import('/js/dev/testar-previas.js');
console.log(await testarTrilha('react'));
```

As trilhas de React e React Native pedem `npm install` (React, React DOM,
react-native-web e esbuild). Sem isso, o resto do laboratório funciona e a prévia mostra
o comando. Troque `'react'` por `'react-native'` para conferir a outra trilha.

## Estrutura

```
estudos/
├── conteudo/<trilha>/   lições como dados; cada pasta com index.js é uma trilha
├── publico/             a interface (HTML, CSS e JS sem build)
│   └── js/visuais/      componentes interativos, carregados sob demanda
├── servidor/            HTTP, API de treino e executores de código
│   ├── executores/      Node, Python e C# em processos separados
│   └── apoio-python/    o módulo `lab` dos blocos de Python
├── ferramentas/         verificação dos blocos
└── teste/
```

Para criar uma trilha, crie uma pasta em `conteudo/` com um `index.js` exportando
`trilha`; ela é descoberta sozinha. Uma lição é uma lista de blocos: `texto`, `nota`,
`codigo`, `comparacao`, `tabela`, `visual`, `quiz` e `exercicio`.

## O código é material de estudo

| Arquivo | O que ilustra |
|---|---|
| [`servidor/app.js`](servidor/app.js) | servidor HTTP sem framework, roteamento na mão |
| [`servidor/api-lab.js`](servidor/api-lab.js) | API REST completa: validação, status, query |
| [`servidor/executores/processo.js`](servidor/executores/processo.js) | subprocesso com tempo limite, protocolo de saída e limpeza |
| [`servidor/estatico.js`](servidor/estatico.js) | servir arquivos, tipos MIME, path traversal |
| [`teste/`](teste/) | testes de integração e testes gerados a partir de dados, com `node --test` |
| [`publico/js/`](publico/js/) | uma SPA sem framework: roteador, editor, renderizador |

## Uma nota sobre o executor

Os botões de rodar executam o código em processos separados, com tempo limite. **Não é
uma sandbox de segurança** — o código roda com as suas permissões, como qualquer script
que você mesmo escrevesse. Por isso o servidor escuta apenas em `127.0.0.1`. Não exponha
na rede.
