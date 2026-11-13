/**
 * Base dos componentes interativos de visão computacional.
 *
 * Três coisas moram aqui:
 *   1. o gerador de armadilha sintética (o irmão em JavaScript do `lab.amostra`
 *      do Python) — imagem feita por código, com gabarito exato;
 *   2. pequenos construtores de interface (painel, slider, chips);
 *   3. utilitários de canvas.
 *
 * Tudo roda no navegador, em canvas puro, sem biblioteca. Uma imagem solta no
 * componente nunca sai da sua máquina: ela é lida direto para um <canvas>.
 */

// --------------------------------------------------------------------------
//  Aleatoriedade com semente
// --------------------------------------------------------------------------

/**
 * Gerador pseudoaleatório com semente (mulberry32). `Math.random()` não aceita
 * semente; com este, a mesma semente desenha sempre a mesma armadilha — o que
 * permite comparar "antes e depois" de mexer num parâmetro.
 */
export function rng(semente) {
  let a = semente >>> 0;
  const proximo = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  proximo.entre = (min, max) => min + (max - min) * proximo();
  proximo.inteiro = (min, max) => Math.floor(proximo.entre(min, max));
  // aproximação da normal pela soma de uniformes (teorema central do limite)
  proximo.normal = (media = 0, desvio = 1) => {
    let s = 0;
    for (let i = 0; i < 6; i++) s += proximo();
    return media + (s - 3) * desvio * 1.41;
  };
  return proximo;
}

// --------------------------------------------------------------------------
//  Canvas
// --------------------------------------------------------------------------

export function criarCanvas(largura, altura) {
  const c = document.createElement('canvas');
  c.width = largura;
  c.height = altura;
  return c;
}

/** Os pixels de um canvas: { data (RGBA, Uint8ClampedArray), width, height }. */
export function pixelsDe(canvas) {
  return canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height);
}

/** Desenha um array de tons de cinza (0–255) num canvas. */
export function desenharCinza(canvas, cinza, largura, altura) {
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(largura, altura);
  for (let i = 0, j = 0; i < cinza.length; i++, j += 4) {
    const v = cinza[i];
    img.data[j] = img.data[j + 1] = img.data[j + 2] = v;
    img.data[j + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

/** Lê as cores do tema atual, para desenhar em canvas combinando com a página. */
export function tema() {
  const estilo = getComputedStyle(document.documentElement);
  const v = (nome) => estilo.getPropertyValue(nome).trim();
  return {
    fundo: v('--fundo'),
    fundo2: v('--fundo-2'),
    fundo3: v('--fundo-3'),
    borda: v('--borda'),
    bordaForte: v('--borda-forte'),
    texto: v('--texto'),
    texto2: v('--texto-2'),
    texto3: v('--texto-3'),
    destaque: v('--destaque'),
    verde: v('--verde'),
    amarelo: v('--amarelo'),
    vermelho: v('--vermelho'),
    roxo: v('--roxo'),
    rosa: v('--rosa'),
  };
}

// --------------------------------------------------------------------------
//  Armadilha sintética
// --------------------------------------------------------------------------

const ESPECIES = {
  mariposa: { comp: [30, 42], prop: [0.34, 0.42], cor: [112, 78, 52], peso: 0.18 },
  cigarrinha: { comp: [15, 22], prop: [0.36, 0.46], cor: [58, 52, 38], peso: 0.37 },
  mosca: { comp: [7, 11], prop: [0.5, 0.65], cor: [26, 24, 24], peso: 0.45 },
};

export const COR_CLASSE = {
  mariposa: '#e74c3c',
  cigarrinha: '#3498db',
  mosca: '#2ecc71',
  detrito: '#a0a0a0',
};

function caixaDaElipse(x, y, a, b, angulo, folga) {
  const meiaL = Math.hypot(a * Math.cos(angulo), b * Math.sin(angulo)) + folga;
  const meiaA = Math.hypot(a * Math.sin(angulo), b * Math.cos(angulo)) + folga;
  return { x: x - meiaL, y: y - meiaA, w: 2 * meiaL, h: 2 * meiaA };
}

function desenharInseto(ctx, r, especie, x, y, escala) {
  const e = ESPECIES[especie];
  const comp = r.entre(...e.comp) * escala;
  const a = comp / 2;
  const b = (comp * r.entre(...e.prop)) / 2;
  const ang = r.entre(0, Math.PI);
  const cor = e.cor.map((c) => Math.max(0, Math.min(255, Math.round(c + r.normal(0, 7)))));
  let folga = 1;

  if (especie === 'mariposa') {
    ctx.fillStyle = `rgb(${cor.map((c) => Math.min(255, c + 46)).join(',')})`;
    for (const lado of [-1, 1]) {
      const t = ang + (Math.PI / 2) * lado;
      ctx.beginPath();
      ctx.ellipse(x + 0.42 * a * Math.cos(t), y + 0.42 * a * Math.sin(t), a * 0.8, a * 0.46, ang + 0.42 * lado, 0, 2 * Math.PI);
      ctx.fill();
    }
    folga = a * 0.5;
  } else if (especie === 'mosca') {
    ctx.fillStyle = 'rgba(228,225,215,0.45)';
    for (const lado of [-1, 1]) {
      const t = ang + (Math.PI / 3) * lado;
      ctx.beginPath();
      ctx.ellipse(x + 0.7 * a * Math.cos(t), y + 0.7 * a * Math.sin(t), Math.max(2, a * 0.9), Math.max(1, b * 0.7), t, 0, 2 * Math.PI);
      ctx.fill();
    }
    folga = a * 0.55;
  }

  ctx.fillStyle = `rgb(${cor.join(',')})`;
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(1, a), Math.max(1, b), ang, 0, 2 * Math.PI);
  ctx.fill();

  return { classe: especie, ...caixaDaElipse(x, y, a, b, ang, folga) };
}

function desenharDetrito(ctx, r, x, y) {
  const tipo = r.inteiro(0, 3);
  if (tipo === 0) {
    const raio = r.entre(3, 8);
    ctx.fillStyle = 'rgb(104,84,58)';
    ctx.beginPath();
    for (let k = 0; k < 7; k++) {
      const t = (2 * Math.PI * k) / 7;
      const d = raio * r.entre(0.55, 1.25);
      ctx.lineTo(x + d * Math.cos(t), y + d * Math.sin(t));
    }
    ctx.fill();
    return { classe: 'detrito', x: x - raio, y: y - raio, w: 2 * raio, h: 2 * raio };
  }
  if (tipo === 1) {
    const comp = r.entre(14, 34);
    const ang = r.entre(0, Math.PI);
    const dx = (comp / 2) * Math.cos(ang);
    const dy = (comp / 2) * Math.sin(ang);
    ctx.strokeStyle = 'rgb(150,120,70)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - dx, y - dy);
    ctx.lineTo(x + dx, y + dy);
    ctx.stroke();
    return { classe: 'detrito', x: x - Math.abs(dx) - 1, y: y - Math.abs(dy) - 1, w: 2 * Math.abs(dx) + 2, h: 2 * Math.abs(dy) + 2 };
  }
  const a = r.entre(5, 10);
  const b = r.entre(3, 6);
  ctx.fillStyle = 'rgb(178,150,30)';
  ctx.beginPath();
  ctx.ellipse(x, y, a, b, r.entre(0, Math.PI), 0, 2 * Math.PI);
  ctx.fill();
  return { classe: 'detrito', x: x - a, y: y - a, w: 2 * a, h: 2 * a };
}

/**
 * Desenha uma armadilha adesiva sintética.
 * Devolve { canvas, gabarito, detritos } — as caixas são {classe, x, y, w, h}.
 */
export function gerarArmadilha({
  largura = 480,
  altura = 360,
  semente = 1,
  insetos = 22,
  detritos = 6,
  aglomerado = 0.3,
  escala = 1,
  ruido = 4,
  iluminacao = 0.3,
} = {}) {
  const r = rng(semente);
  const canvas = criarCanvas(largura, altura);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  // fundo amarelo com um foco de luz fora do centro
  ctx.fillStyle = 'rgb(188,163,30)';
  ctx.fillRect(0, 0, largura, altura);
  const cx = r.entre(0.3, 0.7) * largura;
  const cy = r.entre(0.3, 0.7) * altura;
  const foco = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(largura, altura) * 0.85);
  foco.addColorStop(0, `rgba(255,236,70,${0.55 + iluminacao})`);
  foco.addColorStop(1, 'rgba(255,236,70,0)');
  ctx.fillStyle = foco;
  ctx.fillRect(0, 0, largura, altura);

  // grade impressa do cartão
  const passo = Math.max(40, Math.round(largura / 12));
  ctx.strokeStyle = 'rgba(90,70,0,0.22)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let x = passo; x < largura; x += passo) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, altura);
  }
  for (let y = passo; y < altura; y += passo) {
    ctx.moveTo(0, y);
    ctx.lineTo(largura, y);
  }
  ctx.stroke();

  const margem = 24;
  const lixo = [];
  for (let i = 0; i < detritos; i++) {
    lixo.push(desenharDetrito(ctx, r, r.entre(margem, largura - margem), r.entre(margem, altura - margem)));
  }

  const nomes = Object.keys(ESPECIES);
  const sortearEspecie = () => {
    let u = r();
    for (const n of nomes) {
      u -= ESPECIES[n].peso;
      if (u <= 0) return n;
    }
    return nomes.at(-1);
  };

  const centros = [];
  for (let i = 0; i < Math.max(1, Math.floor(insetos / 12)); i++) {
    centros.push([r.entre(70, largura - 70), r.entre(70, altura - 70)]);
  }

  const gabarito = [];
  for (let i = 0; i < insetos; i++) {
    let x;
    let y;
    if (r() < aglomerado) {
      const [gx, gy] = centros[r.inteiro(0, centros.length)];
      x = gx + r.normal(0, 20 * escala);
      y = gy + r.normal(0, 20 * escala);
    } else {
      x = r.entre(margem, largura - margem);
      y = r.entre(margem, altura - margem);
    }
    x = Math.max(margem, Math.min(largura - margem, x));
    y = Math.max(margem, Math.min(altura - margem, y));
    gabarito.push(desenharInseto(ctx, r, sortearEspecie(), x, y, escala));
  }

  // granulado de sensor
  if (ruido > 0) {
    const img = ctx.getImageData(0, 0, largura, altura);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = r.normal(0, ruido);
      d[i] += n;
      d[i + 1] += n;
      d[i + 2] += n;
    }
    ctx.putImageData(img, 0, 0);
  }

  return { canvas, gabarito, detritos: lixo };
}

/** Desenha caixas sobre um contexto 2D. */
export function desenharCaixas(ctx, caixas, { cor, espessura = 1.5, tracejado = false } = {}) {
  ctx.save();
  ctx.lineWidth = espessura;
  if (tracejado) ctx.setLineDash([5, 4]);
  for (const c of caixas) {
    ctx.strokeStyle = cor ?? COR_CLASSE[c.classe] ?? '#e74c3c';
    ctx.strokeRect(c.x, c.y, c.w, c.h);
  }
  ctx.restore();
}

// --------------------------------------------------------------------------
//  Interface
// --------------------------------------------------------------------------

function el(tag, classe, texto) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto !== undefined) e.textContent = texto;
  return e;
}
export { el };

/**
 * A moldura padrão de um componente: título, área principal e controles.
 * Devolve as partes para o componente preencher.
 */
export function painel(titulo, descricao) {
  const raiz = el('section', 'vis');
  const topo = el('header', 'vis-topo');
  topo.append(el('strong', '', titulo));
  if (descricao) topo.append(el('span', '', descricao));
  const corpo = el('div', 'vis-corpo');
  const controles = el('div', 'vis-controles');
  const leitura = el('div', 'vis-leitura');
  raiz.append(topo, corpo, controles, leitura);
  return { raiz, topo, corpo, controles, leitura };
}

/** Controle deslizante com rótulo e valor à vista. */
export function slider({ rotulo, min, max, passo = 1, valor, formato = (v) => String(v), aoMudar }) {
  const caixa = el('label', 'vis-slider');
  const nome = el('span', 'vis-slider-nome', rotulo);
  const entrada = el('input');
  entrada.type = 'range';
  entrada.min = min;
  entrada.max = max;
  entrada.step = passo;
  entrada.value = valor;
  const mostrador = el('output', 'vis-slider-valor', formato(Number(valor)));
  entrada.addEventListener('input', () => {
    mostrador.textContent = formato(Number(entrada.value));
    aoMudar?.(Number(entrada.value));
  });
  caixa.append(nome, entrada, mostrador);
  return {
    elemento: caixa,
    get valor() {
      return Number(entrada.value);
    },
    set valor(v) {
      entrada.value = v;
      mostrador.textContent = formato(Number(v));
    },
  };
}

/** Grupo de opções mutuamente exclusivas ("chips"). */
export function chips(opcoes, inicial, aoMudar) {
  const caixa = el('div', 'vis-chips');
  let atual = inicial;
  const botoes = new Map();
  for (const [valor, rotulo] of opcoes) {
    const b = el('button', 'vis-chip' + (valor === inicial ? ' ativo' : ''), rotulo);
    b.type = 'button';
    b.addEventListener('click', () => {
      atual = valor;
      for (const [v, bt] of botoes) bt.classList.toggle('ativo', v === valor);
      aoMudar?.(valor);
    });
    botoes.set(valor, b);
    caixa.append(b);
  }
  return {
    elemento: caixa,
    get valor() {
      return atual;
    },
    selecionar(valor) {
      botoes.get(valor)?.click();
    },
  };
}

export function botao(texto, aoClicar, classe = 'botao') {
  const b = el('button', classe, texto);
  b.type = 'button';
  b.addEventListener('click', aoClicar);
  return b;
}

/** Um <canvas> com legenda embaixo. */
export function quadro(legenda, largura = 480, altura = 360) {
  const figura = el('figure', 'vis-quadro');
  const canvas = criarCanvas(largura, altura);
  const titulo = el('figcaption', '', legenda);
  figura.append(canvas, titulo);
  return { figura, canvas, titulo, ctx: canvas.getContext('2d', { willReadFrequently: true }) };
}

/**
 * Fonte de imagem para um componente: amostras sintéticas com semente, ou uma
 * imagem sua (botão ou arrastar-e-soltar). Chama `aoTrocar({canvas, gabarito,
 * detritos})` sempre que a imagem muda. Imagem sua não tem gabarito.
 */
export function fonteDeImagem({ largura = 480, altura = 360, opcoes = {}, aoTrocar, alvoDeSoltar }) {
  let semente = opcoes.semente ?? 1;
  const caixa = el('div', 'vis-fonte');

  const gerar = () => aoTrocar(gerarArmadilha({ largura, altura, ...opcoes, semente }));

  const btNova = botao('↻ outra armadilha', () => {
    semente++;
    gerar();
  });

  const arquivo = el('input');
  arquivo.type = 'file';
  arquivo.accept = 'image/*';
  arquivo.hidden = true;

  const carregar = (file) => {
    if (!file?.type.startsWith('image/')) return;
    const img = new Image();
    img.onload = () => {
      // encaixa a imagem no tamanho de trabalho, preservando a proporção
      const fator = Math.min(largura / img.width, altura / img.height);
      const w = Math.max(1, Math.round(img.width * fator));
      const h = Math.max(1, Math.round(img.height * fator));
      const canvas = criarCanvas(w, h);
      canvas.getContext('2d', { willReadFrequently: true }).drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(img.src);
      aoTrocar({ canvas, gabarito: null, detritos: null });
    };
    img.src = URL.createObjectURL(file);
  };

  arquivo.addEventListener('change', () => carregar(arquivo.files[0]));
  const btSua = botao('📁 usar imagem sua', () => arquivo.click());
  btSua.title = 'A imagem não sai do seu navegador. Também dá para arrastar e soltar.';

  if (alvoDeSoltar) {
    alvoDeSoltar.addEventListener('dragover', (e) => {
      e.preventDefault();
      alvoDeSoltar.classList.add('soltando');
    });
    alvoDeSoltar.addEventListener('dragleave', () => alvoDeSoltar.classList.remove('soltando'));
    alvoDeSoltar.addEventListener('drop', (e) => {
      e.preventDefault();
      alvoDeSoltar.classList.remove('soltando');
      carregar(e.dataTransfer.files[0]);
    });
  }

  caixa.append(btNova, btSua, arquivo);
  return { elemento: caixa, gerar };
}

/**
 * Redesenha o componente quando o tema claro/escuro muda (canvas não herda
 * CSS: a cor foi "pintada", então precisa pintar de novo).
 */
export function aoMudarTema(raiz, redesenhar) {
  const ouvir = () => {
    if (!raiz.isConnected) return window.removeEventListener('tema-mudou', ouvir);
    redesenhar();
  };
  window.addEventListener('tema-mudou', ouvir);
}
