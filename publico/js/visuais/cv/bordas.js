/**
 * Canny passo a passo: veja a imagem depois de cada uma das quatro etapas e
 * mexa nos três parâmetros que decidem o resultado.
 */

import { painel, quadro, slider, chips, fonteDeImagem, pixelsDe, desenharCinza, el } from './base.js';
import { paraCinza, canny } from './processamento.js';

const ETAPAS = {
  suave: ['1 · suavizar', 'Desfoque gaussiano. Derivar amplifica ruído, então o ruído sai antes. Sigma maior = menos ruído e menos detalhe fino.'],
  magnitude: ['2 · gradiente', 'Sobel em X e em Y, combinados. Claro = a intensidade muda rápido ali. As bordas ainda estão grossas.'],
  fino: ['3 · afinar', 'Supressão de não-máximos: em cada ponto só sobrevive o maior valor ao longo da direção do gradiente. A borda fica com 1 pixel.'],
  bordas: ['4 · histerese', 'Acima do limiar alto é borda. Entre os dois limiares só é borda se estiver ligado a uma forte. Abaixo do baixo é descartado.'],
};

export default function criar() {
  const p = painel('Canny, etapa por etapa', 'as quatro etapas do detector de bordas mais usado');

  const qEntrada = quadro('entrada');
  const qEtapa = quadro('etapa');
  p.corpo.append(qEntrada.figura, qEtapa.figura);

  let cinza = null;
  let largura = 0;
  let altura = 0;
  let etapa = 'bordas';

  function calcular() {
    if (!cinza) return;
    const baixo = Math.min(sBaixo.valor, sAlto.valor);
    const alto = Math.max(sBaixo.valor, sAlto.valor);
    const r = canny(cinza, largura, altura, { sigma: sSigma.valor, baixo, alto });

    const dados = r[etapa];
    const visivel = new Uint8ClampedArray(dados.length);
    if (etapa === 'bordas') for (let i = 0; i < dados.length; i++) visivel[i] = dados[i] * 255;
    else if (etapa === 'suave') visivel.set(dados);
    else for (let i = 0; i < dados.length; i++) visivel[i] = dados[i] * 1.6; // realce para enxergar
    desenharCinza(qEtapa.canvas, visivel, largura, altura);
    qEtapa.titulo.textContent = ETAPAS[etapa][0];

    let n = 0;
    for (let i = 0; i < r.bordas.length; i++) n += r.bordas[i];
    p.leitura.innerHTML = `${ETAPAS[etapa][1]}<br>
      Resultado final: <b>${((n / r.bordas.length) * 100).toFixed(1)}%</b> dos pixels são borda.
      Em OpenCV: <code>cv2.Canny(cv2.GaussianBlur(cinza, (0, 0), ${sSigma.valor.toFixed(1)}), ${baixo}, ${alto})</code>`;
  }

  const sSigma = slider({ rotulo: 'sigma', min: 0.4, max: 4, passo: 0.1, valor: 1.2, formato: (v) => v.toFixed(1), aoMudar: calcular });
  const sBaixo = slider({ rotulo: 'limiar baixo', min: 1, max: 200, valor: 30, aoMudar: calcular });
  const sAlto = slider({ rotulo: 'limiar alto', min: 1, max: 300, valor: 80, aoMudar: calcular });

  const seletor = chips(Object.entries(ETAPAS).map(([k, [rotulo]]) => [k, rotulo]), 'bordas', (v) => {
    etapa = v;
    calcular();
  });

  const origem = fonteDeImagem({
    alvoDeSoltar: p.corpo,
    aoTrocar({ canvas }) {
      const px = pixelsDe(canvas);
      largura = px.width;
      altura = px.height;
      cinza = paraCinza(px.data);
      qEntrada.canvas.width = largura;
      qEntrada.canvas.height = altura;
      qEntrada.ctx.drawImage(canvas, 0, 0);
      calcular();
    },
  });

  const linha = el('div', 'vis-linha');
  linha.append(seletor.elemento, origem.elemento);
  p.controles.append(linha, sSigma.elemento, sBaixo.elemento, sAlto.elemento);
  origem.gerar();
  return p.raiz;
}
