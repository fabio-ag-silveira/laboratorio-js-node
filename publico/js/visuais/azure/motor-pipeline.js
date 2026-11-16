/**
 * Motor do simulador de pipeline: as regras do Azure Pipelines, sem interface.
 *
 * Recebe o YAML já convertido em objeto e responde: "num push para este ramo,
 * com estes passos falhando, o que roda, o que é pulado e o que falha?".
 *
 * É um subconjunto honesto do produto real. Cobre o que decide o fluxo de uma
 * entrega: gatilhos por ramo, estágios → jobs → passos, `dependsOn`,
 * `condition`, `continueOnError` e ambientes com aprovação. Não executa nada:
 * um passo "roda" se as regras dizem que rodaria.
 *
 * Fica separado da interface para ser testado em Node (teste/pipeline.test.js).
 */

const lista = (v) => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);

/** Compara um ramo com um padrão de gatilho: `main`, `release/*`, `*`. */
export function casaRamo(ramo, padrao) {
  const p = String(padrao).replace(/^refs\/heads\//, '');
  if (p === '*') return true;
  if (p.endsWith('/*')) return ramo.startsWith(p.slice(0, -1));
  return ramo === p;
}

/** O gatilho (`trigger` ou `pr`) dispara para este ramo? */
export function gatilhoDispara(gatilho, ramo, padraoSeAusente = true) {
  if (gatilho === undefined) return padraoSeAusente; // sem `trigger`: todo push dispara
  if (gatilho === 'none' || gatilho === false || gatilho === null) return false;
  const incluir = Array.isArray(gatilho) ? gatilho : lista(gatilho.branches?.include ?? (gatilho.branches ? [] : ['*']));
  const excluir = Array.isArray(gatilho) ? [] : lista(gatilho.branches?.exclude);
  return incluir.some((p) => casaRamo(ramo, p)) && !excluir.some((p) => casaRamo(ramo, p));
}

function nomeDoPasso(passo, i) {
  if (passo.displayName) return passo.displayName;
  for (const chave of ['script', 'bash', 'pwsh', 'powershell']) {
    if (passo[chave]) return String(passo[chave]).split('\n')[0].slice(0, 60);
  }
  if (passo.task) return passo.task;
  if (passo.checkout) return `checkout: ${passo.checkout}`;
  if (passo.template) return `template: ${passo.template}`;
  if (passo.download) return `download: ${passo.download}`;
  if (passo.publish) return `publish: ${passo.publish}`;
  return `passo ${i + 1}`;
}

function normalizarJob(job, i, idEstagio) {
  const nome = job.job ?? job.deployment ?? `job${i + 1}`;
  const ambiente = job.environment === undefined ? null : typeof job.environment === 'string' ? job.environment : job.environment.name;
  // job de implantação: os passos ficam em strategy.runOnce.deploy.steps
  const passos = lista(job.steps ?? job.strategy?.runOnce?.deploy?.steps);
  return {
    id: `${idEstagio}.${nome}`,
    nome,
    titulo: job.displayName ?? nome,
    implantacao: job.deployment !== undefined,
    ambiente,
    dependsOn: lista(job.dependsOn),
    condition: job.condition ?? 'succeeded()',
    passos: passos.map((p, n) => ({
      id: `${idEstagio}.${nome}.${n}`,
      titulo: nomeDoPasso(p, n),
      condition: p.condition ?? 'succeeded()',
      continueOnError: p.continueOnError === true,
    })),
  };
}

/** Deixa as três formas de escrever um pipeline (steps, jobs, stages) numa só. */
export function normalizar(yaml) {
  if (!yaml || typeof yaml !== 'object' || Array.isArray(yaml)) throw new Error('O pipeline precisa ser um mapeamento YAML (chave: valor).');
  let estagios;
  if (yaml.stages) estagios = lista(yaml.stages);
  else if (yaml.jobs) estagios = [{ stage: 'pipeline', jobs: yaml.jobs }];
  else if (yaml.steps) estagios = [{ stage: 'pipeline', jobs: [{ job: 'job', steps: yaml.steps }] }];
  else throw new Error('Não achei "stages", "jobs" nem "steps".');

  const nomes = estagios.map((e, i) => e.stage ?? `estagio${i + 1}`);
  return {
    trigger: yaml.trigger,
    pr: yaml.pr,
    variaveis: Array.isArray(yaml.variables)
      ? Object.fromEntries(yaml.variables.filter((v) => v.name).map((v) => [v.name, v.value]))
      : (yaml.variables ?? {}),
    estagios: estagios.map((e, i) => ({
      id: nomes[i],
      nome: nomes[i],
      titulo: e.displayName ?? nomes[i],
      // sem dependsOn, um estágio depende do anterior: é o que os faz rodar em sequência
      dependsOn: e.dependsOn === undefined ? (i === 0 ? [] : [nomes[i - 1]]) : lista(e.dependsOn),
      condition: e.condition ?? 'succeeded()',
      jobs: lista(e.jobs).map((j, n) => normalizarJob(j, n, nomes[i])),
    })),
  };
}

// ---------------------------------------------------------------------------
//  Condições: succeeded(), failed(), always(), eq(), ne(), and(), or(), not(),
//  startsWith(), contains() e variables['Nome'].
// ---------------------------------------------------------------------------

function analisar(texto) {
  let i = 0;
  const espacos = () => {
    while (/\s/.test(texto[i] ?? '')) i++;
  };
  function expressao() {
    espacos();
    if (texto[i] === "'") {
      const fim = texto.indexOf("'", i + 1);
      if (fim === -1) throw new Error('aspas sem fechar');
      const valor = texto.slice(i + 1, fim);
      i = fim + 1;
      return { tipo: 'texto', valor };
    }
    const m = /^[A-Za-z_][\w.]*/.exec(texto.slice(i));
    if (!m) throw new Error(`não entendi "${texto.slice(i, i + 12)}"`);
    i += m[0].length;
    const nome = m[0];
    espacos();
    if (texto[i] === '[') {
      // variables['Build.SourceBranch']
      i++;
      const chave = expressao();
      espacos();
      if (texto[i] !== ']') throw new Error('faltou "]"');
      i++;
      return { tipo: 'variavel', nome: chave.valor };
    }
    if (texto[i] === '(') {
      i++;
      const args = [];
      espacos();
      while (texto[i] !== ')') {
        args.push(expressao());
        espacos();
        if (texto[i] === ',') i++;
        else if (texto[i] !== ')') throw new Error('faltou ")"');
        espacos();
      }
      i++;
      return { tipo: 'funcao', nome: nome.toLowerCase(), args };
    }
    if (/^(true|false)$/i.test(nome)) return { tipo: 'texto', valor: nome.toLowerCase() };
    if (nome.toLowerCase().startsWith('variables.')) return { tipo: 'variavel', nome: nome.slice(10) };
    return { tipo: 'texto', valor: nome };
  }
  const arvore = expressao();
  espacos();
  if (i < texto.length) throw new Error(`sobrou "${texto.slice(i)}"`);
  return arvore;
}

/**
 * Avalia uma condição. `anteriores` são os resultados do que veio antes
 * ('ok' | 'falhou' | 'pulado'); `variaveis` inclui as predefinidas.
 */
export function avaliar(condicao, { anteriores, variaveis }) {
  const txt = (v) => String(v ?? '').toLowerCase();
  const verdade = (v) => v === true || txt(v) === 'true';
  function calc(no) {
    if (no.tipo === 'texto') return no.valor;
    if (no.tipo === 'variavel') return variaveis[no.nome] ?? '';
    const a = no.args;
    switch (no.nome) {
      case 'succeeded':
        return anteriores.every((r) => r === 'ok');
      case 'failed':
        return anteriores.some((r) => r === 'falhou');
      case 'succeededorfailed':
        return true;
      case 'always':
        return true;
      case 'eq':
        return txt(calc(a[0])) === txt(calc(a[1]));
      case 'ne':
        return txt(calc(a[0])) !== txt(calc(a[1]));
      case 'and':
        return a.every((x) => verdade(calc(x)));
      case 'or':
        return a.some((x) => verdade(calc(x)));
      case 'not':
        return !verdade(calc(a[0]));
      case 'startswith':
        return txt(calc(a[0])).startsWith(txt(calc(a[1])));
      case 'contains':
        return txt(calc(a[0])).includes(txt(calc(a[1])));
      default:
        throw new Error(`função "${no.nome}" não é simulada`);
    }
  }
  return verdade(calc(analisar(String(condicao))));
}

/** A condição menciona o estado do que veio antes? Se não, o Azure acrescenta "succeeded() e". */
const mencionaEstado = (c) => /\b(succeeded|failed|always|succeededOrFailed)\s*\(/i.test(String(c));
function deveRodar(condicao, contexto) {
  const efetiva = mencionaEstado(condicao) ? condicao : `and(succeeded(), ${condicao})`;
  return avaliar(efetiva, contexto);
}

/**
 * Simula uma execução.
 *
 *   contexto = { ramo, motivo: 'push' | 'pr', falhas: Set<idDoPasso>, aprovados: Set<ambiente>, exigemAprovacao: string[] }
 *
 * Devolve { dispara, motivoDeNaoDisparar, estagios: [{ ...estagio, estado, jobs: [{ ...job, estado, passos }] }] },
 * com estado em 'ok' | 'falhou' | 'pulado' | 'aguardando'.
 */
export function simular(pipeline, contexto) {
  const { ramo, motivo = 'push', falhas = new Set(), aprovados = new Set(), exigemAprovacao = [] } = contexto;
  const dispara = motivo === 'pr' ? gatilhoDispara(pipeline.pr, 'main', true) : gatilhoDispara(pipeline.trigger, ramo, true);
  if (!dispara) {
    return { dispara: false, motivoDeNaoDisparar: motivo === 'pr' ? 'o gatilho "pr" não cobre este pull request' : `o "trigger" não cobre o ramo ${ramo}`, estagios: [] };
  }

  const variaveis = {
    ...pipeline.variaveis,
    'Build.SourceBranch': motivo === 'pr' ? 'refs/pull/42/merge' : `refs/heads/${ramo}`,
    'Build.SourceBranchName': motivo === 'pr' ? 'merge' : ramo.split('/').pop(),
    'Build.Reason': motivo === 'pr' ? 'PullRequest' : 'IndividualCI',
  };

  const estadoDoEstagio = new Map();
  const estagios = pipeline.estagios.map((estagio) => {
    const anteriores = estagio.dependsOn.map((d) => estadoDoEstagio.get(d) ?? 'ok');
    let estado;
    let jobs = estagio.jobs.map((j) => ({ ...j, estado: 'pulado', passos: j.passos.map((p) => ({ ...p, estado: 'pulado' })) }));

    if (anteriores.includes('aguardando')) estado = 'pulado';
    else if (!deveRodar(estagio.condition, { anteriores, variaveis })) estado = 'pulado';
    else {
      const estadoDoJob = new Map();
      jobs = estagio.jobs.map((job) => {
        const antes = job.dependsOn.map((d) => estadoDoJob.get(d) ?? 'ok');
        let estadoJob;
        let passos = job.passos.map((p) => ({ ...p, estado: 'pulado' }));

        if (antes.includes('aguardando') || !deveRodar(job.condition, { anteriores: antes, variaveis })) estadoJob = 'pulado';
        else if (job.ambiente && exigemAprovacao.includes(job.ambiente) && !aprovados.has(job.ambiente)) estadoJob = 'aguardando';
        else {
          const feitos = [];
          passos = job.passos.map((passo) => {
            let e;
            if (!deveRodar(passo.condition, { anteriores: feitos, variaveis })) e = 'pulado';
            else if (falhas.has(passo.id)) e = 'falhou';
            else e = 'ok';
            // continueOnError: o passo falha, mas não conta como falha para os seguintes
            feitos.push(e === 'falhou' && passo.continueOnError ? 'ok' : e === 'pulado' ? 'ok' : e);
            return { ...passo, estado: e, tolerado: e === 'falhou' && passo.continueOnError };
          });
          estadoJob = passos.some((p) => p.estado === 'falhou' && !p.tolerado) ? 'falhou' : 'ok';
        }
        estadoDoJob.set(job.nome, estadoJob);
        return { ...job, estado: estadoJob, passos };
      });
      estado = jobs.some((j) => j.estado === 'falhou') ? 'falhou' : jobs.some((j) => j.estado === 'aguardando') ? 'aguardando' : jobs.every((j) => j.estado === 'pulado') ? 'pulado' : 'ok';
    }
    estadoDoEstagio.set(estagio.nome, estado);
    return { ...estagio, estado, jobs };
  });

  return { dispara: true, estagios };
}
