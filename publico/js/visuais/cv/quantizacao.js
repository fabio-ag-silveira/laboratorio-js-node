/**
 * Quantização: guardar os pesos com menos bits.
 *
 * Mostra a distribuição dos pesos de uma camada, os níveis disponíveis com N
 * bits e o erro que a troca introduz. Compara calibrar a faixa pelo mínimo e
 * máximo com calibrar por percentil, que é a diferença entre uma quantização
 * INT8 que funciona e uma que derruba o modelo.
 */

import { painel, quadro, slider, chips, botao, rng, el, tema, aoMudarTema } from './base.js';

const N = 6000;

/** Pesos com cara de camada real: quase todos pequenos, e alguns poucos enormes. */
function gerarPesos(semente, forasteiros) {
  const r = rng(semente);
  const w = new Float32Array(N);
  for (let i = 0; i < N; i++) w[i] = r.normal(0, 0.05);
  for (let i = 0; i < forasteiros; i++) w[r.inteiro(0, N)] = r.entre(0.35, 0.8) * (r() < 0.5 ? -1 : 1);
  return w;
}

export default function criar() {
  const p = painel('Quantização de pesos', 'de 32 bits em ponto flutuante para N bits inteiros');

  const q = quadro('', 640, 300);
  p.corpo.append(q.figura);

  let semente = 1;
  let pesos = gerarPesos(semente, 12);
  let calibracao = 'minmax';

  function pintar() {
    const t = tema();
    const bits = sBits.valor;
    const niveis = 2 ** bits;

    // faixa representável: simétrica em torno de zero
    const ordenado = Float32Array.from(pesos).map(Math.abs).sort();
    const limite = calibracao === 'minmax' ? ordenado[N - 1] : ordenado[Math.floor(N * 0.995)];
    const passo = (2 * limite) / (niveis - 1);

    // quantiza: grampeia na faixa, arredonda para o nível mais próximo
    let erro2 = 0;
    let energia = 0;
    let saturados = 0;
    const usados = new Set();
    const quant = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const grampeado = Math.max(-limite, Math.min(limite, pesos[i]));
      if (grampeado !== pesos[i]) saturados++;
      const nivel = Math.round((grampeado + limite) / passo);
      usados.add(nivel);
      quant[i] = nivel * passo - limite;
      erro2 += (quant[i] - pesos[i]) ** 2;
      energia += pesos[i] ** 2;
    }
    // só o "miolo" (99% centrais): é onde está quase toda a informação
    const miolo = ordenado[Math.floor(N * 0.99)];
    let erroMiolo = 0;
    let energiaMiolo = 0;
    for (let i = 0; i < N; i++) {
      if (Math.abs(pesos[i]) > miolo) continue;
      erroMiolo += (quant[i] - pesos[i]) ** 2;
      energiaMiolo += pesos[i] ** 2;
    }

    // ---- desenho: histograma dos pesos e os níveis --------------------------
    const ctx = q.ctx;
    const W = q.canvas.width;
    const H = q.canvas.height;
    const m = { e: 14, d: 14, c: 16, b: 30 };
    const alcance = Math.max(0.2, ordenado[N - 1] * 1.05);
    const px = (v) => m.e + ((v + alcance) / (2 * alcance)) * (W - m.e - m.d);
    ctx.fillStyle = t.fundo;
    ctx.fillRect(0, 0, W, H);

    const FAIXAS = 160;
    const hist = new Uint32Array(FAIXAS);
    for (let i = 0; i < N; i++) hist[Math.min(FAIXAS - 1, Math.max(0, Math.floor(((pesos[i] + alcance) / (2 * alcance)) * FAIXAS)))]++;
    const topo = Math.max(...hist);
    const largura = (W - m.e - m.d) / FAIXAS;
    for (let k = 0; k < FAIXAS; k++) {
      // escala em raiz, para os poucos forasteiros continuarem visíveis
      const altura = Math.sqrt(hist[k] / topo) * (H - m.c - m.b);
      ctx.fillStyle = t.destaque;
      ctx.fillRect(m.e + k * largura, H - m.b - altura, Math.max(1, largura - 0.5), altura);
    }

    // região fora da faixa (será saturada)
    ctx.fillStyle = 'rgba(240,115,106,0.16)';
    ctx.fillRect(m.e, m.c, px(-limite) - m.e, H - m.c - m.b);
    ctx.fillRect(px(limite), m.c, W - m.d - px(limite), H - m.c - m.b);

    // níveis de quantização (no máximo 65 linhas, senão vira um borrão)
    const mostrar = Math.min(niveis, 65);
    ctx.strokeStyle = t.amarelo;
    ctx.lineWidth = 1;
    ctx.globalAlpha = niveis > 65 ? 0.35 : 0.8;
    ctx.beginPath();
    for (let k = 0; k < mostrar; k++) {
      const v = -limite + (k / (mostrar - 1)) * 2 * limite;
      ctx.moveTo(px(v) + 0.5, H - m.b);
      ctx.lineTo(px(v) + 0.5, H - m.b + 8);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = t.texto3;
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    for (const v of [-alcance * 0.9, -limite, 0, limite, alcance * 0.9]) ctx.fillText(v.toFixed(2), px(v), H - 6);

    q.titulo.textContent = `histograma dos pesos · traços amarelos = níveis disponíveis${niveis > 65 ? ` (${niveis}, mostrando 65)` : ''} · rosa = fora da faixa`;

    const sqnr = 10 * Math.log10(energia / Math.max(erro2, 1e-12));
    const sqnrMiolo = 10 * Math.log10(energiaMiolo / Math.max(erroMiolo, 1e-12));
    const cor = sqnrMiolo > 30 ? 'var(--verde)' : sqnrMiolo > 18 ? 'var(--amarelo)' : 'var(--vermelho)';
    p.leitura.innerHTML = `
      <div class="vis-placar">
        <div><b>${niveis}</b><span>níveis</span></div>
        <div><b>${usados.size}</b><span>níveis usados</span></div>
        <div><b>${(passo * 1000).toFixed(2)}</b><span>passo (×10⁻³)</span></div>
        <div><b style="color:${cor}">${sqnrMiolo.toFixed(1)} dB</b><span>sinal/ruído no miolo</span></div>
        <div><b>${saturados}</b><span>pesos saturados</span></div>
        <div><b>${((bits / 32) * 100).toFixed(0)}%</b><span>do tamanho original</span></div>
      </div>
      <p style="margin:10px 0 0">${
        calibracao === 'minmax'
          ? `A faixa vai até o maior peso (${limite.toFixed(2)}). Uma dúzia de forasteiros estica a régua, e os ${niveis} níveis ficam espalhados por uma região quase vazia: só <b>${usados.size}</b> são usados. O miolo, onde está a informação, fica com poucos níveis.`
          : `A faixa foi cortada no percentil 99,5 (${limite.toFixed(2)}). ${saturados} pesos saturam, e em troca os níveis ficam concentrados onde os pesos estão: <b>${usados.size}</b> usados. Sinal/ruído geral: ${sqnr.toFixed(1)} dB.`
      } Cada bit a menos custa cerca de 6 dB.</p>`;
  }

  const sBits = slider({ rotulo: 'bits', min: 2, max: 10, valor: 8, aoMudar: pintar });
  const seletor = chips(
    [
      ['minmax', 'faixa pelo mínimo e máximo'],
      ['percentil', 'faixa pelo percentil 99,5'],
    ],
    'minmax',
    (v) => {
      calibracao = v;
      pintar();
    },
  );
  const sFora = slider({
    rotulo: 'forasteiros',
    min: 0,
    max: 25,
    valor: 12,
    aoMudar: (v) => {
      pesos = gerarPesos(semente, v);
      pintar();
    },
  });

  const linha = el('div', 'vis-linha');
  linha.append(
    seletor.elemento,
    botao('↻ outros pesos', () => {
      semente++;
      pesos = gerarPesos(semente, sFora.valor);
      pintar();
    }),
  );
  p.controles.append(linha, sBits.elemento, sFora.elemento);
  pintar();
  aoMudarTema(p.raiz, pintar);
  return p.raiz;
}
