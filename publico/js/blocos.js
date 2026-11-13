/**
 * Os tipos de bloco de uma lição.
 *
 * Uma lição é só uma lista de blocos (`{ t: 'texto', ... }`,
 * `{ t: 'codigo', ... }`). Cada função aqui transforma um bloco num elemento
 * do DOM. Conteúdo como dado, interface como função desse dado — a mesma ideia
 * central do React, que você vai encontrar na trilha dele.
 */

import { renderizarMarkdown } from './markdown.js';
import { realcar } from './realce.js';
import { criarEditor } from './editor.js';
import { criarSaida, rodar, ALVOS } from './execucao.js';
import { criarExercicio } from './exercicio.js';

function escaparHtml(t) {
  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function blocoTexto(bloco) {
  const div = document.createElement('div');
  div.className = 'prosa';
  div.innerHTML = renderizarMarkdown(bloco.md);
  return div;
}

function blocoNota(bloco) {
  const icones = { dica: '💡', atencao: '⚠️', pegadinha: '🪤', campo: '🌾', entrevista: '🎯' };
  const div = document.createElement('div');
  div.className = `nota nota-${bloco.estilo}`;
  div.innerHTML = `
    <span class="nota-icone">${icones[bloco.estilo] ?? 'ℹ️'}</span>
    <div class="nota-conteudo prosa">${renderizarMarkdown(bloco.md)}</div>`;
  return div;
}

/**
 * Dois trechos lado a lado. Formato novo:
 *   { t: 'comparacao', esq: { titulo, lang, codigo }, dir: { ... }, nota }
 * O formato antigo `py-js` (campos py/js) continua aceito.
 */
function blocoComparacao(bloco) {
  const esq = bloco.esq ?? {
    titulo: bloco.tituloEsq ?? 'Python',
    lang: bloco.langEsq ?? 'python',
    codigo: bloco.py,
  };
  const dir = bloco.dir ?? {
    titulo: bloco.tituloDir ?? 'JavaScript',
    lang: bloco.langDir ?? 'js',
    codigo: bloco.js,
  };

  const div = document.createElement('div');
  div.className = 'comparacao';

  const lado = ({ titulo, codigo, lang }) => `
    <div class="comparacao-lado">
      <div class="comparacao-titulo">${escaparHtml(titulo)}</div>
      <pre>${realcar(codigo, lang)}</pre>
    </div>`;

  div.innerHTML =
    lado(esq) +
    lado(dir) +
    (bloco.nota ? `<div class="comparacao-nota prosa">${renderizarMarkdown(bloco.nota)}</div>` : '');

  return div;
}

export function blocoTabela(bloco) {
  const tabela = document.createElement('table');
  tabela.className = 'tabela-dados' + (bloco.prosa ? ' tabela-prosa' : '');
  tabela.innerHTML =
    '<thead><tr>' +
    bloco.colunas.map((c) => `<th>${escaparHtml(c)}</th>`).join('') +
    '</tr></thead><tbody>' +
    bloco.linhas
      .map((l) => `<tr>${l.map((c) => `<td>${escaparHtml(c)}</td>`).join('')}</tr>`)
      .join('') +
    '</tbody>';
  return tabela;
}

function blocoCodigo(bloco) {
  const alvo = bloco.rodar ? ALVOS[bloco.rodar] : null;
  const lang = bloco.lang ?? alvo?.lang ?? 'js';

  const caixa = document.createElement('div');
  caixa.className = 'bloco-codigo';

  const topo = document.createElement('div');
  topo.className = 'bloco-topo';

  const titulo = document.createElement('span');
  titulo.className = 'bloco-titulo';
  titulo.textContent = bloco.titulo ?? '';
  topo.append(titulo);

  if (alvo) {
    const etiqueta = document.createElement('span');
    etiqueta.className = `etiqueta etiqueta-${bloco.rodar}`;
    etiqueta.textContent = alvo.rotulo;
    topo.append(etiqueta);
  }

  let editor = null;

  const btCopiar = document.createElement('button');
  btCopiar.className = 'botao';
  btCopiar.textContent = 'copiar';
  btCopiar.addEventListener('click', async () => {
    await navigator.clipboard.writeText(editor ? editor.valor : bloco.codigo);
    btCopiar.textContent = 'copiado!';
    setTimeout(() => (btCopiar.textContent = 'copiar'), 1400);
  });
  topo.append(btCopiar);
  caixa.append(topo);

  if (!alvo) {
    const pre = document.createElement('pre');
    pre.innerHTML = realcar(bloco.codigo, lang);
    caixa.append(pre);
    return caixa;
  }

  // Código executável vira editor: dá para mexer antes de rodar.
  editor = criarEditor(bloco.codigo, { lang });
  const saida = criarSaida();

  const btRodar = document.createElement('button');
  btRodar.className = 'botao botao-principal';
  btRodar.textContent = '▶ Rodar';
  btRodar.title = 'Ctrl + Enter';
  topo.insertBefore(btRodar, btCopiar);

  const btRestaurar = document.createElement('button');
  btRestaurar.className = 'botao';
  btRestaurar.textContent = '↺';
  btRestaurar.title = 'Voltar ao código original';
  btRestaurar.addEventListener('click', () => (editor.valor = bloco.codigo));
  topo.append(btRestaurar);

  async function executar() {
    btRodar.disabled = true;
    btRodar.textContent = 'rodando…';
    saida.limpar();
    const resultado = await rodar(bloco.rodar, editor.valor, saida, bloco.tempo);
    saida.finalizar(resultado, alvo.onde);
    btRodar.disabled = false;
    btRodar.textContent = '▶ Rodar';
  }

  btRodar.addEventListener('click', executar);
  caixa.addEventListener('rodar', executar);
  caixa.append(editor.elemento, saida.caixa, saida.rodape);
  return caixa;
}

/**
 * Componente interativo, carregado sob demanda.
 *
 * `componente: 'cv/iou'` vira `import('./visuais/cv/iou.js')`. Não existe
 * lista central de componentes: o nome É o caminho. A expressão regular
 * garante que o conteúdo não consiga apontar para fora da pasta `visuais/`.
 */
function blocoVisual(bloco) {
  const casca = document.createElement('div');
  casca.className = 'visual-casca';
  casca.textContent = 'carregando componente…';

  if (!/^[a-z0-9-]+\/[a-z0-9-]+$/.test(bloco.componente ?? '')) {
    casca.textContent = `componente inválido: ${bloco.componente}`;
    return casca;
  }

  import(`./visuais/${bloco.componente}.js`)
    .then((modulo) => {
      const elemento = modulo.default(bloco.opcoes ?? {});
      casca.replaceWith(elemento);
    })
    .catch((erro) => {
      console.error(erro);
      casca.classList.add('visual-erro');
      casca.textContent = `Não consegui carregar "${bloco.componente}": ${erro.message}`;
    });

  return casca;
}

/**
 * Pergunta de múltipla escolha com explicação.
 *   { t: 'quiz', pergunta, opcoes: [...], correta: 1, explicacao }
 * `aoResponder(acertou)` é usado pela página de revisão para somar o placar.
 */
export function blocoQuiz(bloco, { aoResponder } = {}) {
  const raiz = document.createElement('section');
  raiz.className = 'quiz';

  const pergunta = document.createElement('div');
  pergunta.className = 'quiz-pergunta prosa';
  pergunta.innerHTML = renderizarMarkdown(bloco.pergunta);

  const lista = document.createElement('div');
  lista.className = 'quiz-opcoes';

  const explicacao = document.createElement('div');
  explicacao.className = 'quiz-explicacao prosa';
  explicacao.hidden = true;

  let respondido = false;

  bloco.opcoes.forEach((texto, i) => {
    const bt = document.createElement('button');
    bt.className = 'quiz-opcao';
    bt.innerHTML = `<span class="quiz-letra">${'ABCDEF'[i]}</span><span class="prosa">${renderizarMarkdown(texto)}</span>`;
    bt.addEventListener('click', () => {
      if (respondido) return;
      respondido = true;
      const acertou = i === bloco.correta;
      bt.classList.add(acertou ? 'certa' : 'errada');
      lista.children[bloco.correta].classList.add('certa');
      for (const outro of lista.children) outro.disabled = true;
      explicacao.hidden = false;
      explicacao.innerHTML =
        `<strong>${acertou ? '✓ Isso.' : '✕ Não é essa.'}</strong> ` +
        renderizarMarkdown(bloco.explicacao ?? '');
      raiz.classList.add(acertou ? 'acertou' : 'errou');
      aoResponder?.(acertou);
    });
    lista.append(bt);
  });

  raiz.innerHTML = '<div class="quiz-topo">Pergunta</div>';
  raiz.append(pergunta, lista, explicacao);
  return raiz;
}

export function renderizarBloco(bloco, contexto = {}) {
  switch (bloco.t) {
    case 'texto':
      return blocoTexto(bloco);
    case 'nota':
      return blocoNota(bloco);
    case 'py-js':
    case 'comparacao':
      return blocoComparacao(bloco);
    case 'codigo':
      return blocoCodigo(bloco);
    case 'tabela':
      return blocoTabela(bloco);
    case 'visual':
      return blocoVisual(bloco);
    case 'quiz':
      return blocoQuiz(bloco, contexto);
    case 'exercicio':
      return criarExercicio(bloco, contexto);
    default:
      return document.createComment(`bloco desconhecido: ${bloco.t}`);
  }
}
