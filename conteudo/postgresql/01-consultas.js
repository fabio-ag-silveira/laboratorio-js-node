export const partida = {
  id: 'partida',
  titulo: 'Ponto de partida',
  cor: '#e08fb0',
  licoes: [
    {
      id: 'mapa',
      titulo: 'PostgreSQL para quem vem do MySQL',
      minutos: 10,
      resumo: 'O banco de exemplo, o que muda em relação ao MySQL, e como este laboratório roda um Postgres de verdade.',
      blocos: [
        {
          t: 'texto',
          md: `Você já escreve SQL. O MySQL e o PostgreSQL concordam em 90% da linguagem, e esta trilha gasta o tempo nos outros 10%, que são onde o Postgres é mais rigoroso e mais capaz, e no que todo desenvolvedor de backend precisa saber sobre índices, transações e operação.

Todo bloco de SQL desta trilha **executa de verdade**. O banco é o **PGlite**: o PostgreSQL 18 compilado para WebAssembly, rodando dentro do servidor do laboratório. Mesmo planejador, mesmos tipos, mesmas mensagens de erro.

Cada execução roda numa **cópia descartável** do banco. Pode apagar tabela, atualizar tudo sem \`WHERE\`, abrir e confirmar transação: o bloco seguinte começa do estado original.`,
        },
        {
          t: 'codigo',
          titulo: 'O banco de exemplo',
          rodar: 'sql',
          codigo: `-- Quantas linhas tem cada tabela
SELECT 'usinas' AS tabela, count(*) FROM usinas
UNION ALL SELECT 'talhoes', count(*) FROM talhoes
UNION ALL SELECT 'tecnicos', count(*) FROM tecnicos
UNION ALL SELECT 'armadilhas', count(*) FROM armadilhas
UNION ALL SELECT 'capturas', count(*) FROM capturas
UNION ALL SELECT 'deteccoes', count(*) FROM deteccoes;

-- Uma captura, com os metadados que o aplicativo envia
SELECT * FROM capturas ORDER BY id LIMIT 3;`,
        },
        {
          t: 'texto',
          md: `O domínio é o do resto do laboratório: monitoramento de pragas com armadilhas.

\`\`\`
usinas ──< talhoes ──< armadilhas ──< capturas ──< deteccoes
   └────< tecnicos ───────────────────────┘
\`\`\`

| Tabela | O que guarda | Irregularidade proposital |
|---|---|---|
| \`usinas\` | 4 usinas | uma está inativa e não tem talhões |
| \`talhoes\` | 12 talhões, com área e variedade | um não tem variedade (\`NULL\`) |
| \`tecnicos\` | 6 técnicos | uma não tem usina e nunca fez captura |
| \`armadilhas\` | 60 armadilhas, de três tipos | três foram desativadas |
| \`capturas\` | uma leitura por semana, de março a agosto de 2026 | semanas sem leitura; metadados JSON incompletos |
| \`deteccoes\` | os insetos que o modelo achou em cada foto | só existem para capturas já processadas |

As irregularidades são o que torna os exemplos honestos: banco de produção é assim.`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Assunto', 'MySQL', 'PostgreSQL'],
          linhas: [
            ['Aspas', '`"texto"` e `\'texto\'` são texto; crase para nomes', '`\'texto\'` é texto; **`"nome"` é identificador**. `WHERE nome = "Ana"` procura uma coluna chamada Ana'],
            ['Maiúsculas em nomes', 'depende do sistema de arquivos', 'tudo vira minúscula, a menos que esteja entre aspas duplas. Use `snake_case` e esqueça as aspas'],
            ['Comparação de texto', 'ignora maiúsculas, por padrão', 'diferencia. `ILIKE` para ignorar'],
            ['Chave automática', '`AUTO_INCREMENT`', '`GENERATED ... AS IDENTITY` (o antigo `SERIAL`)'],
            ['Booleano', '`TINYINT(1)`', '`boolean` de verdade: `true`, `false`'],
            ['Data e hora', '`DATETIME`, `TIMESTAMP`', '**`timestamptz`** quase sempre; `timestamp` sem fuso é armadilha'],
            ['Texto', '`VARCHAR(n)`, `TEXT`, `LONGTEXT`', '`text` para tudo; não há ganho em limitar com `varchar(n)`'],
            ['JSON', '`JSON`', '`jsonb`, com índice e operadores'],
            ['Devolver o que foi gravado', '`LAST_INSERT_ID()`', '`INSERT ... RETURNING *`'],
            ['Inserir ou atualizar', '`ON DUPLICATE KEY UPDATE`', '`ON CONFLICT (...) DO UPDATE`'],
            ['Limite', '`LIMIT 10, 20`', '`LIMIT 20 OFFSET 10`'],
            ['Concatenar', '`CONCAT(a, b)`', '`a || b` (e `concat()` também)'],
            ['`GROUP BY`', 'historicamente aceita coluna fora do grupo', 'erro, sempre'],
            ['DDL em transação', 'confirma sozinho', '`CREATE`, `ALTER` e `DROP` entram na transação e podem ser desfeitos'],
            ['Conversão de tipo', 'implícita e permissiva (`\'abc\' = 0` é verdadeiro)', 'estrita; converte-se com `::tipo` ou `CAST`'],
          ],
        },
        {
          t: 'codigo',
          titulo: 'Três diferenças que dão erro no primeiro dia',
          rodar: 'sql',
          codigo: `-- 1. Aspas simples para texto. E a conversão com "::".
SELECT 'Boa Vista' AS texto, '42'::integer + 1 AS numero, now()::date AS hoje;

-- 2. Comparação de texto diferencia maiúsculas; ILIKE não.
SELECT nome FROM usinas WHERE nome LIKE 'boa%';      -- nenhuma linha
SELECT nome FROM usinas WHERE nome ILIKE 'boa%';     -- uma linha

-- 3. RETURNING: o INSERT devolve a linha criada, com o id e os valores padrão.
INSERT INTO usinas (nome, uf) VALUES ('Três Barras', 'PR') RETURNING *;`,
        },
        {
          t: 'texto',
          md: `### Para rodar um Postgres "de verdade" depois

O laboratório basta para a trilha. Quando quiser um servidor completo, com \`psql\` e conexão de fora:

\`\`\`bash
docker run --name pg -e POSTGRES_PASSWORD=estudo -p 5432:5432 -d postgres:18
docker exec -it pg psql -U postgres
\`\`\`

| No \`psql\` | Faz |
|---|---|
| \`\\dt\` | lista as tabelas |
| \`\\d capturas\` | descreve a tabela: colunas, índices, restrições |
| \`\\x\` | alterna a exibição "expandida", uma coluna por linha |
| \`\\timing\` | mostra o tempo de cada comando |
| \`\\i arquivo.sql\` | executa um arquivo |
| \`\\q\` | sai |

Como cliente gráfico, o **DBeaver** e o **pgAdmin** são os mais comuns, e a extensão de PostgreSQL do VS Code resolve o dia a dia.

### A trilha

- **1 · Consultas**: filtros e \`NULL\`, junções, agregação, janelas e CTEs.
- **2 · Modelagem e escrita**: tipos e restrições, escrita e transações, JSONB e arrays.
- **3 · Desempenho e produção**: índices e \`EXPLAIN\`, busca textual e vetores, operação, e o projeto.`,
        },
        {
          t: 'quiz',
          pergunta: 'No PostgreSQL, o que faz `SELECT * FROM usinas WHERE nome = "Boa Vista"`?',
          opcoes: [
            'Devolve a usina Boa Vista.',
            'Dá erro: aspas duplas delimitam um identificador, e não existe uma coluna chamada "Boa Vista". Texto vai entre aspas simples.',
            'Devolve todas as usinas.',
            'Compara ignorando maiúsculas.',
          ],
          correta: 1,
          explicacao: 'É o tropeço número um de quem chega do MySQL. Aspas simples para valores, aspas duplas (raramente necessárias) para nomes de tabela e coluna.',
        },
        {
          t: 'quiz',
          pergunta: 'Por que neste laboratório um bloco pode rodar `DROP TABLE capturas` sem estragar as lições seguintes?',
          opcoes: [
            'Porque o comando é ignorado.',
            'Porque cada execução acontece numa cópia descartável do banco-base; a cópia é jogada fora ao fim.',
            'Porque o Postgres não permite apagar tabelas.',
            'Porque há um backup a cada minuto.',
          ],
          correta: 1,
          explicacao: 'O servidor clona o banco para cada bloco. É por isso que você pode, e deve, experimentar comandos destrutivos aqui.',
        },
      ],
    },
  ],
};

export const consultas = {
  id: 'consultas',
  titulo: 'Consultas',
  cor: '#e08fb0',
  licoes: [
    // ------------------------------------------------------------------
    {
      id: 'filtros-e-null',
      titulo: 'Filtros, ordenação e a lógica do NULL',
      minutos: 12,
      resumo: 'O SELECT que você já conhece, os atalhos do Postgres e a lógica de três valores que causa os bugs mais silenciosos.',
      blocos: [
        {
          t: 'texto',
          md: `A ordem em que se **escreve** um \`SELECT\` não é a ordem em que ele é **executado**. Saber a ordem real explica por que um apelido de coluna funciona no \`ORDER BY\` e não no \`WHERE\`:

\`\`\`
escrita:    SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT
execução:   FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT
\`\`\`

O \`WHERE\` roda antes do \`SELECT\`: os apelidos ainda não existem.`,
        },
        {
          t: 'codigo',
          titulo: 'Filtros do dia a dia',
          rodar: 'sql',
          codigo: `-- IN, BETWEEN, ordenação por mais de uma coluna
SELECT codigo, tipo, instalada_em
FROM armadilhas
WHERE tipo IN ('adesiva azul', 'feromônio')
  AND instalada_em BETWEEN '2026-01-10' AND '2026-01-20'
ORDER BY tipo, instalada_em DESC
LIMIT 6;

-- CASE: uma coluna calculada com regra
SELECT codigo, area_ha,
       CASE WHEN area_ha >= 50 THEN 'grande'
            WHEN area_ha >= 35 THEN 'médio'
            ELSE 'pequeno' END AS porte
FROM talhoes
WHERE usina_id = 1
ORDER BY area_ha DESC;

-- DISTINCT ON (só no Postgres): a primeira linha de cada grupo, pela ordenação.
-- Aqui: a captura mais recente de cada armadilha.
SELECT DISTINCT ON (armadilha_id) armadilha_id, capturada_em, situacao
FROM capturas
ORDER BY armadilha_id, capturada_em DESC
LIMIT 5;`,
        },
        {
          t: 'texto',
          md: `O \`DISTINCT ON\` resolve em três linhas o problema clássico de "o registro mais recente de cada grupo", que no MySQL pede subconsulta ou função de janela. A regra: o \`ORDER BY\` começa pelas colunas do \`DISTINCT ON\`, e o que vem depois decide **qual** linha de cada grupo fica.

### NULL não é um valor

\`NULL\` significa "desconhecido". Qualquer comparação com o desconhecido dá... desconhecido. O SQL tem **três** valores lógicos: verdadeiro, falso e \`NULL\`. E o \`WHERE\` só deixa passar o que é **verdadeiro**.`,
        },
        {
          t: 'codigo',
          titulo: 'A lógica de três valores',
          rodar: 'sql',
          codigo: `-- Comparar com NULL nunca é verdadeiro. Nem NULL = NULL.
SELECT 1 = NULL AS "1 = NULL", NULL = NULL AS "NULL = NULL", NULL IS NULL AS "NULL IS NULL",
       NULL <> 'CTC4' AS "NULL <> texto";

-- Há 12 talhões. Quantos são CTC4, e quantos NÃO são?
SELECT count(*) FILTER (WHERE variedade = 'CTC4')  AS ctc4,
       count(*) FILTER (WHERE variedade <> 'CTC4') AS nao_ctc4,
       count(*)                                    AS total
FROM talhoes;

-- 3 + 8 = 11. O talhão sem variedade não está em nenhum dos dois grupos.
-- IS DISTINCT FROM trata NULL como um valor comparável:
SELECT count(*) AS nao_ctc4_de_verdade FROM talhoes WHERE variedade IS DISTINCT FROM 'CTC4';`,
        },
        {
          t: 'texto',
          md: `É o bug mais silencioso do SQL: "todos os que não são X" **exclui os que não têm valor**, e o relatório fecha com uma linha a menos sem erro nenhum.

| Ferramenta | Para quê |
|---|---|
| \`IS NULL\`, \`IS NOT NULL\` | o único jeito de testar \`NULL\` |
| \`IS DISTINCT FROM\` | "diferente", contando \`NULL\` como valor |
| \`coalesce(a, b, ...)\` | o primeiro que não for \`NULL\`: \`coalesce(variedade, 'não informada')\` |
| \`nullif(a, b)\` | devolve \`NULL\` se \`a = b\`; clássico para evitar divisão por zero: \`x / nullif(total, 0)\` |
| \`NULLS FIRST\`, \`NULLS LAST\` | onde os \`NULL\` ficam no \`ORDER BY\` (no Postgres, por padrão, no fim em ordem crescente) |

A armadilha irmã: **\`NOT IN\` com uma lista que contém \`NULL\` não devolve nada.** \`x NOT IN (1, NULL)\` vira \`x <> 1 AND x <> NULL\`, e o segundo termo nunca é verdadeiro. Prefira \`NOT EXISTS\`.`,
        },
        {
          t: 'codigo',
          titulo: 'NOT IN com NULL: a consulta que devolve vazio',
          rodar: 'sql',
          codigo: `-- Usinas em que nenhum técnico trabalha. Um técnico tem usina_id NULL.
SELECT nome FROM usinas
WHERE id NOT IN (SELECT usina_id FROM tecnicos);          -- vazio!

-- O mesmo com NOT EXISTS: correto.
SELECT nome FROM usinas u
WHERE NOT EXISTS (SELECT 1 FROM tecnicos t WHERE t.usina_id = u.id);`,
        },
        {
          t: 'desafio-sql',
          ordenado: true,
          enunciado: `Liste o **código** e a **variedade** dos talhões da usina 2, em ordem de código. Onde a variedade for desconhecida, mostre o texto \`não informada\`.`,
          inicial: `SELECT codigo, variedade
FROM talhoes
WHERE usina_id = 2
ORDER BY codigo;`,
          solucao: `SELECT codigo, coalesce(variedade, 'não informada') AS variedade
FROM talhoes
WHERE usina_id = 2
ORDER BY codigo;`,
          dica: '`coalesce(coluna, valor)` devolve o primeiro argumento que não é `NULL`.',
        },
        {
          t: 'quiz',
          pergunta: 'Uma tabela tem 100 linhas; em 10 delas a coluna `status` é NULL. Quantas linhas `WHERE status <> \'ativo\'` pode devolver, no máximo?',
          opcoes: ['100', '90: as linhas com NULL nunca passam, porque `NULL <> \'ativo\'` não é verdadeiro.', '10', 'Depende do índice.'],
          correta: 1,
          explicacao: 'A comparação com NULL resulta em NULL, e o WHERE só aceita verdadeiro. Para incluí-las: `status IS DISTINCT FROM \'ativo\'`.',
        },
        {
          t: 'quiz',
          pergunta: 'Por que um apelido definido no SELECT não pode ser usado no WHERE da mesma consulta?',
          opcoes: [
            'Porque apelidos só valem em subconsultas.',
            'Porque o WHERE é avaliado antes do SELECT: quando o filtro roda, o apelido ainda não existe.',
            'Porque o Postgres não tem apelidos.',
            'Pode, sim.',
          ],
          correta: 1,
          explicacao: 'A ordem lógica é FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY. Por isso o apelido funciona no ORDER BY e não no WHERE.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'juncoes',
      titulo: 'Junções',
      minutos: 14,
      resumo: 'Os tipos de JOIN vistos linha a linha, o anti-join, e as duas armadilhas que inflam ou encolhem um relatório.',
      blocos: [
        {
          t: 'texto',
          md: `Uma junção combina linhas de duas tabelas segundo uma condição. O que muda entre os tipos é **o que acontece com as linhas que não acham par**.

O painel tem duas tabelas pequenas com as irregularidades do banco de exemplo: uma usina sem talhões e um talhão sem usina. Troque o tipo e observe as linhas em amarelo.`,
        },
        { t: 'visual', componente: 'sql/juncoes' },
        {
          t: 'codigo',
          titulo: 'INNER e LEFT no banco de exemplo',
          rodar: 'sql',
          codigo: `-- INNER: só usinas que têm talhão. Rio Claro some.
SELECT u.nome, count(*) AS talhoes
FROM usinas u
JOIN talhoes t ON t.usina_id = u.id
GROUP BY u.nome
ORDER BY u.nome;

-- LEFT: todas as usinas. Repare no count(t.id), e não count(*).
SELECT u.nome, count(t.id) AS talhoes, count(*) AS linhas
FROM usinas u
LEFT JOIN talhoes t ON t.usina_id = u.id
GROUP BY u.nome
ORDER BY u.nome;`,
        },
        {
          t: 'texto',
          md: `No segundo resultado, Rio Claro aparece com **0 talhões e 1 linha**. O \`LEFT JOIN\` produz uma linha para a usina mesmo sem par, com as colunas de \`talhoes\` em \`NULL\`. \`count(*)\` conta essa linha. \`count(t.id)\` conta só os valores não nulos. Confundir os dois faz toda usina vazia aparecer com "1".

### Anti-join: o que **não** tem par

"Técnicos que nunca fizeram captura", "armadilhas sem leitura na semana": são perguntas sobre ausência. Há duas formas equivalentes, e o planejador do Postgres trata as duas bem.`,
        },
        {
          t: 'codigo',
          titulo: 'Quem nunca fez captura',
          rodar: 'sql',
          codigo: `-- Forma 1: LEFT JOIN e filtrar onde não houve par
SELECT t.nome
FROM tecnicos t
LEFT JOIN capturas c ON c.tecnico_id = t.id
WHERE c.id IS NULL;

-- Forma 2: NOT EXISTS (diz a intenção com mais clareza)
SELECT t.nome
FROM tecnicos t
WHERE NOT EXISTS (SELECT 1 FROM capturas c WHERE c.tecnico_id = t.id);`,
        },
        {
          t: 'texto',
          md: `### Armadilha 1: o filtro que transforma LEFT em INNER

A condição no \`ON\` decide **quais pares se formam**. A condição no \`WHERE\` filtra **o resultado já montado**. Num \`LEFT JOIN\`, pôr no \`WHERE\` um filtro sobre a tabela da direita elimina as linhas sem par, que têm \`NULL\` ali.`,
        },
        {
          t: 'codigo',
          titulo: 'Filtro no ON contra filtro no WHERE',
          rodar: 'sql',
          codigo: `-- Quero TODAS as usinas, com a contagem de talhões grandes (50 ha ou mais).

-- Errado: o WHERE descarta as usinas sem talhão grande
SELECT u.nome, count(t.id) AS talhoes_grandes
FROM usinas u
LEFT JOIN talhoes t ON t.usina_id = u.id
WHERE t.area_ha >= 50
GROUP BY u.nome ORDER BY u.nome;

-- Certo: o filtro faz parte da condição da junção
SELECT u.nome, count(t.id) AS talhoes_grandes
FROM usinas u
LEFT JOIN talhoes t ON t.usina_id = u.id AND t.area_ha >= 50
GROUP BY u.nome ORDER BY u.nome;`,
        },
        {
          t: 'texto',
          md: `### Armadilha 2: duas relações "um para muitos" multiplicam as linhas

Juntar uma usina aos seus talhões **e** aos seus técnicos na mesma consulta produz uma linha para cada **combinação** de talhão e técnico. As contagens saem infladas, e a soma de qualquer coisa sai errada.`,
        },
        {
          t: 'codigo',
          titulo: 'O relatório que conta em dobro',
          rodar: 'sql',
          codigo: `-- Boa Vista tem 5 talhões e 2 técnicos. Esta consulta diz 10 e 10.
SELECT u.nome, count(t.id) AS talhoes, count(tc.id) AS tecnicos
FROM usinas u
LEFT JOIN talhoes  t  ON t.usina_id  = u.id
LEFT JOIN tecnicos tc ON tc.usina_id = u.id
GROUP BY u.nome ORDER BY u.nome;

-- Conserto rápido: contar valores distintos
SELECT u.nome, count(DISTINCT t.id) AS talhoes, count(DISTINCT tc.id) AS tecnicos
FROM usinas u
LEFT JOIN talhoes  t  ON t.usina_id  = u.id
LEFT JOIN tecnicos tc ON tc.usina_id = u.id
GROUP BY u.nome ORDER BY u.nome;

-- Conserto que também serve para somas: agregar ANTES de juntar
SELECT u.nome, coalesce(t.n, 0) AS talhoes, coalesce(t.area, 0) AS area_total, coalesce(tc.n, 0) AS tecnicos
FROM usinas u
LEFT JOIN (SELECT usina_id, count(*) AS n, sum(area_ha) AS area FROM talhoes GROUP BY usina_id) t  ON t.usina_id = u.id
LEFT JOIN (SELECT usina_id, count(*) AS n FROM tecnicos GROUP BY usina_id) tc ON tc.usina_id = u.id
ORDER BY u.nome;`,
        },
        {
          t: 'nota',
          estilo: 'pegadinha',
          md: `**O \`count(DISTINCT ...)\` esconde o problema, não resolve.** Ele acerta a contagem, mas uma \`sum(area_ha)\` na mesma consulta continuaria somando cada talhão uma vez por técnico. Quando há mais de uma relação "para muitos", agregue cada uma na sua subconsulta e só depois junte. O teste de sanidade: conferir o total com um \`SELECT\` simples na tabela de origem.`,
        },
        {
          t: 'desafio-sql',
          ordenado: true,
          enunciado: `Liste **todas** as usinas com o número de **armadilhas ativas** de cada uma, da que tem mais para a que tem menos. Colunas: nome da usina e quantidade. Usina sem armadilha aparece com zero.`,
          inicial: `SELECT u.nome, count(*) AS armadilhas_ativas
FROM usinas u
JOIN talhoes t ON t.usina_id = u.id
JOIN armadilhas a ON a.talhao_id = t.id
WHERE a.ativa
GROUP BY u.nome
ORDER BY armadilhas_ativas DESC;`,
          solucao: `SELECT u.nome, count(a.id) AS armadilhas_ativas
FROM usinas u
LEFT JOIN talhoes t ON t.usina_id = u.id
LEFT JOIN armadilhas a ON a.talhao_id = t.id AND a.ativa
GROUP BY u.nome
ORDER BY armadilhas_ativas DESC;`,
          dica: 'Três consertos: `LEFT JOIN` nas duas junções, o filtro `a.ativa` dentro do `ON`, e `count(a.id)` no lugar de `count(*)`.',
        },
        {
          t: 'quiz',
          pergunta: 'Num `LEFT JOIN`, qual é a diferença entre `count(*)` e `count(direita.id)`?',
          opcoes: [
            'Nenhuma.',
            '`count(*)` conta linhas, inclusive a linha "sem par" que o LEFT JOIN gera; `count(direita.id)` ignora os NULL e conta só os pares reais.',
            '`count(*)` é mais lento.',
            '`count(direita.id)` conta valores distintos.',
          ],
          correta: 1,
          explicacao: 'Uma usina sem talhões gera uma linha com as colunas da direita em NULL. Contar essa linha como "1 talhão" é o erro clássico.',
        },
        {
          t: 'quiz',
          pergunta: 'Um relatório junta `pedidos` a `itens` e a `pagamentos`, e o total faturado sai maior que o real. Qual é a causa provável?',
          opcoes: [
            'Falta um índice.',
            'As duas relações "um para muitos" se multiplicam: cada item aparece uma vez para cada pagamento do pedido, e a soma conta valores repetidos.',
            'O `JOIN` deveria ser `LEFT JOIN`.',
            'Arredondamento de `numeric`.',
          ],
          correta: 1,
          explicacao: 'É o "fan-out". A saída é agregar cada relação separadamente, numa subconsulta ou CTE, antes de juntar.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'agregacao',
      titulo: 'Agregação',
      minutos: 11,
      resumo: 'GROUP BY, HAVING, o FILTER do Postgres e as séries de datas que preenchem os buracos de um gráfico.',
      blocos: [
        {
          t: 'texto',
          md: `Agregar é reduzir muitas linhas a uma por grupo. A regra do \`GROUP BY\`, que o Postgres faz cumprir: toda coluna do \`SELECT\` ou está no \`GROUP BY\`, ou está dentro de uma função de agregação.

| | |
|---|---|
| \`WHERE\` | filtra **linhas**, antes de agrupar |
| \`HAVING\` | filtra **grupos**, depois de agregar |
| \`count(*)\` | linhas |
| \`count(coluna)\` | valores não nulos |
| \`count(DISTINCT coluna)\` | valores diferentes |
| \`sum\`, \`avg\`, \`min\`, \`max\` | ignoram \`NULL\` |
| \`string_agg(col, ', ')\`, \`array_agg(col)\`, \`jsonb_agg(...)\` | juntam os valores do grupo num texto, num array, num JSON |`,
        },
        {
          t: 'codigo',
          titulo: 'Infestação por usina e por classe',
          rodar: 'sql',
          codigo: `-- Insetos detectados por usina, com a média por captura processada
SELECT u.nome,
       count(DISTINCT c.id)                                  AS capturas,
       count(d.id)                                           AS insetos,
       round(count(d.id)::numeric / count(DISTINCT c.id), 1) AS por_captura
FROM usinas u
JOIN talhoes t    ON t.usina_id = u.id
JOIN armadilhas a ON a.talhao_id = t.id
JOIN capturas c   ON c.armadilha_id = a.id AND c.situacao = 'processada'
LEFT JOIN deteccoes d ON d.captura_id = c.id
GROUP BY u.nome
ORDER BY por_captura DESC;

-- HAVING: só as armadilhas com mais de 170 insetos no período
SELECT a.codigo, count(d.id) AS insetos
FROM armadilhas a
JOIN capturas c  ON c.armadilha_id = a.id
JOIN deteccoes d ON d.captura_id = c.id
GROUP BY a.codigo
HAVING count(d.id) > 170
ORDER BY insetos DESC;`,
        },
        {
          t: 'texto',
          md: `Repare em \`count(d.id)::numeric\`. Dividir dois inteiros no Postgres dá um **inteiro**: \`7 / 2\` é \`3\`. Converter um dos lados resolve.

### FILTER: várias contagens condicionais numa passada

É o recurso do Postgres que mais limpa relatórios. Em vez de \`sum(CASE WHEN ... THEN 1 ELSE 0 END)\`, que é o que o MySQL obriga a escrever:`,
        },
        {
          t: 'codigo',
          titulo: 'FILTER e date_trunc: uma tabela de resumo por mês',
          rodar: 'sql',
          codigo: `SELECT date_trunc('month', c.capturada_em)::date           AS mes,
       count(*)                                            AS capturas,
       count(*) FILTER (WHERE c.situacao = 'rejeitada')    AS rejeitadas,
       count(*) FILTER (WHERE c.metadados->>'chuva' = 'true') AS com_chuva,
       round(avg((c.metadados->>'nitidez')::int))          AS nitidez_media
FROM capturas c
GROUP BY mes
ORDER BY mes;

-- Pivô: uma coluna por classe de inseto
SELECT u.nome,
       count(*) FILTER (WHERE d.classe = 'mariposa')   AS mariposa,
       count(*) FILTER (WHERE d.classe = 'cigarrinha') AS cigarrinha,
       count(*) FILTER (WHERE d.classe = 'mosca')      AS mosca
FROM deteccoes d
JOIN capturas c   ON c.id = d.captura_id
JOIN armadilhas a ON a.id = c.armadilha_id
JOIN talhoes t    ON t.id = a.talhao_id
JOIN usinas u     ON u.id = t.usina_id
GROUP BY u.nome
ORDER BY u.nome;`,
        },
        {
          t: 'texto',
          md: `\`date_trunc('month', data)\` arredonda a data para o início do mês: é o jeito de agrupar por dia, semana, mês ou hora. E \`GROUP BY mes\` usa o **apelido** do \`SELECT\`, uma gentileza do Postgres.

### Os buracos da série

Um gráfico de capturas por dia precisa de um ponto **para cada dia**, inclusive os dias sem captura. \`GROUP BY\` só devolve grupos que existem. A saída é gerar o calendário com \`generate_series\` e juntar os dados nele.`,
        },
        {
          t: 'codigo',
          titulo: 'generate_series: o calendário que preenche os dias vazios',
          rodar: 'sql',
          codigo: `-- Capturas por dia na primeira quinzena de março, sem pular os dias vazios
SELECT dia::date,
       (ARRAY['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'])[extract(dow FROM dia)::int + 1] AS dia_da_semana,
       count(c.id)           AS capturas
FROM generate_series('2026-03-01'::date, '2026-03-14'::date, interval '1 day') AS dia
LEFT JOIN capturas c ON c.capturada_em >= dia AND c.capturada_em < dia + interval '1 day'
GROUP BY dia
ORDER BY dia;`,
        },
        {
          t: 'nota',
          estilo: 'dica',
          md: `**Intervalo de datas: fechado no início, aberto no fim.** \`capturada_em >= dia AND capturada_em < dia + interval '1 day'\` é a forma à prova de erro. \`BETWEEN '2026-03-01' AND '2026-03-31'\` com \`timestamptz\` perde tudo o que aconteceu no dia 31 depois da meia-noite. E a forma com intervalo ainda deixa o banco usar um índice na coluna, coisa que \`date(capturada_em) = '2026-03-01'\` impede.`,
        },
        {
          t: 'desafio-sql',
          ordenado: true,
          enunciado: `Para cada **tipo** de armadilha, mostre: o tipo, o número de armadilhas, e quantas delas estão **inativas**. Ordene pelo tipo.`,
          inicial: `SELECT tipo, count(*) AS armadilhas
FROM armadilhas
GROUP BY tipo
ORDER BY tipo;`,
          solucao: `SELECT tipo,
       count(*) AS armadilhas,
       count(*) FILTER (WHERE NOT ativa) AS inativas
FROM armadilhas
GROUP BY tipo
ORDER BY tipo;`,
          dica: 'Uma terceira coluna com `count(*) FILTER (WHERE NOT ativa)`.',
        },
        {
          t: 'quiz',
          pergunta: 'Qual é a diferença entre WHERE e HAVING?',
          opcoes: [
            'Nenhuma, são sinônimos.',
            'WHERE filtra linhas antes da agregação; HAVING filtra grupos depois, e por isso pode usar funções como count() e sum().',
            'HAVING é mais rápido.',
            'WHERE só funciona com números.',
          ],
          correta: 1,
          explicacao: 'Filtro que não depende de agregado vai no WHERE, onde reduz o trabalho antes de agrupar. HAVING fica para condições sobre o resultado da agregação.',
        },
        {
          t: 'quiz',
          pergunta: 'No PostgreSQL, quanto é `SELECT 7 / 2`?',
          opcoes: ['3.5', '3: divisão entre inteiros é inteira. Para 3.5, converta um dos lados: `7::numeric / 2` ou `7 / 2.0`.', '4', 'Erro.'],
          correta: 1,
          explicacao: 'É a origem de percentuais que saem todos zero. `count(*) / total` com dois inteiros trunca.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'janelas-e-ctes',
      titulo: 'Funções de janela e CTEs',
      minutos: 14,
      resumo: 'Calcular sobre um grupo sem colapsar as linhas: ranking, comparação com a semana anterior, acumulado e média móvel.',
      blocos: [
        {
          t: 'texto',
          md: `\`GROUP BY\` devolve **uma linha por grupo**. Uma **função de janela** calcula sobre um grupo de linhas e **mantém todas elas**. É o que responde "a posição de cada armadilha no ranking da sua usina" ou "a diferença para a semana anterior".

\`\`\`sql
funcao() OVER (
  PARTITION BY ...   -- os grupos (opcional): a janela recomeça em cada um
  ORDER BY ...       -- a ordem dentro do grupo
  ROWS BETWEEN ...   -- quais vizinhas entram na conta (opcional)
)
\`\`\`

Para quem vem do pandas: é o \`groupby(...).transform(...)\`, o \`.rank()\`, o \`.shift()\`, o \`.cumsum()\` e o \`.rolling()\`.

### CTE: dar nome a um passo

Uma **CTE** (\`WITH nome AS (...)\`) é uma subconsulta com nome, escrita antes da consulta principal. Não muda o que o banco faz. Muda o que você consegue ler: a consulta vira uma sequência de passos, de cima para baixo.`,
        },
        {
          t: 'codigo',
          titulo: 'Ranking dentro de cada usina',
          rodar: 'sql',
          codigo: `WITH por_armadilha AS (
  SELECT u.nome AS usina, a.codigo, count(d.id) AS insetos
  FROM usinas u
  JOIN talhoes t    ON t.usina_id = u.id
  JOIN armadilhas a ON a.talhao_id = t.id
  JOIN capturas c   ON c.armadilha_id = a.id
  JOIN deteccoes d  ON d.captura_id = c.id
  GROUP BY u.nome, a.codigo
),
ranqueado AS (
  SELECT *,
         rank() OVER (PARTITION BY usina ORDER BY insetos DESC)        AS posicao,
         round(100.0 * insetos / sum(insetos) OVER (PARTITION BY usina), 1) AS pct_da_usina
  FROM por_armadilha
)
SELECT * FROM ranqueado
WHERE posicao <= 3            -- as 3 piores de cada usina
ORDER BY usina, posicao;`,
        },
        {
          t: 'texto',
          md: `Duas coisas a notar.

**O filtro pela posição precisa de um passo a mais.** Funções de janela são calculadas depois do \`WHERE\`: não dá para escrever \`WHERE rank() OVER (...) <= 3\`. Daí a segunda CTE. "Os N primeiros de cada grupo" é sempre este formato.

**\`sum(insetos) OVER (PARTITION BY usina)\`** põe o total da usina em cada linha, sem colapsar. Uma linha consegue se comparar com o grupo dela.

E os empates aparecem no resultado: em Santa Helena duas armadilhas dividem o primeiro lugar e a seguinte é a **terceira**; em Boa Vista o empate é no terceiro lugar, e por isso "as 3 piores" devolve quatro linhas. É o comportamento do \`rank()\`.

| Função | Devolve |
|---|---|
| \`row_number()\` | 1, 2, 3, 4: sempre único |
| \`rank()\` | 1, 2, 2, 4: empates repetem e pulam |
| \`dense_rank()\` | 1, 2, 2, 3: empates repetem sem pular |
| \`lag(col)\`, \`lead(col)\` | o valor da linha anterior, da seguinte |
| \`first_value(col)\`, \`last_value(col)\` | o primeiro e o último da janela |
| \`sum\`, \`avg\`, \`count\`, \`max\`... \`OVER\` | qualquer agregação vira janela |`,
        },
        {
          t: 'codigo',
          titulo: 'Semana a semana: variação, acumulado e média móvel',
          rodar: 'sql',
          codigo: `WITH semanal AS (
  SELECT date_trunc('week', c.capturada_em)::date AS semana, count(d.id) AS insetos
  FROM capturas c
  JOIN armadilhas a ON a.id = c.armadilha_id
  JOIN talhoes t    ON t.id = a.talhao_id
  LEFT JOIN deteccoes d ON d.captura_id = c.id
  WHERE t.usina_id = 2 AND c.situacao = 'processada'
  GROUP BY semana
)
SELECT semana,
       insetos,
       insetos - lag(insetos) OVER (ORDER BY semana)                            AS variacao,
       sum(insetos) OVER (ORDER BY semana)                                      AS acumulado,
       round(avg(insetos) OVER (ORDER BY semana ROWS BETWEEN 3 PRECEDING AND CURRENT ROW)) AS media_4_semanas
FROM semanal
ORDER BY semana
LIMIT 14;`,
        },
        {
          t: 'texto',
          md: `- **\`lag\`** olha a linha anterior. Na primeira semana não há anterior: a variação é \`NULL\`.
- **\`sum(...) OVER (ORDER BY semana)\`**: com \`ORDER BY\`, a janela padrão vai do início até a linha atual. É o acumulado.
- **\`ROWS BETWEEN 3 PRECEDING AND CURRENT ROW\`** define a moldura à mão: a linha atual e as três anteriores. É a média móvel que tira o serrilhado de um gráfico.

### CTE recursiva, em uma frase

\`WITH RECURSIVE\` permite que a CTE se refira a si mesma. Serve para percorrer **hierarquias e grafos**: a árvore de categorias, o organograma, a lista de materiais. Vale saber que existe, e procurar quando o problema for uma árvore.`,
        },
        {
          t: 'codigo',
          titulo: 'CTE recursiva: descer uma hierarquia',
          rodar: 'sql',
          codigo: `-- Uma hierarquia de áreas, com profundidade desconhecida
CREATE TABLE areas (id int PRIMARY KEY, nome text, pai_id int REFERENCES areas (id));
INSERT INTO areas VALUES
  (1, 'Grupo Agro', NULL), (2, 'Regional MS', 1), (3, 'Regional SP', 1),
  (4, 'Usina Boa Vista', 2), (5, 'Usina Santa Helena', 2), (6, 'Fazenda Norte', 4), (7, 'Talhão 14', 6);

WITH RECURSIVE arvore AS (
  SELECT id, nome, 0 AS nivel, nome AS caminho            -- âncora: a raiz
  FROM areas WHERE pai_id IS NULL
  UNION ALL
  SELECT a.id, a.nome, arvore.nivel + 1, arvore.caminho || ' › ' || a.nome   -- passo: os filhos do que já foi achado
  FROM areas a
  JOIN arvore ON a.pai_id = arvore.id
)
SELECT repeat('   ', nivel) || nome AS area, caminho FROM arvore ORDER BY caminho;`,
        },
        {
          t: 'desafio-sql',
          ordenado: true,
          enunciado: `Para cada **técnico que fez capturas**, mostre o nome, a data e hora da sua **captura mais recente** e o código da armadilha dessa captura. Ordene pelo nome.

Dica de método: numere as capturas de cada técnico da mais nova para a mais antiga, e fique com a número 1.`,
          inicial: `SELECT t.nome, c.capturada_em, a.codigo
FROM tecnicos t
JOIN capturas c   ON c.tecnico_id = t.id
JOIN armadilhas a ON a.id = c.armadilha_id
ORDER BY t.nome
LIMIT 10;`,
          solucao: `WITH numeradas AS (
  SELECT t.nome, c.capturada_em, a.codigo,
         row_number() OVER (PARTITION BY t.id ORDER BY c.capturada_em DESC) AS n
  FROM tecnicos t
  JOIN capturas c   ON c.tecnico_id = t.id
  JOIN armadilhas a ON a.id = c.armadilha_id
)
SELECT nome, capturada_em, codigo
FROM numeradas
WHERE n = 1
ORDER BY nome;`,
          dica: '`row_number() OVER (PARTITION BY t.id ORDER BY c.capturada_em DESC)` numa CTE, e `WHERE n = 1` na consulta de fora. O `DISTINCT ON (t.id)` também resolve.',
        },
        {
          t: 'quiz',
          pergunta: 'Qual é a diferença entre `GROUP BY usina` e `OVER (PARTITION BY usina)`?',
          opcoes: [
            'Nenhuma.',
            '`GROUP BY` devolve uma linha por usina; `PARTITION BY` mantém todas as linhas e acrescenta a cada uma o valor calculado sobre a sua usina.',
            '`PARTITION BY` é mais rápido.',
            '`GROUP BY` não aceita funções.',
          ],
          correta: 1,
          explicacao: 'A janela calcula sem colapsar. É o que permite comparar cada linha com o seu grupo: participação no total, posição no ranking, diferença para a média.',
        },
        {
          t: 'quiz',
          pergunta: 'Por que `WHERE row_number() OVER (...) = 1` não funciona?',
          opcoes: [
            'Porque `row_number` não existe.',
            'Porque funções de janela são avaliadas depois do WHERE. É preciso calcular numa subconsulta ou CTE e filtrar na consulta de fora.',
            'Porque falta o GROUP BY.',
            'Funciona.',
          ],
          correta: 1,
          explicacao: 'As janelas operam sobre o resultado já filtrado e agrupado. Filtrar pelo valor delas exige mais um nível de consulta.',
        },
      ],
    },
  ],
};
