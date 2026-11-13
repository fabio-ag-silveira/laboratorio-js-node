/**
 * Testes da matemática de detecção: IoU, NMS, casamento com o gabarito e AP.
 * Casos pequenos, com resposta que dá para conferir no papel.
 */

import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import { metricasDeCaixa, iou, nms, casar, curvaPR, simularDetector } from '../publico/js/visuais/cv/deteccao.js';

const cx = (x, y, w, h, extra = {}) => ({ x, y, w, h, ...extra });
const perto = (a, b, tol = 1e-9) => Math.abs(a - b) < tol;

describe('IoU e variantes', () => {
  test('caixas idênticas têm IoU 1 e todas as variantes iguais a 1', () => {
    const m = metricasDeCaixa(cx(10, 10, 20, 20), cx(10, 10, 20, 20));
    for (const k of ['iou', 'giou', 'diou', 'ciou']) assert.ok(perto(m[k], 1), `${k} = ${m[k]}`);
  });

  test('metade sobreposta: interseção 200, união 600, IoU 1/3', () => {
    const m = metricasDeCaixa(cx(0, 0, 20, 20), cx(10, 0, 20, 20));
    assert.equal(m.inter, 200);
    assert.equal(m.uniao, 600);
    assert.ok(perto(m.iou, 1 / 3));
  });

  test('sem sobreposição o IoU é 0, mas GIoU e DIoU pioram com a distância', () => {
    const a = cx(0, 0, 10, 10);
    const perto_ = metricasDeCaixa(a, cx(20, 0, 10, 10));
    const longe = metricasDeCaixa(a, cx(80, 0, 10, 10));
    assert.equal(perto_.iou, 0);
    assert.equal(longe.iou, 0);
    assert.ok(longe.giou < perto_.giou && perto_.giou < 0);
    assert.ok(longe.diou < perto_.diou && perto_.diou < 0);
  });

  test('o mesmo erro de 2 px pesa muito mais num objeto pequeno', () => {
    const pequeno = iou(cx(0, 0, 6, 6), cx(2, 2, 6, 6));
    const grande = iou(cx(0, 0, 60, 60), cx(2, 2, 60, 60));
    assert.ok(pequeno < 0.3, `pequeno ${pequeno}`);
    assert.ok(grande > 0.85, `grande ${grande}`);
  });
});

describe('NMS', () => {
  const caixas = [
    cx(0, 0, 10, 10, { conf: 0.9 }),
    cx(1, 1, 10, 10, { conf: 0.8 }), // quase a mesma da primeira
    cx(50, 50, 10, 10, { conf: 0.7 }), // outro objeto
  ];

  test('mantém a mais confiante de cada grupo', () => {
    assert.deepEqual(nms(caixas, 0.5).mantidas, [0, 2]);
  });

  test('com limiar alto, a duplicata sobrevive', () => {
    assert.deepEqual(nms(caixas, 0.9).mantidas, [0, 1, 2]);
  });

  test('registra quem suprimiu quem', () => {
    const { passos } = nms(caixas, 0.5);
    assert.equal(passos[0].escolhida, 0);
    assert.deepEqual(passos[0].suprimidas.map((s) => s.indice), [1]);
  });
});

describe('casamento com o gabarito', () => {
  const gabarito = [cx(0, 0, 10, 10, { classe: 'mosca' }), cx(50, 50, 10, 10, { classe: 'mosca' })];

  test('uma detecção boa por objeto: tudo TP', () => {
    const d = [cx(1, 0, 10, 10, { classe: 'mosca', conf: 0.9 }), cx(50, 51, 10, 10, { classe: 'mosca', conf: 0.8 })];
    const r = casar(d, gabarito);
    assert.equal(r.tp.length, 2);
    assert.equal(r.fp.length, 0);
    assert.equal(r.fn.length, 0);
    assert.equal(r.f1, 1);
  });

  test('a segunda caixa no mesmo objeto é falso positivo', () => {
    const d = [cx(0, 0, 10, 10, { classe: 'mosca', conf: 0.9 }), cx(1, 1, 10, 10, { classe: 'mosca', conf: 0.6 })];
    const r = casar(d, gabarito);
    assert.equal(r.tp.length, 1);
    assert.equal(r.fp.length, 1);
    assert.deepEqual(r.fn, [1]);
  });

  test('classe errada não casa, a menos que a classe seja ignorada', () => {
    const d = [cx(0, 0, 10, 10, { classe: 'mariposa', conf: 0.9 })];
    assert.equal(casar(d, gabarito).tp.length, 0);
    assert.equal(casar(d, gabarito, { porClasse: false }).tp.length, 1);
  });

  test('o limiar de confiança descarta detecções antes do casamento', () => {
    const d = [cx(0, 0, 10, 10, { classe: 'mosca', conf: 0.2 })];
    assert.equal(casar(d, gabarito, { confMin: 0.5 }).tp.length, 0);
    assert.equal(casar(d, gabarito, { confMin: 0.5 }).fn.length, 2);
  });
});

describe('curva PR e AP', () => {
  const gabarito = [0, 20, 40, 60].map((x) => cx(x, 0, 10, 10, { classe: 'a' }));

  test('detector perfeito tem AP 1', () => {
    const d = gabarito.map((g, i) => ({ ...g, conf: 0.9 - i * 0.1 }));
    assert.ok(perto(curvaPR(d, gabarito).ap, 1));
  });

  test('AP calculado à mão: certo, errado, certo', () => {
    // ordem por confiança: TP, FP, TP — e dois objetos ficam sem detecção.
    // P/R: (1, .25), (.5, .25), (.667, .5). Envoltória: 1, .667, .667.
    // AP = .25×1 + 0×.667 + .25×.667 = .41667
    const d = [
      { ...gabarito[0], conf: 0.9 },
      cx(200, 200, 10, 10, { classe: 'a', conf: 0.8 }),
      { ...gabarito[1], conf: 0.7 },
    ];
    assert.ok(perto(curvaPR(d, gabarito).ap, 0.25 + 0.25 * (2 / 3), 1e-9));
  });

  test('um falso positivo de confiança baixa não reduz o AP', () => {
    const bons = gabarito.map((g, i) => ({ ...g, conf: 0.9 - i * 0.1 }));
    const comLixo = [...bons, cx(300, 300, 10, 10, { classe: 'a', conf: 0.01 })];
    assert.ok(perto(curvaPR(comLixo, gabarito).ap, 1));
  });
});

describe('detector simulado', () => {
  const gabarito = Array.from({ length: 40 }, (_, i) => cx(20 + (i % 8) * 50, 20 + Math.floor(i / 8) * 50, 22, 16, { classe: 'cigarrinha' }));
  const detritos = Array.from({ length: 20 }, (_, i) => cx(40 + (i % 5) * 80, 300 + Math.floor(i / 5) * 12, 10, 10, { classe: 'detrito' }));

  test('é determinístico para a mesma semente', () => {
    const a = simularDetector(gabarito, detritos, { semente: 5 });
    const b = simularDetector(gabarito, detritos, { semente: 5 });
    assert.deepEqual(a, b);
  });

  test('a v2 gera menos falsos positivos de sujeira que a v1', () => {
    const contar = (perfil) => {
      let n = 0;
      for (let s = 1; s <= 20; s++) n += simularDetector(gabarito, detritos, { perfil, semente: s }).filter((d) => d.origem === 'detrito').length;
      return n;
    };
    assert.ok(contar('v2') < contar('v1') * 0.6);
  });
});
