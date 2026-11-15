/**
 * Junções, linha a linha.
 *
 * Duas tabelas pequenas, com as irregularidades que tornam os tipos de JOIN
 * diferentes: uma usina sem talhões e um talhão sem usina. Escolher o tipo
 * mostra quais pares casam, quais linhas ficam sem par e como o resultado é
 * montado, com NULL onde não há correspondência.
 */

const USINAS = [
  { id: 1, nome: 'Boa Vista' },
  { id: 2, nome: 'Santa Helena' },
  { id: 4, nome: 'Rio Claro' }, // sem talhões
];

const TALHOES = [
  { codigo: 'T-01', usina_id: 1 },
  { codigo: 'T-02', usina_id: 1 },
  { codigo: 'T-01', usina_id: 2 },
  { codigo: 'T-09', usina_id: null }, // sem usina
];

const TIPOS = {
  inner: { rotulo: 'INNER JOIN', sql: 'JOIN', frase: 'Só os pares que casam. Linhas sem par, dos dois lados, somem.' },
  left: { rotulo: 'LEFT JOIN', sql: 'LEFT JOIN', frase: 'Tudo da esquerda. Onde não há par à direita, as colunas da direita vêm NULL.' },
  right: { rotulo: 'RIGHT JOIN', sql: 'RIGHT JOIN', frase: 'Tudo da direita. Na prática, quase sempre se escreve como LEFT JOIN trocando a ordem.' },
  full: { rotulo: 'FULL JOIN', sql: 'FULL JOIN', frase: 'Tudo dos dois lados. Bom para conferir duas listas e achar o que falta em cada uma.' },
  cross: { rotulo: 'CROSS JOIN', sql: 'CROSS JOIN', frase: 'Todas as combinações: 3 × 4 = 12 linhas. É o que acontece quando se esquece a condição do JOIN.' },
  anti: { rotulo: 'sem par (anti-join)', sql: 'LEFT JOIN', frase: 'LEFT JOIN e depois WHERE ... IS NULL: as linhas da esquerda que NÃO têm par. "Usinas sem talhão."' },
};

function el(tag, classe, texto) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

/** Calcula o resultado da junção e marca, em cada linha de origem, se ela casou. */
export function juntar(tipo) {
  const linhas = [];
  const casouU = new Set();
  const casouT = new Set();

  if (tipo === 'cross') {
    USINAS.forEach((u, iu) => TALHOES.forEach((t, it) => linhas.push({ u: iu, t: it })));
    return { linhas, casouU: new Set(USINAS.keys()), casouT: new Set(TALHOES.keys()) };
  }

  USINAS.forEach((u, iu) => {
    TALHOES.forEach((t, it) => {
      // NULL = 1 não é verdadeiro: o talhão sem usina nunca casa
      if (t.usina_id !== null && t.usina_id === u.id) {
        linhas.push({ u: iu, t: it });
        casouU.add(iu);
        casouT.add(it);
      }
    });
  });

  const soEsquerda = [...USINAS.keys()].filter((i) => !casouU.has(i)).map((i) => ({ u: i, t: null }));
  const soDireita = [...TALHOES.keys()].filter((i) => !casouT.has(i)).map((i) => ({ u: null, t: i }));

  if (tipo === 'inner') return { linhas, casouU, casouT };
  if (tipo === 'left') return { linhas: [...linhas, ...soEsquerda], casouU, casouT };
  if (tipo === 'right') return { linhas: [...linhas, ...soDireita], casouU, casouT };
  if (tipo === 'full') return { linhas: [...linhas, ...soEsquerda, ...soDireita], casouU, casouT };
  return { linhas: soEsquerda, casouU, casouT }; // anti
}

export default function criar() {
  const raiz = el('section', 'vis vis-juncoes');
  const topo = el('header', 'vis-topo');
  topo.append(el('strong', '', 'Junções, linha a linha'), el('span', '', 'escolha o tipo · passe o cursor numa linha do resultado'));
  const controles = el('div', 'vis-controles');
  const corpo = el('div', 'vis-corpo juncoes-corpo');
  const leitura = el('div', 'vis-leitura');
  raiz.append(topo, controles, corpo, leitura);

  let tipo = 'inner';
  let destaque = null; // linha do resultado sob o cursor

  const botoes = {};
  for (const [id, t] of Object.entries(TIPOS)) {
    const bt = el('button', 'vis-chip', t.rotulo);
    bt.addEventListener('click', () => {
      tipo = id;
      destaque = null;
      pintar();
    });
    botoes[id] = bt;
    controles.append(bt);
  }

  function tabela(titulo, colunas, dados, casou, lado) {
    const caixa = el('div', 'juncoes-tabela');
    caixa.append(el('div', 'juncoes-titulo', titulo));
    const t = el('table');
    const cab = t.createTHead().insertRow();
    colunas.forEach((c) => cab.append(el('th', '', c)));
    const corpoT = t.createTBody();
    dados.forEach((linha, i) => {
      const tr = corpoT.insertRow();
      colunas.forEach((c) => {
        const td = tr.insertCell();
        td.textContent = linha[c] === null ? 'NULL' : linha[c];
        if (linha[c] === null) td.className = 'nulo';
      });
      tr.classList.add(casou.has(i) ? 'casou' : 'sem-par');
      if (destaque && destaque[lado] === i) tr.classList.add('destaque');
    });
    caixa.append(t);
    return caixa;
  }

  function pintar() {
    for (const [id, bt] of Object.entries(botoes)) bt.classList.toggle('ativo', id === tipo);
    const { linhas, casouU, casouT } = juntar(tipo);

    corpo.replaceChildren();
    const origem = el('div', 'juncoes-origem');
    origem.append(tabela('usinas u', ['id', 'nome'], USINAS, casouU, 'u'), el('div', 'juncoes-op', TIPOS[tipo].sql), tabela('talhoes t', ['codigo', 'usina_id'], TALHOES, casouT, 't'));

    const res = el('div', 'juncoes-tabela juncoes-resultado');
    res.append(el('div', 'juncoes-titulo', `resultado · ${linhas.length} ${linhas.length === 1 ? 'linha' : 'linhas'}`));
    const t = el('table');
    const cab = t.createTHead().insertRow();
    ['u.id', 'u.nome', 't.codigo', 't.usina_id'].forEach((c) => cab.append(el('th', '', c)));
    const corpoT = t.createTBody();
    for (const linha of linhas) {
      const tr = corpoT.insertRow();
      const u = linha.u === null ? null : USINAS[linha.u];
      const tl = linha.t === null ? null : TALHOES[linha.t];
      for (const v of [u?.id ?? null, u?.nome ?? null, tl?.codigo ?? null, tl ? tl.usina_id : null]) {
        const td = tr.insertCell();
        td.textContent = v === null ? 'NULL' : v;
        if (v === null) td.className = 'nulo';
      }
      if (linha.u === null || linha.t === null) tr.classList.add('sem-par');
      if (destaque && destaque.u === linha.u && destaque.t === linha.t) tr.classList.add('destaque');
      tr.addEventListener('mouseenter', () => {
        // repintar recria as linhas: sem esta guarda, o cursor sobre a linha nova dispararia de novo
        if (destaque && destaque.u === linha.u && destaque.t === linha.t) return;
        destaque = linha;
        pintar();
      });
    }
    res.append(t);
    res.addEventListener('mouseleave', () => {
      if (destaque) {
        destaque = null;
        pintar();
      }
    });
    corpo.append(origem, res);

    const condicao = tipo === 'cross' ? '' : ' ON t.usina_id = u.id';
    const filtro = tipo === 'anti' ? '\nWHERE t.codigo IS NULL' : '';
    leitura.innerHTML = '';
    leitura.append(el('pre', 'juncoes-sql', `SELECT u.id, u.nome, t.codigo, t.usina_id\nFROM usinas u\n${TIPOS[tipo].sql} talhoes t${condicao}${filtro};`), el('p', '', TIPOS[tipo].frase));
  }

  pintar();
  return raiz;
}
