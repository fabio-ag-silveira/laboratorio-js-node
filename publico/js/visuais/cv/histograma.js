/**
 * Histograma ao vivo: brilho, contraste e gama mexem na imagem e você vê a
 * distribuição dos tons se deslocar, esticar e estourar nas pontas.
 */

import { painel, quadro, slider, chips, fonteDeImagem, pixelsDe, tema, aoMudarTema, el } from './base.js';
import { histograma } from './processamento.js';

const CENARIOS = {
  normal: { rotulo: 'bem exposta', brilho: 0, contraste: 1, gama: 1 },
  escura: { rotulo: 'subexposta', brilho: -70, contraste: 0.9, gama: 1 },
  estourada: { rotulo: 'estourada', brilho: 75, contraste: 1.25, gama: 1 },
  lavada: { rotulo: 'sem contraste', brilho: 20, contraste: 0.35, gama: 1 },
};

export default function criar() {
  const p = painel('Histograma e exposição', 'a distribuição dos tons de cinza da imagem');

  const imagem = quadro('imagem ajustada');
  const grafico = quadro('histograma do brilho (canal mais claro de cada pixel)', 480, 260);
  p.corpo.append(imagem.figura, grafico.figura);

  let fonte = null;
  let equalizar = false;

  function pintar() {
    if (!fonte) return;
    const { width: w, height: h, data } = fonte;
    const brilho = sBrilho.valor;
    const contraste = sContraste.valor;
    const gama = sGama.valor;

    // tabela de consulta: o ajuste é o mesmo para todo pixel de mesmo valor,
    // então calculamos 256 respostas uma vez em vez de uma conta por pixel
    const tabela = new Uint8ClampedArray(256);
    for (let v = 0; v < 256; v++) {
      let x = (v - 128) * contraste + 128 + brilho;
      x = Math.max(0, Math.min(255, x));
      tabela[v] = 255 * (x / 255) ** (1 / gama);
    }

    const saida = imagem.ctx.createImageData(w, h);
    // O brilho de cada pixel é o seu canal MAIS CLARO (o V do HSV), e não a
    // média em cinza: num cartão amarelo, R e G estouram muito antes do B, e
    // a média esconde o estouro.
    const cinza = new Uint8Array(w * h);
    let estourados = 0;
    let afundados = 0;
    for (let i = 0, j = 0; i < w * h; i++, j += 4) {
      const r = tabela[data[j]];
      const g = tabela[data[j + 1]];
      const b = tabela[data[j + 2]];
      saida.data[j] = r;
      saida.data[j + 1] = g;
      saida.data[j + 2] = b;
      saida.data[j + 3] = 255;
      const v = Math.max(r, g, b);
      cinza[i] = v;
      if (v >= 255) estourados++;
      if (v <= 0) afundados++;
    }

    if (equalizar) {
      // equalização: usa a distribuição acumulada como função de transferência,
      // espalhando os tons por toda a faixa
      const hist = histograma(cinza);
      const acumulado = new Float64Array(256);
      let soma = 0;
      for (let v = 0; v < 256; v++) {
        soma += hist[v];
        acumulado[v] = soma / cinza.length;
      }
      for (let i = 0, j = 0; i < w * h; i++, j += 4) {
        const antes = cinza[i];
        const depois = Math.round(acumulado[antes] * 255);
        const ganho = antes > 0 ? depois / antes : 1;
        saida.data[j] *= ganho;
        saida.data[j + 1] *= ganho;
        saida.data[j + 2] *= ganho;
        cinza[i] = depois;
      }
    }

    imagem.ctx.putImageData(saida, 0, 0);

    const hist = histograma(cinza);
    desenharGrafico(hist);

    // o corte é o da CAPTURA simulada, medido antes de qualquer equalização
    const n = cinza.length;
    const pretos = (afundados / n) * 100;
    const brancos = (estourados / n) * 100;
    let media = 0;
    for (let v = 0; v < 256; v++) media += v * hist[v];
    media /= n;

    let aviso = 'Sem corte nas pontas: nenhum detalhe foi perdido.';
    if (brancos > 1) aviso = `<b style="color:var(--vermelho)">${brancos.toFixed(1)}% dos pixels estouraram em 255.</b> Esse detalhe sumiu de vez: nenhum ajuste depois recupera${equalizar ? ', e equalizar só espalha o que sobrou' : ''}.`;
    else if (pretos > 1) aviso = `<b style="color:var(--vermelho)">${pretos.toFixed(1)}% dos pixels afundaram em 0.</b> Inseto escuro em fundo escuro vira uma mancha só.`;
    p.leitura.innerHTML = `Brilho médio <b>${media.toFixed(0)}</b>. ${aviso}`;
  }

  function desenharGrafico(hist) {
    const t = tema();
    const { canvas, ctx } = grafico;
    const W = canvas.width;
    const H = canvas.height;
    const margem = 22;
    ctx.fillStyle = t.fundo;
    ctx.fillRect(0, 0, W, H);

    // escala pela 2ª maior barra: um pico isolado (o fundo liso) não achata o resto
    const ordenado = [...hist].sort((a, b) => b - a);
    const topo = Math.max(1, ordenado[2]);
    const lx = (W - 2 * margem) / 256;

    for (let v = 0; v < 256; v++) {
      const altura = Math.min(1, hist[v] / topo) * (H - 2 * margem);
      ctx.fillStyle = v === 0 || v === 255 ? t.vermelho : t.destaque;
      ctx.fillRect(margem + v * lx, H - margem - altura, Math.max(1, lx), altura);
    }

    // faixa de tons embaixo, para ler o eixo sem números
    const faixa = ctx.createLinearGradient(margem, 0, W - margem, 0);
    faixa.addColorStop(0, '#000');
    faixa.addColorStop(1, '#fff');
    ctx.fillStyle = faixa;
    ctx.fillRect(margem, H - margem + 4, W - 2 * margem, 8);
    ctx.strokeStyle = t.bordaForte;
    ctx.strokeRect(margem, H - margem + 4, W - 2 * margem, 8);
  }

  const sBrilho = slider({ rotulo: 'brilho', min: -120, max: 120, valor: 0, aoMudar: pintar });
  const sContraste = slider({ rotulo: 'contraste', min: 0.2, max: 2.5, passo: 0.05, valor: 1, formato: (v) => `×${v.toFixed(2)}`, aoMudar: pintar });
  const sGama = slider({ rotulo: 'gama', min: 0.3, max: 3, passo: 0.05, valor: 1, formato: (v) => v.toFixed(2), aoMudar: pintar });

  const cenarios = chips(Object.entries(CENARIOS).map(([k, c]) => [k, c.rotulo]), 'normal', (nome) => {
    const c = CENARIOS[nome];
    sBrilho.valor = c.brilho;
    sContraste.valor = c.contraste;
    sGama.valor = c.gama;
    pintar();
  });

  const modo = chips(
    [
      ['nao', 'como está'],
      ['sim', 'equalizar'],
    ],
    'nao',
    (v) => {
      equalizar = v === 'sim';
      pintar();
    },
  );

  const origem = fonteDeImagem({
    alvoDeSoltar: p.corpo,
    aoTrocar({ canvas }) {
      fonte = pixelsDe(canvas);
      imagem.canvas.width = canvas.width;
      imagem.canvas.height = canvas.height;
      pintar();
    },
  });

  const linha1 = el('div', 'vis-linha');
  linha1.append(el('span', 'vis-rotulo', 'simular captura'), cenarios.elemento);
  const linha2 = el('div', 'vis-linha');
  linha2.append(el('span', 'vis-rotulo', 'correção'), modo.elemento, origem.elemento);
  p.controles.append(linha1, sBrilho.elemento, sContraste.elemento, sGama.elemento, linha2);

  origem.gerar();
  aoMudarTema(p.raiz, pintar);
  return p.raiz;
}
