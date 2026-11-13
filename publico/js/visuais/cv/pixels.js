/**
 * Inspetor de pixels: a imagem como matriz de números.
 * Passe o mouse e veja os valores; troque o canal para ver um plano de cada vez.
 */

import { painel, quadro, chips, fonteDeImagem, pixelsDe, el, tema, aoMudarTema } from './base.js';
import { rgbParaHsv } from './processamento.js';

const N = 11; // lado da vizinhança ampliada
const CELULA = 30;

export default function criar() {
  const p = painel('Inspetor de pixels', 'passe o mouse sobre a imagem; clique para fixar o ponto');

  const principal = quadro('imagem');
  principal.canvas.classList.add('mira');
  const zoom = quadro(`vizinhança ${N}×${N}, ampliada`, N * CELULA, N * CELULA);
  zoom.figura.classList.add('estreito');
  zoom.canvas.classList.add('pixelado');
  const info = el('div', 'vis-lateral');
  p.corpo.append(principal.figura, zoom.figura, info);

  let fonte = null; // ImageData original
  let modo = 'cor';
  let ponto = { x: 0, y: 0 };
  let fixo = false;

  const valorDoCanal = (r, g, b) => {
    if (modo === 'r') return r;
    if (modo === 'g') return g;
    if (modo === 'b') return b;
    return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  };

  function pintarPrincipal() {
    const { width: w, height: h, data } = fonte;
    principal.canvas.width = w;
    principal.canvas.height = h;
    const saida = principal.ctx.createImageData(w, h);
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      if (modo === 'cor') {
        saida.data[i] = r;
        saida.data[i + 1] = g;
        saida.data[i + 2] = b;
      } else {
        const v = valorDoCanal(r, g, b);
        // canal isolado aparece tingido da própria cor; cinza aparece neutro
        saida.data[i] = modo === 'g' || modo === 'b' ? 0 : v;
        saida.data[i + 1] = modo === 'r' || modo === 'b' ? 0 : v;
        saida.data[i + 2] = modo === 'r' || modo === 'g' ? 0 : v;
        if (modo === 'cinza') saida.data[i] = saida.data[i + 1] = saida.data[i + 2] = v;
      }
      saida.data[i + 3] = 255;
    }
    principal.ctx.putImageData(saida, 0, 0);

    // moldura da vizinhança
    const t = tema();
    principal.ctx.strokeStyle = '#fff';
    principal.ctx.lineWidth = 2;
    principal.ctx.strokeRect(ponto.x - N / 2, ponto.y - N / 2, N, N);
    principal.ctx.strokeStyle = t.destaque;
    principal.ctx.lineWidth = 1;
    principal.ctx.strokeRect(ponto.x - N / 2 - 1.5, ponto.y - N / 2 - 1.5, N + 3, N + 3);
  }

  function pintarZoom() {
    const { width: w, height: h, data } = fonte;
    const ctx = zoom.ctx;
    const meio = (N - 1) / 2;
    ctx.clearRect(0, 0, zoom.canvas.width, zoom.canvas.height);
    ctx.font = '11px ui-monospace, Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const x = Math.min(w - 1, Math.max(0, ponto.x + i - meio));
        const y = Math.min(h - 1, Math.max(0, ponto.y + j - meio));
        const k = (y * w + x) * 4;
        const [r, g, b] = [data[k], data[k + 1], data[k + 2]];
        const v = valorDoCanal(r, g, b);
        ctx.fillStyle = modo === 'cor' ? `rgb(${r},${g},${b})` : `rgb(${v},${v},${v})`;
        ctx.fillRect(i * CELULA, j * CELULA, CELULA, CELULA);
        if (modo !== 'cor') {
          // um número por célula: é literalmente isto que está na memória
          ctx.fillStyle = v > 140 ? '#000' : '#fff';
          ctx.fillText(String(v), i * CELULA + CELULA / 2, j * CELULA + CELULA / 2);
        }
      }
    }
    ctx.strokeStyle = '#ff3b6b';
    ctx.lineWidth = 2;
    ctx.strokeRect(meio * CELULA + 1, meio * CELULA + 1, CELULA - 2, CELULA - 2);
  }

  function pintarInfo() {
    const { width: w, data } = fonte;
    const k = (ponto.y * w + ponto.x) * 4;
    const [r, g, b] = [data[k], data[k + 1], data[k + 2]];
    const [hh, s, v] = rgbParaHsv(r, g, b);
    const cinza = 0.299 * r + 0.587 * g + 0.114 * b;
    info.innerHTML = `
      <h4>Pixel (x=${ponto.x}, y=${ponto.y})${fixo ? ' · fixo' : ''}</h4>
      <div><span class="vis-amostra-cor" style="background:rgb(${r},${g},${b})"></span>
        R <b>${r}</b> · G <b>${g}</b> · B <b>${b}</b></div>
      <div class="vis-conta">
        HSV = ${hh.toFixed(0)}°, ${(s * 100).toFixed(0)}%, ${(v * 100).toFixed(0)}%<br>
        cinza = 0.299·${r} + 0.587·${g} + 0.114·${b}<br>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= <b>${cinza.toFixed(1)}</b><br><br>
        No OpenCV:<br>
        img[${ponto.y}, ${ponto.x}] → [${b}, ${g}, ${r}]<br>
        <span style="color:var(--texto-3)">linha primeiro, e B G R</span>
      </div>`;
    p.leitura.innerHTML = `A imagem tem <b>${fonte.width}×${fonte.height}</b> pixels × 3 canais =
      <b>${(fonte.width * fonte.height * 3).toLocaleString('pt-BR')}</b> números de 0 a 255.
      ${modo === 'cor' ? 'Troque para um canal isolado e os números aparecem na vizinhança ampliada.' : 'Cada célula ampliada mostra o valor guardado na memória para aquele pixel.'}`;
  }

  function pintar() {
    if (!fonte) return;
    pintarPrincipal();
    pintarZoom();
    pintarInfo();
  }

  function posicao(evento) {
    const caixa = principal.canvas.getBoundingClientRect();
    return {
      x: Math.min(fonte.width - 1, Math.max(0, Math.floor(((evento.clientX - caixa.left) / caixa.width) * fonte.width))),
      y: Math.min(fonte.height - 1, Math.max(0, Math.floor(((evento.clientY - caixa.top) / caixa.height) * fonte.height))),
    };
  }

  principal.canvas.addEventListener('pointermove', (e) => {
    if (fixo || !fonte) return;
    ponto = posicao(e);
    pintar();
  });
  principal.canvas.addEventListener('click', (e) => {
    if (!fonte) return;
    ponto = posicao(e);
    fixo = !fixo;
    pintar();
  });

  const seletor = chips(
    [
      ['cor', 'cor'],
      ['r', 'canal R'],
      ['g', 'canal G'],
      ['b', 'canal B'],
      ['cinza', 'cinza'],
    ],
    'cor',
    (v) => {
      modo = v;
      pintar();
    },
  );

  const origem = fonteDeImagem({
    alvoDeSoltar: p.corpo,
    aoTrocar({ canvas, gabarito }) {
      fonte = pixelsDe(canvas);
      // começa em cima de um inseto, que é mais interessante que o fundo liso
      const alvo = gabarito?.[0];
      ponto = alvo
        ? { x: Math.round(alvo.x + alvo.w / 2), y: Math.round(alvo.y + alvo.h / 2) }
        : { x: Math.floor(fonte.width / 2), y: Math.floor(fonte.height / 2) };
      fixo = false;
      pintar();
    },
  });

  p.controles.append(seletor.elemento, origem.elemento);
  origem.gerar();
  aoMudarTema(p.raiz, pintar);
  return p.raiz;
}
