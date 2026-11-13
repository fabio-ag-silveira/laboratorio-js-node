/**
 * NMS passo a passo: a cada passo, a caixa mais confiante é mantida e as que
 * a sobrepõem demais são apagadas. Os cenários mostram quando isso ajuda e
 * quando apaga um objeto de verdade.
 */

import { painel, quadro, slider, chips, botao, el, tema, aoMudarTema } from './base.js';
import { nms } from './deteccao.js';

const W = 480;
const H = 300;

// Insetos (elipses) e as caixas candidatas que um detector produziria.
// Cada caixa é [x, y, largura, altura, confiança, dono]: `dono` é o índice do
// inseto a que ela se refere, ou -1 quando engloba mais de um. Saber o dono
// permite dizer se o resultado está CERTO, e não só se a quantidade bate.
export const CENARIOS = {
  um: {
    rotulo: 'um inseto, várias caixas',
    insetos: [{ x: 240, y: 150, a: 46, b: 22, ang: 0.3 }],
    caixas: [
      [188, 118, 104, 64, 0.94, 0],
      [194, 124, 98, 58, 0.88, 0],
      [182, 112, 110, 74, 0.71, 0],
      [200, 120, 104, 60, 0.63, 0],
      [176, 126, 100, 56, 0.42, 0],
    ],
  },
  dois: {
    rotulo: 'dois insetos sobrepostos',
    insetos: [
      { x: 212, y: 151, a: 42, b: 17, ang: 0.9 },
      { x: 232, y: 155, a: 42, b: 17, ang: -0.7 },
    ],
    caixas: [
      [166, 112, 92, 78, 0.93, 0],
      [186, 116, 92, 78, 0.9, 1],
      [172, 116, 90, 72, 0.74, 0],
      [192, 120, 88, 72, 0.69, 1],
      [164, 110, 116, 86, 0.38, -1],
    ],
  },
  fila: {
    rotulo: 'aglomerado',
    insetos: [
      { x: 150, y: 150, a: 30, b: 13, ang: 0.9 },
      { x: 166, y: 154, a: 30, b: 13, ang: -0.8 },
      { x: 238, y: 156, a: 30, b: 13, ang: 0.5 },
      { x: 252, y: 146, a: 30, b: 13, ang: -1.0 },
      { x: 338, y: 154, a: 30, b: 13, ang: 0.3 },
    ],
    caixas: [
      [112, 118, 76, 64, 0.91, 0],
      [128, 122, 76, 64, 0.89, 1],
      [200, 124, 76, 64, 0.86, 2],
      [214, 114, 76, 64, 0.84, 3],
      [300, 122, 76, 64, 0.8, 4],
      [318, 132, 76, 64, 0.6, 4],
      [112, 112, 96, 76, 0.4, -1],
    ],
  },
};

export default function criar() {
  const p = painel('NMS passo a passo', 'a mais confiante fica; quem a sobrepõe demais sai');

  const q = quadro('', W, H);
  const lateral = el('div', 'vis-lateral');
  p.corpo.append(q.figura, lateral);

  let cenario = CENARIOS.um;
  let caixas = [];
  let resultado = null;
  let passo = 0; // quantos passos do NMS já foram aplicados

  function preparar() {
    caixas = cenario.caixas.map(([x, y, w, h, conf, dono]) => ({ x, y, w, h, conf, dono }));
    resultado = nms(caixas, sIou.valor);
    passo = 0;
    pintar();
  }

  /** Estado de cada caixa depois de `passo` passos. */
  function estados() {
    const estado = caixas.map(() => 'pendente');
    resultado.passos.slice(0, passo).forEach((s) => {
      estado[s.escolhida] = 'mantida';
      s.suprimidas.forEach((x) => (estado[x.indice] = 'suprimida'));
    });
    return estado;
  }

  function pintar() {
    const t = tema();
    const ctx = q.ctx;
    ctx.fillStyle = '#d9b92a';
    ctx.fillRect(0, 0, W, H);

    for (const i of cenario.insetos) {
      ctx.fillStyle = '#2f2a22';
      ctx.beginPath();
      ctx.ellipse(i.x, i.y, i.a, i.b, i.ang, 0, 2 * Math.PI);
      ctx.fill();
    }

    const estado = estados();
    const atual = resultado.passos[passo - 1];
    const cores = { pendente: '#5d6d7e', mantida: '#27ae60', suprimida: '#c0392b' };

    caixas.forEach((c, i) => {
      ctx.save();
      ctx.lineWidth = estado[i] === 'mantida' ? 3 : 1.6;
      ctx.strokeStyle = cores[estado[i]];
      if (estado[i] === 'suprimida') {
        ctx.setLineDash([5, 4]);
        ctx.globalAlpha = 0.5;
      }
      ctx.strokeRect(c.x, c.y, c.w, c.h);
      ctx.setLineDash([]);
      ctx.fillStyle = cores[estado[i]];
      ctx.font = 'bold 12px ui-monospace, Consolas, monospace';
      ctx.fillText(c.conf.toFixed(2), c.x + 3, c.y - 4);
      ctx.restore();
    });

    const fim = passo >= resultado.passos.length;
    q.titulo.textContent = fim ? 'fim: verde = detecções finais' : `passo ${passo} de ${resultado.passos.length}`;

    // lista ordenada por confiança, com o que aconteceu a cada caixa
    const ordem = caixas.map((_, i) => i).sort((i, j) => caixas[j].conf - caixas[i].conf);
    const icone = { pendente: '·', mantida: '✓', suprimida: '✕' };
    lateral.innerHTML =
      '<h4>Caixas por confiança</h4><div class="vis-conta" style="margin-top:0">' +
      ordem
        .map((i) => {
          let extra = '';
          if (atual) {
            const s = atual.suprimidas.find((x) => x.indice === i);
            if (s) extra = ` IoU ${s.iou.toFixed(2)} > ${sIou.valor.toFixed(2)}`;
            if (atual.escolhida === i) extra = ' ← escolhida agora';
          }
          return `<span style="color:${cores[estado[i]]}">${icone[estado[i]]} ${caixas[i].conf.toFixed(2)}${extra}</span>`;
        })
        .join('<br>') +
      '</div>';

    // Confere o resultado pelo DONO de cada caixa mantida: cada inseto deve
    // ficar com exatamente uma caixa, e nenhuma caixa "coletiva" pode sobrar.
    const mantidas = caixas.filter((_, i) => estado[i] === 'mantida');
    const reais = cenario.insetos.length;
    const porDono = new Map();
    mantidas.forEach((c) => porDono.set(c.dono, (porDono.get(c.dono) ?? 0) + 1));
    let apagados = 0;
    for (let k = 0; k < reais; k++) if (!porDono.has(k)) apagados++;
    const sobrando = mantidas.length - (reais - apagados); // duplicatas e caixas coletivas

    if (!fim) {
      p.leitura.innerHTML = atual
        ? `Mantida a caixa <b>${caixas[atual.escolhida].conf.toFixed(2)}</b>; ${atual.suprimidas.length} apagada(s) por sobrepô-la acima do limiar.`
        : 'Todas as caixas estão pendentes. O NMS começa pela de maior confiança.';
    } else if (!apagados && !sobrando) {
      p.leitura.innerHTML = `<b style="color:var(--verde)">Uma caixa para cada inseto.</b> Com este limiar, nesta cena, o NMS fez o que devia. Mexa no limiar para achar onde a faixa boa acaba.`;
    } else if (apagados && sobrando) {
      p.leitura.innerHTML = `<b style="color:var(--vermelho)">${apagados} inseto(s) de verdade apagado(s) e ${sobrando} caixa(s) duplicada(s) sobrando, ao mesmo tempo.</b>
        ${mantidas.length === reais ? `A contagem dá ${reais}, o número certo, pelo motivo errado. ` : ''}Aqui há vizinhos reais que se sobrepõem MAIS do que uma duplicata se sobrepõe ao seu original: não existe limiar que separe os dois casos.`;
    } else if (apagados) {
      p.leitura.innerHTML = `<b style="color:var(--vermelho)">${apagados} inseto(s) de verdade apagado(s).</b>
        Sobraram ${mantidas.length} detecções para ${reais} insetos. Vizinhos sobrepostos têm IoU tão alto quanto duas caixas do mesmo objeto, e o NMS só enxerga IoU. Suba o limiar e veja o custo.`;
    } else {
      p.leitura.innerHTML = `<b style="color:var(--amarelo)">${sobrando} caixa(s) duplicada(s) sobrando.</b>
        Sobraram ${mantidas.length} detecções para ${reais} inseto(s). Limiar alto demais: a segunda caixa do mesmo objeto sobrevive e vira falso positivo.`;
    }

    btPasso.disabled = fim;
    btFim.disabled = fim;
  }

  const sIou = slider({
    rotulo: 'limiar de IoU',
    min: 0.1,
    max: 0.9,
    passo: 0.05,
    valor: 0.45,
    formato: (v) => v.toFixed(2),
    aoMudar: () => {
      const eraFim = passo >= resultado.passos.length;
      resultado = nms(caixas, sIou.valor);
      passo = eraFim ? resultado.passos.length : Math.min(passo, resultado.passos.length);
      pintar();
    },
  });

  const btPasso = botao('próximo passo ›', () => {
    passo++;
    pintar();
  }, 'botao botao-principal');
  const btFim = botao('até o fim', () => {
    passo = resultado.passos.length;
    pintar();
  });
  const btVoltar = botao('↺ recomeçar', () => {
    passo = 0;
    pintar();
  });

  const seletor = chips(Object.entries(CENARIOS).map(([k, c]) => [k, c.rotulo]), 'um', (nome) => {
    cenario = CENARIOS[nome];
    preparar();
  });

  const linha = el('div', 'vis-linha');
  linha.append(seletor.elemento);
  p.controles.append(linha, btPasso, btFim, btVoltar, sIou.elemento);

  preparar();
  aoMudarTema(p.raiz, pintar);
  return p.raiz;
}
