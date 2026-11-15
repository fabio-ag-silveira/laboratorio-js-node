/**
 * Prévia ao vivo de React (e, na trilha seguinte, de React Native).
 *
 *     { t: 'previa', titulo, codigo, altura?, enunciado?, testes?, solucao?, dica? }
 *
 * O código do editor é um arquivo `.tsx` com `export default function App()`.
 * A cada edição:
 *
 *   1. o servidor transforma TSX em JavaScript  (POST /api/transformar)
 *   2. um <iframe> novo carrega a página da prévia (`/vendor/previa.html`)
 *   3. o JavaScript é enviado por `postMessage`; lá dentro, o React é
 *      importado pelo "import map" e o <App /> é montado
 *
 * POR QUE UM IFRAME, E DE OUTRA ORIGEM: o código da prévia é arbitrário. O
 * iframe é carregado de `127.0.0.1` quando o laboratório está em `localhost`
 * (e vice-versa): mesma máquina, mas origens diferentes para o navegador. Com
 * isso a prévia não lê o `localStorage` do laboratório (onde está o seu
 * progresso) nem mexe no DOM da página; se quebrar, joga-se o iframe fora. A
 * conversa entre as duas janelas é só por `postMessage`.
 *
 * Com `testes`, o bloco vira exercício: os testes rodam DENTRO do iframe,
 * clicando e lendo a tela como um usuário faria. É a ideia da Testing Library.
 */

import { criarEditor } from './editor.js';
import { renderizarMarkdown } from './markdown.js';

let contador = 0;

/**
 * A prévia mora em OUTRA origem: se o laboratório está em `localhost`, o iframe
 * carrega de `127.0.0.1`, e vice-versa. É o mesmo servidor, mas o navegador
 * trata como sites diferentes, e é isso que isola o código da prévia.
 */
function origemDaPrevia() {
  const { protocol, hostname, port } = window.location;
  const outro = hostname === 'localhost' ? '127.0.0.1' : hostname === '127.0.0.1' ? 'localhost' : hostname;
  return `${protocol}//${outro}${port ? `:${port}` : ''}`;
}
const ORIGEM = origemDaPrevia();

let ambientePronto;
/** As dependências opcionais (react, esbuild) estão instaladas? */
function previaDisponivel() {
  ambientePronto ??= fetch('/api/ambiente')
    .then((r) => r.json())
    .then((a) => a.previa ?? { ok: false, instalar: 'npm install' });
  return ambientePronto;
}

function coresDoTema() {
  const estilo = getComputedStyle(document.documentElement);
  return ['--fundo', '--fundo-2', '--fundo-3', '--borda', '--borda-forte', '--texto', '--texto-2', '--texto-3', '--destaque', '--verde', '--amarelo', '--vermelho', '--roxo']
    .map((n) => `${n}:${estilo.getPropertyValue(n).trim()}`)
    .join(';');
}

export function criarPrevia(bloco, { aoResolver } = {}) {
  const id = `previa-${++contador}`;
  const ehExercicio = Array.isArray(bloco.testes) && bloco.testes.length > 0;

  const raiz = document.createElement('section');
  raiz.className = 'previa' + (ehExercicio ? ' previa-exercicio' : '');

  const topo = document.createElement('div');
  topo.className = 'bloco-topo';
  topo.innerHTML = `<span class="bloco-titulo"></span><span class="etiqueta etiqueta-react">${bloco.plataforma === 'nativo' ? 'react native' : 'react'}</span>`;
  topo.querySelector('.bloco-titulo').textContent = (ehExercicio ? '✎ Exercício — ' : '') + (bloco.titulo ?? '');

  const btRodar = document.createElement('button');
  btRodar.className = 'botao botao-principal';
  btRodar.textContent = ehExercicio ? '▶ Rodar testes' : '▶ Atualizar';
  btRodar.title = 'Ctrl + Enter';

  const btRestaurar = document.createElement('button');
  btRestaurar.className = 'botao';
  btRestaurar.textContent = '↺';
  btRestaurar.title = 'Voltar ao código original';
  topo.append(btRodar, btRestaurar);

  raiz.append(topo);

  if (bloco.enunciado) {
    const enunciado = document.createElement('div');
    enunciado.className = 'previa-enunciado prosa';
    enunciado.innerHTML = renderizarMarkdown(bloco.enunciado);
    raiz.append(enunciado);
  }

  const corpo = document.createElement('div');
  corpo.className = 'previa-corpo';
  const editor = criarEditor(bloco.codigo, { lang: 'tsx', minLinhas: 6 });

  const lado = document.createElement('div');
  lado.className = 'previa-lado';
  const moldura = document.createElement('div');
  moldura.className = 'previa-moldura';
  moldura.textContent = 'a prévia aparece aqui';
  const consoleEl = document.createElement('div');
  consoleEl.className = 'previa-console';
  consoleEl.hidden = true;
  lado.append(moldura, consoleEl);
  corpo.append(editor.elemento, lado);
  raiz.append(corpo);

  // ---- só para exercícios ------------------------------------------------
  const listaTestes = document.createElement('div');
  listaTestes.className = 'testes';
  listaTestes.hidden = true;
  const banner = document.createElement('p');
  banner.className = 'banner-sucesso';
  banner.hidden = true;

  if (ehExercicio) {
    const acoes = document.createElement('div');
    acoes.className = 'exercicio-acoes';
    const espaco = document.createElement('span');
    espaco.className = 'espaco';
    acoes.append(espaco);

    if (bloco.dica) {
      const btDica = document.createElement('button');
      btDica.className = 'botao';
      btDica.textContent = '💡 Dica';
      const painel = document.createElement('div');
      painel.className = 'nota nota-dica';
      painel.hidden = true;
      painel.style.margin = '0 16px 12px';
      painel.innerHTML = `<span class="nota-icone">💡</span><div class="nota-conteudo prosa">${renderizarMarkdown(bloco.dica)}</div>`;
      btDica.addEventListener('click', () => (painel.hidden = !painel.hidden));
      acoes.prepend(btDica);
      raiz.append(acoes, painel);
    } else raiz.append(acoes);

    if (bloco.solucao) {
      const btSolucao = document.createElement('button');
      btSolucao.className = 'botao';
      btSolucao.textContent = 'Ver solução';
      btSolucao.addEventListener('click', () => {
        editor.valor = bloco.solucao;
        atualizar(false);
      });
      acoes.append(btSolucao);
    }
    raiz.append(listaTestes, banner);
  }

  // ---- ciclo de vida -------------------------------------------------------
  let iframe = null;
  let versao = 0;
  let pendente = null; // mensagem "montar" esperando o iframe carregar

  function escreverConsole(nivel, texto) {
    consoleEl.hidden = false;
    const linha = document.createElement('div');
    linha.className = 'saida-linha' + (nivel === 'error' ? ' saida-erro' : nivel === 'warn' ? ' saida-aviso' : '');
    linha.textContent = texto;
    consoleEl.append(linha);
    while (consoleEl.children.length > 60) consoleEl.firstChild.remove();
    consoleEl.scrollTop = consoleEl.scrollHeight;
  }

  function mostrarErro(texto, extra) {
    moldura.replaceChildren();
    const pre = document.createElement('pre');
    pre.className = 'previa-erro';
    pre.textContent = texto + (extra ? `\n\n${extra}` : '');
    moldura.append(pre);
    iframe = null;
  }

  function mostrarTestes(resultados) {
    listaTestes.hidden = false;
    listaTestes.replaceChildren();
    for (const r of resultados) {
      const linha = document.createElement('div');
      linha.className = `teste ${r.ok ? 'teste-ok' : 'teste-falhou'}`;
      const icone = document.createElement('span');
      icone.className = 'teste-icone';
      icone.textContent = r.ok ? '✓' : '✕';
      const nome = document.createElement('span');
      nome.className = 'teste-nome';
      nome.textContent = r.nome;
      if (!r.ok) {
        const det = document.createElement('span');
        det.className = 'teste-motivo';
        det.textContent = r.motivo;
        nome.append(det);
      }
      linha.append(icone, nome);
      listaTestes.append(linha);
    }
    const todos = resultados.every((r) => r.ok);
    raiz.classList.toggle('resolvido', todos);
    banner.hidden = !todos;
    if (todos) {
      banner.textContent = `✓ Todos os ${resultados.length} testes passaram.`;
      aoResolver?.();
    }
  }

  /** Transforma o código e troca o iframe. `comTestes` roda os testes do exercício. */
  async function atualizar(comTestes) {
    const minha = ++versao;
    consoleEl.replaceChildren();
    consoleEl.hidden = true;

    const disponivel = await previaDisponivel();
    if (!disponivel.ok) {
      return mostrarErro('A prévia precisa das dependências opcionais do laboratório.', `Rode na pasta do projeto:  ${disponivel.instalar}
e reinicie o servidor.`);
    }

    let r;
    try {
      const resposta = await fetch('/api/transformar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: editor.valor }),
      });
      r = await resposta.json();
    } catch (e) {
      return mostrarErro(`Não consegui falar com o servidor: ${e.message}`);
    }
    if (minha !== versao) return; // uma edição mais nova já está a caminho

    if (r.erro) {
      const onde = r.linha ? `linha ${r.linha}: ` : '';
      return mostrarErro(`Erro de sintaxe — ${onde}${r.erro}`, r.trecho ? `    ${r.trecho.trim()}` : '');
    }

    const novo = document.createElement('iframe');
    novo.className = 'previa-iframe';
    novo.title = `Prévia: ${bloco.titulo ?? ''}`;
    novo.style.height = `${iframe?.style.height || `${bloco.altura ?? 160}px`}`;
    novo.src = `${ORIGEM}/vendor/previa.html`;
    // o código só é enviado quando a página do iframe avisar que carregou
    pendente = { tipo: 'montar', id, js: r.js, testes: comTestes ? bloco.testes : null, cores: coresDoTema() };
    moldura.replaceChildren(novo);
    iframe = novo;
  }

  function aoReceber(ev) {
    if (!iframe || ev.source !== iframe.contentWindow || ev.origin !== ORIGEM) return;
    const m = ev.data;
    if (m?.tipo === 'carregada' && pendente) {
      iframe.contentWindow.postMessage(pendente, ORIGEM);
      pendente = null;
      return;
    }
    if (m?.previa !== id) return;
    if (m.tipo === 'console') escreverConsole(m.nivel, m.texto);
    else if (m.tipo === 'erro') escreverConsole('error', m.texto);
    else if (m.tipo === 'altura') iframe.style.height = `${Math.min(Math.max(m.px, bloco.altura ?? 120), bloco.alturaMax ?? 560)}px`;
    else if (m.tipo === 'testes') mostrarTestes(m.resultados);
  }
  window.addEventListener('message', aoReceber);

  // Edição: espera a digitação parar antes de recompilar ("debounce").
  let espera = null;
  editor.elemento.addEventListener('input', () => {
    clearTimeout(espera);
    espera = setTimeout(() => atualizar(false), 600);
  });

  const rodar = () => {
    clearTimeout(espera);
    atualizar(ehExercicio);
  };
  btRodar.addEventListener('click', rodar);
  raiz.addEventListener('rodar', rodar);
  btRestaurar.addEventListener('click', () => {
    editor.valor = bloco.codigo;
    listaTestes.hidden = true;
    banner.hidden = true;
    raiz.classList.remove('resolvido');
    atualizar(false);
  });

  // Só monta a prévia quando o bloco entra na tela: uma lição pode ter dez.
  const observador = new IntersectionObserver(
    (entradas) => {
      if (entradas.some((e) => e.isIntersecting)) {
        observador.disconnect();
        atualizar(false);
      }
    },
    { rootMargin: '200px' },
  );
  observador.observe(raiz);
  // rede de segurança: aba em segundo plano pode atrasar o observador
  setTimeout(() => {
    if (versao === 0 && raiz.isConnected) {
      observador.disconnect();
      atualizar(false);
    }
  }, 1500);

  // Trocou o tema: as cores vão embutidas no documento, então refaz.
  const aoTrocarTema = new MutationObserver(() => {
    if (!raiz.isConnected) {
      aoTrocarTema.disconnect();
      window.removeEventListener('message', aoReceber);
      return;
    }
    if (iframe) atualizar(false);
  });
  aoTrocarTema.observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] });

  return raiz;
}
