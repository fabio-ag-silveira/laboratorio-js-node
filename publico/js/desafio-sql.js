/**
 * Desafio de SQL: você escreve a consulta, o laboratório confere o RESULTADO.
 *
 *     { t: 'desafio-sql', enunciado, inicial, solucao, dica?, ordenado? }
 *
 * A conferência roda a sua consulta e a da solução no mesmo banco e compara as
 * linhas. Não importa COMO você chegou lá: JOIN ou subconsulta, CTE ou não. É
 * assim que se testa SQL de verdade, e é por isso que os nomes das colunas não
 * entram na comparação, só a quantidade delas e os valores.
 *
 * Com `ordenado: true`, a ordem das linhas faz parte da resposta (o enunciado
 * pede um ORDER BY). Sem isso, as linhas são comparadas como conjunto.
 */

import { criarEditor } from './editor.js';
import { renderizarMarkdown } from './markdown.js';
import { criarSaida, rodarSQL } from './execucao.js';

async function consultar(sql) {
  const r = await fetch('/api/sql', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sql }) });
  return r.json();
}

/** O último resultado com colunas é "a resposta" de um bloco de SQL. */
const resposta = (r) => (r.resultados ?? []).filter((x) => x.campos.length > 0).at(-1);

/** Devolve null se os resultados batem, ou uma frase dizendo a primeira diferença. */
export function comparar(meu, gabarito, ordenado) {
  if (!meu) return 'A consulta não devolveu nenhuma tabela.';
  if (meu.campos.length !== gabarito.campos.length) {
    return `O resultado deveria ter ${gabarito.campos.length} ${gabarito.campos.length === 1 ? 'coluna' : 'colunas'} (${gabarito.campos.map((c) => c.nome).join(', ')}), e tem ${meu.campos.length}.`;
  }
  if (meu.total !== gabarito.total) return `O resultado deveria ter ${gabarito.total} ${gabarito.total === 1 ? 'linha' : 'linhas'}, e tem ${meu.total}.`;

  const chave = (linha) => JSON.stringify(linha.map((v) => (v === null ? null : String(v))));
  let a = meu.linhas.map(chave);
  let b = gabarito.linhas.map(chave);
  if (!ordenado) {
    a = [...a].sort();
    b = [...b].sort();
  }
  const i = a.findIndex((linha, n) => linha !== b[n]);
  if (i === -1) return null;
  if (!ordenado) return 'O número de linhas e de colunas está certo, mas os valores não batem com o esperado.';
  const mesmoConjunto = [...a].sort().join() === [...b].sort().join();
  return mesmoConjunto ? 'As linhas estão certas, mas em outra ordem. Confira o ORDER BY.' : `A linha ${i + 1} não bate com o esperado.`;
}

export function criarDesafioSQL(bloco, { aoResolver } = {}) {
  const raiz = document.createElement('section');
  raiz.className = 'exercicio desafio-sql';

  const topo = document.createElement('div');
  topo.className = 'exercicio-topo';
  topo.innerHTML = '<span>✎</span><span>Desafio de SQL</span>';

  const enunciado = document.createElement('div');
  enunciado.className = 'exercicio-enunciado prosa';
  enunciado.innerHTML = renderizarMarkdown(bloco.enunciado);

  const editor = criarEditor(bloco.inicial ?? '', { lang: 'sql', minLinhas: 5 });
  const saida = criarSaida();

  const acoes = document.createElement('div');
  acoes.className = 'exercicio-acoes';
  const btConferir = document.createElement('button');
  btConferir.className = 'botao botao-principal';
  btConferir.textContent = '▶ Rodar e conferir';
  const btDica = document.createElement('button');
  btDica.className = 'botao';
  btDica.textContent = '💡 Dica';
  const espaco = document.createElement('span');
  espaco.className = 'espaco';
  const btSolucao = document.createElement('button');
  btSolucao.className = 'botao';
  btSolucao.textContent = 'Ver solução';
  acoes.append(btConferir, btDica, espaco, btSolucao);

  const painelDica = document.createElement('div');
  painelDica.className = 'nota nota-dica';
  painelDica.hidden = true;
  painelDica.style.margin = '0 16px 12px';
  painelDica.innerHTML = `<span class="nota-icone">💡</span><div class="nota-conteudo prosa">${renderizarMarkdown(bloco.dica ?? 'Sem dica para este.')}</div>`;

  const veredito = document.createElement('p');
  veredito.className = 'banner-sucesso';
  veredito.hidden = true;

  const caixaSaida = document.createElement('div');
  caixaSaida.className = 'desafio-saida';
  caixaSaida.append(saida.caixa);

  raiz.append(topo, enunciado, editor.elemento, acoes, painelDica, caixaSaida, veredito);

  btDica.addEventListener('click', () => (painelDica.hidden = !painelDica.hidden));
  btSolucao.addEventListener('click', () => (editor.valor = bloco.solucao));

  async function conferir() {
    btConferir.disabled = true;
    btConferir.textContent = 'rodando…';
    saida.limpar();
    veredito.hidden = true;
    raiz.classList.remove('resolvido', 'errou');

    // mostra o resultado da consulta do usuário, e busca os dois para comparar
    const [, meu, gabarito] = await Promise.all([rodarSQL(editor.valor, saida), consultar(editor.valor), consultar(bloco.solucao)]);

    if (meu.ok) {
      const diferenca = comparar(resposta(meu), resposta(gabarito), bloco.ordenado);
      veredito.hidden = false;
      if (diferenca === null) {
        raiz.classList.add('resolvido');
        veredito.className = 'banner-sucesso';
        veredito.textContent = '✓ O resultado bate com o esperado.';
        aoResolver?.();
      } else {
        raiz.classList.add('errou');
        veredito.className = 'banner-sucesso banner-falha';
        veredito.textContent = `✕ ${diferenca}`;
      }
    }
    btConferir.disabled = false;
    btConferir.textContent = '▶ Rodar e conferir';
  }

  btConferir.addEventListener('click', conferir);
  raiz.addEventListener('rodar', conferir);
  return raiz;
}
