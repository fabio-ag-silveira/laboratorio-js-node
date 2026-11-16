/**
 * O simulador de pipeline da trilha de Azure afirma coisas sobre o Azure
 * Pipelines ("um PR não implanta", "falhou o build, pula o resto"). Estes
 * testes prendem as afirmações das lições ao comportamento do motor.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from 'yaml';

import { normalizar, simular, gatilhoDispara, casaRamo, avaliar } from '../publico/js/visuais/azure/motor-pipeline.js';

const YAML = `
trigger:
  branches:
    include: [main, release/*]
pr:
  branches:
    include: [main]
stages:
- stage: Build
  jobs:
  - job: Compilar
    steps:
    - script: dotnet build
    - script: dotnet test
      displayName: Testes
    - script: lint
      continueOnError: true
- stage: Homologacao
  condition: and(succeeded(), ne(variables['Build.Reason'], 'PullRequest'))
  jobs:
  - deployment: Implantar
    environment: homologacao
    strategy: { runOnce: { deploy: { steps: [ { script: implantar } ] } } }
- stage: Producao
  condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
  jobs:
  - deployment: Implantar
    environment: producao
    strategy:
      runOnce:
        deploy:
          steps:
          - script: implantar
          - script: avisar
            condition: failed()
`;

const pipeline = normalizar(parse(YAML));
const estados = (r) => Object.fromEntries(r.estagios.map((e) => [e.nome, e.estado]));
const rodar = (ctx) => simular(pipeline, { exigemAprovacao: ['producao'], ...ctx });

describe('gatilhos', () => {
  test('padrões de ramo', () => {
    assert.ok(casaRamo('main', 'main'));
    assert.ok(casaRamo('release/2.1', 'release/*'));
    assert.ok(!casaRamo('feature/x', 'release/*'));
    assert.ok(casaRamo('qualquer', '*'));
  });
  test('sem trigger, todo push dispara; "none" nunca dispara', () => {
    assert.ok(gatilhoDispara(undefined, 'feature/x'));
    assert.ok(!gatilhoDispara('none', 'main'));
    assert.ok(gatilhoDispara(['main'], 'main'));
    assert.ok(!gatilhoDispara({ branches: { include: ['*'], exclude: ['feature/*'] } }, 'feature/x'));
  });
  test('push em ramo fora do trigger não cria execução', () => {
    assert.equal(rodar({ ramo: 'feature/filtro' }).dispara, false);
  });
});

describe('fluxo entre estágios', () => {
  test('push na main: compila, homologa e espera aprovação para produção', () => {
    assert.deepEqual(estados(rodar({ ramo: 'main' })), { Build: 'ok', Homologacao: 'ok', Producao: 'aguardando' });
  });
  test('com a aprovação, produção roda', () => {
    assert.deepEqual(estados(rodar({ ramo: 'main', aprovados: new Set(['producao']) })), { Build: 'ok', Homologacao: 'ok', Producao: 'ok' });
  });
  test('push num ramo de release homologa e NÃO vai para produção', () => {
    assert.deepEqual(estados(rodar({ ramo: 'release/2.1' })), { Build: 'ok', Homologacao: 'ok', Producao: 'pulado' });
  });
  test('pull request só compila e testa', () => {
    assert.deepEqual(estados(rodar({ motivo: 'pr', ramo: 'main' })), { Build: 'ok', Homologacao: 'pulado', Producao: 'pulado' });
  });
  test('teste falhando para tudo o que vem depois', () => {
    const r = rodar({ ramo: 'main', falhas: new Set(['Build.Compilar.1']) });
    assert.deepEqual(estados(r), { Build: 'falhou', Homologacao: 'pulado', Producao: 'pulado' });
    // o passo seguinte ao que falhou também é pulado
    assert.equal(r.estagios[0].jobs[0].passos[2].estado, 'pulado');
  });
  test('continueOnError: o passo falha e o job continua verde', () => {
    const r = rodar({ ramo: 'main', falhas: new Set(['Build.Compilar.2']) });
    assert.equal(r.estagios[0].jobs[0].passos[2].estado, 'falhou');
    assert.equal(r.estagios[0].estado, 'ok');
  });
  test('passo com condition: failed() só roda quando algo falhou antes', () => {
    const ok = rodar({ ramo: 'main', aprovados: new Set(['producao']) });
    assert.equal(ok.estagios[2].jobs[0].passos[1].estado, 'pulado');
    const ruim = rodar({ ramo: 'main', aprovados: new Set(['producao']), falhas: new Set(['Producao.Implantar.0']) });
    assert.equal(ruim.estagios[2].jobs[0].passos[1].estado, 'ok');
    assert.equal(ruim.estagios[2].estado, 'falhou');
  });
});

describe('formas de escrever e condições', () => {
  test('só "steps" vira um estágio com um job', () => {
    const p = normalizar(parse('steps:\n- script: echo oi\n- script: echo tchau'));
    assert.equal(p.estagios.length, 1);
    assert.equal(p.estagios[0].jobs[0].passos.length, 2);
  });
  test('sem dependsOn, cada estágio depende do anterior', () => {
    assert.deepEqual(pipeline.estagios.map((e) => e.dependsOn), [[], ['Build'], ['Homologacao']]);
  });
  test('dependsOn: [] solta o estágio da sequência', () => {
    const p = normalizar(parse('stages:\n- stage: A\n  jobs: [{job: a, steps: [{script: x}]}]\n- stage: B\n  dependsOn: []\n  jobs: [{job: b, steps: [{script: y}]}]'));
    const r = simular(p, { ramo: 'main', falhas: new Set(['A.a.0']) });
    assert.deepEqual(estados(r), { A: 'falhou', B: 'ok' });
  });
  test('avaliador de condições', () => {
    const ctx = { anteriores: ['ok'], variaveis: { 'Build.SourceBranch': 'refs/heads/main' } };
    assert.ok(avaliar("eq(variables['Build.SourceBranch'], 'refs/heads/main')", ctx));
    assert.ok(avaliar("startsWith(variables['Build.SourceBranch'], 'refs/heads/')", ctx));
    assert.ok(!avaliar('failed()', ctx));
    assert.ok(avaliar('or(failed(), always())', ctx));
    assert.ok(avaliar("not(eq(variables['Build.SourceBranch'], 'x'))", ctx));
  });
});

describe('onde rodar: a regra de decisão da lição', async () => {
  const { recomendar, SERVICOS } = await import('../publico/js/visuais/azure/escolha.js');
  const r = (respostas) => recomendar({ oque: 'api', conteiner: 'nao', zero: 'nao', k8s: 'nao', ...respostas }).servico;

  test('site estático vai para Static Web Apps', () => assert.equal(r({ oque: 'site' }), 'swa'));
  test('API sem contêiner e sempre ligada: App Service', () => assert.equal(r({}), 'appservice'));
  test('API em contêiner: Container Apps', () => assert.equal(r({ conteiner: 'sim' }), 'aca'));
  test('inferência com GPU: Container Apps', () => assert.equal(r({ oque: 'gpu', conteiner: 'sim' }), 'aca'));
  test('tarefa por evento, sem contêiner: Functions', () => assert.equal(r({ oque: 'evento' }), 'functions'));
  test('equipe que opera Kubernetes: AKS', () => assert.equal(r({ conteiner: 'sim', k8s: 'sim' }), 'aks'));
  test('toda recomendação aponta para um serviço que existe', () => {
    for (const oque of ['site', 'api', 'evento', 'gpu', 'legado']) for (const conteiner of ['sim', 'nao']) for (const zero of ['sim', 'nao']) for (const k8s of ['sim', 'nao']) {
      const x = recomendar({ oque, conteiner, zero, k8s });
      assert.ok(SERVICOS[x.servico] && (x.tambem === null || SERVICOS[x.tambem]), JSON.stringify({ oque, conteiner, zero, k8s }));
    }
  });
});
