/**
 * Convolução na prática: edite o kernel 3×3, veja a imagem resultante e a
 * conta exata (vizinhança × kernel) do pixel sob o mouse.
 */

import { painel, quadro, chips, fonteDeImagem, pixelsDe, desenharCinza, el } from './base.js';
import { paraCinza, convolver, KERNELS } from './processamento.js';

export default function criar() {
  const p = painel('Convolução', 'passe o mouse na imagem da esquerda para ver a conta daquele pixel');

  const entrada = quadro('entrada (cinza)');
  entrada.canvas.classList.add('mira');
  const saida = quadro('saída');
  const lateral = el('div', 'vis-lateral');
  p.corpo.append(entrada.figura, saida.figura, lateral);

  let cinza = null;
  let largura = 0;
  let altura = 0;
  let resultado = null;
  let kernel = [...KERNELS.gaussiano.valores];
  let comSinal = false;
  let ponto = null;

  // ---- grade editável do kernel ----------------------------------------
  const titulo = el('h4', '', 'Kernel 3×3');
  const grade = el('div', 'vis-grade');
  grade.style.gridTemplateColumns = 'repeat(3, 1fr)';
  const campos = kernel.map((v, i) => {
    const campo = el('input');
    campo.inputMode = 'decimal';
    campo.addEventListener('input', () => {
      const n = Number(campo.value.replace(',', '.'));
      if (Number.isFinite(n)) {
        kernel[i] = n;
        calcular();
      }
    });
    grade.append(campo);
    return campo;
  });
  const nota = el('p', '', '');
  nota.style.cssText = 'margin:8px 0 0;font-size:12.5px;line-height:1.5';
  const conta = el('div', 'vis-conta');
  lateral.append(titulo, grade, nota, conta);

  const formatar = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(3).replace(/0+$/, ''));

  function escreverKernel() {
    campos.forEach((c, i) => (c.value = formatar(kernel[i])));
  }

  function calcular() {
    if (!cinza) return;
    resultado = convolver(cinza, largura, altura, kernel);
    // kernel de derivada dá valores negativos: somamos 128 para o zero virar
    // cinza médio (escuro = negativo, claro = positivo)
    const visivel = new Uint8ClampedArray(resultado.length);
    for (let i = 0; i < resultado.length; i++) visivel[i] = comSinal ? resultado[i] / 2 + 128 : resultado[i];
    desenharCinza(saida.canvas, visivel, largura, altura);
    saida.titulo.textContent = comSinal ? 'saída (cinza médio = zero; claro = positivo)' : 'saída';
    pintarEntrada();
    explicar();
  }

  function pintarEntrada() {
    desenharCinza(entrada.canvas, cinza, largura, altura);
    if (!ponto) return;
    entrada.ctx.strokeStyle = '#ff3b6b';
    entrada.ctx.lineWidth = 1.5;
    entrada.ctx.strokeRect(ponto.x - 2, ponto.y - 2, 4, 4);
  }

  function explicar() {
    const soma = kernel.reduce((a, b) => a + b, 0);
    let texto = `soma do kernel = <b>${formatar(Number(soma.toFixed(3)))}</b> `;
    texto += Math.abs(soma - 1) < 0.01 ? '(preserva o brilho)' : Math.abs(soma) < 0.01 ? '(região lisa vira zero)' : '(altera o brilho)';

    if (ponto) {
      const termos = [];
      for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) {
          const x = Math.min(largura - 1, Math.max(0, ponto.x + i));
          const y = Math.min(altura - 1, Math.max(0, ponto.y + j));
          termos.push(`${Math.round(cinza[y * largura + x])}·${formatar(kernel[(j + 1) * 3 + i + 1])}`);
        }
      }
      const r = resultado[ponto.y * largura + ponto.x];
      texto += `<br><br>pixel (${ponto.x}, ${ponto.y}):<br>${termos.slice(0, 3).join(' + ')}<br>+ ${termos.slice(3, 6).join(' + ')}<br>+ ${termos.slice(6).join(' + ')}<br>= <b>${r.toFixed(1)}</b>`;
    }
    conta.innerHTML = texto;
  }

  entrada.canvas.addEventListener('pointermove', (e) => {
    if (!cinza) return;
    const caixa = entrada.canvas.getBoundingClientRect();
    ponto = {
      x: Math.min(largura - 1, Math.max(0, Math.floor(((e.clientX - caixa.left) / caixa.width) * largura))),
      y: Math.min(altura - 1, Math.max(0, Math.floor(((e.clientY - caixa.top) / caixa.height) * altura))),
    };
    pintarEntrada();
    explicar();
  });

  const prontos = chips(Object.entries(KERNELS).map(([k, d]) => [k, d.nome]), 'gaussiano', (nome) => {
    const d = KERNELS[nome];
    kernel = [...d.valores];
    comSinal = Boolean(d.comSinal);
    nota.textContent = d.nota;
    escreverKernel();
    calcular();
  });

  const origem = fonteDeImagem({
    alvoDeSoltar: p.corpo,
    aoTrocar({ canvas }) {
      const px = pixelsDe(canvas);
      largura = px.width;
      altura = px.height;
      cinza = paraCinza(px.data);
      ponto = null;
      calcular();
    },
  });

  p.controles.append(prontos.elemento, origem.elemento);
  p.leitura.innerHTML =
    'Todo filtro desta lista é a <b>mesma operação</b> com nove números diferentes. Uma CNN é isto com os números <b>aprendidos</b> em vez de escolhidos por você.';
  nota.textContent = KERNELS.gaussiano.nota;
  escreverKernel();
  origem.gerar();
  return p.raiz;
}
