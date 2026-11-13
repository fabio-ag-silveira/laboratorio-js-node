/**
 * Aplicação principal — roteamento e telas.
 *
 * É uma SPA (single page application) minúscula, sem framework: o "roteador"
 * é o evento hashchange, e a tela é redesenhada do zero a cada navegação.
 * React/Vue/Svelte resolvem isso com muito mais cuidado — mas para umas poucas
 * telas, isto aqui basta e cabe na cabeça.
 *
 * Rotas:
 *   #/                              página inicial, com as trilhas
 *   #/t/:trilha                     primeira lição pendente da trilha
 *   #/t/:trilha/:modulo/:licao      uma lição
 *   #/playground  #/explorador  #/colinha  #/revisao
 */

import { criarEditor } from './editor.js';
import { criarSaida, rodar, ALVOS } from './execucao.js';
import { criarExplorador } from './explorador.js';
import { renderizarBloco, blocoTabela, blocoQuiz } from './blocos.js';
import * as conteudo from './conteudo.js';
import * as progresso from './progresso.js';

const principal = document.getElementById('principal');
const indice = document.getElementById('indice');

/** A trilha aberta no momento (versão do catálogo), ou null fora de trilha. */
let trilhaAtual = null;
let ambiente = null;

const escapar = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ==========================================================================
//  Página inicial
// ==========================================================================

function cartaoTrilha(trilha) {
  const licoes = conteudo.licoesDe(trilha);
  const feitas = progresso.contar(licoes.map((l) => l.chave));
  const pronta = licoes.length > 0;
  const minutos = licoes.reduce((s, l) => s + (l.minutos ?? 0), 0);
  const pct = pronta ? Math.round((feitas / licoes.length) * 100) : 0;

  const cartao = document.createElement(pronta ? 'a' : 'div');
  cartao.className = 'trilha-cartao' + (pronta ? '' : ' em-breve');
  cartao.style.setProperty('--cor-trilha', trilha.cor);
  if (pronta) cartao.href = `#/t/${trilha.id}`;

  const horas = minutos >= 60 ? `~${Math.round(minutos / 60)} h` : `~${minutos} min`;

  cartao.innerHTML = `
    <div class="trilha-topo">
      <span class="trilha-icone">${trilha.icone ?? '•'}</span>
      ${pronta ? '' : '<span class="trilha-selo">em construção</span>'}
      ${pronta && feitas === licoes.length ? '<span class="trilha-selo feito">concluída</span>' : ''}
    </div>
    <h3>${escapar(trilha.titulo)}</h3>
    <p>${escapar(trilha.subtitulo ?? '')}</p>
    ${trilha.ponte ? `<span class="trilha-ponte">${escapar(trilha.ponte)}</span>` : ''}
    ${
      pronta
        ? `<div class="trilha-barra"><i style="width:${pct}%"></i></div>
           <div class="trilha-rodape"><span>${feitas} de ${licoes.length} lições</span><span>${horas}</span></div>`
        : `<ul class="trilha-previsto">${(trilha.previsto ?? []).map((p) => `<li>${escapar(p)}</li>`).join('')}</ul>`
    }`;
  return cartao;
}

function cartaoAmbiente() {
  const caixa = document.createElement('section');
  caixa.className = 'ambiente';
  caixa.innerHTML = '<h2>Seu ambiente</h2><p class="ambiente-nota">verificando o que está instalado…</p>';

  carregarAmbiente().then((amb) => {
    if (!amb) {
      caixa.querySelector('.ambiente-nota').textContent = 'não consegui consultar o ambiente.';
      return;
    }
    const linha = (nome, info, extra = '') => `
      <div class="ambiente-linha ${info.ok ? 'ok' : 'falta'}">
        <span class="ambiente-marca">${info.ok ? '✓' : '✕'}</span>
        <strong>${nome}</strong>
        <span>${info.ok ? escapar(info.versao ?? '') : 'não encontrado'} ${extra}</span>
        ${info.ok || !info.instalar ? '' : `<code>${escapar(info.instalar)}</code>`}
      </div>`;

    const pacotes = amb.python.pacotes ?? {};
    const tem = Object.entries(pacotes).filter(([, v]) => v);
    const falta = Object.entries(pacotes).filter(([, v]) => !v);
    const resumoPacotes = amb.python.ok
      ? `<span class="ambiente-pacotes">${tem.map(([n, v]) => `${n} ${String(v).split('+')[0]}`).join(' · ')}${
          falta.length ? ` · <em>faltam: ${falta.map(([n]) => n).join(', ')}</em>` : ''
        }</span>`
      : '';

    caixa.innerHTML =
      '<h2>Seu ambiente</h2>' +
      linha('Node', amb.node) +
      linha('Python', amb.python) +
      resumoPacotes +
      linha('.NET SDK', amb.dotnet, amb.dotnet.ok ? '' : '— necessário para a trilha de C#');
  });

  return caixa;
}

function telaInicio() {
  const frag = document.createDocumentFragment();
  const catalogo = conteudo.obterCatalogo();

  const cabecalho = document.createElement('header');
  cabecalho.className = 'inicio-cabecalho';
  const todas = catalogo.flatMap((t) => conteudo.licoesDe(t));
  const feitas = progresso.contar(todas.map((l) => l.chave));
  cabecalho.innerHTML = `
    <h1>Laboratório Dev</h1>
    <p>Trilhas de estudo em que todo código da tela executa de verdade. ${todas.length} lições,
    ${feitas} concluída${feitas === 1 ? '' : 's'}.</p>`;
  frag.append(cabecalho);

  const ultima = progresso.ultima();
  if (ultima) {
    const continuar = document.createElement('a');
    continuar.className = 'continuar';
    continuar.href = ultima.rota;
    continuar.innerHTML = `
      <span>Continuar de onde parou</span>
      <strong>${escapar(ultima.titulo)}</strong>
      <em>${escapar(ultima.trilha)} →</em>`;
    frag.append(continuar);
  }

  const grade = document.createElement('div');
  grade.className = 'trilhas-grade';
  for (const trilha of catalogo) grade.append(cartaoTrilha(trilha));
  frag.append(grade, cartaoAmbiente());

  return frag;
}

// ==========================================================================
//  Lição
// ==========================================================================

async function telaLicao(idTrilha, idModulo, idLicao) {
  const trilha = await conteudo.carregarTrilha(idTrilha);
  const modulo = trilha.modulos.find((m) => m.id === idModulo);
  const licao = modulo?.licoes.find((l) => l.id === idLicao);
  if (!licao) return telaNaoEncontrada();

  const frag = document.createDocumentFragment();
  const chave = conteudo.chaveDe(idTrilha, idModulo, idLicao);
  const cor = modulo.cor ?? trilha.cor;

  const cabecalho = document.createElement('header');
  cabecalho.className = 'licao-cabecalho';
  cabecalho.style.setProperty('--cor-modulo', cor);
  cabecalho.innerHTML = `
    <div class="licao-trilha">${escapar(trilha.titulo)} · ${escapar(modulo.titulo)}</div>
    <h1>${escapar(licao.titulo)}</h1>
    <p class="licao-resumo">${escapar(licao.resumo ?? '')}</p>
    <div class="licao-meta"><span>⏱ ~${licao.minutos} min</span></div>`;
  frag.append(cabecalho);

  for (const bloco of licao.blocos) frag.append(renderizarBloco(bloco));

  // ---- botão de concluir ----------------------------------------------
  const btConcluir = document.createElement('button');
  btConcluir.className = 'botao-concluir';
  const pintar = () => {
    const feita = progresso.estaFeita(chave);
    btConcluir.textContent = feita ? '✓ Lição concluída — desmarcar' : 'Marcar lição como concluída';
    btConcluir.classList.toggle('feita', feita);
  };
  pintar();
  btConcluir.addEventListener('click', () => {
    progresso.alternar(chave);
    pintar();
    desenharLateral();
  });
  frag.append(btConcluir);

  // ---- navegação anterior / próxima -----------------------------------
  const licoes = conteudo.licoesDe(trilha);
  const i = licoes.findIndex((l) => l.chave === chave);
  const nav = document.createElement('nav');
  nav.className = 'nav-licoes';
  const vizinha = (l, classe, rotulo) =>
    `<a class="nav-licao ${classe}" href="${l.rota}"><span>${rotulo}</span><strong>${escapar(l.titulo)}</strong></a>`;
  if (licoes[i - 1]) nav.innerHTML += vizinha(licoes[i - 1], '', '← anterior');
  if (licoes[i + 1]) nav.innerHTML += vizinha(licoes[i + 1], 'direita', 'próxima →');
  frag.append(nav);

  progresso.lembrarUltima(`#/t/${idTrilha}/${idModulo}/${idLicao}`, licao.titulo, trilha.titulo);
  return frag;
}

/** `#/t/:trilha` sem lição: vai para a primeira pendente (ou a primeira). */
function rotaInicialDaTrilha(trilha) {
  const licoes = conteudo.licoesDe(trilha);
  const pendente = licoes.find((l) => !progresso.estaFeita(l.chave));
  return (pendente ?? licoes[0])?.rota ?? '#/';
}

// ==========================================================================
//  Playground
// ==========================================================================

const EXEMPLOS_PLAYGROUND = [
  {
    nome: 'Olá (JS)',
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
}`,
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
    nome: 'Imagem (Python)',
    alvo: 'python',
    codigo: `import cv2
import lab

# imagem sintética de armadilha, com gabarito exato
img, gabarito, detritos = lab.amostra_com_gabarito("armadilha", semente=1)
print("formato:", img.shape, "| insetos:", len(gabarito))

cinza = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
bordas = cv2.Canny(cinza, 60, 140)

lab.mostrar(img, lab.desenhar_caixas(img, gabarito), bordas,
            titulos=["original", "gabarito", "bordas (Canny)"])`,
  },
  {
    nome: 'GPU (Python)',
    alvo: 'python',
    codigo: `import torch

print("PyTorch:", torch.__version__)
print("CUDA disponível:", torch.cuda.is_available())
if torch.cuda.is_available():
    print("GPU:", torch.cuda.get_device_name(0))
    x = torch.randn(4000, 4000, device="cuda")
    y = x @ x
    print("produto 4000x4000 na GPU, soma =", float(y.sum()))`,
  },
];

function telaPlayground() {
  const frag = document.createDocumentFragment();

  const topo = document.createElement('div');
  topo.className = 'playground-topo';
  topo.innerHTML = '<h1>Playground</h1>';

  const seletor = document.createElement('div');
  seletor.className = 'seletor-alvo';
  const botoesAlvo = {};
  for (const alvo of ['browser', 'node', 'python', 'csharp']) {
    const bt = document.createElement('button');
    bt.textContent = ALVOS[alvo].rotulo;
    bt.addEventListener('click', () => trocarAlvo(alvo));
    botoesAlvo[alvo] = bt;
    seletor.append(bt);
  }

  const btRodar = document.createElement('button');
  btRodar.className = 'botao botao-principal';
  btRodar.textContent = '▶ Rodar (Ctrl+Enter)';
  topo.append(seletor, btRodar);

  const exemplos = document.createElement('div');
  exemplos.className = 'exemplos';

  const caixa = document.createElement('div');
  caixa.className = 'bloco-codigo';
  const area = document.createElement('div');
  const saida = criarSaida();
  caixa.append(area, saida.caixa, saida.rodape);

  let alvo = 'browser';
  let editor = null;

  // O editor é recriado ao trocar de linguagem, porque o realce muda.
  function montarEditor(codigo) {
    editor = criarEditor(codigo, { lang: ALVOS[alvo].lang, minLinhas: 16 });
    area.replaceChildren(editor.elemento);
  }

  function trocarAlvo(novo, codigo) {
    alvo = novo;
    for (const [nome, bt] of Object.entries(botoesAlvo)) bt.classList.toggle('ativo', nome === novo);
    montarEditor(codigo ?? editor?.valor ?? '');
  }

  for (const ex of EXEMPLOS_PLAYGROUND) {
    const bt = document.createElement('button');
    bt.textContent = ex.nome;
    bt.addEventListener('click', () => trocarAlvo(ex.alvo, ex.codigo));
    exemplos.append(bt);
  }

  async function executar() {
    btRodar.disabled = true;
    btRodar.textContent = 'rodando…';
    saida.limpar();
    const resultado = await rodar(alvo, editor.valor, saida, alvo === 'python' ? 120 : undefined);
    saida.finalizar(resultado, ALVOS[alvo].onde);
    btRodar.disabled = false;
    btRodar.textContent = '▶ Rodar (Ctrl+Enter)';
  }

  btRodar.addEventListener('click', executar);
  caixa.addEventListener('rodar', executar);
  trocarAlvo('browser', EXEMPLOS_PLAYGROUND[0].codigo);

  const aviso = document.createElement('div');
  aviso.className = 'nota nota-dica';
  aviso.innerHTML = `<span class="nota-icone">💡</span><div class="nota-conteudo prosa">
    <p><strong>navegador</strong> roda aqui na aba (tem <code>fetch</code> e <code>document</code>, não tem <code>fs</code>).
    <strong>node</strong>, <strong>python</strong> e <strong>c#</strong> rodam em processos de verdade na sua máquina.
    No Python, <code>import lab</code> dá <code>lab.mostrar(img)</code> para a imagem aparecer aqui,
    e <code>lab.imagem("foto.jpg")</code> lê fotos suas da pasta <code>imagens/</code> do projeto.</p></div>`;

  frag.append(topo, exemplos, caixa, aviso);
  return frag;
}

// ==========================================================================
//  Colinha e revisão (precisam do conteúdo de todas as trilhas)
// ==========================================================================

async function telaColinha() {
  const frag = document.createDocumentFragment();
  const trilhas = await conteudo.carregarTodas();

  const cabecalho = document.createElement('header');
  cabecalho.className = 'licao-cabecalho';
  cabecalho.innerHTML = `
    <div class="licao-trilha">Consulta rápida</div>
    <h1>Colinha</h1>
    <p class="licao-resumo">Todas as tabelas de tradução e de referência das trilhas, num lugar só.</p>`;

  const busca = document.createElement('input');
  busca.className = 'busca-colinha';
  busca.placeholder = 'buscar…  (ex: dicionário, async, npm, mAP, limiar)';

  const area = document.createElement('div');

  const tabelas = [];
  for (const trilha of trilhas) {
    for (const modulo of trilha.modulos) {
      for (const licao of modulo.licoes) {
        for (const bloco of licao.blocos) {
          if (bloco.t === 'tabela') {
            tabelas.push({ titulo: `${trilha.titulo} · ${licao.titulo}`, bloco });
          }
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
      h.className = 'colinha-titulo';
      h.textContent = titulo;
      area.append(h, blocoTabela({ ...bloco, linhas }));
    }

    if (!achou) area.innerHTML = '<p class="vazio">Nada encontrado.</p>';
  }

  busca.addEventListener('input', () => desenhar(busca.value));
  desenhar();

  frag.append(cabecalho, busca, area);
  return frag;
}

async function telaRevisao() {
  const frag = document.createDocumentFragment();
  const trilhas = await conteudo.carregarTodas();

  const cabecalho = document.createElement('header');
  cabecalho.className = 'licao-cabecalho';
  cabecalho.innerHTML = `
    <div class="licao-trilha">Fixação</div>
    <h1>Revisão</h1>
    <p class="licao-resumo">Perguntas sorteadas das lições. Lembrar com esforço é o que fixa — reler dá só a sensação de saber.</p>`;
  frag.append(cabecalho);

  // Junta todas as perguntas, anotando de onde vieram.
  const banco = [];
  for (const trilha of trilhas) {
    for (const modulo of trilha.modulos) {
      for (const licao of modulo.licoes) {
        const chave = conteudo.chaveDe(trilha.id, modulo.id, licao.id);
        for (const bloco of licao.blocos) {
          if (bloco.t === 'quiz') {
            banco.push({
              bloco,
              chave,
              trilha: trilha.id,
              origem: `${trilha.titulo} · ${licao.titulo}`,
              rota: `#/t/${trilha.id}/${modulo.id}/${licao.id}`,
            });
          }
        }
      }
    }
  }

  if (!banco.length) {
    const vazio = document.createElement('p');
    vazio.className = 'vazio';
    vazio.textContent = 'Ainda não há perguntas nas trilhas disponíveis.';
    frag.append(vazio);
    return frag;
  }

  const controles = document.createElement('div');
  controles.className = 'revisao-controles';

  const selTrilha = document.createElement('select');
  selTrilha.className = 'botao';
  selTrilha.innerHTML =
    '<option value="">todas as trilhas</option>' +
    trilhas
      .filter((t) => banco.some((q) => q.trilha === t.id))
      .map((t) => `<option value="${t.id}">${escapar(t.titulo)}</option>`)
      .join('');

  const rotulo = document.createElement('label');
  rotulo.className = 'revisao-filtro';
  const soFeitas = document.createElement('input');
  soFeitas.type = 'checkbox';
  soFeitas.checked = banco.some((q) => progresso.estaFeita(q.chave));
  rotulo.append(soFeitas, ' só de lições concluídas');

  const btSortear = document.createElement('button');
  btSortear.className = 'botao botao-principal';
  btSortear.textContent = 'Sortear 8 perguntas';

  const placar = document.createElement('span');
  placar.className = 'revisao-placar';

  controles.append(selTrilha, rotulo, btSortear, placar);

  const area = document.createElement('div');

  function sortear() {
    let candidatas = banco.filter((q) => !selTrilha.value || q.trilha === selTrilha.value);
    if (soFeitas.checked) candidatas = candidatas.filter((q) => progresso.estaFeita(q.chave));

    area.innerHTML = '';
    placar.textContent = '';
    if (!candidatas.length) {
      area.innerHTML = '<p class="vazio">Nenhuma pergunta com esse filtro. Conclua lições ou desmarque o filtro.</p>';
      return;
    }

    // Fisher–Yates: o jeito correto de embaralhar (sort com Math.random vicia).
    const baralho = [...candidatas];
    for (let i = baralho.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [baralho[i], baralho[j]] = [baralho[j], baralho[i]];
    }
    const rodada = baralho.slice(0, 8);

    let certas = 0;
    let respondidas = 0;
    for (const q of rodada) {
      const origem = document.createElement('a');
      origem.className = 'revisao-origem';
      origem.href = q.rota;
      origem.textContent = q.origem;
      area.append(
        origem,
        blocoQuiz(q.bloco, {
          aoResponder(acertou) {
            respondidas++;
            if (acertou) certas++;
            placar.textContent = `${certas} de ${respondidas} certas` + (respondidas === rodada.length ? ' — fim da rodada' : '');
          },
        }),
      );
    }
  }

  btSortear.addEventListener('click', sortear);
  selTrilha.addEventListener('change', sortear);
  soFeitas.addEventListener('change', sortear);
  sortear();

  frag.append(controles, area);
  return frag;
}

function telaNaoEncontrada() {
  const div = document.createElement('div');
  div.className = 'carregando';
  div.innerHTML = '<p>Página não encontrada.</p><p><a href="#/">Voltar ao início</a></p>';
  return div;
}

// ==========================================================================
//  Barra lateral
// ==========================================================================

function pintarAnel(feitas, total) {
  const pct = total ? Math.round((feitas / total) * 100) : 0;
  document.getElementById('progresso-pct').textContent = `${pct}%`;
  document.getElementById('progresso-detalhe').textContent = `${feitas} de ${total} lições`;
  const circunferencia = 2 * Math.PI * 19;
  document.getElementById('anel-frente').style.strokeDashoffset = String(circunferencia * (1 - pct / 100));
}

function desenharLateral() {
  const rotaAtual = location.hash;
  indice.innerHTML = '';

  // Fora de uma trilha: a lateral lista as trilhas.
  if (!trilhaAtual) {
    const catalogo = conteudo.obterCatalogo();
    const todas = catalogo.flatMap((t) => conteudo.licoesDe(t));
    pintarAnel(progresso.contar(todas.map((l) => l.chave)), todas.length);

    const secao = document.createElement('div');
    secao.className = 'indice-modulo';
    secao.innerHTML = '<h3>Trilhas</h3>';
    for (const trilha of catalogo) {
      const licoes = conteudo.licoesDe(trilha);
      const a = document.createElement(licoes.length ? 'a' : 'span');
      a.className = 'indice-trilha' + (licoes.length ? '' : ' em-breve');
      if (licoes.length) a.href = `#/t/${trilha.id}`;
      const feitas = progresso.contar(licoes.map((l) => l.chave));
      a.innerHTML = `<span class="indice-icone">${trilha.icone ?? '•'}</span><span>${escapar(trilha.titulo)}</span>
        <em>${licoes.length ? `${feitas}/${licoes.length}` : 'em breve'}</em>`;
      secao.append(a);
    }
    indice.append(secao);
    return;
  }

  // Dentro de uma trilha: módulos e lições dela.
  const licoes = conteudo.licoesDe(trilhaAtual);
  pintarAnel(progresso.contar(licoes.map((l) => l.chave)), licoes.length);

  const voltar = document.createElement('a');
  voltar.className = 'indice-voltar';
  voltar.href = '#/';
  voltar.textContent = '← todas as trilhas';

  const titulo = document.createElement('div');
  titulo.className = 'indice-trilha-atual';
  titulo.innerHTML = `<span>${trilhaAtual.icone ?? ''}</span> ${escapar(trilhaAtual.titulo)}`;
  indice.append(voltar, titulo);

  for (const modulo of trilhaAtual.modulos) {
    const secao = document.createElement('div');
    secao.className = 'indice-modulo';
    secao.style.setProperty('--cor-modulo', modulo.cor ?? trilhaAtual.cor);

    const h = document.createElement('h3');
    h.textContent = modulo.titulo;
    secao.append(h);

    for (const licao of modulo.licoes) {
      const chave = conteudo.chaveDe(trilhaAtual.id, modulo.id, licao.id);
      const a = document.createElement('a');
      a.href = `#/t/${trilhaAtual.id}/${modulo.id}/${licao.id}`;
      a.innerHTML = `<span class="marca-check">✓</span><span>${escapar(licao.titulo)}</span>`;
      if (progresso.estaFeita(chave)) a.classList.add('feita');
      if (rotaAtual === a.getAttribute('href')) a.classList.add('ativa');
      secao.append(a);
    }
    indice.append(secao);
  }

  indice.querySelector('a.ativa')?.scrollIntoView({ block: 'nearest' });
}

// ==========================================================================
//  Roteador
// ==========================================================================

/** Cada navegação ganha um número; resposta atrasada de rota antiga é descartada. */
let navegacao = 0;

async function rotear() {
  const minha = ++navegacao;
  const rota = location.hash.replace(/^#/, '') || '/';
  const partes = rota.split('/').filter(Boolean);

  // Endereços do tempo em que só existia a trilha de JS.
  if (partes[0] === 'licao' && partes.length === 3) {
    location.replace(`#/t/js-node/${partes[1]}/${partes[2]}`);
    return;
  }

  let aba = 'inicio';
  let montar;
  trilhaAtual = null;

  if (partes.length === 0) {
    montar = () => telaInicio();
  } else if (partes[0] === 't') {
    aba = 'trilha';
    trilhaAtual = conteudo.obterCatalogo().find((t) => t.id === partes[1]) ?? null;
    if (!trilhaAtual) montar = () => telaNaoEncontrada();
    else if (partes.length < 4) {
      location.replace(rotaInicialDaTrilha(trilhaAtual));
      return;
    } else montar = () => telaLicao(partes[1], partes[2], partes[3]);
  } else if (partes[0] === 'playground') {
    aba = 'playground';
    montar = () => telaPlayground();
  } else if (partes[0] === 'explorador') {
    aba = 'explorador';
    montar = () => criarExplorador();
  } else if (partes[0] === 'colinha') {
    aba = 'colinha';
    montar = () => telaColinha();
  } else if (partes[0] === 'revisao') {
    aba = 'revisao';
    montar = () => telaRevisao();
  } else {
    montar = () => telaNaoEncontrada();
  }

  for (const link of document.querySelectorAll('#abas a')) {
    link.classList.toggle('ativa', link.dataset.aba === aba || (aba === 'trilha' && link.dataset.aba === 'inicio'));
  }
  desenharLateral();
  document.body.classList.remove('menu-aberto');
  document.getElementById('lateral').classList.remove('aberta');

  let tela;
  try {
    tela = await montar();
  } catch (erro) {
    console.error(erro);
    tela = document.createElement('div');
    tela.className = 'carregando';
    tela.textContent = `Não consegui abrir esta página: ${erro.message}`;
  }
  if (minha !== navegacao) return; // o usuário já foi para outro lugar

  principal.replaceChildren(tela);
  // Lições ficam estreitas de propósito (linha longa cansa a leitura); as
  // ferramentas e a página inicial aproveitam a tela toda.
  principal.classList.toggle('largo', ['explorador', 'playground', 'inicio'].includes(aba));
  window.scrollTo(0, 0);
}

// ==========================================================================
//  Inicialização
// ==========================================================================

function carregarAmbiente() {
  ambiente ??= fetch('/api/ambiente')
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  return ambiente;
}

function ligarTema() {
  const guardado = localStorage.getItem('laboratorio-js:tema');
  if (guardado) document.documentElement.dataset.tema = guardado;

  document.getElementById('tema-botao').addEventListener('click', () => {
    const novo = document.documentElement.dataset.tema === 'claro' ? 'escuro' : 'claro';
    document.documentElement.dataset.tema = novo;
    localStorage.setItem('laboratorio-js:tema', novo);
    // componentes desenhados em canvas precisam saber que as cores mudaram
    window.dispatchEvent(new CustomEvent('tema-mudou'));
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

  principal.innerHTML = '<div class="carregando">carregando…</div>';

  try {
    await conteudo.carregarCatalogo();
  } catch (erro) {
    principal.innerHTML = `<div class="carregando">
      <p>Não consegui carregar o conteúdo: ${escapar(erro.message)}</p>
      <p>O servidor está rodando? Use <code>npm start</code>.</p></div>`;
    return;
  }

  document.getElementById('limpar-progresso').addEventListener('click', () => {
    if (!confirm('Zerar todo o progresso, de todas as trilhas?')) return;
    progresso.zerar();
    rotear();
  });

  window.addEventListener('hashchange', rotear);
  rotear();
}

iniciar();
