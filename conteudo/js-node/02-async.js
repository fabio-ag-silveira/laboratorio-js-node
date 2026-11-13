export const modulo = {
  id: 'async',
  titulo: 'Assincronismo',
  subtitulo: 'O coração do Node — e o maior salto vindo do Python',
  cor: '#5ec9a7',
  licoes: [
    // ------------------------------------------------------------------
    {
      id: 'event-loop',
      titulo: 'O event loop',
      minutos: 12,
      resumo: 'Uma thread só, e mesmo assim milhares de conexões. Como?',
      blocos: [
        {
          t: 'texto',
          md: `Aqui está a ideia que organiza tudo: **o Node roda o seu código numa única thread.**

Isso soa como uma limitação absurda para quem vem do Python, onde você joga um \`ThreadPoolExecutor\` no problema. Mas funciona — e funciona muito bem para servidores — por causa de uma observação simples:

> Um servidor web passa 99% do tempo **esperando**. Esperando o banco, o disco, outra API. Enquanto espera, a CPU está ociosa.

O Node aproveita essa ociosidade. Quando você pede uma leitura de arquivo, ele **delega** para o sistema operacional e **imediatamente volta** a executar outro código. Quando o SO avisa que terminou, o Node chama sua função de resposta.

Chama-se **event loop**: um laço infinito que pergunta "tem alguma tarefa pronta para retomar?" e executa uma de cada vez.`,
        },
        {
          t: 'py-js',
          tituloEsq: 'Python síncrono — bloqueia',
          tituloDir: 'Node — delega e continua',
          py: `import requests

r1 = requests.get(url1)   # para tudo, 1s
r2 = requests.get(url2)   # para tudo, 1s
print("fim")

# tempo total: 2 segundos
# a thread ficou parada esperando`,
          js: `const p1 = fetch(url1);   // dispara e segue
const p2 = fetch(url2);   // dispara e segue
console.log("fim");        // imprime AGORA

await Promise.all([p1, p2]);
// tempo total: 1 segundo
// as duas esperas aconteceram juntas`,
          nota: 'Não é paralelismo de CPU — é **concorrência de espera**. Uma thread só, mas ela nunca fica parada.',
        },
        {
          t: 'texto',
          md: `### As três filas

Quando algo assíncrono termina, a função de retorno não executa na hora: ela entra numa **fila**. E existem duas filas com prioridades diferentes — é isso que explica a ordem "estranha" das saídas.

1. **Call stack** — o que está rodando agora. Só uma coisa por vez.
2. **Microtarefas** — promises resolvidas (\`.then\`, o que vem depois de um \`await\`). **Prioridade alta.**
3. **Macrotarefas** — \`setTimeout\`, \`setInterval\`, entrada/saída. **Prioridade baixa.**

A regra de ouro: **a fila de microtarefas é esvaziada por completo antes de tocar numa única macrotarefa.**

Use o painel abaixo para ver isso acontecendo passo a passo.`,
        },
        {
          t: 'visual',
          componente: 'js-node/event-loop',
        },
        {
          t: 'codigo',
          titulo: 'A ordem que confunde todo mundo',
          rodar: 'browser',
          codigo: `console.log('1 — síncrono');

setTimeout(() => console.log('2 — macrotarefa (setTimeout 0)'), 0);

Promise.resolve().then(() => console.log('3 — microtarefa'));

console.log('4 — síncrono');

// Adivinhe a ordem ANTES de rodar. Depois rode.
//
// Resposta: 1, 4, 3, 2
//   - 1 e 4 são síncronos: rodam já, na ordem
//   - 3 é microtarefa: roda assim que a pilha esvazia
//   - 2 é macrotarefa: roda por último, mesmo com delay 0`,
        },
        {
          t: 'nota',
          estilo: 'atencao',
          md: `\`setTimeout(fn, 0)\` **não** significa "execute agora". Significa "execute depois que tudo o que está pendente terminar, e não antes de 0ms". É um agendamento, não uma prioridade.`,
        },
        {
          t: 'texto',
          md: `### O perigo: bloquear a thread única

Como só existe uma thread, um laço pesado de CPU **congela o servidor inteiro**. Nenhuma requisição é atendida enquanto ele roda. No Python com múltiplos workers isso machuca menos; no Node é fatal.

Este é o trade-off central: Node é excelente para I/O (APIs, proxies, tempo real) e **ruim** para CPU pesada (processamento de imagem, inferência de modelos). Para isso existem *worker threads* e — mais comum — deixar o Python fazer essa parte e o Node orquestrar.`,
        },
        {
          t: 'codigo',
          titulo: 'Bloqueando o event loop de propósito',
          rodar: 'node',
          codigo: `console.log('início');

setTimeout(() => console.log('eu queria rodar em 10ms'), 10);

// laço de CPU: segura a thread
const t = Date.now();
let x = 0;
while (Date.now() - t < 500) { x++; }

console.log('laço travou tudo por 500ms');
// o setTimeout só roda AGORA, com 500ms de atraso — não 10ms.
// Num servidor, seriam 500ms de indisponibilidade para TODOS os clientes.`,
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'promises',
      titulo: 'Promises',
      minutos: 10,
      resumo: 'O objeto que representa "um valor que ainda não chegou".',
      blocos: [
        {
          t: 'texto',
          md: `Uma **Promise** é um objeto que representa um resultado futuro. É o equivalente conceitual do \`Future\` / \`Awaitable\` do \`asyncio\`.

Ela tem três estados:

- **pendente** (*pending*) — ainda esperando
- **resolvida** (*fulfilled*) — deu certo, tem um valor
- **rejeitada** (*rejected*) — deu errado, tem um erro

E, uma vez que sai de "pendente", **nunca mais muda**.`,
        },
        {
          t: 'codigo',
          titulo: 'Criando e consumindo uma promise',
          rodar: 'browser',
          codigo: `// Criar do zero — você faz isso raramente, mas ajuda a entender.
// O construtor recebe uma função com dois "botões": resolver e rejeitar.
function dormir(ms) {
  return new Promise((resolver) => {
    setTimeout(resolver, ms);
  });
}

function carregarModelo(nome) {
  return new Promise((resolver, rejeitar) => {
    setTimeout(() => {
      if (!nome) rejeitar(new Error('nome do modelo é obrigatório'));
      else resolver({ nome, pesos: '32MB' });
    }, 300);
  });
}

console.log('disparando...');

carregarModelo('yolo-v8')
  .then((modelo) => console.log('carregou:', modelo))
  .catch((erro) => console.log('falhou:', erro.message))
  .finally(() => console.log('acabou (deu certo ou não)'));

console.log('esta linha aparece ANTES do resultado');`,
        },
        {
          t: 'nota',
          estilo: 'dica',
          md: `\`dormir(ms)\` acima é o \`time.sleep()\` do Python. Como o JavaScript não tem sleep embutido, essa funçãozinha de três linhas é o idioma padrão — você vai reescrever ela em vários projetos.`,
        },
        {
          t: 'texto',
          md: `### Combinadores

Aqui o JavaScript brilha. Quatro funções resolvem quase toda orquestração:

| Função | O que faz | Python |
|---|---|---|
| \`Promise.all\` | espera **todas**; falha se **uma** falhar | \`asyncio.gather\` |
| \`Promise.allSettled\` | espera todas; **nunca** falha, relata cada uma | \`gather(return_exceptions=True)\` |
| \`Promise.race\` | devolve a **primeira** a terminar (mesmo com erro) | \`asyncio.wait(FIRST_COMPLETED)\` |
| \`Promise.any\` | devolve a primeira que **der certo** | — |`,
        },
        {
          t: 'codigo',
          titulo: 'all, allSettled e race',
          rodar: 'browser',
          codigo: `const dorme = (ms, valor) =>
  new Promise((r) => setTimeout(() => r(valor), ms));
const falha = (ms, msg) =>
  new Promise((_, rej) => setTimeout(() => rej(new Error(msg)), ms));

async function main() {
  // all — tudo junto, ordem do RESULTADO segue a ordem da ENTRADA
  const t0 = Date.now();
  const r = await Promise.all([dorme(300, 'a'), dorme(200, 'b'), dorme(100, 'c')]);
  console.log(r, \`em \${Date.now() - t0}ms (não 600!)\`);

  // all falha inteiro se um falhar
  try {
    await Promise.all([dorme(100, 'ok'), falha(50, 'câmera offline')]);
  } catch (e) {
    console.log('all abortou:', e.message);
  }

  // allSettled — relata cada um, nunca lança
  const res = await Promise.allSettled([dorme(50, 'ok'), falha(20, 'timeout')]);
  console.log(res);

  // race — o primeiro a chegar (útil para timeout)
  const vencedor = await Promise.race([dorme(500, 'lento'), dorme(50, 'rápido')]);
  console.log('venceu:', vencedor);
}
main();`,
        },
        {
          t: 'nota',
          estilo: 'pegadinha',
          md: `\`Promise.race\` é a receita padrão de **timeout**: corra a sua operação contra uma promise que rejeita depois de N ms. Se a sua for mais lenta, o erro de timeout vence. (O Node moderno também tem \`AbortSignal.timeout(ms)\`, que é melhor porque de fato cancela a operação.)`,
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'async-await',
      titulo: 'async / await',
      minutos: 10,
      resumo: 'Escrever assíncrono com cara de síncrono — e os erros clássicos.',
      blocos: [
        {
          t: 'texto',
          md: `\`async/await\` é açúcar sintático em cima de promises. É praticamente **idêntico** ao Python — esta lição vai ser a mais confortável do módulo.

Duas regras:

1. \`await\` só funciona dentro de uma função \`async\` (ou no topo de um módulo ESM).
2. Uma função \`async\` **sempre** devolve uma promise, mesmo que você retorne um número.`,
        },
        {
          t: 'py-js',
          py: `import asyncio, httpx

async def buscar(url):
    async with httpx.AsyncClient() as c:
        r = await c.get(url)
        return r.json()

async def main():
    dados = await buscar(url)
    print(dados)

asyncio.run(main())`,
          js: `async function buscar(url) {
  const r = await fetch(url);
  return await r.json();
}

async function main() {
  const dados = await buscar(url);
  console.log(dados);
}

main();
// não precisa de asyncio.run:
// o event loop já está rodando sempre`,
          nota: 'A diferença prática: no Node você **não inicializa** o loop. Ele já existe desde que o processo começou.',
        },
        {
          t: 'codigo',
          titulo: 'Buscando na API do próprio laboratório',
          rodar: 'browser',
          codigo: `async function buscarDeteccoes() {
  const resposta = await fetch('/api/lab/deteccoes?min_conf=0.8');

  // ATENÇÃO: fetch NÃO lança erro em status 404 ou 500.
  // Ele só lança se a rede falhar. Você precisa checar na mão:
  if (!resposta.ok) {
    throw new Error(\`HTTP \${resposta.status}\`);
  }

  const dados = await resposta.json();
  return dados;
}

try {
  const { total, itens } = await buscarDeteccoes();
  console.log(\`\${total} detecções confiantes\`);
  for (const d of itens) {
    console.log(\` - \${d.classe}: \${d.confianca}\`);
  }
} catch (erro) {
  console.log('deu ruim:', erro.message);
}`,
        },
        {
          t: 'nota',
          estilo: 'atencao',
          md: `Guarde esta: **\`fetch\` não lança exceção em erro HTTP.** Um 500 chega como resposta normal com \`ok: false\`. Diferente do \`raise_for_status()\` do \`requests\`, que você precisa chamar — aqui você precisa checar \`resposta.ok\` sempre. Esquecer disso é o bug mais comum de quem começa.`,
        },
        {
          t: 'texto',
          md: `### O erro que custa performance

Este é *o* erro clássico: usar \`await\` dentro de um laço quando as operações são independentes. Você transforma concorrência em fila.`,
        },
        {
          t: 'codigo',
          titulo: 'Sequencial vs paralelo',
          rodar: 'browser',
          codigo: `const dorme = (ms) => new Promise((r) => setTimeout(r, ms));

async function tarefa(n) {
  await dorme(200);
  return n * 2;
}

// ❌ LENTO: espera cada uma antes de começar a próxima
async function sequencial() {
  const t0 = Date.now();
  const saida = [];
  for (const n of [1, 2, 3, 4, 5]) {
    saida.push(await tarefa(n));       // ← o await no laço
  }
  console.log('sequencial:', saida, \`\${Date.now() - t0}ms\`);
}

// ✅ RÁPIDO: dispara todas, depois espera todas
async function paralelo() {
  const t0 = Date.now();
  const saida = await Promise.all([1, 2, 3, 4, 5].map(tarefa));
  console.log('paralelo:  ', saida, \`\${Date.now() - t0}ms\`);
}

await sequencial();   // ~1000ms
await paralelo();     // ~200ms`,
        },
        {
          t: 'nota',
          estilo: 'dica',
          md: `Regra de bolso: **se as iterações não dependem umas das outras, use \`Promise.all\` com \`.map\`.** Só use \`await\` dentro de \`for\` quando a ordem importa de verdade (ex.: gravar em banco respeitando sequência) ou quando você precisa limitar a concorrência para não derrubar o serviço do outro lado.`,
        },
        {
          t: 'exercicio',
          enunciado: `Escreva \`buscarTodas(ids)\` que recebe uma lista de ids e devolve uma lista com o resultado de \`carregar(id)\` para cada um — **em paralelo**.

A função \`carregar(id)\` já existe no ambiente: ela devolve uma promise que resolve com \`"item-" + id\` depois de 100ms.

Sua função precisa terminar em bem menos que \`ids.length * 100\` ms.`,
          inicial: `async function buscarTodas(ids) {
  // seu código aqui

}`,
          preludio: `function carregar(id) {
  return new Promise((r) => setTimeout(() => r('item-' + id), 100));
}`,
          testes: [
            {
              nome: 'devolve os itens na ordem certa',
              codigo: `const r = await buscarTodas([1, 2, 3]);
esperar(r).pareceCom(['item-1', 'item-2', 'item-3'])`,
            },
            {
              nome: 'lista vazia devolve []',
              codigo: `esperar(await buscarTodas([])).pareceCom([])`,
            },
            {
              nome: 'roda em PARALELO (5 itens em menos de 300ms)',
              codigo: `const t0 = Date.now();
await buscarTodas([1, 2, 3, 4, 5]);
const gasto = Date.now() - t0;
esperar(gasto < 300).verdadeiro()`,
            },
          ],
          dica: 'Uma linha: `return Promise.all(ids.map(carregar))`. Repare que `.map(carregar)` já produz um array de promises — não precisa de `await` dentro do map.',
          solucao: `async function buscarTodas(ids) {
  return Promise.all(ids.map((id) => carregar(id)));
}`,
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'erros-async',
      titulo: 'Erros em código assíncrono',
      minutos: 8,
      resumo: 'Onde os erros somem, e como não perder nenhum.',
      blocos: [
        {
          t: 'texto',
          md: `Erro em código assíncrono some com uma facilidade assustadora. Três situações causam quase todos os casos.`,
        },
        {
          t: 'codigo',
          titulo: 'Situação 1: promise sem catch',
          rodar: 'node',
          esperaFalha: true,
          codigo: `function arriscado() {
  return Promise.reject(new Error('o modelo não carregou'));
}

// ❌ ninguém trata: vira "unhandled rejection".
// No Node moderno isso DERRUBA o processo.
arriscado();

setTimeout(() => console.log('esta linha nunca aparece'), 100);`,
        },
        {
          t: 'codigo',
          titulo: 'Situação 2: try/catch que não pega nada',
          rodar: 'browser',
          codigo: `const falhar = () => Promise.reject(new Error('boom'));

// ❌ o try já terminou quando a promise rejeita
async function errado() {
  try {
    falhar();               // faltou o await!
  } catch (e) {
    console.log('nunca chego aqui');
  }
  console.log('errado: passou batido');
}

// ✅ com await, o erro vira exceção síncrona dentro do try
async function certo() {
  try {
    await falhar();
  } catch (e) {
    console.log('certo: peguei →', e.message);
  }
}

await errado();
await certo();`,
        },
        {
          t: 'codigo',
          titulo: 'Situação 3: callback assíncrono dentro de map/forEach',
          rodar: 'browser',
          codigo: `const dorme = (ms) => new Promise((r) => setTimeout(r, ms));

// ❌ forEach IGNORA promises. A função termina antes das tarefas.
async function errado(ids) {
  ids.forEach(async (id) => {
    await dorme(50);
    console.log('processei', id);
  });
  console.log('errado: "terminei" (mentira)');
}

// ✅ map + Promise.all: as promises são de fato aguardadas
async function certo(ids) {
  await Promise.all(ids.map(async (id) => {
    await dorme(50);
    console.log('processei', id);
  }));
  console.log('certo: terminei de verdade');
}

await errado([1, 2]);
await dorme(200);
await certo([3, 4]);`,
        },
        {
          t: 'nota',
          estilo: 'pegadinha',
          md: `\`forEach\` não sabe o que é uma promise. Ele chama a função, recebe uma promise de volta e **joga fora**. Se você precisa de \`await\` dentro de uma iteração, use \`for...of\` (sequencial) ou \`Promise.all(lista.map(...))\` (paralelo). Nunca \`forEach\`.`,
        },
        {
          t: 'texto',
          md: `### A rede de segurança

Num servidor de produção, sempre instale os dois ouvintes globais. Eles não substituem tratamento local — servem para você **descobrir** o que escapou, em vez de o processo morrer em silêncio.`,
        },
        {
          t: 'codigo',
          titulo: 'Rede de segurança do processo',
          rodar: 'node',
          codigo: `process.on('unhandledRejection', (motivo) => {
  console.error('[promise sem catch]', motivo);
  // em produção: registre no log, avise o monitoramento, e encerre limpo
});

process.on('uncaughtException', (erro) => {
  console.error('[exceção não tratada]', erro.message);
  process.exit(1);   // o estado é imprevisível: melhor reiniciar
});

Promise.reject(new Error('escapou!'));

setTimeout(() => console.log('o processo sobreviveu para contar a história'), 50);`,
        },
      ],
    },
  ],
};
