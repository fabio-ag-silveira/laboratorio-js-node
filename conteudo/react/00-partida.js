export const modulo = {
  id: 'partida',
  titulo: 'Ponto de partida',
  cor: '#6aa9f0',
  licoes: [
    {
      id: 'mapa',
      titulo: 'A ideia do React em uma página',
      minutos: 9,
      resumo: 'Interface como função do estado. O que muda em relação a mexer no DOM na mão.',
      blocos: [
        {
          t: 'texto',
          md: `Você já escreveu interface sem framework: este laboratório é assim. Cada botão tem um \`addEventListener\`, e cada mudança é uma ordem dada ao DOM: crie este elemento, troque aquele texto, esconda aquele painel. Chama-se estilo **imperativo**.

Funciona, até a tela crescer. Com dez pedaços de estado e vinte lugares que dependem deles, cada evento precisa lembrar de atualizar todos os lugares certos. Esquecer um é o bug clássico: o contador diz 3 e a lista mostra 4.

O React troca o problema. Você escreve **uma função que recebe o estado e devolve como a tela deve ser**. Quando o estado muda, o React chama a função de novo e ajusta o DOM para bater com o resultado.

\`\`\`
tela = f(estado)
\`\`\`

Chama-se estilo **declarativo**. Você nunca mais escreve "troque o texto do contador". Escreve "o contador mostra \`n\`", e muda \`n\`.`,
        },
        {
          t: 'comparacao',
          esq: {
            titulo: 'Imperativo: ordens ao DOM',
            lang: 'js',
            codigo: `let capturas = 0;

const texto = document.createElement('p');
const botao = document.createElement('button');
botao.textContent = 'Registrar captura';
texto.textContent = 'Capturas: 0';

botao.addEventListener('click', () => {
  capturas += 1;
  // VOCÊ lembra de atualizar cada lugar
  texto.textContent = 'Capturas: ' + capturas;
  if (capturas >= 5) texto.classList.add('alerta');
});

document.body.append(texto, botao);`,
          },
          dir: {
            titulo: 'Declarativo: descreva a tela',
            lang: 'tsx',
            codigo: `function Contador() {
  const [capturas, setCapturas] = useState(0);

  // a tela, para QUALQUER valor de capturas
  return (
    <>
      <p className={capturas >= 5 ? 'alerta' : ''}>
        Capturas: {capturas}
      </p>
      <button onClick={() => setCapturas(capturas + 1)}>
        Registrar captura
      </button>
    </>
  );
}`,
          },
          nota: 'À direita não existe a linha "atualize o texto". Existe uma descrição da tela que vale para qualquer valor do estado. Para quem vem do Flutter: é o mesmo modelo de `build()` e `setState`.',
        },
        {
          t: 'texto',
          md: `### A primeira prévia

O bloco abaixo é um editor de verdade ligado a uma prévia ao vivo. **Mexa no código**: troque o texto, o passo do contador, o limite do alerta. A prévia se refaz meio segundo depois de você parar de digitar.`,
        },
        {
          t: 'previa',
          titulo: 'Um componente com estado',
          altura: 130,
          codigo: `import { useState } from 'react';

export default function App() {
  const [capturas, setCapturas] = useState(0);
  const alerta = capturas >= 5;

  return (
    <div>
      <h2 style={{ color: alerta ? 'var(--vermelho)' : 'inherit' }}>
        Capturas: {capturas}
      </h2>
      {alerta && <p>Acima do nível de controle. Avisar o agrônomo.</p>}
      <button onClick={() => setCapturas(capturas + 1)}>Registrar captura</button>{' '}
      <button onClick={() => setCapturas(0)}>Zerar</button>
    </div>
  );
}`,
        },
        {
          t: 'texto',
          md: `Três coisas já estão ali, e são a trilha inteira em miniatura:

- **Componente**: uma função que devolve a descrição de um pedaço de tela. O nome começa com maiúscula.
- **JSX**: a sintaxe parecida com HTML dentro do JavaScript. Entre chaves vai qualquer expressão.
- **Estado**: \`useState\` guarda um valor entre uma chamada e outra da função, e devolve o jeito de mudá-lo.

### Como esta prévia funciona, e como é num projeto real

O navegador não entende JSX. Alguma ferramenta precisa transformar \`<h2>\` em chamadas de função antes.

| | Aqui no laboratório | Num projeto real |
|---|---|---|
| Transformar JSX e TypeScript | o servidor do laboratório, com o esbuild | **Vite** (que usa esbuild e Rolldown) |
| Achar o pacote \`react\` | um *import map* apontando para um arquivo empacotado | o Vite resolve em \`node_modules\` |
| Onde roda | num iframe isolado, um arquivo só | no navegador, vários arquivos |
| Atualizar ao salvar | recria o iframe | *hot reload*, mantendo o estado |

Para criar um projeto de verdade, quando chegar a hora:

\`\`\`bash
npm create vite@latest painel -- --template react-ts
cd painel && npm install && npm run dev
\`\`\`

O que você aprender aqui vale lá sem mudar uma linha. A última parte da trilha monta esse projeto.`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Você já conhece', 'No React é'],
          linhas: [
            ['Função que devolve HTML como texto (template)', 'componente que devolve JSX'],
            ['`build()` de um Widget no Flutter', 'o corpo da função do componente'],
            ['`setState` do Flutter', '`useState` e a função de atualização'],
            ['Parâmetros do construtor do Widget', '*props*'],
            ['`addEventListener`', 'atributos `onClick`, `onChange`'],
            ['Jinja `{% for %}` e `{% if %}`', '`.map()` e `&&` ou ternário, em JavaScript puro'],
            ['Classe com estado interno', 'função + hooks (classes caíram em desuso)'],
          ],
        },
        {
          t: 'texto',
          md: `### A trilha

- **1 · Fundamentos**: JSX, componentes, props, listas, estado e o ciclo de renderização.
- **2 · Hooks**: formulários, efeitos, refs, memoização, hooks próprios, reducer e contexto.
- **3 · Aplicação**: TypeScript no React, dados do servidor, React 19, e o projeto real com Vite, rotas e testes. Termina num painel de detecções que consome a API do laboratório.

Pré-requisito: a trilha de JavaScript, em especial funções de seta, desestruturação, \`map\` e \`filter\`, e \`async/await\`.`,
        },
        {
          t: 'quiz',
          pergunta: 'O que significa dizer que o React é declarativo?',
          opcoes: [
            'Que todo componente precisa declarar seus tipos.',
            'Que você descreve como a tela deve ser para um dado estado, e o React cuida de atualizar o DOM quando o estado muda.',
            'Que o código roda no servidor.',
            'Que não se usa JavaScript.',
          ],
          correta: 1,
          explicacao: 'No estilo imperativo você dá as ordens de atualização uma a uma. No declarativo você escreve a função estado → tela, e a biblioteca calcula as ordens.',
        },
        {
          t: 'quiz',
          pergunta: 'Por que o navegador não executa um arquivo com JSX diretamente?',
          opcoes: [
            'Porque JSX é uma linguagem de servidor.',
            'Porque JSX não é JavaScript válido: uma ferramenta de build precisa transformá-lo em chamadas de função antes.',
            'Porque o React é pago.',
            'Porque falta um plugin no navegador.',
          ],
          correta: 1,
          explicacao: 'JSX é açúcar sintático. `<h2>oi</h2>` vira algo como `jsx("h2", { children: "oi" })`. Quem faz a troca é o Vite, o esbuild, o Babel ou o compilador do TypeScript.',
        },
      ],
    },
  ],
};
