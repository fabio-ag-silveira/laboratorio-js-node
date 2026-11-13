/**
 * Registro das linguagens que o laboratório sabe executar.
 *
 * Cada linguagem diz qual comando usar, a extensão do arquivo e o tempo
 * limite padrão. O resto (pasta temporária, relógio, limpeza) é igual para
 * todas e mora em `processo.js`.
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { executarProcesso } from './processo.js';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, '..', '..');
const APOIO_PYTHON = path.join(AQUI, '..', 'apoio-python');

/** Roda um comando curto e devolve a saída, ou null se ele não existir. */
function sondar(comando, args, tempoMs = 15_000) {
  return new Promise((resolve) => {
    let saida = '';
    let processo;
    try {
      processo = spawn(comando, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    } catch {
      return resolve(null);
    }
    const relogio = setTimeout(() => processo.kill('SIGKILL'), tempoMs);
    processo.stdout.on('data', (d) => (saida += d));
    processo.stderr.on('data', (d) => (saida += d));
    processo.on('error', () => {
      clearTimeout(relogio);
      resolve(null);
    });
    processo.on('close', (codigo) => {
      clearTimeout(relogio);
      resolve(codigo === 0 ? saida.trim() : null);
    });
  });
}

// ---- Python ---------------------------------------------------------------

let pythonDescoberto; // promise, para sondar uma vez só

/** No Windows o comando costuma ser `python`; no Linux/macOS, `python3`. */
function descobrirPython() {
  pythonDescoberto ??= (async () => {
    for (const comando of ['python', 'python3', 'py']) {
      const versao = await sondar(comando, ['--version']);
      if (versao?.startsWith('Python 3')) return { comando, versao: versao.replace('Python ', '') };
    }
    return null;
  })();
  return pythonDescoberto;
}

const PACOTES_PYTHON = [
  ['numpy', 'numpy'],
  ['cv2', 'opencv-python'],
  ['PIL', 'pillow'],
  ['matplotlib', 'matplotlib'],
  ['torch', 'torch'],
  ['torchvision', 'torchvision'],
  ['ultralytics', 'ultralytics'],
  ['onnxruntime', 'onnxruntime'],
  ['skimage', 'scikit-image'],
  ['sklearn', 'scikit-learn'],
  ['fastapi', 'fastapi'],
];

/**
 * Lista os pacotes instalados SEM importá-los (importar o torch leva segundos).
 * `find_spec` só confere se o módulo existe; `metadata.version` lê a versão.
 */
async function pacotesPython(comando) {
  const script = `
import importlib.util, importlib.metadata, json
pares = ${JSON.stringify(PACOTES_PYTHON)}
saida = {}
for modulo, pacote in pares:
    if importlib.util.find_spec(modulo) is None:
        saida[pacote] = None
        continue
    try:
        saida[pacote] = importlib.metadata.version(pacote)
    except Exception:
        saida[pacote] = "instalado"
print(json.dumps(saida))
`;
  const bruto = await sondar(comando, ['-c', script]);
  try {
    return JSON.parse(bruto);
  } catch {
    return {};
  }
}

// ---- .NET -----------------------------------------------------------------

let dotnetDescoberto;

/** `dotnet run arquivo.cs` (app de arquivo único) existe a partir do SDK 10. */
function descobrirDotnet() {
  dotnetDescoberto ??= (async () => {
    const lista = await sondar('dotnet', ['--list-sdks']);
    if (!lista) return null;
    const versoes = lista
      .split('\n')
      .map((l) => l.trim().split(' ')[0])
      .filter(Boolean);
    const maior = versoes.map((v) => Number(v.split('.')[0])).sort((a, b) => b - a)[0];
    if (!maior) return null;
    return { versao: versoes.at(-1), arquivoUnico: maior >= 10 };
  })();
  return dotnetDescoberto;
}

// ---- API pública ----------------------------------------------------------

// Teto do tempo que um bloco pode pedir. Quinze minutos cobrem o treino de um
// detector pequeno na lição de laboratório; nada além disso deve rodar aqui.
const TEMPO_MAXIMO_S = 900;

export const LINGUAGENS = ['node', 'python', 'csharp'];

/**
 * Executa `codigo` na linguagem pedida.
 * @param {string} linguagem  'node' | 'python' | 'csharp'
 * @param {string} codigo
 * @param {number} [tempoS]   tempo limite em segundos (o bloco pode pedir mais)
 */
export async function executar(linguagem, codigo, tempoS) {
  const tempoMs = (padrao) => Math.min(tempoS ?? padrao, TEMPO_MAXIMO_S) * 1000;

  if (linguagem === 'node') {
    return executarProcesso({
      comando: process.execPath,
      argumentos: (arquivo) => [arquivo],
      extensao: '.mjs',
      codigo,
      tempoMs: tempoMs(5),
      // Dentro do projeto, e não na pasta temporária do sistema: o Node procura
      // `node_modules` subindo a partir do ARQUIVO, então só assim um bloco
      // consegue importar pacotes que você instalou com npm (o Express, p. ex.).
      base: path.join(RAIZ, '.execucao'),
    });
  }

  if (linguagem === 'python') {
    const python = await descobrirPython();
    if (!python) return falta('Python 3 não encontrado no PATH.', 'winget install Python.Python.3.13');
    return executarProcesso({
      comando: python.comando,
      argumentos: (arquivo) => [arquivo],
      extensao: '.py',
      codigo,
      tempoMs: tempoMs(60),
      env: {
        // deixa `import lab` funcionar em qualquer bloco
        PYTHONPATH: [APOIO_PYTHON, process.env.PYTHONPATH].filter(Boolean).join(path.delimiter),
        // sem isto, print com acento quebra no console do Windows (cp1252)
        PYTHONIOENCODING: 'utf-8',
        PYTHONUTF8: '1',
        PYTHONUNBUFFERED: '1',
        // matplotlib sem janela: as figuras vão para arquivo
        MPLBACKEND: 'Agg',
        LAB_IMAGENS: path.join(RAIZ, 'imagens'),
        // onde ficam pesos de modelos baixados, para não baixar de novo
        LAB_MODELOS: path.join(RAIZ, 'modelos'),
        YOLO_VERBOSE: 'false',
      },
    });
  }

  if (linguagem === 'csharp') {
    const dotnet = await descobrirDotnet();
    if (!dotnet) return falta('SDK do .NET não encontrado.', 'winget install Microsoft.DotNet.SDK.10');
    if (!dotnet.arquivoUnico) {
      return falta(
        `SDK ${dotnet.versao} encontrado, mas "dotnet run arquivo.cs" exige o SDK 10 ou mais novo.`,
        'winget install Microsoft.DotNet.SDK.10',
      );
    }
    return executarProcesso({
      comando: 'dotnet',
      argumentos: (arquivo) => ['run', arquivo],
      extensao: '.cs',
      codigo,
      tempoMs: tempoMs(90),
      env: { DOTNET_NOLOGO: '1', DOTNET_CLI_TELEMETRY_OPTOUT: '1' },
    });
  }

  return falta(`Linguagem desconhecida: ${linguagem}`);
}

/** Resposta padrão para "falta instalar alguma coisa". */
function falta(mensagem, instalar) {
  return {
    partes: [],
    saida: '',
    erro: mensagem,
    instalar: instalar ?? null,
    codigoSaida: -1,
    ms: 0,
    expirou: false,
    cortado: false,
    faltaAmbiente: true,
  };
}

/** O que está instalado nesta máquina — a interface usa para avisar o que falta. */
export async function ambiente() {
  const [python, dotnet] = await Promise.all([descobrirPython(), descobrirDotnet()]);

  return {
    node: { ok: true, versao: process.version.replace('v', '') },
    python: python
      ? { ok: true, versao: python.versao, pacotes: await pacotesPython(python.comando) }
      : { ok: false, instalar: 'winget install Python.Python.3.13' },
    dotnet: dotnet
      ? { ok: dotnet.arquivoUnico, versao: dotnet.versao, instalar: dotnet.arquivoUnico ? null : 'winget install Microsoft.DotNet.SDK.10' }
      : { ok: false, instalar: 'winget install Microsoft.DotNet.SDK.10' },
  };
}
