/**
 * Rastreamento por detecção, de brinquedo.
 *
 * Insetos andam pela cena; um "detector" marca cada um, quadro a quadro, com
 * falhas e com confiança baixa quando dois se cruzam. O rastreador liga as
 * detecções de um quadro às do anterior e dá um número (ID) a cada objeto.
 *
 * O painel compara associar só as detecções confiantes com a estratégia em
 * duas etapas do ByteTrack, que aproveita as detecções fracas para manter
 * vivos os rastros que já existem.
 */

import { painel, quadro, slider, chips, botao, rng, el, tema, aoMudarTema } from './base.js';

const W = 480;
const H = 300;
const QUADROS = 220;
const LINHA_X = W / 2; // linha de contagem
const CORES = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c', '#fd79a8', '#74b9ff', '#a29bfe', '#55efc4', '#fab1a0'];

/** Trajetórias e detecções de todos os quadros, fixas para uma semente. */
function simular(semente, nObjetos, falha) {
  const r = rng(semente);
  const objetos = Array.from({ length: nObjetos }, () => ({
    x: r.entre(30, W - 30),
    y: r.entre(30, H - 30),
    vx: r.entre(-2.4, 2.4),
    vy: r.entre(-1.6, 1.6),
    fase: r.entre(0, 6.28),
  }));

  const quadros = [];
  for (let t = 0; t < QUADROS; t++) {
    const posicoes = objetos.map((o) => {
      o.x += o.vx + 0.5 * Math.sin(t / 9 + o.fase);
      o.y += o.vy + 0.5 * Math.cos(t / 11 + o.fase);
      if (o.x < 14 || o.x > W - 14) o.vx *= -1;
      if (o.y < 14 || o.y > H - 14) o.vy *= -1;
      return { x: o.x, y: o.y };
    });

    const deteccoes = [];
    posicoes.forEach((p, i) => {
      // perto de outro inseto, a detecção sai fraca (oclusão parcial)
      const perto = posicoes.some((q, j) => j !== i && Math.hypot(p.x - q.x, p.y - q.y) < 26);
      if (r() < falha * (perto ? 1.6 : 1)) return; // o detector falhou neste quadro
      const conf = perto ? r.entre(0.18, 0.48) : r.entre(0.62, 0.97);
      deteccoes.push({ x: p.x + r.normal(0, 1.2), y: p.y + r.normal(0, 1.2), conf, real: i });
    });
    // falsos positivos de baixa confiança, em lugares aleatórios
    if (r() < 0.35) deteccoes.push({ x: r.entre(10, W - 10), y: r.entre(10, H - 10), conf: r.entre(0.15, 0.42), real: -1 });

    quadros.push({ posicoes, deteccoes });
  }
  return quadros;
}

export default function criar() {
  const p = painel('Rastrear é ligar detecções no tempo', 'cada cor é um ID atribuído pelo rastreador');
  const q = quadro('', W, H);
  p.corpo.append(q.figura);

  let semente = 3;
  let quadros = [];
  let t = 0;
  let rodando = false;
  let duasEtapas = false;

  const refazer = () => {
    quadros = simular(semente, sObjetos.valor, sFalha.valor / 100);
    pintar();
  };

  /** Quantas vezes os objetos REAIS cruzaram a linha até o quadro t. */
  function cruzamentosReais() {
    let n = 0;
    for (let k = 1; k <= t; k++) {
      quadros[k].posicoes.forEach((pos, i) => {
        if ((quadros[k - 1].posicoes[i].x - LINHA_X) * (pos.x - LINHA_X) < 0) n++;
      });
    }
    return n;
  }

  function pintar() {
    const cores = tema();
    const estado = rastrear(quadros, t, { duasEtapas, memoria: sMemoria.valor });
    const ctx = q.ctx;
    ctx.fillStyle = '#d9b92a';
    ctx.fillRect(0, 0, W, H);

    // linha de contagem
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(LINHA_X, 0);
    ctx.lineTo(LINHA_X, H);
    ctx.stroke();
    ctx.setLineDash([]);

    // os insetos de verdade
    for (const pos of quadros[t].posicoes) {
      ctx.fillStyle = '#2b261f';
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y, 9, 5, 0.4, 0, 2 * Math.PI);
      ctx.fill();
    }

    // detecções do quadro: contorno cheio = confiante, tracejado = fraca
    for (const d of quadros[t].deteccoes) {
      ctx.strokeStyle = d.conf >= 0.5 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.55)';
      ctx.setLineDash(d.conf >= 0.5 ? [] : [3, 3]);
      ctx.lineWidth = 1.2;
      ctx.strokeRect(d.x - 12, d.y - 9, 24, 18);
    }
    ctx.setLineDash([]);

    // rastros, com a trilha e o ID
    for (const x of estado.rastros) {
      const cor = CORES[(x.id - 1) % CORES.length];
      ctx.strokeStyle = cor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      x.rastro.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      ctx.stroke();
      ctx.globalAlpha = x.semVer ? 0.45 : 1;
      ctx.fillStyle = cor;
      ctx.font = 'bold 12px system-ui';
      ctx.fillText(String(x.id), x.x + 13, x.y - 9);
      ctx.globalAlpha = 1;
    }

    q.titulo.textContent = `quadro ${t + 1} de ${QUADROS} · contorno cheio = detecção confiante, tracejado = fraca`;
    const reais = sObjetos.valor;
    const excesso = estado.total - reais;
    p.leitura.innerHTML = `
      <div class="vis-placar">
        <div><b>${reais}</b><span>insetos de verdade</span></div>
        <div><b style="color:${excesso > 0 ? 'var(--vermelho)' : 'var(--verde)'}">${estado.total}</b><span>IDs criados</span></div>
        <div><b style="color:${estado.trocas ? 'var(--amarelo)' : 'var(--verde)'}">${estado.trocas}</b><span>trocas de ID</span></div>
        <div><b>${estado.cruzamentos}</b><span>cruzamentos contados</span></div>
        <div><b>${cruzamentosReais()}</b><span>cruzamentos reais</span></div>
      </div>
      <p style="margin:10px 0 0">${
        excesso > 0
          ? `O rastreador criou <b>${excesso} ID(s) a mais</b> do que há insetos: cada vez que um rastro se perde e o objeto reaparece, nasce um ID novo. Contar por "IDs únicos" superestima.`
          : 'Um ID por inseto até aqui.'
      } ${duasEtapas ? 'As detecções fracas estão mantendo os rastros vivos durante os cruzamentos.' : 'As detecções fracas (tracejadas) estão sendo jogadas fora.'}</p>`;
  }

  function animar() {
    if (!rodando) return;
    if (!p.raiz.isConnected) {
      rodando = false;
      return;
    }
    t = (t + 1) % QUADROS;
    pintar();
    setTimeout(() => requestAnimationFrame(animar), 45);
  }

  const btTocar = botao('▶ rodar', () => {
    rodando = !rodando;
    btTocar.textContent = rodando ? '⏸ pausar' : '▶ rodar';
    if (rodando) requestAnimationFrame(animar);
  }, 'botao botao-principal');

  const sObjetos = slider({ rotulo: 'insetos', min: 2, max: 10, valor: 6, aoMudar: refazer });
  const sFalha = slider({ rotulo: 'falha do detector', min: 0, max: 40, passo: 5, valor: 15, formato: (v) => `${v}%`, aoMudar: refazer });
  const sMemoria = slider({ rotulo: 'memória do rastro', min: 1, max: 30, valor: 6, formato: (v) => `${v} quadros`, aoMudar: pintar });

  const estrategia = chips(
    [
      ['uma', 'só detecções confiantes'],
      ['duas', 'duas etapas (ByteTrack)'],
    ],
    'uma',
    (v) => {
      duasEtapas = v === 'duas';
      pintar();
    },
  );

  const linha = el('div', 'vis-linha');
  linha.append(
    btTocar,
    botao('⏭ fim', () => {
      t = QUADROS - 1;
      pintar();
    }),
    botao('↺ início', () => {
      t = 0;
      pintar();
    }),
    botao('↻ outra cena', () => {
      semente++;
      t = 0;
      refazer();
    }),
    estrategia.elemento,
  );
  p.controles.append(linha, sObjetos.elemento, sFalha.elemento, sMemoria.elemento);

  refazer();
  aoMudarTema(p.raiz, pintar);
  return p.raiz;
}

/**
 * O rastreador: roda do quadro 0 até `ate` e devolve os rastros vivos, o total
 * de IDs criados, as trocas de identidade e os cruzamentos da linha contados.
 *
 * A associação é gulosa, pela menor distância entre a posição PREVISTA do
 * rastro (posição + velocidade) e a detecção. Rastreadores de verdade usam
 * filtro de Kalman para a previsão e o algoritmo húngaro para a associação;
 * a estrutura é esta.
 */
export function rastrear(quadros, ate, { duasEtapas, memoria }) {
  const LIMIAR_ALTO = 0.5;
  const PORTAO = 34;
  let rastros = [];
  let proximoId = 1;
  let trocas = 0;
  let cruzamentos = 0;

  for (let t = 0; t <= ate; t++) {
    const { deteccoes } = quadros[t];
    const fortes = deteccoes.filter((d) => d.conf >= LIMIAR_ALTO);
    const fracas = deteccoes.filter((d) => d.conf < LIMIAR_ALTO);
    const vistos = new Set(); // rastros atualizados neste quadro
    const usadas = new Set(); // detecções já associadas

    const associar = (candidatos, lista) => {
      const pares = [];
      for (const rastro of candidatos) {
        for (const d of lista) {
          const dist = Math.hypot(rastro.x + rastro.vx - d.x, rastro.y + rastro.vy - d.y);
          if (dist < PORTAO) pares.push({ rastro, d, dist });
        }
      }
      pares.sort((a, b) => a.dist - b.dist);
      for (const { rastro, d } of pares) {
        if (vistos.has(rastro) || usadas.has(d)) continue;
        vistos.add(rastro);
        usadas.add(d);
        if (d.real >= 0 && rastro.real >= 0 && d.real !== rastro.real) trocas++;
        if (d.real >= 0) rastro.real = d.real;
        if ((rastro.x - LINHA_X) * (d.x - LINHA_X) < 0) cruzamentos++;
        rastro.vx = 0.6 * rastro.vx + 0.4 * (d.x - rastro.x);
        rastro.vy = 0.6 * rastro.vy + 0.4 * (d.y - rastro.y);
        rastro.x = d.x;
        rastro.y = d.y;
        rastro.semVer = 0;
        rastro.rastro.push([d.x, d.y]);
        if (rastro.rastro.length > 26) rastro.rastro.shift();
      }
    };

    associar(rastros, fortes);
    if (duasEtapas) associar(rastros.filter((x) => !vistos.has(x)), fracas);

    // quem não foi visto envelhece e segue pela velocidade estimada
    for (const x of rastros) {
      if (vistos.has(x)) continue;
      x.semVer++;
      x.x += x.vx;
      x.y += x.vy;
    }
    rastros = rastros.filter((x) => x.semVer <= memoria);

    // rastro novo nasce só de detecção CONFIANTE que ficou sem par
    for (const d of fortes) {
      if (usadas.has(d)) continue;
      rastros.push({ id: proximoId++, x: d.x, y: d.y, vx: 0, vy: 0, semVer: 0, real: d.real, rastro: [[d.x, d.y]] });
    }
  }
  return { rastros, total: proximoId - 1, trocas, cruzamentos };
}

export { simular };
