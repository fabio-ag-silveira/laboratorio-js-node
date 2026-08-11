/**
 * Executor de código Node.
 *
 * Quando você clica em "Rodar no Node" no laboratório, o código vai para um
 * arquivo temporário e é executado por um processo Node SEPARADO. Assim, se o
 * seu código travar, entrar em loop infinito ou derrubar o processo, o
 * laboratório continua de pé.
 *
 * É o mesmo papel do `subprocess.run([...])` do Python.
 *
 * Aviso honesto: isto NÃO é uma sandbox de segurança. O código roda com as
 * suas permissões de usuário. Como é você quem escreve e o servidor só escuta
 * em 127.0.0.1 (sua própria máquina), tudo bem — mas não exponha na rede.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const TEMPO_LIMITE_MS = 5000;
const MAX_SAIDA = 20_000; // caracteres

export async function executarNode(codigo) {
  const arquivo = path.join(os.tmpdir(), `lab-${randomUUID()}.mjs`);
  await fs.writeFile(arquivo, codigo, 'utf8');

  const inicio = Date.now();

  try {
    return await new Promise((resolve) => {
      const processo = spawn(process.execPath, [arquivo], {
        // Corta o acesso ao stdin: nada de esperar por input do teclado.
        stdio: ['ignore', 'pipe', 'pipe'],
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

      processo.stdout.on('data', acumular('saida'));
      processo.stderr.on('data', acumular('erro'));

      const relogio = setTimeout(() => {
        expirou = true;
        processo.kill('SIGKILL');
      }, TEMPO_LIMITE_MS);

      processo.on('close', (codigoSaida) => {
        clearTimeout(relogio);
        resolve({
          saida: saida.slice(0, MAX_SAIDA),
          erro: erro.slice(0, MAX_SAIDA),
          codigoSaida,
          ms: Date.now() - inicio,
          expirou,
          cortado,
        });
      });

      processo.on('error', (e) => {
        clearTimeout(relogio);
        resolve({
          saida: '',
          erro: `Não foi possível iniciar o Node: ${e.message}`,
          codigoSaida: -1,
          ms: Date.now() - inicio,
          expirou: false,
          cortado: false,
        });
      });
    });
  } finally {
    // `finally` roda mesmo se algo der errado acima — é onde vai a limpeza.
    await fs.unlink(arquivo).catch(() => {});
  }
}
