/**
 * Aplicação principal — roteamento e renderização.
 *
 * É uma SPA (single page application) minúscula, sem framework: o "roteador"
 * é o evento hashchange, e a tela é redesenhada do zero a cada navegação.
 * React/Vue/Svelte resolvem isso com muito mais cuidado — mas para umas poucas
 * telas, isto aqui basta e cabe na cabeça.
 */

import { renderizarMarkdown } from './markdown.js';
import { realcar } from './realce.js';
import { criarEditor } from './editor.js';
import { criarSaida, rodarNoNavegador, rodarNoNode } from './execucao.js';
import { criarExercicio } from './exercicio.js';
import { criarEventLoop } from './eventloop.js';
import { criarExplorador } from './explorador.js';
import * as progresso from './progresso.js';

const principal = document.getElementById('principal');
const indice = document.getElementById('indice');

let trilha = [];
let todasLicoes = []; // achatada, para navegação anterior/próxima

// ==========================================================================
//  Blocos
// ==========================================================================

function blocoTexto(bloco) {
  const div = document.createElement('div');
  div.className = 'prosa';
  div.innerHTML = renderizarMarkdown(bloco.md);
  return div;
}

function blocoNota(bloco) {
  const icones = { dica: '💡', atencao: '⚠️', pegadinha: '🪤' };
  const div = document.createElement('div');
  div.className = `nota nota-${bloco.estilo}`;
  div.innerHTML = `
    <span class="nota-icone">${icones[bloco.estilo] ?? 'ℹ️'}</span>
    <div class="nota-conteudo prosa">${renderizarMarkdown(bloco.md)}</div>`;
  return div;
}

function blocoComparacao(bloco) {
  const div = document.createElement('div');
  div.className = 'comparacao';

  const lado = (titulo, codigo, lang) => `
    <div class="comparacao-lado">
      <div class="comparacao-titulo">${titulo}</div>
      <pre>${realcar(codigo, lang)}</pre>
    </div>`;

  div.innerHTML =
    lado(bloco.tituloEsq ?? 'Python', bloco.py, bloco.langEsq ?? 'python') +
    lado(bloco.tituloDir ?? 'JavaScript', bloco.js, bloco.langDir ?? 'js') +
    (bloco.nota
      ? `<div class="comparacao-nota prosa">${renderizarMarkdown(bloco.nota)}</div>`
      : '');

  return div;
}

function blocoTabela(bloco) {
  const tabela = document.createElement('table');
  tabela.className = 'tabela-dados';
  tabela.innerHTML =
    '<thead><tr>' +
    bloco.colunas.map((c) => `<th>${c}</th>`).join('') +
    '</tr></thead><tbody>' +
    bloco.linhas
      .map((l) => `<tr>${l.map((c) => `<td>${escaparHtml(c)}</td>`).join('')}</tr>`)
      .join('') +
    '</tbody>';
  return tabela;
}

function escaparHtml(t) {
  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function blocoCodigo(bloco) {
  const caixa = document.createElement('div');
  caixa.className = 'bloco-codigo';

  const topo = document.createElement('div');
  topo.className = 'bloco-topo';

  const titulo = document.createElement('span');
  titulo.className = 'bloco-titulo';
  titulo.textContent = bloco.titulo ?? '';

  topo.append(titulo);

  if (bloco.rodar) {
    const etiqueta = document.createElement('span');
    etiqueta.className = `etiqueta etiqueta-${bloco.rodar}`;
    etiqueta.textContent = bloco.rodar === 'node' ? 'node' : 'navegador';
    topo.append(etiqueta);
  }

  const btCopiar = document.createElement('button');
  btCopiar.className = 'botao';
  btCopiar.textContent = 'copiar';
  btCopiar.addEventListener('click', async () => {
    await navigator.clipboard.writeText(editor ? editor.valor : bloco.codigo);
    btCopiar.textContent = 'copiado!';
    setTimeout(() => (btCopiar.textContent = 'copiar'), 1400);
  });
  topo.append(btCopiar);

  let editor = null;
  caixa.append(topo);

  if (bloco.rodar) {
    // Código executável vira editor: você pode mexer antes de rodar.
    editor = criarEditor(bloco.codigo, { lang: bloco.lang ?? 'js' });
    caixa.append(editor.elemento);
  } else {
    const pre = document.createElement('pre');
    pre.innerHTML = realcar(bloco.codigo, bloco.lang ?? 'js');
    caixa.append(pre);
  }

  if (bloco.rodar) {
    const saida = criarSaida();

    const btRodar = document.createElement('button');
    btRodar.className = 'botao botao-principal';
    btRodar.textContent = '▶ Rodar';
    btRodar.title = 'Ctrl + Enter';
    topo.insertBefore(btRodar, btCopiar);

    async function executar() {
      btRodar.disabled = true;
      btRodar.textContent = 'rodando…';
      saida.limpar();

      const codigo = editor.valor;
      const resultado =
        bloco.rodar === 'node'
          ? await rodarNoNode(codigo, saida.escrever)
          : await rodarNoNavegador(codigo, saida.escrever);

      saida.finalizar(resultado, bloco.rodar === 'node' ? 'processo Node' : 'navegador');
      btRodar.disabled = false;
      btRodar.textContent = '▶ Rodar';
    }

    btRodar.addEventListener('click', executar);
    caixa.addEventListener('rodar', executar);
    caixa.append(saida.caixa, saida.rodape);
  }

  return caixa;
}

const STATUS = [
  ['200', 'OK', 'Deu certo.', 'var(--verde)'],
  ['201', 'Created', 'Criou algo. Mande o cabeçalho Location.', 'var(--verde)'],
  ['204', 'No Content', 'Deu certo e não há corpo. Típico do DELETE.', 'var(--verde)'],
  ['400', 'Bad Request', 'O pedido está malformado ou inválido.', 'var(--amarelo)'],
  ['401', 'Unauthorized', 'Você não disse quem é. (Nome enganoso: é autenticação.)', 'var(--amarelo)'],
  ['403', 'Forbidden', 'Sei quem você é, e você não pode.', 'var(--amarelo)'],
  ['404', 'Not Found', 'O recurso não existe.', 'var(--amarelo)'],
  ['409', 'Conflict', 'Conflito de estado — e-mail já cadastrado, por exemplo.', 'var(--amarelo)'],
  ['422', 'Unprocessable', 'JSON válido, mas com dados que não fazem sentido.', 'var(--amarelo)'],
  ['429', 'Too Many Requests', 'Calma lá. Limite de taxa estourado.', 'var(--amarelo)'],
  ['500', 'Internal Error', 'Seu código quebrou. Culpa do servidor.', 'var(--vermelho)'],
  ['503', 'Unavailable', 'Fora do ar ou sobrecarregado. Tente de novo depois.', 'var(--vermelho)'],
];

function blocoVisual(bloco) {
  if (bloco.componente === 'event-loop') return criarEventLoop();

  if (bloco.componente === 'tabela-status') {
    const grade = document.createElement('div');
    grade.className = 'status-grade';
    grade.innerHTML = STATUS.map(
      ([codigo, nome, desc, cor]) => `
      <div class="status-cartao" style="--cor-st:${cor}">
        <code>${codigo}</code>
        <strong>${nome}</strong>
        <span>${desc}</span>
      </div>`,
    ).join('');
    return grade;
  }

  if (bloco.componente === 'atalho-explorador') {
    const div = document.createElement('div');
    div.className = 'atalho-cartao';
    div.innerHTML = `
      <span style="font-size:24px">🧪</span>
      <div>
        <strong>Explorador de API</strong>
        <span>Mande pedidos reais para a API deste servidor e veja status, cabeçalhos e corpo.</span>
      </div>
      <a class="botao botao-principal" href="#/explorador" style="text-decoration:none">Abrir</a>`;
    return div;
  }

  return document.createComment('componente desconhecido');
}

function renderizarBloco(bloco, contexto) {
  switch (bloco.t) {
    case 'texto':
      return blocoTexto(bloco);
    case 'nota':
      return blocoNota(bloco);
    case 'py-js':
      return blocoComparacao(bloco);
    case 'codigo':
      return blocoCodigo(bloco);
    case 'tabela':
      return blocoTabela(bloco);
    case 'visual':
      return blocoVisual(bloco);
    case 'exercicio':
      return criarExercicio(bloco, contexto);
    default:
      return document.createComment(`bloco desconhecido: ${bloco.t}`);
  }
}

// ==========================================================================
//  Telas
// ==========================================================================

function telaLicao(idModulo, idLicao) {
  const modulo = trilha.find((m) => m.id === idModulo);
  const licao = modulo?.licoes.find((l) => l.id === idLicao);
  if (!licao) return telaNaoEncontrada();

  const frag = document.createDocumentFragment();
  const chaveProgresso = `${idModulo}/${idLicao}`;

  const cabecalho = document.createElement('header');
  cabecalho.className = 'licao-cabecalho';
  cabecalho.style.setProperty('--cor-modulo', modulo.cor);
  cabecalho.innerHTML = `
    <div class="licao-trilha">${modulo.titulo}</div>
    <h1>${licao.titulo}</h1>
    <p class="licao-resumo">${licao.resumo}</p>
    <div class="licao-meta"><span>⏱ ~${licao.minutos} min</span></div>`;
  frag.append(cabecalho);

  for (const bloco of licao.blocos) {
    frag.append(renderizarBloco(bloco, {}));
  }

  // ---- botão de concluir ----------------------------------------------
  const btConcluir = document.createElement('button');
  btConcluir.className = 'botao-concluir';
  const pintarBotao = () => {
    const feita = progresso.estaFeita(chaveProgresso);
    btConcluir.textContent = feita ? '✓ Lição concluída — desmarcar' : 'Marcar lição como concluída';
    btConcluir.classList.toggle('feita', feita);
  };
  pintarBotao();
  btConcluir.addEventListener('click', () => {
    progresso.alternar(chaveProgresso);
    pintarBotao();
    desenharIndice();
    atualizarProgresso();
  });
  frag.append(btConcluir);

  // ---- navegação anterior / próxima -----------------------------------
  const i = todasLicoes.findIndex((l) => l.chave === chaveProgresso);
  const anterior = todasLicoes[i - 1];
  const proxima = todasLicoes[i + 1];

  const nav = document.createElement('nav');
  nav.className = 'nav-licoes';
  if (anterior) {
    nav.innerHTML += `<a class="nav-licao" href="#/licao/${anterior.chave}">
      <span>← anterior</span><strong>${anterior.titulo}</strong></a>`;
  }
  if (proxima) {
    nav.innerHTML += `<a class="nav-licao direita" href="#/licao/${proxima.chave}">
      <span>próxima →</span><strong>${proxima.titulo}</strong></a>`;
  }
  frag.append(nav);

  return frag;
}

const EXEMPLOS_PLAYGROUND = [
  {
    nome: 'Olá',
    alvo: 'browser',
    codigo: `const nome = 'Fábio';
console.log(\`Olá, \${nome}!\`);

const nums = [1, 2, 3, 4, 5];
console.log('dobro:', nums.map(n => n * 2));
console.log('soma: ', nums.reduce((a, b) => a + b, 0));`,
  },
  {
    nome: 'Assíncrono',
    alvo: 'browser',
    codigo: `const dorme = (ms) => new Promise(r => setTimeout(r, ms));

console.log('início');
setTimeout(() => console.log('macrotarefa'), 0);
Promise.resolve().then(() => console.log('microtarefa'));
console.log('fim do síncrono');

await dorme(100);
console.log('--- 100ms depois ---');

const t0 = Date.now();
await Promise.all([dorme(200), dorme(200), dorme(200)]);
console.log('três esperas de 200ms em', Date.now() - t0, 'ms');`,
  },
  {
    nome: 'Chamar a API',
    alvo: 'browser',
    codigo: `const r = await fetch('/api/lab/deteccoes?min_conf=0.7');
console.log('status:', r.status);

const { total, itens } = await r.json();
console.log('total:', total);

for (const d of itens) {
  console.log(\`  \${d.classe.padEnd(14)} \${d.confianca}\`);
}

const stats = await (await fetch('/api/lab/estatisticas')).json();
console.log('estatísticas:', stats);`,
  },
  {
    nome: 'Arquivos (Node)',
    alvo: 'node',
    codigo: `import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const arquivo = path.join(os.tmpdir(), 'teste-lab.json');

await fs.writeFile(arquivo, JSON.stringify({ ok: true, quando: new Date() }, null, 2));
console.log('escrevi em', arquivo);

console.log(await fs.readFile(arquivo, 'utf8'));

await fs.unlink(arquivo);
console.log('apaguei');`,
  },
  {
    nome: 'Servidor (Node)',
    alvo: 'node',
    codigo: `import { createServer } from 'node:http';

const servidor = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ rota: req.url, metodo: req.method }));
});

servidor.listen(0, async () => {
  const { port } = servidor.address();
  console.log('subiu na porta', port);

  const r = await fetch(\`http://localhost:\${port}/ola?x=1\`);
  console.log('resposta:', await r.json());

  servidor.close();
});`,
  },
  {
    nome: 'Sistema (Node)',
    alvo: 'node',
    codigo: `import os from 'node:os';

console.log('node:      ', process.version);
console.log('plataforma:', process.platform, process.arch);
console.log('CPUs:      ', os.cpus().length, '×', os.cpus()[0].model.trim());
console.log('memória:   ', (os.totalmem() / 1e9).toFixed(1), 'GB');
console.log('pasta:     ', process.cwd());`,
  },
];

function telaPlayground() {
  const frag = document.createDocumentFragment();

  const topo = document.createElement('div');
  topo.className = 'playground-topo';
  topo.innerHTML = '<h1>Playground</h1>';

  const seletor = document.createElement('div');
  seletor.className = 'seletor-alvo';
  const btNavegador = document.createElement('button');
  btNavegador.textContent = 'navegador';
  btNavegador.className = 'ativo';
  const btNode = document.createElement('button');
  btNode.textContent = 'Node';
  seletor.append(btNavegador, btNode);

  const btRodar = document.createElement('button');
  btRodar.className = 'botao botao-principal';
  btRodar.textContent = '▶ Rodar (Ctrl+Enter)';

  topo.append(seletor, btRodar);

  const exemplos = document.createElement('div');
  exemplos.className = 'exemplos';

  const caixa = document.createElement('div');
  caixa.className = 'bloco-codigo';

  const editor = criarEditor(EXEMPLOS_PLAYGROUND[0].codigo, { minLinhas: 16 });
  const saida = criarSaida();
  caixa.append(editor.elemento, saida.caixa, saida.rodape);

  let alvo = 'browser';
  const trocarAlvo = (novo) => {
    alvo = novo;
    btNavegador.classList.toggle('ativo', novo === 'browser');
    btNode.classList.toggle('ativo', novo === 'node');
  };
  btNavegador.addEventListener('click', () => trocarAlvo('browser'));
  btNode.addEventListener('click', () => trocarAlvo('node'));

  for (const ex of EXEMPLOS_PLAYGROUND) {
    const bt = document.createElement('button');
    bt.textContent = ex.nome;
    bt.addEventListener('click', () => {
      editor.valor = ex.codigo;
      trocarAlvo(ex.alvo);
    });
    exemplos.append(bt);
  }

  async function executar() {
    btRodar.disabled = true;
    btRodar.textContent = 'rodando…';
    saida.limpar();
    const resultado =
      alvo === 'node'
        ? await rodarNoNode(editor.valor, saida.escrever)
        : await rodarNoNavegador(editor.valor, saida.escrever);
    saida.finalizar(resultado, alvo === 'node' ? 'processo Node' : 'navegador');
    btRodar.disabled = false;
    btRodar.textContent = '▶ Rodar (Ctrl+Enter)';
  }

  btRodar.addEventListener('click', executar);
  caixa.addEventListener('rodar', executar);

  const aviso = document.createElement('div');
  aviso.className = 'nota nota-dica';
  aviso.innerHTML = `<span class="nota-icone">💡</span><div class="nota-conteudo prosa">
    <p><strong>navegador</strong> roda aqui mesmo, na aba — tem <code>fetch</code> e <code>document</code>, mas não tem <code>fs</code>.
    <strong>Node</strong> manda o código para um processo de verdade na sua máquina — tem <code>import</code>, <code>fs</code> e <code>process</code>, com limite de 5 segundos.</p></div>`;

  frag.append(topo, exemplos, caixa, aviso);
  return frag;
}

function telaColinha() {
  const frag = document.createDocumentFragment();

  const cabecalho = document.createElement('header');
  cabecalho.className = 'licao-cabecalho';
  cabecalho.innerHTML = `
    <div class="licao-trilha">Consulta rápida</div>
    <h1>Colinha</h1>
    <p class="licao-resumo">Todas as tabelas de tradução da trilha, num lugar só. Busque pelo que você faria em Python.</p>`;

  const busca = document.createElement('input');
  busca.className = 'busca-colinha';
  busca.placeholder = 'buscar…  (ex: dicionário, async, npm, lista)';

  const area = document.createElement('div');

  // Reúne todas as tabelas espalhadas pela trilha.
  const tabelas = [];
  for (const modulo of trilha) {
    for (const licao of modulo.licoes) {
      for (const bloco of licao.blocos) {
        if (bloco.t === 'tabela') {
          tabelas.push({ titulo: `${modulo.titulo} · ${licao.titulo}`, bloco });
        }
      }
    }
  }

  function desenhar(filtro = '') {
    const termo = filtro.trim().toLowerCase();
    area.innerHTML = '';
    let achou = 0;

    for (const { titulo, bloco } of tabelas) {
      const linhas = termo
        ? bloco.linhas.filter((l) => l.join(' ').toLowerCase().includes(termo))
        : bloco.linhas;
      if (!linhas.length) continue;
      achou += linhas.length;

      const h = document.createElement('h3');
      h.textContent = titulo;
      h.style.cssText = 'margin:28px 0 10px;font-size:13px;text-transform:uppercase;letter-spacing:.07em;color:var(--texto-3)';
      area.append(h, blocoTabela({ ...bloco, linhas }));
    }

    if (!achou) {
      area.innerHTML = '<p style="color:var(--texto-3);padding:30px 0">Nada encontrado.</p>';
    }
  }

  busca.addEventListener('input', () => desenhar(busca.value));
  desenhar();

  frag.append(cabecalho, busca, area);
  return frag;
}

function telaNaoEncontrada() {
  const div = document.createElement('div');
  div.className = 'carregando';
  div.innerHTML = '<p>Página não encontrada.</p><p><a href="#/licao/orientacao/mapa">Voltar ao início</a></p>';
  return div;
}

// ==========================================================================
//  Índice lateral e progresso
// ==========================================================================

function desenharIndice() {
  const rotaAtual = location.hash;
  indice.innerHTML = '';

  for (const modulo of trilha) {
    const secao = document.createElement('div');
    secao.className = 'indice-modulo';
    secao.style.setProperty('--cor-modulo', modulo.cor);

    const h = document.createElement('h3');
    h.textContent = modulo.titulo;
    secao.append(h);

    for (const licao of modulo.licoes) {
      const chave = `${modulo.id}/${licao.id}`;
      const a = document.createElement('a');
      a.href = `#/licao/${chave}`;
      a.innerHTML = `<span class="marca-check">✓</span><span>${licao.titulo}</span>`;
      if (progresso.estaFeita(chave)) a.classList.add('feita');
      if (rotaAtual === a.getAttribute('href')) a.classList.add('ativa');
      secao.append(a);
    }

    indice.append(secao);
  }
}

function atualizarProgresso() {
  const total = todasLicoes.length;
  const feitas = todasLicoes.filter((l) => progresso.estaFeita(l.chave)).length;
  const pct = total ? Math.round((feitas / total) * 100) : 0;

  document.getElementById('progresso-pct').textContent = `${pct}%`;
  document.getElementById('progresso-detalhe').textContent = `${feitas} de ${total} lições`;

  const circunferencia = 2 * Math.PI * 19;
  document.getElementById('anel-frente').style.strokeDashoffset = String(
    circunferencia * (1 - pct / 100),
  );
}

// ==========================================================================
//  Roteador
// ==========================================================================

function rotear() {
  const rota = location.hash.replace(/^#/, '') || '/licao/orientacao/mapa';
  const partes = rota.split('/').filter(Boolean);

  principal.innerHTML = '';

  let tela;
  let aba = 'licao';

  if (partes[0] === 'playground') {
    tela = telaPlayground();
    aba = 'playground';
  } else if (partes[0] === 'explorador') {
    tela = criarExplorador();
    aba = 'explorador';
  } else if (partes[0] === 'colinha') {
    tela = telaColinha();
    aba = 'colinha';
  } else if (partes[0] === 'licao') {
    tela = telaLicao(partes[1], partes[2]);
  } else {
    tela = telaNaoEncontrada();
  }

  principal.append(tela);
  // Lições ficam estreitas de propósito (linha longa cansa a leitura); as
  // ferramentas aproveitam a tela toda.
  principal.classList.toggle('largo', aba === 'explorador' || aba === 'playground');
  window.scrollTo(0, 0);

  for (const link of document.querySelectorAll('#abas a')) {
    link.classList.toggle('ativa', link.dataset.aba === aba);
  }

  desenharIndice();
  document.body.classList.remove('menu-aberto');
  document.getElementById('lateral').classList.remove('aberta');
}

// ==========================================================================
//  Inicialização
// ==========================================================================

function ligarTema() {
  const guardado = localStorage.getItem('laboratorio-js:tema');
  if (guardado) document.documentElement.dataset.tema = guardado;

  document.getElementById('tema-botao').addEventListener('click', () => {
    const novo = document.documentElement.dataset.tema === 'claro' ? 'escuro' : 'claro';
    document.documentElement.dataset.tema = novo;
    localStorage.setItem('laboratorio-js:tema', novo);
  });
}

function ligarMenu() {
  const lateral = document.getElementById('lateral');
  document.getElementById('menu-botao').addEventListener('click', () => {
    lateral.classList.toggle('aberta');
    document.body.classList.toggle('menu-aberto');
  });
  document.getElementById('fundo-escuro').addEventListener('click', () => {
    lateral.classList.remove('aberta');
    document.body.classList.remove('menu-aberto');
  });
}

async function iniciar() {
  ligarTema();
  ligarMenu();

  principal.innerHTML = '<div class="carregando">carregando a trilha…</div>';

  try {
    const resposta = await fetch('/api/conteudo');
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    trilha = await resposta.json();
  } catch (erro) {
    principal.innerHTML = `<div class="carregando">
      <p>Não consegui carregar o conteúdo: ${erro.message}</p>
      <p>O servidor está rodando? Use <code>npm start</code>.</p></div>`;
    return;
  }

  todasLicoes = trilha.flatMap((m) =>
    m.licoes.map((l) => ({ chave: `${m.id}/${l.id}`, titulo: l.titulo })),
  );

  document.getElementById('limpar-progresso').addEventListener('click', () => {
    if (!confirm('Zerar todo o progresso?')) return;
    progresso.zerar();
    desenharIndice();
    atualizarProgresso();
    rotear();
  });

  window.addEventListener('hashchange', () => {
    rotear();
    atualizarProgresso();
  });

  rotear();
  atualizarProgresso();
}

iniciar();
