/**
 * O que o stride faz com um objeto pequeno.
 *
 * Mostra um mapa de ativação da mesma imagem em resoluções cada vez menores
 * (stride 2, 4, 8, 16, 32), como acontece ao longo do backbone de um detector,
 * e quantas células do mapa o inseto escolhido ocupa em cada nível.
 *
 * O mapa é UM canal feito à mão (energia de borda). Uma CNN de verdade tem
 * centenas de canais aprendidos — mas a resolução espacial de cada nível é
 * exatamente esta.
 */

import { painel, quadro, chips, slider, fonteDeImagem, pixelsDe, desenharCinza, el, COR_CLASSE } from './base.js';
import { paraCinza, convolver, KERNELS } from './processamento.js';

const NIVEIS = [1, 2, 4, 8, 16, 32];

/** Reduz o mapa pela metade ficando com o máximo de cada bloco 2×2. */
function maxPool(mapa, w, h) {
  const nw = Math.floor(w / 2);
  const nh = Math.floor(h / 2);
  const saida = new Float32Array(nw * nh);
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      const i = 2 * y * w + 2 * x;
      saida[y * nw + x] = Math.max(mapa[i], mapa[i + 1], mapa[i + w], mapa[i + w + 1]);
    }
  }
  return { mapa: saida, w: nw, h: nh };
}

export default function criar() {
  const p = painel('O que o stride faz com um inseto', 'a mesma imagem nas resoluções internas de um detector');

  const qEntrada = quadro('entrada');
  const qMapa = quadro('mapa de ativação');
  qMapa.canvas.classList.add('pixelado');
  const lateral = el('div', 'vis-lateral');
  p.corpo.append(qEntrada.figura, qMapa.figura, lateral);

  let canvasFonte = null;
  let gabarito = null;
  let piramide = []; // [{ stride, mapa, w, h }]
  let stride = 8;
  let classe = 'mosca';

  function construir(cinza, w, h) {
    // nível 1: energia de borda (|Sobel X| + |Sobel Y|) seguida de ReLU
    const gx = convolver(cinza, w, h, KERNELS.sobelX.valores);
    const gy = convolver(cinza, w, h, KERNELS.sobelY.valores);
    let atual = { mapa: gx.map((v, i) => Math.abs(v) + Math.abs(gy[i])), w, h };
    piramide = [{ stride: 1, ...atual }];
    for (let s = 2; s <= 32; s *= 2) {
      atual = maxPool(atual.mapa, atual.w, atual.h);
      piramide.push({ stride: s, ...atual });
    }
  }

  function pintar() {
    if (!canvasFonte) return;
    const alvo = gabarito?.find((g) => g.classe === classe) ?? gabarito?.[0];
    const nivel = piramide.find((n) => n.stride === stride);
    const fator = sReducao.valor;

    // entrada, com o inseto escolhido marcado
    qEntrada.canvas.width = canvasFonte.width;
    qEntrada.canvas.height = canvasFonte.height;
    qEntrada.ctx.drawImage(canvasFonte, 0, 0);
    if (alvo) {
      qEntrada.ctx.strokeStyle = COR_CLASSE[alvo.classe];
      qEntrada.ctx.lineWidth = 2;
      qEntrada.ctx.strokeRect(alvo.x - 3, alvo.y - 3, alvo.w + 6, alvo.h + 6);
    }

    // mapa do nível escolhido, normalizado para 0–255 e ampliado sem interpolar
    let maximo = 1;
    for (const v of nivel.mapa) if (v > maximo) maximo = v;
    desenharCinza(qMapa.canvas, Uint8ClampedArray.from(nivel.mapa, (v) => (v / maximo) * 255), nivel.w, nivel.h);
    qMapa.titulo.textContent = `stride ${stride}: mapa de ${nivel.w}×${nivel.h} células`;

    if (!alvo) {
      lateral.innerHTML = '<h4>Leitura</h4><p>Imagem sua não tem gabarito para medir.</p>';
      p.leitura.textContent = '';
      return;
    }

    // tamanho do inseto depois de reduzir a foto para a entrada da rede
    const lado = Math.sqrt(alvo.w * alvo.h) / fator;
    let campo = 1;
    let salto = 1;
    const linhas = NIVEIS.slice(1).map((s) => {
      campo += 2 * salto; // cada conv 3×3 soma (3 − 1) × salto ao campo receptivo
      salto *= 2;
      const celulas = lado / s;
      const cor = celulas >= 2 ? 'var(--verde)' : celulas >= 1 ? 'var(--amarelo)' : 'var(--vermelho)';
      return `<tr${s === stride ? ' style="background:var(--destaque-suave)"' : ''}>
        <td>${s}</td><td style="color:${cor}"><b>${celulas.toFixed(2)}</b></td><td>${campo} px</td></tr>`;
    });

    lateral.innerHTML = `
      <h4>${alvo.classe}: ${lado.toFixed(1)} px de lado na entrada</h4>
      <table class="tabela-dados" style="display:table;margin:6px 0 0;font-size:12.5px">
        <thead><tr><th>stride</th><th>células</th><th>campo recept.</th></tr></thead>
        <tbody>${linhas.join('')}</tbody>
      </table>`;

    const noAtual = lado / stride;
    p.leitura.innerHTML =
      noAtual < 1
        ? `<b style="color:var(--vermelho)">No stride ${stride}, este inseto ocupa ${noAtual.toFixed(2)} de uma célula.</b>
           Ele divide a célula com fundo e vizinhos: sobra pouco sinal para a cabeça de detecção. Objetos assim só são
           detectáveis nos níveis de stride menor (P3, ou um P2 extra) — ou reduzindo menos a foto.`
        : `No stride ${stride}, o inseto cobre <b>${noAtual.toFixed(1)}</b> células de lado. Detectores costumam prever em três níveis:
           P3 (stride 8), P4 (16) e P5 (32). Aumente a redução da foto e veja as células minguarem.`;
  }

  const seletorStride = chips(NIVEIS.map((s) => [s, s === 1 ? 'stride 1' : String(s)]), 8, (v) => {
    stride = v;
    pintar();
  });
  const seletorClasse = chips(
    [
      ['mariposa', 'mariposa'],
      ['cigarrinha', 'cigarrinha'],
      ['mosca', 'mosca'],
    ],
    'mosca',
    (v) => {
      classe = v;
      pintar();
    },
  );
  const sReducao = slider({
    rotulo: 'redução da foto',
    min: 1,
    max: 6,
    passo: 0.5,
    valor: 1,
    formato: (v) => (v === 1 ? 'nenhuma' : `÷${v}`),
    aoMudar: pintar,
  });

  const origem = fonteDeImagem({
    alvoDeSoltar: p.corpo,
    opcoes: { insetos: 24, detritos: 3, aglomerado: 0.15 },
    aoTrocar(amostra) {
      canvasFonte = amostra.canvas;
      gabarito = amostra.gabarito;
      const px = pixelsDe(amostra.canvas);
      construir(paraCinza(px.data), px.width, px.height);
      pintar();
    },
  });

  const linha1 = el('div', 'vis-linha');
  linha1.append(el('span', 'vis-rotulo', 'nível'), seletorStride.elemento);
  const linha2 = el('div', 'vis-linha');
  linha2.append(el('span', 'vis-rotulo', 'inseto'), seletorClasse.elemento, origem.elemento);
  p.controles.append(linha1, linha2, sReducao.elemento);
  origem.gerar();
  return p.raiz;
}
