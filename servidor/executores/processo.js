/**
 * Executor genérico: roda um trecho de código num processo SEPARADO.
 *
 * Node, Python e C# passam todos por aqui — muda só o comando e a extensão do
 * arquivo. O código vai para uma pasta temporária, o processo roda com tempo
 * limite, e a pasta é apagada no fim. Se o código travar ou derrubar o
 * processo, o laboratório continua de pé.
 *
 * É o mesmo papel do `subprocess.run([...], timeout=...)` do Python.
 *
 * Aviso honesto: isto NÃO é uma sandbox de segurança. O código roda com as
 * suas permissões de usuário. Como é você quem escreve e o servidor só escuta
 * em 127.0.0.1, tudo bem — mas não exponha na rede.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const MAX_SAIDA = 40_000; // caracteres de texto
const MAX_IMAGENS = 24;

/**
 * Marcador que o módulo de apoio do Python (`lab.py`) imprime para dizer
 * "aqui entra uma imagem". O caractere 0x1E (record separator) não aparece em
 * saída normal de programa, então não há risco de confundir com um print.
 */
const MARCADOR = '\u001eLAB:IMG:';

/**
 * @param {object} opcoes
 * @param {string} opcoes.comando     executável (ex.: 'python')
 * @param {(arquivo: string) => string[]} opcoes.argumentos
 * @param {string} opcoes.extensao    ex.: '.py'
 * @param {string} opcoes.codigo
 * @param {number} opcoes.tempoMs
 * @param {object} [opcoes.env]       variáveis de ambiente extras
 * @param {string} [opcoes.base]      onde criar a pasta temporária
 */
export async function executarProcesso({ comando, argumentos, extensao, codigo, tempoMs, env = {}, base = os.tmpdir() }) {
  const pasta = path.join(base, `lab-${randomUUID()}`);
  await fs.mkdir(pasta, { recursive: true });
  const arquivo = path.join(pasta, `codigo${extensao}`);
  await fs.writeFile(arquivo, codigo, 'utf8');

  const inicio = Date.now();

  try {
    const bruto = await new Promise((resolve) => {
      const processo = spawn(comando, argumentos(arquivo), {
        cwd: pasta,
        // stdin cortado: nada de ficar esperando input do teclado.
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, ...env, LAB_SAIDA: pasta },
        windowsHide: true,
      });

      let saida = '';
      let erro = '';
      let cortado = false;
      let expirou = false;

      const acumular = (destino) => (pedaco) => {
        if (saida.length + erro.length > MAX_SAIDA) {
          cortado = true;
          processo.kill('SIGKILL');
          return;
        }
        if (destino === 'saida') saida += pedaco;
        else erro += pedaco;
      };

      processo.stdout.setEncoding('utf8').on('data', acumular('saida'));
      processo.stderr.setEncoding('utf8').on('data', acumular('erro'));

      const relogio = setTimeout(() => {
        expirou = true;
        processo.kill('SIGKILL');
      }, tempoMs);

      processo.on('close', (codigoSaida) => {
        clearTimeout(relogio);
        resolve({ saida, erro, codigoSaida, expirou, cortado });
      });

      processo.on('error', (e) => {
        clearTimeout(relogio);
        resolve({
          saida: '',
          erro: `Não foi possível iniciar "${comando}": ${e.message}`,
          codigoSaida: -1,
          expirou: false,
          cortado: false,
        });
      });
    });

    // O compilador do C# escreve erros e avisos na saída padrão, com o caminho
    // completo do arquivo temporário: tira-se o caminho aqui também.
    const partes = await separarPartes(limparCaminho(bruto.saida, pasta), pasta);

    return {
      partes,
      // `saida` é o texto puro, sem os marcadores de imagem — mantém
      // compatível quem só quer o texto (testes, verificação).
      saida: partes
        .filter((p) => p.tipo === 'texto')
        .map((p) => p.texto)
        .join(''),
      erro: limparCaminho(bruto.erro, pasta),
      codigoSaida: bruto.codigoSaida,
      ms: Date.now() - inicio,
      expirou: bruto.expirou,
      cortado: bruto.cortado,
      tempoLimiteMs: tempoMs,
    };
  } finally {
    // `finally` roda mesmo se algo der errado acima — é onde vai a limpeza.
    await fs.rm(pasta, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Quebra a saída em pedaços de texto e de imagem, na ordem em que apareceram.
 * Cada imagem foi gravada pelo programa na pasta temporária; aqui ela vira uma
 * data URL (base64) para viajar dentro do JSON da resposta.
 */
async function separarPartes(saida, pasta) {
  const partes = [];
  let texto = '';
  let imagens = 0;

  const fecharTexto = () => {
    if (texto) partes.push({ tipo: 'texto', texto });
    texto = '';
  };

  for (const linha of saida.split('\n')) {
    // Barras de progresso reescrevem a própria linha com \r (retorno de carro)
    // e códigos ANSI de cor. Um terminal mostraria só o último estado da linha;
    // fazemos o mesmo, senão um download vira dezenas de linhas de lixo.
    const limpa = linha
      .replace(/\r$/, '')
      .split('\r')
      .pop()
      .replace(/\u001b\[[0-9;?]*[A-Za-z]/g, '');
    if (!limpa.startsWith(MARCADOR)) {
      // `limpa` e não `linha`: no Windows o processo escreve CRLF, e o \r
      // sobrando vira um caractere invisível no fim de cada linha da tela.
      texto += limpa + '\n';
      continue;
    }

    // formato:  <marcador>arquivo.png|título
    const [nome, ...resto] = limpa.slice(MARCADOR.length).split('|');
    const titulo = resto.join('|');
    // path.basename garante que o programa não aponte para fora da pasta.
    const caminho = path.join(pasta, path.basename(nome));
    if (imagens >= MAX_IMAGENS) continue;

    try {
      const dados = await fs.readFile(caminho);
      fecharTexto();
      partes.push({
        tipo: 'imagem',
        titulo,
        url: `data:image/png;base64,${dados.toString('base64')}`,
      });
      imagens++;
    } catch {
      texto += `(imagem "${titulo}" não pôde ser lida)\n`;
    }
  }

  // o split deixa um '\n' sobrando no fim; tiramos só esse
  texto = texto.replace(/\n$/, '');
  fecharTexto();
  return partes;
}

/** Troca o caminho temporário feio por um nome curto nas mensagens de erro. */
function limparCaminho(texto, pasta) {
  return texto.split(pasta + path.sep).join('').split(pasta).join('.');
}
