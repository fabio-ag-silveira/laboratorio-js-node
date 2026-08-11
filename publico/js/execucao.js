/**
 * Execução de código — no navegador e no Node.
 *
 * Navegador: montamos uma função assíncrona a partir do texto e passamos um
 *            `console` falso, que em vez de imprimir no devtools manda as
 *            linhas para a nossa caixa de saída.
 *
 * Node:      mandamos o texto para POST /api/executar, e o servidor roda num
 *            processo separado (veja servidor/executor.js).
 */

/** Representação legível de qualquer valor — um util.inspect() de bolso. */
export function formatar(valor, profundidade = 0, vistos = new WeakSet()) {
  if (valor === null) return 'null';
  if (valor === undefined) return 'undefined';

  const tipo = typeof valor;
  if (tipo === 'string') return profundidade === 0 ? valor : `'${valor}'`;
  if (tipo === 'number' || tipo === 'boolean' || tipo === 'bigint') return String(valor);
  if (tipo === 'function') return `[Function: ${valor.name || 'anônima'}]`;
  if (tipo === 'symbol') return valor.toString();

  if (valor instanceof Error) return `${valor.name}: ${valor.message}`;
  if (valor instanceof Date) return valor.toISOString();
  if (valor instanceof RegExp) return String(valor);
  if (valor instanceof Promise) return 'Promise { <pendente> }';

  // referência circular: sem isto, entraríamos em recursão infinita
  if (vistos.has(valor)) return '[Circular]';
  vistos.add(valor);

  if (valor instanceof Map) {
    const itens = [...valor.entries()].map(
      ([k, v]) => `${formatar(k, profundidade + 1, vistos)} => ${formatar(v, profundidade + 1, vistos)}`,
    );
    return `Map(${valor.size}) { ${itens.join(', ')} }`;
  }
  if (valor instanceof Set) {
    const itens = [...valor].map((v) => formatar(v, profundidade + 1, vistos));
    return `Set(${valor.size}) { ${itens.join(', ')} }`;
  }

  if (Array.isArray(valor)) {
    if (profundidade > 4) return '[Array]';
    const itens = valor.map((v) => formatar(v, profundidade + 1, vistos));
    const linha = `[ ${itens.join(', ')} ]`;
    if (linha.length <= 76) return valor.length === 0 ? '[]' : linha;
    const recuo = '  '.repeat(profundidade + 1);
    return `[\n${itens.map((i) => recuo + i).join(',\n')}\n${'  '.repeat(profundidade)}]`;
  }

  if (profundidade > 4) return '[Object]';
  const chaves = Object.keys(valor);
  if (chaves.length === 0) return '{}';
  const itens = chaves.map((k) => {
    const nome = /^[A-Za-z_$][\w$]*$/.test(k) ? k : `'${k}'`;
    return `${nome}: ${formatar(valor[k], profundidade + 1, vistos)}`;
  });
  const linha = `{ ${itens.join(', ')} }`;
  if (linha.length <= 76) return linha;
  const recuo = '  '.repeat(profundidade + 1);
  return `{\n${itens.map((i) => recuo + i).join(',\n')}\n${'  '.repeat(profundidade)}}`;
}

/** Junta os argumentos de um console.log numa linha só. */
function juntar(args) {
  return args.map((a) => formatar(a)).join(' ');
}

/**
 * Roda o código no próprio navegador.
 * @param {(nivel: string, texto: string) => void} escrever
 */
export async function rodarNoNavegador(codigo, escrever) {
  const inicio = performance.now();

  const consoleFalso = {
    log: (...a) => escrever('log', juntar(a)),
    info: (...a) => escrever('log', juntar(a)),
    debug: (...a) => escrever('log', juntar(a)),
    warn: (...a) => escrever('aviso', juntar(a)),
    error: (...a) => escrever('erro', juntar(a)),
    table: (...a) => escrever('log', juntar(a)),
  };

  try {
    // O corpo vai dentro de uma função assíncrona: assim `await` no topo
    // do código do usuário funciona naturalmente.
    const fabrica = new Function(
      'console',
      `return (async () => {\n${codigo}\n})();`,
    );
    await fabrica(consoleFalso);
    return { ok: true, ms: Math.round(performance.now() - inicio) };
  } catch (erro) {
    escrever('erro', `${erro.name}: ${erro.message}`);
    return { ok: false, ms: Math.round(performance.now() - inicio) };
  }
}

/** Manda o código para o servidor executar num processo Node de verdade. */
export async function rodarNoNode(codigo, escrever) {
  try {
    const resposta = await fetch('/api/executar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo }),
    });

    const r = await resposta.json();

    // No Windows a saída vem com CRLF; sem o \r fica um caractere invisível
    // sobrando no fim de cada linha.
    const emLinhas = (texto) => texto.replace(/\r/g, '').replace(/\n$/, '').split('\n');

    if (r.saida) for (const linha of emLinhas(r.saida)) escrever('log', linha);
    if (r.erro) for (const linha of emLinhas(r.erro)) escrever('erro', linha);
    if (r.expirou) escrever('aviso', '⏱ tempo esgotado (5s) — o processo foi encerrado');
    if (r.cortado) escrever('aviso', '✂ saída muito longa, cortada');
    if (!r.saida && !r.erro) escrever('info', '(nenhuma saída — faltou um console.log?)');

    return { ok: r.codigoSaida === 0, ms: r.ms };
  } catch (erro) {
    escrever('erro', `Não consegui falar com o servidor: ${erro.message}`);
    return { ok: false, ms: 0 };
  }
}

/**
 * Monta a caixa de saída e devolve utilitários para escrever nela.
 * Reutilizada pelos blocos de código, pelo playground e pelos exercícios.
 */
export function criarSaida() {
  const caixa = document.createElement('div');
  caixa.className = 'saida';
  caixa.hidden = true;

  const rodape = document.createElement('div');
  rodape.className = 'saida-rodape';
  rodape.hidden = true;

  return {
    caixa,
    rodape,
    limpar() {
      caixa.innerHTML = '';
      caixa.hidden = false;
      rodape.hidden = true;
    },
    escrever(nivel, texto) {
      const linha = document.createElement('div');
      linha.className = 'saida-linha' + (nivel === 'erro' ? ' saida-erro' : '');
      if (nivel === 'info') linha.classList.add('saida-info');
      if (nivel === 'aviso') linha.style.color = 'var(--amarelo)';
      linha.textContent = texto;
      caixa.append(linha);
      caixa.scrollTop = caixa.scrollHeight;
    },
    finalizar(resultado, onde) {
      rodape.hidden = false;
      rodape.textContent = `${onde} · ${resultado.ms}ms${resultado.ok ? '' : ' · terminou com erro'}`;
    },
  };
}
