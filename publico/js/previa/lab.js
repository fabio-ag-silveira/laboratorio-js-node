/**
 * Módulo de apoio das lições de React: `import { ... } from 'lab'`.
 *
 * Roda DENTRO do iframe da prévia. São ferramentas para enxergar o que o React
 * faz e normalmente não mostra: quando um componente renderiza, e quantas vezes.
 */

import { useRef, useEffect, createElement } from 'react';

/**
 * Conta quantas vezes o componente que o chama renderizou.
 *
 *     const n = useRenderizacoes();
 *
 * Um `ref` guarda um valor entre renderizações SEM provocar outra. É por isso
 * que serve para contar: com `useState`, contar renderizações causaria uma
 * renderização, que causaria outra contagem, para sempre.
 */
export function useRenderizacoes() {
  const n = useRef(0);
  n.current += 1;
  return n.current;
}

/**
 * Moldura que pisca toda vez que o componente pai renderiza, e mostra o total.
 *
 *     <Renderizou nome="Lista">...</Renderizou>
 */
export function Renderizou({ nome, children }) {
  const n = useRenderizacoes();
  const caixa = useRef(null);

  // Sem lista de dependências: roda depois de TODA renderização.
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    el.animate(
      [
        { boxShadow: '0 0 0 2px var(--amarelo)', background: 'color-mix(in srgb, var(--amarelo) 22%, transparent)' },
        { boxShadow: '0 0 0 1px var(--borda)', background: 'transparent' },
      ],
      { duration: 650, easing: 'ease-out' },
    );
  });

  return createElement(
    'div',
    {
      ref: caixa,
      style: { position: 'relative', border: '1px solid var(--borda)', borderRadius: 8, padding: '18px 10px 10px', margin: '6px 0' },
    },
    createElement(
      'span',
      {
        style: {
          position: 'absolute', top: 3, left: 8, fontSize: 10.5, letterSpacing: 0.3,
          color: 'var(--texto-3)', fontFamily: 'ui-monospace, Consolas, monospace',
        },
      },
      `${nome ?? 'componente'} · renderizou ${n}×`,
    ),
    children,
  );
}

/** Espera `ms` milissegundos. Para simular rede lenta nos exemplos. */
export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/** Endereço do servidor do laboratório, para `fetch` a partir da prévia. */
export const API = new URL(import.meta.url).origin;
