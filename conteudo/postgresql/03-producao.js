// As tabelas do banco de exemplo são pequenas demais para um índice fazer
// diferença. As lições de desempenho criam, em cada bloco, uma tabela de 300 mil
// leituras de sensores: grande o bastante para o planejador mudar de ideia.
const LEITURAS = `CREATE TABLE leituras AS
SELECT g AS id,
       1 + g % 500 AS sensor_id,                                            -- 500 sensores
       TIMESTAMPTZ '2026-01-01' + g * interval '30 seconds' AS lida_em,     -- uma leitura a cada 30 s
       round((20 + (g * 37 % 1500) / 100.0)::numeric, 2) AS temperatura,
       (ARRAY['ok','ok','ok','ok','ok','ok','ok','ok','ok','erro'])[1 + g % 10] AS situacao   -- 10% com erro
FROM generate_series(1, 300000) AS g;
ANALYZE leituras;        -- atualiza as estatísticas que o planejador usa
`;

// EXPLAIN ANALYZE sem os tempos, que mudam a cada execução e distraem.
const EX = 'EXPLAIN (ANALYZE, TIMING OFF, BUFFERS OFF, SUMMARY OFF)';

export const producao = {
  id: 'producao',
  titulo: 'Desempenho e produção',
  cor: '#e08fb0',
  licoes: [
    // ------------------------------------------------------------------
    {
      id: 'indices-e-explain',
      titulo: 'Índices e EXPLAIN',
      minutos: 16,
      resumo: 'Ler um plano de execução, e escolher o índice que transforma 300 mil linhas lidas em 600.',
      blocos: [
        {
          t: 'texto',
          md: `Uma consulta lenta quase nunca se resolve olhando para o SQL. Resolve-se perguntando ao banco **o que ele fez**. A pergunta é o \`EXPLAIN\`.

- \`EXPLAIN consulta\` mostra o **plano**: o que o banco pretende fazer, com custos **estimados**.
- \`EXPLAIN ANALYZE consulta\` **executa** a consulta e mostra o plano com os números **reais**. Cuidado: um \`DELETE\` com \`EXPLAIN ANALYZE\` apaga de verdade.

O plano é uma árvore, lida **de dentro para fora**: o nó mais recuado roda primeiro e alimenta o de cima.

| No plano | Significa |
|---|---|
| \`Seq Scan\` | leu a tabela inteira, linha por linha |
| \`Index Scan\` | andou pelo índice e buscou cada linha na tabela |
| \`Index Only Scan\` | respondeu só com o índice, sem ir à tabela |
| \`Bitmap Index Scan\` + \`Bitmap Heap Scan\` | juntou no índice a lista de páginas e depois leu a tabela em ordem; típico de centenas ou milhares de linhas |
| \`cost=0.00..5990.00\` | custo estimado, em unidades arbitrárias: até a primeira linha .. até a última |
| \`rows=596\` | quantas linhas o planejador **estimou** |
| \`actual rows=600\` | quantas saíram **de verdade** |
| \`Rows Removed by Filter\` | linhas lidas e jogadas fora: o trabalho desperdiçado |

A tabela das lições anteriores é pequena demais para isso importar. Os blocos abaixo criam uma de 300 mil leituras de sensores.`,
        },
        {
          t: 'codigo',
          titulo: 'A mesma consulta, sem índice e com índice',
          rodar: 'sql',
          tempo: 60,
          codigo: `${LEITURAS}
SELECT count(*) AS linhas, pg_size_pretty(pg_table_size('leituras')) AS tamanho FROM leituras;

-- Sem índice: para achar as 600 leituras do sensor 42, o banco lê as 300 mil.
${EX}
SELECT * FROM leituras WHERE sensor_id = 42;

CREATE INDEX leituras_sensor ON leituras (sensor_id);

-- Com índice
${EX}
SELECT * FROM leituras WHERE sensor_id = 42;`,
        },
        {
          t: 'texto',
          md: `Compare as duas árvores.

**Sem índice**: \`Seq Scan\`, com \`Rows Removed by Filter: 299400\`. Leu 300 mil linhas para devolver 600. O custo estimado é de quase 6 mil.

**Com índice**: \`Bitmap Index Scan\` achou as 600 entradas, e o \`Bitmap Heap Scan\` buscou só as páginas necessárias. O custo caiu para a casa de mil e trezentos, e nenhuma linha foi lida à toa.

Repare também em \`rows=596\` contra \`actual rows=600\`. A estimativa veio das **estatísticas** que o \`ANALYZE\` coletou. Quando a estimativa erra por dez ou cem vezes, o planejador escolhe o plano errado, e é a primeira coisa a procurar num plano ruim.

### O índice não é usado sempre, e isso está certo

Um índice B-tree é uma lista ordenada com ponteiros para as linhas. Vale a pena quando a consulta quer **poucas** linhas. Para buscar 90% da tabela, ir e voltar entre índice e tabela custa mais do que ler tudo de uma vez.`,
        },
        {
          t: 'codigo',
          titulo: 'Seletividade: quando o índice não compensa',
          rodar: 'sql',
          tempo: 60,
          codigo: `${LEITURAS}
CREATE INDEX leituras_situacao ON leituras (situacao);

-- 'erro' é 10% da tabela: o índice ajuda.
${EX}
SELECT * FROM leituras WHERE situacao = 'erro';

-- 'ok' é 90% da tabela: o planejador ignora o índice, com razão.
${EX}
SELECT * FROM leituras WHERE situacao = 'ok';

-- Índice PARCIAL: guarda só as linhas que interessam. Menor, e mais barato de manter.
CREATE INDEX leituras_erros ON leituras (lida_em) WHERE situacao = 'erro';

SELECT indexrelname AS indice, pg_size_pretty(pg_relation_size(indexrelid)) AS tamanho
FROM pg_stat_user_indexes WHERE relname = 'leituras' ORDER BY indexrelname;`,
        },
        {
          t: 'texto',
          md: `O índice parcial é um recurso do Postgres que o MySQL não tem, e resolve um caso muito comum: uma fila em que 99% das linhas já foram processadas. \`CREATE INDEX ... WHERE situacao = 'pendente'\` indexa só o 1% que as consultas procuram.

### Índice composto: a ordem das colunas decide

Um índice em \`(sensor_id, lida_em)\` é como uma lista telefônica ordenada por sobrenome e, dentro do sobrenome, por nome. Serve para procurar por sobrenome, ou por sobrenome **e** nome. Procurar só pelo nome obriga a percorrer a lista.

A regra prática para a ordem: **primeiro as colunas comparadas por igualdade, depois a de faixa ou de ordenação.**`,
        },
        {
          t: 'codigo',
          titulo: 'Índice composto: filtrar e ordenar com um índice só',
          rodar: 'sql',
          tempo: 60,
          codigo: `${LEITURAS}
CREATE INDEX leituras_sensor_data ON leituras (sensor_id, lida_em DESC);

-- "As 5 leituras mais recentes do sensor 42": o índice entrega já filtrado E ordenado.
-- O banco lê 5 entradas e para. Não há nó de ordenação no plano.
${EX}
SELECT * FROM leituras WHERE sensor_id = 42 ORDER BY lida_em DESC LIMIT 5;

-- A mesma pergunta sem o índice certo: lê tudo do sensor, ordena, e joga fora quase tudo.
DROP INDEX leituras_sensor_data;
CREATE INDEX leituras_sensor ON leituras (sensor_id);
${EX}
SELECT * FROM leituras WHERE sensor_id = 42 ORDER BY lida_em DESC LIMIT 5;`,
        },
        {
          t: 'texto',
          md: `No primeiro plano, \`Index Scan\` com \`actual rows=5\`: o banco leu cinco entradas do índice e terminou. No segundo aparece um nó \`Sort\` alimentado pelas 600 linhas do sensor. Com 600 linhas não se nota. Com 6 milhões, é a diferença entre 1 milissegundo e alguns segundos, e é o padrão de quase toda tela de "últimos registros".

### O que impede o uso de um índice

A causa mais comum de "tem índice e não usa" é **aplicar uma função à coluna** no filtro. O índice guarda os valores da coluna, e não os da função.`,
        },
        {
          t: 'codigo',
          titulo: 'A função que esconde a coluna do índice',
          rodar: 'sql',
          tempo: 60,
          codigo: `${LEITURAS}
CREATE INDEX leituras_data ON leituras (lida_em);

-- Função sobre a coluna: o índice não serve. Lê as 300 mil linhas.
EXPLAIN (COSTS OFF)
SELECT count(*) FROM leituras WHERE lida_em::date = '2026-03-01';

-- A mesma pergunta como faixa sobre a coluna pura: usa o índice.
EXPLAIN (COSTS OFF)
SELECT count(*) FROM leituras WHERE lida_em >= '2026-03-01' AND lida_em < '2026-03-02';

-- As duas respondem igual.
SELECT (SELECT count(*) FROM leituras WHERE lida_em::date = '2026-03-01') AS com_funcao,
       (SELECT count(*) FROM leituras WHERE lida_em >= '2026-03-01' AND lida_em < '2026-03-02') AS com_faixa;`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['O que impede o índice', 'Exemplo', 'Conserto'],
          linhas: [
            ['Função sobre a coluna', '`WHERE lower(email) = ...`, `WHERE data::date = ...`', 'reescrever como faixa, ou criar um **índice de expressão**: `CREATE INDEX ON t (lower(email))`'],
            ['Curinga no início', "`LIKE '%silva'`", 'índice trigrama (próxima lição)'],
            ['Tipo diferente', 'coluna `text` comparada com número', 'comparar com o tipo certo'],
            ['Coluna que não é a primeira do índice composto', 'índice `(a, b)`, filtro só em `b`', 'outro índice, ou inverter a ordem'],
            ['Baixa seletividade', 'filtro que casa com metade da tabela', 'nenhum: ler tudo é o plano certo'],
            ['Estatísticas velhas', 'tabela que cresceu muito desde o último `ANALYZE`', '`ANALYZE tabela` (o autovacuum faz, mas pode atrasar)'],
          ],
        },
        {
          t: 'texto',
          md: `### Índice não é de graça

Cada índice é uma estrutura a mais para **atualizar em toda escrita** e para guardar em disco. Uma tabela com doze índices grava devagar.

- Indexe o que as consultas **de fato** filtram, juntam e ordenam. Meça antes.
- **Chave estrangeira não ganha índice sozinha** no Postgres (a chave primária e as \`UNIQUE\` ganham). Quase sempre vale criar: sem ele, apagar um pai varre a tabela de filhos.
- \`pg_stat_user_indexes\` mostra quantas vezes cada índice foi usado (\`idx_scan\`). Índice com zero uso há meses é candidato a sair.
- Em produção, \`CREATE INDEX CONCURRENTLY\`: demora mais, e não trava as escritas na tabela.
- A extensão **pg_stat_statements** lista as consultas que mais consomem tempo no total. É por ela que se começa uma investigação de desempenho, e não por palpite.

| Tipo de índice | Para |
|---|---|
| **B-tree** (padrão) | igualdade, faixa, ordenação. Nove de cada dez índices |
| **GIN** | "contém": \`jsonb\`, arrays, busca textual, trigramas |
| **GiST** | geometria (PostGIS), faixas, vizinho mais próximo |
| **BRIN** | tabelas enormes fisicamente ordenadas (séries temporais): minúsculo, e grosseiro |
| **HNSW** (pgvector) | vetores: vizinhos aproximados |`,
        },
        {
          t: 'nota',
          estilo: 'entrevista',
          md: `**"Esta consulta está lenta. O que você faz?"** A resposta que mostra experiência é um método, e não um palpite: (1) \`EXPLAIN (ANALYZE, BUFFERS)\` com os parâmetros reais; (2) procurar o nó que consome o tempo; (3) comparar linhas estimadas e reais, porque estimativa muito errada indica estatística ruim; (4) procurar \`Seq Scan\` com muitas linhas removidas por filtro, ordenação em disco, laço aninhado com muitas repetições; (5) só então propor índice, reescrita ou mudança de modelo; (6) medir de novo.`,
        },
        {
          t: 'quiz',
          pergunta: 'Um plano mostra `Seq Scan` com `Rows Removed by Filter: 299400` e 600 linhas devolvidas. O que isso indica?',
          opcoes: [
            'Que a consulta está ótima.',
            'Que o banco leu a tabela inteira para aproveitar 0,2% dela: um índice na coluna do filtro deve ajudar.',
            'Que há um índice corrompido.',
            'Que falta memória.',
          ],
          correta: 1,
          explicacao: 'Muitas linhas lidas e descartadas é o sinal clássico de índice faltando. Com o índice, o banco vai direto às 600.',
        },
        {
          t: 'quiz',
          pergunta: 'Existe um índice em `criado_em`, e a consulta `WHERE date(criado_em) = \'2026-03-01\'` não o usa. Por quê?',
          opcoes: [
            'Porque índices não funcionam com datas.',
            'Porque a função aplicada à coluna produz valores que não estão no índice. Reescrever como faixa (`>= dia AND < dia seguinte`) permite usá-lo.',
            'Porque falta `ANALYZE`.',
            'Porque o índice é B-tree.',
          ],
          correta: 1,
          explicacao: 'O índice ordena os valores originais da coluna. Para filtrar por uma expressão, ou se reescreve o filtro, ou se cria um índice sobre a própria expressão.',
        },
        {
          t: 'quiz',
          pergunta: 'Para a consulta `WHERE cliente_id = 7 ORDER BY criado_em DESC LIMIT 10`, qual índice é o ideal?',
          opcoes: ['`(criado_em)`', '`(cliente_id, criado_em DESC)`', '`(criado_em, cliente_id)`', 'Dois índices separados, um por coluna.'],
          correta: 1,
          explicacao: 'Igualdade primeiro, ordenação depois. O banco entra no índice no cliente 7 e lê as dez primeiras entradas, já na ordem pedida, sem ordenar nada.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'busca-e-vetores',
      titulo: 'Busca textual e vetores',
      minutos: 13,
      resumo: 'Busca tolerante a erro de digitação, busca por palavras em português, e busca por semelhança de imagem com pgvector.',
      blocos: [
        {
          t: 'texto',
          md: `Três tipos de busca que o \`LIKE\` não resolve, e que o Postgres faz sem um serviço à parte.

### 1. Trigramas: tolerar erro de digitação

A extensão **pg_trgm** quebra o texto em pedaços de três letras e mede quantos pedaços dois textos têm em comum. "cigarrinha" e "cigarinha" compartilham quase todos.

| | |
|---|---|
| \`similarity(a, b)\` | de 0 a 1 |
| \`a % b\` | verdadeiro se a semelhança passa do limite (0,3 por padrão) |
| \`a <-> b\` | distância: \`1 - similarity\`. Serve no \`ORDER BY\` |
| índice \`GIN (col gin_trgm_ops)\` | acelera \`%\`, e também \`LIKE '%meio%'\` e \`ILIKE\` |`,
        },
        {
          t: 'codigo',
          titulo: 'Busca aproximada com trigramas',
          rodar: 'sql',
          codigo: `SELECT similarity('cigarrinha', 'cigarinha') AS um_r_a_menos,
       similarity('cigarrinha', 'mariposa')  AS outra_palavra;

-- O técnico digitou errado. Qual usina ele quis dizer?
SELECT nome, round(similarity(nome, 'santa elena')::numeric, 2) AS semelhanca
FROM usinas
ORDER BY nome <-> 'santa elena'
LIMIT 3;

-- Busca por nome de técnico, com erro e sem acento
SELECT nome FROM tecnicos WHERE nome % 'bruno lma';

-- O índice que sustenta isso em tabela grande (e também o LIKE com % no início)
CREATE INDEX tecnicos_nome_trgm ON tecnicos USING gin (nome gin_trgm_ops);`,
        },
        {
          t: 'texto',
          md: `### 2. Busca textual: palavras, e não letras

Para procurar em textos longos (observações, laudos, descrições), o Postgres tem a **busca de texto completo**. Ela entende a língua:

- **\`to_tsvector('portuguese', texto)\`** reduz o texto às raízes das palavras, sem artigos e preposições.
- **\`to_tsquery\`** / **\`websearch_to_tsquery\`** fazem o mesmo com a pergunta.
- **\`@@\`** testa se o documento casa com a pergunta.

"Armadilhas adesivas amarelas" casa com a busca por "armadilha amarela": plural e gênero somem na redução à raiz.`,
        },
        {
          t: 'codigo',
          titulo: 'Busca de texto completo em português',
          rodar: 'sql',
          codigo: `-- O que o banco guarda: raízes e posições
SELECT to_tsvector('portuguese', 'Armadilhas adesivas amarelas instaladas no talhão') AS documento,
       websearch_to_tsquery('portuguese', 'armadilha amarela')                        AS pergunta;

CREATE TABLE observacoes (id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY, texto text NOT NULL);
INSERT INTO observacoes (texto) VALUES
  ('Armadilha caída depois da chuva forte, cartão molhado'),
  ('Muitas cigarrinhas nas armadilhas amarelas da borda do talhão'),
  ('Cartão trocado. Sem insetos visíveis.'),
  ('Chovendo na hora da leitura; foto com reflexo'),
  ('Formigas no cartão, descartar esta leitura');

-- "chuva" acha "chuva" e "chovendo"? Só o primeiro: são raízes diferentes para o dicionário.
SELECT id, texto FROM observacoes
WHERE to_tsvector('portuguese', texto) @@ websearch_to_tsquery('portuguese', 'chuva');

-- websearch_to_tsquery aceita a sintaxe de buscador: aspas, OR, e - para excluir.
-- "cartão", mas sem "formigas". Maiúsculas não importam.
SELECT id, texto FROM observacoes
WHERE to_tsvector('portuguese', texto) @@ websearch_to_tsquery('portuguese', 'cartão -formigas')
ORDER BY id;`,
        },
        {
          t: 'texto',
          md: `Em tabela de verdade, guarda-se o \`tsvector\` numa **coluna gerada** com índice GIN, para não recalcular a cada busca. Para um buscador interno, isso dispensa um Elasticsearch. O limite aparece quando se precisa de sinônimos elaborados, correção ortográfica ou relevância ajustada a muitos sinais.

### 3. Vetores: busca por semelhança

Aqui a trilha encontra a de visão computacional. Um **embedding** é o vetor que um modelo (DINOv2, CLIP) produz para uma imagem: imagens parecidas têm vetores próximos. A extensão **pgvector** dá ao Postgres o tipo \`vector\` e os operadores de distância.

| Operador | Distância | Uso |
|---|---|---|
| \`<=>\` | cosseno | o padrão para embeddings |
| \`<->\` | euclidiana (L2) | |
| \`<#>\` | produto interno, negativo | vetores já normalizados |

O exemplo usa vetores de 3 dimensões, para caber na tela. Os de verdade têm de 384 a 1.536.`,
        },
        {
          t: 'codigo',
          titulo: 'pgvector: os recortes mais parecidos',
          rodar: 'sql',
          codigo: `CREATE TABLE recortes (
  id         int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  captura_id bigint REFERENCES capturas (id),
  rotulo     text,                       -- NULL = ainda não anotado
  embedding  vector(3) NOT NULL          -- na vida real: vector(384), vector(768)...
);

INSERT INTO recortes (captura_id, rotulo, embedding) VALUES
  (1, 'mariposa',   '[0.90, 0.10, 0.05]'), (2, 'mariposa',   '[0.85, 0.20, 0.10]'),
  (3, 'cigarrinha', '[0.10, 0.92, 0.08]'), (4, 'cigarrinha', '[0.15, 0.88, 0.12]'),
  (5, 'mosca',      '[0.08, 0.15, 0.95]'), (6, 'detrito',    '[0.50, 0.50, 0.50]'),
  (7, NULL,         '[0.88, 0.14, 0.07]'), (8, NULL,         '[0.60, 0.62, 0.15]');

-- Os 3 recortes ANOTADOS mais parecidos com o recorte 7, que não tem rótulo
SELECT r.id, r.rotulo, round((r.embedding <=> alvo.embedding)::numeric, 4) AS distancia
FROM recortes r, (SELECT embedding FROM recortes WHERE id = 7) AS alvo
WHERE r.rotulo IS NOT NULL
ORDER BY r.embedding <=> alvo.embedding
LIMIT 3;

-- Rotular pelo vizinho mais próximo, com a distância para decidir se dá para confiar
SELECT s.id AS sem_rotulo, v.rotulo AS sugestao, round(v.distancia::numeric, 4) AS distancia
FROM recortes s
CROSS JOIN LATERAL (
  SELECT r.rotulo, r.embedding <=> s.embedding AS distancia
  FROM recortes r WHERE r.rotulo IS NOT NULL
  ORDER BY r.embedding <=> s.embedding LIMIT 1
) v
WHERE s.rotulo IS NULL;

-- Índice aproximado (HNSW): troca um pouco de precisão por muita velocidade
CREATE INDEX recortes_embedding ON recortes USING hnsw (embedding vector_cosine_ops);`,
        },
        {
          t: 'texto',
          md: `O recorte 7 fica colado nas mariposas, a uma distância de 0,001. O 8 tem o "detrito" como vizinho mais próximo, mas a uma distância quase cem vezes maior: é o tipo de caso que vai para a fila de anotação humana, e não para o rótulo automático.

Onde isso entra num projeto de visão, com as lições da outra trilha:

| Uso | Consulta |
|---|---|
| **Achar duplicatas** antes de dividir treino e teste | pares com distância abaixo de um limite |
| **Aprendizado ativo por novidade** | imagens de produção mais distantes de tudo o que há no conjunto de treino |
| **Pré-anotação** | rótulo do vizinho mais próximo, quando a distância é pequena |
| **Busca por exemplo** | "mais imagens como esta", no painel |
| **Monitorar mudança nos dados** | distância média das capturas da semana ao conjunto de referência |

Com pgvector, os embeddings moram **junto dos dados relacionais**: dá para filtrar por usina e data e ordenar por semelhança na mesma consulta, com transação e backup. Um banco vetorial dedicado só se justifica em escala de centenas de milhões de vetores.

O índice **HNSW** faz busca **aproximada**: pode não devolver exatamente os vizinhos mais próximos. O parâmetro \`hnsw.ef_search\` regula a troca entre precisão e velocidade. E um filtro \`WHERE\` muito restritivo combinado com índice aproximado pode devolver menos linhas que o \`LIMIT\`: vale testar com os seus dados.`,
        },
        {
          t: 'quiz',
          pergunta: 'Qual recurso do Postgres acha "Santa Helena" quando o usuário digita "santa elena"?',
          opcoes: [
            '`LIKE \'%santa elena%\'`',
            'A extensão pg_trgm: semelhança por trigramas, com o operador `%` e ordenação por `<->`.',
            '`ILIKE`',
            'Um índice B-tree.',
          ],
          correta: 1,
          explicacao: '`LIKE` e `ILIKE` exigem que o trecho exista no texto. Trigramas medem semelhança, e por isso toleram letra faltando, sobrando ou trocada.',
        },
        {
          t: 'quiz',
          pergunta: 'Por que guardar embeddings de imagens no próprio PostgreSQL, com pgvector, em vez de num banco vetorial separado?',
          opcoes: [
            'Porque é sempre mais rápido.',
            'Porque os vetores ficam junto dos dados relacionais: filtros, junções, transações e backup numa peça só. O banco dedicado só compensa em escala muito grande.',
            'Porque o pgvector não tem índice aproximado.',
            'Porque bancos vetoriais não aceitam imagens.',
          ],
          correta: 1,
          explicacao: 'Menos uma peça para operar e sincronizar. "Capturas da usina 2, em maio, mais parecidas com esta" é uma consulta só.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'operacao',
      titulo: 'Do banco de estudo ao banco de produção',
      minutos: 13,
      resumo: 'Migrações, conexões, permissões, backup e o serviço gerenciado. E o que o ORM faz por você, e contra você.',
      blocos: [
        {
          t: 'texto',
          md: `Escrever SQL é metade do trabalho. A outra metade é o banco **continuar funcionando** enquanto o sistema muda. Esta lição é o mapa do que um desenvolvedor de backend precisa conhecer, mesmo havendo alguém de infraestrutura.

### Migrações: o esquema versionado

O esquema do banco muda junto com o código, e a mudança precisa ser **repetível**: aplicada do mesmo jeito no computador de cada desenvolvedor, na homologação e na produção. Uma **migração** é um arquivo, numerado e guardado no repositório, com a alteração. Uma tabela de controle registra quais já rodaram.

No mundo .NET, o **EF Core** gera as migrações a partir das classes. Também são comuns ferramentas de SQL puro: Flyway, DbUp, Atlas. As regras valem para todas:

1. **Migração aplicada não se edita.** Cria-se a seguinte.
2. **Toda mudança passa por migração.** Nada de \`ALTER TABLE\` à mão em produção.
3. **Revisar o SQL gerado**, e não só as classes.`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Mudança', 'O risco em tabela grande e com tráfego', 'O jeito seguro'],
          linhas: [
            ['Criar índice', '`CREATE INDEX` bloqueia as escritas enquanto constrói', '`CREATE INDEX CONCURRENTLY`'],
            ['Coluna `NOT NULL` nova', 'sem valor padrão, falha; preencher tudo de uma vez trava', 'criar anulável → preencher em lotes → só então `SET NOT NULL`'],
            ['Renomear coluna', 'a versão antiga do aplicativo, ainda no ar, quebra', 'expandir e contrair: criar a nova, gravar nas duas, migrar a leitura, remover a antiga'],
            ['Remover coluna', 'idem', 'primeiro o código para de usar; a remoção vai num lançamento posterior'],
            ['Mudar o tipo', 'pode reescrever a tabela inteira sob trava', 'coluna nova, cópia em lotes, troca'],
            ['Chave estrangeira nova', 'valida todas as linhas sob trava', '`ADD CONSTRAINT ... NOT VALID` e depois `VALIDATE CONSTRAINT`'],
          ],
        },
        {
          t: 'texto',
          md: `O princípio por trás de quase todas: durante uma implantação, **a versão antiga e a nova do aplicativo rodam ao mesmo tempo**, contra o mesmo banco. Toda migração precisa ser compatível com as duas. Com um app de celular, em que versões antigas ficam meses em uso, isso vale em dobro.

### Conexões: caras e limitadas

No Postgres, cada conexão é um **processo** do sistema operacional. Abrir uma custa milissegundos e megabytes, e o servidor tem um teto (\`max_connections\`, tipicamente 100 a algumas centenas).

- O aplicativo usa um **pool**: um conjunto de conexões abertas e reaproveitadas. O Npgsql, o driver do .NET, faz isso por padrão.
- Com muitas instâncias do aplicativo, ou com funções *serverless*, a soma dos pools estoura o teto. Aí entra um **pooler externo**: o PgBouncer, que os serviços gerenciados oferecem embutido.
- O erro \`too many connections\` quase nunca se resolve aumentando o limite. Resolve-se achando quem não devolve a conexão.

### Permissões: o mínimo necessário

O aplicativo **não** se conecta como superusuário nem como dono das tabelas.

\`\`\`sql
CREATE ROLE app_api LOGIN PASSWORD '...';
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_api;

CREATE ROLE relatorios LOGIN PASSWORD '...';            -- o painel de BI só lê
GRANT SELECT ON ALL TABLES IN SCHEMA public TO relatorios;
\`\`\`

Um papel para as migrações (pode alterar o esquema), um para a API (lê e escreve dados), um só de leitura para relatórios. Uma falha de injeção de SQL na API, então, não consegue apagar uma tabela.

Para sistemas com vários clientes no mesmo banco, o Postgres tem **segurança em nível de linha** (*row-level security*): uma política faz cada usina enxergar só as próprias linhas, mesmo que a consulta esqueça o \`WHERE\`.`,
        },
        {
          t: 'codigo',
          titulo: 'Injeção de SQL, e por que parâmetros resolvem (para ler)',
          lang: 'csharp',
          codigo: `// ERRADO: o texto do usuário vira parte do comando.
// Se codigo for:  x'; DROP TABLE capturas; --   o banco executa os dois comandos.
var sql = $"SELECT * FROM armadilhas WHERE codigo = '{codigo}'";

// CERTO: o comando e o valor viajam separados. O valor nunca é interpretado como SQL.
await using var comando = new NpgsqlCommand("SELECT * FROM armadilhas WHERE codigo = $1", conexao);
comando.Parameters.AddWithValue(codigo);

// Com EF Core, a consulta LINQ já é parametrizada:
var armadilha = await db.Armadilhas.FirstOrDefaultAsync(a => a.Codigo == codigo);

// E a interpolação do EF também é segura, porque ele a converte em parâmetro:
var lista = await db.Armadilhas.FromSql($"SELECT * FROM armadilhas WHERE codigo = {codigo}").ToListAsync();`,
        },
        {
          t: 'texto',
          md: `### O ORM: o que ele faz por você, e contra você

Um **ORM** (EF Core no .NET, SQLAlchemy no Python, Prisma e Drizzle no Node) traduz objetos em SQL. Ganha-se produtividade, migrações e consultas parametrizadas. Perde-se a visão do SQL que roda, e o defeito mais famoso nasce aí.

**O problema N+1.** Buscar 100 capturas e, num laço, acessar a armadilha de cada uma dispara 1 consulta para a lista e mais 100, uma por captura. Cada uma é rápida. Juntas, com a ida e volta de rede, viram segundos.`,
        },
        {
          t: 'codigo',
          titulo: 'N+1: cem consultas pequenas ou uma só',
          rodar: 'sql',
          codigo: `-- O que o código ingênuo faz: 1 consulta para a lista...
SELECT id, armadilha_id FROM capturas ORDER BY id LIMIT 3;
-- ...e depois UMA POR LINHA (aqui só três; em produção, uma por item da página):
SELECT codigo FROM armadilhas WHERE id = 1;
SELECT codigo FROM armadilhas WHERE id = 2;
SELECT codigo FROM armadilhas WHERE id = 3;

-- O que deveria acontecer: uma consulta, com a junção.
-- No EF Core: .Include(c => c.Armadilha), ou uma projeção com .Select(...)
SELECT c.id, a.codigo, u.nome AS usina
FROM capturas c
JOIN armadilhas a ON a.id = c.armadilha_id
JOIN talhoes t    ON t.id = a.talhao_id
JOIN usinas u     ON u.id = t.usina_id
ORDER BY c.id LIMIT 3;`,
        },
        {
          t: 'texto',
          md: `A defesa é hábito: **ligar o registro das consultas em desenvolvimento** e olhar o que cada tela dispara. Uma tela que faz 200 consultas não tem problema de banco.

Usar ORM não dispensa saber SQL. O ORM resolve bem o CRUD. Relatório, agregação com janela e operação em lote costumam ficar melhores em SQL escrito à mão, que todo ORM permite executar.

### Backup, e o teste que quase ninguém faz

- **\`pg_dump\`**: cópia lógica, em SQL ou formato próprio. Boa para bancos pequenos e para mover dados.
- **Backup contínuo com recuperação pontual** (*point-in-time recovery*): cópia física mais o registro de transações. Permite voltar o banco a **qualquer instante**, por exemplo ao minuto anterior ao \`DELETE\` sem \`WHERE\`. É o que os serviços gerenciados fazem.
- **Backup que nunca foi restaurado é esperança.** Restaurar num ambiente de teste, periodicamente, é a única prova de que ele funciona.

### O serviço gerenciado

Em produção, raramente se instala o Postgres numa máquina. Usa-se um serviço que cuida de atualização, backup, réplica e monitoramento. Na Azure é o **Azure Database for PostgreSQL (Flexible Server)**, assunto da trilha de Azure. O que continua sendo problema seu: o esquema, as consultas, os índices, o número de conexões e quem tem permissão para quê.`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Lista de produção', ''],
          linhas: [
            ['Esquema', 'toda mudança por migração, revisada, compatível com a versão anterior do aplicativo'],
            ['Acesso', 'o aplicativo com papel de privilégio mínimo; senha fora do código, num cofre'],
            ['Conexões', 'pool configurado; pooler externo se houver muitas instâncias'],
            ['Consultas', 'sempre parametrizadas; registro de consultas lentas ligado; `pg_stat_statements`'],
            ['Tempo limite', '`statement_timeout` e `idle_in_transaction_session_timeout` para o papel do aplicativo'],
            ['Índices', 'nas chaves estrangeiras e nos filtros reais; criados com `CONCURRENTLY`'],
            ['Backup', 'recuperação pontual ligada; restauração testada'],
            ['Horário', '`timestamptz` em tudo; servidor e aplicativo em UTC'],
            ['Manutenção', 'autovacuum ligado (é o padrão); acompanhar tabelas com muita atualização'],
          ],
        },
        {
          t: 'quiz',
          pergunta: 'Por que "renomear uma coluna" numa única migração é arriscado em produção?',
          opcoes: [
            'Porque o Postgres não permite renomear.',
            'Porque durante a implantação a versão antiga do aplicativo ainda está no ar e procura o nome antigo. O caminho seguro é em etapas: criar a nova, gravar nas duas, migrar a leitura, remover a antiga.',
            'Porque apaga os dados.',
            'Porque exige reiniciar o servidor.',
          ],
          correta: 1,
          explicacao: 'É o padrão "expandir e contrair". Toda migração precisa conviver com a versão do aplicativo que está saindo e com a que está entrando.',
        },
        {
          t: 'quiz',
          pergunta: 'Uma tela lista 50 pedidos e leva 3 segundos. O registro mostra 51 consultas rápidas. Qual é o problema?',
          opcoes: [
            'Falta um índice.',
            'É o N+1: uma consulta para a lista e uma por item para buscar o dado relacionado. A correção é trazer tudo numa consulta, com junção (no EF Core, `Include` ou projeção).',
            'O banco está sem memória.',
            'O pool de conexões é pequeno.',
          ],
          correta: 1,
          explicacao: 'Cada consulta é rápida; o custo está na quantidade de idas e voltas. Só se enxerga olhando o registro das consultas que a tela dispara.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'projeto',
      titulo: 'Projeto: o relatório de infestação',
      minutos: 30,
      resumo: 'Quatro desafios encadeados, do filtro simples ao alerta com janela, sobre o banco de exemplo.',
      blocos: [
        {
          t: 'texto',
          md: `O agrônomo quer um relatório semanal: onde a infestação está subindo, e quais armadilhas pedem ação. São quatro consultas, cada uma um pouco além da anterior. É também o conjunto de consultas que a API do projeto integrador vai expor.

Lembre do modelo:

\`\`\`
usinas ──< talhoes ──< armadilhas ──< capturas ──< deteccoes
\`\`\`

Cada \`deteccao\` é um inseto. A contagem de uma captura é o número de detecções dela. Só capturas com \`situacao = 'processada'\` têm detecções.`,
        },
        {
          t: 'desafio-sql',
          ordenado: true,
          enunciado: `**1. Cobertura.** Para cada usina **ativa**, mostre o nome, o número de armadilhas ativas e o número de armadilhas ativas que **não tiveram nenhuma captura na semana de 10 a 16 de agosto de 2026**. Ordene pelo nome.

Colunas: \`usina\`, \`armadilhas\`, \`sem_leitura_na_semana\`.`,
          inicial: `SELECT u.nome AS usina, count(a.id) AS armadilhas
FROM usinas u
JOIN talhoes t    ON t.usina_id = u.id
JOIN armadilhas a ON a.talhao_id = t.id AND a.ativa
WHERE u.ativa
GROUP BY u.nome
ORDER BY u.nome;`,
          solucao: `SELECT u.nome AS usina,
       count(a.id) AS armadilhas,
       count(a.id) FILTER (WHERE NOT EXISTS (
         SELECT 1 FROM capturas c
         WHERE c.armadilha_id = a.id
           AND c.capturada_em >= '2026-08-10' AND c.capturada_em < '2026-08-17'
       )) AS sem_leitura_na_semana
FROM usinas u
JOIN talhoes t    ON t.usina_id = u.id
JOIN armadilhas a ON a.talhao_id = t.id AND a.ativa
WHERE u.ativa
GROUP BY u.nome
ORDER BY u.nome;`,
          dica: 'Uma terceira coluna com `count(a.id) FILTER (WHERE NOT EXISTS (...))`. A subconsulta procura capturas daquela armadilha com data `>= \'2026-08-10\'` e `< \'2026-08-17\'`.',
        },
        {
          t: 'desafio-sql',
          ordenado: true,
          enunciado: `**2. Média por captura.** Para cada usina, a **média de insetos por captura processada**, mês a mês. Capturas processadas sem nenhum inseto contam como zero na média.

Colunas: \`usina\`, \`mes\` (o primeiro dia do mês, como \`date\`), \`media\` (arredondada para 1 casa). Ordene por usina e mês.`,
          inicial: `SELECT u.nome AS usina, date_trunc('month', c.capturada_em)::date AS mes, count(d.id) AS insetos
FROM usinas u
JOIN talhoes t    ON t.usina_id = u.id
JOIN armadilhas a ON a.talhao_id = t.id
JOIN capturas c   ON c.armadilha_id = a.id
JOIN deteccoes d  ON d.captura_id = c.id
GROUP BY usina, mes
ORDER BY usina, mes;`,
          solucao: `SELECT u.nome AS usina,
       date_trunc('month', c.capturada_em)::date AS mes,
       round(count(d.id)::numeric / count(DISTINCT c.id), 1) AS media
FROM usinas u
JOIN talhoes t    ON t.usina_id = u.id
JOIN armadilhas a ON a.talhao_id = t.id
JOIN capturas c   ON c.armadilha_id = a.id AND c.situacao = 'processada'
LEFT JOIN deteccoes d ON d.captura_id = c.id
GROUP BY usina, mes
ORDER BY usina, mes;`,
          dica: '`LEFT JOIN deteccoes` para não perder as capturas sem inseto; filtrar `situacao = \'processada\'`; a média é `count(d.id)::numeric / count(DISTINCT c.id)`, com o `::numeric` para a divisão não ser inteira.',
        },
        {
          t: 'desafio-sql',
          ordenado: true,
          enunciado: `**3. Tendência.** Para a usina **Santa Helena**, o total de insetos por semana e a **variação percentual** em relação à semana anterior.

Colunas: \`semana\` (\`date\`, o início da semana), \`insetos\`, \`variacao_pct\` (arredondada para 1 casa; \`NULL\` na primeira semana). Só capturas processadas. Ordene pela semana.`,
          inicial: `SELECT date_trunc('week', c.capturada_em)::date AS semana, count(d.id) AS insetos
FROM capturas c
JOIN armadilhas a ON a.id = c.armadilha_id
JOIN talhoes t    ON t.id = a.talhao_id
JOIN usinas u     ON u.id = t.usina_id
LEFT JOIN deteccoes d ON d.captura_id = c.id
WHERE u.nome = 'Santa Helena' AND c.situacao = 'processada'
GROUP BY semana
ORDER BY semana;`,
          solucao: `WITH semanal AS (
  SELECT date_trunc('week', c.capturada_em)::date AS semana, count(d.id) AS insetos
  FROM capturas c
  JOIN armadilhas a ON a.id = c.armadilha_id
  JOIN talhoes t    ON t.id = a.talhao_id
  JOIN usinas u     ON u.id = t.usina_id
  LEFT JOIN deteccoes d ON d.captura_id = c.id
  WHERE u.nome = 'Santa Helena' AND c.situacao = 'processada'
  GROUP BY semana
)
SELECT semana,
       insetos,
       round(100.0 * (insetos - lag(insetos) OVER (ORDER BY semana)) / nullif(lag(insetos) OVER (ORDER BY semana), 0), 1) AS variacao_pct
FROM semanal
ORDER BY semana;`,
          dica: 'Ponha a consulta inicial numa CTE. Fora dela, `lag(insetos) OVER (ORDER BY semana)` dá a semana anterior. A variação é `100.0 * (atual - anterior) / anterior`; `nullif(anterior, 0)` evita divisão por zero.',
        },
        {
          t: 'desafio-sql',
          ordenado: true,
          enunciado: `**4. Alerta.** As armadilhas cuja **captura processada mais recente** teve **7 insetos ou mais**.

Colunas: \`usina\`, \`armadilha\` (o código), \`capturada_em\`, \`insetos\`. Ordene da maior contagem para a menor e, no empate, pelo código da armadilha.`,
          inicial: `SELECT u.nome AS usina, a.codigo AS armadilha, c.capturada_em, count(d.id) AS insetos
FROM capturas c
JOIN armadilhas a ON a.id = c.armadilha_id
JOIN talhoes t    ON t.id = a.talhao_id
JOIN usinas u     ON u.id = t.usina_id
LEFT JOIN deteccoes d ON d.captura_id = c.id
WHERE c.situacao = 'processada'
GROUP BY u.nome, a.codigo, c.id
HAVING count(d.id) >= 7
ORDER BY insetos DESC, a.codigo;`,
          solucao: `WITH por_captura AS (
  SELECT c.id, c.armadilha_id, c.capturada_em, count(d.id) AS insetos,
         row_number() OVER (PARTITION BY c.armadilha_id ORDER BY c.capturada_em DESC) AS n
  FROM capturas c
  LEFT JOIN deteccoes d ON d.captura_id = c.id
  WHERE c.situacao = 'processada'
  GROUP BY c.id
)
SELECT u.nome AS usina, a.codigo AS armadilha, p.capturada_em, p.insetos
FROM por_captura p
JOIN armadilhas a ON a.id = p.armadilha_id
JOIN talhoes t    ON t.id = a.talhao_id
JOIN usinas u     ON u.id = t.usina_id
WHERE p.n = 1 AND p.insetos >= 7
ORDER BY p.insetos DESC, a.codigo;`,
          dica: 'O código inicial devolve TODAS as capturas com 7 ou mais, e não só a mais recente de cada armadilha. Numa CTE, conte os insetos por captura e numere com `row_number() OVER (PARTITION BY armadilha_id ORDER BY capturada_em DESC)`. Fora, filtre `n = 1 AND insetos >= 7`.',
        },
        {
          t: 'texto',
          md: `### Para ir além

- **Faça o desafio 4 rápido.** Rode com \`EXPLAIN ANALYZE\`. Que índice em \`capturas\` ajudaria a achar a captura mais recente de cada armadilha? E em \`deteccoes\`, que não tem índice na chave estrangeira \`captura_id\`?
- **Transforme o relatório em visão.** \`CREATE VIEW infestacao_semanal AS ...\` dá um nome à consulta. Uma \`MATERIALIZED VIEW\` guarda o resultado, para um painel que não pode recalcular a cada acesso.
- **Devolva JSON pronto.** Reescreva o desafio 1 para sair uma linha só, com um array de objetos, usando \`jsonb_agg\`.

### O que você já sabe fazer

- Consultar com junções, agregações e janelas, sem cair nas armadilhas do \`NULL\` e da multiplicação de linhas.
- Modelar com os tipos certos e deixar o banco recusar dado inválido.
- Escrever com \`RETURNING\` e \`ON CONFLICT\`, e raciocinar sobre transações e concorrência.
- Usar \`jsonb\` e arrays com critério.
- Ler um plano de execução e escolher um índice.
- Buscar por texto aproximado, por palavras e por semelhança de vetores.
- Enxergar o que muda entre o banco de estudo e o de produção.

A trilha de **C# .NET** constrói a API que fala com este banco.`,
        },
        {
          t: 'quiz',
          pergunta: 'No desafio 2, por que `LEFT JOIN deteccoes` e não `JOIN`?',
          opcoes: [
            'Por desempenho.',
            'Porque capturas processadas sem nenhum inseto não têm linha em `deteccoes`; com `JOIN` elas sumiriam, e a média por captura sairia maior que a real.',
            'Porque `JOIN` não funciona com `GROUP BY`.',
            'Não faz diferença.',
          ],
          correta: 1,
          explicacao: 'Uma armadilha vazia é um dado: é o zero que puxa a média para baixo. Perder os zeros é um viés clássico em relatórios de contagem.',
        },
        {
          t: 'quiz',
          pergunta: 'O relatório semanal é pesado e o painel o consulta a cada carregamento de página. Qual recurso do Postgres ajuda sem mudar o aplicativo?',
          opcoes: [
            'Uma tabela temporária.',
            'Uma visão materializada: guarda o resultado da consulta, e é atualizada com `REFRESH MATERIALIZED VIEW` no intervalo que fizer sentido.',
            'Um gatilho em cada tabela.',
            'Aumentar `max_connections`.',
          ],
          correta: 1,
          explicacao: 'A visão comum recalcula a cada consulta. A materializada troca atualidade por velocidade, o que serve bem a relatórios que podem ter alguns minutos de atraso.',
        },
      ],
    },
  ],
};
