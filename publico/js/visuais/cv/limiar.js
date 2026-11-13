/**
 * Contagem clássica: (tirar o fundo) → limiar → abertura → componentes conexos.
 * Como a armadilha é sintética, sabemos o gabarito e dá para mostrar
 * exatamente onde o método acerta, funde, inventa e perde.
 */

import { painel, quadro, slider, chips, fonteDeImagem, pixelsDe, desenharCinza, el } from './base.js';
import { paraCinza, limiarizar, otsu, blackHat, abrir, componentesConexos } from './processamento.js';

export default function criar(opcoes = {}) {
  const p = painel('Contar sem aprendizado', 'tirar o fundo → limiar → abertura → componentes conexos');

  const qSinal = quadro('sinal: quanto cada pixel é "objeto escuro"');
  const qMascara = quadro('máscara depois do limiar e da abertura');
  const qResultado = quadro('o que foi contado');
  p.corpo.append(qSinal.figura, qMascara.figura, qResultado.figura);

  let largura = 0;
  let altura = 0;
  let canvasFonte = null;
  let gabarito = null;
  let sinais = null; // { direto, semFundo } — calculados uma vez por imagem
  let fundo = 'remover';
  let corte = 'otsu';

  function calcular() {
    if (!sinais) return;
    const sinal = fundo === 'remover' ? sinais.semFundo : sinais.direto;
    desenharCinza(qSinal.canvas, Uint8ClampedArray.from(sinal), largura, altura);
    qSinal.titulo.textContent =
      fundo === 'remover' ? 'sinal: black-hat (o fundo virou zero)' : 'sinal: imagem invertida (o fundo veio junto)';

    let t = sLimiar.valor;
    if (corte === 'otsu') {
      t = otsu(sinal);
      sLimiar.valor = t;
    }

    let mascara = limiarizar(sinal, t, false); // objeto = sinal ALTO
    if (sAbertura.valor > 0) mascara = abrir(mascara, largura, altura, sAbertura.valor);

    const visivel = new Uint8Array(mascara.length);
    let ligados = 0;
    for (let i = 0; i < mascara.length; i++) {
      visivel[i] = mascara[i] * 255;
      ligados += mascara[i];
    }
    desenharCinza(qMascara.canvas, visivel, largura, altura);

    const { componentes } = componentesConexos(mascara, largura, altura);
    const validos = componentes.filter((c) => c.area >= sArea.valor);

    // ---- confronto com o gabarito ---------------------------------------
    qResultado.canvas.width = largura;
    qResultado.canvas.height = altura;
    const ctx = qResultado.ctx;
    ctx.drawImage(canvasFonte, 0, 0);
    ctx.lineWidth = 1.6;

    const dentro = (cx, cy, c) => cx >= c.x && cx <= c.x + c.w && cy >= c.y && cy <= c.y + c.h;
    let certos = 0;
    let fundidos = 0;
    let falsos = 0;
    const achados = new Set();
    const centros = (gabarito ?? []).map((g, i) => ({ i, cx: g.x + g.w / 2, cy: g.y + g.h / 2 }));

    for (const comp of validos) {
      let cor = '#3498db';
      if (gabarito) {
        // quantos insetos de verdade têm o centro dentro desta mancha?
        const cobertos = centros.filter((g) => dentro(g.cx, g.cy, comp));
        cobertos.forEach((g) => achados.add(g.i));
        if (cobertos.length === 1) {
          certos++;
          cor = '#2ecc71';
        } else if (cobertos.length > 1) {
          fundidos += cobertos.length - 1; // N insetos contados como 1
          cor = '#f1c40f';
        } else {
          falsos++;
          cor = '#e74c3c';
        }
      }
      ctx.strokeStyle = cor;
      ctx.strokeRect(comp.x - 1, comp.y - 1, comp.w + 2, comp.h + 2);
    }

    const cobertura = (ligados / mascara.length) * 100;
    const fundoVazou =
      cobertura > 12
        ? `<p style="margin:10px 0 0;color:var(--vermelho)"><b>${cobertura.toFixed(0)}% da imagem virou "objeto".</b>
           O corte caiu no meio do fundo: os insetos são tão poucos pixels que os dois grupos que o Otsu encontra são
           o lado claro e o lado escuro do cartão. Volte para <b>remover o fundo</b>.</p>`
        : '';

    if (!gabarito) {
      p.leitura.innerHTML = `<div class="vis-placar"><div><b>${validos.length}</b><span>contados</span></div></div>
        Imagem sua não tem gabarito: só você sabe se a contagem bate.${fundoVazou}`;
      return;
    }

    const perdidos = gabarito.length - achados.size;
    const erro = validos.length - gabarito.length;
    let comentario = 'Verde = um inseto, uma mancha. Amarelo = vários insetos encostados viraram um. Vermelho = sujeira contada como inseto.';
    if (Math.abs(erro) <= 1 && fundidos + falsos > 1) {
      comentario =
        'A contagem quase bate, mas por <b>erros que se cancelam</b>: insetos fundidos tiram de um lado, sujeira põe do outro. Número certo pelo motivo errado.';
    }
    p.leitura.innerHTML = `
      <div class="vis-placar">
        <div><b>${validos.length}</b><span>contados</span></div>
        <div><b>${gabarito.length}</b><span>gabarito</span></div>
        <div><b style="color:var(--verde)">${certos}</b><span>certos</span></div>
        <div><b style="color:var(--amarelo)">${fundidos}</b><span>fundidos</span></div>
        <div><b style="color:var(--vermelho)">${falsos}</b><span>falsos</span></div>
        <div><b>${perdidos}</b><span>perdidos</span></div>
      </div>
      <p style="margin:10px 0 0">Erro de contagem: <b>${erro > 0 ? '+' : ''}${erro}</b>. ${comentario}</p>${fundoVazou}`;
  }

  const sLimiar = slider({
    rotulo: 'limiar',
    min: 0,
    max: 255,
    valor: 50,
    aoMudar: () => {
      if (corte === 'otsu') seletorCorte.selecionar('manual');
      else calcular();
    },
  });
  const sAbertura = slider({ rotulo: 'abertura (raio)', min: 0, max: 4, valor: 1, formato: (v) => (v ? `${v} px` : 'sem'), aoMudar: calcular });
  const sArea = slider({ rotulo: 'área mínima', min: 1, max: 200, valor: 12, formato: (v) => `${v} px²`, aoMudar: calcular });

  const seletorFundo = chips(
    [
      ['remover', 'remover o fundo (black-hat)'],
      ['manter', 'usar a imagem direto'],
    ],
    'remover',
    (v) => {
      fundo = v;
      calcular();
    },
  );
  const seletorCorte = chips(
    [
      ['otsu', 'corte por Otsu'],
      ['manual', 'corte manual'],
    ],
    'otsu',
    (v) => {
      corte = v;
      calcular();
    },
  );

  // A cena é ajustável: com poucos insetos o Otsu direto falha; com muitos e
  // aglomerados, o que falha é a separação. O objeto é mutável de propósito —
  // `fonteDeImagem` lê os valores atuais a cada nova armadilha.
  const cena = { insetos: 26, detritos: 7, aglomerado: 0.45, ...opcoes };
  const sInsetos = slider({
    rotulo: 'insetos',
    min: 4,
    max: 90,
    valor: cena.insetos,
    aoMudar: (v) => {
      cena.insetos = v;
      origem.gerar();
    },
  });
  const sAglomerado = slider({
    rotulo: 'aglomeração',
    min: 0,
    max: 100,
    passo: 5,
    valor: cena.aglomerado * 100,
    formato: (v) => `${v}%`,
    aoMudar: (v) => {
      cena.aglomerado = v / 100;
      origem.gerar();
    },
  });

  const origem = fonteDeImagem({
    alvoDeSoltar: p.corpo,
    opcoes: cena,
    aoTrocar(amostra) {
      canvasFonte = amostra.canvas;
      gabarito = amostra.gabarito;
      const px = pixelsDe(amostra.canvas);
      largura = px.width;
      altura = px.height;
      const cinza = paraCinza(px.data);
      const direto = new Float32Array(cinza.length);
      for (let i = 0; i < cinza.length; i++) direto[i] = 255 - cinza[i];
      sinais = { direto, semFundo: blackHat(cinza, largura, altura, 22) };
      calcular();
    },
  });

  const linha1 = el('div', 'vis-linha');
  linha1.append(el('span', 'vis-rotulo', 'fundo'), seletorFundo.elemento);
  const linha2 = el('div', 'vis-linha');
  linha2.append(el('span', 'vis-rotulo', 'corte'), seletorCorte.elemento, origem.elemento);
  const linha3 = el('div', 'vis-linha');
  linha3.append(el('span', 'vis-rotulo', 'cena'), sInsetos.elemento, sAglomerado.elemento);
  p.controles.append(linha3, linha1, linha2, sLimiar.elemento, sAbertura.elemento, sArea.elemento);
  origem.gerar();
  return p.raiz;
}
