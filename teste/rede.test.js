/**
 * Testes do que as LIÇÕES afirmam sobre os componentes interativos.
 *
 * "Sem camada oculta a rede não resolve o círculo", "com 0,45 o NMS apaga um
 * inseto de verdade": frases assim só valem enquanto o código se comportar
 * desse jeito. Estes testes prendem cada afirmação ao comportamento medido —
 * se alguém mexer num parâmetro e a frase deixar de ser verdade, o teste avisa.
 */

import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import { gerarDados, criarRede, passoDeTreino, avaliar, ARQUITETURAS } from '../publico/js/visuais/cv/rede.js';
import { CENARIOS } from '../publico/js/visuais/cv/nms.js';
import { nms } from '../publico/js/visuais/cv/deteccao.js';

function treinar({ tipo, arquitetura, epocas, taxa = 0.5, decaimento = 0, n = 120, ruido = 0.06, semente = 1 }) {
  const pontos = gerarDados(tipo, n, ruido, semente);
  const treino = pontos.filter((p) => !p.validacao);
  const validacao = pontos.filter((p) => p.validacao);
  const rede = criarRede(ARQUITETURAS[arquitetura].camadas, semente * 31 + 7);
  let perda = 0;
  let menorPerdaVal = Infinity;
  for (let e = 0; e < epocas; e++) {
    perda = passoDeTreino(rede, treino, taxa, decaimento);
    if (e % 20 === 0) menorPerdaVal = Math.min(menorPerdaVal, avaliar(rede, validacao).perda);
  }
  return { perda, treino: avaliar(rede, treino), validacao: avaliar(rede, validacao), menorPerdaVal };
}

describe('rede neural do componente', () => {
  test('a perda de treino cai com o treino', () => {
    const antes = treinar({ tipo: 'linear', arquitetura: 'pequena', epocas: 1 });
    const depois = treinar({ tipo: 'linear', arquitetura: 'pequena', epocas: 400 });
    assert.ok(depois.perda < antes.perda * 0.5, `${antes.perda} → ${depois.perda}`);
  });

  test('dois grupos se separam até sem camada oculta', () => {
    const r = treinar({ tipo: 'linear', arquitetura: 'nenhuma', epocas: 600 });
    assert.ok(r.treino.acerto > 0.93, `acerto ${r.treino.acerto}`);
  });

  test('sem camada oculta, o círculo não se resolve (fronteira é uma reta)', () => {
    const r = treinar({ tipo: 'circulo', arquitetura: 'nenhuma', epocas: 3000 });
    assert.ok(r.treino.acerto < 0.8, `acerto ${r.treino.acerto}`);
  });

  test('uma camada oculta de 4 resolve o círculo', () => {
    const r = treinar({ tipo: 'circulo', arquitetura: 'pequena', epocas: 3000 });
    assert.ok(r.treino.acerto > 0.92, `acerto ${r.treino.acerto}`);
  });

  test('o xor precisa de camada oculta', () => {
    const sem = treinar({ tipo: 'xor', arquitetura: 'nenhuma', epocas: 3000 });
    const com = treinar({ tipo: 'xor', arquitetura: 'media', epocas: 3000 });
    assert.ok(sem.treino.acerto < 0.75, `sem oculta: ${sem.treino.acerto}`);
    assert.ok(com.treino.acerto > 0.9, `com oculta: ${com.treino.acerto}`);
  });

  test('rede grande com pouco dado ruidoso sobreajusta', () => {
    const r = treinar({ tipo: 'circulo', arquitetura: 'grande', epocas: 6000, n: 40, ruido: 0.25, taxa: 1 });
    // decorou o treino e a validação piorou em relação ao melhor ponto
    assert.ok(r.treino.acerto - r.validacao.acerto > 0.1, `treino ${r.treino.acerto} val ${r.validacao.acerto}`);
    assert.ok(r.validacao.perda > r.menorPerdaVal * 1.3, `val ${r.validacao.perda} mínimo ${r.menorPerdaVal}`);
  });

  test('decaimento de peso reduz o sobreajuste', () => {
    const base = { tipo: 'circulo', arquitetura: 'grande', epocas: 6000, n: 40, ruido: 0.25, taxa: 1 };
    const sem = treinar(base);
    const com = treinar({ ...base, decaimento: 0.02 });
    assert.ok(com.validacao.perda < sem.validacao.perda, `sem ${sem.validacao.perda} com ${com.validacao.perda}`);
  });
});

describe('cenários do NMS', () => {
  /** Para um limiar: quantos insetos ficaram sem caixa e quantas caixas sobram. */
  function resultado(nome, limiar) {
    const c = CENARIOS[nome];
    const caixas = c.caixas.map(([x, y, w, h, conf, dono]) => ({ x, y, w, h, conf, dono }));
    const mantidas = nms(caixas, limiar).mantidas.map((i) => caixas[i]);
    const donos = new Set(mantidas.map((m) => m.dono).filter((d) => d >= 0));
    const apagados = c.insetos.length - donos.size;
    return { apagados, sobrando: mantidas.length - donos.size, total: mantidas.length };
  }
  const certo = (r) => r.apagados === 0 && r.sobrando === 0;
  const limiares = Array.from({ length: 17 }, (_, i) => Number((0.1 + i * 0.05).toFixed(2)));

  test('um inseto: qualquer limiar até 0,60 deixa uma caixa só', () => {
    for (const t of limiares.filter((v) => v <= 0.6)) assert.ok(certo(resultado('um', t)), `falhou em ${t}`);
  });

  test('dois sobrepostos: 0,45 apaga um inseto de verdade', () => {
    const r = resultado('dois', 0.45);
    assert.equal(r.apagados, 1);
  });

  test('dois sobrepostos: só funciona numa faixa, de 0,55 a 0,70', () => {
    const bons = limiares.filter((t) => certo(resultado('dois', t)));
    assert.deepEqual(bons, [0.55, 0.6, 0.65, 0.7]);
  });

  test('aglomerado: nenhum limiar dá o resultado certo', () => {
    const bons = limiares.filter((t) => certo(resultado('fila', t)));
    assert.deepEqual(bons, []);
  });

  test('aglomerado: existe limiar em que a contagem bate pelo motivo errado', () => {
    const enganosos = limiares.filter((t) => {
      const r = resultado('fila', t);
      return r.total === CENARIOS.fila.insetos.length && !certo(r);
    });
    assert.ok(enganosos.length > 0);
  });
});
