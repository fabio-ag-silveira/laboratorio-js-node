/**
 * Explorador de API — um mini-Postman que bate na API real do laboratório.
 *
 * Tudo aqui usa `fetch`, exatamente como você faria no seu código. Depois de
 * brincar, abra servidor/api-lab.js e veja o outro lado da conversa.
 */

import { realcar } from './realce.js';
import { criarEditor } from './editor.js';

const RECEITAS = [
  {
    metodo: 'GET',
    rotulo: 'Listar tudo',
    url: '/api/lab/deteccoes',
    nota: 'O básico: coleção inteira.',
  },
  {
    metodo: 'GET',
    rotulo: 'Filtrar por query',
    url: '/api/lab/deteccoes?classe=pessoa&min_conf=0.6',
    nota: 'Filtro vai na query string, nunca no caminho.',
  },
  {
    metodo: 'GET',
    rotulo: 'Ordenar e limitar',
    url: '/api/lab/deteccoes?ordenar=confianca&limite=3',
    nota: 'Paginação e ordenação também são query.',
  },
  {
    metodo: 'GET',
    rotulo: 'Buscar uma (200)',
    url: '/api/lab/deteccoes/1',
  },
  {
    metodo: 'GET',
    rotulo: 'Inexistente (404)',
    url: '/api/lab/deteccoes/999',
    nota: 'Repare no status e no corpo do erro.',
  },
  {
    metodo: 'POST',
    rotulo: 'Criar (201)',
    url: '/api/lab/deteccoes',
    corpo: `{
  "classe": "capacete",
  "confianca": 0.91,
  "caixa": [10, 20, 90, 120],
  "camera": "doca-03"
}`,
    nota: 'Veja o cabeçalho Location na resposta.',
  },
  {
    metodo: 'POST',
    rotulo: 'Inválido (400)',
    url: '/api/lab/deteccoes',
    corpo: `{
  "classe": "dragão",
  "confianca": 7,
  "caixa": "não é array"
}`,
    nota: 'A API explica cada erro. É assim que se faz.',
  },
  {
    metodo: 'PATCH',
    rotulo: 'Atualizar em parte',
    url: '/api/lab/deteccoes/1',
    corpo: `{ "confianca": 0.99 }`,
    nota: 'PATCH manda só o que muda.',
  },
  {
    metodo: 'PUT',
    rotulo: 'Substituir inteira',
    url: '/api/lab/deteccoes/1',
    corpo: `{
  "classe": "colete",
  "confianca": 0.5,
  "caixa": [0, 0, 10, 10]
}`,
    nota: 'PUT exige o objeto completo.',
  },
  {
    metodo: 'DELETE',
    rotulo: 'Remover (204)',
    url: '/api/lab/deteccoes/2',
    nota: '204 = deu certo e não tem corpo.',
  },
  {
    metodo: 'GET',
    rotulo: 'Agregação',
    url: '/api/lab/estatisticas',
  },
  {
    metodo: 'GET',
    rotulo: 'Sem token (401)',
    url: '/api/lab/protegido',
    nota: 'Adicione Authorization: Bearer segredo-do-lab e tente de novo.',
  },
  {
    metodo: 'GET',
    rotulo: 'Lento (para testar timeout)',
    url: '/api/lab/lento?ms=2000',
  },
  {
    metodo: 'GET',
    rotulo: 'Instável (falha 50%)',
    url: '/api/lab/instavel',
    nota: 'Clique várias vezes: às vezes 200, às vezes 500.',
  },
  {
    metodo: 'POST',
    rotulo: '↺ Recarregar dados de exemplo',
    url: '/api/lab/reiniciar',
  },
];

export function criarExplorador() {
  const raiz = document.createElement('div');

  const cabecalho = document.createElement('div');
  cabecalho.className = 'licao-cabecalho';
  cabecalho.innerHTML = `
    <div class="licao-trilha">Ferramenta</div>
    <h1>Explorador de API</h1>
    <p class="licao-resumo">Uma API REST de verdade, rodando neste servidor. Mande pedidos, quebre de propósito, leia os status.</p>`;

  const grade = document.createElement('div');
  grade.className = 'explorador';

  // ---- coluna da esquerda: receitas -----------------------------------
  const listaReceitas = document.createElement('div');
  listaReceitas.className = 'receitas';
  const tit = document.createElement('h3');
  tit.textContent = 'Pedidos prontos';
  listaReceitas.append(tit);

  // ---- coluna da direita: formulário ----------------------------------
  const direita = document.createElement('div');

  const pedido = document.createElement('div');
  pedido.className = 'pedido';

  const linha = document.createElement('div');
  linha.className = 'pedido-linha';

  const selMetodo = document.createElement('select');
  for (const m of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
    const o = document.createElement('option');
    o.value = o.textContent = m;
    selMetodo.append(o);
  }

  const campoUrl = document.createElement('input');
  campoUrl.value = '/api/lab/deteccoes';
  campoUrl.setAttribute('aria-label', 'URL');

  const btEnviar = document.createElement('button');
  btEnviar.className = 'botao botao-principal';
  btEnviar.textContent = 'Enviar';

  linha.append(selMetodo, campoUrl, btEnviar);

  const secCabecalhos = document.createElement('div');
  secCabecalhos.className = 'pedido-secao';
  const rotCab = document.createElement('label');
  rotCab.textContent = 'Cabeçalhos (um por linha: Nome: valor)';
  const edCabecalhos = criarEditor('Content-Type: application/json', { lang: 'text', minLinhas: 2 });
  secCabecalhos.append(rotCab, edCabecalhos.elemento);

  const secCorpo = document.createElement('div');
  secCorpo.className = 'pedido-secao';
  const rotCorpo = document.createElement('label');
  rotCorpo.textContent = 'Corpo (JSON)';
  const edCorpo = criarEditor('', { lang: 'js', minLinhas: 4 });
  secCorpo.append(rotCorpo, edCorpo.elemento);

  pedido.append(linha, secCabecalhos, secCorpo);

  const areaResposta = document.createElement('div');

  direita.append(pedido, areaResposta);
  grade.append(listaReceitas, direita);
  raiz.append(cabecalho, grade);

  // ---- lógica ----------------------------------------------------------

  function aplicarReceita(r) {
    selMetodo.value = r.metodo;
    campoUrl.value = r.url;
    edCorpo.valor = r.corpo ?? '';
    atualizarVisibilidadeCorpo();
  }

  function atualizarVisibilidadeCorpo() {
    secCorpo.hidden = ['GET', 'DELETE'].includes(selMetodo.value);
  }
  selMetodo.addEventListener('change', atualizarVisibilidadeCorpo);
  atualizarVisibilidadeCorpo();

  for (const r of RECEITAS) {
    const bt = document.createElement('button');
    bt.className = 'receita';
    bt.innerHTML = `<b class="${r.metodo}">${r.metodo}</b>${r.rotulo}`;
    if (r.nota) bt.title = r.nota;
    bt.addEventListener('click', () => {
      aplicarReceita(r);
      enviar(r.nota);
    });
    listaReceitas.append(bt);
  }

  function analisarCabecalhos(texto) {
    const saida = {};
    for (const l of texto.split('\n')) {
      const i = l.indexOf(':');
      if (i > 0) {
        const nome = l.slice(0, i).trim();
        const valor = l.slice(i + 1).trim();
        if (nome && valor) saida[nome] = valor;
      }
    }
    return saida;
  }

  async function enviar(nota) {
    btEnviar.disabled = true;
    btEnviar.textContent = 'enviando…';

    const metodo = selMetodo.value;
    const url = campoUrl.value.trim();
    const cabecalhos = analisarCabecalhos(edCabecalhos.valor);
    const temCorpo = !['GET', 'DELETE'].includes(metodo) && edCorpo.valor.trim();

    const inicio = performance.now();
    try {
      const resposta = await fetch(url, {
        method: metodo,
        headers: cabecalhos,
        body: temCorpo ? edCorpo.valor : undefined,
      });
      const ms = Math.round(performance.now() - inicio);
      const bruto = await resposta.text();
      mostrarResposta({ resposta, bruto, ms, nota });
    } catch (erro) {
      areaResposta.innerHTML = `<div class="resposta"><div class="resposta-topo">
        <span class="pilula s5">falhou</span>
        <span class="resposta-meta">${erro.message}</span></div></div>`;
    } finally {
      btEnviar.disabled = false;
      btEnviar.textContent = 'Enviar';
    }
  }

  function mostrarResposta({ resposta, bruto, ms, nota }) {
    const familia = Math.floor(resposta.status / 100);

    let corpoFormatado = bruto;
    let lang = 'text';
    try {
      corpoFormatado = JSON.stringify(JSON.parse(bruto), null, 2);
      lang = 'js';
    } catch {
      /* não era JSON — mostramos como veio */
    }
    if (!bruto) {
      corpoFormatado = '(sem corpo — normal em 204 No Content)';
    }

    const cabs = [...resposta.headers.entries()]
      .map(([k, v]) => `<div><b>${k}:</b> ${v}</div>`)
      .join('');

    areaResposta.innerHTML = `
      <div class="resposta">
        <div class="resposta-topo">
          <span class="pilula s${familia}">${resposta.status} ${resposta.statusText}</span>
          <span class="resposta-meta">${ms}ms · ${bruto.length} bytes</span>
          ${nota ? `<span style="font-size:13px;color:var(--texto-2)">${nota}</span>` : ''}
        </div>
        <pre class="resposta-corpo">${realcar(corpoFormatado, lang)}</pre>
        <div class="cabecalhos">${cabs}</div>
      </div>`;
  }

  btEnviar.addEventListener('click', () => enviar());
  campoUrl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') enviar();
  });

  return raiz;
}
