/**
 * Editor de código minimalista.
 *
 * Truque clássico: um <textarea> TRANSPARENTE por cima de um <pre> colorido.
 * Você digita no textarea (que tem o cursor), mas enxerga o <pre> embaixo.
 * Para a ilusão funcionar, os dois precisam ter exatamente a mesma fonte,
 * tamanho, entrelinha e espaçamento — daí a classe .editor-camada nos dois.
 */

import { realcar } from './realce.js';

export function criarEditor(codigoInicial, { lang = 'js', minLinhas = 4 } = {}) {
  const raiz = document.createElement('div');
  raiz.className = 'editor';

  const realce = document.createElement('pre');
  realce.className = 'editor-camada editor-realce';
  realce.setAttribute('aria-hidden', 'true');

  const texto = document.createElement('textarea');
  texto.className = 'editor-camada editor-texto';
  texto.spellcheck = false;
  texto.autocapitalize = 'off';
  texto.autocomplete = 'off';
  texto.value = codigoInicial;

  raiz.append(realce, texto);

  function sincronizar() {
    // O \n final garante que a última linha vazia ocupe altura no <pre>.
    realce.innerHTML = realcar(texto.value + '\n', lang);
    const linhas = Math.max(texto.value.split('\n').length, minLinhas);
    raiz.style.height = `${linhas * 1.62 * 13 + 28}px`;
  }

  texto.addEventListener('input', sincronizar);
  texto.addEventListener('scroll', () => {
    realce.scrollTop = texto.scrollTop;
    realce.scrollLeft = texto.scrollLeft;
  });

  texto.addEventListener('keydown', (e) => {
    // Tab insere dois espaços em vez de pular o foco.
    if (e.key === 'Tab') {
      e.preventDefault();
      const { selectionStart: ini, selectionEnd: fim } = texto;
      texto.value = texto.value.slice(0, ini) + '  ' + texto.value.slice(fim);
      texto.selectionStart = texto.selectionEnd = ini + 2;
      sincronizar();
    }

    // Enter mantém a indentação da linha anterior (e aumenta depois de "{").
    if (e.key === 'Enter') {
      const ini = texto.selectionStart;
      const linhaAtual = texto.value.slice(0, ini).split('\n').pop();
      const recuo = linhaAtual.match(/^\s*/)[0];
      const extra = /[{([]\s*$/.test(linhaAtual) ? '  ' : '';
      if (recuo || extra) {
        e.preventDefault();
        const insercao = '\n' + recuo + extra;
        texto.value = texto.value.slice(0, ini) + insercao + texto.value.slice(texto.selectionEnd);
        texto.selectionStart = texto.selectionEnd = ini + insercao.length;
        sincronizar();
      }
    }

    // Ctrl/Cmd + Enter dispara o botão de rodar, se existir.
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      raiz.dispatchEvent(new CustomEvent('rodar', { bubbles: true }));
    }
  });

  sincronizar();

  return {
    elemento: raiz,
    get valor() {
      return texto.value;
    },
    set valor(v) {
      texto.value = v;
      sincronizar();
    },
    focar: () => texto.focus(),
  };
}
