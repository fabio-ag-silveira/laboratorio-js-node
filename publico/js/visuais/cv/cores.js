/**
 * Segmentação por cor em HSV: escolha uma faixa de matiz, saturação e brilho
 * e veja a máscara. É o `cv2.inRange` com controles deslizantes.
 */

import { painel, quadro, slider, chips, fonteDeImagem, pixelsDe, criarCanvas, el } from './base.js';
import { rgbParaHsv } from './processamento.js';

const PREDEFINIDOS = {
  fundo: { rotulo: 'o cartão amarelo', h: [35, 70], s: 35, v: [35, 100] },
  insetos: { rotulo: 'o que é escuro', h: [0, 360], s: 0, v: [0, 42] },
  tudo: { rotulo: 'tudo', h: [0, 360], s: 0, v: [0, 100] },
};

export default function criar() {
  const p = painel('Segmentar por cor (HSV)', 'o cv2.inRange com controles deslizantes');

  const original = quadro('original');
  const mascara = quadro('máscara (branco = dentro da faixa)');
  const resultado = quadro('só o que passou');
  p.corpo.append(original.figura, mascara.figura, resultado.figura);

  let hsv = null; // Float32Array com h, s, v por pixel
  let fonte = null;

  // barra de matiz: mostra onde cada cor mora no círculo de 0° a 360°
  const barra = criarCanvas(360, 14);
  barra.style.cssText = 'width:100%;height:14px;border-radius:4px;display:block';

  function pintarBarra(hMin, hMax) {
    const ctx = barra.getContext('2d');
    for (let x = 0; x < 360; x++) {
      ctx.fillStyle = `hsl(${x},90%,50%)`;
      ctx.fillRect(x, 0, 1, 14);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, 0, hMin, 14);
    ctx.fillRect(hMax, 0, 360 - hMax, 14);
  }

  function pintar() {
    if (!fonte) return;
    const { width: w, height: h, data } = fonte;
    const hMin = Math.min(sHMin.valor, sHMax.valor);
    const hMax = Math.max(sHMin.valor, sHMax.valor);
    const sMin = sSMin.valor / 100;
    const vMin = Math.min(sVMin.valor, sVMax.valor) / 100;
    const vMax = Math.max(sVMin.valor, sVMax.valor) / 100;

    const m = mascara.ctx.createImageData(w, h);
    const r = resultado.ctx.createImageData(w, h);
    let dentro = 0;

    for (let i = 0, j = 0; i < w * h; i++, j += 4) {
      const hh = hsv[i * 3];
      const ss = hsv[i * 3 + 1];
      const vv = hsv[i * 3 + 2];
      const ok = hh >= hMin && hh <= hMax && ss >= sMin && vv >= vMin && vv <= vMax;
      if (ok) dentro++;
      m.data[j] = m.data[j + 1] = m.data[j + 2] = ok ? 255 : 0;
      m.data[j + 3] = 255;
      // fora da faixa fica esmaecido, para dar contexto
      const f = ok ? 1 : 0.13;
      r.data[j] = data[j] * f;
      r.data[j + 1] = data[j + 1] * f;
      r.data[j + 2] = data[j + 2] * f;
      r.data[j + 3] = 255;
    }
    mascara.ctx.putImageData(m, 0, 0);
    resultado.ctx.putImageData(r, 0, 0);
    pintarBarra(hMin, hMax);

    const pct = ((dentro / (w * h)) * 100).toFixed(1);
    p.leitura.innerHTML = `<b>${pct}%</b> dos pixels estão na faixa.
      Em OpenCV: <code>cv2.inRange(hsv, (${Math.round(hMin / 2)}, ${Math.round(sMin * 255)}, ${Math.round(vMin * 255)}), (${Math.round(hMax / 2)}, 255, ${Math.round(vMax * 255)}))</code>
      — repare que lá o matiz vai de 0 a <b>179</b> (graus ÷ 2, para caber em 8 bits).`;
  }

  const grau = (v) => `${v}°`;
  const pct = (v) => `${v}%`;
  const sHMin = slider({ rotulo: 'matiz mín.', min: 0, max: 360, valor: 35, formato: grau, aoMudar: pintar });
  const sHMax = slider({ rotulo: 'matiz máx.', min: 0, max: 360, valor: 70, formato: grau, aoMudar: pintar });
  const sSMin = slider({ rotulo: 'saturação mín.', min: 0, max: 100, valor: 35, formato: pct, aoMudar: pintar });
  const sVMin = slider({ rotulo: 'brilho mín.', min: 0, max: 100, valor: 35, formato: pct, aoMudar: pintar });
  const sVMax = slider({ rotulo: 'brilho máx.', min: 0, max: 100, valor: 100, formato: pct, aoMudar: pintar });

  const aplicar = (nome) => {
    const d = PREDEFINIDOS[nome];
    [sHMin.valor, sHMax.valor] = d.h;
    sSMin.valor = d.s;
    [sVMin.valor, sVMax.valor] = d.v;
    pintar();
  };
  const atalhos = chips(Object.entries(PREDEFINIDOS).map(([k, d]) => [k, d.rotulo]), 'fundo', aplicar);

  const origem = fonteDeImagem({
    alvoDeSoltar: p.corpo,
    aoTrocar({ canvas }) {
      fonte = pixelsDe(canvas);
      const { width: w, height: h, data } = fonte;
      for (const q of [original, mascara, resultado]) {
        q.canvas.width = w;
        q.canvas.height = h;
      }
      original.ctx.drawImage(canvas, 0, 0);
      hsv = new Float32Array(w * h * 3);
      for (let i = 0, j = 0; i < w * h; i++, j += 4) {
        const [hh, ss, vv] = rgbParaHsv(data[j], data[j + 1], data[j + 2]);
        hsv[i * 3] = hh;
        hsv[i * 3 + 1] = ss;
        hsv[i * 3 + 2] = vv;
      }
      pintar();
    },
  });

  const linhaBarra = el('div', 'vis-linha');
  linhaBarra.append(barra);
  const linhaAtalhos = el('div', 'vis-linha');
  linhaAtalhos.append(el('span', 'vis-rotulo', 'isolar'), atalhos.elemento, origem.elemento);

  p.controles.append(linhaBarra, sHMin.elemento, sHMax.elemento, sSMin.elemento, sVMin.elemento, sVMax.elemento, linhaAtalhos);
  origem.gerar();
  return p.raiz;
}
