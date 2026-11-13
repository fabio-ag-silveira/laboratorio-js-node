/**
 * Testes do rastreador de brinquedo. Prendem ao comportamento medido o que a
 * lição de rastreamento afirma: sem falhas de detecção há um ID por objeto, e
 * a segunda etapa do ByteTrack reduz a criação de IDs a mais.
 */

import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import { simular, rastrear } from '../publico/js/visuais/cv/rastreador.js';

const FIM = 219;

describe('rastreador', () => {
  test('detector perfeito e objetos afastados: um ID por objeto, sem trocas', () => {
    const quadros = simular(1, 2, 0);
    const r = rastrear(quadros, FIM, { duasEtapas: true, memoria: 6 });
    assert.equal(r.total, 2);
    assert.equal(r.trocas, 0);
  });

  test('com falhas de detecção, nascem IDs a mais', () => {
    let extras = 0;
    for (let s = 1; s <= 10; s++) {
      extras += rastrear(simular(s, 6, 0.25), FIM, { duasEtapas: false, memoria: 3 }).total - 6;
    }
    assert.ok(extras > 10, `IDs a mais em 10 cenas: ${extras}`);
  });

  test('a segunda etapa (detecções fracas) cria menos IDs a mais, na soma de várias cenas', () => {
    let uma = 0;
    let duas = 0;
    for (let s = 1; s <= 20; s++) {
      const quadros = simular(s, 6, 0.15);
      uma += rastrear(quadros, FIM, { duasEtapas: false, memoria: 6 }).total;
      duas += rastrear(quadros, FIM, { duasEtapas: true, memoria: 6 }).total;
    }
    assert.ok(duas < uma, `uma etapa: ${uma} IDs, duas etapas: ${duas} IDs`);
  });

  test('mais memória reduz IDs a mais', () => {
    let curta = 0;
    let longa = 0;
    for (let s = 1; s <= 20; s++) {
      const quadros = simular(s, 6, 0.25);
      curta += rastrear(quadros, FIM, { duasEtapas: false, memoria: 1 }).total;
      longa += rastrear(quadros, FIM, { duasEtapas: false, memoria: 12 }).total;
    }
    assert.ok(longa < curta, `memória 1: ${curta}, memória 12: ${longa}`);
  });

  test('detecção fraca nunca cria rastro novo', () => {
    // um único objeto que só gera detecções fracas: não pode nascer rastro
    const quadros = Array.from({ length: 30 }, (_, t) => ({
      posicoes: [{ x: 50 + t, y: 50 }],
      deteccoes: [{ x: 50 + t, y: 50, conf: 0.3, real: 0 }],
    }));
    assert.equal(rastrear(quadros, 29, { duasEtapas: true, memoria: 6 }).total, 0);
  });
});
