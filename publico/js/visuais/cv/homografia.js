/**
 * Homografia: arraste os quatro pontos até os cantos do cartão fotografado
 * torto e veja a imagem "endireitada" ao lado, com a matriz 3×3 que faz isso.
 */

import { painel, quadro, botao, gerarArmadilha, pixelsDe, criarCanvas, rng, el } from './base.js';
import { homografia, aplicarHomografia } from './processamento.js';

const W = 480; // foto
const H = 360;
const RW = 400; // cartão endireitado
const RH = 300;

/** Copia pixels de `origem` para `destino` seguindo a homografia inversa. */
function deformar(origem, destino, Hinv, fundo) {
  const s = origem.data;
  const d = destino.data;
  for (let v = 0; v < destino.height; v++) {
    for (let u = 0; u < destino.width; u++) {
      const [x, y] = aplicarHomografia(Hinv, u, v);
      const k = (v * destino.width + u) * 4;
      const xi = Math.round(x);
      const yi = Math.round(y);
      if (xi >= 0 && yi >= 0 && xi < origem.width && yi < origem.height) {
        const j = (yi * origem.width + xi) * 4;
        d[k] = s[j];
        d[k + 1] = s[j + 1];
        d[k + 2] = s[j + 2];
      } else {
        d[k] = fundo[0];
        d[k + 1] = fundo[1];
        d[k + 2] = fundo[2];
      }
      d[k + 3] = 255;
    }
  }
}

export default function criar() {
  const p = painel('Endireitar a foto (homografia)', 'arraste os quatro pontos até os cantos do cartão');

  const qFoto = quadro('foto tirada de lado', W, H);
  qFoto.canvas.classList.add('arrastavel');
  const qReto = quadro('cartão endireitado', RW, RH);
  p.corpo.append(qFoto.figura, qReto.figura);

  const cantosRetos = [[0, 0], [RW, 0], [RW, RH], [0, RH]];
  let foto = null; // ImageData da foto em perspectiva
  let cantosReais = null;
  let pontos = null;
  let semente = 3;
  let arrastando = -1;

  function novaFoto() {
    const r = rng(semente * 977);
    const { canvas } = gerarArmadilha({ largura: RW, altura: RH, semente, insetos: 20, detritos: 4 });
    const plano = pixelsDe(canvas);

    // onde o cartão cai na foto: um quadrilátero torto, sorteado
    cantosReais = [
      [r.entre(60, 130), r.entre(30, 80)],
      [r.entre(350, 430), r.entre(20, 70)],
      [r.entre(380, 460), r.entre(270, 335)],
      [r.entre(30, 110), r.entre(260, 330)],
    ];

    // foto → plano: para cada pixel da foto, de que ponto do cartão ele veio?
    const fotoParaPlano = homografia(cantosReais, cantosRetos);
    const tela = criarCanvas(W, H);
    const ctx = tela.getContext('2d');
    foto = ctx.createImageData(W, H);
    deformar(plano, foto, fotoParaPlano, [74, 82, 92]);

    // os pontos começam "quase lá", para o exercício ser arrastar o que falta
    pontos = [[110, 90], [370, 90], [370, 270], [110, 270]];
    pintar();
  }

  function pintar() {
    qFoto.ctx.putImageData(foto, 0, 0);
    const ctx = qFoto.ctx;
    ctx.strokeStyle = '#ff3b6b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    pontos.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.stroke();
    pontos.forEach(([x, y], i) => {
      ctx.fillStyle = '#ff3b6b';
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), x, y);
    });

    // reto → foto: para cada pixel do cartão endireitado, onde buscar na foto
    const Hm = homografia(cantosRetos, pontos);
    if (!Hm) {
      p.leitura.textContent = 'Pontos alinhados numa reta: não existe homografia para isso.';
      return;
    }
    const saida = qReto.ctx.createImageData(RW, RH);
    deformar(foto, saida, Hm, [0, 0, 0]);
    qReto.ctx.putImageData(saida, 0, 0);

    const erro = Math.max(...pontos.map(([x, y], i) => Math.hypot(x - cantosReais[i][0], y - cantosReais[i][1])));
    const f = (v) => (Math.abs(v) < 0.0005 ? '0' : v.toFixed(Math.abs(v) < 0.1 ? 4 : 2)).padStart(8);
    p.leitura.innerHTML = `
      <div class="vis-conta" style="white-space:pre;margin:0 0 8px">H = [${f(Hm[0])} ${f(Hm[1])} ${f(Hm[2])} ]
    [${f(Hm[3])} ${f(Hm[4])} ${f(Hm[5])} ]
    [${f(Hm[6])} ${f(Hm[7])} ${f(Hm[8])} ]</div>
      ${
        erro < 6
          ? '<b style="color:var(--verde)">Cantos no lugar.</b> A grade do cartão ficou reta e os insetos voltaram ao tamanho real: agora dá para medir em milímetros.'
          : `Canto mais distante do lugar certo: <b>${erro.toFixed(0)} px</b>. Enquanto os pontos não estiverem nos cantos, a grade aparece torta.`
      }
      A última linha de H é o que faz a perspectiva: se fosse <code>0 0 1</code>, a transformação seria afim (sem ponto de fuga).`;
  }

  function posicao(e) {
    const caixa = qFoto.canvas.getBoundingClientRect();
    return [((e.clientX - caixa.left) / caixa.width) * W, ((e.clientY - caixa.top) / caixa.height) * H];
  }

  qFoto.canvas.addEventListener('pointerdown', (e) => {
    const [x, y] = posicao(e);
    const distancias = pontos.map(([px, py]) => Math.hypot(px - x, py - y));
    const perto = distancias.indexOf(Math.min(...distancias));
    if (distancias[perto] < 30) {
      arrastando = perto;
      qFoto.canvas.setPointerCapture(e.pointerId);
    }
  });
  qFoto.canvas.addEventListener('pointermove', (e) => {
    if (arrastando < 0) return;
    const [x, y] = posicao(e);
    pontos[arrastando] = [Math.max(0, Math.min(W, x)), Math.max(0, Math.min(H, y))];
    pintar();
  });
  const soltar = () => (arrastando = -1);
  qFoto.canvas.addEventListener('pointerup', soltar);
  qFoto.canvas.addEventListener('pointercancel', soltar);

  p.controles.append(
    botao('↻ outra foto', () => {
      semente++;
      novaFoto();
    }),
    botao('mostrar a resposta', () => {
      pontos = cantosReais.map(([x, y]) => [x, y]);
      pintar();
    }),
    el('span', 'vis-rotulo', 'a ordem dos pontos importa: 1 → 2 → 3 → 4 em sentido horário'),
  );

  novaFoto();
  return p.raiz;
}
