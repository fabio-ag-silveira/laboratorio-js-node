/**
 * Mini renderizador de Markdown.
 *
 * Suporta só o que o conteúdo do laboratório usa: títulos ###, **negrito**,
 * `código`, listas, tabelas, blocos ``` e links. Uma biblioteca completa
 * (marked, markdown-it) seria mais robusta — mas aqui a graça é não depender
 * de nada e o arquivo caber na cabeça.
 */

import { realcar, escapar } from './realce.js';

// Sentinela para proteger trechos já processados. Precisa ser um caractere que
// jamais apareça no texto: usar algo como " 3 " quebraria em frases comuns
// ("em 3 segundos" viraria um marcador).
const SEN = '\u0001';

/** Formatação dentro de uma linha: código, negrito, itálico, link. */
function embutido(txt) {
  const guardados = [];

  // 1º: proteger `código` — nada dentro dele deve ser reinterpretado.
  let s = txt.replace(/`([^`]+)`/g, (_, conteudo) => {
    guardados.push(`<code>${escapar(conteudo)}</code>`);
    return SEN + (guardados.length - 1) + SEN;
  });

  s = escapar(s);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  // Link externo abre em outra aba, para a lição não sumir de baixo de você.
  // rel="noopener" impede a página aberta de mexer nesta pelo window.opener.
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, texto, url) =>
    /^https?:/.test(url)
      ? `<a href="${url}" target="_blank" rel="noopener">${texto}</a>`
      : `<a href="${url}">${texto}</a>`,
  );

  // devolver os trechos protegidos
  const devolver = new RegExp(SEN + '(\\d+)' + SEN, 'g');
  return s.replace(devolver, (_, i) => guardados[Number(i)]);
}

export function renderizarMarkdown(md) {
  const linhas = md.split('\n');
  let html = '';
  let i = 0;

  const consumirLista = (ordenada) => {
    const itens = [];
    const padrao = ordenada ? /^\s*\d+\.\s+(.*)$/ : /^\s*[-*]\s+(.*)$/;
    while (i < linhas.length) {
      const m = linhas[i].match(padrao);
      if (!m) break;
      itens.push(`<li>${embutido(m[1])}</li>`);
      i++;
    }
    const tag = ordenada ? 'ol' : 'ul';
    return `<${tag}>${itens.join('')}</${tag}>`;
  };

  while (i < linhas.length) {
    const linha = linhas[i];

    if (!linha.trim()) {
      i++;
      continue;
    }

    // bloco de código com crases triplas
    if (linha.trim().startsWith('```')) {
      const lang = linha.trim().slice(3).trim() || 'js';
      const buffer = [];
      i++;
      while (i < linhas.length && !linhas[i].trim().startsWith('```')) {
        buffer.push(linhas[i]);
        i++;
      }
      i++; // pula a linha que fecha
      html += `<pre class="md-pre">${realcar(buffer.join('\n'), lang)}</pre>`;
      continue;
    }

    // título
    const t = linha.match(/^(#{1,4})\s+(.*)$/);
    if (t) {
      const nivel = Math.min(t[1].length + 1, 6);
      html += `<h${nivel}>${embutido(t[2])}</h${nivel}>`;
      i++;
      continue;
    }

    // tabela:  | a | b |  seguida de  | --- | --- |
    if (linha.trim().startsWith('|') && linhas[i + 1]?.includes('---')) {
      const celulas = (l) =>
        l
          .trim()
          .replace(/^\||\|$/g, '')
          .split('|')
          .map((c) => c.trim());

      const cabecalho = celulas(linha);
      i += 2;
      const corpo = [];
      while (i < linhas.length && linhas[i].trim().startsWith('|')) {
        corpo.push(celulas(linhas[i]));
        i++;
      }
      html +=
        '<table><thead><tr>' +
        cabecalho.map((c) => `<th>${embutido(c)}</th>`).join('') +
        '</tr></thead><tbody>' +
        corpo.map((l) => `<tr>${l.map((c) => `<td>${embutido(c)}</td>`).join('')}</tr>`).join('') +
        '</tbody></table>';
      continue;
    }

    // checklist:  - [ ] item   (precisa vir ANTES da lista comum)
    if (/^\s*-\s*\[\s?\]\s+/.test(linha)) {
      const itens = [];
      while (i < linhas.length && /^\s*-\s*\[\s?\]\s+/.test(linhas[i])) {
        const texto = linhas[i].replace(/^\s*-\s*\[\s?\]\s+/, '');
        itens.push(`<li class="check">${embutido(texto)}</li>`);
        i++;
      }
      html += `<ul class="checklist">${itens.join('')}</ul>`;
      continue;
    }

    // listas
    if (/^\s*[-*]\s+/.test(linha)) {
      html += consumirLista(false);
      continue;
    }
    if (/^\s*\d+\.\s+/.test(linha)) {
      html += consumirLista(true);
      continue;
    }

    // parágrafo: junta linhas seguidas até encontrar outra estrutura
    const paragrafo = [];
    while (
      i < linhas.length &&
      linhas[i].trim() &&
      !linhas[i].trim().startsWith('```') &&
      !/^#{1,4}\s/.test(linhas[i]) &&
      !/^\s*[-*]\s+/.test(linhas[i]) &&
      !/^\s*\d+\.\s+/.test(linhas[i]) &&
      !linhas[i].trim().startsWith('|')
    ) {
      paragrafo.push(linhas[i]);
      i++;
    }
    if (paragrafo.length) html += `<p>${embutido(paragrafo.join(' '))}</p>`;
  }

  return html;
}
