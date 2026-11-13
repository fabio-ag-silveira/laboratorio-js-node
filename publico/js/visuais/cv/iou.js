/**
 * IoU com as mãos: arraste e redimensione duas caixas e veja IoU, GIoU, DIoU
 * e CIoU mudarem. Os atalhos mostram os casos que explicam por que as
 * variantes existem.
 */

import { painel, quadro, chips, el, tema, aoMudarTema } from './base.js';
import { metricasDeCaixa } from './deteccao.js';

const MUNDO = { w: 120, h: 90 }; // unidades = pixels de uma imagem hipotética
const ESCALA = 4; // cada unidade vira 4 px na tela

const CASOS = {
  boa: { rotulo: 'boa', a: [40, 30, 36, 28], b: [44, 33, 36, 28] },
  metade: { rotulo: 'pela metade', a: [30, 28, 40, 30], b: [50, 28, 40, 30] },
  contida: { rotulo: 'uma dentro da outra', a: [30, 20, 60, 46], b: [48, 34, 22, 16] },
  longe: { rotulo: 'sem se tocar', a: [14, 30, 30, 24], b: [72, 34, 30, 24] },
  pequena: { rotulo: 'objeto pequeno, erro de 2 px', a: [56, 40, 6, 6], b: [58, 42, 6, 6] },
  grande: { rotulo: 'objeto grande, erro de 2 px', a: [30, 20, 60, 46], b: [32, 22, 60, 46] },
};

const caixa = ([x, y, w, h]) => ({ x, y, w, h });

export default function criar() {
  const p = painel('IoU e as variantes', 'arraste as caixas; puxe o canto inferior direito para redimensionar');

  const q = quadro('verde = gabarito · vermelho = predição', MUNDO.w * ESCALA, MUNDO.h * ESCALA);
  q.canvas.classList.add('arrastavel');
  const lateral = el('div', 'vis-lateral');
  p.corpo.append(q.figura, lateral);

  let a = caixa(CASOS.boa.a);
  let b = caixa(CASOS.boa.b);
  let acao = null; // { alvo, modo, dx, dy }

  function pintar() {
    const t = tema();
    const ctx = q.ctx;
    const m = metricasDeCaixa(a, b);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = t.fundo;
    ctx.fillRect(0, 0, q.canvas.width, q.canvas.height);

    // grade de pixels, para dar noção de escala
    ctx.strokeStyle = t.borda;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= MUNDO.w; x += 10) {
      ctx.moveTo(x * ESCALA + 0.5, 0);
      ctx.lineTo(x * ESCALA + 0.5, MUNDO.h * ESCALA);
    }
    for (let y = 0; y <= MUNDO.h; y += 10) {
      ctx.moveTo(0, y * ESCALA + 0.5);
      ctx.lineTo(MUNDO.w * ESCALA, y * ESCALA + 0.5);
    }
    ctx.stroke();

    ctx.setTransform(ESCALA, 0, 0, ESCALA, 0, 0);

    // caixa envolvente (a base do GIoU)
    const e = m.caixaEnvolvente;
    ctx.setLineDash([2, 2]);
    ctx.strokeStyle = t.texto3;
    ctx.lineWidth = 0.4;
    ctx.strokeRect(e.x, e.y, e.w, e.h);
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(46,204,113,0.22)';
    ctx.fillRect(a.x, a.y, a.w, a.h);
    ctx.fillStyle = 'rgba(231,76,60,0.22)';
    ctx.fillRect(b.x, b.y, b.w, b.h);

    // interseção
    const ix = Math.max(a.x, b.x);
    const iy = Math.max(a.y, b.y);
    const iw = Math.min(a.x + a.w, b.x + b.w) - ix;
    const ih = Math.min(a.y + a.h, b.y + b.h) - iy;
    if (iw > 0 && ih > 0) {
      ctx.fillStyle = 'rgba(241,196,15,0.75)';
      ctx.fillRect(ix, iy, iw, ih);
    }

    ctx.lineWidth = 0.6;
    ctx.strokeStyle = '#2ecc71';
    ctx.strokeRect(a.x, a.y, a.w, a.h);
    ctx.strokeStyle = '#e74c3c';
    ctx.strokeRect(b.x, b.y, b.w, b.h);

    // alças de redimensionar
    for (const [c, cor] of [[a, '#2ecc71'], [b, '#e74c3c']]) {
      ctx.fillStyle = cor;
      ctx.fillRect(c.x + c.w - 1.2, c.y + c.h - 1.2, 2.4, 2.4);
    }

    // linha entre os centros (a base do DIoU)
    ctx.strokeStyle = t.texto2;
    ctx.lineWidth = 0.3;
    ctx.beginPath();
    ctx.moveTo(a.x + a.w / 2, a.y + a.h / 2);
    ctx.lineTo(b.x + b.w / 2, b.y + b.h / 2);
    ctx.stroke();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const f = (v) => v.toFixed(3);
    const barra = (v) =>
      `<span style="display:inline-block;height:6px;border-radius:3px;vertical-align:middle;width:${Math.max(0, Math.min(1, (v + 1) / 2)) * 70}px;background:var(--destaque)"></span>`;
    lateral.innerHTML = `
      <h4>Medidas</h4>
      <div class="vis-conta" style="margin-top:0">
        interseção = ${m.inter.toFixed(0)} px²<br>
        união &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= ${m.uniao.toFixed(0)} px²<br>
        <b style="color:var(--texto)">IoU &nbsp;= ${f(m.iou)}</b> ${barra(m.iou)}<br>
        GIoU = ${f(m.giou)} ${barra(m.giou)}<br>
        DIoU = ${f(m.diou)} ${barra(m.diou)}<br>
        CIoU = ${f(m.ciou)} ${barra(m.ciou)}<br>
        <span style="color:var(--texto-3)">perda = 1 − valor</span>
      </div>`;

    let texto;
    if (m.iou === 0) {
      texto = `<b>IoU = 0, e continuaria 0 se as caixas estivessem duas vezes mais longe.</b> Como perda, isso dá gradiente nulo: a rede não sabe para que lado mover a caixa.
        O GIoU (${f(m.giou)}) e o DIoU (${f(m.diou)}) ficam negativos e pioram com a distância, então ainda apontam a direção.`;
    } else if (m.iou >= 0.5) {
      texto = `IoU ${f(m.iou)}: conta como acerto no critério usual (IoU ≥ 0,5). Para o mAP@50-95 ela ainda é avaliada em limiares mais exigentes, até 0,95.`;
    } else {
      texto = `IoU ${f(m.iou)}: abaixo de 0,5, esta predição conta como <b>falso positivo</b>, e o objeto como <b>não detectado</b>, mesmo com a caixa em cima dele.`;
    }
    if (Math.sqrt(a.w * a.h) < 10) {
      texto += ` <b>Repare no tamanho:</b> num objeto de ${a.w.toFixed(0)}×${a.h.toFixed(0)} px, um deslocamento de 2 px já derruba o IoU. No objeto grande, o mesmo erro quase não aparece.`;
    }
    p.leitura.innerHTML = texto;
  }

  // ---- arrastar -----------------------------------------------------------
  function posicao(ev) {
    const r = q.canvas.getBoundingClientRect();
    return { x: ((ev.clientX - r.left) / r.width) * MUNDO.w, y: ((ev.clientY - r.top) / r.height) * MUNDO.h };
  }
  const pertoDaAlca = (c, pt) => Math.abs(pt.x - (c.x + c.w)) < 3 && Math.abs(pt.y - (c.y + c.h)) < 3;
  const dentro = (c, pt) => pt.x >= c.x && pt.x <= c.x + c.w && pt.y >= c.y && pt.y <= c.y + c.h;

  q.canvas.addEventListener('pointerdown', (ev) => {
    const pt = posicao(ev);
    // a predição (b) fica por cima, então tem prioridade
    for (const alvo of [b, a]) {
      if (pertoDaAlca(alvo, pt)) acao = { alvo, modo: 'tamanho' };
      else if (dentro(alvo, pt)) acao = { alvo, modo: 'mover', dx: pt.x - alvo.x, dy: pt.y - alvo.y };
      if (acao) break;
    }
    if (acao) q.canvas.setPointerCapture(ev.pointerId);
  });
  q.canvas.addEventListener('pointermove', (ev) => {
    if (!acao) return;
    const pt = posicao(ev);
    const c = acao.alvo;
    if (acao.modo === 'mover') {
      c.x = Math.max(0, Math.min(MUNDO.w - c.w, pt.x - acao.dx));
      c.y = Math.max(0, Math.min(MUNDO.h - c.h, pt.y - acao.dy));
    } else {
      c.w = Math.max(2, Math.min(MUNDO.w - c.x, pt.x - c.x));
      c.h = Math.max(2, Math.min(MUNDO.h - c.y, pt.y - c.y));
    }
    pintar();
  });
  const soltar = () => (acao = null);
  q.canvas.addEventListener('pointerup', soltar);
  q.canvas.addEventListener('pointercancel', soltar);

  const atalhos = chips(Object.entries(CASOS).map(([k, c]) => [k, c.rotulo]), 'boa', (nome) => {
    a = caixa(CASOS[nome].a);
    b = caixa(CASOS[nome].b);
    pintar();
  });
  p.controles.append(atalhos.elemento);

  pintar();
  aoMudarTema(p.raiz, pintar);
  return p.raiz;
}
