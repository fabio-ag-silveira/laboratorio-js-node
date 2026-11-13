/**
 * Patches e atenção, de brinquedo.
 *
 * A imagem é cortada em patches, como num Vision Transformer. Cada patch vira
 * um vetor de características (aqui, feito à mão: cor média, contraste e
 * energia de borda). Clicar num patch mostra o quanto ele "presta atenção" em
 * cada um dos outros: o softmax da semelhança entre os vetores.
 *
 * Num ViT de verdade as características são aprendidas e há dezenas de
 * cabeças de atenção por camada. A mecânica (todo patch olha para todos os
 * outros, com pesos que somam 1) é exatamente esta.
 */

import { painel, quadro, slider, chips, fonteDeImagem, pixelsDe, el } from './base.js';

export default function criar() {
  const p = painel('Patches e atenção', 'clique num patch para ver em quais outros ele presta atenção');

  const q = quadro('', 480, 360);
  q.canvas.classList.add('mira');
  const lateral = el('div', 'vis-lateral');
  p.corpo.append(q.figura, lateral);

  let canvasFonte = null;
  let fonte = null;
  let lado = 24;
  let patches = []; // [{ x, y, v: [características] }]
  let colunas = 0;
  let escolhido = 0;

  function extrair() {
    const { width: w, height: h, data } = fonte;
    colunas = Math.floor(w / lado);
    const linhas = Math.floor(h / lado);
    patches = [];
    for (let j = 0; j < linhas; j++) {
      for (let i = 0; i < colunas; i++) {
        let r = 0;
        let g = 0;
        let b = 0;
        let soma = 0;
        let soma2 = 0;
        let borda = 0;
        for (let y = 0; y < lado; y++) {
          for (let x = 0; x < lado; x++) {
            const k = ((j * lado + y) * w + i * lado + x) * 4;
            const cinza = 0.299 * data[k] + 0.587 * data[k + 1] + 0.114 * data[k + 2];
            r += data[k];
            g += data[k + 1];
            b += data[k + 2];
            soma += cinza;
            soma2 += cinza * cinza;
            if (x > 0) {
              const viz = 0.299 * data[k - 4] + 0.587 * data[k - 3] + 0.114 * data[k - 2];
              borda += Math.abs(cinza - viz);
            }
          }
        }
        const n = lado * lado;
        const media = soma / n;
        const desvio = Math.sqrt(Math.max(0, soma2 / n - media * media));
        patches.push({ x: i * lado, y: j * lado, v: [r / n / 255, g / n / 255, b / n / 255, desvio / 60, borda / n / 20] });
      }
    }
    // centraliza e normaliza cada vetor: a atenção compara DIREÇÕES, não tamanhos
    const dim = patches[0].v.length;
    const medias = Array.from({ length: dim }, (_, d) => patches.reduce((s, q2) => s + q2.v[d], 0) / patches.length);
    for (const pt of patches) {
      pt.v = pt.v.map((x, d) => x - medias[d]);
      const norma = Math.hypot(...pt.v) || 1;
      pt.v = pt.v.map((x) => x / norma);
    }
    escolhido = Math.min(escolhido, patches.length - 1);
  }

  function pintar() {
    if (!fonte) return;
    const ctx = q.ctx;
    q.canvas.width = fonte.width;
    q.canvas.height = fonte.height;
    ctx.drawImage(canvasFonte, 0, 0);

    // atenção do patch escolhido: softmax(semelhança / temperatura)
    const alvo = patches[escolhido];
    const temperatura = sTemp.valor;
    const notas = patches.map((pt) => pt.v.reduce((s, x, d) => s + x * alvo.v[d], 0) / temperatura);
    const maior = Math.max(...notas);
    const exps = notas.map((n) => Math.exp(n - maior));
    const soma = exps.reduce((a, b) => a + b, 0);
    const pesos = exps.map((e) => e / soma);
    const pico = Math.max(...pesos);

    // escurece a imagem e acende os patches conforme o peso
    ctx.fillStyle = 'rgba(8,10,20,0.62)';
    ctx.fillRect(0, 0, fonte.width, fonte.height);
    patches.forEach((pt, i) => {
      const f = pesos[i] / pico;
      if (f < 0.04) return;
      ctx.fillStyle = `rgba(255,90,120,${0.78 * f})`;
      ctx.fillRect(pt.x, pt.y, lado, lado);
    });
    // grade
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= colunas * lado; x += lado) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, fonte.height);
    }
    for (let y = 0; y <= fonte.height; y += lado) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(fonte.width, y + 0.5);
    }
    ctx.stroke();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(alvo.x + 1, alvo.y + 1, lado - 2, lado - 2);

    const n = patches.length;
    // quantos patches concentram metade da atenção?
    const ordenados = [...pesos].sort((a, b) => b - a);
    let acumulado = 0;
    let metade = 0;
    while (acumulado < 0.5 && metade < n) acumulado += ordenados[metade++];

    q.titulo.textContent = `${n} patches de ${lado}×${lado} px · branco = patch escolhido · rosa = para onde ele olha`;
    lateral.innerHTML = `
      <h4>A conta</h4>
      <div class="vis-conta" style="margin-top:0">
        patches (tokens): <b>${n}</b><br>
        pares de atenção: ${n}² = <b>${(n * n).toLocaleString('pt-BR')}</b><br><br>
        Numa imagem de 640 px:<br>
        patch 32 → 400 tokens<br>
        patch 16 → 1.600 tokens<br>
        patch 8 &nbsp;→ 6.400 tokens<br>
        <span style="color:var(--texto-3)">o custo cresce com o QUADRADO</span>
      </div>`;
    p.leitura.innerHTML = `Metade da atenção deste patch está concentrada em <b>${metade}</b> dos ${n} patches.
      Clique num inseto: ele acende os outros insetos, <b>em qualquer lugar da imagem</b>, e ignora o fundo.
      É a diferença para a convolução, que só enxerga a vizinhança: a atenção relaciona regiões distantes já na primeira camada.
      O preço é a conta ao lado, e o motivo de objeto pequeno ser caro para transformers: patch menor, muito mais tokens.`;
  }

  q.canvas.addEventListener('click', (ev) => {
    if (!fonte) return;
    const r = q.canvas.getBoundingClientRect();
    const x = Math.floor((((ev.clientX - r.left) / r.width) * fonte.width) / lado);
    const y = Math.floor((((ev.clientY - r.top) / r.height) * fonte.height) / lado);
    const i = y * colunas + x;
    if (i >= 0 && i < patches.length && x < colunas) {
      escolhido = i;
      pintar();
    }
  });

  const tamanhos = chips(
    [
      [48, 'patch 48'],
      [32, '32'],
      [24, '24'],
      [16, '16'],
      [12, '12'],
    ],
    24,
    (v) => {
      lado = v;
      extrair();
      pintar();
    },
  );
  const sTemp = slider({ rotulo: 'temperatura', min: 0.03, max: 1, passo: 0.01, valor: 0.12, formato: (v) => v.toFixed(2), aoMudar: pintar });

  const origem = fonteDeImagem({
    alvoDeSoltar: p.corpo,
    opcoes: { insetos: 18, detritos: 3, aglomerado: 0.1 },
    aoTrocar(amostra) {
      canvasFonte = amostra.canvas;
      fonte = pixelsDe(amostra.canvas);
      extrair();
      // começa num patch que contém um inseto
      const g = amostra.gabarito?.[0];
      if (g) escolhido = Math.floor((g.y + g.h / 2) / lado) * colunas + Math.floor((g.x + g.w / 2) / lado);
      escolhido = Math.max(0, Math.min(patches.length - 1, escolhido));
      pintar();
    },
  });

  const linha = el('div', 'vis-linha');
  linha.append(tamanhos.elemento, origem.elemento);
  p.controles.append(linha, sTemp.elemento);
  origem.gerar();
  return p.raiz;
}
