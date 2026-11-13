/**
 * Trilha "PostgreSQL" — ainda em construção.
 *
 * Enquanto `modulos` estiver vazio, a trilha aparece na página inicial como
 * "em construção", mostrando o que está previsto.
 */

export const trilha = {
  id: "postgresql",
  ordem: 50,
  titulo: "PostgreSQL",
  subtitulo: "SQL de verdade rodando na tela: junções, janelas, JSONB, índices e planos",
  icone: "🐘",
  cor: "#e88fb8",
  ponte: "a partir do MySQL",
  previsto: [
    "Consultas, junções e agregação",
    "CTE e funções de janela",
    "Índices e EXPLAIN",
    "JSONB e busca por similaridade (pgvector)"
  ],
  modulos: []
};
