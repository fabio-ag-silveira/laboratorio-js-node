/**
 * Distorção radial de lente, no modelo de Brown–Conrady usado pelo OpenCV:
 *
 *     r_distorcido = r_ideal · (1 + k1·r² + k2·r⁴)
 *
 * k1 negativo puxa os pontos para o centro (barril, típico de grande-angular);
 * k1 positivo empurra para fora (almofada, típico de teleobjetiva).
 */

import { painel, quadro, slider, botao, gerarArmadilha, pixelsDe, el } from './base.js';

const W = 480;
const H = 360;

/**
 * Inverte o modelo: dado o raio distorcido, acha o raio ideal.
 * Não existe fórmula fechada, então iteramos (ponto fixo) — é exatamente o que
 * `cv2.undistortPoints` faz por dentro.
 */
function raioIdeal(rd, k1, k2) {
  let ru = rd;
  for (let i = 0; i < 12; i++) {
    const r2 = ru * ru;
    ru = rd / (1 + k1 * r2 + k2 * r2 * r2);
  }
  // Com barril forte, os cantos da foto não recebem luz de ponto nenhum da
  // cena: a equação não tem solução e a iteração não converge. Conferimos o
  // resultado substituindo de volta no modelo.
  const r2 = ru * ru;
  const conferido = ru * (1 + k1 * r2 + k2 * r2 * r2);
  return Math.abs(conferido - rd) < 1e-3 ? ru : NaN;
}

export default function criar() {
  const p = painel('Distorção de lente', 'barril (k1 negativo) e almofada (k1 positivo)');

  const qImagem = quadro('como a câmera registra', W, H);
  const lateral = el('div', 'vis-lateral');
  p.corpo.append(qImagem.figura, lateral);

  let fonte = null;

  function pintar() {
    const k1 = sK1.valor;
    const k2 = sK2.valor;
    const saida = qImagem.ctx.createImageData(W, H);
    const s = fonte.data;
    const d = saida.data;
    const cx = W / 2;
    const cy = H / 2;
    const norma = Math.hypot(cx, cy); // r = 1 no canto da imagem

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        // (x, y) é um pixel da foto DISTORCIDA. De que ponto da cena ideal
        // veio a luz que caiu aqui?
        const nx = (x - cx) / norma;
        const ny = (y - cy) / norma;
        const rd = Math.hypot(nx, ny);
        const escala = rd > 0 ? raioIdeal(rd, k1, k2) / rd : 1;
        const ox = Math.round(cx + nx * escala * norma);
        const oy = Math.round(cy + ny * escala * norma);
        const k = (y * W + x) * 4;
        // NaN falha em toda comparação, então cai no `else` (pixel sem luz)
        if (ox >= 0 && oy >= 0 && ox < W && oy < H) {
          const j = (oy * W + ox) * 4;
          d[k] = s[j];
          d[k + 1] = s[j + 1];
          d[k + 2] = s[j + 2];
        } else {
          d[k] = d[k + 1] = d[k + 2] = 20;
        }
        d[k + 3] = 255;
      }
    }
    qImagem.ctx.putImageData(saida, 0, 0);

    // Ampliação local na direção radial: a derivada de r·(1 + k1·r² + k2·r⁴).
    const r = 0.8;
    const ampliacao = 1 + 3 * k1 * r ** 2 + 5 * k2 * r ** 4;
    const neutro = Math.abs(k1) < 0.005 && Math.abs(k2) < 0.005;
    const tipo = neutro ? 'sem distorção' : ampliacao < 1 ? 'barril' : 'almofada';
    lateral.innerHTML = `
      <h4>Leitura</h4>
      <div>tipo: <b>${tipo}</b></div>
      <div class="vis-conta">r' = r · (1 + k1·r² + k2·r⁴)<br>k1 = ${k1.toFixed(2)}, k2 = ${k2.toFixed(2)}</div>
      <p style="margin:10px 0 0;line-height:1.5">Perto da borda (r = 0.8), um inseto aparece com cerca de
      <b>${(ampliacao * 100).toFixed(0)}%</b> do comprimento que teria no centro.</p>`;
    p.leitura.innerHTML = neutro
      ? 'As linhas da grade estão retas. Leve k1 para o negativo para simular a grande-angular de um celular.'
      : `Com distorção em <b>${tipo}</b>, as linhas retas da grade viraram curvas, e o mesmo inseto muda de tamanho conforme a posição no quadro.
         Se você usa o tamanho em pixels para separar espécies ou filtrar falsos positivos, isso vira erro. A calibração estima k1 e k2 para desfazer o efeito (<code>cv2.undistort</code>).`;
  }

  // Limites escolhidos para o modelo continuar invertível até o canto (r = 1).
  const sK1 = slider({ rotulo: 'k1', min: -0.3, max: 0.4, passo: 0.01, valor: -0.22, formato: (v) => v.toFixed(2), aoMudar: pintar });
  const sK2 = slider({ rotulo: 'k2', min: 0, max: 0.2, passo: 0.01, valor: 0, formato: (v) => v.toFixed(2), aoMudar: pintar });

  let semente = 5;
  const gerar = () => {
    fonte = pixelsDe(gerarArmadilha({ largura: W, altura: H, semente, insetos: 26, detritos: 0, aglomerado: 0 }).canvas);
    pintar();
  };

  p.controles.append(
    sK1.elemento,
    sK2.elemento,
    botao('sem distorção', () => {
      sK1.valor = 0;
      sK2.valor = 0;
      pintar();
    }),
    botao('↻ outra armadilha', () => {
      semente++;
      gerar();
    }),
  );
  gerar();
  return p.raiz;
}
