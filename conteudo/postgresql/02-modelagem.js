export const modelagem = {
  id: 'modelagem',
  titulo: 'Modelagem e escrita',
  cor: '#e08fb0',
  licoes: [
    // ------------------------------------------------------------------
    {
      id: 'tipos-e-restricoes',
      titulo: 'Tipos e restrições',
      minutos: 14,
      resumo: 'Escolher o tipo certo, deixar o banco recusar dado inválido, e a armadilha do horário sem fuso.',
      blocos: [
        {
          t: 'texto',
          md: `O esquema é a primeira linha de defesa dos dados. Tudo o que o banco recusa sozinho é uma classe de bug que nenhuma versão futura do aplicativo, nenhum script de carga e nenhuma correção manual consegue introduzir.

### Os tipos que se usam de verdade

| Para | Use | Evite |
|---|---|---|
| Texto | \`text\` | \`varchar(n)\` por hábito: no Postgres não é mais rápido nem menor. Limite com \`CHECK\` se a regra existir |
| Inteiro | \`integer\`; \`bigint\` para ids de tabelas que crescem | \`smallint\` para economizar: raramente compensa |
| Dinheiro e medidas exatas | \`numeric(p, s)\` | \`real\` e \`double precision\`: \`0.1 + 0.2\` não é \`0.3\`; e o tipo \`money\` |
| Medidas aproximadas (confiança de modelo, coordenadas) | \`real\`, \`double precision\` | |
| Verdadeiro ou falso | \`boolean\` | \`char(1)\` com 'S' e 'N' |
| Instante | **\`timestamptz\`** | \`timestamp\` (sem fuso) |
| Data de calendário (aniversário, vencimento) | \`date\` | |
| Duração | \`interval\` | guardar segundos num inteiro |
| Identificador gerado fora do banco | \`uuid\` | texto de 36 caracteres |
| Conjunto pequeno e estável de valores | \`CHECK (col IN (...))\`, ou \`ENUM\` | texto livre |
| Dado semiestruturado | \`jsonb\` | \`json\`; e texto com JSON dentro |
| Lista de valores simples | array (\`text[]\`) | texto separado por vírgula |`,
        },
        {
          t: 'codigo',
          titulo: 'numeric contra ponto flutuante',
          rodar: 'sql',
          codigo: `SELECT 0.1::double precision + 0.2::double precision          AS em_double,
       0.1::double precision + 0.2::double precision = 0.3   AS double_igual_a_03,
       0.1::numeric + 0.2::numeric                           AS em_numeric,
       0.1::numeric + 0.2::numeric = 0.3                     AS numeric_igual_a_03;

-- A área total dos talhões é numeric(7,2): a soma é exata
SELECT sum(area_ha) AS area_total, pg_typeof(sum(area_ha)) AS tipo FROM talhoes;`,
        },
        {
          t: 'texto',
          md: `### timestamptz: guarde o instante, mostre no fuso de quem lê

É a escolha de tipo com mais consequência, e a mais mal compreendida.

- **\`timestamptz\`** guarda um **instante** absoluto (internamente, em UTC). **Não guarda o fuso.** Na entrada, converte do fuso informado; na saída, converte para o fuso da sessão.
- **\`timestamp\`** guarda o que você digitou, como uma foto de um relógio de parede, sem saber de que cidade é o relógio.

Uma usina no Mato Grosso do Sul está em UTC−4. A sede em São Paulo, em UTC−3. Uma captura feita às 07:00 em Dourados aconteceu às 08:00 de São Paulo. Com \`timestamptz\`, é **o mesmo valor** no banco.`,
        },
        {
          t: 'codigo',
          titulo: 'O mesmo instante em três fusos, e o relógio sem cidade',
          rodar: 'sql',
          codigo: `-- Uma captura. A sessão do laboratório está no fuso de Campo Grande (UTC-4).
SELECT capturada_em                                   AS no_fuso_da_sessao,
       capturada_em AT TIME ZONE 'America/Sao_Paulo'  AS em_sao_paulo,
       capturada_em AT TIME ZONE 'UTC'                AS em_utc
FROM capturas WHERE id = 1;

-- Trocar o fuso da sessão muda a EXIBIÇÃO, e não o dado.
SET TIME ZONE 'America/Sao_Paulo';
SELECT capturada_em AS agora_mostra FROM capturas WHERE id = 1;

-- A armadilha: a mesma hora de relógio, guardada nos dois tipos, vista de outro fuso.
SET TIME ZONE 'America/Campo_Grande';
CREATE TEMP TABLE teste (sem_fuso timestamp, com_fuso timestamptz);
INSERT INTO teste VALUES ('2026-03-03 07:00', '2026-03-03 07:00');

SET TIME ZONE 'America/Sao_Paulo';
SELECT sem_fuso, com_fuso FROM teste;      -- só um dos dois sabe que em São Paulo eram 08:00`,
        },
        {
          t: 'texto',
          md: `A coluna sem fuso continua dizendo 07:00 para quem está em São Paulo, e ninguém sabe mais 07:00 **de onde**. A com fuso mostra 08:00, que é a hora certa lá.

Regras práticas:

1. **\`timestamptz\` para todo instante.** Criação, captura, envio, pagamento.
2. **O aplicativo envia com o deslocamento**: \`2026-03-03T07:00:00-04:00\` (ISO 8601). No .NET, \`DateTimeOffset\` ou \`DateTime\` em UTC.
3. **"O dia" depende do fuso.** Relatório "capturas do dia 3" precisa dizer o dia **de quem**: \`(capturada_em AT TIME ZONE 'America/Campo_Grande')::date\`.
4. Use nomes de região (\`America/Campo_Grande\`), e não \`-04\`: regras de horário de verão mudam, e o banco de fusos acompanha.

### Restrições: o banco diz não

| Restrição | Garante |
|---|---|
| \`NOT NULL\` | o valor existe |
| \`PRIMARY KEY\` | identidade: único e não nulo |
| \`UNIQUE\` | sem duplicata (em uma coluna, ou num conjunto) |
| \`FOREIGN KEY ... REFERENCES\` | o registro apontado existe |
| \`CHECK (condição)\` | uma regra sobre os valores da linha |
| \`DEFAULT\` | o valor de quem não informou |
| \`EXCLUDE\` | sem sobreposição (dois agendamentos no mesmo horário) |`,
        },
        {
          t: 'codigo',
          titulo: 'Quatro tentativas de gravar dado inválido',
          rodar: 'sql',
          esperaFalha: true,
          codigo: `-- Cada bloco roda até o primeiro erro. Comente a linha que falhou para ver a seguinte.

-- 1. CHECK: área negativa
INSERT INTO talhoes (usina_id, codigo, area_ha) VALUES (1, 'T-99', -5);

-- 2. UNIQUE composto: já existe T-01 na usina 1 (mas pode existir T-01 na usina 2)
INSERT INTO talhoes (usina_id, codigo, area_ha) VALUES (1, 'T-01', 10);

-- 3. FOREIGN KEY: a usina 999 não existe
INSERT INTO talhoes (usina_id, codigo, area_ha) VALUES (999, 'T-01', 10);

-- 4. FOREIGN KEY na outra direção: não dá para apagar uma usina que tem talhões
DELETE FROM usinas WHERE id = 1;`,
        },
        {
          t: 'texto',
          md: `Leia a mensagem: ela traz o nome da restrição violada (\`talhoes_area_ha_check\`) e o código \`SQLSTATE\`. O aplicativo decide o que responder pelo código: **23505** (unicidade) vira um 409 na API, **23503** (chave estrangeira) e **23514** (check) viram 400 ou 422.

### O que acontece com os filhos

A chave estrangeira também define o que fazer quando o pai é apagado:

| \`ON DELETE\` | Efeito | Quando |
|---|---|---|
| \`NO ACTION\` / \`RESTRICT\` (padrão) | recusa apagar o pai | quase sempre: dado não some por acidente |
| \`CASCADE\` | apaga os filhos junto | o filho não faz sentido sem o pai (\`deteccoes\` de uma \`captura\`) |
| \`SET NULL\` | o filho fica órfão | o vínculo é opcional (\`capturas.tecnico_id\`) |

E em sistema real quase nada é apagado de fato: marca-se como inativo (\`ativa boolean\`, ou \`removida_em timestamptz\`), para manter o histórico e a auditoria.`,
        },
        {
          t: 'codigo',
          titulo: 'Criar uma tabela bem definida',
          rodar: 'sql',
          codigo: `CREATE TABLE alertas (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  armadilha_id  integer     NOT NULL REFERENCES armadilhas (id),
  nivel         text        NOT NULL CHECK (nivel IN ('atenção', 'controle', 'dano')),
  insetos       integer     NOT NULL CHECK (insetos >= 0),
  criado_em     timestamptz NOT NULL DEFAULT now(),
  resolvido_em  timestamptz,
  observacao    text        CHECK (length(observacao) <= 500),
  CONSTRAINT resolvido_depois_de_criado CHECK (resolvido_em IS NULL OR resolvido_em >= criado_em)
);

-- Só os campos obrigatórios; o resto vem do DEFAULT.
INSERT INTO alertas (armadilha_id, nivel, insetos) VALUES (7, 'controle', 31) RETURNING *;

-- O catálogo do banco responde "que restrições esta tabela tem?"
SELECT conname AS restricao, pg_get_constraintdef(oid) AS definicao
FROM pg_constraint WHERE conrelid = 'alertas'::regclass ORDER BY contype, conname;`,
        },
        {
          t: 'nota',
          estilo: 'campo',
          md: `**Validar no aplicativo E no banco.** A API valida para dar uma mensagem boa ao usuário. O banco valida porque a API não é a única porta: há o script de migração, a carga em lote, a correção feita às pressas no console, a próxima versão do serviço escrita por outra pessoa. A regra que só existe no código do aplicativo é uma sugestão.`,
        },
        {
          t: 'quiz',
          pergunta: 'O que a coluna `timestamptz` armazena?',
          opcoes: [
            'A data, a hora e o fuso horário informado.',
            'Um instante absoluto, sem o fuso; a conversão para um fuso acontece na entrada e na exibição, conforme a sessão.',
            'A hora local do servidor.',
            'Um texto.',
          ],
          correta: 1,
          explicacao: 'O nome engana: não há fuso guardado. Guarda-se o instante, e por isso duas pessoas em fusos diferentes veem horas diferentes para o mesmo valor, as duas corretas.',
        },
        {
          t: 'quiz',
          pergunta: 'Por que definir restrições no banco se a API já valida os dados?',
          opcoes: [
            'Não há motivo.',
            'Porque a API não é o único caminho até os dados; a restrição no banco vale para scripts, cargas, correções manuais e versões futuras do código.',
            'Porque o banco valida mais rápido.',
            'Porque a API não consegue validar números.',
          ],
          correta: 1,
          explicacao: 'O banco é o último ponto por onde todo dado passa. O que ele garante, vale sempre; o que só o aplicativo garante, vale enquanto aquele código for o único a escrever.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'escrita-e-transacoes',
      titulo: 'Escrita e transações',
      minutos: 14,
      resumo: 'RETURNING, UPSERT e UPDATE com junção. Transações, o que o isolamento garante, e como se perde uma atualização.',
      blocos: [
        {
          t: 'texto',
          md: `### Escrever, à moda do Postgres

Três recursos mudam o jeito de escrever código de aplicação.

**\`RETURNING\`** devolve as linhas afetadas por \`INSERT\`, \`UPDATE\` ou \`DELETE\`. Acaba a segunda consulta para descobrir o id gerado.

**\`ON CONFLICT\`** (o *upsert*): insere, e se bater numa restrição de unicidade, atualiza ou ignora. É atômico, sem a corrida do "consulta, depois decide".

**\`UPDATE ... FROM\`** e **\`DELETE ... USING\`**: atualizar ou apagar com base em outra tabela.`,
        },
        {
          t: 'codigo',
          titulo: 'RETURNING, UPSERT e UPDATE com junção',
          rodar: 'sql',
          codigo: `-- UPSERT: a contagem diária por armadilha. A primeira execução insere, a segunda soma.
CREATE TABLE resumo_diario (
  armadilha_id integer NOT NULL REFERENCES armadilhas (id),
  dia          date    NOT NULL,
  insetos      integer NOT NULL,
  PRIMARY KEY (armadilha_id, dia)
);

INSERT INTO resumo_diario VALUES (1, '2026-03-03', 5)
ON CONFLICT (armadilha_id, dia) DO UPDATE SET insetos = resumo_diario.insetos + EXCLUDED.insetos
RETURNING *;

INSERT INTO resumo_diario VALUES (1, '2026-03-03', 3)        -- mesma chave: vira UPDATE
ON CONFLICT (armadilha_id, dia) DO UPDATE SET insetos = resumo_diario.insetos + EXCLUDED.insetos
RETURNING *;

-- UPDATE com junção: desativar as armadilhas dos talhões da usina 3. RETURNING mostra o que mudou.
UPDATE armadilhas a
SET ativa = false
FROM talhoes t
WHERE t.id = a.talhao_id AND t.usina_id = 3 AND a.tipo = 'feromônio'
RETURNING a.codigo, a.tipo, a.ativa;`,
        },
        {
          t: 'texto',
          md: `\`EXCLUDED\` é a linha que **tentou** entrar. \`ON CONFLICT (...) DO NOTHING\` é a outra forma: "se já existe, tudo bem".

É este o mecanismo por trás do **envio idempotente** da trilha de React Native: o app manda \`PUT /capturas/{id}\` com um UUID gerado no aparelho, a API faz \`INSERT ... ON CONFLICT (id) DO NOTHING\`, e reenviar a mesma captura dez vezes grava uma só.

### Transações

Uma **transação** agrupa comandos numa unidade: ou todos valem, ou nenhum. É o **A** de ACID.

\`\`\`sql
BEGIN;
  -- vários comandos
COMMIT;      -- confirma tudo     (ou ROLLBACK; desfaz tudo)
\`\`\`

No Postgres, **todo comando solto já é uma transação** de um comando só. E, ao contrário do MySQL, **\`CREATE\`, \`ALTER\` e \`DROP\` participam**: uma migração que falha no meio é desfeita por inteiro.`,
        },
        {
          t: 'codigo',
          titulo: 'Tudo ou nada',
          rodar: 'sql',
          codigo: `-- Transferir as armadilhas de um talhão para outro e desativar o talhão antigo.
ALTER TABLE talhoes ADD COLUMN ativo boolean NOT NULL DEFAULT true;

BEGIN;
  UPDATE armadilhas SET talhao_id = 2 WHERE talhao_id = 1;
  UPDATE talhoes SET ativo = false WHERE id = 1;
  SELECT 'dentro da transação' AS momento, count(*) AS armadilhas_no_talhao_2 FROM armadilhas WHERE talhao_id = 2;
ROLLBACK;     -- algo deu errado: desfaz os dois UPDATEs

SELECT 'depois do ROLLBACK' AS momento, count(*) AS armadilhas_no_talhao_2 FROM armadilhas WHERE talhao_id = 2;

-- SAVEPOINT: desfazer só uma parte
BEGIN;
  UPDATE talhoes SET ativo = false WHERE id = 1;
  SAVEPOINT antes_do_risco;
  UPDATE talhoes SET area_ha = area_ha * 100;          -- ops
  ROLLBACK TO antes_do_risco;                          -- desfaz só o último
COMMIT;

SELECT id, area_ha, ativo FROM talhoes WHERE id IN (1, 2) ORDER BY id;`,
        },
        {
          t: 'texto',
          md: `### Concorrência: o que duas transações veem uma da outra

O Postgres usa **MVCC** (controle de concorrência por múltiplas versões). Um \`UPDATE\` não sobrescreve a linha: cria uma **versão nova**, e a antiga continua visível para as transações que começaram antes. A consequência que importa: **leitura não bloqueia escrita, e escrita não bloqueia leitura**.

O **nível de isolamento** define o que uma transação enxerga do que as outras confirmaram enquanto ela roda.

| Nível | O que garante | Custo |
|---|---|---|
| \`READ COMMITTED\` (padrão) | cada **comando** vê o que estava confirmado quando ele começou | dois \`SELECT\` na mesma transação podem ver dados diferentes |
| \`REPEATABLE READ\` | a transação inteira vê uma **fotografia** do início | pode falhar com erro de serialização, e precisa ser repetida |
| \`SERIALIZABLE\` | o resultado é igual ao de rodar as transações uma depois da outra | mais falhas para repetir |

O laboratório tem uma conexão só, então duas sessões simultâneas não dá para mostrar ao vivo. O problema clássico, passo a passo:

### A atualização perdida

Duas requisições somam insetos à mesma armadilha ao mesmo tempo, e o código do aplicativo faz "lê, soma, grava":

| Tempo | Requisição A | Requisição B | No banco |
|---|---|---|---|
| 1 | \`SELECT insetos\` → 10 | | 10 |
| 2 | | \`SELECT insetos\` → 10 | 10 |
| 3 | \`UPDATE SET insetos = 15\` (10 + 5) | | 15 |
| 4 | | \`UPDATE SET insetos = 13\` (10 + 3) | **13** |

Deveria ser 18. O 5 da requisição A sumiu, sem erro nenhum. As saídas, da mais simples para a mais pesada:`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Saída', 'Como', 'Quando'],
          linhas: [
            ['Atualização atômica', '`UPDATE ... SET insetos = insetos + 5`: o banco lê e grava num passo só', 'sempre que a nova conta couber numa expressão SQL. Resolve a maioria dos casos'],
            ['Trava explícita', '`SELECT ... FOR UPDATE` dentro de uma transação: a segunda requisição espera a primeira confirmar', 'a decisão depende de lógica no aplicativo, entre a leitura e a escrita'],
            ['Controle otimista', 'coluna `versao`; `UPDATE ... WHERE id = $1 AND versao = $2`. Zero linhas afetadas significa "alguém mudou antes": recarrega e tenta de novo', 'edição por pessoas, em telas; o conflito é raro. É o que o EF Core faz com o token de concorrência'],
            ['Isolamento maior', '`REPEATABLE READ` ou `SERIALIZABLE`, com nova tentativa em caso de erro 40001', 'invariantes que envolvem várias linhas ou tabelas'],
          ],
        },
        {
          t: 'codigo',
          titulo: 'Atualização atômica e controle otimista',
          rodar: 'sql',
          codigo: `CREATE TABLE contagem (armadilha_id int PRIMARY KEY, insetos int NOT NULL, versao int NOT NULL DEFAULT 1);
INSERT INTO contagem VALUES (1, 10);

-- 1. Atômica: não importa quantas requisições rodem ao mesmo tempo, nenhuma soma se perde.
UPDATE contagem SET insetos = insetos + 5 WHERE armadilha_id = 1;
UPDATE contagem SET insetos = insetos + 3 WHERE armadilha_id = 1;
SELECT insetos AS depois_das_duas_somas FROM contagem;

-- 2. Otimista: as duas telas leram a versão 1.
-- A primeira grava e sobe a versão:
UPDATE contagem SET insetos = 40, versao = versao + 1 WHERE armadilha_id = 1 AND versao = 1 RETURNING *;
-- A segunda chega com a versão antiga: nenhuma linha afetada. O aplicativo percebe e avisa o usuário.
UPDATE contagem SET insetos = 99, versao = versao + 1 WHERE armadilha_id = 1 AND versao = 1 RETURNING *;`,
        },
        {
          t: 'nota',
          estilo: 'pegadinha',
          md: `**Transação longa é veneno.** Enquanto uma transação está aberta, ela segura travas e impede a limpeza das versões antigas das linhas (o \`VACUUM\`). O erro clássico é abrir a transação, fazer uma chamada HTTP a outro serviço e só então confirmar: se o outro serviço demorar, o banco inteiro sente. Transação abre, faz o trabalho no banco e fecha. Em produção, vale configurar \`idle_in_transaction_session_timeout\`.`,
        },
        {
          t: 'desafio-sql',
          enunciado: `O aplicativo reenvia capturas quando a rede falha. Escreva o comando que grava a usina **\`('Boa Vista', 'MS')\`** sem dar erro se ela já existir, e a usina **\`('Três Barras', 'PR')\`**, que é nova. Depois, liste **nome e UF de todas as usinas**.

O resultado conferido é o do \`SELECT\` final.`,
          inicial: `INSERT INTO usinas (nome, uf) VALUES ('Boa Vista', 'MS'), ('Três Barras', 'PR');

SELECT nome, uf FROM usinas;`,
          solucao: `INSERT INTO usinas (nome, uf) VALUES ('Boa Vista', 'MS'), ('Três Barras', 'PR')
ON CONFLICT (nome) DO NOTHING;

SELECT nome, uf FROM usinas;`,
          dica: 'A coluna `nome` é `UNIQUE`. Acrescente `ON CONFLICT (nome) DO NOTHING` ao `INSERT`.',
        },
        {
          t: 'quiz',
          pergunta: 'Duas requisições simultâneas fazem "SELECT o saldo, somam no aplicativo, UPDATE com o novo valor". Qual é o risco, e a correção mais simples?',
          opcoes: [
            'Nenhum: o banco serializa sozinho.',
            'Atualização perdida: as duas leem o mesmo valor e a segunda sobrescreve a primeira. A correção mais simples é fazer a conta no próprio UPDATE: `SET saldo = saldo + $1`.',
            'Deadlock; corrige-se com um índice.',
            'Erro de chave duplicada.',
          ],
          correta: 1,
          explicacao: 'No isolamento padrão, nada impede as duas leituras de verem o mesmo valor. O UPDATE com expressão lê e grava atomicamente, sob a trava da linha.',
        },
        {
          t: 'quiz',
          pergunta: 'Uma migração roda `ALTER TABLE` e, em seguida, um `UPDATE` que falha. O que acontece no PostgreSQL se os dois estiverem na mesma transação?',
          opcoes: [
            'O ALTER TABLE fica aplicado.',
            'Tudo é desfeito: no Postgres, comandos de estrutura (DDL) são transacionais.',
            'O banco fica corrompido.',
            'Só o UPDATE é desfeito.',
          ],
          correta: 1,
          explicacao: 'É uma vantagem real sobre o MySQL, onde o DDL confirma sozinho e uma migração interrompida deixa o esquema pela metade.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'jsonb-e-arrays',
      titulo: 'JSONB e arrays',
      minutos: 12,
      resumo: 'Dado semiestruturado dentro do banco relacional: operadores, índice, e a linha entre flexibilidade e bagunça.',
      blocos: [
        {
          t: 'texto',
          md: `O \`jsonb\` guarda um documento JSON num formato binário, que o banco consegue **consultar e indexar**. É o que permite ter, no mesmo banco, tabelas rígidas para o que é central e um campo flexível para o que varia.

Na tabela \`capturas\`, a coluna \`metadados\` guarda o que o aplicativo manda sobre a foto: aparelho, versão do app, nitidez, se choveu, coordenadas. Nem toda captura tem todos os campos.

| Operador | Faz | Exemplo |
|---|---|---|
| \`->\` | pega um campo, **como jsonb** | \`metadados->'gps'\` |
| \`->>\` | pega um campo, **como texto** | \`metadados->>'aparelho'\` |
| \`#>>\` | caminho, como texto | \`metadados #>> '{gps,lat}'\` |
| \`@>\` | contém | \`metadados @> '{"chuva": true}'\` |
| \`?\` | tem a chave | \`metadados ? 'chuva'\` |
| \`||\` | junta dois documentos | \`metadados || '{"revisada": true}'\` |
| \`-\` | remove uma chave | \`metadados - 'gps'\` |`,
        },
        {
          t: 'codigo',
          titulo: 'Consultar dentro do JSON',
          rodar: 'sql',
          codigo: `-- Extrair campos. ->> devolve TEXTO: para fazer conta, é preciso converter.
SELECT id,
       metadados->>'aparelho'            AS aparelho,
       (metadados->>'nitidez')::int      AS nitidez,
       metadados->'gps'->>'lat'          AS latitude,
       metadados ? 'chuva'               AS informou_chuva
FROM capturas ORDER BY id LIMIT 5;

-- Filtrar: capturas com chuva, por aparelho. @> é o operador que o índice GIN acelera.
SELECT metadados->>'aparelho' AS aparelho, count(*) AS com_chuva
FROM capturas
WHERE metadados @> '{"chuva": true}'
GROUP BY aparelho ORDER BY com_chuva DESC;

-- A lógica de três valores vale aqui também: sem a chave, ->> devolve NULL.
SELECT count(*) FILTER (WHERE metadados->>'chuva' = 'true')  AS choveu,
       count(*) FILTER (WHERE metadados->>'chuva' = 'false') AS nao_choveu,
       count(*) FILTER (WHERE NOT metadados ? 'chuva')       AS nao_informado
FROM capturas;`,
        },
        {
          t: 'codigo',
          titulo: 'Alterar o documento, e montar JSON a partir de tabelas',
          rodar: 'sql',
          codigo: `-- Acrescentar e alterar chaves sem regravar o documento pelo aplicativo
UPDATE capturas
SET metadados = jsonb_set(metadados || '{"revisada": true}', '{gps,precisao_m}', '12')
WHERE id = 1
RETURNING jsonb_pretty(metadados);

-- Na direção contrária: a API precisa devolver uma usina com seus talhões aninhados.
-- O banco monta o JSON pronto, numa consulta só.
SELECT jsonb_pretty(jsonb_build_object(
         'usina', u.nome,
         'uf', u.uf,
         'talhoes', (SELECT jsonb_agg(jsonb_build_object('codigo', t.codigo, 'area_ha', t.area_ha) ORDER BY t.codigo)
                     FROM talhoes t WHERE t.usina_id = u.id)
       )) AS resposta_da_api
FROM usinas u WHERE u.id = 3;`,
        },
        {
          t: 'texto',
          md: `### Arrays

Uma coluna pode ser uma lista: \`text[]\`, \`integer[]\`. Serve para listas **simples e pequenas** que pertencem à linha: etiquetas, classes presentes numa imagem.

| | |
|---|---|
| \`ARRAY['a', 'b']\` ou \`'{a,b}'\` | escrever um array |
| \`col[1]\` | o primeiro elemento (**os índices começam em 1**) |
| \`'x' = ANY(col)\` | contém o valor |
| \`col @> ARRAY['a', 'b']\` | contém todos estes |
| \`col && ARRAY['a', 'b']\` | tem algum em comum |
| \`array_length(col, 1)\`, \`cardinality(col)\` | tamanho |
| \`unnest(col)\` | transforma em linhas |
| \`array_agg(x)\` | transforma linhas em array |`,
        },
        {
          t: 'codigo',
          titulo: 'Arrays: das linhas para a lista, e de volta',
          rodar: 'sql',
          codigo: `-- array_agg: as classes distintas detectadas em cada captura
WITH classes AS (
  SELECT captura_id, array_agg(DISTINCT classe ORDER BY classe) AS classes, count(*) AS insetos
  FROM deteccoes GROUP BY captura_id
)
SELECT captura_id, classes, insetos FROM classes ORDER BY captura_id LIMIT 4;

-- Filtrar por conteúdo do array: capturas em que apareceram mariposa E mosca
WITH classes AS (
  SELECT captura_id, array_agg(DISTINCT classe) AS classes FROM deteccoes GROUP BY captura_id
)
SELECT count(*) AS com_mariposa_e_mosca FROM classes WHERE classes @> ARRAY['mariposa', 'mosca'];

-- unnest: de volta para linhas
SELECT unnest(ARRAY['mariposa', 'cigarrinha', 'mosca']) AS classe;`,
        },
        {
          t: 'texto',
          md: `### Quando usar, e quando não

O \`jsonb\` é tentador porque adia decisões. O custo aparece depois: sem tipo, sem \`NOT NULL\`, sem chave estrangeira, sem estatísticas boas para o planejador.

| Vai para **coluna** | Vai para **jsonb** |
|---|---|
| o que se filtra, ordena e agrega com frequência | atributos que variam de um registro para outro |
| o que tem regra (obrigatório, faixa de valores, referência) | carga bruta de um sistema externo, guardada como veio |
| o que entra em \`JOIN\` | configuração, preferências, metadados de diagnóstico |
| o que todo registro tem | o que é lido inteiro, e raramente consultado por dentro |

A regra de bolso: **se você escreve \`metadados->>'x'\` num \`WHERE\` toda semana, \`x\` quer ser uma coluna.** No banco de exemplo, a \`nitidez\` já está nesse ponto: alimenta o portão de qualidade e o monitoramento, e mereceria coluna própria.

O caminho do meio é a **coluna gerada**: uma coluna de verdade, calculada do JSON, que pode ter tipo, índice e restrição.`,
        },
        {
          t: 'codigo',
          titulo: 'Coluna gerada e índice sobre o JSON',
          rodar: 'sql',
          codigo: `-- Promover um campo do JSON a coluna, sem mudar quem grava
ALTER TABLE capturas
  ADD COLUMN nitidez integer GENERATED ALWAYS AS ((metadados->>'nitidez')::int) STORED;

SELECT id, nitidez, metadados->>'aparelho' AS aparelho FROM capturas WHERE nitidez < 45 ORDER BY nitidez, id LIMIT 5;

-- Índice GIN: acelera @> e ? em qualquer chave do documento
CREATE INDEX capturas_metadados_gin ON capturas USING gin (metadados);

-- Com 1.376 linhas, o planejador prefere ler a tabela inteira: é mais barato que usar o índice.
EXPLAIN SELECT count(*) FROM capturas WHERE metadados @> '{"aparelho": "iPhone 13", "chuva": true}';

-- Só para VER o plano com o índice, proibimos a leitura sequencial nesta sessão.
SET enable_seqscan = off;
EXPLAIN SELECT count(*) FROM capturas WHERE metadados @> '{"aparelho": "iPhone 13", "chuva": true}';`,
        },
        {
          t: 'texto',
          md: `O primeiro plano é uma lição em si: **ter um índice não obriga o banco a usá-lo**. Numa tabela pequena, ler tudo custa menos do que ir e voltar entre o índice e a tabela, e o planejador sabe disso. O segundo plano mostra o \`Bitmap Index Scan\` que apareceria sozinho com centenas de milhares de capturas. A próxima lição é sobre ler esses planos.`,
        },
        {
          t: 'desafio-sql',
          ordenado: true,
          enunciado: `Para cada **versão do aplicativo** (a chave \`app\` dos metadados), mostre a versão, o número de capturas e a **nitidez média arredondada** para inteiro. Ordene pela versão.`,
          inicial: `SELECT metadados->'app' AS versao, count(*) AS capturas
FROM capturas
GROUP BY versao
ORDER BY versao;`,
          solucao: `SELECT metadados->>'app' AS versao,
       count(*) AS capturas,
       round(avg((metadados->>'nitidez')::int)) AS nitidez_media
FROM capturas
GROUP BY versao
ORDER BY versao;`,
          dica: 'Use `->>` para obter texto (com `->` a versão sai entre aspas, como JSON). A nitidez precisa de `::int` antes do `avg`.',
        },
        {
          t: 'quiz',
          pergunta: 'Qual é a diferença entre `metadados->\'nitidez\'` e `metadados->>\'nitidez\'`?',
          opcoes: [
            'Nenhuma.',
            '`->` devolve o valor como jsonb; `->>` devolve como texto. Para comparar ou fazer conta, usa-se `->>` e converte-se: `(metadados->>\'nitidez\')::int`.',
            '`->>` é mais rápido.',
            '`->` só funciona com arrays.',
          ],
          correta: 1,
          explicacao: 'É a confusão mais comum com JSONB. O resultado de `->` continua sendo JSON, e um texto JSON vem com aspas.',
        },
        {
          t: 'quiz',
          pergunta: 'Um campo dentro de uma coluna jsonb passou a ser usado em filtros e relatórios todos os dias. O que fazer?',
          opcoes: [
            'Nada.',
            'Promovê-lo a coluna (ou a coluna gerada a partir do JSON): ganha tipo, restrição, índice comum e estatísticas para o planejador.',
            'Trocar jsonb por json.',
            'Guardar o JSON como texto.',
          ],
          correta: 1,
          explicacao: 'O jsonb é ótimo para o que varia e pouco se consulta. O que virou parte do modelo de negócio merece o que só uma coluna oferece.',
        },
      ],
    },
  ],
};
