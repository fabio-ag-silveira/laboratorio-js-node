/**
 * Verificação das prévias no navegador. Não faz parte da interface.
 *
 * As prévias só rodam num navegador de verdade (iframe, import map, DOM), então
 * `npm run verificar` não as alcança. Com o laboratório aberto, no console:
 *
 *     const { testarTrilha } = await import('/js/dev/testar-previas.js');
 *     console.log(await testarTrilha('react'));
 *
 * Para cada prévia, confere que montou sem erro. Para cada exercício, confere
 * que o código inicial FALHA em algum teste e que a solução PASSA em todos.
 */

export async function testarTrilha(trilha, filtro = '') {
  const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
  const dados = await (await fetch('/api/conteudo/' + trilha)).json();
  const relatorio = [];
  for (const m of dados.modulos) {
    for (const l of m.licoes) {
      const onde = `${m.id}/${l.id}`;
      if (!onde.includes(filtro)) continue;
      if (!l.blocos.some((b) => b.t === 'previa')) continue;
      location.hash = `#/t/${trilha}/${m.id}/${l.id}`;
      await pausa(700);
      const previas = [...document.querySelectorAll('.previa')];
      for (const p of previas) {
        const titulo = p.querySelector('.bloco-titulo').textContent;
        const ehEx = p.classList.contains('previa-exercicio');
        const bt = p.querySelector('.botao-principal');
        const esperarTestes = async () => {
          p.querySelector('.testes').replaceChildren();
          bt.click();
          for (let i = 0; i < 120; i++) {
            await pausa(100);
            if (p.querySelectorAll('.teste').length) break;
          }
          await pausa(150);
          return [...p.querySelectorAll('.teste')].map((t) => ({ ok: t.classList.contains('teste-ok'), txt: t.innerText.replace(/\s+/g, ' ').slice(0, 160) }));
        };
        if (!ehEx) {
          bt.click();
          await pausa(1300);
          const erroBuild = p.querySelector('.previa-erro')?.innerText;
          const cons = [...p.querySelectorAll('.previa-console .saida-erro')].map((x) => x.innerText).join(' | ');
          const temIframe = !!p.querySelector('iframe');
          if (erroBuild || cons || !temIframe) relatorio.push(`ERRO   ${onde} — ${titulo}: ${erroBuild ?? cons ?? 'sem iframe'}`);
          else relatorio.push(`ok     ${onde} — ${titulo} (altura ${p.querySelector('iframe').style.height})`);
        } else {
          const antes = await esperarTestes();
          const falhouAntes = antes.some((t) => !t.ok);
          const btSol = [...p.querySelectorAll('.botao')].find((b) => b.textContent === 'Ver solução');
          btSol.click();
          await pausa(900);
          const depois = await esperarTestes();
          const passou = depois.length > 0 && depois.every((t) => t.ok);
          relatorio.push(`${falhouAntes && passou ? 'ok    ' : 'ERRO  '} ${onde} — EX ${titulo}: inicial ${antes.filter((t) => t.ok).length}/${antes.length}, solução ${depois.filter((t) => t.ok).length}/${depois.length}` +
            (passou ? '' : ' :: ' + depois.filter((t) => !t.ok).map((t) => t.txt).join(' || ')));
        }
      }
    }
  }
  return relatorio.join('\n');
}
