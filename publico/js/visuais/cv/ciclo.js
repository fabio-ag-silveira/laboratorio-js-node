/**
 * O ciclo de vida de um modelo de visão em produção, clicável.
 * Cada etapa mostra o que entra, o que sai, o erro mais comum e a lição da
 * trilha que trata dela.
 */

import { painel, el } from './base.js';

const ETAPAS = [
  {
    id: 'captura',
    nome: 'Captura',
    icone: '📷',
    entra: 'a armadilha no campo',
    sai: 'foto com metadados (usina, armadilha, data, aparelho)',
    erro: 'Aceitar qualquer foto. Borrão, estouro e enquadramento torto custam mais para consertar depois do que para recusar na hora.',
    licoes: [['#/t/visao/imagem/histograma', 'Histograma, exposição e captura'], ['#/t/visao/classico/geometria', 'Geometria']],
  },
  {
    id: 'anotacao',
    nome: 'Anotação',
    icone: '✏️',
    entra: 'fotos novas, pré-anotadas pelo modelo atual',
    sai: 'caixas e classes revisadas, seguindo um guia escrito',
    erro: 'Não ter guia de anotação. Dois anotadores resolvem os casos duvidosos de jeitos diferentes, e o modelo aprende a média da confusão.',
    licoes: [['#/t/visao/dados/anotacao', 'Anotação e controle de qualidade']],
  },
  {
    id: 'dataset',
    nome: 'Dataset',
    icone: '🗂️',
    entra: 'anotações novas + dataset anterior',
    sai: 'versão do dataset, com divisão por armadilha e conjunto de teste fixo',
    erro: 'Dividir por foto sorteada. Fotos da mesma armadilha caem dos dois lados e a métrica passa a medir memorização.',
    licoes: [['#/t/visao/dados/divisao-e-balanceamento', 'Divisão e balanceamento'], ['#/t/visao/avaliacao/comparar-versoes', 'Comparar versões com rigor']],
  },
  {
    id: 'treino',
    nome: 'Treino',
    icone: '🏋️',
    entra: 'dataset versionado + pesos da versão anterior ou pré-treinados',
    sai: 'pesos candidatos',
    erro: 'Treinar só com os dados novos. O modelo melhora neles e esquece o que sabia.',
    licoes: [['#/t/visao/aprendizado/transferencia', 'Transferência, fine-tuning e esquecimento'], ['#/t/visao/laboratorio/treinar-e-avaliar', 'Laboratório']],
  },
  {
    id: 'avaliacao',
    nome: 'Avaliação',
    icone: '📊',
    entra: 'pesos candidatos + conjunto de teste fixo',
    sai: 'relatório por fatia, com intervalo de confiança e análise de erro',
    erro: 'Comparar só a média. Uma versão pode subir no geral e cair justo nas armadilhas densas.',
    licoes: [['#/t/visao/avaliacao/analise-de-erro', 'Análise de erro'], ['#/t/visao/avaliacao/contagem-e-negocio', 'Métricas de contagem e de negócio']],
  },
  {
    id: 'implantacao',
    nome: 'Implantação',
    icone: '🚀',
    entra: 'pesos aprovados',
    sai: 'modelo exportado, com o pré e o pós-processamento idênticos aos do treino',
    erro: 'Pré-processamento diferente entre treino e produção. O modelo é o mesmo e o resultado piora, sem erro nenhum na tela.',
    licoes: [['#/t/visao/producao/paridade', 'Paridade entre treino e inferência'], ['#/t/visao/producao/exportar', 'Exportar o modelo']],
  },
  {
    id: 'monitoramento',
    nome: 'Monitoramento',
    icone: '🔭',
    entra: 'predições e fotos de produção',
    sai: 'alertas de deriva e fila de imagens para reanotar',
    erro: 'Só descobrir que o modelo piorou quando o cliente reclama. Sem gabarito em produção, monitora-se a distribuição das confianças e das contagens.',
    licoes: [['#/t/visao/producao/servir-e-monitorar', 'Servir e monitorar'], ['#/t/visao/dados/ciclo-de-producao', 'O ciclo com dados de produção']],
  },
];

export default function criar() {
  const p = painel('O ciclo de vida do modelo', 'clique numa etapa');

  const trilho = el('div', 'ciclo-trilho');
  const detalhe = el('div', 'ciclo-detalhe');
  p.corpo.append(trilho);
  p.corpo.style.display = 'block';
  p.raiz.append(detalhe);

  function mostrar(etapa) {
    for (const b of trilho.children) b.classList.toggle('ativo', b.dataset.id === etapa.id);
    detalhe.innerHTML = `
      <h4>${etapa.icone} ${etapa.nome}</h4>
      <div class="ciclo-linhas">
        <div><span>entra</span>${etapa.entra}</div>
        <div><span>sai</span>${etapa.sai}</div>
        <div class="ciclo-erro"><span>erro comum</span>${etapa.erro}</div>
      </div>
      <div class="ciclo-links">${etapa.licoes.map(([rota, nome]) => `<a href="${rota}">${nome} →</a>`).join('')}</div>`;
  }

  ETAPAS.forEach((etapa, i) => {
    const b = el('button', 'ciclo-etapa');
    b.type = 'button';
    b.dataset.id = etapa.id;
    b.innerHTML = `<span class="ciclo-icone">${etapa.icone}</span><span>${etapa.nome}</span>`;
    b.addEventListener('click', () => mostrar(etapa));
    trilho.append(b);
    if (i < ETAPAS.length - 1) trilho.append(el('span', 'ciclo-seta', '→'));
  });
  // a seta de volta é o que faz disto um ciclo, e não uma esteira
  trilho.append(el('span', 'ciclo-volta', '↻ as imagens de produção voltam para a anotação'));

  mostrar(ETAPAS[0]);
  return p.raiz;
}
