/**
 * Mapa de detectores de tempo real: precisão × latência, com os números que
 * os AUTORES reportaram. Clicar num ponto mostra o que se sabe e o que não se
 * sabe sobre aquele número — que é a habilidade que o componente ensina.
 *
 * Dados conferidos em novembro de 2026. Fontes na lição.
 */

import { painel, quadro, chips, el, tema, aoMudarTema } from './base.js';

const COR = { 'AGPL-3.0': '#e67e22', 'Apache-2.0': '#2ecc71' };

// ap = AP no COCO val (50-95). ms = latência em GPU T4 com TensorRT, conforme o autor.
const MODELOS = [
  { nome: 'YOLO26n', familia: 'YOLO26', ap: 40.9, ms: 1.7, licenca: 'AGPL-3.0', quem: 'Ultralytics (autores)', nota: 'Extremo pequeno da família. Sem NMS, então a latência já inclui o pós-processamento.' },
  { nome: 'YOLO26x', familia: 'YOLO26', ap: 57.5, ms: 11.8, licenca: 'AGPL-3.0', quem: 'Ultralytics (autores)', nota: 'Extremo grande da família. Os tamanhos s, m e l ficam entre os dois pontos.' },
  { nome: 'RT-DETR-L', familia: 'RT-DETR', ap: 53.1, ms: 9.3, licenca: 'Apache-2.0', quem: 'Baidu (autores)', nota: 'Reportado como 108 FPS. Primeiro DETR de tempo real (2023).' },
  { nome: 'D-FINE-L', familia: 'D-FINE', ap: 54.0, ms: 8.1, licenca: 'Apache-2.0', quem: 'USTC (autores)', nota: 'Reportado como 124 FPS. O artigo do RF-DETR aponta que o D-FINE ajustou hiperparâmetros no conjunto de validação do COCO.' },
  { nome: 'D-FINE-X', familia: 'D-FINE', ap: 55.8, ms: 12.8, licenca: 'Apache-2.0', quem: 'USTC (autores)', nota: 'Reportado como 78 FPS. Um blog de terceiros cita esse número como "78 ms": erro de unidade, e um bom motivo para ir à fonte.' },
  { nome: 'DEIM-D-FINE-L', familia: 'DEIM', ap: 54.7, ms: 8.1, licenca: 'Apache-2.0', quem: 'autores do DEIM', nota: 'Mesma arquitetura do D-FINE-L, treinada com outro método. A latência é igual por construção.' },
  { nome: 'DEIM-D-FINE-X', familia: 'DEIM', ap: 56.5, ms: 12.8, licenca: 'Apache-2.0', quem: 'autores do DEIM', nota: 'O ganho sobre o D-FINE-X vem só do treino.' },
  { nome: 'RF-DETR nano', familia: 'RF-DETR', ap: 48.2, ms: 2.3, licenca: 'Apache-2.0', quem: 'Roboflow (autores)', nota: 'O artigo cita 48,0 e o blog da empresa 48,4: até entre fontes do mesmo autor o número varia. Os tamanhos maiores passam de 60 AP, com licença própria nos dois maiores.' },
];

export default function criar() {
  const p = painel('Detectores de tempo real em 2026', 'números reportados pelos autores · clique num ponto');

  const q = quadro('', 640, 380);
  q.canvas.classList.add('mira');
  const lateral = el('div', 'vis-lateral');
  p.corpo.append(q.figura, lateral);

  let filtro = 'todas';
  let escolhido = MODELOS[0];
  let posicoes = [];

  function pintar() {
    const t = tema();
    const ctx = q.ctx;
    const W = q.canvas.width;
    const H = q.canvas.height;
    const m = { e: 48, d: 16, c: 16, b: 40 };
    // eixo x em escala logarítmica: de 1 a 16 ms
    const px = (ms) => m.e + (Math.log2(ms) / 4) * (W - m.e - m.d);
    const py = (ap) => H - m.b - ((ap - 38) / (60 - 38)) * (H - m.c - m.b);

    ctx.fillStyle = t.fundo;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = t.borda;
    ctx.fillStyle = t.texto3;
    ctx.font = '11px system-ui';
    ctx.lineWidth = 1;
    for (const ms of [1, 2, 4, 8, 16]) {
      ctx.beginPath();
      ctx.moveTo(px(ms), m.c);
      ctx.lineTo(px(ms), H - m.b);
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillText(`${ms} ms`, px(ms), H - m.b + 16);
    }
    for (let ap = 40; ap <= 60; ap += 5) {
      ctx.beginPath();
      ctx.moveTo(m.e, py(ap));
      ctx.lineTo(W - m.d, py(ap));
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText(String(ap), m.e - 6, py(ap) + 4);
    }
    ctx.textAlign = 'center';
    ctx.fillText('latência em GPU T4 (escala logarítmica) — menor é melhor', (W + m.e) / 2, H - 6);
    ctx.save();
    ctx.translate(13, (H - m.b) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('AP no COCO — maior é melhor', 0, 0);
    ctx.restore();

    const visiveis = MODELOS.filter((x) => filtro === 'todas' || x.licenca === filtro);

    // liga os pontos da mesma família
    const familias = new Map();
    for (const x of visiveis) familias.set(x.familia, [...(familias.get(x.familia) ?? []), x]);
    ctx.setLineDash([4, 4]);
    for (const lista of familias.values()) {
      if (lista.length < 2) continue;
      ctx.strokeStyle = COR[lista[0].licenca];
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      lista.forEach((x, i) => (i ? ctx.lineTo(px(x.ms), py(x.ap)) : ctx.moveTo(px(x.ms), py(x.ap))));
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    posicoes = visiveis.map((x) => ({ x: px(x.ms), y: py(x.ap), modelo: x }));
    for (const pos of posicoes) {
      const ativo = pos.modelo === escolhido;
      ctx.fillStyle = COR[pos.modelo.licenca];
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, ativo ? 8 : 5.5, 0, 2 * Math.PI);
      ctx.fill();
      if (ativo) {
        ctx.strokeStyle = t.texto;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.fillStyle = t.texto2;
      ctx.font = `${ativo ? 'bold ' : ''}11px system-ui`;
      ctx.textAlign = 'left';
      ctx.fillText(pos.modelo.nome, pos.x + 10, pos.y + (pos.modelo.familia === 'DEIM' ? -7 : 4));
    }

    q.titulo.textContent = 'laranja = AGPL-3.0 · verde = Apache-2.0 · linha tracejada = mesma família';
    const x = escolhido;
    lateral.innerHTML = `
      <h4>${x.nome}</h4>
      <div class="vis-conta" style="margin-top:0">
        AP: <b>${x.ap.toFixed(1)}</b><br>
        latência: <b>${x.ms} ms</b><br>
        licença: <b style="color:${COR[x.licenca]}">${x.licenca}</b><br>
        quem mediu: ${x.quem}
      </div>
      <p style="margin:10px 0 0;line-height:1.5">${x.nota}</p>`;
  }

  q.canvas.addEventListener('click', (ev) => {
    const r = q.canvas.getBoundingClientRect();
    const x = ((ev.clientX - r.left) / r.width) * q.canvas.width;
    const y = ((ev.clientY - r.top) / r.height) * q.canvas.height;
    let melhor = null;
    let dist = 30;
    for (const pos of posicoes) {
      const d = Math.hypot(pos.x - x, pos.y - y);
      if (d < dist) {
        dist = d;
        melhor = pos.modelo;
      }
    }
    if (melhor) {
      escolhido = melhor;
      pintar();
    }
  });

  const seletor = chips(
    [
      ['todas', 'todas as licenças'],
      ['Apache-2.0', 'só Apache-2.0'],
      ['AGPL-3.0', 'só AGPL-3.0'],
    ],
    'todas',
    (v) => {
      filtro = v;
      const visiveis = MODELOS.filter((x) => filtro === 'todas' || x.licenca === filtro);
      if (!visiveis.includes(escolhido)) escolhido = visiveis[0];
      pintar();
    },
  );
  p.controles.append(seletor.elemento);
  p.leitura.innerHTML = `<b>O que este gráfico não permite concluir:</b> qual modelo é "o melhor". Cada ponto foi medido pelo próprio autor, com TensorRT e GPU T4, mas sem protocolo comum:
    precisão numérica, tamanho de lote e a inclusão ou não do NMS variam. Detectores com NMS costumam reportar a latência <b>sem</b> ele.
    E todos os números são do COCO, onde quase nada tem o tamanho de um inseto. O gráfico serve para escolher <b>candidatos</b>; a decisão sai do seu conjunto de teste.`;

  pintar();
  aoMudarTema(p.raiz, pintar);
  return p.raiz;
}

export { MODELOS };
