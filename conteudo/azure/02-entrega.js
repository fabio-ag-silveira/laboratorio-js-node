export const entrega = {
  id: 'entrega',
  titulo: 'Entrega',
  cor: '#4aa3e8',
  licoes: [
    // ------------------------------------------------------------------
    {
      id: 'infra-como-codigo',
      titulo: 'Infraestrutura como código: Bicep e azd',
      minutos: 13,
      resumo: 'Descrever o estado desejado, ver o que mudaria antes de aplicar, e ter três ambientes iguais a partir de um arquivo.',
      blocos: [
        {
          t: 'texto',
          md: `**Infraestrutura como código** é descrever os recursos num arquivo, e deixar uma ferramenta fazer a nuvem ficar igual ao arquivo. A diferença para um script de \`az\`:

| | Script imperativo (\`az ... create\`) | Declarativo (Bicep) |
|---|---|---|
| Você escreve | os **passos** | o **estado final** |
| Rodar duas vezes | pode falhar ou duplicar | não muda nada: é **idempotente** |
| Saber o que vai mudar | lendo o script | \`what-if\`: a ferramenta mostra a diferença |
| Remover um recurso | escrever outro script | apagar do arquivo (com o modo certo de implantação) |

Na Azure, a linguagem nativa é o **Bicep**. Ele compila para os modelos ARM (JSON) que a plataforma entende. O **Terraform** é a alternativa de mercado, que serve a várias nuvens. Os conceitos são os mesmos: aprender um torna o outro legível.`,
        },
        {
          t: 'codigo',
          titulo: 'main.bicep: banco, armazenamento e a API (para ler)',
          lang: 'bash',
          codigo: `// ---- parâmetros: o que muda entre ambientes ------------------------------
@allowed(['dev', 'hml', 'prod'])
param ambiente string
param regiao string = resourceGroup().location
param imagemDaApi string                       // ex.: crarmadilhas.azurecr.io/api:1.4.2

var sufixo = 'armadilhas-\${ambiente}'
var etiquetas = { sistema: 'armadilhas', ambiente: ambiente }

// ---- identidade da API: criada aqui, usada abaixo --------------------------
resource identidade 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'id-api-\${sufixo}'
  location: regiao
  tags: etiquetas
}

// ---- armazenamento das fotos -----------------------------------------------
resource armazenamento 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: 'st\${replace(sufixo, '-', '')}'       // só minúsculas e números
  location: regiao
  tags: etiquetas
  sku: { name: ambiente == 'prod' ? 'Standard_ZRS' : 'Standard_LRS' }   // em produção, replicado entre zonas
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false                 // só identidade: nada de chave de conta
    minimumTlsVersion: 'TLS1_2'
  }
}

// ---- a permissão: a identidade da API pode ler e gravar blobs --------------
var papelDeDadosDeBlob = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
resource acessoAosBlobs 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: armazenamento
  name: guid(armazenamento.id, identidade.id, papelDeDadosDeBlob)
  properties: { principalId: identidade.properties.principalId, principalType: 'ServicePrincipal', roleDefinitionId: papelDeDadosDeBlob }
}

// ---- a API, num Container App ----------------------------------------------
resource ambienteDeContainers 'Microsoft.App/managedEnvironments@2024-03-01' existing = { name: 'cae-\${sufixo}' }

resource api 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-api-\${sufixo}'
  location: regiao
  tags: etiquetas
  identity: { type: 'UserAssigned', userAssignedIdentities: { '\${identidade.id}': {} } }
  properties: {
    managedEnvironmentId: ambienteDeContainers.id
    configuration: { ingress: { external: true, targetPort: 8080 } }
    template: {
      containers: [{
        name: 'api'
        image: imagemDaApi
        resources: { cpu: json('0.5'), memory: '1Gi' }
        env: [
          { name: 'Armazenamento__Url', value: armazenamento.properties.primaryEndpoints.blob }
          { name: 'AZURE_CLIENT_ID', value: identidade.properties.clientId }
        ]
        probes: [{ type: 'Readiness', httpGet: { path: '/saude', port: 8080 } }]
      }]
      scale: { minReplicas: ambiente == 'prod' ? 2 : 0, maxReplicas: 10 }
    }
  }
}

output urlDaApi string = 'https://\${api.properties.configuration.ingress.fqdn}'`,
        },
        {
          t: 'texto',
          md: `O que ler nesse arquivo:

- **\`param\`** é o que muda entre ambientes. **O mesmo arquivo** cria desenvolvimento, homologação e produção.
- **\`resource\`** declara um recurso: tipo, versão da API, nome e propriedades.
- **Referências** (\`armazenamento.properties.primaryEndpoints.blob\`) criam a **ordem de dependência** sozinhas: o Bicep sabe que a API depende do armazenamento.
- **\`existing\`** aponta para um recurso que já existe, sem criá-lo.
- A **permissão é um recurso** como outro qualquer. Infraestrutura e acesso nascem juntos, revisados juntos.
- **Decisões por ambiente** viram expressões: produção tem no mínimo 2 réplicas e armazenamento replicado entre zonas; desenvolvimento escala a zero.
- **Nenhum segredo**: a URL do armazenamento não é sensível, e o acesso é por identidade.`,
        },
        {
          t: 'codigo',
          titulo: 'Ver antes de aplicar (para ler)',
          lang: 'bash',
          codigo: `# O que MUDARIA? Nada é alterado. É o "git diff" da infraestrutura.
az deployment group what-if \\
  --resource-group rg-armadilhas-hml \\
  --template-file main.bicep \\
  --parameters ambiente=hml imagemDaApi=crarmadilhas.azurecr.io/api:1.4.2

#   ~ Microsoft.App/containerApps/ca-api-armadilhas-hml [2024-03-01]
#     ~ properties.template.containers[0].image: "…/api:1.4.1" => "…/api:1.4.2"
#   = Microsoft.Storage/storageAccounts/starmadilhashml           (sem mudança)

# Aplicar
az deployment group create \\
  --resource-group rg-armadilhas-hml \\
  --template-file main.bicep \\
  --parameters ambiente=hml imagemDaApi=crarmadilhas.azurecr.io/api:1.4.2`,
        },
        {
          t: 'texto',
          md: `O \`what-if\` é a peça que dá confiança: o pull request que altera a infraestrutura mostra, no pipeline, exatamente quais recursos serão criados, alterados ou **removidos**.

### Organizar

- **Módulos**: um arquivo por peça (\`banco.bicep\`, \`api.bicep\`, \`rede.bicep\`), chamados por um \`main.bicep\`. É o equivalente de funções.
- **Arquivos de parâmetros** por ambiente: \`main.dev.bicepparam\`, \`main.prod.bicepparam\`.
- **Separar por ritmo de mudança**: a rede e o banco mudam uma vez por trimestre; a versão da imagem da API muda todo dia. Misturar os dois faz toda implantação de aplicação arriscar a fundação.

### azd: o atalho do desenvolvedor

A **Azure Developer CLI** junta código e infraestrutura num fluxo:

\`\`\`bash
azd init          # a partir de um modelo, ou do projeto existente
azd up            # cria a infraestrutura (Bicep) E implanta o código
azd deploy        # só o código
azd down          # apaga tudo
\`\`\`

Ela lê um \`azure.yaml\` que diz quais serviços o projeto tem e onde está o Bicep. É excelente para ambientes de desenvolvimento e para começar. Em produção, o que roda é o pipeline, chamando o Bicep.

### O que não fazer

| Tentação | Consequência |
|---|---|
| "Só esse ajuste rápido pelo portal" | **deriva**: a nuvem deixa de bater com o arquivo, e a próxima implantação desfaz o ajuste, ou falha |
| Segredo como parâmetro em texto | fica no histórico de implantações. Use \`@secure()\` e referência ao Key Vault |
| Um arquivo gigante | impossível de revisar; qualquer mudança arrisca tudo |
| Aplicar da própria máquina em produção | sem revisão e sem registro. Produção só pelo pipeline |

### Fontes

- [Bicep: visão geral](https://learn.microsoft.com/azure/azure-resource-manager/bicep/overview)
- [what-if](https://learn.microsoft.com/azure/azure-resource-manager/bicep/deploy-what-if)
- [Azure Developer CLI](https://learn.microsoft.com/azure/developer/azure-developer-cli/overview)

Conferido em novembro de 2026. As versões de API dos recursos (\`@2024-03-01\`) mudam: o editor com a extensão do Bicep sugere a atual.`,
        },
        {
          t: 'quiz',
          pergunta: 'O que significa dizer que uma implantação declarativa é idempotente?',
          opcoes: [
            'Que roda mais rápido na segunda vez.',
            'Que aplicar o mesmo arquivo de novo não muda nada: a ferramenta compara o estado desejado com o existente e só age na diferença.',
            'Que não pode ser desfeita.',
            'Que dispensa parâmetros.',
          ],
          correta: 1,
          explicacao: 'É o que torna seguro rodar a implantação em toda mudança, e o que faz o `what-if` possível: a ferramenta sabe calcular a diferença.',
        },
        {
          t: 'quiz',
          pergunta: 'Alguém aumentou a memória de um Container App pelo portal para resolver um incidente. O que precisa acontecer depois?',
          opcoes: [
            'Nada: o problema foi resolvido.',
            'Levar a mudança para o arquivo Bicep. Senão a próxima implantação restaura o valor antigo, e o incidente volta.',
            'Apagar o recurso e recriar.',
            'Travar o portal.',
          ],
          correta: 1,
          explicacao: 'Ajuste manual em emergência é aceitável. Deixá-lo fora do código é o que cria a deriva entre o que está descrito e o que existe.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'conteineres',
      titulo: 'Contêineres na Azure: imagem, registro e revisões',
      minutos: 12,
      resumo: 'Um Dockerfile bom para .NET e para Python, o Container Registry, e trocar de versão sem derrubar o serviço.',
      blocos: [
        {
          t: 'texto',
          md: `Você já usa Docker. Esta lição é o que muda entre "roda no meu compose" e "roda em produção": imagens pequenas e seguras, um registro privado, e a troca de versão sem queda.

### Uma imagem de produção

Três regras resolvem a maior parte: **construir em estágios** (as ferramentas de build não vão para a imagem final), **ordenar as camadas pelo que muda menos** (para o cache funcionar) e **não rodar como root**.`,
        },
        {
          t: 'comparacao',
          esq: {
            titulo: 'API em .NET',
            lang: 'bash',
            codigo: `# ---- estágio de build: SDK completo ----
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# primeiro só o projeto: restaurar pacotes fica em cache
COPY Api/Api.csproj Api/
RUN dotnet restore Api/Api.csproj

COPY . .
RUN dotnet publish Api/Api.csproj -c Release \\
      -o /app --no-restore

# ---- estágio final: só o runtime ----
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .

USER $APP_UID          # usuário sem privilégio
EXPOSE 8080
ENTRYPOINT ["dotnet", "Api.dll"]`,
          },
          dir: {
            titulo: 'Serviço Python de inferência',
            lang: 'bash',
            codigo: `FROM python:3.13-slim AS base
ENV PYTHONUNBUFFERED=1 UV_COMPILE_BYTECODE=1
WORKDIR /app

# o uv, copiado da imagem oficial
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# primeiro só as dependências: cache
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY src/ src/
RUN uv sync --frozen --no-dev

RUN useradd --create-home app
USER app
EXPOSE 8000
CMD ["/app/.venv/bin/uvicorn", \\
     "inferencia.api:app", \\
     "--host", "0.0.0.0", "--port", "8000"]`,
          },
          nota: 'Os pesos do modelo não vão dentro da imagem: são baixados do Blob Storage na subida, ou montados. Imagem com 2 GB de pesos demora a subir e obriga a reconstruir a cada modelo novo. Para GPU, a base é uma imagem com CUDA, na mesma versão usada no treino.',
        },
        {
          t: 'texto',
          md: `### Azure Container Registry

É o registro privado de imagens (o seu Docker Hub particular). O pipeline constrói e envia; o Container Apps baixa, **autenticando com identidade gerenciada** (o papel \`AcrPull\`), sem senha.

\`\`\`bash
az acr build --registry crarmadilhas --image api:1.4.2 --file Api/Dockerfile .
\`\`\`

O \`az acr build\` constrói **na nuvem**: o agente do pipeline nem precisa ter Docker.

### Etiquetas: nunca implante \`latest\`

| Etiqueta | Problema ou vantagem |
|---|---|
| \`api:latest\` | ninguém sabe o que está rodando; reiniciar uma instância pode trazer outra versão |
| \`api:1.4.2\` | legível; exige disciplina para não sobrescrever |
| \`api:1.4.2-3f9c2ab\` (versão + commit) | rastreável até a linha de código |
| \`api@sha256:…\` (resumo) | imutável de verdade: é o que se implanta em produção |

A regra de ouro: **construir uma vez, promover a mesma imagem**. A imagem testada em homologação é, byte a byte, a que vai para produção. Só a configuração muda.

### Revisões: trocar de versão sem queda

No Container Apps, cada mudança de imagem ou de configuração cria uma **revisão**: uma fotografia imutável da aplicação. O tráfego é dividido entre revisões.`,
        },
        {
          t: 'codigo',
          titulo: 'Implantar, dividir o tráfego e voltar atrás (para ler)',
          lang: 'bash',
          codigo: `# Modo de várias revisões: a nova sobe SEM receber tráfego
az containerapp revision set-mode --name ca-api --resource-group rg-armadilhas-prod --mode multiple

az containerapp update --name ca-api --resource-group rg-armadilhas-prod \\
  --image crarmadilhas.azurecr.io/api:1.4.2 --revision-suffix v1-4-2

# 10% do tráfego para a nova (lançamento canário)
az containerapp ingress traffic set --name ca-api --resource-group rg-armadilhas-prod \\
  --revision-weight ca-api--v1-4-1=90 ca-api--v1-4-2=10

# ...olhar erros e latência da revisão nova por alguns minutos...

# Tudo certo: 100%
az containerapp ingress traffic set --name ca-api --resource-group rg-armadilhas-prod \\
  --revision-weight ca-api--v1-4-2=100

# Deu errado: voltar é um comando, e leva segundos
az containerapp ingress traffic set --name ca-api --resource-group rg-armadilhas-prod \\
  --revision-weight ca-api--v1-4-1=100`,
        },
        {
          t: 'texto',
          md: `### Escala: a regra certa para cada serviço

| Serviço | Regra de escala | Mínimo |
|---|---|---|
| API | requisições HTTP simultâneas por réplica | 2 em produção (uma só não tolera falha nem atualização) |
| Inferência | **tamanho da fila** do Service Bus | 0 (GPU parada custa) |
| Tarefa agendada | um **job**, e não um app: roda e termina | — |

Por baixo, a escala do Container Apps é o **KEDA**, o mesmo motor usado no Kubernetes.

### O que a aplicação precisa fazer para isso funcionar

- **Sonda de prontidão** (\`/saude\`) que só responde 200 quando o serviço pode atender: modelo carregado, banco alcançável.
- **Encerramento gracioso**: ao receber \`SIGTERM\`, terminar as requisições em andamento antes de sair. O ASP.NET e o uvicorn fazem isso; o seu código não pode ignorar o sinal.
- **Registros na saída padrão**, em JSON. A plataforma coleta.
- **Nenhum estado no disco** do contêiner: ele some com a revisão.
- **Migrações de banco fora da subida da aplicação**: num job à parte, antes da implantação. Dez réplicas subindo ao mesmo tempo e migrando o banco é uma corrida.

### Fontes

- [Revisões no Container Apps](https://learn.microsoft.com/azure/container-apps/revisions)
- [Regras de escala](https://learn.microsoft.com/azure/container-apps/scale-app)
- [Imagens do .NET](https://learn.microsoft.com/dotnet/core/docker/build-container)

Conferido em novembro de 2026.`,
        },
        {
          t: 'quiz',
          pergunta: 'Por que "construir uma vez e promover a mesma imagem" entre ambientes?',
          opcoes: [
            'Para economizar espaço no registro.',
            'Porque o que foi testado em homologação é exatamente o que vai para produção; reconstruir pode trazer dependências ou código diferentes.',
            'Porque o Docker não permite reconstruir.',
            'Para o build ficar mais rápido.',
          ],
          correta: 1,
          explicacao: 'Uma imagem reconstruída é outra imagem. A configuração por ambiente fica fora dela, em variáveis e segredos.',
        },
        {
          t: 'quiz',
          pergunta: 'Qual é a vantagem de dividir o tráfego entre duas revisões?',
          opcoes: [
            'Dobra a capacidade.',
            'A versão nova recebe uma fração do tráfego real; se errar, poucos usuários são afetados e voltar atrás leva segundos, sem nova implantação.',
            'Reduz o custo pela metade.',
            'Dispensa testes.',
          ],
          correta: 1,
          explicacao: 'É o lançamento canário. Homologação nunca reproduz produção por inteiro; uma fração do tráfego real revela o que os testes não viram, com o estrago limitado.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'azure-devops',
      titulo: 'Azure DevOps: do cartão ao pull request',
      minutos: 11,
      resumo: 'Boards, Repos, Pipelines e Artifacts, e as políticas de ramo que fazem uma equipe trabalhar junta sem se atropelar.',
      blocos: [
        {
          t: 'texto',
          md: `**Azure DevOps** é o conjunto de ferramentas da Microsoft para o ciclo de desenvolvimento. Não é "a Azure": é um produto à parte (\`dev.azure.com\`), que se conecta à Azure para implantar.

| Serviço | O que é | Equivalente |
|---|---|---|
| **Boards** | itens de trabalho, quadro Kanban, sprints, backlog | Jira, GitHub Issues e Projects |
| **Repos** | repositórios Git, pull requests, políticas de ramo | GitHub, GitLab |
| **Pipelines** | integração e entrega contínuas, em YAML | GitHub Actions |
| **Artifacts** | registro privado de pacotes: NuGet, npm, Python | GitHub Packages |
| **Test Plans** | testes manuais e exploratórios | — |

A hierarquia: uma **organização** (a empresa) tem **projetos**; cada projeto tem os seus repositórios, quadros e pipelines.

### Azure DevOps ou GitHub?

A Microsoft é dona dos dois. O **GitHub** recebe o investimento em novidades (Copilot, segurança de código); o **Azure DevOps** segue mantido e é muito presente em empresas, sobretudo as de tradição Microsoft, pelo Boards e pela integração com o Entra ID. Os dois se combinam: é comum ver código no GitHub e pipelines no Azure DevOps, ou o contrário. Para você, o que importa é que **os conceitos são os mesmos**. Quem entende um pipeline do Azure DevOps lê um fluxo do GitHub Actions no mesmo dia.

### Do cartão ao código em produção

\`\`\`
item de trabalho → ramo → commits → pull request → revisão + pipeline → merge → implantação
\`\`\`

Cada seta tem rastreio: o pull request aponta o item de trabalho; o pipeline aponta os commits; a implantação aponta o pipeline. Seis meses depois, dá para responder "que mudança pôs isso em produção, e por quê".`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Item de trabalho', 'O que representa'],
          linhas: [
            ['**Epic**', 'um objetivo grande, de meses: "monitoramento de pragas por imagem"'],
            ['**Feature**', 'uma entrega com valor próprio: "registro de capturas sem sinal"'],
            ['**User Story** / **Product Backlog Item**', 'o que cabe numa sprint, do ponto de vista de quem usa: "como técnico, quero ver o que ainda não sincronizou"'],
            ['**Task**', 'o trabalho técnico de uma história, de horas'],
            ['**Bug**', 'um defeito, com passos para reproduzir'],
          ],
        },
        {
          t: 'texto',
          md: `Citar o item no commit ou no pull request (\`#1234\`) liga as duas coisas. Uma boa descrição de história tem **critérios de aceitação** verificáveis: é o que diz quando o trabalho acabou.

### Fluxo de ramos

O mais comum hoje é o **desenvolvimento baseado no tronco** (*trunk-based*): um ramo principal sempre implantável, e ramos de vida curta.

\`\`\`
main  ──●────●────────●─────────●──→   sempre implantável
          \\        /   \\      /
           feature/     fix/           ramos de horas ou poucos dias
\`\`\`

| Regra | Por quê |
|---|---|
| Ramo curto, pull request pequeno | revisão de 200 linhas é revisão; de 2.000 é um carimbo |
| Ninguém envia direto para \`main\` | toda mudança passa por revisão e pelo pipeline |
| Funcionalidade incompleta entra **desligada** (*feature flag*) | integrar cedo sem expor o que não está pronto |
| Nome do ramo com o tipo e o item: \`feature/1234-fila-de-envio\` | rastreio |

O **GitFlow** (ramos \`develop\`, \`release/*\`, \`hotfix/*\`) ainda aparece em produtos com versões mantidas em paralelo. Para um serviço com uma versão em produção, é cerimônia sem retorno.

### Políticas de ramo: a qualidade que não depende de lembrar

No Azure Repos, o ramo \`main\` recebe **políticas**. O botão de concluir o pull request só libera quando todas são atendidas.`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Política', 'O que garante'],
          linhas: [
            ['Número mínimo de revisores (e o autor não aprova o próprio)', 'outra pessoa leu'],
            ['**Validação de build**: um pipeline roda no pull request', 'compila e os testes passam, sobre o resultado do merge'],
            ['Item de trabalho vinculado', 'toda mudança tem um motivo registrado'],
            ['Comentários resolvidos', 'nenhuma observação ignorada'],
            ['Revisores automáticos por pasta', 'mudou `infra/`? a equipe de plataforma é chamada'],
            ['Tipo de merge restrito (*squash*)', 'um commit por pull request em `main`: histórico legível, fácil de reverter'],
          ],
        },
        {
          t: 'nota',
          estilo: 'campo',
          md: `**O primeiro pull request numa equipe nova.** Pequeno, com descrição que diz **por que** (o quê o diff já mostra), com o item de trabalho vinculado, com os testes, e com uma captura de tela se mudou interface. Responder a todo comentário, mesmo que só com "feito". E revisar o código dos outros desde a primeira semana: é o jeito mais rápido de aprender a base de código e as convenções da casa.`,
        },
        {
          t: 'texto',
          md: `### Artifacts: pacotes privados

Código compartilhado entre projetos (os tipos da API, um cliente HTTP, o pré-processamento de imagem usado no treino e no serviço) vira **pacote**, publicado num *feed* privado: NuGet para .NET, npm para TypeScript, um índice Python. O pipeline publica; os projetos consomem com a versão travada. É o que resolve "o pré-processamento do treino e o da produção divergiram".

### Fontes

- [O que é o Azure DevOps](https://learn.microsoft.com/azure/devops/user-guide/what-is-azure-devops)
- [Políticas de ramo](https://learn.microsoft.com/azure/devops/repos/git/branch-policies)
- [Estratégias de ramificação](https://learn.microsoft.com/azure/devops/repos/git/git-branching-guidance)

Conferido em novembro de 2026.`,
        },
        {
          t: 'quiz',
          pergunta: 'Para que serve a política de "validação de build" num ramo?',
          opcoes: [
            'Para implantar em produção a cada commit.',
            'Para impedir o merge de um pull request cujo código não compila ou cujos testes falham: um pipeline roda sobre o resultado do merge antes de ele acontecer.',
            'Para escolher os revisores.',
            'Para nomear os ramos.',
          ],
          correta: 1,
          explicacao: 'O ramo principal fica sempre em estado bom, sem depender de alguém lembrar de rodar os testes antes de integrar.',
        },
        {
          t: 'quiz',
          pergunta: 'Por que pull requests pequenos são melhores?',
          opcoes: [
            'Porque o Git é mais rápido.',
            'Porque são revisados de verdade, integram cedo (menos conflito) e, se algo der errado, a causa está em poucas linhas e reverter é simples.',
            'Porque gastam menos pipeline.',
            'Porque a política exige.',
          ],
          correta: 1,
          explicacao: 'A qualidade da revisão cai rapidamente com o tamanho. E mudança grande, integrada tarde, é onde nascem os conflitos e os defeitos difíceis de localizar.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'pipelines',
      titulo: 'Pipelines em YAML',
      minutos: 15,
      resumo: 'Gatilhos, estágios, jobs e passos. Um simulador para ver o que roda, o que é pulado e onde a entrega para.',
      blocos: [
        {
          t: 'texto',
          md: `Um **pipeline** é a receita, versionada junto do código, que leva um commit até a produção. No Azure DevOps ela mora num arquivo \`azure-pipelines.yml\`, na raiz do repositório.

A estrutura tem quatro níveis:

\`\`\`
pipeline
└── estágio (stage)      uma fase: Build, Homologação, Produção. Em sequência, por padrão
    └── job              um conjunto de passos que roda num AGENTE. Jobs de um estágio rodam em paralelo
        └── passo (step) um comando ou uma tarefa pronta. Em sequência
\`\`\`

- O **agente** é a máquina que executa o job: hospedado pela Microsoft (\`ubuntu-latest\`, limpo a cada execução) ou da própria empresa.
- Cada **job começa do zero**, numa máquina nova. O que um job produz e outro precisa viaja como **artefato**.

### O simulador

À esquerda, um pipeline típico. À direita, o que aconteceria. Experimente, nesta ordem:

1. Troque o ramo para **release/2.1**, e depois para **feature/filtro**.
2. Troque o motivo para **pull request**.
3. De volta a **main**, clique no passo **Testes** para fazê-lo falhar.
4. Desfaça a falha e **aprove** a implantação em produção.
5. Com produção aprovada, faça **Implantar em produção** falhar.`,
        },
        { t: 'visual', componente: 'azure/pipeline' },
        {
          t: 'texto',
          md: `O que o simulador mostrou, e que são as regras do produto:

| Experimento | O que acontece | A regra |
|---|---|---|
| Push em \`release/2.1\` | compila, homologa, **pula** produção | a condição do estágio exige o ramo \`main\` |
| Push em \`feature/filtro\` | **nenhuma execução** | o ramo não está no \`trigger\` |
| Pull request | só o Build | a condição de homologação exclui execuções de pull request |
| Testes falhando | o passo seguinte e os estágios seguintes são **pulados** | a condição padrão de tudo é \`succeeded()\`: só roda se o anterior passou |
| Produção sem aprovar | fica **aguardando** | o **ambiente** \`producao\` tem uma verificação de aprovação |
| Implantação falhando | o passo "Avisar" **roda** | ele tem \`condition: failed()\`: só roda quando algo antes falhou |

### As peças, uma a uma

| Chave | O que faz |
|---|---|
| \`trigger\` | quais pushes disparam: por ramo, e por caminho (\`paths\`), para não rodar o pipeline da API quando só a documentação mudou |
| \`pr\` | quais pull requests disparam (em Azure Repos, isso se configura na política de ramo) |
| \`pool\` | onde roda: \`vmImage: ubuntu-latest\`, ou o nome de um conjunto de agentes próprios |
| \`variables\` | valores reutilizados; \`$(nome)\` para ler. Grupos de variáveis podem vir do Key Vault |
| \`stages\` / \`jobs\` / \`steps\` | a hierarquia |
| \`dependsOn\` | de quem este estágio ou job depende. Sem ele, um estágio depende do anterior. \`dependsOn: []\` o solta da sequência |
| \`condition\` | quando roda. O padrão é \`succeeded()\` |
| \`deployment\` + \`environment\` | um job de implantação, ligado a um **ambiente**, que guarda o histórico e as aprovações |
| \`template\` | reaproveitar passos, jobs ou estágios de outro arquivo |

### Passos`,
        },
        {
          t: 'codigo',
          titulo: 'Os tipos de passo (para ler)',
          lang: 'yaml',
          codigo: `steps:
- checkout: self                     # baixa o repositório (implícito em jobs comuns)
  fetchDepth: 1

- script: dotnet test --logger trx   # um comando de shell
  displayName: Testes

- task: PublishTestResults@2         # uma TAREFA pronta, com versão
  condition: succeededOrFailed()     # publica o resultado mesmo se os testes falharam
  inputs:
    testResultsFormat: VSTest
    testResultsFiles: '**/*.trx'

- task: AzureCLI@2                   # roda "az" já autenticado na Azure
  displayName: Construir e enviar a imagem
  inputs:
    azureSubscription: sc-armadilhas-hml     # a CONEXÃO DE SERVIÇO
    scriptType: bash
    scriptLocation: inlineScript
    inlineScript: |
      az acr build --registry crarmadilhas \\
        --image api:$(Build.BuildNumber) --file Api/Dockerfile .

- publish: $(Build.ArtifactStagingDirectory)   # guarda um artefato para os próximos estágios
  artifact: relatorios

- template: passos/analise.yml       # passos definidos em outro arquivo
  parameters:
    projeto: Api`,
        },
        {
          t: 'texto',
          md: `### Como o pipeline entra na Azure, sem senha

O pipeline precisa de permissão para implantar. A ligação é a **conexão de serviço** (*service connection*), e a forma correta hoje é a **federação de identidade de carga de trabalho**:

1. Na Azure existe uma identidade (um registro de aplicativo ou uma identidade gerenciada) com um papel no grupo de recursos.
2. Ela **confia** em tokens emitidos para aquele pipeline específico.
3. A cada execução, o pipeline troca o token dele por um token da Azure, que vale minutos.

**Nenhum segredo é guardado no Azure DevOps.** O jeito antigo, um segredo de cliente com validade de um ou dois anos, é o que vence num sábado e derruba a entrega, ou vaza.

Cuidados com a conexão: **uma por ambiente** (a de homologação não alcança produção), com o **menor papel** (colaborador no grupo de recursos, e não na assinatura), e com **aprovação** exigida para uso em produção.

### Ambientes, aprovações e verificações

Um **ambiente** (\`environment: producao\`) é um alvo de implantação com nome. Nele se configuram **verificações**, que o pipeline respeita antes de rodar o job:

- **aprovação** por uma pessoa ou grupo;
- **horário comercial** (nada de implantar na sexta à noite);
- **ramo permitido** (só \`main\` implanta em produção);
- **trava exclusiva** (uma implantação por vez).

A regra de quem aprova fica **no ambiente**, e não no YAML. Quem edita o arquivo do pipeline não consegue retirar a aprovação.

### Segredos e variáveis

- Segredo **nunca** em texto no YAML. Variável marcada como secreta, ou grupo de variáveis ligado ao **Key Vault**.
- Variável secreta é mascarada no registro (\`***\`), mas um script descuidado ainda pode vazá-la. Passe por variável de ambiente (\`env:\`), e não na linha de comando.
- Variáveis predefinidas úteis: \`Build.SourceBranch\`, \`Build.SourceVersion\` (o commit), \`Build.BuildNumber\`, \`Build.Reason\`.
- Pipeline de pull request de **fork** não recebe segredos. É de propósito.`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Azure Pipelines', 'GitHub Actions'],
          linhas: [
            ['`azure-pipelines.yml`', '`.github/workflows/*.yml`'],
            ['`trigger`, `pr`', '`on: push`, `on: pull_request`'],
            ['`stages` → `jobs` → `steps`', '`jobs` → `steps` (sem estágios; usa `needs`)'],
            ['`dependsOn`', '`needs`'],
            ['`condition: succeeded()`', '`if: success()`'],
            ['`task: Nome@2`', '`uses: dono/acao@v2`'],
            ['`script:`', '`run:`'],
            ['`pool: vmImage`', '`runs-on`'],
            ['`$(variavel)`', '`${{ vars.NOME }}`, `${{ secrets.NOME }}`'],
            ['conexão de serviço com federação', 'OIDC com `azure/login`'],
            ['ambientes com aprovação', 'environments com revisores'],
            ['`template:`', 'fluxos reutilizáveis e ações compostas'],
          ],
        },
        {
          t: 'nota',
          estilo: 'pegadinha',
          md: `**YAML: a indentação é a sintaxe.** Dois espaços a menos e um \`job\` vira irmão do \`stage\`, com uma mensagem de erro que fala de outra coisa. Espaços, nunca tabulação. A extensão do Azure Pipelines para o VS Code valida o arquivo enquanto você digita, e o editor web do Azure DevOps tem o botão "Validar". Use os dois: descobrir erro de sintaxe enviando commits é lento e polui o histórico. No simulador acima, apague dois espaços de uma linha e veja o que acontece.`,
        },
        {
          t: 'texto',
          md: `### Fontes

- [Esquema YAML do Azure Pipelines](https://learn.microsoft.com/azure/devops/pipelines/yaml-schema/)
- [Condições](https://learn.microsoft.com/azure/devops/pipelines/process/conditions)
- [Aprovações e verificações](https://learn.microsoft.com/azure/devops/pipelines/process/approvals)
- [Conexão com a Azure por federação de identidade](https://learn.microsoft.com/azure/devops/pipelines/library/connect-to-azure)
- [Notas de versão e roteiro do Azure DevOps](https://learn.microsoft.com/azure/devops/release-notes/features-timeline)

Conferido em novembro de 2026.`,
        },
        {
          t: 'quiz',
          pergunta: 'No pipeline do simulador, por que um pull request não implanta em homologação?',
          opcoes: [
            'Porque pull requests não disparam pipelines.',
            'Porque a condição do estágio exige que o motivo da execução não seja um pull request; o Build roda, valida o código, e os estágios de implantação são pulados.',
            'Porque falta aprovação.',
            'Porque o ramo não está no `trigger`.',
          ],
          correta: 1,
          explicacao: 'O mesmo arquivo serve à validação do pull request e à entrega. As condições decidem até onde cada tipo de execução vai.',
        },
        {
          t: 'quiz',
          pergunta: 'Onde deve ficar a exigência de aprovação para implantar em produção?',
          opcoes: [
            'Num comentário no YAML.',
            'Nas verificações do ambiente: quem altera o arquivo do pipeline não consegue removê-la, e ela vale para todo pipeline que use aquele ambiente.',
            'Num passo `script` que pergunta ao usuário.',
            'Na descrição do pull request.',
          ],
          correta: 1,
          explicacao: 'Controle que mora no arquivo pode ser retirado por quem edita o arquivo. No ambiente, ele é administrado à parte e protege o alvo, e não um pipeline em particular.',
        },
        {
          t: 'quiz',
          pergunta: 'Qual é a vantagem da federação de identidade sobre um segredo de cliente na conexão de serviço?',
          opcoes: [
            'É mais rápida.',
            'Não há segredo guardado: a cada execução o pipeline obtém um token de curta duração. Nada vence de surpresa, e nada vaza por anos.',
            'Dá mais permissões.',
            'Dispensa o papel na Azure.',
          ],
          correta: 1,
          explicacao: 'O papel continua necessário. O que desaparece é a credencial de longa duração, que é a origem de boa parte dos incidentes e das entregas travadas.',
        },
      ],
    },
  ],
};

export const operacao = {
  id: 'operacao',
  titulo: 'Operação',
  cor: '#4aa3e8',
  licoes: [
    // ------------------------------------------------------------------
    {
      id: 'observabilidade-e-custo',
      titulo: 'Observabilidade e custo',
      minutos: 13,
      resumo: 'Registros, métricas e rastros com Application Insights e KQL. E como ler, e conter, a fatura.',
      blocos: [
        {
          t: 'texto',
          md: `Um sistema em produção responde a duas perguntas o tempo todo: **está funcionando?** e **quanto está custando?** Sem instrumentação, as duas viram palpite.

### Os três sinais

| Sinal | Responde | Exemplo |
|---|---|---|
| **Registros** (*logs*) | o que aconteceu, em detalhe | "captura 9f3c recusada: nitidez 12,4" |
| **Métricas** | quanto, ao longo do tempo | requisições por segundo, latência no percentil 95, tamanho da fila |
| **Rastros** (*traces*) | por onde uma requisição passou, e onde demorou | app → API (40 ms) → banco (12 ms) → fila → inferência (310 ms) |

Na Azure, os três vão para o **Azure Monitor**. O **Application Insights** é a parte voltada a aplicações, e os dados moram num **espaço de trabalho do Log Analytics**, consultável com a linguagem **KQL**.

A forma de instrumentar hoje é o **OpenTelemetry**, um padrão aberto. O código não fica preso à Azure: troca-se o destino sem mexer na instrumentação.`,
        },
        {
          t: 'comparacao',
          esq: {
            titulo: 'API em .NET',
            lang: 'csharp',
            codigo: `// Program.cs
using Azure.Monitor.OpenTelemetry.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Requisições, dependências (HTTP, banco),
// exceções e métricas, automaticamente.
// O destino vem da variável de ambiente
// APPLICATIONINSIGHTS_CONNECTION_STRING.
builder.Services.AddOpenTelemetry()
       .UseAzureMonitor();

var app = builder.Build();

// Registro ESTRUTURADO: os valores viram campos
// pesquisáveis, e não texto solto.
app.Logger.LogInformation(
    "Captura {CapturaId} recusada: nitidez {Nitidez}",
    id, nitidez);`,
          },
          dir: {
            titulo: 'Serviço Python',
            lang: 'python',
            codigo: `# api.py
import logging
from azure.monitor.opentelemetry import configure_azure_monitor

# Uma chamada: FastAPI, requests, psycopg e
# logging passam a ser instrumentados.
configure_azure_monitor()

registro = logging.getLogger("inferencia")

# Campos estruturados, via "extra"
registro.info(
    "inferência concluída",
    extra={
        "captura_id": captura_id,
        "versao_modelo": VERSAO,
        "deteccoes": len(deteccoes),
        "ms": ms,
    },
)`,
          },
          nota: 'O **rastro** atravessa os serviços sozinho: o identificador viaja no cabeçalho `traceparent` de cada chamada HTTP. Para atravessar a fila, ele vai nas propriedades da mensagem. É o que permite abrir uma captura e ver o caminho inteiro.',
        },
        {
          t: 'texto',
          md: `### KQL: perguntar aos dados

A **Kusto Query Language** se lê de cima para baixo, com cada linha transformando o resultado da anterior. Para quem sabe SQL e pandas, é uma tarde.`,
        },
        {
          t: 'codigo',
          titulo: 'Consultas que você vai escrever na primeira semana (para ler)',
          lang: 'sql',
          codigo: `// As rotas mais lentas da API na última hora
requests
| where timestamp > ago(1h)
| summarize chamadas = count(), p50 = percentile(duration, 50), p95 = percentile(duration, 95), erros = countif(success == false)
          by name
| order by p95 desc

// Taxa de erro a cada 5 minutos: o gráfico que vai para o painel
requests
| where timestamp > ago(6h)
| summarize total = count(), falhas = countif(success == false) by bin(timestamp, 5m)
| extend taxa_de_erro = 100.0 * falhas / total
| render timechart

// As exceções mais frequentes de hoje, com um exemplo de cada
exceptions
| where timestamp > ago(1d)
| summarize vezes = count(), exemplo = any(outerMessage) by type, problemId
| top 10 by vezes

// Um campo estruturado do registro vira coluna: fotos recusadas por nitidez, por versão do app
traces
| where message startswith "Captura" and message has "recusada"
| extend nitidez = todouble(customDimensions.Nitidez), versao = tostring(customDimensions.VersaoDoApp)
| summarize recusadas = count(), nitidez_media = avg(nitidez) by versao

// Tudo o que aconteceu numa requisição, em todos os serviços
union requests, dependencies, traces, exceptions
| where operation_Id == "4bf92f3577b34da6a3ce929d0e0e4736"
| project timestamp, itemType, name, message, duration, success
| order by timestamp asc`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['SQL', 'KQL'],
          linhas: [
            ['`SELECT a, b FROM t`', '`t | project a, b`'],
            ['`WHERE`', '`| where`'],
            ['`GROUP BY x` com agregações', '`| summarize ... by x`'],
            ['`ORDER BY x DESC LIMIT 10`', '`| top 10 by x`'],
            ['coluna calculada', '`| extend nova = ...`'],
            ['`date_trunc(\'hour\', ts)`', '`bin(timestamp, 1h)`'],
            ['`now() - interval \'1 hour\'`', '`ago(1h)`'],
            ['`JOIN`', '`| join kind=inner (outra) on chave`'],
          ],
        },
        {
          t: 'texto',
          md: `### Alertas: o que merece acordar alguém

Um alerta bom é **acionável**: quem recebe sabe o que fazer. Alerta que dispara todo dia e ninguém olha é pior do que nenhum.

| Alertar por | Exemplo |
|---|---|
| **Sintoma que o usuário sente** | taxa de erro da API acima de 2% por 5 minutos; latência p95 acima de 2 s |
| **Fila parada** | mensagem mais antiga com mais de 15 minutos; fila de mensagens mortas com itens |
| **Saturação** | banco com mais de 85% de conexões ou de armazenamento |
| **Qualidade do modelo** (trilha de visão) | distribuição das contagens fora do esperado; taxa de fotos recusadas subindo |
| **Custo** | gasto do mês projetado acima do orçamento |

O que **não** vira alerta: uso de CPU isolado, cada exceção individual, qualquer coisa sem dono.

### Custo

Na nuvem, cada decisão de arquitetura é também uma decisão de custo, e a fatura chega um mês depois.

| Onde o dinheiro vai | Como conter |
|---|---|
| Computação ligada sem uso | escalar a zero o que pode; desligar ambientes de desenvolvimento fora do horário |
| GPU | escala pela fila; instância mínima zero; **o item que mais surpreende** |
| Banco superdimensionado | começar pequeno, medir, aumentar |
| Registros demais | amostragem; reter 30 dias no detalhe e arquivar o resto. Ingestão de registros é, com frequência, a segunda maior linha da fatura |
| Tráfego de saída e entre regiões | manter os recursos na mesma região |
| Recursos esquecidos | etiquetas e revisão mensal; ambientes temporários criados e apagados por pipeline |

As ferramentas: o **Gerenciamento de Custos** no portal (análise por etiqueta, por grupo de recursos), **orçamentos** com alerta, a **Calculadora de Preços** antes de criar, e o **Azure Advisor**, que aponta recursos ociosos.

A prática que mais funciona é simples: **etiquetar tudo** com sistema e ambiente, e olhar o custo por etiqueta **toda semana**, por cinco minutos.`,
        },
        {
          t: 'nota',
          estilo: 'entrevista',
          md: `**"Como você saberia que o sistema está com problema antes de o cliente ligar?"** A resposta tem camadas: sondas de saúde e alertas sobre os sintomas (erro, latência, fila); rastros para achar onde está a causa; registros estruturados para o detalhe; e, num sistema com modelo, o monitoramento dos dados de entrada e da distribuição das saídas. Fecha com o que acontece depois do alerta: quem é avisado, onde está o procedimento, e a revisão sem culpa depois do incidente.`,
        },
        {
          t: 'texto',
          md: `### Fontes

- [Application Insights com OpenTelemetry](https://learn.microsoft.com/azure/azure-monitor/app/opentelemetry-enable)
- [KQL: referência rápida](https://learn.microsoft.com/kusto/query/kql-quick-reference)
- [De SQL para KQL](https://learn.microsoft.com/kusto/query/sql-cheat-sheet)
- [Gerenciamento de custos](https://learn.microsoft.com/azure/cost-management-billing/costs/overview-cost-management)

Conferido em novembro de 2026.`,
        },
        {
          t: 'quiz',
          pergunta: 'O que um rastro distribuído mostra que registros isolados não mostram?',
          opcoes: [
            'O conteúdo das mensagens de erro.',
            'O caminho de UMA requisição por todos os serviços, com o tempo gasto em cada trecho, ligado por um identificador comum.',
            'O custo de cada requisição.',
            'A versão do sistema operacional.',
          ],
          correta: 1,
          explicacao: 'Com vários serviços, "está lento" não diz onde. O rastro mostra que 310 dos 400 ms foram na inferência, sem ninguém cruzar registros na mão.',
        },
        {
          t: 'quiz',
          pergunta: 'Qual destes é um bom alerta?',
          opcoes: [
            'CPU acima de 70% em qualquer instância.',
            'A mensagem mais antiga da fila de inferência tem mais de 15 minutos.',
            'Qualquer exceção registrada.',
            'Uma implantação foi concluída.',
          ],
          correta: 1,
          explicacao: 'É um sintoma que afeta o usuário (as contagens não estão saindo) e é acionável (o consumidor parou ou não dá conta). CPU alta pode ser só o sistema trabalhando.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'projeto',
      titulo: 'Projeto: o sistema, do commit à produção',
      minutos: 25,
      resumo: 'Desenhar a infraestrutura e o pipeline do sistema de armadilhas, com uma lista de conferência de produção.',
      blocos: [
        {
          t: 'texto',
          md: `O projeto desta trilha é de **desenho**, e é o tipo de exercício que aparece em entrevista e no primeiro mês de trabalho: receber um sistema e dizer como ele vai para a nuvem.

O sistema é o de todas as trilhas. Volte ao diagrama da primeira lição se precisar.

### O exercício

Em papel, ou num arquivo de texto, responda antes de ler a resolução:

1. **Grupos de recursos e ambientes**: quantos, com que nomes, em que assinaturas?
2. **Identidades**: quais existem, e que papel cada uma tem, em qual escopo?
3. **O caminho de uma foto**: do toque no botão do app até a contagem aparecer no painel. Quais serviços, em que ordem, e o que acontece se cada um falhar?
4. **O pipeline**: quais estágios, o que cada um faz, o que dispara, quem aprova?
5. **O que monitorar**: cinco alertas.`,
        },
        {
          t: 'texto',
          md: `### Uma resolução

**1. Ambientes.** Três, em **duas assinaturas**: uma de não produção (\`rg-armadilhas-dev\`, \`rg-armadilhas-hml\`) e uma de produção (\`rg-armadilhas-prod\`). O registro de contêineres fica num grupo compartilhado (\`rg-armadilhas-comum\`), porque a mesma imagem é promovida entre ambientes. Tudo em Brazil South.

**2. Identidades.**

| Identidade | Papel | Escopo |
|---|---|---|
| \`id-api\` (gerenciada) | Storage Blob Data Contributor | o contêiner \`fotos\` |
| | Azure Service Bus Data Sender | a fila \`inferencia\` |
| | Key Vault Secrets User | o cofre |
| | usuário do banco, pelo Entra ID | leitura e escrita nas tabelas |
| \`id-inferencia\` (gerenciada) | Storage Blob Data Reader | os contêineres \`fotos\` e \`modelos\` |
| | Azure Service Bus Data Receiver | a fila \`inferencia\` |
| | usuário do banco | escrita só em \`deteccoes\`, atualização em \`capturas\` |
| as duas | AcrPull | o registro de contêineres |
| Conexão de serviço de homologação | Contributor | \`rg-armadilhas-hml\` |
| Conexão de serviço de produção | Contributor | \`rg-armadilhas-prod\`, com aprovação |
| Equipe de desenvolvimento | Contributor em dev; Reader em produção | os grupos de recursos |

Nenhum segredo entre serviços. O serviço de inferência **não consegue** apagar fotos nem ler segredos: se for comprometido, o estrago é limitado.`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['3. O caminho de uma foto', 'Serviço', 'Se falhar'],
          linhas: [
            ['O técnico fotografa; o app checa a qualidade e grava no aparelho', 'app', 'nada se perde: está no SQLite do aparelho'],
            ['Com sinal, o app registra a captura: `PUT /capturas/{id}`', 'API (Container Apps)', 'o app tenta de novo; o `PUT` com o identificador é idempotente'],
            ['A API devolve uma URL assinada, válida por 15 minutos', 'API + Blob Storage', 'o app pede outra'],
            ['O app envia a foto direto ao armazenamento', 'Blob Storage', 'o app retoma o envio; a captura fica "sem foto"'],
            ['O evento "blob criado" vira uma mensagem na fila', 'Event Grid → Service Bus', 'o Event Grid reentrega; um job de varredura acha capturas sem mensagem'],
            ['O serviço de inferência acorda, baixa a foto, roda o detector', 'Container Apps com GPU', 'a mensagem volta para a fila; depois de N tentativas, vai para a fila de mensagens mortas'],
            ['Grava as detecções e marca a captura como processada, numa transação', 'PostgreSQL', 'a transação desfaz; a mensagem é reprocessada, e `ON CONFLICT` evita duplicar'],
            ['O painel mostra a contagem', 'Static Web Apps → API', 'o painel mostra a captura como "em processamento"'],
          ],
        },
        {
          t: 'codigo',
          titulo: '4. O pipeline (para ler; cole no simulador da lição anterior)',
          lang: 'yaml',
          codigo: `trigger:
  branches:
    include: [main]
  paths:
    include: [api/*, infra/*]

pr:
  branches:
    include: [main]

variables:
  imagem: crarmadilhas.azurecr.io/api:$(Build.BuildNumber)

stages:
- stage: Build
  jobs:
  - job: Testar
    pool: { vmImage: ubuntu-latest }
    steps:
    - script: dotnet test api/Api.sln --logger trx
      displayName: Testes
    - script: az bicep build --file infra/main.bicep
      displayName: Validar a infraestrutura
  - job: Imagem
    dependsOn: Testar
    condition: and(succeeded(), ne(variables['Build.Reason'], 'PullRequest'))
    pool: { vmImage: ubuntu-latest }
    steps:
    - script: az acr build --registry crarmadilhas --image api:$(Build.BuildNumber) api/
      displayName: Construir e enviar a imagem

- stage: Homologacao
  condition: and(succeeded(), ne(variables['Build.Reason'], 'PullRequest'))
  jobs:
  - deployment: Implantar
    environment: homologacao
    strategy:
      runOnce:
        deploy:
          steps:
          - script: az deployment group what-if -g rg-armadilhas-hml -f infra/main.bicep -p ambiente=hml imagemDaApi=$(imagem)
            displayName: O que vai mudar
          - script: az containerapp job start -n caj-migracoes -g rg-armadilhas-hml
            displayName: Migrar o banco
          - script: az deployment group create -g rg-armadilhas-hml -f infra/main.bicep -p ambiente=hml imagemDaApi=$(imagem)
            displayName: Implantar
          - script: curl --fail --retry 5 https://api-hml.exemplo.com/saude
            displayName: Teste de fumaça

- stage: Producao
  condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
  jobs:
  - deployment: Implantar
    environment: producao
    strategy:
      runOnce:
        deploy:
          steps:
          - script: az containerapp job start -n caj-migracoes -g rg-armadilhas-prod
            displayName: Migrar o banco
          - script: az deployment group create -g rg-armadilhas-prod -f infra/main.bicep -p ambiente=prod imagemDaApi=$(imagem)
            displayName: Implantar (nova revisão, 10% do tráfego)
          - script: ./infra/conferir-revisao.sh
            displayName: Conferir erros e latência da revisão nova
          - script: ./infra/promover-revisao.sh
            displayName: Promover para 100%
          - script: ./infra/voltar-revisao.sh
            displayName: Voltar para a revisão anterior
            condition: failed()`,
        },
        {
          t: 'texto',
          md: `Cole esse YAML no simulador e confira: o que roda num pull request? E se a conferência da revisão nova falhar em produção?

O que esse pipeline tem de bom: a **mesma imagem** vai de homologação a produção; a **migração do banco** roda antes da aplicação, num job próprio; o \`what-if\` mostra a mudança de infraestrutura; produção começa com **10% do tráfego**; e a **volta atrás é automática** quando a conferência falha.

**5. Alertas.** Taxa de erro da API acima de 2% por 5 minutos. Latência p95 acima de 2 segundos. Mensagem mais antiga da fila com mais de 15 minutos. Fila de mensagens mortas com qualquer item. Custo projetado do mês acima do orçamento. E, do lado do modelo: fração de fotos recusadas pelo portão de qualidade fora da faixa histórica.`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Lista de conferência de produção', ''],
          linhas: [
            ['Infraestrutura', 'toda em Bicep, aplicada só por pipeline; `what-if` no pull request'],
            ['Identidade', 'identidade gerenciada entre serviços; nenhum segredo em código, variável ou imagem'],
            ['Acesso', 'menor privilégio; produção em assinatura separada; administrador sob demanda'],
            ['Rede', 'banco e armazenamento sem acesso público; só HTTPS; WAF na entrada pública'],
            ['Dados', 'backup com recuperação pontual ligado e **restauração testada**; fotos originais preservadas'],
            ['Disponibilidade', 'no mínimo 2 réplicas da API, em zonas diferentes; banco com alta disponibilidade'],
            ['Entrega', 'revisão obrigatória; testes no pull request; mesma imagem promovida; aprovação para produção; volta atrás ensaiada'],
            ['Observabilidade', 'OpenTelemetry em todos os serviços; painel; alertas acionáveis, com dono'],
            ['Custo', 'etiquetas em tudo; orçamento com alerta; GPU escalando a zero'],
            ['Modelo', 'versão do modelo em cada detecção; teste de paridade no pipeline; monitoramento dos dados de entrada'],
          ],
        },
        {
          t: 'texto',
          md: `### Para praticar de verdade

A Azure tem uma **conta gratuita** com crédito inicial e alguns serviços sem custo por 12 meses. Um roteiro que cabe nela:

1. \`az login\`, criar um grupo de recursos, e apagar no fim do dia.
2. Publicar o painel da trilha de React no Static Web Apps (plano gratuito).
3. Pôr a API de treino do laboratório num contêiner e publicá-la no Container Apps, escalando a zero.
4. Escrever o Bicep dos dois, apagar tudo, e recriar com um comando.
5. Criar uma organização gratuita no Azure DevOps e fazer o pipeline que implanta a cada push.

Configure um **orçamento com alerta** antes de qualquer coisa, e apague o grupo de recursos ao terminar.

### Certificações, se fizerem sentido

- **AZ-900** (fundamentos): o vocabulário desta trilha. Um fim de semana de estudo.
- **AZ-204** (desenvolvedor): a mais alinhada ao trabalho de backend na Azure.
- **AZ-400** (DevOps): pipelines, infraestrutura como código, monitoramento.

Certificação não substitui ter publicado um sistema. Mas o roteiro de estudo delas é um bom mapa do que existe.

### O que você já sabe fazer

- Ler a organização de uma conta Azure e os papéis de quem acessa.
- Escolher onde rodar cada peça, e justificar.
- Desenhar o fluxo de dados com armazenamento, fila e banco, pensando no que falha.
- Ler e escrever Bicep, e prever uma mudança com \`what-if\`.
- Ler e escrever um pipeline, com estágios, condições, ambientes e aprovações.
- Instrumentar, consultar com KQL e definir alertas que alguém consegue atender.

A última parte do laboratório, o **projeto integrador**, junta todas as trilhas num sistema só.`,
        },
        {
          t: 'quiz',
          pergunta: 'No desenho do projeto, por que o serviço de inferência tem só leitura sobre as fotos?',
          opcoes: [
            'Porque gravar é mais caro.',
            'Menor privilégio: ele só precisa ler. Se for comprometido ou tiver um defeito, não consegue apagar nem alterar as fotos originais.',
            'Porque o Blob Storage não permite gravação por contêineres.',
            'Para o serviço ficar mais rápido.',
          ],
          correta: 1,
          explicacao: 'Cada identidade recebe o mínimo para o seu trabalho. É o que limita o alcance de uma falha, seja ataque ou erro de programação.',
        },
        {
          t: 'quiz',
          pergunta: 'Por que a migração do banco roda num job separado, antes de implantar a aplicação?',
          opcoes: [
            'Porque é mais rápido.',
            'Porque várias réplicas subindo ao mesmo tempo e tentando migrar criariam uma corrida; e porque a migração precisa terminar, com sucesso, antes de qualquer instância da versão nova atender.',
            'Porque o Container Apps não acessa bancos.',
            'Porque migrações não podem estar no repositório.',
          ],
          correta: 1,
          explicacao: 'Migrar na subida da aplicação funciona com uma instância e falha de formas estranhas com dez. Um job único, antes, com a migração compatível com a versão anterior, é o padrão seguro.',
        },
      ],
    },
  ],
};
