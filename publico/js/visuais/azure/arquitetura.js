/**
 * A arquitetura do projeto integrador na Azure, clicável.
 *
 * Cada peça responde a quatro perguntas: o que é, por que está aqui, qual é o
 * equivalente no que você já usa (Cloudflare, Netlify) e qual seria a
 * alternativa. O desenho é o mesmo sistema das outras trilhas: o app que
 * fotografa, a API em .NET, o Postgres, o serviço Python e o painel em React.
 */

export const PECAS = {
  app: {
    nome: 'App de campo', servico: 'React Native + Expo', camada: 'cliente',
    oque: 'O aplicativo do técnico. Fotografa a armadilha, guarda no aparelho e sincroniza quando há sinal.',
    porque: 'Fica fora da Azure, mas define o que a nuvem precisa aguentar: envio que se repete, versões antigas em uso, fotos grandes.',
    equivalente: '—', alternativa: 'Flutter, nativo',
  },
  painel: {
    nome: 'Painel web', servico: 'Azure Static Web Apps', camada: 'cliente',
    oque: 'Hospeda os arquivos estáticos do painel em React, com HTTPS, domínio próprio e um ambiente de prévia por pull request.',
    porque: 'O build do Vite gera só HTML, CSS e JavaScript. Não precisa de servidor.',
    equivalente: 'Cloudflare Pages, Netlify', alternativa: 'Blob Storage com site estático + Front Door',
  },
  entrada: {
    nome: 'Porta de entrada', servico: 'Azure Front Door', camada: 'borda',
    oque: 'Ponto único de entrada global: TLS, cache, roteamento por caminho e firewall de aplicação (WAF).',
    porque: 'Opcional no começo. Entra quando há mais de uma região, ou quando o WAF e o cache passam a ser exigência.',
    equivalente: 'a própria rede da Cloudflare (proxy, WAF, cache)', alternativa: 'começar sem; Application Gateway dentro da rede',
  },
  identidade: {
    nome: 'Identidade', servico: 'Microsoft Entra ID', camada: 'borda',
    oque: 'O diretório de usuários e aplicações. Emite os tokens que o painel e o app apresentam à API.',
    porque: 'Login corporativo sem a API guardar senha. Também é o que dá identidade aos próprios serviços (identidade gerenciada).',
    equivalente: 'Cloudflare Access (em parte)', alternativa: 'Entra External ID para clientes de fora; Auth0',
  },
  api: {
    nome: 'API', servico: 'Azure Container Apps', camada: 'computacao',
    oque: 'A API em ASP.NET, num contêiner. Escala por requisições, inclusive a zero, com revisões para trocar de versão sem queda.',
    porque: 'Contêiner dá o mesmo ambiente no notebook e na nuvem, sem o peso de operar Kubernetes.',
    equivalente: 'Cloudflare Workers (em papel, não em modelo)', alternativa: 'App Service: mais simples, se não precisar de contêiner',
  },
  fila: {
    nome: 'Fila', servico: 'Azure Service Bus', camada: 'computacao',
    oque: 'Recebe "há uma foto para processar" e entrega ao serviço de inferência. Guarda a mensagem até alguém confirmar que processou.',
    porque: 'A API responde na hora e a inferência acontece depois. Se o serviço de inferência cair, nada se perde.',
    equivalente: 'Cloudflare Queues', alternativa: 'Storage Queues: mais simples e mais barata, com menos recursos',
  },
  inferencia: {
    nome: 'Inferência', servico: 'Container Apps (perfil com GPU)', camada: 'computacao',
    oque: 'O serviço Python com o detector. Consome a fila, roda o modelo e grava as detecções.',
    porque: 'Escala pelo tamanho da fila, e a zero quando não há fotos: GPU parada custa caro.',
    equivalente: 'Workers AI (para modelos prontos)', alternativa: 'Azure Machine Learning (endpoints gerenciados); VM com GPU',
  },
  banco: {
    nome: 'Banco de dados', servico: 'Azure Database for PostgreSQL', camada: 'dados',
    oque: 'PostgreSQL gerenciado (Flexible Server): backup com recuperação pontual, atualização, alta disponibilidade, pgvector.',
    porque: 'É o banco da trilha de PostgreSQL, sem você operar o servidor.',
    equivalente: 'D1 (SQLite) ou Hyperdrive + Postgres externo', alternativa: 'Azure SQL; Cosmos DB para outro modelo de dados',
  },
  arquivos: {
    nome: 'Fotos', servico: 'Azure Blob Storage', camada: 'dados',
    oque: 'Armazenamento de objetos. As fotos sobem direto do app, com uma URL assinada de curta duração que a API entrega.',
    porque: 'Foto não é dado de banco. Camadas de preço (quente, fria, arquivo) barateiam o que ninguém mais abre.',
    equivalente: 'Cloudflare R2', alternativa: '—',
  },
  segredos: {
    nome: 'Segredos', servico: 'Azure Key Vault', camada: 'apoio',
    oque: 'Cofre de segredos, chaves e certificados, com controle de acesso e registro de quem leu o quê.',
    porque: 'Nenhuma senha em código, em variável de pipeline ou em arquivo de configuração.',
    equivalente: 'segredos do Workers', alternativa: 'com identidade gerenciada, muitos segredos deixam de existir',
  },
  observabilidade: {
    nome: 'Observabilidade', servico: 'Application Insights', camada: 'apoio',
    oque: 'Registros, métricas e rastros de todos os serviços num lugar, consultáveis com KQL, com alertas.',
    porque: 'Sem isso, um erro em produção é um relato de usuário. Com isso, é uma requisição rastreada de ponta a ponta.',
    equivalente: 'Workers Logs e Analytics', alternativa: 'Grafana, Datadog (via OpenTelemetry)',
  },
  entrega: {
    nome: 'Entrega', servico: 'Azure DevOps', camada: 'apoio',
    oque: 'Repositórios, quadros de trabalho e os pipelines que compilam, testam e implantam cada mudança.',
    porque: 'Ninguém implanta do próprio computador. Toda mudança passa por revisão, testes e aprovação.',
    equivalente: 'o build automático do Pages e do Netlify, muito ampliado', alternativa: 'GitHub + GitHub Actions',
  },
};

const CAMADAS = [
  ['cliente', 'Clientes'],
  ['borda', 'Entrada e identidade'],
  ['computacao', 'Computação'],
  ['dados', 'Dados'],
  ['apoio', 'Apoio: atravessam tudo'],
];

function el(tag, classe, texto) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

export default function criar() {
  const raiz = el('section', 'vis vis-arquitetura');
  const topo = el('header', 'vis-topo');
  topo.append(el('strong', '', 'O sistema na Azure'), el('span', '', 'clique numa peça'));
  const corpo = el('div', 'vis-corpo arq-corpo');
  const mapa = el('div', 'arq-mapa');
  const detalhe = el('div', 'arq-detalhe');
  corpo.append(mapa, detalhe);
  raiz.append(topo, corpo);

  let escolhida = 'api';
  const botoes = {};

  for (const [camada, titulo] of CAMADAS) {
    const faixa = el('div', 'arq-faixa');
    faixa.append(el('div', 'arq-faixa-titulo', titulo));
    const linha = el('div', 'arq-linha');
    for (const [id, p] of Object.entries(PECAS)) {
      if (p.camada !== camada) continue;
      const b = el('button', 'arq-peca');
      b.append(el('strong', '', p.nome), el('span', '', p.servico));
      b.addEventListener('click', () => {
        escolhida = id;
        pintar();
      });
      botoes[id] = b;
      linha.append(b);
    }
    faixa.append(linha);
    mapa.append(faixa);
  }

  function pintar() {
    for (const [id, b] of Object.entries(botoes)) b.classList.toggle('ativo', id === escolhida);
    const p = PECAS[escolhida];
    detalhe.replaceChildren(el('h4', '', `${p.nome} · ${p.servico}`));
    for (const [rotulo, texto] of [
      ['O que é', p.oque],
      ['Por que aqui', p.porque],
      ['No que você já usa', p.equivalente],
      ['Alternativa', p.alternativa],
    ]) {
      const bloco = el('p', '');
      bloco.append(el('span', 'arq-rotulo', rotulo), document.createTextNode(texto));
      detalhe.append(bloco);
    }
  }

  pintar();
  return raiz;
}
