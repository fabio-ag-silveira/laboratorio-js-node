/**
 * Uma rede neural treinando no navegador.
 *
 * MLP pequeno (2 entradas → camadas ocultas → 1 saída), com forward e
 * backpropagation escritos à mão, sem biblioteca. Você escolhe os dados, a
 * arquitetura e a taxa de aprendizado, e vê a fronteira de decisão se formar
 * junto com as curvas de perda de treino e de validação.
 */

import { painel, quadro, slider, chips, botao, rng, el, tema, aoMudarTema } from './base.js';

const DADOS = {
  linear: 'dois grupos',
  circulo: 'círculo',
  xor: 'xor',
  espiral: 'espiral',
};

export const ARQUITETURAS = {
  nenhuma: { rotulo: 'sem camada oculta', camadas: [] },
  pequena: { rotulo: '1 oculta de 4', camadas: [4] },
  media: { rotulo: '2 ocultas de 8', camadas: [8, 8] },
  grande: { rotulo: '2 ocultas de 32', camadas: [32, 32] },
};

export function gerarDados(tipo, n, ruido, semente) {
  const r = rng(semente);
  const pontos = [];
  for (let i = 0; i < n; i++) {
    let x;
    let y;
    let classe;
    if (tipo === 'linear') {
      classe = i % 2;
      x = (classe ? 0.45 : -0.45) + r.normal(0, 0.22);
      y = (classe ? 0.35 : -0.35) + r.normal(0, 0.22);
    } else if (tipo === 'circulo') {
      classe = i % 2;
      const raio = classe ? r.entre(0.55, 0.9) : r.entre(0, 0.35);
      const a = r.entre(0, 2 * Math.PI);
      x = raio * Math.cos(a);
      y = raio * Math.sin(a);
    } else if (tipo === 'xor') {
      x = r.entre(-0.9, 0.9);
      y = r.entre(-0.9, 0.9);
      classe = x * y > 0 ? 1 : 0;
    } else {
      classe = i % 2;
      const t = r.entre(0.15, 1) * 3.2 * Math.PI * 0.5;
      const raio = t / (1.6 * Math.PI);
      x = raio * Math.cos(t + classe * Math.PI);
      y = raio * Math.sin(t + classe * Math.PI);
    }
    x += r.normal(0, ruido);
    y += r.normal(0, ruido);
    // ruído de rótulo: alguns exemplos vêm com a classe errada, como em dado real
    if (r() < ruido * 0.6) classe = 1 - classe;
    pontos.push({ x, y, classe, validacao: r() < 0.3 });
  }
  return pontos;
}

/** MLP com tanh nas ocultas e sigmoide na saída. */
export function criarRede(camadas, semente) {
  const r = rng(semente);
  const tamanhos = [2, ...camadas, 1];
  const W = [];
  const B = [];
  for (let l = 1; l < tamanhos.length; l++) {
    // inicialização de Xavier: escala os pesos pelo tamanho das camadas vizinhas,
    // para o sinal nem explodir nem sumir ao atravessar a rede
    const limite = Math.sqrt(6 / (tamanhos[l - 1] + tamanhos[l]));
    W.push(Float64Array.from({ length: tamanhos[l] * tamanhos[l - 1] }, () => r.entre(-limite, limite)));
    B.push(new Float64Array(tamanhos[l]));
  }
  return { tamanhos, W, B };
}

/** Forward de um ponto. Devolve as ativações de todas as camadas. */
function propagar(rede, x, y) {
  const ativ = [[x, y]];
  const L = rede.W.length;
  for (let l = 0; l < L; l++) {
    const entrada = ativ[l];
    const nSaida = rede.tamanhos[l + 1];
    const nEntrada = rede.tamanhos[l];
    const saida = new Array(nSaida);
    for (let j = 0; j < nSaida; j++) {
      let z = rede.B[l][j];
      for (let i = 0; i < nEntrada; i++) z += rede.W[l][j * nEntrada + i] * entrada[i];
      saida[j] = l === L - 1 ? 1 / (1 + Math.exp(-z)) : Math.tanh(z);
    }
    ativ.push(saida);
  }
  return ativ;
}

/** Um passo de descida de gradiente com o lote inteiro. Devolve a perda. */
export function passoDeTreino(rede, pontos, taxa, decaimento) {
  const L = rede.W.length;
  const gW = rede.W.map((w) => new Float64Array(w.length));
  const gB = rede.B.map((b) => new Float64Array(b.length));
  let perda = 0;

  for (const p of pontos) {
    const ativ = propagar(rede, p.x, p.y);
    const saida = Math.min(1 - 1e-7, Math.max(1e-7, ativ[L][0]));
    perda += -(p.classe * Math.log(saida) + (1 - p.classe) * Math.log(1 - saida));

    // Backpropagation. Com sigmoide + entropia cruzada, o erro na saída
    // simplifica para (previsto − real): toda a álgebra se cancela.
    let delta = [saida - p.classe];
    for (let l = L - 1; l >= 0; l--) {
      const nEntrada = rede.tamanhos[l];
      const nSaida = rede.tamanhos[l + 1];
      for (let j = 0; j < nSaida; j++) {
        gB[l][j] += delta[j];
        for (let i = 0; i < nEntrada; i++) gW[l][j * nEntrada + i] += delta[j] * ativ[l][i];
      }
      if (l === 0) break;
      // regra da cadeia: leva o erro para a camada anterior e multiplica pela
      // derivada da tanh, que é 1 − tanh²
      const anterior = new Array(nEntrada).fill(0);
      for (let i = 0; i < nEntrada; i++) {
        let s = 0;
        for (let j = 0; j < nSaida; j++) s += rede.W[l][j * nEntrada + i] * delta[j];
        anterior[i] = s * (1 - ativ[l][i] ** 2);
      }
      delta = anterior;
    }
  }

  const n = pontos.length;
  for (let l = 0; l < L; l++) {
    for (let k = 0; k < rede.W[l].length; k++) {
      // decaimento de peso (L2): puxa cada peso um pouco para zero
      rede.W[l][k] -= taxa * (gW[l][k] / n + decaimento * rede.W[l][k]);
    }
    for (let k = 0; k < rede.B[l].length; k++) rede.B[l][k] -= taxa * (gB[l][k] / n);
  }
  return perda / n;
}

export function avaliar(rede, pontos) {
  if (!pontos.length) return { perda: 0, acerto: 1 };
  let perda = 0;
  let certos = 0;
  for (const p of pontos) {
    const s = Math.min(1 - 1e-7, Math.max(1e-7, propagar(rede, p.x, p.y).at(-1)[0]));
    perda += -(p.classe * Math.log(s) + (1 - p.classe) * Math.log(1 - s));
    if (s > 0.5 === (p.classe === 1)) certos++;
  }
  return { perda: perda / pontos.length, acerto: certos / pontos.length };
}

export default function criar() {
  const p = painel('Rede neural treinando', 'forward e backpropagation escritos à mão, rodando no navegador');

  const qPlano = quadro('fronteira de decisão · círculo cheio = treino, vazado = validação', 360, 360);
  const qPerda = quadro('perda', 420, 360);
  p.corpo.append(qPlano.figura, qPerda.figura);

  let tipo = 'circulo';
  let arquitetura = 'pequena';
  let semente = 1;
  let pontos = [];
  let treino = [];
  let validacao = [];
  let rede = null;
  let epoca = 0;
  let historico = [];
  let rodando = false;

  function reiniciarRede() {
    rede = criarRede(ARQUITETURAS[arquitetura].camadas, semente * 31 + 7);
    epoca = 0;
    historico = [];
    pintar();
  }

  function novosDados() {
    pontos = gerarDados(tipo, sPontos.valor, sRuido.valor, semente);
    treino = pontos.filter((q) => !q.validacao);
    validacao = pontos.filter((q) => q.validacao);
    reiniciarRede();
  }

  function pintar() {
    const t = tema();
    // ---- plano com a fronteira ------------------------------------------
    const ctx = qPlano.ctx;
    const N = 60; // resolução da grade de avaliação
    const lado = qPlano.canvas.width / N;
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const x = (i + 0.5) / N * 2.4 - 1.2;
        const y = (j + 0.5) / N * 2.4 - 1.2;
        const s = propagar(rede, x, y).at(-1)[0];
        // azul para classe 0, laranja para classe 1; a intensidade é a certeza
        const f = Math.abs(s - 0.5) * 2;
        ctx.fillStyle = s > 0.5 ? `rgba(240,150,60,${0.15 + 0.55 * f})` : `rgba(70,140,230,${0.15 + 0.55 * f})`;
        ctx.clearRect(i * lado, j * lado, lado + 1, lado + 1);
        ctx.fillRect(i * lado, j * lado, lado + 1, lado + 1);
      }
    }
    const tela = (v) => ((v + 1.2) / 2.4) * qPlano.canvas.width;
    for (const q of pontos) {
      ctx.beginPath();
      ctx.arc(tela(q.x), tela(q.y), 4, 0, 2 * Math.PI);
      ctx.strokeStyle = q.classe ? '#c96a10' : '#1f62c4';
      ctx.fillStyle = q.classe ? '#f5a04a' : '#5aa2f0';
      ctx.lineWidth = 1.6;
      if (q.validacao) {
        ctx.fillStyle = t.fundo;
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fill();
        ctx.stroke();
      }
    }

    // ---- curvas de perda --------------------------------------------------
    const g = qPerda.ctx;
    const Wc = qPerda.canvas.width;
    const Hc = qPerda.canvas.height;
    const m = { e: 42, d: 12, c: 14, b: 30 };
    g.fillStyle = t.fundo;
    g.fillRect(0, 0, Wc, Hc);

    const atual = avaliar(rede, treino);
    const atualVal = avaliar(rede, validacao);

    if (historico.length > 1) {
      const topo = Math.max(0.8, ...historico.slice(0, 5).map((h) => Math.max(h.treino, h.val)));
      const px = (i) => m.e + (i / (historico.length - 1)) * (Wc - m.e - m.d);
      const py = (v) => Hc - m.b - Math.min(1, v / topo) * (Hc - m.c - m.b);
      g.strokeStyle = t.borda;
      g.fillStyle = t.texto3;
      g.font = '11px system-ui';
      g.textAlign = 'right';
      for (let k = 0; k <= 4; k++) {
        const v = (topo * k) / 4;
        g.beginPath();
        g.moveTo(m.e, py(v));
        g.lineTo(Wc - m.d, py(v));
        g.stroke();
        g.fillText(v.toFixed(2), m.e - 6, py(v) + 4);
      }
      const tracar = (campo, cor) => {
        g.strokeStyle = cor;
        g.lineWidth = 2;
        g.beginPath();
        historico.forEach((h, i) => (i ? g.lineTo(px(i), py(h[campo])) : g.moveTo(px(i), py(h[campo]))));
        g.stroke();
      };
      tracar('treino', t.destaque);
      tracar('val', t.rosa);
      g.textAlign = 'left';
      g.fillStyle = t.destaque;
      g.fillText('■ treino', m.e + 8, m.c + 12);
      g.fillStyle = t.rosa;
      g.fillText('■ validação', m.e + 76, m.c + 12);
    } else {
      g.fillStyle = t.texto3;
      g.font = '13px system-ui';
      g.textAlign = 'center';
      g.fillText('aperte ▶ treinar', Wc / 2, Hc / 2);
    }
    qPerda.titulo.textContent = `perda · época ${epoca}`;

    // ---- diagnóstico -------------------------------------------------------
    const pct = (v) => `${(v * 100).toFixed(0)}%`;
    let diagnostico = '';
    if (!Number.isFinite(atual.perda) || atual.perda > 5) {
      diagnostico = '<b style="color:var(--vermelho)">Divergiu.</b> A taxa de aprendizado está alta demais: cada passo pula para o outro lado do vale. Reduza e recomece.';
    } else if (epoca > 150) {
      const minimoVal = Math.min(...historico.map((h) => h.val));
      if (atual.acerto < 0.8) {
        diagnostico = `<b style="color:var(--amarelo)">Subajuste (viés alto).</b> Nem no treino a rede acerta. Falta capacidade para esta forma de fronteira${
          ARQUITETURAS[arquitetura].camadas.length ? ', ou falta treino' : ': sem camada oculta, a fronteira só pode ser uma reta'
        }.`;
      } else if (atualVal.perda > minimoVal * 1.25 && atual.perda < atualVal.perda * 0.7) {
        diagnostico = '<b style="color:var(--rosa)">Sobreajuste (variância alta).</b> A perda de treino segue caindo e a de validação voltou a subir: a rede está decorando o ruído. Saídas: mais dados, decaimento de peso, rede menor, ou parar no ponto mais baixo da validação.';
      } else if (atual.acerto - atualVal.acerto > 0.12) {
        diagnostico = '<b style="color:var(--rosa)">Distância grande entre treino e validação.</b> Sinal de sobreajuste começando.';
      } else {
        diagnostico = '<b style="color:var(--verde)">Bom ajuste.</b> Treino e validação andam juntos.';
      }
    }
    p.leitura.innerHTML = `
      <div class="vis-placar">
        <div><b>${epoca}</b><span>época</span></div>
        <div><b>${atual.perda.toFixed(3)}</b><span>perda treino</span></div>
        <div><b>${atualVal.perda.toFixed(3)}</b><span>perda validação</span></div>
        <div><b>${pct(atual.acerto)}</b><span>acerto treino</span></div>
        <div><b>${pct(atualVal.acerto)}</b><span>acerto validação</span></div>
      </div>${diagnostico ? `<p style="margin:10px 0 0">${diagnostico}</p>` : ''}`;
  }

  function quadroDeAnimacao() {
    if (!rodando) return;
    // se a lição foi fechada, o elemento saiu da página: para o laço
    if (!p.raiz.isConnected) {
      rodando = false;
      return;
    }
    // Até 10 épocas por quadro, mas sem passar de ~10 ms: a velocidade fica
    // parecida em máquina rápida e lenta, e a tela não engasga.
    const prazo = performance.now() + 10;
    for (let k = 0; k < 10 && performance.now() < prazo; k++) {
      const perda = passoDeTreino(rede, treino, sTaxa.valor, sDecaimento.valor);
      epoca++;
      if (epoca % 4 === 0) historico.push({ treino: perda, val: avaliar(rede, validacao).perda });
    }
    if (historico.length > 600) historico = historico.filter((_, i) => i % 2 === 0);
    pintar();
    requestAnimationFrame(quadroDeAnimacao);
  }

  const btTreinar = botao('▶ treinar', () => {
    rodando = !rodando;
    btTreinar.textContent = rodando ? '⏸ pausar' : '▶ treinar';
    if (rodando) requestAnimationFrame(quadroDeAnimacao);
  }, 'botao botao-principal');

  const parar = () => {
    rodando = false;
    btTreinar.textContent = '▶ treinar';
  };

  const sTaxa = slider({ rotulo: 'taxa de aprend.', min: 0.01, max: 3, passo: 0.01, valor: 0.5, formato: (v) => v.toFixed(2) });
  const sDecaimento = slider({ rotulo: 'decaimento (L2)', min: 0, max: 0.05, passo: 0.001, valor: 0, formato: (v) => v.toFixed(3) });
  const sPontos = slider({ rotulo: 'exemplos', min: 20, max: 300, passo: 10, valor: 120, aoMudar: () => { parar(); novosDados(); } });
  const sRuido = slider({ rotulo: 'ruído', min: 0, max: 0.3, passo: 0.01, valor: 0.06, formato: (v) => v.toFixed(2), aoMudar: () => { parar(); novosDados(); } });

  const seletorDados = chips(Object.entries(DADOS), 'circulo', (v) => {
    tipo = v;
    parar();
    novosDados();
  });
  const seletorRede = chips(Object.entries(ARQUITETURAS).map(([k, a]) => [k, a.rotulo]), 'pequena', (v) => {
    arquitetura = v;
    parar();
    reiniciarRede();
  });

  const linha1 = el('div', 'vis-linha');
  linha1.append(el('span', 'vis-rotulo', 'dados'), seletorDados.elemento);
  const linha2 = el('div', 'vis-linha');
  linha2.append(el('span', 'vis-rotulo', 'rede'), seletorRede.elemento);
  const linha3 = el('div', 'vis-linha');
  linha3.append(
    btTreinar,
    botao('↺ reiniciar pesos', () => {
      parar();
      semente++;
      reiniciarRede();
    }),
  );
  p.controles.append(linha1, linha2, linha3, sTaxa.elemento, sDecaimento.elemento, sPontos.elemento, sRuido.elemento);

  novosDados();
  aoMudarTema(p.raiz, pintar);
  return p.raiz;
}
