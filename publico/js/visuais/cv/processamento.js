/**
 * Processamento de imagem "na unha", em JavaScript puro.
 *
 * É o que o OpenCV faz por baixo, escrito do jeito mais legível possível, não
 * do mais rápido. Cada função recebe e devolve arrays tipados simples:
 *
 *   imagem colorida  → Uint8ClampedArray RGBA (o formato do canvas)
 *   imagem em cinza  → Float32Array ou Uint8Array, um valor por pixel
 *
 * Nenhuma função toca no DOM, então `npm test` consegue testá-las no Node.
 */

/** RGBA → cinza, com os pesos de luminância (o olho vê mais o verde). */
export function paraCinza(rgba) {
  const n = rgba.length / 4;
  const cinza = new Float32Array(n);
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    cinza[i] = 0.299 * rgba[j] + 0.587 * rgba[j + 1] + 0.114 * rgba[j + 2];
  }
  return cinza;
}

/** Um pixel RGB (0–255) → HSV com H em graus (0–360), S e V em 0–1. */
export function rgbParaHsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max === 0 ? 0 : d / max, max];
}

/** Histograma de 256 faixas de um array de valores 0–255. */
export function histograma(valores, passo = 1) {
  const h = new Uint32Array(256);
  for (let i = 0; i < valores.length; i += passo) h[Math.max(0, Math.min(255, valores[i] | 0))]++;
  return h;
}

/**
 * Convolução 2D (tecnicamente correlação, como em toda biblioteca de visão:
 * o kernel não é espelhado). Bordas são tratadas repetindo o pixel da beirada.
 *
 * @param {ArrayLike<number>} cinza  imagem, largura*altura valores
 * @param {number[]} kernel          k*k valores, linha a linha
 */
export function convolver(cinza, largura, altura, kernel) {
  const k = Math.round(Math.sqrt(kernel.length));
  const meio = (k - 1) / 2;
  const saida = new Float32Array(cinza.length);

  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      let soma = 0;
      for (let j = 0; j < k; j++) {
        // Math.min/max "grudam" a coordenada dentro da imagem
        const yy = Math.min(altura - 1, Math.max(0, y + j - meio));
        for (let i = 0; i < k; i++) {
          const xx = Math.min(largura - 1, Math.max(0, x + i - meio));
          soma += cinza[yy * largura + xx] * kernel[j * k + i];
        }
      }
      saida[y * largura + x] = soma;
    }
  }
  return saida;
}

/** Kernel gaussiano k×k normalizado (soma 1). */
export function kernelGaussiano(k, sigma) {
  const meio = (k - 1) / 2;
  const valores = [];
  let soma = 0;
  for (let y = 0; y < k; y++) {
    for (let x = 0; x < k; x++) {
      const v = Math.exp(-((x - meio) ** 2 + (y - meio) ** 2) / (2 * sigma * sigma));
      valores.push(v);
      soma += v;
    }
  }
  return valores.map((v) => v / soma);
}

export const KERNELS = {
  identidade: { nome: 'identidade', valores: [0, 0, 0, 0, 1, 0, 0, 0, 0], nota: 'Devolve a própria imagem: só o pixel central conta.' },
  media: { nome: 'média (desfoque)', valores: Array(9).fill(1 / 9), nota: 'Cada pixel vira a média dos 9 vizinhos. Apaga ruído e detalhe juntos.' },
  gaussiano: { nome: 'gaussiano', valores: [1, 2, 1, 2, 4, 2, 1, 2, 1].map((v) => v / 16), nota: 'Desfoque que pesa mais o centro. É o que se aplica antes de detectar bordas.' },
  nitidez: { nome: 'nitidez', valores: [0, -1, 0, -1, 5, -1, 0, -1, 0], nota: 'Realça diferenças com os vizinhos. Realça o ruído também.' },
  sobelX: { nome: 'Sobel X', valores: [-1, 0, 1, -2, 0, 2, -1, 0, 1], nota: 'Derivada horizontal: responde a bordas VERTICAIS. Saída com sinal (cinza = zero).', comSinal: true },
  sobelY: { nome: 'Sobel Y', valores: [-1, -2, -1, 0, 0, 0, 1, 2, 1], nota: 'Derivada vertical: responde a bordas HORIZONTAIS.', comSinal: true },
  laplaciano: { nome: 'laplaciano', valores: [0, 1, 0, 1, -4, 1, 0, 1, 0], nota: 'Segunda derivada: responde a qualquer mudança brusca, em todas as direções.', comSinal: true },
  relevo: { nome: 'relevo', valores: [-2, -1, 0, -1, 1, 1, 0, 1, 2], nota: 'Derivada na diagonal somada à imagem: efeito de alto-relevo.' },
};

/** Limiar global: abaixo de t vira 1 (objeto escuro) quando `escuro`, senão o contrário. */
export function limiarizar(cinza, t, escuro = true) {
  const mascara = new Uint8Array(cinza.length);
  for (let i = 0; i < cinza.length; i++) mascara[i] = (escuro ? cinza[i] < t : cinza[i] > t) ? 1 : 0;
  return mascara;
}

/**
 * Método de Otsu: escolhe sozinho o limiar que melhor separa o histograma em
 * dois grupos, maximizando a variância ENTRE os grupos.
 */
export function otsu(cinza) {
  const h = histograma(cinza);
  const total = cinza.length;
  let somaTotal = 0;
  for (let i = 0; i < 256; i++) somaTotal += i * h[i];

  let somaFundo = 0;
  let pesoFundo = 0;
  let melhor = 0;
  let melhorVariancia = -1;

  for (let t = 0; t < 256; t++) {
    pesoFundo += h[t];
    if (pesoFundo === 0) continue;
    const pesoFrente = total - pesoFundo;
    if (pesoFrente === 0) break;
    somaFundo += t * h[t];
    const mediaFundo = somaFundo / pesoFundo;
    const mediaFrente = (somaTotal - somaFundo) / pesoFrente;
    const variancia = pesoFundo * pesoFrente * (mediaFundo - mediaFrente) ** 2;
    if (variancia > melhorVariancia) {
      melhorVariancia = variancia;
      melhor = t;
    }
  }
  return melhor;
}

/**
 * Limiar adaptativo: compara cada pixel com a média da vizinhança, em vez de
 * um número só para a imagem toda. Resolve iluminação desigual.
 * Usa imagem integral para a média sair em tempo constante por pixel.
 */
export function limiarAdaptativo(cinza, largura, altura, janela = 31, c = 8) {
  const integral = new Float64Array((largura + 1) * (altura + 1));
  for (let y = 0; y < altura; y++) {
    let linha = 0;
    for (let x = 0; x < largura; x++) {
      linha += cinza[y * largura + x];
      integral[(y + 1) * (largura + 1) + x + 1] = integral[y * (largura + 1) + x + 1] + linha;
    }
  }
  const meio = Math.floor(janela / 2);
  const mascara = new Uint8Array(cinza.length);
  for (let y = 0; y < altura; y++) {
    const y0 = Math.max(0, y - meio);
    const y1 = Math.min(altura - 1, y + meio);
    for (let x = 0; x < largura; x++) {
      const x0 = Math.max(0, x - meio);
      const x1 = Math.min(largura - 1, x + meio);
      const area = (x1 - x0 + 1) * (y1 - y0 + 1);
      const soma =
        integral[(y1 + 1) * (largura + 1) + x1 + 1] -
        integral[y0 * (largura + 1) + x1 + 1] -
        integral[(y1 + 1) * (largura + 1) + x0] +
        integral[y0 * (largura + 1) + x0];
      mascara[y * largura + x] = cinza[y * largura + x] < soma / area - c ? 1 : 0;
    }
  }
  return mascara;
}

function morfologia(mascara, largura, altura, raio, erodir) {
  // Elemento estruturante quadrado é separável: uma passada horizontal e uma
  // vertical dão o mesmo resultado de testar o quadrado inteiro, bem mais rápido.
  const passar = (entrada, horizontal) => {
    const saida = new Uint8Array(entrada.length);
    for (let y = 0; y < altura; y++) {
      for (let x = 0; x < largura; x++) {
        let v = erodir ? 1 : 0;
        for (let d = -raio; d <= raio; d++) {
          const xx = horizontal ? x + d : x;
          const yy = horizontal ? y : y + d;
          const dentro = xx >= 0 && xx < largura && yy >= 0 && yy < altura;
          const p = dentro ? entrada[yy * largura + xx] : erodir ? 1 : 0;
          if (erodir ? p === 0 : p === 1) {
            v = erodir ? 0 : 1;
            break;
          }
        }
        saida[y * largura + x] = v;
      }
    }
    return saida;
  };
  return passar(passar(mascara, true), false);
}

/** Erosão: o objeto encolhe; ruído pequeno some. */
export const erodir = (m, w, h, raio = 1) => morfologia(m, w, h, raio, true);
/** Dilatação: o objeto cresce; buracos pequenos fecham. */
export const dilatar = (m, w, h, raio = 1) => morfologia(m, w, h, raio, false);
/** Abertura = erosão depois dilatação: remove pontinhos sem encolher o resto. */
export const abrir = (m, w, h, raio = 1) => dilatar(erodir(m, w, h, raio), w, h, raio);
/** Fechamento = dilatação depois erosão: tapa buracos sem engordar o resto. */
export const fechar = (m, w, h, raio = 1) => erodir(dilatar(m, w, h, raio), w, h, raio);

/** Máximo (ou mínimo) numa janela quadrada, em tons de cinza. Separável. */
function extremoLocal(cinza, largura, altura, raio, maximo) {
  const passar = (entrada, horizontal) => {
    const saida = new Float32Array(entrada.length);
    for (let y = 0; y < altura; y++) {
      for (let x = 0; x < largura; x++) {
        let v = maximo ? -Infinity : Infinity;
        for (let d = -raio; d <= raio; d++) {
          const xx = horizontal ? Math.min(largura - 1, Math.max(0, x + d)) : x;
          const yy = horizontal ? y : Math.min(altura - 1, Math.max(0, y + d));
          const p = entrada[yy * largura + xx];
          if (maximo ? p > v : p < v) v = p;
        }
        saida[y * largura + x] = v;
      }
    }
    return saida;
  };
  return passar(passar(cinza, true), false);
}

/**
 * Black-hat: (fechamento da imagem) − imagem.
 *
 * O fechamento em tons de cinza apaga tudo que é ESCURO e menor que a janela,
 * deixando uma estimativa do fundo. Subtrair a imagem dessa estimativa sobra
 * só com os objetos escuros pequenos, sobre fundo zero — a iluminação
 * desigual some na subtração. É o truque clássico para "inseto escuro em
 * cartão claro mal iluminado".
 */
export function blackHat(cinza, largura, altura, raio = 20) {
  const dilatada = extremoLocal(cinza, largura, altura, raio, true);
  const fechada = extremoLocal(dilatada, largura, altura, raio, false);
  const saida = new Float32Array(cinza.length);
  for (let i = 0; i < saida.length; i++) saida[i] = Math.max(0, fechada[i] - cinza[i]);
  return saida;
}

/**
 * Componentes conexos (vizinhança de 8): rotula cada "ilha" de pixels 1.
 * Devolve { rotulos, componentes: [{id, area, x, y, w, h, cx, cy}] }.
 * Implementado com pilha explícita — recursão estouraria em ilhas grandes.
 */
export function componentesConexos(mascara, largura, altura) {
  const rotulos = new Int32Array(mascara.length);
  const componentes = [];
  const pilha = [];

  for (let inicio = 0; inicio < mascara.length; inicio++) {
    if (!mascara[inicio] || rotulos[inicio]) continue;
    const id = componentes.length + 1;
    let area = 0;
    let minX = largura;
    let minY = altura;
    let maxX = 0;
    let maxY = 0;
    let somaX = 0;
    let somaY = 0;

    pilha.push(inicio);
    rotulos[inicio] = id;
    while (pilha.length) {
      const p = pilha.pop();
      const x = p % largura;
      const y = (p - x) / largura;
      area++;
      somaX += x;
      somaY += y;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= altura) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= largura) continue;
          const q = yy * largura + xx;
          if (mascara[q] && !rotulos[q]) {
            rotulos[q] = id;
            pilha.push(q);
          }
        }
      }
    }
    componentes.push({ id, area, x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, cx: somaX / area, cy: somaY / area });
  }
  return { rotulos, componentes };
}

/**
 * Canny, etapa por etapa. Devolve todas as imagens intermediárias para o
 * componente poder mostrar cada passo.
 */
export function canny(cinza, largura, altura, { sigma = 1.2, baixo = 30, alto = 80 } = {}) {
  // 1. suavizar — derivada amplifica ruído, então tiramos o ruído antes
  const k = Math.max(3, 2 * Math.ceil(2.5 * sigma) + 1);
  const suave = convolver(cinza, largura, altura, kernelGaussiano(k, sigma));

  // 2. gradiente — quanto e em que direção a intensidade muda
  const gx = convolver(suave, largura, altura, KERNELS.sobelX.valores);
  const gy = convolver(suave, largura, altura, KERNELS.sobelY.valores);
  const magnitude = new Float32Array(cinza.length);
  for (let i = 0; i < magnitude.length; i++) magnitude[i] = Math.hypot(gx[i], gy[i]);

  // 3. supressão de não-máximos — afina a borda para 1 pixel de largura:
  //    só sobrevive quem é o maior ao longo da direção do gradiente
  const fino = new Float32Array(cinza.length);
  for (let y = 1; y < altura - 1; y++) {
    for (let x = 1; x < largura - 1; x++) {
      const i = y * largura + x;
      const m = magnitude[i];
      if (m === 0) continue;
      let ang = (Math.atan2(gy[i], gx[i]) * 180) / Math.PI;
      if (ang < 0) ang += 180;
      let a;
      let b;
      if (ang < 22.5 || ang >= 157.5) [a, b] = [magnitude[i - 1], magnitude[i + 1]];
      else if (ang < 67.5) [a, b] = [magnitude[i - largura - 1], magnitude[i + largura + 1]];
      else if (ang < 112.5) [a, b] = [magnitude[i - largura], magnitude[i + largura]];
      else [a, b] = [magnitude[i - largura + 1], magnitude[i + largura - 1]];
      if (m >= a && m >= b) fino[i] = m;
    }
  }

  // 4. histerese — borda forte entra; borda fraca só entra se estiver
  //    encostada numa forte. É isso que mantém as bordas contínuas.
  const bordas = new Uint8Array(cinza.length);
  const pilha = [];
  for (let i = 0; i < fino.length; i++) {
    if (fino[i] >= alto) {
      bordas[i] = 1;
      pilha.push(i);
    }
  }
  while (pilha.length) {
    const p = pilha.pop();
    const x = p % largura;
    const y = (p - x) / largura;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || xx >= largura || yy < 0 || yy >= altura) continue;
        const q = yy * largura + xx;
        if (!bordas[q] && fino[q] >= baixo) {
          bordas[q] = 1;
          pilha.push(q);
        }
      }
    }
  }

  return { suave, magnitude, fino, bordas };
}

/**
 * Resolve o sistema linear A·x = b por eliminação de Gauss com pivoteamento.
 * Usado para achar a homografia a partir de 4 pares de pontos.
 */
export function resolverSistema(A, b) {
  const n = b.length;
  const M = A.map((linha, i) => [...linha, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivo = col;
    for (let l = col + 1; l < n; l++) if (Math.abs(M[l][col]) > Math.abs(M[pivo][col])) pivo = l;
    if (Math.abs(M[pivo][col]) < 1e-10) return null; // pontos degenerados (colineares)
    [M[col], M[pivo]] = [M[pivo], M[col]];
    for (let l = col + 1; l < n; l++) {
      const f = M[l][col] / M[col][col];
      for (let c = col; c <= n; c++) M[l][c] -= f * M[col][c];
    }
  }
  const x = new Array(n).fill(0);
  for (let l = n - 1; l >= 0; l--) {
    let s = M[l][n];
    for (let c = l + 1; c < n; c++) s -= M[l][c] * x[c];
    x[l] = s / M[l][l];
  }
  return x;
}

/**
 * Homografia 3×3 que leva 4 pontos de origem em 4 de destino.
 * Cada par de pontos dá 2 equações; 4 pares dão as 8 incógnitas (h33 = 1).
 */
export function homografia(origem, destino) {
  const A = [];
  const b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = origem[i];
    const [u, v] = destino[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  const h = resolverSistema(A, b);
  return h ? [...h, 1] : null;
}

/** Aplica uma homografia a um ponto. A divisão por w é a "perspectiva". */
export function aplicarHomografia(H, x, y) {
  const w = H[6] * x + H[7] * y + H[8];
  return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w];
}
