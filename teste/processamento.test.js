/**
 * Testes da biblioteca de processamento de imagem dos componentes de visão.
 *
 * As funções são puras (arrays entram, arrays saem), então dá para testá-las
 * no Node com imagens minúsculas desenhadas à mão — onde o resultado certo se
 * calcula de cabeça.
 */

import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  paraCinza,
  rgbParaHsv,
  convolver,
  KERNELS,
  kernelGaussiano,
  limiarizar,
  otsu,
  blackHat,
  erodir,
  dilatar,
  abrir,
  componentesConexos,
  canny,
  homografia,
  aplicarHomografia,
} from '../publico/js/visuais/cv/processamento.js';

/** Imagem em cinza W×H preenchida por uma função (x, y) → valor. */
function imagem(w, h, f) {
  const a = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) a[y * w + x] = f(x, y);
  return a;
}

describe('cor', () => {
  test('cinza usa os pesos de luminância', () => {
    const c = paraCinza(new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255]));
    assert.deepEqual([...c].map(Math.round), [76, 150, 29]);
  });

  test('HSV das cores primárias e do amarelo', () => {
    assert.deepEqual(rgbParaHsv(255, 0, 0), [0, 1, 1]);
    assert.deepEqual(rgbParaHsv(0, 255, 0), [120, 1, 1]);
    assert.deepEqual(rgbParaHsv(255, 255, 0), [60, 1, 1]);
    assert.equal(rgbParaHsv(80, 80, 80)[1], 0, 'cinza não tem saturação');
  });
});

describe('convolução', () => {
  const img = imagem(6, 5, (x, y) => x * 10 + y);

  test('o kernel identidade devolve a própria imagem', () => {
    assert.deepEqual([...convolver(img, 6, 5, KERNELS.identidade.valores)], [...img]);
  });

  test('a média de uma região lisa é o próprio valor', () => {
    const lisa = imagem(5, 5, () => 42);
    const r = convolver(lisa, 5, 5, KERNELS.media.valores);
    assert.ok([...r].every((v) => Math.abs(v - 42) < 1e-4));
  });

  test('Sobel X dá zero em região lisa e resposta numa borda vertical', () => {
    const degrau = imagem(6, 5, (x) => (x < 3 ? 0 : 100));
    const r = convolver(degrau, 6, 5, KERNELS.sobelX.valores);
    assert.equal(r[2 * 6 + 0], 0);
    assert.equal(r[2 * 6 + 2], 400); // (1 + 2 + 1) × 100
  });

  test('o kernel gaussiano soma 1', () => {
    const soma = kernelGaussiano(7, 1.5).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(soma - 1) < 1e-9);
  });
});

describe('limiar', () => {
  test('Otsu separa dois grupos bem definidos', () => {
    const img = imagem(10, 10, (x) => (x < 5 ? 40 : 200));
    const t = otsu(img);
    assert.ok(t >= 40 && t < 200, `corte ${t} fora do intervalo`);
  });

  test('limiarizar marca o lado pedido', () => {
    const img = Float32Array.from([10, 100, 200]);
    assert.deepEqual([...limiarizar(img, 150, true)], [1, 1, 0]);
    assert.deepEqual([...limiarizar(img, 150, false)], [0, 0, 1]);
  });

  test('black-hat zera o fundo desigual e mantém o objeto escuro pequeno', () => {
    // fundo em rampa (iluminação desigual) com um ponto escuro no meio
    const img = imagem(40, 40, (x, y) => (x === 20 && y === 20 ? 10 : 100 + x * 2));
    const r = blackHat(img, 40, 40, 4);
    assert.ok(r[20 * 40 + 20] > 100, 'o ponto escuro deveria sobressair');
    assert.ok(r[5 * 40 + 5] < 1 && r[30 * 40 + 35] < 1, 'o fundo deveria virar ~0');
  });
});

describe('morfologia e componentes', () => {
  // máscara 7×7 com um quadrado 3×3 no centro e um pixel solto no canto
  const m = new Uint8Array(49);
  for (let y = 2; y <= 4; y++) for (let x = 2; x <= 4; x++) m[y * 7 + x] = 1;
  m[0] = 1;
  const area = (a) => a.reduce((s, v) => s + v, 0);

  test('erosão encolhe e dilatação cresce', () => {
    assert.equal(area(erodir(m, 7, 7, 1)), 1); // sobra só o centro do quadrado
    assert.ok(area(dilatar(m, 7, 7, 1)) > area(m));
  });

  test('abertura remove o pixel solto e preserva o quadrado', () => {
    const a = abrir(m, 7, 7, 1);
    assert.equal(a[0], 0);
    assert.equal(area(a), 9);
  });

  test('componentes conexos contam as ilhas e medem cada uma', () => {
    const { componentes } = componentesConexos(m, 7, 7);
    assert.equal(componentes.length, 2);
    const quadrado = componentes.find((c) => c.area === 9);
    assert.deepEqual([quadrado.x, quadrado.y, quadrado.w, quadrado.h], [2, 2, 3, 3]);
    assert.deepEqual([quadrado.cx, quadrado.cy], [3, 3]);
  });

  test('pixels ligados só pela diagonal são a mesma ilha (vizinhança de 8)', () => {
    const d = Uint8Array.from([1, 0, 0, 1]); // 2×2, diagonal
    assert.equal(componentesConexos(d, 2, 2).componentes.length, 1);
  });
});

describe('Canny', () => {
  test('acha a borda de um degrau e nada na região lisa', () => {
    const img = imagem(30, 20, (x) => (x < 15 ? 20 : 220));
    const { bordas } = canny(img, 30, 20, { sigma: 1, baixo: 20, alto: 60 });
    const linha = [...bordas.slice(10 * 30, 11 * 30)];
    const acesos = linha.map((v, x) => (v ? x : -1)).filter((x) => x >= 0);
    assert.ok(acesos.length >= 1 && acesos.length <= 2, 'a borda deveria ter 1 ou 2 px de largura');
    assert.ok(acesos.every((x) => x >= 13 && x <= 16), `borda fora do degrau: ${acesos}`);
  });
});

describe('homografia', () => {
  const origem = [[0, 0], [100, 0], [100, 50], [0, 50]];
  const destino = [[10, 20], [90, 5], [110, 70], [-5, 60]];

  test('leva cada ponto de origem ao seu destino', () => {
    const H = homografia(origem, destino);
    origem.forEach(([x, y], i) => {
      const [u, v] = aplicarHomografia(H, x, y);
      assert.ok(Math.abs(u - destino[i][0]) < 1e-6 && Math.abs(v - destino[i][1]) < 1e-6);
    });
  });

  test('a identidade sai quando origem e destino coincidem', () => {
    const H = homografia(origem, origem);
    const esperado = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    H.forEach((v, i) => assert.ok(Math.abs(v - esperado[i]) < 1e-9));
  });

  test('pontos colineares não definem homografia', () => {
    assert.equal(homografia([[0, 0], [1, 1], [2, 2], [3, 3]], destino), null);
  });
});
