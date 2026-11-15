/**
 * O programa que roda DENTRO do iframe da prévia.
 *
 * Ele não conhece o laboratório. Espera uma mensagem com o JavaScript já
 * transformado, monta o <App /> e conta ao pai o que aconteceu: console, erros,
 * altura do conteúdo e resultado dos testes.
 *
 * A página que o carrega é servida de OUTRA origem (127.0.0.1 quando o
 * laboratório está em localhost, e vice-versa). Para o navegador são sites
 * diferentes: este código não alcança o DOM nem o localStorage do laboratório.
 */

let id = null;
let origemDoPai = '*';
const enviar = (m) => window.parent.postMessage({ previa: id, ...m }, origemDoPai);

const mostrar = (v) => {
  if (typeof v === 'string') return v;
  if (v instanceof Error) return `${v.name}: ${v.message}`;
  if (typeof v === 'function') return `[função ${v.name || 'anônima'}]`;
  try {
    return JSON.stringify(v, (k, x) => (typeof x === 'function' ? '[função]' : x)) ?? String(v);
  } catch {
    return String(v);
  }
};

for (const nivel of ['log', 'info', 'warn', 'error']) {
  const original = console[nivel].bind(console);
  console[nivel] = (...args) => {
    // o convite do React para instalar a extensão de desenvolvedor é só ruído aqui
    if (typeof args[0] === 'string' && args[0].includes('React DevTools')) return original(...args);
    enviar({ tipo: 'console', nivel, texto: args.map(mostrar).join(' ') });
    original(...args);
  };
}
window.addEventListener('error', (e) => enviar({ tipo: 'erro', texto: e.message }));
window.addEventListener('unhandledrejection', (e) => enviar({ tipo: 'erro', texto: `Promise rejeitada: ${mostrar(e.reason)}` }));

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const raiz = document.getElementById('raiz');

// ---- o que um teste enxerga: a tela, como um usuário ----------------------
const botoes = () => [...raiz.querySelectorAll('button')];
const tela = {
  raiz,
  texto: () => raiz.innerText,
  achar(seletor) {
    const el = raiz.querySelector(seletor);
    if (!el) throw new Error(`não achei "${seletor}" na tela`);
    return el;
  },
  acharTodos: (seletor) => [...raiz.querySelectorAll(seletor)],
  botao(texto) {
    const alvo = String(texto).toLowerCase();
    const el = botoes().find((b) => b.innerText.trim().toLowerCase() === alvo) ?? botoes().find((b) => b.innerText.trim().toLowerCase().includes(alvo));
    if (!el) throw new Error(`não achei um botão com o texto "${texto}"`);
    return el;
  },
  /** Aceita o texto de um botão, um seletor CSS ou o próprio elemento. */
  async clicar(alvo) {
    let el = alvo;
    if (typeof alvo === 'string') {
      try {
        el = tela.botao(alvo);
      } catch {
        el = tela.achar(alvo);
      }
    }
    el.click();
    await pausa(30);
  },
  async digitar(alvo, valor) {
    const el = typeof alvo === 'string' ? tela.achar(alvo) : alvo;
    // Campo controlado: o React só percebe a mudança se o valor for posto pelo
    // "setter" nativo do elemento e seguido de um evento.
    const proto =
      el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, valor);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    await pausa(30);
  },
  async esperar(condicao, ms = 2500) {
    const fim = Date.now() + ms;
    while (Date.now() < fim) {
      try {
        const r = condicao();
        if (r) return r;
      } catch {
        /* ainda não */
      }
      await pausa(25);
    }
    throw new Error(`esperei ${ms} ms e a condição não ficou verdadeira`);
  },
  pausa,
};
const afirmar = (condicao, mensagem) => {
  if (!condicao) throw new Error(mensagem || 'afirmação falsa');
};

function mostrarErroNaTela(erro) {
  raiz.innerHTML = '';
  const pre = document.createElement('pre');
  pre.className = 'lab-erro';
  pre.textContent = mostrar(erro);
  raiz.append(pre);
}

async function montar({ js, testes }) {
  try {
    const React = await import('react');
    const { createRoot } = await import('react-dom/client');

    // O código do usuário vira um módulo de verdade (com seus imports), via Blob.
    const url = URL.createObjectURL(new Blob([js], { type: 'text/javascript' }));
    const modulo = await import(url);
    const App = modulo.default;
    if (typeof App !== 'function') {
      throw new Error('O arquivo precisa de um componente exportado por padrão: export default function App() { ... }');
    }

    // "Error boundary": o único recurso do React que ainda exige classe.
    class Limite extends React.Component {
      state = { erro: null };
      static getDerivedStateFromError(erro) {
        return { erro };
      }
      render() {
        return this.state.erro ? React.createElement('pre', { className: 'lab-erro' }, mostrar(this.state.erro)) : this.props.children;
      }
    }

    createRoot(raiz).render(React.createElement(Limite, null, React.createElement(App)));
    await pausa(60);
    enviar({ tipo: 'pronto' });

    if (testes) {
      const AsyncFunction = (async () => {}).constructor;
      const resultados = [];
      for (const teste of testes) {
        try {
          await new AsyncFunction('tela', 'afirmar', teste.codigo)(tela, afirmar);
          resultados.push({ nome: teste.nome, ok: true });
        } catch (e) {
          resultados.push({ nome: teste.nome, ok: false, motivo: e?.message ?? String(e) });
        }
      }
      enviar({ tipo: 'testes', resultados });
    }
  } catch (e) {
    mostrarErroNaTela(e);
    enviar({ tipo: 'erro', texto: mostrar(e) });
    if (testes) enviar({ tipo: 'testes', resultados: testes.map((t) => ({ nome: t.nome, ok: false, motivo: 'o componente não montou' })) });
  }
}

let montado = false;
window.addEventListener('message', (ev) => {
  if (ev.source !== window.parent || ev.data?.tipo !== 'montar' || montado) return;
  montado = true;
  id = ev.data.id;
  origemDoPai = ev.origin;
  document.documentElement.style.cssText = ev.data.cores ?? '';
  new ResizeObserver(() => enviar({ tipo: 'altura', px: document.documentElement.scrollHeight })).observe(document.body);
  montar(ev.data);
});

// Avisa que já pode receber o código. O pai responde com a mensagem "montar".
window.parent.postMessage({ previa: 'nova', tipo: 'carregada' }, '*');
