/**
 * Executa TODOS os blocos de código executáveis de todas as trilhas.
 *
 *     npm run verificar                  tudo
 *     npm run verificar -- visao         só uma trilha
 *     npm run verificar -- visao/metricas  só lições cujo endereço contém o texto
 *
 * Lição com exemplo quebrado ensina errado, então isto roda antes de todo
 * commit. Cada bloco pode declarar:
 *
 *     esperaFalha: true        o bloco DEVE terminar com erro (é a lição)
 *     requer: ['express']      só roda se o pacote npm estiver instalado
 *     requerPython: ['torch']  só roda se o módulo Python existir
 *
 * Os blocos de navegador rodam aqui no Node, com um `fetch` que entende URL
 * relativa apontando para um servidor do laboratório subido numa porta livre.
 */

import { createRequire } from 'node:module';
import { carregarTrilhas } from '../conteudo/index.js';
import { criarServidor } from '../servidor/app.js';
import { executar, ambiente } from '../servidor/executores/index.js';

const filtro = process.argv[2] ?? '';
const exigir = createRequire(import.meta.url);

// Diferença real entre os ambientes: promise rejeitada sem `catch` só gera um
// aviso no console do navegador, mas DERRUBA um processo Node. Há lições que
// fazem isso de propósito em blocos de navegador; aqui imitamos o navegador.
process.on('unhandledRejection', () => {});

const servidor = criarServidor().listen(0, '127.0.0.1');
await new Promise((r) => servidor.once('listening', r));
const BASE = `http://127.0.0.1:${servidor.address().port}`;

const amb = await ambiente();
const pacotesPython = amb.python.pacotes ?? {};
// nome de import -> nome do pacote, para o `requerPython`
const APELIDOS = { cv2: 'opencv-python', PIL: 'pillow', skimage: 'scikit-image', sklearn: 'scikit-learn' };

function temNpm(pacote) {
  try {
    exigir.resolve(pacote);
    return true;
  } catch {
    return false;
  }
}

/** Roda um bloco "de navegador" no Node. */
async function rodarComoNavegador(codigo) {
  const buscar = (url, opcoes) => fetch(typeof url === 'string' && url.startsWith('/') ? BASE + url : url, opcoes);
  const mudo = { log() {}, info() {}, debug() {}, warn() {}, error() {}, table() {} };
  const inicio = Date.now();
  try {
    const fabrica = new Function('console', 'fetch', `return (async () => {\n${codigo}\n})();`);
    await fabrica(mudo, buscar);
    return { codigoSaida: 0, erro: '', ms: Date.now() - inicio };
  } catch (e) {
    return { codigoSaida: 1, erro: `${e.name}: ${e.message}`, ms: Date.now() - inicio };
  }
}

const blocos = [];
for (const t of await carregarTrilhas()) {
  for (const m of t.modulos) {
    for (const l of m.licoes) {
      const onde = `${t.id}/${m.id}/${l.id}`;
      if (!onde.includes(filtro)) continue;
      for (const b of l.blocos) {
        if (b.t === 'codigo' && b.rodar) blocos.push({ onde, bloco: b });
      }
    }
  }
}

console.log(`${blocos.length} blocos executáveis${filtro ? ` (filtro: ${filtro})` : ''}\n`);

const placar = { ok: 0, pulado: 0, falhou: 0 };
const falhas = [];

for (const { onde, bloco } of blocos) {
  const nome = `${onde} — ${bloco.titulo ?? '(sem título)'}`;

  const faltaNpm = (bloco.requer ?? []).filter((p) => !temNpm(p));
  const faltaPy = (bloco.requerPython ?? []).filter((p) => !pacotesPython[APELIDOS[p] ?? p]);
  const semLinguagem =
    (bloco.rodar === 'python' && !amb.python.ok) || (bloco.rodar === 'csharp' && !amb.dotnet.ok);

  if (faltaNpm.length || faltaPy.length || semLinguagem) {
    const motivo = semLinguagem ? `${bloco.rodar} não instalado` : `falta ${[...faltaNpm, ...faltaPy].join(', ')}`;
    console.log(`pulado  [${bloco.rodar}] ${nome}  (${motivo})`);
    placar.pulado++;
    continue;
  }

  const r =
    bloco.rodar === 'browser'
      ? await rodarComoNavegador(bloco.codigo)
      : await executar(bloco.rodar, bloco.codigo, bloco.tempo);

  const terminouBem = r.codigoSaida === 0 && !r.expirou;
  const passou = bloco.esperaFalha ? !terminouBem : terminouBem;

  if (passou) {
    placar.ok++;
    console.log(`ok      [${bloco.rodar}] ${nome}  ${r.ms}ms${bloco.esperaFalha ? '  (falha esperada)' : ''}`);
  } else {
    placar.falhou++;
    const motivo = r.expirou ? 'tempo esgotado' : bloco.esperaFalha ? 'deveria falhar e não falhou' : (r.erro || '').trim();
    falhas.push({ nome, motivo });
    console.log(`FALHOU  [${bloco.rodar}] ${nome}`);
    console.log('        ' + motivo.split('\n').filter(Boolean).slice(-6).join('\n        '));
  }
}

servidor.close();

console.log(`\n${placar.ok} ok · ${placar.pulado} pulados · ${placar.falhou} com falha`);
process.exit(placar.falhou ? 1 : 0);
