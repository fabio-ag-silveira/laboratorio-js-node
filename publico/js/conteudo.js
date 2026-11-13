/**
 * Acesso ao conteúdo, com carga sob demanda.
 *
 * O catálogo (`/api/conteudo`) traz só títulos e é leve; ele basta para a
 * página inicial e o menu. O corpo de uma trilha (`/api/conteudo/:id`) só é
 * buscado quando você entra nela, e fica guardado em memória depois.
 *
 * Guardamos a PROMISE, não o resultado: se duas telas pedirem a mesma trilha
 * ao mesmo tempo, as duas esperam a mesma requisição em vez de disparar duas.
 */

let catalogo = null;
const trilhas = new Map(); // id -> Promise<trilha>

async function pedir(url) {
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status} em ${url}`);
  return resposta.json();
}

export async function carregarCatalogo() {
  catalogo ??= await pedir('/api/conteudo');
  return catalogo;
}

/** O catálogo já carregado (síncrono) — só use depois de carregarCatalogo(). */
export function obterCatalogo() {
  return catalogo ?? [];
}

export function carregarTrilha(id) {
  if (!trilhas.has(id)) {
    const promessa = pedir(`/api/conteudo/${id}`);
    // se falhar, tira do cache para a próxima tentativa buscar de novo
    promessa.catch(() => trilhas.delete(id));
    trilhas.set(id, promessa);
  }
  return trilhas.get(id);
}

/** Todas as trilhas com conteúdo — usado pela colinha e pela revisão. */
export async function carregarTodas() {
  const prontas = (await carregarCatalogo()).filter((t) => t.modulos.length);
  return Promise.all(prontas.map((t) => carregarTrilha(t.id)));
}

/** Chave de progresso de uma lição: "trilha/modulo/licao". */
export function chaveDe(idTrilha, idModulo, idLicao) {
  return `${idTrilha}/${idModulo}/${idLicao}`;
}

/** Lista achatada das lições de uma trilha (do catálogo ou completa). */
export function licoesDe(trilha) {
  return trilha.modulos.flatMap((m) =>
    m.licoes.map((l) => ({
      chave: chaveDe(trilha.id, m.id, l.id),
      rota: `#/t/${trilha.id}/${m.id}/${l.id}`,
      titulo: l.titulo,
      minutos: l.minutos,
      modulo: m,
    })),
  );
}
