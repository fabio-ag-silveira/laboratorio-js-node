# Laboratório JS + Node

Uma ferramenta local para aprender **JavaScript, Node.js e APIs** — escrita para quem
já programa em Python e quer o caminho mais curto até o fundamental.

Não é um curso em vídeo nem um site de exercícios: é um laboratório que roda na sua
máquina, onde **todo código da tela executa de verdade** — no navegador ou num processo
Node real.

## Rodar

```bash
npm start
```

Depois abra <http://localhost:4000>. Não há nada para instalar: o laboratório inteiro
usa só a biblioteca padrão do Node. (Só a lição de Express pede `npm install express`.)

Outra porta, se precisar:

```bash
PORTA=5000 npm start
```

## O que tem dentro

**Trilha — 24 lições, 6 módulos.** Toda lição traz o "em Python você faria assim" ao
lado do JavaScript. Cerca de 6 a 8 horas de estudo ativo até o fim do módulo 4, que já
é o suficiente para construir e manter um backend.

| Módulo | Assunto |
|---|---|
| 0 | Mapa da trilha e colinha de tradução Python → JS |
| 1 | JavaScript essencial: tipos, funções, arrays, objetos, as pegadinhas |
| 2 | Assincronismo: event loop, promises, `async/await`, erros |
| 3 | Node: módulos, arquivos, npm, `process` e CLI |
| 4 | Backend: HTTP na unha, REST, Express, middleware, `fetch` |
| 5 | Testes, Node orquestrando Python, e o projeto final |

**Playground.** Escreva JavaScript e rode com um clique — no navegador (tem `fetch` e
`document`) ou no Node (tem `import`, `fs`, `process`). Vem com exemplos prontos.

**Explorador de API.** Um mini-Postman apontado para uma API REST de verdade que sobe
junto com o laboratório. Dá para provocar 200, 201, 204, 400, 401, 404 e 500 e ver o
que muda em cada um.

**Visualizador do event loop.** Passo a passo, mostrando call stack, microtarefas,
macrotarefas e saída — para entender por que a ordem de execução é aquela.

**Exercícios corrigidos automaticamente.** Escreva a função, clique em rodar, veja
verde ou vermelho com o motivo da falha. Tem dica e solução quando travar.

**Progresso.** Fica salvo no navegador (`localStorage`).

## O código é material de estudo

O laboratório foi escrito para ser lido. Depois das lições correspondentes, abra:

| Arquivo | O que ilustra |
|---|---|
| [`servidor/index.js`](servidor/index.js) | servidor HTTP sem framework, roteamento na mão |
| [`servidor/api-lab.js`](servidor/api-lab.js) | uma API REST completa: validação, status, query |
| [`servidor/executor.js`](servidor/executor.js) | `spawn` de subprocesso com timeout e limpeza |
| [`servidor/estatico.js`](servidor/estatico.js) | servir arquivos, MIME types, path traversal |
| [`teste/api-lab.test.js`](teste/api-lab.test.js) | testes de integração com `node --test` |
| [`publico/js/`](publico/js/) | uma SPA sem framework: roteador, editor, renderizador |

## Testes

```bash
npm test
```

Usa o executor nativo do Node (`node --test`) — sem Jest, sem Vitest, sem instalar nada.

## Estrutura

```
estudos/
├── servidor/      o servidor (HTTP, API de treino, executor de código)
├── conteudo/      as lições, como dados — um arquivo por módulo
├── publico/       a interface (HTML, CSS e JS sem build)
└── teste/         testes da API
```

Para editar ou acrescentar uma lição, mexa nos arquivos de `conteudo/`. O formato é um
objeto com blocos (`texto`, `codigo`, `py-js`, `nota`, `tabela`, `exercicio`, `visual`),
e a interface sabe renderizar cada tipo.

## Uma nota sobre o executor

O botão "Rodar no Node" executa o código num processo separado, com limite de 5
segundos. **Não é uma sandbox de segurança** — o código roda com as suas permissões,
como qualquer script que você mesmo escrevesse. Por isso o servidor escuta apenas em
`127.0.0.1`. Não exponha na rede.
