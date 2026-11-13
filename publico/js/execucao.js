/**
 * Execução de código — no navegador e no servidor.
 *
 * Navegador: montamos uma função assíncrona a partir do texto e passamos um
 *            `console` falso, que em vez de imprimir no devtools manda as
 *            linhas para a nossa caixa de saída.
 *
 * Servidor:  Node, Python e C# vão para POST /api/executar, e o servidor roda
 *            num processo separado (veja servidor/executores/).
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

/** Nome amigável de cada destino de execução, para etiquetas e rodapés. */
export const ALVOS = {
  browser: { rotulo: 'navegador', onde: 'navegador', lang: 'js' },
  node: { rotulo: 'node', onde: 'processo Node', lang: 'js' },
  python: { rotulo: 'python', onde: 'processo Python', lang: 'python' },
  csharp: { rotulo: 'c#', onde: 'dotnet run', lang: 'csharp' },
};

/**
 * Manda o código para o servidor executar num processo de verdade (Node,
 * Python ou C#) e escreve o resultado na caixa de saída.
 *
 * A resposta vem como uma lista de PARTES, na ordem em que o programa as
 * produziu: texto, imagem, texto, imagem... É isso que deixa um bloco de
 * Python intercalar `print` com `lab.mostrar(img)`.
 */
export async function rodarNoServidor(linguagem, codigo, saida, tempo) {
  try {
    const resposta = await fetch('/api/executar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linguagem, codigo, tempo }),
    });

    const r = await resposta.json();
    if (!resposta.ok) {
      saida.escrever('erro', r.erro ?? `HTTP ${resposta.status}`);
      return { ok: false, ms: 0 };
    }

    const emLinhas = (texto) => texto.replace(/\r/g, '').replace(/\n$/, '').split('\n');

    for (const parte of r.partes ?? []) {
      if (parte.tipo === 'imagem') saida.imagem(parte.url, parte.titulo);
      else for (const linha of emLinhas(parte.texto)) saida.escrever('log', linha);
    }

    if (r.erro) {
      // Processo que terminou bem mas escreveu no stderr: são avisos
      // (bibliotecas de ML adoram), não erros.
      const nivel = r.codigoSaida === 0 ? 'aviso' : 'erro';
      for (const linha of emLinhas(r.erro)) saida.escrever(nivel, linha);
    }
    if (r.instalar) saida.escrever('info', `Para instalar:  ${r.instalar}`);
    if (r.expirou) {
      saida.escrever('aviso', `⏱ tempo esgotado (${Math.round(r.tempoLimiteMs / 1000)}s) — o processo foi encerrado`);
    }
    if (r.cortado) saida.escrever('aviso', '✂ saída muito longa, cortada');
    if (!r.partes?.length && !r.erro) saida.escrever('info', '(nenhuma saída — faltou um print?)');

    return { ok: r.codigoSaida === 0, ms: r.ms };
  } catch (erro) {
    saida.escrever('erro', `Não consegui falar com o servidor: ${erro.message}`);
    return { ok: false, ms: 0 };
  }
}

/** Roda no destino certo: 'browser' fica na aba, o resto vai para o servidor. */
export function rodar(alvo, codigo, saida, tempo) {
  return alvo === 'browser'
    ? rodarNoNavegador(codigo, saida.escrever)
    : rodarNoServidor(alvo, codigo, saida, tempo);
}

/**
 * Monta a caixa de saída e devolve utilitários para escrever nela.
 * Reutilizada pelos blocos de código e pelo playground.
 */
export function criarSaida() {
  const caixa = document.createElement('div');
  caixa.className = 'saida';
  caixa.hidden = true;

  const rodape = document.createElement('div');
  rodape.className = 'saida-rodape';
  rodape.hidden = true;

  // Imagens seguidas ficam lado a lado numa mesma galeria.
  let galeria = null;

  return {
    caixa,
    rodape,
    limpar() {
      caixa.innerHTML = '';
      caixa.hidden = false;
      rodape.hidden = true;
      galeria = null;
    },
    escrever(nivel, texto) {
      galeria = null;
      const linha = document.createElement('div');
      linha.className = 'saida-linha' + (nivel === 'erro' ? ' saida-erro' : '');
      if (nivel === 'info') linha.classList.add('saida-info');
      if (nivel === 'aviso') linha.classList.add('saida-aviso');
      linha.textContent = texto;
      caixa.append(linha);
      caixa.scrollTop = caixa.scrollHeight;
    },
    imagem(url, titulo) {
      if (!galeria) {
        galeria = document.createElement('div');
        galeria.className = 'saida-galeria';
        caixa.append(galeria);
      }
      const figura = document.createElement('figure');
      figura.className = 'saida-figura';
      const img = document.createElement('img');
      img.src = url;
      img.alt = titulo || 'imagem gerada pelo código';
      img.title = 'clique para ampliar';
      // clicar alterna entre "cabe na galeria" e "largura total"
      img.addEventListener('click', () => figura.classList.toggle('ampliada'));
      figura.append(img);
      if (titulo) {
        const legenda = document.createElement('figcaption');
        legenda.textContent = titulo;
        figura.append(legenda);
      }
      galeria.append(figura);
    },
    finalizar(resultado, onde) {
      rodape.hidden = false;
      const tempo = resultado.ms >= 1000 ? `${(resultado.ms / 1000).toFixed(1)}s` : `${resultado.ms}ms`;
      rodape.textContent = `${onde} · ${tempo}${resultado.ok ? '' : ' · terminou com erro'}`;
    },
  };
}

