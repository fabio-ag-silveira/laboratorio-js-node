/**
 * Aumentação de dados com as caixas acompanhando.
 *
 * Cada transformação geométrica aplicada à imagem precisa ser aplicada às
 * anotações. O painel mostra a imagem aumentada, as caixas recalculadas e o
 * efeito colateral de cada escolha (caixa que incha ao girar, objeto que sai
 * do quadro, cor que deixa de existir no mundo real).
 */

import { painel, quadro, slider, chips, botao, gerarArmadilha, desenharCaixas, rng, el } from './base.js';

const W = 480;
const H = 360;

const PREDEFINIDOS = {
  nenhuma: { rotulo: 'nenhuma', rot: 0, escala: 1, dx: 0, flip: false, matiz: 0, sat: 1, brilho: 1, desfoque: 0 },
  moderada: { rotulo: 'moderada (típica)', rot: 4, escala: 0.85, dx: 0.06, flip: true, matiz: 5, sat: 1.3, brilho: 0.85, desfoque: 0 },
  exagerada: { rotulo: 'exagerada', rot: 38, escala: 0.6, dx: 0.2, flip: false, matiz: 95, sat: 1.9, brilho: 1.3, desfoque: 2 },
};

export default function criar() {
  const p = painel('Aumentação de dados', 'a imagem muda e as caixas têm de mudar junto');

  const qOriginal = quadro('original com as anotações', W, H);
  const qAumentada = quadro('aumentada', W, H);
  p.corpo.append(qOriginal.figura, qAumentada.figura);

  let semente = 2;
  let amostra = null;
  let mosaico = false;
  let flip = false;

  /** Matriz afim 2×3 da transformação: escala, espelha e gira em torno do centro, depois translada. */
  function matriz({ rot, escala, dx, espelhar }) {
    const a = (rot * Math.PI) / 180;
    const c = Math.cos(a) * escala;
    const s = Math.sin(a) * escala;
    const ex = espelhar ? -1 : 1;
    // x' = c·ex·(x − cx) − s·(y − cy) + cx + tx
    return {
      a: c * ex,
      b: s * ex,
      c: -s,
      d: c,
      e: W / 2 - c * ex * (W / 2) + s * (H / 2) + dx * W,
      f: H / 2 - s * ex * (W / 2) - c * (H / 2),
    };
  }

  const aplicar = (m, x, y) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];

  /** Leva uma caixa pela matriz: transforma os 4 cantos e envolve o resultado. */
  function transformarCaixa(m, cx) {
    const cantos = [
      aplicar(m, cx.x, cx.y),
      aplicar(m, cx.x + cx.w, cx.y),
      aplicar(m, cx.x + cx.w, cx.y + cx.h),
      aplicar(m, cx.x, cx.y + cx.h),
    ];
    const xs = cantos.map((q) => q[0]);
    const ys = cantos.map((q) => q[1]);
    const x0 = Math.min(...xs);
    const y0 = Math.min(...ys);
    const inteira = { classe: cx.classe, x: x0, y: y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0 };
    // recorta na borda da imagem
    const x1 = Math.max(0, inteira.x);
    const y1 = Math.max(0, inteira.y);
    const x2 = Math.min(W, inteira.x + inteira.w);
    const y2 = Math.min(H, inteira.y + inteira.h);
    const visivel = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    return { inteira, recortada: { classe: cx.classe, x: x1, y: y1, w: x2 - x1, h: y2 - y1 }, fracao: visivel / (inteira.w * inteira.h) };
  }

  function desenharAumentada(ctx, origem, parametros, destino = { x: 0, y: 0, k: 1 }) {
    const m = matriz(parametros);
    ctx.save();
    ctx.beginPath();
    ctx.rect(destino.x, destino.y, W * destino.k, H * destino.k);
    ctx.clip();
    ctx.translate(destino.x, destino.y);
    ctx.scale(destino.k, destino.k);
    ctx.fillStyle = '#727272'; // cinza neutro onde a imagem não alcança, como o YOLO faz
    ctx.fillRect(0, 0, W, H);
    // filtros de cor do próprio canvas: matiz, saturação, brilho e desfoque
    ctx.filter = `hue-rotate(${parametros.matiz}deg) saturate(${parametros.sat}) brightness(${parametros.brilho}) blur(${parametros.desfoque}px)`;
    ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f);
    ctx.drawImage(origem.canvas, 0, 0);
    ctx.restore();

    const caixas = [];
    let perdidas = 0;
    let inchaco = 0;
    for (const g of origem.gabarito) {
      const t = transformarCaixa(m, g);
      // objeto com menos de 30% visível deixa de ser anotado
      if (t.fracao < 0.3) {
        perdidas++;
        continue;
      }
      inchaco += (t.inteira.w * t.inteira.h) / (g.w * g.h * parametros.escala ** 2);
      const r = t.recortada;
      caixas.push({ classe: r.classe, x: destino.x + r.x * destino.k, y: destino.y + r.y * destino.k, w: r.w * destino.k, h: r.h * destino.k });
    }
    return { caixas, perdidas, inchaco: caixas.length ? inchaco / caixas.length : 1 };
  }

  function parametrosAtuais() {
    return {
      rot: sRot.valor,
      escala: sEscala.valor,
      dx: sDx.valor,
      espelhar: flip,
      matiz: sMatiz.valor,
      sat: sSat.valor,
      brilho: sBrilho.valor,
      desfoque: sDesfoque.valor,
    };
  }

  function pintar() {
    qOriginal.ctx.drawImage(amostra.canvas, 0, 0);
    desenharCaixas(qOriginal.ctx, amostra.gabarito);

    const ctx = qAumentada.ctx;
    const par = parametrosAtuais();
    let resultado;

    if (mosaico) {
      // mosaico: quatro imagens num quadro só, cada uma pela metade
      const r = rng(semente * 53);
      const todas = { caixas: [], perdidas: 0, inchaco: 0 };
      [0, 1, 2, 3].forEach((i) => {
        const outra = i === 0 ? amostra : gerarArmadilha({ largura: W, altura: H, semente: semente * 10 + i, insetos: 22, detritos: 5 });
        const local = { ...par, rot: par.rot * r.entre(-1, 1), espelhar: r() < 0.5 };
        const res = desenharAumentada(ctx, outra, local, { x: (i % 2) * (W / 2), y: Math.floor(i / 2) * (H / 2), k: 0.5 });
        todas.caixas.push(...res.caixas);
        todas.perdidas += res.perdidas;
        todas.inchaco += res.inchaco / 4;
      });
      resultado = todas;
    } else {
      resultado = desenharAumentada(ctx, amostra, par);
    }
    desenharCaixas(ctx, resultado.caixas);

    const avisos = [];
    if (Math.abs(par.matiz) > 25) avisos.push('<b style="color:var(--vermelho)">Matiz girado demais:</b> cartão verde ou rosa não existe em campo. O modelo gasta capacidade aprendendo um mundo que nunca vai ver.');
    if (resultado.inchaco > 1.25) avisos.push(`<b style="color:var(--amarelo)">As caixas incharam ${((resultado.inchaco - 1) * 100).toFixed(0)}% em área.</b> A caixa alinhada aos eixos de um objeto girado é maior que o objeto. O modelo aprende caixas frouxas, e o IoU na avaliação cai.`);
    if (resultado.perdidas > 0) avisos.push(`${resultado.perdidas} objeto(s) saíram do quadro e perderam a anotação.`);
    if (par.desfoque >= 1.5) avisos.push('Com esse desfoque, os insetos menores viram borrão: a anotação passa a apontar para algo que nem uma pessoa reconheceria.');
    if (mosaico) avisos.push('<b>Mosaico:</b> cada imagem entra pela metade do tamanho. Bom para variar contexto e aumentar objetos por lote, mas os insetos pequenos ficam com metade dos pixels. Por isso se desliga o mosaico nas últimas épocas.');
    if (!avisos.length) avisos.push('Variação plausível: é o tipo de diferença que existe entre duas fotos reais.');

    p.leitura.innerHTML = `<b>${resultado.caixas.length}</b> caixas na imagem aumentada (original: ${amostra.gabarito.length}). ${avisos.join(' ')}`;
  }

  const grau = (v) => `${v}°`;
  const vezes = (v) => `×${v.toFixed(2)}`;
  const sRot = slider({ rotulo: 'rotação', min: -45, max: 45, valor: 0, formato: grau, aoMudar: pintar });
  const sEscala = slider({ rotulo: 'escala', min: 0.4, max: 1.6, passo: 0.05, valor: 1, formato: vezes, aoMudar: pintar });
  const sDx = slider({ rotulo: 'translação', min: -0.3, max: 0.3, passo: 0.01, valor: 0, formato: (v) => `${(v * 100).toFixed(0)}%`, aoMudar: pintar });
  const sMatiz = slider({ rotulo: 'matiz', min: -120, max: 120, valor: 0, formato: grau, aoMudar: pintar });
  const sSat = slider({ rotulo: 'saturação', min: 0.2, max: 2, passo: 0.05, valor: 1, formato: vezes, aoMudar: pintar });
  const sBrilho = slider({ rotulo: 'brilho', min: 0.4, max: 1.6, passo: 0.05, valor: 1, formato: vezes, aoMudar: pintar });
  const sDesfoque = slider({ rotulo: 'desfoque', min: 0, max: 4, passo: 0.5, valor: 0, formato: (v) => `${v} px`, aoMudar: pintar });

  function definir(d) {
    sRot.valor = d.rot;
    sEscala.valor = d.escala;
    sDx.valor = d.dx;
    sMatiz.valor = d.matiz;
    sSat.valor = d.sat;
    sBrilho.valor = d.brilho;
    sDesfoque.valor = d.desfoque;
    flip = d.flip;
    seletorFlip.marcar(flip);
    pintar();
  }

  const atalhos = chips(Object.entries(PREDEFINIDOS).map(([k, d]) => [k, d.rotulo]), 'nenhuma', (nome) => definir(PREDEFINIDOS[nome]));

  // botões de liga/desliga independentes (não são exclusivos entre si)
  const alternador = (rotulo, aoMudar) => {
    const b = botao(rotulo, () => {
      b.classList.toggle('ativo');
      aoMudar(b.classList.contains('ativo'));
    }, 'vis-chip');
    return { elemento: b, marcar: (v) => b.classList.toggle('ativo', v) };
  };
  const seletorFlip = alternador('espelhar', (v) => {
    flip = v;
    pintar();
  });
  const seletorMosaico = alternador('mosaico', (v) => {
    mosaico = v;
    pintar();
  });

  const gerar = () => {
    amostra = gerarArmadilha({ largura: W, altura: H, semente, insetos: 22, detritos: 5, aglomerado: 0.2 });
    pintar();
  };

  const linha = el('div', 'vis-linha');
  linha.append(
    atalhos.elemento,
    seletorFlip.elemento,
    seletorMosaico.elemento,
    botao('🎲 sortear', () => {
      const r = rng(Math.floor(Math.random() * 1e9));
      definir({
        rot: Math.round(r.entre(-8, 8)),
        escala: Number(r.entre(0.7, 1.25).toFixed(2)),
        dx: Number(r.entre(-0.1, 0.1).toFixed(2)),
        flip: r() < 0.5,
        matiz: Math.round(r.entre(-6, 6)),
        sat: Number(r.entre(0.6, 1.5).toFixed(2)),
        brilho: Number(r.entre(0.7, 1.3).toFixed(2)),
        desfoque: 0,
      });
    }),
    botao('↻ outra armadilha', () => {
      semente++;
      gerar();
    }),
  );
  p.controles.append(linha, sRot.elemento, sEscala.elemento, sDx.elemento, sMatiz.elemento, sSat.elemento, sBrilho.elemento, sDesfoque.elemento);

  gerar();
  return p.raiz;
}
