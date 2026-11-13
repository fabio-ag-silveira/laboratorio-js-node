/**
 * Simulador de métricas de detecção.
 *
 * Um detector simulado (com os defeitos de um de verdade) roda sobre várias
 * armadilhas sintéticas. Você move o limiar de confiança e o de IoU e vê, ao
 * mesmo tempo: os erros pintados na imagem, precisão/recall/F1 e o ponto de
 * operação andando sobre a curva PR.
 */

import { painel, quadro, slider, chips, botao, gerarArmadilha, el, tema, aoMudarTema } from './base.js';
import { simularDetector, casar } from './deteccao.js';

const N_IMAGENS = 12; // a curva PR precisa de mais objetos do que cabem numa imagem
const W = 480;
const H = 360;

export default function criar(opcoes = {}) {
  const p = painel('Simulador de métricas', `${N_IMAGENS} armadilhas avaliadas; a imagem mostra a primeira`);

  const qImagem = quadro('verde = acerto · vermelho = falso positivo · amarelo = não detectado', W, H);
  const qCurva = quadro('curva precisão × recall', 420, 360);
  p.corpo.append(qImagem.figura, qCurva.figura);

  let semente = opcoes.semente ?? 1;
  let perfil = 'v1';
  let porClasse = true;
  let conjunto = []; // [{ canvas, gabarito, deteccoes }]

  function gerar() {
    conjunto = [];
    for (let i = 0; i < N_IMAGENS; i++) {
      const s = semente * 100 + i;
      const amostra = gerarArmadilha({ largura: W, altura: H, semente: s, insetos: 30, detritos: 9, aglomerado: 0.3 });
      conjunto.push({
        ...amostra,
        deteccoes: simularDetector(amostra.gabarito, amostra.detritos, { perfil, semente: s, largura: W, altura: H }),
      });
    }
    pintar();
  }

  /**
   * Curva PR do CONJUNTO: o casamento é por imagem (uma detecção só pode casar
   * com objeto da própria imagem), mas a ordenação por confiança é global.
   */
  function curvaDoConjunto(iouMin) {
    const todas = [];
    let totalObjetos = 0;
    for (const img of conjunto) {
      totalObjetos += img.gabarito.length;
      const { tp } = casar(img.deteccoes, img.gabarito, { iouMin, porClasse });
      const certos = new Set(tp.map((t) => t.deteccao));
      img.deteccoes.forEach((d, i) => todas.push({ conf: d.conf, certo: certos.has(i) }));
    }
    todas.sort((a, b) => b.conf - a.conf);

    const pontos = [];
    let certos = 0;
    todas.forEach((d, i) => {
      if (d.certo) certos++;
      pontos.push({ conf: d.conf, precisao: certos / (i + 1), recall: certos / totalObjetos });
    });
    const env = pontos.map((q) => q.precisao);
    for (let i = env.length - 2; i >= 0; i--) env[i] = Math.max(env[i], env[i + 1]);
    let ap = 0;
    let anterior = 0;
    pontos.forEach((q, i) => {
      ap += (q.recall - anterior) * env[i];
      anterior = q.recall;
    });
    return { pontos, env, ap };
  }

  function pintar() {
    if (!conjunto.length) return;
    const conf = sConf.valor;
    const iouMin = sIou.valor;
    const t = tema();

    // ---- placar do conjunto no limiar atual ------------------------------
    let TP = 0;
    let FP = 0;
    let FN = 0;
    const porOrigem = { detrito: 0, fundo: 0, duplicata: 0, objeto: 0 };
    for (const img of conjunto) {
      const r = casar(img.deteccoes, img.gabarito, { iouMin, confMin: conf, porClasse });
      TP += r.tp.length;
      FP += r.fp.length;
      FN += r.fn.length;
      r.fp.forEach((f) => porOrigem[img.deteccoes[f.deteccao].origem]++);
    }
    const precisao = TP + FP ? TP / (TP + FP) : 1;
    const recall = TP + FN ? TP / (TP + FN) : 0;
    const f1 = precisao + recall ? (2 * precisao * recall) / (precisao + recall) : 0;

    // ---- imagem: a primeira do conjunto ----------------------------------
    const primeira = conjunto[0];
    const r0 = casar(primeira.deteccoes, primeira.gabarito, { iouMin, confMin: conf, porClasse });
    const ctx = qImagem.ctx;
    ctx.drawImage(primeira.canvas, 0, 0);
    ctx.lineWidth = 1.8;
    ctx.font = '10px ui-monospace, Consolas, monospace';
    const desenhar = (c, cor, tracejado) => {
      ctx.setLineDash(tracejado ? [4, 3] : []);
      ctx.strokeStyle = cor;
      ctx.strokeRect(c.x, c.y, c.w, c.h);
    };
    r0.fn.forEach((k) => desenhar(primeira.gabarito[k], '#f1c40f', true));
    r0.tp.forEach((x) => desenhar(primeira.deteccoes[x.deteccao], '#2ecc71'));
    r0.fp.forEach((x) => {
      const d = primeira.deteccoes[x.deteccao];
      desenhar(d, '#e74c3c');
      ctx.fillStyle = '#e74c3c';
      ctx.fillText(d.conf.toFixed(2), d.x, d.y - 2);
    });
    ctx.setLineDash([]);

    // ---- curva PR ---------------------------------------------------------
    const curva = curvaDoConjunto(iouMin);
    const g = qCurva.ctx;
    const Wc = qCurva.canvas.width;
    const Hc = qCurva.canvas.height;
    const m = { e: 44, d: 14, c: 14, b: 38 };
    const px = (rec) => m.e + rec * (Wc - m.e - m.d);
    const py = (pre) => Hc - m.b - pre * (Hc - m.c - m.b);

    g.fillStyle = t.fundo;
    g.fillRect(0, 0, Wc, Hc);
    g.strokeStyle = t.borda;
    g.fillStyle = t.texto3;
    g.font = '11px system-ui';
    g.lineWidth = 1;
    for (let v = 0; v <= 1.001; v += 0.25) {
      g.beginPath();
      g.moveTo(px(0), py(v));
      g.lineTo(px(1), py(v));
      g.moveTo(px(v), py(0));
      g.lineTo(px(v), py(1));
      g.stroke();
      g.textAlign = 'right';
      g.fillText(v.toFixed(2), m.e - 6, py(v) + 4);
      g.textAlign = 'center';
      g.fillText(v.toFixed(2), px(v), Hc - m.b + 16);
    }
    g.fillText('recall', px(0.5), Hc - 6);
    g.save();
    g.translate(12, py(0.5));
    g.rotate(-Math.PI / 2);
    g.fillText('precisão', 0, 0);
    g.restore();

    if (curva.pontos.length) {
      // área sob a envoltória = AP
      g.beginPath();
      g.moveTo(px(0), py(0));
      g.lineTo(px(0), py(curva.env[0]));
      curva.pontos.forEach((q, i) => g.lineTo(px(q.recall), py(curva.env[i])));
      g.lineTo(px(curva.pontos.at(-1).recall), py(0));
      g.closePath();
      g.fillStyle = 'rgba(106,169,240,0.16)';
      g.fill();

      // curva crua (serrilhada) e envoltória
      g.strokeStyle = t.texto3;
      g.lineWidth = 1;
      g.beginPath();
      curva.pontos.forEach((q, i) => (i ? g.lineTo(px(q.recall), py(q.precisao)) : g.moveTo(px(q.recall), py(q.precisao))));
      g.stroke();
      g.strokeStyle = t.destaque;
      g.lineWidth = 2;
      g.beginPath();
      curva.pontos.forEach((q, i) => (i ? g.lineTo(px(q.recall), py(curva.env[i])) : g.moveTo(px(q.recall), py(curva.env[i]))));
      g.stroke();

      // melhor F1 da curva
      let melhor = curva.pontos[0];
      let melhorF1 = 0;
      for (const q of curva.pontos) {
        const f = q.precisao + q.recall ? (2 * q.precisao * q.recall) / (q.precisao + q.recall) : 0;
        if (f > melhorF1) {
          melhorF1 = f;
          melhor = q;
        }
      }
      g.strokeStyle = t.verde;
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(px(melhor.recall), py(melhor.precisao), 7, 0, 2 * Math.PI);
      g.stroke();
      qCurva.titulo.textContent = `curva PR · AP@${iouMin.toFixed(2)} = ${curva.ap.toFixed(3)} · anel verde: melhor F1 (conf ${melhor.conf.toFixed(2)})`;
    }

    // ponto de operação atual
    g.fillStyle = '#ff3b6b';
    g.beginPath();
    g.arc(px(recall), py(precisao), 5.5, 0, 2 * Math.PI);
    g.fill();

    // ---- leitura -----------------------------------------------------------
    const pct = (v) => `${(v * 100).toFixed(1)}%`;
    const origem = FP
      ? `De onde vêm os falsos positivos: <b>${porOrigem.detrito}</b> de sujeira, <b>${porOrigem.duplicata}</b> de caixa duplicada,
         <b>${porOrigem.objeto}</b> de inseto com caixa ruim ou classe trocada, <b>${porOrigem.fundo}</b> do fundo.`
      : 'Nenhum falso positivo neste limiar.';
    p.leitura.innerHTML = `
      <div class="vis-placar">
        <div><b style="color:var(--verde)">${TP}</b><span>TP</span></div>
        <div><b style="color:var(--vermelho)">${FP}</b><span>FP</span></div>
        <div><b style="color:var(--amarelo)">${FN}</b><span>FN</span></div>
        <div><b>${pct(precisao)}</b><span>precisão</span></div>
        <div><b>${pct(recall)}</b><span>recall</span></div>
        <div><b>${pct(f1)}</b><span>F1</span></div>
        <div><b>${curva.ap.toFixed(3)}</b><span>AP@${iouMin.toFixed(2)}</span></div>
      </div>
      <p style="margin:10px 0 0">${origem}
      Mover o limiar de confiança desloca o ponto vermelho <b>sobre</b> a curva; o AP não muda, porque ele resume a curva inteira.
      Mover o limiar de IoU muda a <b>própria curva</b>.</p>`;
  }

  const sConf = slider({ rotulo: 'confiança mín.', min: 0, max: 0.99, passo: 0.01, valor: 0.25, formato: (v) => v.toFixed(2), aoMudar: pintar });
  const sIou = slider({ rotulo: 'IoU mín.', min: 0.3, max: 0.95, passo: 0.05, valor: 0.5, formato: (v) => v.toFixed(2), aoMudar: pintar });

  const modelos = chips(
    [
      ['v1', 'modelo v1'],
      ['v2', 'modelo v2 (menos falsos)'],
    ],
    'v1',
    (v) => {
      perfil = v;
      gerar();
    },
  );
  const classe = chips(
    [
      ['sim', 'exigir classe certa'],
      ['nao', 'ignorar classe'],
    ],
    'sim',
    (v) => {
      porClasse = v === 'sim';
      pintar();
    },
  );

  const linha = el('div', 'vis-linha');
  linha.append(
    modelos.elemento,
    classe.elemento,
    botao('↻ outro conjunto', () => {
      semente++;
      gerar();
    }),
  );
  p.controles.append(linha, sConf.elemento, sIou.elemento);

  gerar();
  aoMudarTema(p.raiz, pintar);
  return p.raiz;
}
