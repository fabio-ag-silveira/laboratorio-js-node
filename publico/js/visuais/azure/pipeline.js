/**
 * Simulador de pipeline do Azure DevOps.
 *
 * À esquerda, o YAML, editável. À direita, o que aconteceria numa execução:
 * quais estágios, jobs e passos rodam, quais são pulados e onde o pipeline
 * para. Dá para trocar o ramo, o motivo (push ou pull request), fazer um passo
 * falhar com um clique e aprovar a implantação.
 *
 * As regras moram em `motor-pipeline.js`. Este arquivo só desenha.
 */

import { criarEditor } from '../../editor.js';
import { normalizar, simular } from './motor-pipeline.js';

const PADRAO = `trigger:
  branches:
    include: [main, release/*]

pr:
  branches:
    include: [main]

variables:
  configuracao: Release

stages:
- stage: Build
  jobs:
  - job: Compilar
    pool: { vmImage: ubuntu-latest }
    steps:
    - script: dotnet restore
    - script: dotnet build -c $(configuracao) --no-restore
    - script: dotnet test --no-build
      displayName: Testes
    - publish: $(Build.ArtifactStagingDirectory)
      displayName: Publicar artefato

- stage: Homologacao
  dependsOn: Build
  condition: and(succeeded(), ne(variables['Build.Reason'], 'PullRequest'))
  jobs:
  - deployment: Implantar
    environment: homologacao
    strategy:
      runOnce:
        deploy:
          steps:
          - script: az containerapp update --name api --image $(imagem)
            displayName: Implantar em homologação
          - script: curl -f https://hml.exemplo.com/saude
            displayName: Teste de fumaça

- stage: Producao
  dependsOn: Homologacao
  condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
  jobs:
  - deployment: Implantar
    environment: producao
    strategy:
      runOnce:
        deploy:
          steps:
          - script: az containerapp update --name api --image $(imagem)
            displayName: Implantar em produção
          - script: echo "avisar a equipe"
            displayName: Avisar em caso de falha
            condition: failed()
`;

const ICONE = { ok: '✓', falhou: '✕', pulado: '–', aguardando: '⏸' };
const ROTULO = { ok: 'passou', falhou: 'falhou', pulado: 'pulado', aguardando: 'aguardando aprovação' };

function el(tag, classe, texto) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

export default function criar(opcoes = {}) {
  const exigemAprovacao = opcoes.aprovacao ?? ['producao'];
  const ramos = opcoes.ramos ?? ['main', 'release/2.1', 'feature/filtro'];

  const raiz = el('section', 'vis vis-pipeline');
  const topo = el('header', 'vis-topo');
  topo.append(el('strong', '', 'Simulador de pipeline'), el('span', '', 'edite o YAML · clique num passo para fazê-lo falhar'));
  const controles = el('div', 'vis-controles');
  const corpo = el('div', 'vis-corpo pipeline-corpo');
  const leitura = el('div', 'vis-leitura');
  raiz.append(topo, controles, corpo, leitura);

  const editor = criarEditor(opcoes.yaml ?? PADRAO, { lang: 'yaml', minLinhas: 12 });
  editor.elemento.classList.add('pipeline-editor');
  const painel = el('div', 'pipeline-painel');
  corpo.append(editor.elemento, painel);

  let ramo = ramos[0];
  let motivo = 'push';
  let falhas = new Set();
  let aprovados = new Set();
  let pipeline = null;
  let erro = null;

  // ---- controles ---------------------------------------------------------
  const grupoRamo = el('div', 'vis-chips');
  const grupoMotivo = el('div', 'vis-chips');
  const botoesRamo = ramos.map((r) => {
    const b = el('button', 'vis-chip', r);
    b.addEventListener('click', () => {
      ramo = r;
      aprovados = new Set();
      pintar();
    });
    grupoRamo.append(b);
    return b;
  });
  const botoesMotivo = [
    ['push', 'push'],
    ['pr', 'pull request para main'],
  ].map(([id, texto]) => {
    const b = el('button', 'vis-chip', texto);
    b.dataset.id = id;
    b.addEventListener('click', () => {
      motivo = id;
      aprovados = new Set();
      pintar();
    });
    grupoMotivo.append(b);
    return b;
  });
  const limpar = el('button', 'vis-chip', 'desfazer falhas');
  limpar.addEventListener('click', () => {
    falhas = new Set();
    aprovados = new Set();
    pintar();
  });
  controles.append(el('span', 'vis-rotulo', 'ramo'), grupoRamo, el('span', 'vis-rotulo', 'motivo'), grupoMotivo, limpar);

  // ---- desenho -----------------------------------------------------------
  function pintar() {
    botoesRamo.forEach((b) => b.classList.toggle('ativo', b.textContent === ramo && motivo === 'push'));
    botoesRamo.forEach((b) => (b.disabled = motivo === 'pr'));
    botoesMotivo.forEach((b) => b.classList.toggle('ativo', b.dataset.id === motivo));
    painel.replaceChildren();

    if (erro) {
      painel.append(el('pre', 'pipeline-erro', erro));
      leitura.textContent = 'Corrija o YAML para simular. A indentação faz parte da sintaxe: use espaços, nunca tabulação.';
      return;
    }
    if (!pipeline) return;

    let r;
    try {
      r = simular(pipeline, { ramo, motivo, falhas, aprovados, exigemAprovacao });
    } catch (e) {
      painel.append(el('pre', 'pipeline-erro', `Condição que o simulador não entende: ${e.message}`));
      return;
    }

    if (!r.dispara) {
      painel.append(el('div', 'pipeline-vazio', `Nenhuma execução: ${r.motivoDeNaoDisparar}.`));
      leitura.textContent = 'O gatilho decide se o pipeline nasce. Um push num ramo fora do "trigger" não cria execução nenhuma.';
      return;
    }

    for (const estagio of r.estagios) {
      const caixa = el('div', `pipeline-estagio estado-${estagio.estado}`);
      const cab = el('div', 'pipeline-cab');
      cab.append(el('span', 'pipeline-icone', ICONE[estagio.estado]), el('strong', '', estagio.titulo), el('span', 'pipeline-estado', ROTULO[estagio.estado]));
      caixa.append(cab);
      if (estagio.dependsOn.length) caixa.append(el('div', 'pipeline-dep', `depende de: ${estagio.dependsOn.join(', ')}`));

      for (const job of estagio.jobs) {
        const j = el('div', `pipeline-job estado-${job.estado}`);
        const titulo = el('div', 'pipeline-job-titulo');
        titulo.append(el('span', 'pipeline-icone', ICONE[job.estado]), el('span', '', `${job.implantacao ? 'deployment' : 'job'}: ${job.titulo}`));
        if (job.ambiente) titulo.append(el('span', 'pipeline-ambiente', `ambiente ${job.ambiente}`));
        j.append(titulo);

        if (job.estado === 'aguardando') {
          const aprovar = el('button', 'botao botao-principal', `Aprovar implantação em ${job.ambiente}`);
          aprovar.addEventListener('click', () => {
            aprovados.add(job.ambiente);
            pintar();
          });
          j.append(aprovar);
        }

        for (const passo of job.passos) {
          const p = el('button', `pipeline-passo estado-${passo.estado}${passo.tolerado ? ' tolerado' : ''}`);
          p.append(el('span', 'pipeline-icone', ICONE[passo.estado]), el('span', '', passo.titulo));
          if (passo.tolerado) p.append(el('span', 'pipeline-ambiente', 'continueOnError'));
          p.title = falhas.has(passo.id) ? 'clique para o passo voltar a passar' : 'clique para fazer este passo falhar';
          p.addEventListener('click', () => {
            if (falhas.has(passo.id)) falhas.delete(passo.id);
            else falhas.add(passo.id);
            pintar();
          });
          j.append(p);
        }
        caixa.append(j);
      }
      painel.append(caixa);
    }

    const resumo = r.estagios.map((e) => `${e.titulo}: ${ROTULO[e.estado]}`).join(' → ');
    leitura.textContent = resumo;
  }

  // ---- YAML → objeto (no servidor) → simulação ---------------------------
  let espera = null;
  let pedido = 0;
  async function interpretar() {
    const meu = ++pedido;
    try {
      const resposta = await fetch('/api/yaml', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto: editor.valor }) });
      const r = await resposta.json();
      if (meu !== pedido) return;
      if (!r.ok) {
        erro = `Erro de YAML${r.linha ? ` na linha ${r.linha}` : ''}: ${r.erro}${r.instalar ? `\n\nRode: ${r.instalar}` : ''}`;
      } else {
        pipeline = normalizar(r.dados);
        erro = null;
      }
    } catch (e) {
      erro = e.message;
    }
    pintar();
  }

  editor.elemento.addEventListener('input', () => {
    clearTimeout(espera);
    falhas = new Set(); // os ids dos passos mudam com o YAML
    aprovados = new Set();
    espera = setTimeout(interpretar, 500);
  });

  interpretar();
  return raiz;
}
