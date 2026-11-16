export const fundamentos = {
  id: 'fundamentos',
  titulo: 'A nuvem da Microsoft',
  cor: '#4aa3e8',
  licoes: [
    // ------------------------------------------------------------------
    {
      id: 'mapa',
      titulo: 'Azure para quem vem do Cloudflare e do Netlify',
      minutos: 12,
      resumo: 'Como a Azure se organiza, as três formas de mexer nela, e o sistema inteiro num diagrama.',
      blocos: [
        {
          t: 'texto',
          md: `Você já publica na nuvem. Cloudflare Pages e Netlify têm uma proposta clara: ligar o repositório e pronto. A Azure é outra categoria de coisa: **centenas de serviços**, que você combina para montar a sua plataforma. O poder é maior, e a primeira impressão é de se perder.

Esta trilha não executa nada: uma conta de nuvem não cabe num laboratório local. Em troca, tem diagramas clicáveis, um simulador de pipeline e muito código para ler. A meta é você chegar ao primeiro dia sabendo **ler** a infraestrutura da empresa, e conversar sobre ela.

### O sistema de todas as trilhas, na Azure

Clique em cada peça. O que importa em cada uma: por que está ali, e a que corresponde no que você já usa.`,
        },
        { t: 'visual', componente: 'azure/arquitetura' },
        {
          t: 'texto',
          md: `### Como a Azure se organiza

Todo recurso mora numa hierarquia. Ela define **quem paga**, **quem pode mexer** e **o que é apagado junto**.

\`\`\`
Locatário (tenant) do Entra ID          a organização: usuários, grupos, aplicações
└── Grupo de gerenciamento              agrupa assinaturas, para aplicar políticas
    └── Assinatura (subscription)       a unidade de cobrança e de limite
        └── Grupo de recursos           uma "pasta" com ciclo de vida comum
            └── Recurso                 o banco, o app, a conta de armazenamento
\`\`\`

| Nível | Para que serve na prática |
|---|---|
| **Locatário** | um por empresa. É o diretório de identidade |
| **Assinatura** | separa custo e risco. O comum é uma por ambiente: desenvolvimento, homologação, produção |
| **Grupo de recursos** | junta o que nasce e morre junto. Apagar o grupo apaga tudo dentro. Um por sistema e por ambiente: \`rg-armadilhas-prod\` |
| **Recurso** | tem nome, região, e um identificador longo que aparece em todo lugar |

A permissão dada num nível **desce** para os de baixo. É por isso que "contribuidor na assinatura de produção" é um acesso enorme, e "contribuidor no grupo de recursos de homologação" é o que um desenvolvedor costuma ter.

### Região

Cada recurso fica numa **região**, um conjunto de datacenters. Para o Brasil, **Brazil South** (São Paulo). A escolha pesa em três coisas:

- **Latência**: perto dos usuários e, principalmente, **junto dos outros recursos**. API numa região e banco em outra é lento e paga tráfego entre regiões.
- **Disponibilidade de serviço**: nem todo serviço, nem todo tamanho de máquina (GPU, em especial), existe em toda região.
- **Preço e residência de dados**: variam por região. Contratos e a LGPD podem exigir que os dados fiquem no país.

Dentro de uma região há **zonas de disponibilidade**: datacenters separados. Espalhar um serviço por zonas protege contra a queda de um prédio.

### Três formas de mexer`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Forma', 'Boa para', 'Ruim para'],
          linhas: [
            ['**Portal** (portal.azure.com)', 'explorar, aprender, investigar um incidente, ver custo', 'criar o que precisa existir igual em três ambientes: clique não se revisa nem se repete'],
            ['**CLI** (`az`)', 'tarefas pontuais, scripts, pipelines', 'descrever uma infraestrutura inteira: o script diz os passos, e não o estado final'],
            ['**Infraestrutura como código** (Bicep, Terraform)', 'tudo o que é permanente: revisado em pull request, aplicado por pipeline, idêntico entre ambientes', 'exploração rápida'],
          ],
        },
        {
          t: 'codigo',
          titulo: 'O primeiro contato pela linha de comando (para ler)',
          lang: 'bash',
          codigo: `winget install Microsoft.AzureCLI

az login                                   # abre o navegador; a sessão fica guardada
az account list --output table             # as assinaturas a que você tem acesso
az account set --subscription "Armadilhas - Dev"

az group list --output table               # os grupos de recursos
az resource list --resource-group rg-armadilhas-dev --output table

# Todo comando segue o mesmo molde:  az <serviço> <subgrupo> <verbo> --parâmetros
az containerapp list --resource-group rg-armadilhas-dev --query "[].{nome:name, url:properties.configuration.ingress.fqdn}" --output table
az postgres flexible-server show --resource-group rg-armadilhas-dev --name pg-armadilhas-dev

# --query usa JMESPath para filtrar o JSON; --output table | json | tsv muda o formato.
# "az <qualquer coisa> --help" funciona em todos os níveis.`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Você conhece', 'Na Azure', 'Diferença que importa'],
          linhas: [
            ['Cloudflare Pages, Netlify', 'Static Web Apps', 'mesma ideia: build a cada push, prévia por pull request'],
            ['Workers', 'Functions; Container Apps', 'Workers rodam em isolados, na borda, com partida quase instantânea; na Azure o código roda numa região, em processo ou contêiner'],
            ['R2', 'Blob Storage', 'equivalentes; o Blob tem camadas de preço por frequência de acesso'],
            ['D1, KV', 'Azure Database for PostgreSQL; Cosmos DB; Redis', 'bancos completos, com rede privada e backup configuráveis'],
            ['Queues', 'Service Bus; Storage Queues', ''],
            ['Proxy, CDN e WAF', 'Front Door', 'na Cloudflare vem ligado por padrão; na Azure é um recurso a criar'],
            ['Segredos do Workers', 'Key Vault + identidade gerenciada', ''],
            ['Painel único, poucas decisões', 'portal com centenas de serviços', 'o trabalho de plataforma, que a Cloudflare faz por você, na Azure é seu'],
          ],
        },
        {
          t: 'nota',
          estilo: 'dica',
          md: `**Convenção de nomes desde o primeiro recurso.** O padrão que a Microsoft recomenda: \`<tipo>-<sistema>-<ambiente>-<região>\`, como \`rg-armadilhas-prod-brs\`, \`ca-api-armadilhas-prod\`, \`pg-armadilhas-prod\`. Alguns recursos têm regras próprias (conta de armazenamento: só minúsculas e números, nome único no mundo, daí \`starmadilhasprod\`). E **etiquetas** (*tags*) em tudo: \`ambiente\`, \`sistema\`, \`responsavel\`, \`centro-de-custo\`. É o que torna a fatura legível.`,
        },
        {
          t: 'texto',
          md: `### A trilha

- **1 · A nuvem da Microsoft**: organização, identidade e acesso, onde rodar cada coisa, dados e mensagens.
- **2 · Entrega**: infraestrutura como código, contêineres, Azure DevOps e pipelines.
- **3 · Operação**: observabilidade, custo, e o projeto: o sistema inteiro descrito e entregue.

### Fontes

- [Organização dos recursos (Cloud Adoption Framework)](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/azure-setup-guide/organize-resources)
- [Convenção de nomes e abreviações](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/azure-best-practices/resource-abbreviations)
- [Regiões da Azure](https://learn.microsoft.com/azure/reliability/regions-list)

Conferido em novembro de 2026.`,
        },
        {
          t: 'quiz',
          pergunta: 'O que acontece ao apagar um grupo de recursos?',
          opcoes: [
            'Só o grupo some; os recursos ficam soltos.',
            'Todos os recursos dentro dele são apagados. Por isso um grupo reúne o que tem o mesmo ciclo de vida.',
            'Os recursos são movidos para a assinatura.',
            'Nada, se houver recursos dentro.',
          ],
          correta: 1,
          explicacao: 'É o que torna o grupo prático para ambientes temporários, e perigoso se misturar coisas de vida diferente. Bloqueios (locks) protegem os grupos de produção.',
        },
        {
          t: 'quiz',
          pergunta: 'Por que criar a infraestrutura permanente por código, e não pelo portal?',
          opcoes: [
            'Porque o portal é mais lento.',
            'Porque código é revisado, versionado e aplicado igual em todos os ambientes; cliques não deixam registro do que foi feito nem garantem que homologação e produção sejam iguais.',
            'Porque o portal não cria todos os recursos.',
            'Porque é mais barato.',
          ],
          correta: 1,
          explicacao: 'O portal é ótimo para explorar e investigar. O que precisa existir amanhã, e igual em três ambientes, mora num repositório.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'identidade-e-acesso',
      titulo: 'Identidade e acesso: Entra ID, RBAC e identidade gerenciada',
      minutos: 13,
      resumo: 'Quem é quem, quem pode o quê, e como um serviço fala com outro sem nenhuma senha.',
      blocos: [
        {
          t: 'texto',
          md: `Na Azure, **segurança é identidade**. Quase todo incidente de nuvem começa com uma credencial que vazou ou uma permissão larga demais. Esta lição é o vocabulário para evitar os dois.

### Microsoft Entra ID

É o diretório (o antigo Azure Active Directory). Guarda quatro tipos de identidade:

| Identidade | O que é | Exemplo |
|---|---|---|
| **Usuário** | uma pessoa | você, com a conta da empresa |
| **Grupo** | um conjunto de identidades | \`equipe-backend\`. Permissão se dá a grupos, e não a pessoas |
| **Entidade de serviço** (*service principal*) | a identidade de uma aplicação | o pipeline que implanta |
| **Identidade gerenciada** | uma entidade de serviço que a Azure cria e mantém para um recurso, **sem senha** | a API, quando acessa o banco |

### RBAC: quem pode o quê, e onde

Uma permissão na Azure é sempre uma frase com três partes:

> **Quem** (uma identidade) recebe **qual papel** (um conjunto de ações) em **qual escopo** (assinatura, grupo de recursos ou recurso).

| Papel embutido | Pode |
|---|---|
| **Leitor** (Reader) | ver tudo, mudar nada |
| **Colaborador** (Contributor) | criar e alterar recursos, mas **não** dar permissões |
| **Proprietário** (Owner) | tudo, inclusive dar permissões |
| Papéis de **dados**: \`Storage Blob Data Reader\`, \`Key Vault Secrets User\`... | ler ou gravar o **conteúdo** de um serviço |

A distinção da última linha confunde todo mundo no começo. Há dois planos:

- **Plano de controle**: gerenciar o recurso (criar a conta de armazenamento, mudar a configuração).
- **Plano de dados**: usar o conteúdo (ler um arquivo, um segredo, uma mensagem).

"Colaborador" numa conta de armazenamento **não** dá, por si, o direito de ler os arquivos com a sua identidade. Para isso existe um papel de dados.`,
        },
        {
          t: 'codigo',
          titulo: 'Dar e conferir permissões (para ler)',
          lang: 'bash',
          codigo: `# A equipe de backend pode alterar os recursos de homologação
az role assignment create \\
  --assignee-object-id "$(az ad group show --group equipe-backend --query id -o tsv)" \\
  --assignee-principal-type Group \\
  --role "Contributor" \\
  --scope "/subscriptions/<id>/resourceGroups/rg-armadilhas-hml"

# A API (pela identidade gerenciada dela) pode LER E GRAVAR fotos, e nada mais, só neste contêiner
az role assignment create \\
  --assignee-object-id "<id da identidade da API>" --assignee-principal-type ServicePrincipal \\
  --role "Storage Blob Data Contributor" \\
  --scope "/subscriptions/<id>/resourceGroups/rg-armadilhas-prod/providers/Microsoft.Storage/storageAccounts/starmadilhasprod/blobServices/default/containers/fotos"

# Quem tem acesso a este grupo de recursos, e por quê?
az role assignment list --resource-group rg-armadilhas-prod --include-inherited --output table`,
        },
        {
          t: 'texto',
          md: `### Identidade gerenciada: o fim da senha entre serviços

A API precisa acessar o banco, o armazenamento e o cofre de segredos. O jeito antigo: uma cadeia de conexão com senha, guardada em algum lugar, que alguém precisa trocar de tempos em tempos, e que um dia vai parar num repositório.

Com **identidade gerenciada**, o recurso (o Container App da API) ganha uma identidade no Entra ID. A Azure entrega a ele **tokens de curta duração**, renovados sozinhos. Não existe senha para guardar, vazar ou trocar.`,
        },
        {
          t: 'comparacao',
          esq: {
            titulo: 'Com segredo',
            lang: 'csharp',
            codigo: `// A senha existe em algum lugar: variável de
// ambiente, arquivo, cofre. Alguém a criou,
// alguém precisa trocá-la, e ela pode vazar.
var conexao =
    "DefaultEndpointsProtocol=https;" +
    "AccountName=starmadilhasprod;" +
    "AccountKey=Kp9...segredo...==";

var cliente = new BlobServiceClient(conexao);`,
          },
          dir: {
            titulo: 'Com identidade gerenciada',
            lang: 'csharp',
            codigo: `// Nenhum segredo. O código diz só ONDE está o
// recurso; QUEM está pedindo vem do ambiente.
var cliente = new BlobServiceClient(
    new Uri("https://starmadilhasprod.blob.core.windows.net"),
    new DefaultAzureCredential());

// Na Azure: usa a identidade gerenciada do app.
// No seu computador: usa o login do "az login".
// O mesmo código, nos dois lugares.`,
          },
          nota: '`DefaultAzureCredential` existe em todas as linguagens (`azure-identity` no Python, `@azure/identity` no Node). Ele tenta uma lista de fontes de credencial e usa a primeira que funcionar.',
        },
        {
          t: 'texto',
          md: `O banco de dados entra no mesmo esquema: o Azure Database for PostgreSQL aceita **autenticação pelo Entra ID**, e a API se conecta com um token no lugar da senha.

### Key Vault: para os segredos que sobram

Nem tudo aceita identidade gerenciada: a chave de uma API de terceiros, um certificado, a senha de um sistema legado. Esses vão para o **Key Vault**. A aplicação lê o segredo em tempo de execução, usando a própria identidade gerenciada. No Container Apps e no App Service dá para **referenciar** o segredo do cofre na configuração, e o código nem percebe.

### Como as pessoas e o app entram

| Quem | Como se autentica |
|---|---|
| Funcionário, no painel | login único do Entra ID (OpenID Connect), com autenticação em vários fatores. A API recebe um **token JWT** e confere assinatura, emissor, audiência e papéis |
| Técnico de campo, no app | o mesmo fluxo, pela biblioteca MSAL; o token de atualização fica no armazenamento seguro do aparelho |
| Cliente de fora da empresa | Entra External ID: cadastro próprio, login social |
| Um serviço chamando outro | identidade gerenciada |
| O pipeline implantando | **federação de identidade de carga de trabalho**: o Azure DevOps troca um token próprio por um da Azure, sem segredo guardado (lição de pipelines) |`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Regra', 'Por quê'],
          linhas: [
            ['**Menor privilégio**: o menor papel, no menor escopo', 'limita o estrago de uma credencial comprometida e de um engano'],
            ['Permissão para **grupos**, nunca para pessoas', 'quem entra e sai da equipe muda de grupo; a regra não muda'],
            ['**Sem segredo** onde há identidade gerenciada', 'o que não existe não vaza'],
            ['Acesso de administrador **sob demanda** (PIM)', 'ninguém é proprietário de produção o tempo todo; pede, justifica, expira'],
            ['Produção em **assinatura separada**', 'um erro em desenvolvimento não alcança produção'],
            ['**Rede privada** para os dados', 'banco e armazenamento sem endereço público; só a API os alcança'],
            ['**Revisar** quem tem acesso', 'permissão acumula; ninguém pede para perder acesso'],
          ],
        },
        {
          t: 'quiz',
          pergunta: 'O que uma identidade gerenciada elimina?',
          opcoes: [
            'A necessidade de permissões.',
            'A senha ou chave que um serviço usaria para se autenticar em outro: a Azure fornece tokens de curta duração ao recurso, e não há segredo para guardar ou trocar.',
            'O custo do serviço.',
            'O login dos usuários.',
          ],
          correta: 1,
          explicacao: 'As permissões continuam necessárias (a identidade precisa de um papel no recurso de destino). O que desaparece é a credencial estática.',
        },
        {
          t: 'quiz',
          pergunta: 'Um desenvolvedor é "Colaborador" na conta de armazenamento e recebe "acesso negado" ao listar os arquivos com a própria identidade. Por quê?',
          opcoes: [
            'O armazenamento está fora do ar.',
            'Colaborador é um papel do plano de controle: gerencia o recurso. Ler o conteúdo exige um papel de dados, como `Storage Blob Data Reader`.',
            'Falta autenticação em dois fatores.',
            'O papel demora 24 horas para valer.',
          ],
          correta: 1,
          explicacao: 'Gerenciar o recurso e usar os dados dele são permissões distintas. A separação permite ter quem opera a infraestrutura sem enxergar o conteúdo.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'onde-rodar',
      titulo: 'Onde rodar: os serviços de computação',
      minutos: 13,
      resumo: 'Static Web Apps, App Service, Container Apps, Functions, AKS e máquinas virtuais: o que cada um resolve, e como escolher.',
      blocos: [
        {
          t: 'texto',
          md: `A Azure tem meia dúzia de jeitos de rodar código, que parecem se sobrepor. A diferença entre eles é **quanto você entrega pronto** e **quanto você opera**.

\`\`\`
menos para operar ─────────────────────────────────────────────── mais controle
Static Web Apps   Functions   App Service   Container Apps   AKS   Máquina virtual
\`\`\`

Responda às perguntas do painel com um caso real na cabeça.`,
        },
        { t: 'visual', componente: 'azure/escolha' },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Serviço', 'Você entrega', 'Escala', 'Escolha quando'],
          linhas: [
            ['**Static Web Apps**', 'a pasta do build', 'rede de distribuição global', 'front-end estático: o painel em React'],
            ['**App Service**', 'código (.NET, Node, Python) ou um contêiner', 'por regras, de 1 a N instâncias; **não** vai a zero', 'API ou aplicação web convencional, sempre ligada. O caminho mais curto para uma API .NET'],
            ['**Container Apps**', 'uma imagem de contêiner', 'por requisições, fila ou CPU; **vai a zero**; tem perfis com GPU', 'APIs e serviços em contêiner, processamento de fila, inferência'],
            ['**Functions**', 'funções com gatilho', 'por evento; vai a zero', 'código curto reagindo a evento: arquivo novo, mensagem, agenda'],
            ['**AKS**', 'manifestos do Kubernetes', 'o que você configurar', 'muitos serviços, equipe de plataforma, necessidade real do ecossistema Kubernetes'],
            ['**Máquina virtual**', 'tudo, do sistema para cima', 'manual, ou conjuntos de escala', 'software que exige o sistema operacional; último recurso'],
          ],
        },
        {
          t: 'texto',
          md: `### Para o sistema das armadilhas

| Peça | Serviço | Por quê |
|---|---|---|
| Painel em React | Static Web Apps | build estático; prévia por pull request |
| API em .NET | **Container Apps** (ou App Service) | contêiner, escala automática, revisões |
| Serviço Python de inferência | **Container Apps** com GPU, escalando pela fila | GPU só ligada quando há foto para processar |
| Tarefa noturna de relatório | job do Container Apps, ou Functions com gatilho de agenda | roda e termina |

O **App Service** seria uma escolha legítima para a API: menos conceitos, e os **slots de implantação** (publicar numa cópia, testar, trocar com produção) são muito bons. O Container Apps ganha quando já existe contêiner, quando escalar a zero importa, ou quando há mais de um serviço conversando.

### Conceitos que valem para todos

| Conceito | O que é |
|---|---|
| **Escala horizontal** | mais instâncias (e não uma instância maior). Exige que a aplicação **não guarde estado** na memória nem no disco local |
| **Escala a zero** | nenhuma instância sem tráfego. Economiza, e cobra na **partida a frio**: a primeira requisição espera o contêiner subir |
| **Sondas de saúde** | a plataforma chama \`/saude\` para saber se manda tráfego àquela instância. Sem a sonda certa, usuários caem em instâncias que ainda carregam o modelo |
| **Revisão** / **slot** | uma versão implantada, imutável. Dá para dividir o tráfego (90% na antiga, 10% na nova) e voltar atrás num comando |
| **Configuração por ambiente** | variáveis de ambiente e referências a segredos. A mesma imagem roda em homologação e produção; só a configuração muda |
| **Entrada** (*ingress*) | pública, só interna à rede, ou nenhuma. O serviço de inferência não precisa de endereço público |`,
        },
        {
          t: 'nota',
          estilo: 'pegadinha',
          md: `**Partida a frio com modelo de visão.** Um contêiner com PyTorch e um detector leva dezenas de segundos para subir e carregar os pesos. Escalar a zero um serviço **síncrono** de inferência significa que o primeiro usuário da manhã espera tudo isso. As saídas: manter uma instância mínima (e pagar por ela), ou tornar o trabalho **assíncrono**, por fila, que é o desenho do projeto: quem espera é a mensagem, e não uma pessoa.`,
        },
        {
          t: 'texto',
          md: `### Fontes

- [Escolher um serviço de computação](https://learn.microsoft.com/azure/architecture/guide/technology-choices/compute-comparison)
- [Hospedar aplicações na Azure](https://learn.microsoft.com/azure/developer/intro/hosting-apps-on-azure)
- [Container Apps: visão geral](https://learn.microsoft.com/azure/container-apps/overview)
- [Planos do Static Web Apps](https://learn.microsoft.com/azure/static-web-apps/plans)

Conferido em novembro de 2026. Recursos, limites e regiões com GPU mudam: confira na documentação antes de decidir.`,
        },
        {
          t: 'quiz',
          pergunta: 'Qual exigência a escala horizontal impõe à aplicação?',
          opcoes: [
            'Ser escrita em .NET.',
            'Não guardar estado na instância: sessão, arquivos e cache ficam em serviços externos, porque a próxima requisição pode cair em outra instância.',
            'Usar GPU.',
            'Ter um único processo.',
          ],
          correta: 1,
          explicacao: 'Instâncias são descartáveis e intercambiáveis. Estado local some quando a instância é substituída, e não é visto pelas outras.',
        },
        {
          t: 'quiz',
          pergunta: 'Um serviço de inferência com GPU recebe fotos em rajadas, poucas vezes ao dia. Qual desenho evita pagar GPU parada sem fazer o usuário esperar?',
          opcoes: [
            'Uma máquina virtual com GPU ligada o tempo todo.',
            'A API grava a foto e põe uma mensagem numa fila; o serviço de inferência escala pelo tamanho da fila, inclusive a zero, e o resultado aparece quando ficar pronto.',
            'Rodar o modelo dentro da API.',
            'Um contêiner maior.',
          ],
          correta: 1,
          explicacao: 'A fila desacopla o momento do pedido do momento do processamento. A partida a frio passa a atrasar uma mensagem, e não uma pessoa olhando para a tela.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'dados-e-mensagens',
      titulo: 'Dados, arquivos e mensagens',
      minutos: 13,
      resumo: 'PostgreSQL gerenciado, Blob Storage com acesso por URL assinada, e filas para desacoplar o que demora.',
      blocos: [
        {
          t: 'texto',
          md: `### Azure Database for PostgreSQL

É o Postgres da trilha anterior, operado pela Microsoft, no modo **Flexible Server**. O que você deixa de fazer: instalar, atualizar, configurar backup, montar réplica. O que continua seu: esquema, consultas, índices, conexões e permissões.

| Recurso | O que é | Decisão |
|---|---|---|
| **Camada e tamanho** | Burstable (barata, para desenvolvimento), General Purpose, Memory Optimized | começar pequeno; dá para aumentar depois |
| **Backup** | automático, com **recuperação pontual** (voltar a qualquer instante dentro da retenção, de 7 a 35 dias) | conferir a retenção; testar a restauração |
| **Alta disponibilidade** | réplica em espera em outra zona, com troca automática | ligar em produção; dobra o custo |
| **Réplicas de leitura** | cópias para relatórios e leitura pesada | quando o painel de BI começar a pesar |
| **Extensões** | \`vector\`, \`pg_trgm\`, PostGIS e outras, liberadas no parâmetro \`azure.extensions\` | liberar só as que usa |
| **Rede** | acesso público com regras de firewall, ou **acesso privado** dentro de uma rede virtual | privado em produção |
| **Autenticação** | senha, ou **Entra ID** (a API entra com a identidade gerenciada) | Entra ID |
| **Conexões** | PgBouncer embutido, opcional | ligar quando houver muitas instâncias da API |

Tudo o que a lição de operação do PostgreSQL listou (migrações, papel de privilégio mínimo, \`pg_stat_statements\`) vale aqui sem mudança.`,
        },
        {
          t: 'texto',
          md: `### Blob Storage: onde moram as fotos

Uma **conta de armazenamento** tem **contêineres** (pastas de primeiro nível, sem relação com Docker), e dentro deles os **blobs**, os arquivos.

\`\`\`
starmadilhasprod                         conta
├── fotos/                               contêiner
│   └── 2026/03/usina-2/a-01/9f3c….jpg   blob (as barras no nome simulam pastas)
└── modelos/
    └── armadilhas-2026-11-10.onnx
\`\`\`

| Camada | Para | Custo |
|---|---|---|
| **Quente** (hot) | o que se lê com frequência | guardar é mais caro, ler é barato |
| **Esporádica** (cool) e **fria** (cold) | o que se lê raramente | guardar é barato, ler custa |
| **Arquivo** (archive) | o que talvez nunca mais se leia | muito barato; reidratar leva horas |

Uma **política de ciclo de vida** move sozinha: fotos com mais de 90 dias para a camada esporádica, com mais de 2 anos para arquivo.

### O envio direto, com URL assinada

Fotos **não passam pela API**. Passar significaria a API recebendo megabytes, segurando uma conexão e pagando por isso. O desenho correto:`,
        },
        {
          t: 'codigo',
          titulo: 'A API entrega uma URL de envio de curta duração (para ler)',
          lang: 'csharp',
          codigo: `// 1. O app pede à API permissão para enviar a foto da captura.
app.MapPost("/capturas/{id:guid}/url-de-envio", async (Guid id, BlobServiceClient armazenamento) =>
{
    var blob = armazenamento.GetBlobContainerClient("fotos").GetBlobClient($"{DateTime.UtcNow:yyyy/MM}/{id}.jpg");

    // Uma "chave de delegação do usuário": assinada com a identidade gerenciada da API, sem chave da conta.
    var chave = await armazenamento.GetUserDelegationKeyAsync(DateTimeOffset.UtcNow, DateTimeOffset.UtcNow.AddMinutes(15));

    var sas = new BlobSasBuilder
    {
        BlobContainerName = blob.BlobContainerName,
        BlobName = blob.Name,
        Resource = "b",
        ExpiresOn = DateTimeOffset.UtcNow.AddMinutes(15),      // vale 15 minutos
    };
    sas.SetPermissions(BlobSasPermissions.Create | BlobSasPermissions.Write);   // só criar e gravar ESTE blob

    var url = new BlobUriBuilder(blob.Uri) { Sas = sas.ToSasQueryParameters(chave, armazenamento.AccountName) }.ToUri();
    return Results.Ok(new { url, expiraEm = sas.ExpiresOn });
});

// 2. O app envia a foto DIRETO para o armazenamento:
//      PUT <url>     x-ms-blob-type: BlockBlob     corpo: os bytes do JPEG
// 3. O armazenamento emite um evento "blob criado" (Event Grid), que põe uma mensagem na fila de inferência.`,
        },
        {
          t: 'texto',
          md: `A URL assinada (**SAS**) dá a quem a tiver **uma** permissão, sobre **um** arquivo, por **quinze minutos**. É o mesmo padrão das URLs pré-assinadas do R2 e do S3.

### Mensagens: desacoplar o que demora

Quando a API recebe "há uma foto nova", ela não chama o serviço de inferência e espera. Ela **publica uma mensagem**. O ganho:

- a API responde em milissegundos;
- se a inferência estiver fora do ar ou atrasada, as mensagens **esperam**;
- o serviço de inferência escala pelo **tamanho da fila**;
- uma mensagem que falha volta para a fila e é tentada de novo.

| Serviço | É | Use para |
|---|---|---|
| **Storage Queues** | fila simples, muito barata | uma fila, um consumidor, sem requisitos especiais |
| **Service Bus** | mensageria completa: filas, tópicos com assinaturas, sessões, fila de mensagens mortas | o caso geral de sistema de negócio; a escolha do projeto |
| **Event Grid** | roteador de **eventos**: "algo aconteceu", entregue a quem se inscreveu | reagir a eventos da própria Azure (blob criado) e integrar serviços |
| **Event Hubs** | fluxo de alto volume (milhões de eventos), compatível com Kafka | telemetria, sensores |

### O que toda fila exige de quem consome

| Regra | Por quê |
|---|---|
| **Processamento idempotente** | a entrega é "pelo menos uma vez": a mesma mensagem pode chegar duas vezes. Processar de novo não pode duplicar detecções. O \`ON CONFLICT DO NOTHING\` da trilha de PostgreSQL resolve |
| **Confirmar só depois de terminar** | se o serviço cair no meio, a mensagem volta para a fila sozinha |
| **Fila de mensagens mortas** | uma mensagem que falha N vezes sai do caminho e vai para uma fila à parte, para investigação. Sem isso, uma foto corrompida trava a fila para sempre |
| **Mensagem pequena** | a mensagem leva o **identificador** da captura e o caminho do blob, e não a foto |
| **Alarme no tamanho e na idade da fila** | fila crescendo é o primeiro sinal de que o consumidor parou |`,
        },
        {
          t: 'nota',
          estilo: 'campo',
          md: `**Guarde a foto original, sempre.** O detector vai ser retreinado, e a versão nova vai reprocessar o histórico. Armazenamento é barato: a camada fria custa uma fração de centavo por gigabyte por mês. Jogar fora a foto para economizar é a decisão que mais se lamenta em projeto de visão computacional.`,
        },
        {
          t: 'texto',
          md: `### Fontes

- [Azure Database for PostgreSQL: visão geral](https://learn.microsoft.com/azure/postgresql/flexible-server/overview)
- [Camadas de acesso do Blob Storage](https://learn.microsoft.com/azure/storage/blobs/access-tiers-overview)
- [SAS com delegação de usuário](https://learn.microsoft.com/azure/storage/common/storage-sas-overview)
- [Escolher entre os serviços de mensagens](https://learn.microsoft.com/azure/service-bus-messaging/compare-messaging-services)

Conferido em novembro de 2026.`,
        },
        {
          t: 'quiz',
          pergunta: 'Por que o app envia a foto direto ao Blob Storage, com uma URL assinada, em vez de mandá-la para a API?',
          opcoes: [
            'Porque a API não aceita arquivos.',
            'Porque a API deixa de receber e repassar megabytes: ela só autoriza, por tempo e escopo limitados, e o envio pesado vai direto para quem foi feito para isso.',
            'Porque a URL assinada dispensa autenticação.',
            'Porque é a única forma de gravar um blob.',
          ],
          correta: 1,
          explicacao: 'A API continua decidindo quem pode enviar o quê. O tráfego de dados sai do caminho dela, o que reduz custo e pontos de falha.',
        },
        {
          t: 'quiz',
          pergunta: 'Uma fila entrega "pelo menos uma vez". O que o consumidor precisa garantir?',
          opcoes: [
            'Processar cada mensagem o mais rápido possível.',
            'Idempotência: processar a mesma mensagem duas vezes deve dar o mesmo resultado que processar uma, sem duplicar registros.',
            'Nunca falhar.',
            'Confirmar a mensagem antes de processar.',
          ],
          correta: 1,
          explicacao: 'Reentregas acontecem: o consumidor caiu depois de gravar e antes de confirmar. Gravar com o identificador da captura e ignorar o conflito torna a repetição inofensiva.',
        },
      ],
    },
  ],
};
