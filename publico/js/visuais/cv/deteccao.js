/**
 * Matemática de detecção de objetos, em funções puras.
 *
 * Caixas são objetos { x, y, w, h } com o canto superior esquerdo em pixels;
 * detecções têm também `classe` e `conf`. Nada aqui toca no DOM, então
 * `npm test` exercita tudo no Node.
 */

import { rng } from './base.js';

export const area = (c) => Math.max(0, c.w) * Math.max(0, c.h);

/**
 * IoU e as variantes usadas como função de perda.
 *
 *   IoU  = interseção / união
 *   GIoU = IoU − (parte da caixa envolvente que não é união) / envolvente
 *   DIoU = IoU − (distância entre centros)² / (diagonal da envolvente)²
 *   CIoU = DIoU − α·v, onde v mede a diferença de proporção (largura/altura)
 */
export function metricasDeCaixa(a, b) {
  const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const inter = ix * iy;
  const uniao = area(a) + area(b) - inter;
  const iou = uniao > 0 ? inter / uniao : 0;

  // a menor caixa que contém as duas
  const ex = Math.min(a.x, b.x);
  const ey = Math.min(a.y, b.y);
  const ew = Math.max(a.x + a.w, b.x + b.w) - ex;
  const eh = Math.max(a.y + a.h, b.y + b.h) - ey;
  const envolvente = ew * eh;
  const giou = envolvente > 0 ? iou - (envolvente - uniao) / envolvente : iou;

  const dc2 = (a.x + a.w / 2 - b.x - b.w / 2) ** 2 + (a.y + a.h / 2 - b.y - b.h / 2) ** 2;
  const diag2 = ew * ew + eh * eh;
  const diou = diag2 > 0 ? iou - dc2 / diag2 : iou;

  const v = (4 / Math.PI ** 2) * (Math.atan(b.w / (b.h || 1e-9)) - Math.atan(a.w / (a.h || 1e-9))) ** 2;
  const alfa = v / (1 - iou + v + 1e-9);
  const ciou = diou - alfa * v;

  return { iou, giou, diou, ciou, inter, uniao, envolvente, caixaEnvolvente: { x: ex, y: ey, w: ew, h: eh } };
}

export const iou = (a, b) => metricasDeCaixa(a, b).iou;

/**
 * Supressão de não-máximos, registrando cada passo para o componente poder
 * animar. Devolve { mantidas: índices, passos: [{ escolhida, suprimidas }] }.
 */
export function nms(caixas, limiarIou) {
  const ordem = caixas.map((_, i) => i).sort((i, j) => caixas[j].conf - caixas[i].conf);
  const viva = new Array(caixas.length).fill(true);
  const mantidas = [];
  const passos = [];

  for (const i of ordem) {
    if (!viva[i]) continue;
    mantidas.push(i);
    const suprimidas = [];
    for (const j of ordem) {
      if (j === i || !viva[j] || mantidas.includes(j)) continue;
      const valor = iou(caixas[i], caixas[j]);
      if (valor > limiarIou) {
        viva[j] = false;
        suprimidas.push({ indice: j, iou: valor });
      }
    }
    passos.push({ escolhida: i, suprimidas });
  }
  return { mantidas, passos };
}

/**
 * Casa detecções com o gabarito, do jeito que os avaliadores (COCO, VOC) fazem:
 * percorre as detecções da mais confiante para a menos, e cada uma fica com o
 * objeto ainda livre de maior IoU, se passar de `iouMin`. Cada objeto só pode
 * ser casado uma vez — a segunda caixa no mesmo inseto é falso positivo.
 */
export function casar(deteccoes, gabarito, { iouMin = 0.5, confMin = 0, porClasse = true } = {}) {
  const ordem = deteccoes
    .map((d, i) => i)
    .filter((i) => deteccoes[i].conf >= confMin)
    .sort((i, j) => deteccoes[j].conf - deteccoes[i].conf);

  const usado = new Array(gabarito.length).fill(false);
  const tp = [];
  const fp = [];

  for (const i of ordem) {
    const d = deteccoes[i];
    let melhor = -1;
    let melhorIou = iouMin;
    gabarito.forEach((g, k) => {
      if (usado[k] || (porClasse && g.classe !== d.classe)) return;
      const v = iou(d, g);
      if (v >= melhorIou) {
        melhorIou = v;
        melhor = k;
      }
    });
    if (melhor >= 0) {
      usado[melhor] = true;
      tp.push({ deteccao: i, gabarito: melhor, iou: melhorIou });
    } else {
      fp.push({ deteccao: i });
    }
  }

  const fn = usado.map((u, k) => (u ? -1 : k)).filter((k) => k >= 0);
  const precisao = tp.length + fp.length ? tp.length / (tp.length + fp.length) : 1;
  const recall = gabarito.length ? tp.length / gabarito.length : 1;
  const f1 = precisao + recall ? (2 * precisao * recall) / (precisao + recall) : 0;
  return { tp, fp, fn, precisao, recall, f1 };
}

/**
 * Curva precisão × recall e AP.
 *
 * O casamento é feito UMA vez, com todas as detecções; depois, andar pela
 * lista ordenada por confiança equivale a baixar o limiar aos poucos.
 * O AP é a área sob a curva depois de torná-la monótona (a "envoltória"):
 * a precisão em cada recall passa a ser a maior precisão dali para a direita.
 */
export function curvaPR(deteccoes, gabarito, iouMin = 0.5, porClasse = true) {
  const { tp } = casar(deteccoes, gabarito, { iouMin, porClasse });
  const acertou = new Set(tp.map((t) => t.deteccao));
  const ordem = deteccoes.map((_, i) => i).sort((i, j) => deteccoes[j].conf - deteccoes[i].conf);

  const pontos = [];
  let certos = 0;
  ordem.forEach((i, posicao) => {
    if (acertou.has(i)) certos++;
    pontos.push({
      conf: deteccoes[i].conf,
      precisao: certos / (posicao + 1),
      recall: gabarito.length ? certos / gabarito.length : 0,
    });
  });

  // envoltória: varre da direita para a esquerda guardando o máximo
  const envoltoria = pontos.map((p) => p.precisao);
  for (let i = envoltoria.length - 2; i >= 0; i--) envoltoria[i] = Math.max(envoltoria[i], envoltoria[i + 1]);

  let ap = 0;
  let recallAnterior = 0;
  pontos.forEach((p, i) => {
    ap += (p.recall - recallAnterior) * envoltoria[i];
    recallAnterior = p.recall;
  });

  return { pontos, envoltoria, ap };
}

/** Perfis do detector simulado: uma "versão 1" e uma "versão 2" do mesmo modelo. */
export const PERFIS = {
  v1: { pDetectar: 0.9, perdaPequeno: 0.22, tremor: 0.04, tremorPx: 1.3, pFalsoDetrito: 0.6, confFalso: [0.3, 0.85], fundo: 5, pDuplicata: 0.12, pTroca: 0.06 },
  v2: { pDetectar: 0.9, perdaPequeno: 0.2, tremor: 0.03, tremorPx: 1.0, pFalsoDetrito: 0.2, confFalso: [0.15, 0.55], fundo: 2, pDuplicata: 0.04, pTroca: 0.04 },
};

/**
 * Um detector de mentira com os defeitos de um de verdade: perde objetos
 * pequenos, erra um pouco a posição, confunde sujeira com inseto, às vezes
 * marca o mesmo objeto duas vezes e troca classes parecidas.
 *
 * Serve para estudar AVALIAÇÃO sem treinar nada: sabemos exatamente que erros
 * foram plantados, então dá para conferir se a métrica os enxerga.
 */
export function simularDetector(gabarito, detritos, { perfil = 'v1', semente = 1, largura = 480, altura = 360 } = {}) {
  const p = typeof perfil === 'string' ? PERFIS[perfil] : perfil;
  const r = rng(semente * 7919 + 13);
  const saida = [];
  const classes = ['mariposa', 'cigarrinha', 'mosca'];

  // O erro de posição tem uma parte proporcional ao tamanho da caixa e uma
  // parte FIXA em pixels. É a parte fixa que castiga objeto pequeno: 1,3 px de
  // erro é irrelevante numa caixa de 50 px e pesado numa de 12.
  const tremer = (c, relativo, pixels) => ({
    x: c.x + r.normal(0, relativo * c.w + pixels),
    y: c.y + r.normal(0, relativo * c.h + pixels),
    w: Math.max(3, c.w * (1 + r.normal(0, relativo)) + r.normal(0, pixels)),
    h: Math.max(3, c.h * (1 + r.normal(0, relativo)) + r.normal(0, pixels)),
  });

  for (const g of gabarito) {
    const lado = Math.sqrt(g.w * g.h);
    // objeto pequeno é mais difícil: a chance de detectar cai abaixo de ~14 px
    const pequeno = Math.max(0, 1 - lado / 14);
    if (r() > p.pDetectar - p.perdaPequeno * pequeno) continue;

    const conf = Math.min(0.99, Math.max(0.05, 0.9 - 0.35 * pequeno + r.normal(0, 0.09)));
    let classe = g.classe;
    if (r() < p.pTroca) classe = classes[(classes.indexOf(g.classe) + 1 + r.inteiro(0, 2)) % 3];
    saida.push({ classe, conf, ...tremer(g, p.tremor, p.tremorPx), origem: 'objeto' });

    if (r() < p.pDuplicata) {
      saida.push({ classe: g.classe, conf: conf * r.entre(0.45, 0.8), ...tremer(g, p.tremor * 2, p.tremorPx * 1.5), origem: 'duplicata' });
    }
  }

  for (const d of detritos ?? []) {
    if (r() > p.pFalsoDetrito) continue;
    saida.push({ classe: r() < 0.6 ? 'mosca' : 'cigarrinha', conf: r.entre(...p.confFalso), ...tremer(d, 0.05, 0.8), origem: 'detrito' });
  }

  for (let i = 0; i < p.fundo; i++) {
    const lado = r.entre(7, 20);
    saida.push({
      classe: classes[r.inteiro(0, 3)],
      conf: r.entre(0.05, 0.3),
      x: r.entre(0, largura - lado),
      y: r.entre(0, altura - lado),
      w: lado,
      h: lado * r.entre(0.7, 1.3),
      origem: 'fundo',
    });
  }
  return saida;
}
