/** Cartão que leva ao Explorador de API. */

export default function criar() {
  const div = document.createElement('div');
  div.className = 'atalho-cartao';
  div.innerHTML = `
    <span style="font-size:24px">🧪</span>
    <div>
      <strong>Explorador de API</strong>
      <span>Mande pedidos reais para a API deste servidor e veja status, cabeçalhos e corpo.</span>
    </div>
    <a class="botao botao-principal" href="#/explorador" style="text-decoration:none">Abrir</a>`;
  return div;
}
