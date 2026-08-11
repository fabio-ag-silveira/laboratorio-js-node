/**
 * Visualizador do event loop.
 *
 * Os estados são escritos à mão, passo a passo — não é um interpretador de
 * JavaScript. A intenção é didática: mostrar POR QUE a saída sai naquela
 * ordem, com uma frase explicando cada transição.
 */

import { realcar } from './realce.js';

const PROGRAMAS = [
  {
    nome: 'setTimeout × Promise',
    codigo: [
      `console.log('A');`,
      `setTimeout(() => console.log('B'), 0);`,
      `Promise.resolve().then(() => console.log('C'));`,
      `console.log('D');`,
    ],
    passos: [
      {
        linha: null,
        pilha: [],
        micro: [],
        macro: [],
        saida: [],
        texto: 'O arquivo foi carregado. O event loop vai executar o script de cima para baixo, uma linha por vez.',
      },
      {
        linha: 0,
        pilha: ['script', "console.log('A')"],
        micro: [],
        macro: [],
        saida: [],
        texto: 'Linha 1 é código síncrono comum: entra na pilha e executa imediatamente.',
      },
      {
        linha: 0,
        pilha: ['script'],
        micro: [],
        macro: [],
        saida: ['A'],
        texto: 'Imprimiu "A" e saiu da pilha.',
      },
      {
        linha: 1,
        pilha: ['script'],
        micro: [],
        macro: ['() => log(B)'],
        saida: ['A'],
        texto: 'setTimeout NÃO executa nada agora. Ele entrega o callback ao agendador, que o coloca na fila de MACROtarefas. Mesmo com 0ms.',
      },
      {
        linha: 2,
        pilha: ['script'],
        micro: ['() => log(C)'],
        macro: ['() => log(B)'],
        saida: ['A'],
        texto: 'A promise já está resolvida, então o .then vai direto para a fila de MICROtarefas — que tem prioridade sobre a outra.',
      },
      {
        linha: 3,
        pilha: ['script', "console.log('D')"],
        micro: ['() => log(C)'],
        macro: ['() => log(B)'],
        saida: ['A'],
        texto: 'Linha 4, síncrona de novo: fura a fila de todo mundo, porque o script ainda está rodando.',
      },
      {
        linha: 3,
        pilha: ['script'],
        micro: ['() => log(C)'],
        macro: ['() => log(B)'],
        saida: ['A', 'D'],
        texto: 'Imprimiu "D". Repare: as duas filas continuam intactas, esperando.',
      },
      {
        linha: null,
        pilha: [],
        micro: ['() => log(C)'],
        macro: ['() => log(B)'],
        saida: ['A', 'D'],
        texto: 'O script terminou e a pilha esvaziou. AGORA o event loop entra em ação — e ele sempre olha primeiro para as microtarefas.',
      },
      {
        linha: null,
        pilha: ['() => log(C)'],
        micro: [],
        macro: ['() => log(B)'],
        saida: ['A', 'D'],
        texto: 'Microtarefa promovida para a pilha.',
      },
      {
        linha: null,
        pilha: [],
        micro: [],
        macro: ['() => log(B)'],
        saida: ['A', 'D', 'C'],
        texto: 'Imprimiu "C". A fila de microtarefas está vazia — e ela precisa estar TOTALMENTE vazia antes do próximo passo.',
      },
      {
        linha: null,
        pilha: ['() => log(B)'],
        micro: [],
        macro: [],
        saida: ['A', 'D', 'C'],
        texto: 'Só agora o loop pega uma macrotarefa. O setTimeout de 0ms esperou o tempo todo.',
      },
      {
        linha: null,
        pilha: [],
        micro: [],
        macro: [],
        saida: ['A', 'D', 'C', 'B'],
        texto: 'Ordem final: A, D, C, B. Síncrono → microtarefas → macrotarefas.',
      },
    ],
  },
  {
    nome: 'async / await por dentro',
    codigo: [
      `console.log('1 início');`,
      `setTimeout(() => console.log('5 timeout'), 0);`,
      `(async () => {`,
      `  console.log('2 antes do await');`,
      `  await null;`,
      `  console.log('4 depois do await');`,
      `})();`,
      `console.log('3 fim');`,
    ],
    passos: [
      {
        linha: null,
        pilha: [],
        micro: [],
        macro: [],
        saida: [],
        texto: 'Aqui a pergunta é: o que dentro de uma função async roda na hora, e o que vira microtarefa?',
      },
      {
        linha: 0,
        pilha: ['script'],
        micro: [],
        macro: [],
        saida: ['1 início'],
        texto: 'Síncrono, imprime na hora.',
      },
      {
        linha: 1,
        pilha: ['script'],
        micro: [],
        macro: ['() => log(5)'],
        saida: ['1 início'],
        texto: 'Vai para a fila de macrotarefas e fica lá até o fim de tudo.',
      },
      {
        linha: 3,
        pilha: ['script', 'async()'],
        micro: [],
        macro: ['() => log(5)'],
        saida: ['1 início', '2 antes do await'],
        texto: 'CHAVE DA LIÇÃO: chamar uma função async executa o corpo dela IMEDIATAMENTE, de forma síncrona — até encontrar o primeiro await.',
      },
      {
        linha: 4,
        pilha: ['script'],
        micro: ['resto da async'],
        macro: ['() => log(5)'],
        saida: ['1 início', '2 antes do await'],
        texto: 'O await pausa a função e devolve o controle para quem chamou. Tudo que vem DEPOIS do await vira uma microtarefa.',
      },
      {
        linha: 7,
        pilha: ['script'],
        micro: ['resto da async'],
        macro: ['() => log(5)'],
        saida: ['1 início', '2 antes do await', '3 fim'],
        texto: 'O script continuou de onde parou e imprimiu "3 fim" — antes da função async terminar.',
      },
      {
        linha: null,
        pilha: [],
        micro: ['resto da async'],
        macro: ['() => log(5)'],
        saida: ['1 início', '2 antes do await', '3 fim'],
        texto: 'Script terminou. Pilha vazia. O loop olha para as microtarefas.',
      },
      {
        linha: 5,
        pilha: ['resto da async'],
        micro: [],
        macro: ['() => log(5)'],
        saida: ['1 início', '2 antes do await', '3 fim', '4 depois do await'],
        texto: 'A função async retoma exatamente onde parou e imprime "4".',
      },
      {
        linha: null,
        pilha: [],
        micro: [],
        macro: [],
        saida: ['1 início', '2 antes do await', '3 fim', '4 depois do await', '5 timeout'],
        texto: 'Microtarefas esgotadas: agora sim a macrotarefa roda. Por isso a numeração 1-2-3-4-5.',
      },
    ],
  },
];

export function criarEventLoop() {
  const raiz = document.createElement('div');
  raiz.className = 'eventloop';

  let iPrograma = 0;
  let iPasso = 0;
  let tocando = null;

  const areaCodigo = document.createElement('div');
  areaCodigo.className = 'el-codigo';

  const filas = document.createElement('div');
  filas.className = 'el-filas';

  const controles = document.createElement('div');
  controles.className = 'el-controles';

  const seletor = document.createElement('select');
  seletor.className = 'botao';
  seletor.style.padding = '5px 8px';
  PROGRAMAS.forEach((p, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = p.nome;
    seletor.append(o);
  });

  const btVoltar = document.createElement('button');
  btVoltar.className = 'botao';
  btVoltar.textContent = '‹';

  const btAvancar = document.createElement('button');
  btAvancar.className = 'botao botao-principal';
  btAvancar.textContent = 'Próximo passo ›';

  const btTocar = document.createElement('button');
  btTocar.className = 'botao';
  btTocar.textContent = '▶ auto';

  const btZerar = document.createElement('button');
  btZerar.className = 'botao';
  btZerar.textContent = '↺';

  const contador = document.createElement('span');
  contador.style.cssText = 'font-size:12px;color:var(--texto-3);font-family:var(--mono)';

  const explicacao = document.createElement('div');
  explicacao.className = 'el-explicacao';

  controles.append(seletor, btVoltar, btAvancar, btTocar, btZerar, contador);

  // A explicação fica numa segunda barra, abaixo dos controles.
  const barraExplicacao = document.createElement('div');
  barraExplicacao.className = 'el-controles';
  barraExplicacao.append(explicacao);

  raiz.append(areaCodigo, filas, controles, barraExplicacao);

  function coluna(titulo, descricao, itens, classe) {
    const div = document.createElement('div');
    div.className = 'el-fila';
    const h = document.createElement('h4');
    h.textContent = titulo;
    const p = document.createElement('p');
    p.textContent = descricao;
    div.append(h, p);
    for (const item of itens) {
      const el = document.createElement('div');
      el.className = `el-item ${classe}`;
      el.textContent = item;
      el.title = item;
      div.append(el);
    }
    return div;
  }

  function desenhar() {
    const programa = PROGRAMAS[iPrograma];
    const passo = programa.passos[iPasso];

    areaCodigo.innerHTML = '';
    programa.codigo.forEach((linha, i) => {
      const div = document.createElement('div');
      div.className = 'el-linha' + (passo.linha === i ? ' atual' : '');
      div.innerHTML = `<span class="el-num">${i + 1}</span><span>${realcar(linha)}</span>`;
      areaCodigo.append(div);
    });

    filas.innerHTML = '';
    filas.append(
      coluna('Call stack', 'o que roda agora', [...passo.pilha].reverse(), 'pilha'),
      coluna('Microtarefas', 'promises · prioridade alta', passo.micro, 'micro'),
      coluna('Macrotarefas', 'timers · I/O · prioridade baixa', passo.macro, 'macro'),
      coluna('Saída', 'console.log', passo.saida, 'saida'),
    );

    explicacao.textContent = passo.texto;
    contador.textContent = `${iPasso + 1}/${programa.passos.length}`;
    btVoltar.disabled = iPasso === 0;
    btAvancar.disabled = iPasso === programa.passos.length - 1;
  }

  function parar() {
    if (tocando) {
      clearInterval(tocando);
      tocando = null;
      btTocar.textContent = '▶ auto';
    }
  }

  btAvancar.addEventListener('click', () => {
    if (iPasso < PROGRAMAS[iPrograma].passos.length - 1) iPasso++;
    desenhar();
  });
  btVoltar.addEventListener('click', () => {
    parar();
    if (iPasso > 0) iPasso--;
    desenhar();
  });
  btZerar.addEventListener('click', () => {
    parar();
    iPasso = 0;
    desenhar();
  });
  btTocar.addEventListener('click', () => {
    if (tocando) return parar();
    btTocar.textContent = '⏸ parar';
    tocando = setInterval(() => {
      if (iPasso >= PROGRAMAS[iPrograma].passos.length - 1) return parar();
      iPasso++;
      desenhar();
    }, 1400);
  });
  seletor.addEventListener('change', () => {
    parar();
    iPrograma = Number(seletor.value);
    iPasso = 0;
    desenhar();
  });

  desenhar();
  return raiz;
}
