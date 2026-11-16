/**
 * "Projeto integrador" — todas as trilhas num sistema só.
 *
 * Não é uma trilha de conteúdo novo: é um roteiro, em etapas, com critérios de
 * aceitação. Cada etapa aponta para a trilha que a ensinou. O esquema do banco
 * mora em `projeto-integrador/banco/001_esquema.sql`, e a lição o lê de lá:
 * o que roda aqui é o mesmo arquivo que o `docker compose` aplica.
 */

import fs from 'node:fs';

const ESQUEMA = fs.readFileSync(new URL('../../projeto-integrador/banco/001_esquema.sql', import.meta.url), 'utf8');

const roteiro = {
  id: 'roteiro',
  titulo: 'O sistema de armadilhas',
  cor: '#e88a5a',
  licoes: [
    // ------------------------------------------------------------------
    {
      id: 'sistema',
      titulo: 'O sistema e o contrato',
      minutos: 15,
      resumo: 'O que vai ser construído, como as peças conversam, e as decisões que valem para o projeto inteiro.',
      blocos: [
        {
          t: 'texto',
          md: `Cada trilha deste laboratório terminou num pedaço do mesmo sistema. O projeto integrador junta os pedaços:

> Um técnico fotografa uma armadilha adesiva no talhão, **sem sinal**. Quando a rede volta, a foto sobe. Um detector conta os insetos. O agrônomo vê, num painel, onde a infestação está subindo.

\`\`\`
 App (React Native)                       Painel (React)
   │  fila local, envio idempotente          │
   ▼                                         ▼
 ┌──────────────── API (ASP.NET Core) ────────────────┐
 │  valida · autoriza · registra · entrega URL de envio │
 └───────┬───────────────────────────┬─────────────────┘
         │                           │
         ▼                           ▼
   PostgreSQL                 Armazenamento de fotos
         ▲                           │  "foto nova"
         │ detecções                 ▼
   Serviço de inferência (Python) ◄── fila
\`\`\`

| Peça | Trilha | O que você já construiu lá |
|---|---|---|
| App de campo | React Native | o registro de capturas com fila de sincronização |
| Painel | React | o painel de detecções contra a API de treino |
| API | C# e .NET | a API de capturas, com idempotência e rota interna protegida |
| Banco | PostgreSQL | as consultas do relatório de infestação |
| Serviço de inferência | Python para IA | o serviço com portão de qualidade, testado |
| Detector | Visão computacional | o YOLO treinado no laboratório de treino |
| Nuvem e entrega | Azure e Azure DevOps | o desenho da infraestrutura e o pipeline |

Este projeto é **seu**, fora do laboratório: um repositório novo, que vira peça de portfólio. O roteiro tem seis etapas, e cada uma termina em **critérios de aceitação** que dá para conferir.`,
        },
        {
          t: 'texto',
          md: `### O contrato da API

Antes de escrever código, o contrato. É ele que permite ao app, ao painel e ao serviço de inferência serem construídos em paralelo, cada um contra uma versão simulada dos outros.`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Método e rota', 'Quem chama', 'Faz', 'Respostas'],
          linhas: [
            ['`PUT /capturas/{id}`', 'app', 'registra a captura; o `id` é um UUID gerado no aparelho', '201 criada · 200 já existia, idêntica · 409 já existia, diferente · 422 inválida'],
            ['`POST /capturas/{id}/url-de-envio`', 'app', 'devolve uma URL assinada, de 15 minutos, para enviar a foto', '200 · 404 · 409 a foto já foi enviada'],
            ['`GET /capturas/{id}`', 'app, painel', 'a captura, com a situação e, se houver, as detecções', '200 · 404'],
            ['`GET /capturas?usina=&desde=&situacao=&pagina=`', 'painel', 'lista paginada', '200'],
            ['`GET /usinas/{id}/infestacao?semanas=12`', 'painel', 'insetos por semana, com variação', '200 · 404'],
            ['`GET /alertas`', 'painel', 'armadilhas cuja última captura passou do nível de controle', '200'],
            ['`POST /interno/capturas/{id}/deteccoes`', 'serviço de inferência', 'grava o resultado e marca como processada, numa transação', '204 · 404 · 409 já processada por esta versão do modelo'],
            ['`GET /saude`', 'a plataforma', 'pronto para atender?', '200 · 503'],
          ],
        },
        {
          t: 'texto',
          md: `Três decisões estão embutidas nessa tabela, e vieram das trilhas:

- **\`PUT\` com identificador do cliente**, e não \`POST\`. O app reenvia quando a resposta se perde, e reenviar não pode duplicar. O 200 e o 409 distinguem "é a mesma captura de novo" de "há outra captura com esse identificador".
- **A foto não passa pela API.** Ela autoriza o envio direto ao armazenamento.
- **A rota do serviço de inferência é separada** (\`/interno\`), com outra autenticação. O app nunca grava detecções.

### Os estados de uma captura

\`\`\`
                 PUT /capturas/{id}
                        │
                        ▼
                 aguardando_foto ──── foto enviada ───▶ na_fila
                                                          │
                              ┌───────────────────────────┼───────────────────────┐
                              ▼                           ▼                       ▼
                         processada                   rejeitada                  erro
                    (detecções gravadas)      (portão de qualidade)     (falha do serviço:
                                                                         volta para a fila)
\`\`\`

Todo estado tem um responsável e uma saída. "Erro" não é um beco: é uma captura que alguém, ou um job, vai recolocar na fila.

### Decisões que valem para o projeto inteiro

| Decisão | Vem de |
|---|---|
| Horários em \`timestamptz\`; o app envia com deslocamento; duas datas (do aparelho e do servidor) | PostgreSQL · React Native |
| Toda detecção guarda a versão do modelo | Visão computacional |
| A qualidade do JPEG e a resolução enviadas pelo app são fixas e versionadas | Visão computacional (paridade) |
| Validação nas fronteiras: Zod no app e no painel, validação na API, Pydantic no serviço | React · Python para IA |
| Nenhum segredo em repositório; identidade gerenciada na nuvem | Azure |
| Toda mudança por pull request, com testes | Azure DevOps |
| Dados reais de cliente **não** entram no repositório | o repositório é público |`,
        },
        {
          t: 'codigo',
          titulo: 'Começar: repositório e banco local (para ler)',
          lang: 'bash',
          codigo: `# Um repositório para o sistema inteiro (monorrepo), com uma pasta por peça
mkdir armadilhas && cd armadilhas && git init
mkdir api inferencia painel app infra banco

# O banco: copie a pasta projeto-integrador/ deste laboratório
cp -r ../estudos/projeto-integrador/* .
docker compose up -d                 # PostgreSQL 18 com pgvector, já com o esquema
docker compose exec banco psql -U armadilhas -c "\\dt"

# Cada peça nasce com a ferramenta da sua trilha:
#   painel/      npm create vite@latest . -- --template react-ts
#   app/         npx create-expo-app@latest .
#   inferencia/  uv init
#   api/         dotnet new webapi`,
        },
        {
          t: 'nota',
          estilo: 'dica',
          md: `**Monorrepo ou um repositório por peça?** Para uma pessoa ou uma equipe pequena, **um repositório**: uma mudança de contrato altera a API, o painel e o app no mesmo pull request, e o pipeline dispara por pasta (o \`paths\` do gatilho). Vários repositórios compensam quando equipes diferentes têm ritmos de entrega diferentes.`,
        },
        {
          t: 'quiz',
          pergunta: 'Por que a rota de registro é `PUT /capturas/{id}`, com o identificador vindo do app?',
          opcoes: [
            'Porque `POST` não aceita JSON.',
            'Porque o app reenvia quando a resposta se perde: com o identificador gerado no aparelho, o servidor reconhece a repetição e não duplica a captura.',
            'Porque `PUT` é mais rápido.',
            'Porque o banco exige UUID.',
          ],
          correta: 1,
          explicacao: 'É a idempotência da trilha de React Native, vista do lado do servidor. Com `POST` e identificador gerado no banco, uma resposta perdida geraria uma segunda captura.',
        },
        {
          t: 'quiz',
          pergunta: 'Qual é a vantagem de fechar o contrato da API antes de escrever as peças?',
          opcoes: [
            'Nenhuma: o contrato sai do código.',
            'App, painel e serviço de inferência podem ser construídos em paralelo, contra versões simuladas uns dos outros, e as discordâncias aparecem no papel, onde custam pouco.',
            'O contrato dispensa testes.',
            'A API fica mais rápida.',
          ],
          correta: 1,
          explicacao: 'Descobrir, na integração, que o app manda a data num formato e a API espera outro custa dias. O contrato escrito antecipa essa conversa.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'banco-e-inferencia',
      titulo: 'Etapas 1 e 2: o banco e o serviço de inferência',
      minutos: 30,
      resumo: 'O esquema, rodando aqui mesmo, com as três operações que o sistema inteiro depende. E o serviço que consome a fila.',
      blocos: [
        {
          t: 'texto',
          md: `### Etapa 1: o banco

O esquema está em \`projeto-integrador/banco/001_esquema.sql\`. O bloco abaixo o aplica no PostgreSQL do laboratório e exercita as **três operações** de que o resto do sistema depende. É o mesmo arquivo que o \`docker compose\` roda no banco de verdade.

Leia o esquema antes de rodar: os comentários dizem por que ele difere do banco de estudo.`,
        },
        {
          t: 'codigo',
          titulo: 'O esquema do projeto, e as três operações centrais',
          rodar: 'sql',
          codigo: `-- O laboratório já tem tabelas com estes nomes: o projeto usa um esquema à parte.
CREATE SCHEMA projeto;
SET search_path = projeto, public;

${ESQUEMA}
INSERT INTO usinas (nome, uf) VALUES ('Boa Vista', 'MS');
INSERT INTO armadilhas (usina_id, codigo, talhao) VALUES (1, 'A-01', 'T-14');

-- ============ 1. Registrar a captura, de forma idempotente (PUT /capturas/{id}) ============
-- O app enviou. A resposta se perdeu. O app enviou de novo. Deve existir UMA captura.
INSERT INTO capturas (id, armadilha_id, capturada_em, versao_do_app)
VALUES ('7c9e6679-7425-40de-944b-e07fc1f90ae7', 1, '2026-11-16T07:42:00-04:00', '1.5.0')
ON CONFLICT (id) DO NOTHING
RETURNING id, situacao;                      -- 1 linha: criada (a API responde 201)

INSERT INTO capturas (id, armadilha_id, capturada_em, versao_do_app)
VALUES ('7c9e6679-7425-40de-944b-e07fc1f90ae7', 1, '2026-11-16T07:42:00-04:00', '1.5.0')
ON CONFLICT (id) DO NOTHING
RETURNING id, situacao;                      -- 0 linhas: já existia (a API responde 200)

-- ============ 2. A foto chegou: a captura entra na fila ============
UPDATE capturas
SET foto = '2026/11/7c9e6679-7425-40de-944b-e07fc1f90ae7.jpg', situacao = 'na_fila'
WHERE id = '7c9e6679-7425-40de-944b-e07fc1f90ae7' AND situacao = 'aguardando_foto'
RETURNING situacao;

-- ============ 3. O serviço de inferência grava o resultado, numa transação ============
BEGIN;
  -- A trava impede dois consumidores de processarem a mesma captura; quem chegar depois, pula.
  SELECT id FROM capturas
  WHERE id = '7c9e6679-7425-40de-944b-e07fc1f90ae7' AND situacao = 'na_fila'
  FOR UPDATE SKIP LOCKED;

  INSERT INTO deteccoes (captura_id, versao_modelo, classe, confianca, x1, y1, x2, y2) VALUES
    ('7c9e6679-7425-40de-944b-e07fc1f90ae7', 'armadilhas-2026-11-10', 'mariposa',   0.91, 412, 230, 460, 271),
    ('7c9e6679-7425-40de-944b-e07fc1f90ae7', 'armadilhas-2026-11-10', 'cigarrinha', 0.78, 130,  88, 155, 109);

  UPDATE capturas
  SET situacao = 'processada', qualidade = qualidade || '{"nitidez": 56.1, "fracao_estourada": 0.0001}'
  WHERE id = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
COMMIT;

-- O que o painel vê
SELECT c.situacao, a.codigo AS armadilha, c.capturada_em, c.recebida_em IS NOT NULL AS chegou,
       count(d.id) AS insetos, max(d.versao_modelo) AS modelo
FROM capturas c
JOIN armadilhas a ON a.id = c.armadilha_id
LEFT JOIN deteccoes d ON d.captura_id = c.id
GROUP BY c.id, a.codigo;

-- E o banco recusando um estado impossível: "processada" sem foto
INSERT INTO capturas (id, armadilha_id, capturada_em, versao_do_app, situacao)
VALUES ('00000000-0000-4000-8000-000000000001', 1, now(), '1.5.0', 'processada');`,
          esperaFalha: true,
        },
        {
          t: 'texto',
          md: `O bloco termina com um erro **de propósito**: a última instrução tenta gravar uma captura processada sem foto, e a restrição \`CHECK\` recusa. É o banco impedindo um estado que o diagrama da lição anterior não tem.

Repare também no \`FOR UPDATE SKIP LOCKED\`: é o que permite rodar **vários** consumidores de inferência em paralelo, sem que dois peguem a mesma captura.`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Critérios de aceitação da etapa 1', ''],
          linhas: [
            ['O `docker compose up -d` sobe o banco com o esquema, sem passo manual', ''],
            ['Registrar a mesma captura duas vezes resulta em uma linha', 'a operação 1 do bloco'],
            ['Uma captura não vai para `na_fila` nem `processada` sem foto', 'a restrição `CHECK`'],
            ['As consultas de relatório da trilha de PostgreSQL funcionam neste esquema', 'adapte os quatro desafios do projeto de lá'],
            ['`EXPLAIN` da consulta "últimas capturas da armadilha" usa o índice', 'com dados suficientes: gere 100 mil capturas com `generate_series`'],
            ['Há um papel `app_api` (lê e grava) e um `inferencia` (grava só detecções e a situação)', 'a lição de operação'],
            ['A próxima mudança de esquema é um arquivo `002_...sql`, e não uma edição do `001`', 'migrações'],
          ],
        },
        {
          t: 'texto',
          md: `### Etapa 2: o serviço de inferência

Você já tem a base: o serviço do projeto da trilha de **Python para IA**, com portão de qualidade e testes. Faltam três coisas para ele entrar no sistema.

**1. O modelo de verdade.** Troque o detector de manchas pelo YOLO treinado no laboratório da trilha de visão, exportado para ONNX. O teste de paridade (imagens fixas, saída esperada) entra na suíte.

**2. Consumir a fila.** Em vez de só responder a HTTP, o serviço busca capturas \`na_fila\`, baixa a foto, roda o detector e chama \`POST /interno/capturas/{id}/deteccoes\`. Em desenvolvimento, a "fila" pode ser a própria tabela, com o \`FOR UPDATE SKIP LOCKED\` do bloco acima. Na nuvem, o Service Bus.

**3. Falhar direito.** Foto que não abre, foto reprovada no portão, modelo que estoura a memória: cada caso tem um destino (\`rejeitada\` com motivo, ou \`erro\` e nova tentativa), e nenhum trava a fila.`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Critérios de aceitação da etapa 2', ''],
          linhas: [
            ['`uv run pytest` passa, incluindo o teste de paridade com o modelo exportado', ''],
            ['Uma foto boa de armadilha sintética produz a contagem do gabarito, com tolerância declarada', 'use `lab.amostra_com_gabarito`'],
            ['Foto borrada ou estourada vira `rejeitada`, com o motivo e as medidas de qualidade', ''],
            ['Processar a mesma captura duas vezes não duplica detecções', 'idempotência'],
            ['Dois consumidores rodando juntos não processam a mesma captura', '`SKIP LOCKED`, ou a fila'],
            ['Um arquivo corrompido vira `erro` depois de N tentativas, e as capturas seguintes continuam sendo processadas', ''],
            ['Toda detecção gravada tem a versão do modelo', ''],
            ['O serviço registra, por captura: tempo de inferência, número de detecções, versão do modelo', 'observabilidade'],
            ['`GET /saude` só responde 200 depois de o modelo carregar', ''],
          ],
        },
        {
          t: 'nota',
          estilo: 'campo',
          md: `**Meça o sistema, e não só o modelo.** Com a etapa 2 pronta, rode o serviço contra 200 armadilhas sintéticas com gabarito e calcule o **erro de contagem por armadilha**, que é a métrica de negócio da trilha de visão. Guarde esse número: ele é a linha de base contra a qual toda mudança futura (modelo novo, compressão diferente, outro pré-processamento) vai ser comparada.`,
        },
        {
          t: 'quiz',
          pergunta: 'Para que serve o `FOR UPDATE SKIP LOCKED` ao buscar a próxima captura da fila?',
          opcoes: [
            'Para deixar a consulta mais rápida.',
            'Para que vários consumidores trabalhem em paralelo sem pegar a mesma linha: quem encontra uma linha travada por outro simplesmente passa para a seguinte.',
            'Para ignorar erros.',
            'Para travar a tabela inteira.',
          ],
          correta: 1,
          explicacao: 'É o padrão de "tabela como fila" no PostgreSQL. Sem o `SKIP LOCKED`, o segundo consumidor ficaria esperando o primeiro terminar.',
        },
        {
          t: 'quiz',
          pergunta: 'Por que uma foto reprovada no portão de qualidade vira `rejeitada`, e não `erro`?',
          opcoes: [
            'É a mesma coisa.',
            'Porque são situações diferentes: `rejeitada` é um resultado final e correto (a foto não serve, tentar de novo não muda nada); `erro` é uma falha do serviço, que merece nova tentativa.',
            'Porque `erro` apaga a captura.',
            'Porque o painel só mostra rejeitadas.',
          ],
          correta: 1,
          explicacao: 'Misturar os dois faz o sistema reprocessar para sempre o que nunca vai passar, ou desistir do que passaria na segunda tentativa.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'api-painel-e-app',
      titulo: 'Etapas 3, 4 e 5: a API, o painel e o app',
      minutos: 30,
      resumo: 'As três peças que as pessoas tocam, com o que cada uma precisa provar antes de ser dada como pronta.',
      blocos: [
        {
          t: 'texto',
          md: `### Etapa 3: a API

A API é o centro: tudo passa por ela, e é ela que protege o banco. É a etapa da trilha de **C# e .NET**.`,
        },
        {
          t: 'nota',
          estilo: 'dica',
          md: `Parta do projeto da trilha de C#, [a API de capturas](#/t/csharp/projeto/api-de-capturas): ele já resolve, num arquivo só, o \`PUT\` idempotente, a rota interna protegida e a paginação. Aqui ele vira um projeto de verdade: PostgreSQL com Npgsql no lugar do SQLite, migrações, xUnit com Testcontainers e o restante das rotas do contrato. A lição [EF Core na prática](#/t/csharp/aspnet/ef-core-na-pratica) mostra a configuração com PostgreSQL.`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Critérios de aceitação da etapa 3', ''],
          linhas: [
            ['Todas as rotas do contrato existem, com os códigos de resposta da tabela', ''],
            ['`PUT /capturas/{id}` repetido responde 200, e não cria outra linha; com corpo diferente, 409', ''],
            ['Entrada inválida responde 422 com o campo e o motivo, no formato *problem details*', ''],
            ['Violação de unicidade ou de chave estrangeira no banco vira 409 ou 422, e nunca 500', 'trate os `SQLSTATE` 23505, 23503 e 23514'],
            ['Nenhuma consulta é montada por concatenação de texto', ''],
            ['A lista de capturas é paginada, e a tela de lista dispara um número fixo de consultas', 'sem N+1: confira no registro'],
            ['As rotas de `/interno` exigem outra credencial', ''],
            ['Há testes de integração contra um PostgreSQL real, em contêiner', 'Testcontainers'],
            ['A especificação OpenAPI é gerada pela API, e publicada', 'o painel e o app geram os tipos a partir dela'],
            ['`GET /saude` confere o banco', ''],
          ],
        },
        {
          t: 'texto',
          md: `### Etapa 4: o painel

Parta do painel da trilha de **React**. O que muda: sai a API de treino, entra a do projeto; sai o \`useEffect\` com \`fetch\`, entra o TanStack Query; e os tipos passam a ser **gerados** do OpenAPI.

| Tela | O que mostra | Vem de |
|---|---|---|
| Usinas | uma linha por usina: armadilhas ativas, capturas da semana, alertas | \`GET /alertas\`, agregados |
| Usina | o gráfico semanal de insetos, com a variação, e as armadilhas | \`GET /usinas/{id}/infestacao\` |
| Capturas | lista filtrável por situação e data, paginada | \`GET /capturas\` |
| Captura | a foto, com as caixas das detecções desenhadas por cima, a versão do modelo e as medidas de qualidade | \`GET /capturas/{id}\` |`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Critérios de aceitação da etapa 4', ''],
          linhas: [
            ['Projeto em Vite + TypeScript estrito; `npm run build` sem erros de tipo', ''],
            ['Os tipos da API são gerados do OpenAPI, e não escritos à mão', '`openapi-typescript`'],
            ['Filtros e página ficam na URL: copiar o endereço abre a mesma visão', ''],
            ['Toda tela trata carregando, erro e vazio', ''],
            ['A tela da captura desenha as caixas na escala certa em qualquer tamanho de janela', 'um `<canvas>` ou SVG sobre a imagem'],
            ['Uma captura `na_fila` atualiza sozinha quando fica pronta', 'revalidação com intervalo, enquanto pendente'],
            ['Há teste de componente para a lista (com a rede simulada) e um teste de ponta a ponta do fluxo principal', 'Testing Library, MSW, Playwright'],
            ['Navegável por teclado; contraste suficiente', ''],
          ],
        },
        {
          t: 'texto',
          md: `### Etapa 5: o app

Parta do projeto da trilha de **React Native**: o registro de capturas com fila. Substitua cada simulação pela peça real, **uma de cada vez**, mantendo o app funcionando a cada passo.

1. \`useState\` → tabela no \`expo-sqlite\` (as capturas sobrevivem ao fechamento do app).
2. Contador → \`crypto.randomUUID()\`.
3. Envio simulado → \`PUT /capturas/{id}\` e o envio da foto pela URL assinada.
4. Os dois campos → a tela da câmera, com moldura-guia.
5. A chave "sinal" → sincronização ao abrir, ao voltar a rede, e pelo botão.
6. Uma tela → Expo Router: usinas → armadilhas → captura.`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Critérios de aceitação da etapa 5', ''],
          linhas: [
            ['**O roteiro do modo avião**: registrar 10 capturas sem rede, fechar o app à força, abrir, as 10 estão lá; religar a rede no meio do envio de uma foto; no servidor, chegam 10, sem duplicata', 'o teste que vale por todos'],
            ['Cada captura mostra a situação: pendente, enviando, enviada, com erro', ''],
            ['A foto é comprimida e redimensionada com parâmetros fixos, e a versão do app vai em toda requisição', ''],
            ['O portão de qualidade recusa foto borrada **antes** de gravar, e explica o porquê', ''],
            ['Permissão de câmera negada leva a uma tela com atalho para as configurações', ''],
            ['O token fica no armazenamento seguro', '`expo-secure-store`'],
            ['Botões com área de toque de 48 pontos ou mais; legível sob sol', ''],
            ['O app roda num aparelho Android real, por build de desenvolvimento', ''],
          ],
        },
        {
          t: 'nota',
          estilo: 'dica',
          md: `**Fatias verticais, e não camadas.** A tentação é terminar o banco inteiro, depois a API inteira, depois o painel. O que funciona é atravessar o sistema com **uma** funcionalidade mínima primeiro: registrar uma captura sem foto pelo app, vê-la no painel. Feio, incompleto, e de ponta a ponta. Os problemas de integração aparecem na primeira semana, e não na última.`,
        },
        {
          t: 'quiz',
          pergunta: 'Por que gerar os tipos do painel a partir do OpenAPI da API, em vez de escrevê-los à mão?',
          opcoes: [
            'Para ter menos arquivos.',
            'Porque o contrato passa a ter uma fonte só: quando a API muda um campo, o painel deixa de compilar no lugar exato que precisa ser ajustado.',
            'Porque o TypeScript exige.',
            'Porque fica mais rápido em execução.',
          ],
          correta: 1,
          explicacao: 'Tipos escritos à mão dos dois lados divergem em silêncio. Gerados, a divergência vira erro de compilação, antes de chegar a um usuário.',
        },
        {
          t: 'quiz',
          pergunta: 'O que significa construir o sistema por fatias verticais?',
          opcoes: [
            'Terminar cada camada antes de começar a seguinte.',
            'Entregar primeiro uma funcionalidade mínima que atravessa todas as peças, e ir alargando: a integração é exercitada desde o começo.',
            'Dividir a equipe por tecnologia.',
            'Usar um repositório por peça.',
          ],
          correta: 1,
          explicacao: 'Camadas terminadas em separado se encontram no fim, quando o prazo acabou. A fatia fina revela cedo o que o contrato não previu.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'entrega-e-fechamento',
      titulo: 'Etapa 6: entrega, e o que fazer com tudo isso',
      minutos: 25,
      resumo: 'Levar o sistema à nuvem, a definição de pronto, e como transformar o projeto em vantagem no mercado.',
      blocos: [
        {
          t: 'texto',
          md: `### Etapa 6: entrega

O desenho está feito: é o projeto da trilha de **Azure**. Aqui ele é executado, na conta gratuita, com um orçamento configurado antes de qualquer recurso.

A ordem que dá menos dor:

1. **Contêineres locais primeiro.** \`docker compose\` com o banco, a API e o serviço de inferência conversando. Se não roda assim, não roda na nuvem.
2. **Pipeline de validação.** Em todo pull request: compilar, testar, validar o Bicep. Antes de qualquer implantação.
3. **Infraestrutura de homologação por Bicep**, aplicada pelo pipeline.
4. **Implantação contínua em homologação** a cada merge em \`main\`.
5. **Observabilidade**: OpenTelemetry nos dois serviços, um painel e três alertas.
6. **Produção**, com aprovação, quando homologação estiver estável por alguns dias.`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Critérios de aceitação da etapa 6', ''],
          linhas: [
            ['`docker compose up` sobe o sistema inteiro numa máquina limpa, a partir do README', ''],
            ['Nenhum segredo no repositório', 'confira o histórico: `git log -p | grep -i -E "password|secret|key="`'],
            ['Um pull request com teste falhando não pode ser concluído', 'política de ramo'],
            ['Um merge em `main` chega a homologação sem intervenção manual', ''],
            ['Apagar o grupo de recursos de homologação e rodar o pipeline recria tudo', 'a prova da infraestrutura como código'],
            ['A mesma imagem testada em homologação é a que vai para produção', ''],
            ['Dá para abrir uma captura e ver o rastro: API → fila → inferência → banco', ''],
            ['Há um alerta que dispara quando a fila para, e você viu ele disparar', 'pare o serviço de inferência de propósito'],
            ['Voltar à versão anterior leva menos de cinco minutos, e foi ensaiado', ''],
            ['O custo mensal estimado está escrito, com a maior linha identificada', ''],
          ],
        },
        {
          t: 'texto',
          md: `### Pronto, de verdade

O sistema está pronto quando este roteiro passa, de ponta a ponta, feito por outra pessoa a partir do README:

1. Subir o sistema.
2. No app, em modo avião, registrar três capturas com foto de armadilha sintética.
3. Ligar a rede. As três sobem.
4. No painel, as três aparecem como processadas, com as caixas desenhadas e a contagem batendo com o gabarito, dentro da tolerância.
5. Enviar uma foto borrada: aparece como rejeitada, com o motivo.
6. Derrubar o serviço de inferência, enviar uma foto, religar: ela é processada, sem intervenção.

Seis passos. Cada um deles exercita uma trilha inteira.`,
        },
        {
          t: 'texto',
          md: `### O que fazer com este projeto

**No currículo e no perfil.** Você já tem o diferencial: anos de visão computacional aplicada, com artigos, em problema real. O que este projeto acrescenta é a prova de que você leva o modelo **até o usuário**: o app que captura, a API, o banco, a entrega. É a combinação rara. A frase que resume: *"construo sistemas de visão computacional de ponta a ponta: da captura padronizada no celular ao modelo em produção, com avaliação e monitoramento"*.

**No repositório.** Um README que abre com o problema e uma imagem do sistema funcionando. Depois: a arquitetura num diagrama, como rodar em três comandos, as decisões e os **porquês** (são eles que um avaliador lê), e os números: erro de contagem por armadilha, latência, custo estimado. Um repositório assim vale mais que dez de tutorial.

**Na entrevista.** Cada lição com a marca 🎯 deste laboratório tem uma pergunta e o esqueleto de uma resposta. O projeto dá o que nenhum esqueleto dá: histórias verdadeiras. "O que deu errado?" é a pergunta em que quem construiu de verdade se destaca.

### O que estudar depois, por ordem de retorno

| Assunto | Por quê |
|---|---|
| **Testes em profundidade** | testes de contrato entre serviços, de carga, e de propriedades. É o que dá coragem de mudar |
| **Segurança de aplicação** | o OWASP Top 10, aplicado ao que você construiu: quem pode ver a foto de quem? |
| **Mensageria e consistência** | o padrão *outbox*, sagas, o que "exatamente uma vez" significa de fato |
| **Modelagem de domínio** | quando o sistema cresce, a dificuldade passa a ser o negócio, e não a tecnologia |
| **Avaliação contínua de modelos** | fechar o ciclo da trilha de visão: dados de produção alimentando anotação e retreino |
| **Liderança técnica** | escrever um documento de decisão, revisar código bem, estimar. O que separa pleno de sênior |

### E o laboratório

Ele continua sendo seu. Cada trilha tem uma página de **Revisão**, que sorteia perguntas das lições concluídas: dez minutos por dia rendem mais que uma tarde por mês. O **Playground** roda qualquer coisa, em cinco linguagens. E o conteúdo é só dado: uma lição nova é um objeto num arquivo de \`conteudo/\`. Quando aprender algo que valha registrar, escreva a lição. Ensinar é o melhor jeito de conferir se aprendeu.`,
        },
        {
          t: 'quiz',
          pergunta: 'Qual é a melhor prova de que a infraestrutura está de fato descrita em código?',
          opcoes: [
            'O arquivo Bicep existir no repositório.',
            'Apagar o ambiente de homologação e recriá-lo inteiro só rodando o pipeline, sem nenhum passo manual.',
            'O portal não mostrar erros.',
            'O `what-if` não apontar mudanças.',
          ],
          correta: 1,
          explicacao: 'Só a recriação do zero revela o que foi feito à mão e nunca chegou ao código: uma permissão, uma regra de rede, uma configuração.',
        },
        {
          t: 'quiz',
          pergunta: 'No README de um projeto de portfólio, o que um avaliador técnico mais valoriza?',
          opcoes: [
            'A lista de tecnologias usadas.',
            'As decisões e os porquês, com os números que as sustentam: o que foi escolhido, o que foi descartado, o que foi medido.',
            'O número de commits.',
            'Os selos no topo.',
          ],
          correta: 1,
          explicacao: 'Tecnologia qualquer um lista. Explicar uma escolha, com a alternativa descartada e a medição que decidiu, mostra o raciocínio de quem vai trabalhar ao lado.',
        },
      ],
    },
  ],
};

export const trilha = {
  id: 'integrador',
  ordem: 90,
  titulo: 'Projeto integrador',
  subtitulo: 'Todas as trilhas num sistema: do app que fotografa a armadilha ao painel, com critérios de aceitação por etapa',
  icone: '🧩',
  cor: '#e88a5a',
  ponte: 'depois das outras trilhas',
  modulos: [roteiro],
};
