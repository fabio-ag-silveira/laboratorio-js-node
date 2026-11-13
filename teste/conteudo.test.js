/**
 * Testes do CONTEÚDO — a rede de segurança de quem escreve lições.
 *
 * Com mais de cem lições, erro de digitação vira rotina: um bloco com tipo
 * errado some da tela em silêncio, um componente com nome trocado nunca
 * carrega, uma solução de exercício deixa de passar nos próprios testes.
 * Estes testes pegam tudo isso sem abrir o navegador.
 *
 * Repare que os testes são GERADOS a partir dos dados: um `for` cria um teste
 * por exercício. É o `pytest.mark.parametrize` feito à mão.
 */

import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { carregarTrilhas, resumir } from '../conteudo/index.js';
import { rodarUmTeste } from '../publico/js/assercoes.js';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const trilhas = await carregarTrilhas();

const TIPOS = ['texto', 'nota', 'py-js', 'comparacao', 'codigo', 'tabela', 'visual', 'quiz', 'exercicio'];
const ALVOS = [null, undefined, 'browser', 'node', 'python', 'csharp'];
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Todas as lições, já com o endereço completo para a mensagem de erro. */
const licoes = trilhas.flatMap((t) =>
  t.modulos.flatMap((m) => m.licoes.map((l) => ({ onde: `${t.id}/${m.id}/${l.id}`, licao: l }))),
);

describe('catálogo', () => {
  test('há trilhas, e os ids são únicos', () => {
    assert.ok(trilhas.length > 0);
    const ids = trilhas.map((t) => t.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  test('toda trilha tem os campos da página inicial', () => {
    for (const t of trilhas) {
      assert.match(t.id, ID, `id inválido: ${t.id}`);
      for (const campo of ['titulo', 'subtitulo', 'icone', 'cor']) {
        assert.ok(t[campo], `${t.id}: falta "${campo}"`);
      }
      assert.ok(Array.isArray(t.modulos), `${t.id}: modulos deve ser array`);
      // trilha vazia precisa dizer o que vem aí
      if (!t.modulos.length) assert.ok(t.previsto?.length, `${t.id}: trilha vazia sem "previsto"`);
    }
  });

  test('o resumo não carrega os blocos', () => {
    const resumo = resumir(trilhas.find((t) => t.modulos.length));
    assert.equal(resumo.modulos[0].licoes[0].blocos, undefined);
  });

  test('ids de módulo e de lição são únicos dentro da trilha', () => {
    for (const t of trilhas) {
      const modulos = t.modulos.map((m) => m.id);
      assert.equal(new Set(modulos).size, modulos.length, `${t.id}: módulo repetido`);
      for (const m of t.modulos) {
        assert.match(m.id, ID, `${t.id}: id de módulo inválido "${m.id}"`);
        const ids = m.licoes.map((l) => l.id);
        assert.equal(new Set(ids).size, ids.length, `${t.id}/${m.id}: lição repetida`);
      }
    }
  });
});

describe('formato das lições', () => {
  test('toda lição tem título, resumo, minutos e blocos', () => {
    for (const { onde, licao } of licoes) {
      assert.match(licao.id, ID, `${onde}: id inválido`);
      assert.ok(licao.titulo, `${onde}: sem título`);
      assert.ok(licao.resumo, `${onde}: sem resumo`);
      assert.ok(Number.isFinite(licao.minutos), `${onde}: minutos deve ser número`);
      assert.ok(licao.blocos?.length, `${onde}: sem blocos`);
    }
  });

  test('todo bloco é de um tipo conhecido e está completo', () => {
    for (const { onde, licao } of licoes) {
      licao.blocos.forEach((b, i) => {
        const aqui = `${onde} bloco ${i} (${b.t})`;
        assert.ok(TIPOS.includes(b.t), `${aqui}: tipo desconhecido`);

        if (b.t === 'texto' || b.t === 'nota') assert.equal(typeof b.md, 'string', `${aqui}: falta md`);
        if (b.t === 'nota') assert.ok(b.estilo, `${aqui}: falta estilo`);
        if (b.t === 'codigo') {
          assert.equal(typeof b.codigo, 'string', `${aqui}: falta codigo`);
          assert.ok(ALVOS.includes(b.rodar), `${aqui}: rodar="${b.rodar}" não existe`);
        }
        if (b.t === 'py-js') assert.ok(b.py && b.js, `${aqui}: falta py ou js`);
        if (b.t === 'comparacao') assert.ok(b.esq?.codigo && b.dir?.codigo, `${aqui}: falta esq/dir`);
        if (b.t === 'tabela') {
          assert.ok(b.colunas?.length && b.linhas?.length, `${aqui}: tabela vazia`);
          for (const l of b.linhas) {
            assert.equal(l.length, b.colunas.length, `${aqui}: linha com nº de colunas errado: ${l[0]}`);
          }
        }
        if (b.t === 'quiz') {
          assert.ok(b.pergunta && b.explicacao, `${aqui}: falta pergunta ou explicacao`);
          assert.ok(b.opcoes?.length >= 2, `${aqui}: precisa de 2+ opções`);
          assert.ok(Number.isInteger(b.correta) && b.correta >= 0 && b.correta < b.opcoes.length, `${aqui}: "correta" fora do intervalo`);
        }
        if (b.t === 'exercicio') {
          assert.ok(b.enunciado && typeof b.inicial === 'string', `${aqui}: falta enunciado/inicial`);
          assert.ok(b.testes?.length, `${aqui}: sem testes`);
          assert.ok(b.solucao, `${aqui}: sem solução`);
        }
      });
    }
  });

  test('todo componente visual citado existe em publico/js/visuais/', () => {
    for (const { onde, licao } of licoes) {
      for (const b of licao.blocos.filter((x) => x.t === 'visual')) {
        assert.match(b.componente ?? '', /^[a-z0-9-]+\/[a-z0-9-]+$/, `${onde}: nome de componente inválido`);
        const arquivo = path.join(RAIZ, 'publico', 'js', 'visuais', `${b.componente}.js`);
        assert.ok(fs.existsSync(arquivo), `${onde}: não existe ${b.componente}.js`);
      }
    }
  });
});

describe('exercícios: a solução passa nos próprios testes', () => {
  for (const { onde, licao } of licoes) {
    for (const ex of licao.blocos.filter((b) => b.t === 'exercicio')) {
      for (const t of ex.testes) {
        test(`${onde} — ${t.nome}`, async () => {
          await rodarUmTeste({ preludio: ex.preludio ?? '', codigoUsuario: ex.solucao, codigoTeste: t.codigo });
        });
      }
    }
  }

  test('o código inicial NÃO passa em tudo (senão o exercício já vem resolvido)', async () => {
    for (const { onde, licao } of licoes) {
      for (const ex of licao.blocos.filter((b) => b.t === 'exercicio')) {
        let falhou = false;
        for (const t of ex.testes) {
          try {
            await rodarUmTeste({ preludio: ex.preludio ?? '', codigoUsuario: ex.inicial, codigoTeste: t.codigo });
          } catch {
            falhou = true;
            break;
          }
        }
        assert.ok(falhou, `${onde}: o código inicial passa em todos os testes`);
      }
    }
  });
});
