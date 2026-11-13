/**
 * Fatiamento (a ideia do SAHI): em vez de encolher a foto inteira para a
 * entrada do modelo, corta-se a foto em pedaços que são inferidos um a um.
 *
 * A cena é uma "foto de celular" de 4000×3000 px. O painel mostra quantos
 * pixels cada inseto tem ao chegar no modelo, com e sem fatiamento, o custo
 * em número de inferências e o que acontece nas emendas.
 */

import { painel, quadro, slider, chips, botao, gerarArmadilha, criarCanvas, rng, el } from './base.js';

const FOTO = { w: 4000, h: 3000 }; // a foto "real"
const TELA = { w: 1600, h: 1200 }; // resolução em que a cena é desenhada
const K = FOTO.w / TELA.w; // 2,5 px de foto por px desenhado
const ENTRADA = 640; // lado da entrada do modelo

/** Chance de detectar um objeto conforme o lado dele, em pixels, na entrada. */
const chance = (lado) => Math.max(0, Math.min(1, (lado - 4) / 9));

export default function criar() {
  const p = painel('Fatiar a imagem', 'foto de 4000×3000 px, modelo com entrada de 640 px');

  const qFoto = quadro('a foto, com as fatias · clique para escolher uma', TELA.w, TELA.h);
  qFoto.canvas.classList.add('mira');
  const lateral = el('div', 'vis-lateral');
  const titulo = el('h4', '', 'Como o modelo vê a fatia marcada');
  const qSem = quadro('foto inteira reduzida', 240, 240);
  const qCom = quadro('fatia inferida sozinha', 240, 240);
  qSem.canvas.classList.add('pixelado');
  lateral.append(titulo, qSem.figura, qCom.figura);
  p.corpo.append(qFoto.figura, lateral);

  let semente = 4;
  let cena = null;
  let sorteios = [];
  let modo = 'fatiar';
  let escolhida = 0;

  function fatias() {
    const lado = sLado.valor;
    const passo = Math.max(32, Math.round(lado * (1 - sSobre.valor / 100)));
    const lista = [];
    for (let y = 0; ; y += passo) {
      const y0 = Math.min(y, Math.max(0, FOTO.h - lado));
      for (let x = 0; ; x += passo) {
        const x0 = Math.min(x, Math.max(0, FOTO.w - lado));
        lista.push({ x: x0, y: y0, w: Math.min(lado, FOTO.w), h: Math.min(lado, FOTO.h) });
        if (x0 + lado >= FOTO.w) break;
      }
      if (y0 + lado >= FOTO.h) break;
    }
    return lista;
  }

  function pintar() {
    const ctx = qFoto.ctx;
    ctx.drawImage(cena.canvas, 0, 0);
    const lista = modo === 'fatiar' ? fatias() : [{ x: 0, y: 0, w: FOTO.w, h: FOTO.h }];
    escolhida = Math.min(escolhida, lista.length - 1);

    // redução aplicada a cada pedaço para caber na entrada do modelo
    const escala = (f) => Math.min(1, ENTRADA / Math.max(f.w, f.h));

    let detectados = 0;
    let cortados = 0;
    let dobrados = 0;
    cena.gabarito.forEach((g, i) => {
      // caixa do inseto em pixels da FOTO
      const c = { x: g.x * K, y: g.y * K, w: g.w * K, h: g.h * K };
      const ladoFoto = Math.sqrt(c.w * c.h);
      // fatias que contêm o inseto INTEIRO
      const contem = lista.filter((f) => c.x >= f.x && c.y >= f.y && c.x + c.w <= f.x + f.w && c.y + c.h <= f.y + f.h);
      let achou = false;
      if (contem.length) {
        const ladoEntrada = ladoFoto * escala(contem[0]);
        achou = sorteios[i] < chance(ladoEntrada);
        if (achou && contem.length > 1) dobrados++;
      } else {
        cortados++; // nenhuma fatia o contém por inteiro: fica partido na emenda
      }
      if (achou) detectados++;

      ctx.strokeStyle = achou ? '#2ecc71' : contem.length ? '#e74c3c' : '#f39c12';
      ctx.lineWidth = 3;
      ctx.strokeRect(g.x - 3, g.y - 3, g.w + 6, g.h + 6);
    });

    // grade das fatias
    if (modo === 'fatiar') {
      lista.forEach((f, i) => {
        ctx.strokeStyle = i === escolhida ? '#ff3b6b' : 'rgba(255,255,255,0.75)';
        ctx.lineWidth = i === escolhida ? 7 : 2.5;
        ctx.strokeRect(f.x / K, f.y / K, f.w / K, f.h / K);
      });
    }

    // ---- as duas visões da fatia escolhida --------------------------------
    const alvo = modo === 'fatiar' ? lista[escolhida] : { x: 1200, y: 900, w: 1024, h: 1024 };
    const regiao = [alvo.x / K, alvo.y / K, alvo.w / K, alvo.h / K];

    // sem fatiar: essa região chega ao modelo com (lado × 640/4000) pixels
    const pxSem = Math.max(4, Math.round(alvo.w * (ENTRADA / FOTO.w)));
    const pequeno = criarCanvas(pxSem, pxSem);
    pequeno.getContext('2d').drawImage(cena.canvas, ...regiao, 0, 0, pxSem, pxSem);
    qSem.ctx.imageSmoothingEnabled = false;
    qSem.ctx.clearRect(0, 0, 240, 240);
    qSem.ctx.drawImage(pequeno, 0, 0, 240, 240);
    qSem.titulo.textContent = `foto inteira reduzida: esta região vira ${pxSem}×${pxSem} px`;

    const pxCom = Math.round(alvo.w * escala(alvo));
    qCom.ctx.clearRect(0, 0, 240, 240);
    qCom.ctx.drawImage(cena.canvas, ...regiao, 0, 0, 240, 240);
    qCom.titulo.textContent = `fatia inferida sozinha: ${pxCom}×${pxCom} px`;

    // ---- leitura ------------------------------------------------------------
    const total = cena.gabarito.length;
    const ladoMedio = cena.gabarito.reduce((s, g) => s + Math.sqrt(g.w * g.h) * K, 0) / total;
    const naEntrada = ladoMedio * escala(lista[0]);
    p.leitura.innerHTML = `
      <div class="vis-placar">
        <div><b>${lista.length}</b><span>inferências por foto</span></div>
        <div><b>${naEntrada.toFixed(1)} px</b><span>inseto médio na entrada</span></div>
        <div><b style="color:var(--verde)">${detectados}</b><span>detectados de ${total}</span></div>
        <div><b style="color:var(--amarelo)">${cortados}</b><span>partidos na emenda</span></div>
        <div><b>${dobrados}</b><span>vistos em 2+ fatias</span></div>
      </div>
      <p style="margin:10px 0 0">${
        modo === 'inteira'
          ? `A foto de 4000 px é reduzida ${(FOTO.w / ENTRADA).toFixed(1)} vezes. Um inseto de ${ladoMedio.toFixed(0)} px na foto chega ao modelo com <b>${naEntrada.toFixed(1)} px</b>: quase tudo fica vermelho (não detectado).`
          : `Cada fatia é inferida separadamente. Fatia menor = inseto maior na entrada e mais inferências.
             ${cortados ? `<b>${cortados} inseto(s) ficaram partidos</b> entre fatias: aumente a sobreposição até cobrir o maior objeto.` : 'A sobreposição cobre todos os objetos.'}
             ${dobrados ? `${dobrados} foram detectados em mais de uma fatia: as caixas precisam ser fundidas depois (NMS entre fatias).` : ''}`
      }</p>`;
  }

  qFoto.canvas.addEventListener('click', (ev) => {
    if (modo !== 'fatiar') return;
    const r = qFoto.canvas.getBoundingClientRect();
    const x = ((ev.clientX - r.left) / r.width) * FOTO.w;
    const y = ((ev.clientY - r.top) / r.height) * FOTO.h;
    const lista = fatias();
    const i = lista.findIndex((f) => x >= f.x && x < f.x + f.w && y >= f.y && y < f.y + f.h);
    if (i >= 0) {
      escolhida = i;
      pintar();
    }
  });

  const sLado = slider({ rotulo: 'lado da fatia', min: 512, max: 2048, passo: 64, valor: 1024, formato: (v) => `${v} px`, aoMudar: pintar });
  const sSobre = slider({ rotulo: 'sobreposição', min: 0, max: 40, passo: 5, valor: 20, formato: (v) => `${v}%`, aoMudar: pintar });
  const seletor = chips(
    [
      ['inteira', 'foto inteira'],
      ['fatiar', 'fatiada'],
    ],
    'fatiar',
    (v) => {
      modo = v;
      pintar();
    },
  );

  function gerar() {
    // insetos com 8 a 50 px de comprimento na tela = 20 a 125 px na foto
    cena = gerarArmadilha({ largura: TELA.w, altura: TELA.h, semente, insetos: 150, detritos: 20, aglomerado: 0.25, escala: 1.2, ruido: 3 });
    const r = rng(semente * 17);
    sorteios = cena.gabarito.map(() => r());
    pintar();
  }

  const linha = el('div', 'vis-linha');
  linha.append(
    seletor.elemento,
    botao('↻ outra foto', () => {
      semente++;
      gerar();
    }),
  );
  p.controles.append(linha, sLado.elemento, sSobre.elemento);
  gerar();
  return p.raiz;
}
