/**
 * Executor de exercícios.
 *
 * Cada teste roda num escopo NOVO, montado assim:
 *
 *     prelúdio do exercício   (funções de apoio, quando houver)
 *     código que você escreveu
 *     código do teste
 *
 * Escopo novo a cada teste significa que um teste não contamina o outro —
 * exatamente o que o pytest faz recriando as fixtures.
 */

import { criarEditor } from './editor.js';
import { renderizarMarkdown } from './markdown.js';
import { formatar } from './execucao.js';

/** Comparação profunda, para arrays e objetos. */
function iguaisProfundo(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  const ca = Object.keys(a);
  const cb = Object.keys(b);
  if (ca.length !== cb.length) return false;
  return ca.every((k) => Object.hasOwn(b, k) && iguaisProfundo(a[k], b[k]));
}

/** As asserções disponíveis dentro dos testes. */
function esperar(valor) {
  return {
    igualA(esperado) {
      if (!Object.is(valor, esperado)) {
        throw new Error(`esperava ${formatar(esperado, 1)}, recebi ${formatar(valor, 1)}`);
      }
    },
    pareceCom(esperado) {
      if (!iguaisProfundo(valor, esperado)) {
        throw new Error(`esperava ${formatar(esperado, 1)}\nrecebi   ${formatar(valor, 1)}`);
      }
    },
    verdadeiro() {
      if (valor !== true) throw new Error(`esperava true, recebi ${formatar(valor, 1)}`);
    },
    contem(item) {
      const tem = Array.isArray(valor) ? valor.some((v) => iguaisProfundo(v, item)) : String(valor).includes(item);
      if (!tem) throw new Error(`esperava que ${formatar(valor, 1)} contivesse ${formatar(item, 1)}`);
    },
  };
}

async function rodarUmTeste({ preludio = '', codigoUsuario, codigoTeste }) {
  const fabrica = new Function(
    'esperar',
    'console',
    `return (async () => {
${preludio}
${codigoUsuario}
${codigoTeste}
})();`,
  );
  // console silencioso: o print do usuário não polui a lista de testes
  await fabrica(esperar, { log() {}, error() {}, warn() {}, info() {}, debug() {} });
}

export function criarExercicio(exercicio, { aoResolver } = {}) {
  const raiz = document.createElement('section');
  raiz.className = 'exercicio';

  const topo = document.createElement('div');
  topo.className = 'exercicio-topo';
  topo.innerHTML = '<span>✎</span><span>Exercício</span>';

  const enunciado = document.createElement('div');
  enunciado.className = 'exercicio-enunciado prosa';
  enunciado.innerHTML = renderizarMarkdown(exercicio.enunciado);

  const editor = criarEditor(exercicio.inicial, { minLinhas: 6 });

  const acoes = document.createElement('div');
  acoes.className = 'exercicio-acoes';

  const btRodar = document.createElement('button');
  btRodar.className = 'botao botao-principal';
  btRodar.textContent = '▶ Rodar testes';

  const btDica = document.createElement('button');
  btDica.className = 'botao';
  btDica.textContent = '💡 Dica';

  const btSolucao = document.createElement('button');
  btSolucao.className = 'botao';
  btSolucao.textContent = 'Ver solução';

  const btReiniciar = document.createElement('button');
  btReiniciar.className = 'botao';
  btReiniciar.textContent = '↺';
  btReiniciar.title = 'Voltar ao código inicial';

  const espaco = document.createElement('span');
  espaco.className = 'espaco';

  acoes.append(btRodar, btDica, espaco, btReiniciar);
  if (exercicio.solucao) acoes.append(btSolucao);

  const painelDica = document.createElement('div');
  painelDica.className = 'nota nota-dica';
  painelDica.hidden = true;
  painelDica.innerHTML = `<span class="nota-icone">💡</span><div class="nota-conteudo prosa">${renderizarMarkdown(
    exercicio.dica ?? 'Sem dica para este.',
  )}</div>`;
  painelDica.style.margin = '0 16px 12px';

  const listaTestes = document.createElement('div');
  listaTestes.className = 'testes';
  listaTestes.hidden = true;

  const banner = document.createElement('p');
  banner.className = 'banner-sucesso';
  banner.hidden = true;

  raiz.append(topo, enunciado, editor.elemento, acoes, painelDica, listaTestes, banner);

  // ---- comportamento ---------------------------------------------------

  btDica.addEventListener('click', () => {
    painelDica.hidden = !painelDica.hidden;
  });

  btReiniciar.addEventListener('click', () => {
    editor.valor = exercicio.inicial;
    listaTestes.hidden = true;
    banner.hidden = true;
    raiz.classList.remove('resolvido');
  });

  btSolucao.addEventListener('click', () => {
    editor.valor = exercicio.solucao;
    btSolucao.textContent = 'Solução aplicada';
    btSolucao.disabled = true;
  });

  async function rodarTestes() {
    btRodar.disabled = true;
    btRodar.textContent = 'rodando…';
    listaTestes.hidden = false;
    listaTestes.innerHTML = '';
    banner.hidden = true;

    const codigoUsuario = editor.valor;
    let todosPassaram = true;

    for (const teste of exercicio.testes) {
      const linha = document.createElement('div');
      linha.className = 'teste';

      let motivo = null;
      try {
        await rodarUmTeste({
          preludio: exercicio.preludio ?? '',
          codigoUsuario,
          codigoTeste: teste.codigo,
        });
      } catch (erro) {
        motivo = erro instanceof Error ? erro.message : String(erro);
        todosPassaram = false;
      }

      linha.classList.add(motivo ? 'teste-falhou' : 'teste-ok');
      const icone = document.createElement('span');
      icone.className = 'teste-icone';
      icone.textContent = motivo ? '✕' : '✓';

      const nome = document.createElement('span');
      nome.className = 'teste-nome';
      nome.textContent = teste.nome;
      if (motivo) {
        const det = document.createElement('span');
        det.className = 'teste-motivo';
        det.textContent = motivo;
        nome.append(det);
      }

      linha.append(icone, nome);
      listaTestes.append(linha);
    }

    raiz.classList.toggle('resolvido', todosPassaram);
    if (todosPassaram) {
      banner.hidden = false;
      banner.textContent = `✓ Todos os ${exercicio.testes.length} testes passaram.`;
      aoResolver?.();
    }

    btRodar.disabled = false;
    btRodar.textContent = '▶ Rodar testes';
  }

  btRodar.addEventListener('click', rodarTestes);
  raiz.addEventListener('rodar', rodarTestes); // Ctrl+Enter no editor

  return raiz;
}
