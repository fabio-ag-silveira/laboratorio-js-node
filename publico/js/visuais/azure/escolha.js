/**
 * "Onde eu rodo isto?" — o serviço de computação da Azure para cada caso.
 *
 * Quatro perguntas, uma recomendação e o motivo. A regra de decisão é a função
 * `recomendar`, separada do desenho para poder ser testada e lida: ela É o
 * conteúdo da lição, em forma de código.
 */

export const SERVICOS = {
  swa: { nome: 'Azure Static Web Apps', resumo: 'Arquivos estáticos com HTTPS, domínio e prévia por pull request. Sem servidor para cuidar.' },
  appservice: { nome: 'Azure App Service', resumo: 'Plataforma para aplicações web e APIs: você entrega o código (ou um contêiner) e ela cuida do resto. Sempre ligada.' },
  aca: { nome: 'Azure Container Apps', resumo: 'Contêineres sem operar Kubernetes: escala por requisições ou por fila, inclusive a zero, com revisões.' },
  functions: { nome: 'Azure Functions', resumo: 'Funções disparadas por evento (fila, agenda, arquivo novo, HTTP). Paga-se pelo que executa.' },
  aks: { nome: 'Azure Kubernetes Service', resumo: 'Kubernetes gerenciado. Controle total, e a operação que vem junto.' },
  vm: { nome: 'Máquina virtual', resumo: 'Um servidor seu. Liberdade completa e responsabilidade completa: sistema, atualização, escala.' },
};

export const PERGUNTAS = [
  {
    id: 'oque', texto: 'O que vai rodar?',
    opcoes: [['site', 'site estático (build de React)'], ['api', 'API ou aplicação web'], ['evento', 'tarefa por evento ou agendada'], ['gpu', 'inferência com GPU'], ['legado', 'software que exige um servidor inteiro']],
  },
  { id: 'conteiner', texto: 'Está (ou vai estar) em contêiner?', opcoes: [['sim', 'sim'], ['nao', 'não']] },
  { id: 'zero', texto: 'Fica longos períodos sem uso?', opcoes: [['sim', 'sim: escalar a zero importa'], ['nao', 'não: tráfego constante']] },
  { id: 'k8s', texto: 'A equipe já opera Kubernetes e precisa de algo que só ele dá?', opcoes: [['nao', 'não'], ['sim', 'sim']] },
];

/** A regra de decisão. Devolve { servico, motivo, tambem }. */
export function recomendar({ oque, conteiner, zero, k8s }) {
  if (oque === 'site') return { servico: 'swa', motivo: 'Um build estático não precisa de servidor. É o equivalente direto do Cloudflare Pages e do Netlify.', tambem: null };
  if (oque === 'legado') return { servico: 'vm', motivo: 'Quando o software exige controle do sistema operacional, só uma máquina resolve. É a última opção, e não a primeira.', tambem: null };
  if (k8s === 'sim') return { servico: 'aks', motivo: 'Com a equipe e a necessidade (malha de serviços, operadores, rede sob medida), o Kubernetes completo se paga.', tambem: 'aca' };
  if (oque === 'gpu') return { servico: 'aca', motivo: 'Container Apps tem perfis com GPU e escala pela fila, inclusive a zero: GPU ociosa é o custo que mais dói.', tambem: 'vm' };
  if (oque === 'evento') {
    return conteiner === 'sim'
      ? { servico: 'aca', motivo: 'Um job de Container Apps consome a fila ou roda na agenda, com a sua imagem, e some quando termina.', tambem: 'functions' }
      : { servico: 'functions', motivo: 'Código curto que reage a um evento: é o caso de uso do Functions, sem contêiner para manter.', tambem: 'aca' };
  }
  // API ou aplicação web
  if (conteiner === 'sim') return { servico: 'aca', motivo: 'API em contêiner, com escala automática e troca de versão por revisão, sem operar cluster.', tambem: 'appservice' };
  if (zero === 'sim') return { servico: 'aca', motivo: 'Para escalar a zero, a API precisa ir para contêiner. Em troca, a primeira requisição depois do repouso demora mais.', tambem: 'appservice' };
  return { servico: 'appservice', motivo: 'API sempre ligada, sem contêiner: é o caminho mais curto do código à produção, com slots para trocar de versão.', tambem: 'aca' };
}

function el(tag, classe, texto) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

export default function criar() {
  const raiz = el('section', 'vis vis-escolha');
  const topo = el('header', 'vis-topo');
  topo.append(el('strong', '', 'Onde eu rodo isto?'), el('span', '', 'responda e veja a recomendação mudar'));
  const corpo = el('div', 'vis-corpo escolha-corpo');
  const leitura = el('div', 'vis-leitura');
  raiz.append(topo, corpo, leitura);

  const respostas = { oque: 'api', conteiner: 'sim', zero: 'nao', k8s: 'nao' };
  const grupos = [];

  for (const pergunta of PERGUNTAS) {
    const linha = el('div', 'escolha-pergunta');
    linha.append(el('div', 'escolha-texto', pergunta.texto));
    const chips = el('div', 'vis-chips');
    const botoes = pergunta.opcoes.map(([valor, rotulo]) => {
      const b = el('button', 'vis-chip', rotulo);
      b.addEventListener('click', () => {
        respostas[pergunta.id] = valor;
        pintar();
      });
      chips.append(b);
      return [valor, b];
    });
    linha.append(chips);
    corpo.append(linha);
    grupos.push([pergunta.id, botoes]);
  }

  const resultado = el('div', 'escolha-resultado');
  corpo.append(resultado);

  function pintar() {
    for (const [id, botoes] of grupos) for (const [valor, b] of botoes) b.classList.toggle('ativo', respostas[id] === valor);
    const r = recomendar(respostas);
    const s = SERVICOS[r.servico];
    resultado.replaceChildren(el('div', 'escolha-rotulo', 'recomendação'), el('h4', '', s.nome), el('p', '', s.resumo), el('p', 'escolha-motivo', r.motivo));
    leitura.textContent = r.tambem ? `Também considere: ${SERVICOS[r.tambem].nome}. ${SERVICOS[r.tambem].resumo}` : 'Aqui não há muito o que comparar.';
  }

  pintar();
  return raiz;
}
