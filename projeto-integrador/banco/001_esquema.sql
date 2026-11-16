-- Esquema do projeto integrador: capturas de armadilhas, do aparelho ao painel.
--
-- Difere do banco de estudo da trilha de PostgreSQL em três pontos, todos por
-- causa do aplicativo que funciona sem sinal:
--   1. a captura nasce NO APARELHO, com um UUID gerado lá (envio idempotente);
--   2. há duas datas: quando aconteceu (relógio do aparelho) e quando chegou;
--   3. a foto fica no armazenamento de objetos; o banco guarda só o caminho.

CREATE TYPE situacao_captura AS ENUM ('recebida', 'aguardando_foto', 'na_fila', 'processada', 'rejeitada', 'erro');

CREATE TABLE usinas (
  id     integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome   text    NOT NULL UNIQUE,
  uf     char(2) NOT NULL,
  ativa  boolean NOT NULL DEFAULT true
);

CREATE TABLE armadilhas (
  id         integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usina_id   integer NOT NULL REFERENCES usinas (id),
  codigo     text    NOT NULL,
  talhao     text    NOT NULL,
  ativa      boolean NOT NULL DEFAULT true,
  UNIQUE (usina_id, codigo)
);

CREATE TABLE capturas (
  id             uuid PRIMARY KEY,                       -- gerado no aparelho
  armadilha_id   integer NOT NULL REFERENCES armadilhas (id),
  capturada_em   timestamptz NOT NULL,                   -- relógio do aparelho
  recebida_em    timestamptz NOT NULL DEFAULT now(),     -- relógio do servidor
  situacao       situacao_captura NOT NULL DEFAULT 'aguardando_foto',
  foto           text,                                   -- caminho no armazenamento; NULL até a foto subir
  versao_do_app  text NOT NULL,
  qualidade      jsonb NOT NULL DEFAULT '{}',            -- nitidez, fração estourada: medidas no aparelho e no servidor
  motivo         text,                                   -- preenchido quando rejeitada ou com erro
  CHECK (situacao NOT IN ('na_fila', 'processada') OR foto IS NOT NULL)
);

CREATE TABLE deteccoes (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  captura_id     uuid NOT NULL REFERENCES capturas (id) ON DELETE CASCADE,
  versao_modelo  text NOT NULL,                          -- toda detecção sabe que modelo a gerou
  classe         text NOT NULL,
  confianca      real NOT NULL CHECK (confianca BETWEEN 0 AND 1),
  x1 integer NOT NULL, y1 integer NOT NULL, x2 integer NOT NULL, y2 integer NOT NULL,
  CHECK (x2 > x1 AND y2 > y1)
);

-- Índices para as consultas que o painel e o serviço fazem de fato.
CREATE INDEX capturas_armadilha_data ON capturas (armadilha_id, capturada_em DESC);   -- "últimas capturas da armadilha"
CREATE INDEX capturas_pendentes ON capturas (recebida_em) WHERE situacao IN ('aguardando_foto', 'na_fila', 'erro');
CREATE INDEX deteccoes_captura ON deteccoes (captura_id);                            -- a chave estrangeira não ganha índice sozinha
