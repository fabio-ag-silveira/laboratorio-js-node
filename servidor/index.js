/**
 * ============================================================================
 *  Laboratório Dev — ponto de entrada
 * ============================================================================
 *
 *  Este arquivo só faz uma coisa: coloca o servidor para escutar. A montagem
 *  das rotas está em `app.js`, separada de propósito (leia o comentário lá).
 *
 *  Rode com:  npm start
 * ============================================================================
 */

import { criarServidor } from './app.js';

// 4000 e não 3000: a porta 3000 é a preferida de quase todo projeto Node,
// então deixamos ela livre. Sobrescreva com  PORTA=5000 npm start  se quiser.
const PORTA = Number(process.env.PORTA ?? 4000);

// '127.0.0.1' e não '0.0.0.0': o laboratório executa código, então só a sua
// própria máquina pode falar com ele.
criarServidor().listen(PORTA, '127.0.0.1', () => {
  const linha = '─'.repeat(52);
  console.log(`
┌${linha}┐
│  Laboratório Dev
│
│  Abra no navegador:  http://localhost:${PORTA}
│
│  Parar: Ctrl + C
└${linha}┘
`);
});
