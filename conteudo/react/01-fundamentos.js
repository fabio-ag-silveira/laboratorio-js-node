export const modulo = {
  id: 'fundamentos',
  titulo: 'Fundamentos',
  cor: '#6aa9f0',
  licoes: [
    // ------------------------------------------------------------------
    {
      id: 'jsx-e-componentes',
      titulo: 'JSX e componentes',
      minutos: 12,
      resumo: 'A sintaxe, as cinco regras que pegam todo iniciante, e como compor uma tela a partir de funções.',
      blocos: [
        {
          t: 'texto',
          md: `**JSX** é JavaScript com uma sintaxe extra para descrever elementos. Não é HTML, e não é texto: cada tag vira um **objeto** que descreve o que deve existir na tela.

\`\`\`tsx
const elemento = <h1 className="titulo">Usina Boa Vista</h1>;
// é o mesmo que:
const elemento = jsx('h1', { className: 'titulo', children: 'Usina Boa Vista' });
\`\`\`

Por ser JavaScript, um trecho de JSX pode ser guardado em variável, devolvido por função, posto num array.

### As chaves

Dentro do JSX, \`{ }\` abre uma janela para **qualquer expressão** JavaScript: uma variável, uma conta, uma chamada de função, outro JSX.`,
        },
        {
          t: 'previa',
          titulo: 'Expressões dentro do JSX',
          altura: 170,
          codigo: `export default function App() {
  const usina = 'Boa Vista';
  const capturas = [12, 7, 31, 4];
  const total = capturas.reduce((soma, n) => soma + n, 0);
  const estilo = { color: 'var(--destaque)', fontWeight: 600 };

  return (
    <div>
      <h2>Usina {usina.toUpperCase()}</h2>
      <p>
        {capturas.length} armadilhas, <span style={estilo}>{total} insetos</span>,
        média de {(total / capturas.length).toFixed(1)} por armadilha.
      </p>
      <p>Maior captura: {Math.max(...capturas)}</p>
      <p>Lida em {new Date().toLocaleDateString('pt-BR')}</p>
    </div>
  );
}`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Regra do JSX', 'Errado', 'Certo'],
          linhas: [
            ['Um componente devolve **um** elemento raiz', 'dois `<p>` soltos lado a lado', 'embrulhar em `<div>` ou no fragmento `<>...</>`'],
            ['Toda tag fecha', '`<img>`, `<br>`, `<input>`', '`<img />`, `<br />`, `<input />`'],
            ['Atributos em camelCase', '`class`, `onclick`, `for`', '`className`, `onClick`, `htmlFor`'],
            ['`style` é um objeto', '`style="color: red"`', '`style={{ color: "red" }}`'],
            ['Chaves aceitam expressão, e não comando', '`{if (x) ...}`, `{for ...}`', '`{x ? a : b}`, `{x && a}`, `{lista.map(...)}`'],
          ],
        },
        {
          t: 'nota',
          estilo: 'pegadinha',
          md: `**As chaves duplas de \`style={{ ... }}\` não são sintaxe especial.** A de fora abre a janela para JavaScript. A de dentro é um objeto literal comum. Na prática, quase nunca se usa \`style\`: usa-se \`className\` com CSS. Nas prévias desta trilha o \`style\` aparece para o exemplo caber num arquivo só.`,
        },
        {
          t: 'texto',
          md: `### Componentes

Um **componente** é uma função que devolve JSX. Duas regras:

1. O nome começa com **maiúscula**. \`<cartao />\` é lido como tag HTML desconhecida. \`<Cartao />\` é lido como "chame a função \`Cartao\`".
2. A função é **pura** em relação à renderização: para as mesmas entradas, devolve o mesmo JSX, e não altera nada de fora enquanto calcula.

Uma tela é uma árvore de componentes, do mesmo jeito que um programa é uma árvore de chamadas de função.`,
        },
        {
          t: 'previa',
          titulo: 'Compor a tela com componentes',
          altura: 230,
          codigo: `function Selo({ nivel }) {
  const cor = nivel === 'alto' ? 'var(--vermelho)' : nivel === 'médio' ? 'var(--amarelo)' : 'var(--verde)';
  return (
    <span style={{ border: '1px solid ' + cor, color: cor, borderRadius: 99, padding: '1px 9px', fontSize: 12 }}>
      {nivel}
    </span>
  );
}

function Armadilha({ codigo, insetos }) {
  const nivel = insetos >= 20 ? 'alto' : insetos >= 8 ? 'médio' : 'baixo';
  return (
    <div style={{ border: '1px solid var(--borda)', borderRadius: 8, padding: 10, marginBottom: 8 }}>
      <strong>{codigo}</strong> · {insetos} insetos <Selo nivel={nivel} />
    </div>
  );
}

export default function App() {
  return (
    <div>
      <h3>Talhão 14</h3>
      <Armadilha codigo="A-01" insetos={31} />
      <Armadilha codigo="A-02" insetos={12} />
      <Armadilha codigo="A-03" insetos={3} />
    </div>
  );
}`,
        },
        {
          t: 'texto',
          md: `\`Armadilha\` foi usada três vezes com dados diferentes, e ela mesma usa \`Selo\`. Os dados chegam pelos atributos: são as **props**, assunto da próxima lição.

Repare em \`insetos={31}\` e \`codigo="A-01"\`. Texto pode ir entre aspas. Todo o resto (número, booleano, objeto, função) vai entre chaves.`,
        },
        {
          t: 'previa',
          titulo: 'Cartão de usina',
          enunciado: `Crie o componente \`Usina\`, que recebe \`nome\` e \`armadilhas\` (um número) e mostra um \`<h3>\` com o nome e um \`<p>\` com o texto **"N armadilhas ativas"**. O \`App\` já usa o componente duas vezes.`,
          altura: 150,
          codigo: `function Usina({ nome, armadilhas }) {
  // devolva o JSX aqui
  return null;
}

export default function App() {
  return (
    <div>
      <Usina nome="Boa Vista" armadilhas={42} />
      <Usina nome="Santa Helena" armadilhas={17} />
    </div>
  );
}`,
          solucao: `function Usina({ nome, armadilhas }) {
  return (
    <div>
      <h3>{nome}</h3>
      <p>{armadilhas} armadilhas ativas</p>
    </div>
  );
}

export default function App() {
  return (
    <div>
      <Usina nome="Boa Vista" armadilhas={42} />
      <Usina nome="Santa Helena" armadilhas={17} />
    </div>
  );
}`,
          dica: 'Um componente devolve um elemento raiz só. Embrulhe o `<h3>` e o `<p>` num `<div>` ou em `<>...</>`.',
          testes: [
            { nome: 'mostra dois títulos <h3>', codigo: `afirmar(tela.acharTodos('h3').length === 2, 'esperava 2 <h3>, achei ' + tela.acharTodos('h3').length);` },
            { nome: 'os nomes das usinas aparecem', codigo: `afirmar(tela.texto().includes('Boa Vista') && tela.texto().includes('Santa Helena'), 'faltou o nome de alguma usina');` },
            { nome: 'mostra "42 armadilhas ativas"', codigo: `afirmar(tela.texto().includes('42 armadilhas ativas'), 'não achei o texto "42 armadilhas ativas"');` },
            { nome: 'mostra "17 armadilhas ativas"', codigo: `afirmar(tela.texto().includes('17 armadilhas ativas'), 'não achei o texto "17 armadilhas ativas"');` },
          ],
        },
        {
          t: 'quiz',
          pergunta: 'Por que o nome de um componente precisa começar com letra maiúscula?',
          opcoes: [
            'É só convenção de estilo.',
            'Porque o JSX trata tags minúsculas como elementos HTML e tags maiúsculas como referência a uma função ou variável.',
            'Porque o TypeScript exige.',
            'Para o componente ser exportado.',
          ],
          correta: 1,
          explicacao: '`<selo />` vira `jsx("selo")`, uma tag desconhecida. `<Selo />` vira `jsx(Selo)`, a chamada do seu componente.',
        },
        {
          t: 'quiz',
          pergunta: 'O que pode ir dentro das chaves `{ }` no JSX?',
          opcoes: [
            'Qualquer código JavaScript, incluindo `if` e `for`.',
            'Qualquer expressão JavaScript: algo que produz um valor.',
            'Apenas variáveis.',
            'Apenas texto.',
          ],
          correta: 1,
          explicacao: '`if` e `for` são comandos e não produzem valor. Usa-se o ternário, o `&&` e o `.map()`, que são expressões.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'props-e-listas',
      titulo: 'Props, condicionais e listas',
      minutos: 13,
      resumo: 'Como os dados descem pela árvore, como mostrar ou esconder, e por que toda lista precisa de `key`.',
      blocos: [
        {
          t: 'texto',
          md: `**Props** são os parâmetros de um componente. O React junta todos os atributos da tag num único objeto e o passa como primeiro argumento. A desestruturação na assinatura é o idioma padrão:

\`\`\`tsx
function Armadilha({ codigo, insetos = 0, aoAbrir }) { ... }
//                           ↑ valor padrão, como em Python
\`\`\`

Três propriedades das props:

- **Só de leitura.** Um componente nunca altera as próprias props. Os dados descem do pai para o filho.
- **Qualquer valor.** Texto, número, objeto, array, **função** e até outro JSX.
- **\`children\`** é a prop especial que recebe o que vai *entre* a tag de abertura e a de fechamento.

Dados descem por props. Para um filho avisar o pai de algo, o pai passa uma **função** como prop e o filho a chama. É o mesmo padrão de callback que você já usa.`,
        },
        {
          t: 'previa',
          titulo: 'children e funções como props',
          altura: 220,
          codigo: `import { useState } from 'react';

// "children" é o que vier entre <Cartao> e </Cartao>
function Cartao({ titulo, children }) {
  return (
    <section style={{ border: '1px solid var(--borda)', borderRadius: 8, padding: 12, marginBottom: 10 }}>
      <h3>{titulo}</h3>
      {children}
    </section>
  );
}

// o filho não sabe o que acontece ao clicar: só chama a função que recebeu
function BotaoDeLeitura({ codigo, aoLer }) {
  return <button onClick={() => aoLer(codigo)}>Ler {codigo}</button>;
}

export default function App() {
  const [ultima, setUltima] = useState('nenhuma');

  return (
    <Cartao titulo="Talhão 14">
      <p>Última armadilha lida: <strong>{ultima}</strong></p>
      <BotaoDeLeitura codigo="A-01" aoLer={setUltima} />{' '}
      <BotaoDeLeitura codigo="A-02" aoLer={setUltima} />
    </Cartao>
  );
}`,
        },
        {
          t: 'texto',
          md: `### Mostrar ou esconder

Não existe \`v-if\` nem \`{% if %}\`. É JavaScript:

| Quero | Escrevo |
|---|---|
| mostrar A ou B | \`{cond ? <A /> : <B />}\` |
| mostrar A ou nada | \`{cond && <A />}\` |
| lógica maior | um \`if\` **antes** do \`return\`, guardando o JSX numa variável; ou um componente menor |

O React não desenha \`false\`, \`null\` nem \`undefined\`. É isso que faz o \`&&\` funcionar.`,
        },
        {
          t: 'nota',
          estilo: 'pegadinha',
          md: `**O zero aparece na tela.** \`{lista.length && <Lista />}\` com a lista vazia desenha um **0**, porque \`0 && x\` vale \`0\`, e número o React desenha. Escreva a condição como booleano: \`{lista.length > 0 && <Lista />}\`.`,
        },
        {
          t: 'texto',
          md: `### Listas

Para desenhar uma lista, transforma-se um array de dados num array de elementos, com \`.map()\`. Cada elemento precisa de uma prop **\`key\`**: um identificador estável e único entre os irmãos.

A \`key\` é como o React sabe, entre uma renderização e a seguinte, **qual item é qual**. Sem ela, ele compara por posição. A prévia abaixo mostra o que isso causa: digite alguma coisa no primeiro campo e clique em "Inserir no início".`,
        },
        {
          t: 'previa',
          titulo: 'O defeito de usar o índice como key',
          altura: 250,
          codigo: `import { useState } from 'react';

let proximo = 3;

function Linha({ armadilha }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
      <code>{armadilha.codigo}</code>
      <input placeholder="observação" />
    </div>
  );
}

export default function App() {
  const [itens, setItens] = useState([
    { id: 1, codigo: 'A-01' },
    { id: 2, codigo: 'A-02' },
  ]);
  const [porId, setPorId] = useState(false);

  const inserir = () => {
    proximo += 1;
    setItens([{ id: proximo, codigo: 'A-0' + proximo }, ...itens]);
  };

  return (
    <div>
      <p>
        <label>
          <input type="checkbox" checked={porId} onChange={(e) => setPorId(e.target.checked)} />{' '}
          usar <code>key={'{a.id}'}</code> (desmarcado: usa o índice)
        </label>
      </p>
      {itens.map((a, i) => (
        <Linha key={porId ? a.id : i} armadilha={a} />
      ))}
      <button onClick={inserir}>Inserir no início</button>
    </div>
  );
}`,
        },
        {
          t: 'texto',
          md: `Com o índice, a observação que você digitou para a **A-01** fica colada na **primeira posição**, e passa a aparecer ao lado da armadilha nova. O React viu "a chave 0 continua existindo" e manteve o campo de texto, com o conteúdo dele, trocando só o código ao lado. Marque a caixa (os campos são recriados e esvaziam, porque todas as chaves mudaram) e repita: com o \`id\`, a observação acompanha a armadilha.

A regra: **a \`key\` vem do dado**, de um \`id\` do banco. O índice só serve para lista que nunca reordena, insere no meio nem remove.`,
        },
        {
          t: 'previa',
          titulo: 'Lista de capturas',
          enunciado: `Complete \`ListaDeCapturas\`. Ela recebe \`capturas\`, um array de \`{ id, armadilha, insetos }\`.

- Lista vazia: mostre um \`<p>\` com **"Nenhuma captura registrada."**
- Caso contrário: uma \`<ul>\` com um \`<li>\` por captura, no formato **"A-01: 12 insetos"**.
- Capturas com 20 insetos ou mais ganham a classe CSS \`alerta\` no \`<li>\`.`,
          altura: 190,
          codigo: `function ListaDeCapturas({ capturas }) {
  // seu código
  return null;
}

export default function App() {
  const capturas = [
    { id: 7, armadilha: 'A-01', insetos: 12 },
    { id: 8, armadilha: 'A-02', insetos: 31 },
    { id: 9, armadilha: 'A-03', insetos: 4 },
  ];
  return (
    <div>
      <h3>Com dados</h3>
      <ListaDeCapturas capturas={capturas} />
      <h3>Sem dados</h3>
      <ListaDeCapturas capturas={[]} />
    </div>
  );
}`,
          solucao: `function ListaDeCapturas({ capturas }) {
  if (capturas.length === 0) return <p>Nenhuma captura registrada.</p>;

  return (
    <ul>
      {capturas.map((c) => (
        <li key={c.id} className={c.insetos >= 20 ? 'alerta' : undefined}>
          {c.armadilha}: {c.insetos} insetos
        </li>
      ))}
    </ul>
  );
}

export default function App() {
  const capturas = [
    { id: 7, armadilha: 'A-01', insetos: 12 },
    { id: 8, armadilha: 'A-02', insetos: 31 },
    { id: 9, armadilha: 'A-03', insetos: 4 },
  ];
  return (
    <div>
      <h3>Com dados</h3>
      <ListaDeCapturas capturas={capturas} />
      <h3>Sem dados</h3>
      <ListaDeCapturas capturas={[]} />
    </div>
  );
}`,
          dica: 'Um `if` antes do `return` resolve o caso vazio. No `.map()`, a `key` vai no elemento mais externo devolvido: o `<li>`.',
          testes: [
            { nome: 'desenha três <li>', codigo: `afirmar(tela.acharTodos('li').length === 3, 'esperava 3 <li>, achei ' + tela.acharTodos('li').length);` },
            { nome: 'o formato é "A-01: 12 insetos"', codigo: `afirmar(tela.acharTodos('li').some((li) => li.innerText.trim() === 'A-01: 12 insetos'), 'nenhum <li> tem exatamente o texto "A-01: 12 insetos"');` },
            { nome: 'só a captura de 31 insetos tem a classe "alerta"', codigo: `const a = tela.acharTodos('li.alerta'); afirmar(a.length === 1 && a[0].innerText.includes('A-02'), 'esperava a classe "alerta" só na A-02');` },
            { nome: 'a lista vazia mostra a mensagem', codigo: `afirmar(tela.texto().includes('Nenhuma captura registrada.'), 'faltou a mensagem da lista vazia');` },
            { nome: 'a lista vazia não desenha <ul> (há uma só)', codigo: `afirmar(tela.acharTodos('ul').length === 1, 'esperava uma <ul> só, achei ' + tela.acharTodos('ul').length);` },
          ],
        },
        {
          t: 'quiz',
          pergunta: 'Para que serve a prop `key` numa lista?',
          opcoes: [
            'Para ordenar os itens.',
            'Para o React identificar cada item entre renderizações e preservar o estado e o DOM do item certo.',
            'Para aplicar estilo.',
            'Para acessar o item pelo componente filho.',
          ],
          correta: 1,
          explicacao: 'A `key` é a identidade do item. Com ela, inserir, remover e reordenar movem os elementos certos. Ela não chega ao filho como prop.',
        },
        {
          t: 'quiz',
          pergunta: 'Como um componente filho comunica algo ao pai?',
          opcoes: [
            'Alterando as props que recebeu.',
            'Chamando uma função que o pai passou como prop.',
            'Acessando as variáveis do pai diretamente.',
            'Disparando um evento global.',
          ],
          correta: 1,
          explicacao: 'Dados descem, eventos sobem. O pai é dono do estado e entrega ao filho a função que o altera.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'estado',
      titulo: 'Estado e eventos',
      minutos: 14,
      resumo: 'useState por dentro: a fotografia de cada renderização, a atualização em lote e a imutabilidade.',
      blocos: [
        {
          t: 'texto',
          md: `Uma variável comum dentro de um componente não serve para guardar o que muda: a função é chamada de novo a cada renderização, e a variável renasce com o valor inicial. E mudá-la não avisa o React de que a tela ficou desatualizada.

\`useState\` resolve as duas coisas:

\`\`\`tsx
const [valor, setValor] = useState(inicial);
//      ↑        ↑
//      │        função que pede a troca E agenda nova renderização
//      o valor NESTA renderização
\`\`\`

O valor fica guardado pelo React, fora da função. A cada renderização, \`useState\` devolve o valor atual.

### Eventos

Os eventos são atributos em camelCase que recebem **uma função**:

\`\`\`tsx
<button onClick={registrar}>          // certo: passa a função
<button onClick={() => registrar(3)}> // certo: passa uma função que chama com argumento
<button onClick={registrar()}>        // ERRADO: chama na hora da renderização
\`\`\``,
        },
        {
          t: 'texto',
          md: `### Cada renderização é uma fotografia

Este é o conceito que mais confunde, e o que mais explica bugs. Dentro de uma renderização, o estado é uma **constante**. \`setValor\` não muda a variável: pede uma **próxima** renderização em que o valor será outro.

Antes de clicar nos botões abaixo, responda: quanto cada um soma?`,
        },
        {
          t: 'previa',
          titulo: 'Três chamadas, quanto soma?',
          altura: 190,
          codigo: `import { useState } from 'react';

export default function App() {
  const [n, setN] = useState(0);

  function somarTresErrado() {
    setN(n + 1);   // n vale 0 nesta fotografia: pede 1
    setN(n + 1);   // n continua 0:              pede 1
    setN(n + 1);   // idem:                      pede 1
    console.log('dentro do clique, n ainda vale', n);
  }

  function somarTresCerto() {
    setN((atual) => atual + 1);   // "pegue o valor mais recente e some 1"
    setN((atual) => atual + 1);
    setN((atual) => atual + 1);
  }

  return (
    <div>
      <h2>{n}</h2>
      <button onClick={somarTresErrado}>+3 com setN(n + 1)</button>{' '}
      <button onClick={somarTresCerto}>+3 com setN(atual =&gt; atual + 1)</button>{' '}
      <button onClick={() => setN(0)}>zerar</button>
    </div>
  );
}`,
        },
        {
          t: 'texto',
          md: `O primeiro botão soma **1**. As três chamadas leram o mesmo \`n\` da mesma fotografia. E o \`console.log\` mostra que, logo depois de \`setN\`, o \`n\` continua o antigo.

Duas regras saem daí:

- **Se o novo valor depende do anterior, passe uma função**: \`setN(atual => atual + 1)\`. O React enfileira as funções e as aplica em ordem.
- **O React agrupa as atualizações.** Várias chamadas de \`set\` no mesmo evento resultam em **uma** renderização. Chama-se *batching*.`,
        },
        {
          t: 'texto',
          md: `### Objetos e arrays: troque, não altere

O React decide se precisa renderizar comparando o estado novo com o antigo por **identidade** (\`Object.is\`). Se você alterar um array com \`push\` e passar o mesmo array para \`set\`, ele vê o mesmo objeto e não faz nada.

| Quero | Não (altera o original) | Sim (cria um novo) |
|---|---|---|
| acrescentar | \`lista.push(x)\` | \`[...lista, x]\` |
| remover | \`lista.splice(i, 1)\` | \`lista.filter(item => item.id !== id)\` |
| alterar um item | \`lista[i].lido = true\` | \`lista.map(item => item.id === id ? { ...item, lido: true } : item)\` |
| ordenar | \`lista.sort()\` | \`[...lista].sort()\` ou \`lista.toSorted()\` |
| alterar um campo | \`obj.nome = 'x'\` | \`{ ...obj, nome: 'x' }\` |

Para quem vem do Python: é como tratar o estado como tupla e \`frozenset\`. Nunca se altera, sempre se substitui.`,
        },
        {
          t: 'previa',
          titulo: 'Alterar no lugar contra criar um novo',
          altura: 220,
          codigo: `import { useState } from 'react';

export default function App() {
  const [capturas, setCapturas] = useState([12, 7]);

  function errado() {
    capturas.push(Math.round(Math.random() * 30));   // altera o MESMO array
    setCapturas(capturas);                            // mesmo objeto: o React ignora
    console.log('o array mudou:', capturas, 'e a tela não');
  }

  function certo() {
    setCapturas([...capturas, Math.round(Math.random() * 30)]);
  }

  return (
    <div>
      <p>Capturas: <strong>{capturas.join(', ')}</strong> (total {capturas.length})</p>
      <button onClick={errado}>push + set (errado)</button>{' '}
      <button onClick={certo}>[...capturas, novo] (certo)</button>
    </div>
  );
}`,
        },
        {
          t: 'texto',
          md: `Clique algumas vezes no botão errado e depois no certo: os itens "perdidos" aparecem todos de uma vez, porque estavam no array o tempo todo. O dado mudou e a tela não soube. É o pior tipo de bug, porque parece intermitente.`,
        },
        {
          t: 'previa',
          titulo: 'Contador de armadilha',
          enunciado: `Faça o contador de uma armadilha.

- Um \`<h2>\` mostra **"N insetos"**.
- O botão **"+1"** soma um; o botão **"+5"** soma cinco.
- O botão **"Zerar"** volta a zero, e fica **desabilitado** quando a contagem já é zero.
- A partir de 20, aparece um \`<p>\` com o texto **"Nível de controle atingido"**.`,
          altura: 170,
          codigo: `import { useState } from 'react';

export default function App() {
  // seu estado aqui

  return (
    <div>
      <h2>0 insetos</h2>
      <button>+1</button> <button>+5</button> <button>Zerar</button>
    </div>
  );
}`,
          solucao: `import { useState } from 'react';

export default function App() {
  const [n, setN] = useState(0);

  return (
    <div>
      <h2>{n} insetos</h2>
      {n >= 20 && <p>Nível de controle atingido</p>}
      <button onClick={() => setN((a) => a + 1)}>+1</button>{' '}
      <button onClick={() => setN((a) => a + 5)}>+5</button>{' '}
      <button onClick={() => setN(0)} disabled={n === 0}>Zerar</button>
    </div>
  );
}`,
          dica: 'Um estado só, numérico. O aviso é `{n >= 20 && <p>...</p>}`. O botão recebe `disabled={n === 0}`.',
          testes: [
            { nome: 'começa em "0 insetos"', codigo: `afirmar(tela.achar('h2').innerText.trim() === '0 insetos', 'o <h2> deveria mostrar "0 insetos"');` },
            { nome: 'Zerar começa desabilitado', codigo: `afirmar(tela.botao('Zerar').disabled, 'o botão Zerar deveria estar desabilitado em zero');` },
            { nome: '+1 soma um', codigo: `await tela.clicar('+1'); afirmar(tela.achar('h2').innerText.trim() === '1 insetos', 'depois de +1 esperava "1 insetos", veio "' + tela.achar('h2').innerText + '"');` },
            { nome: '+5 soma cinco (1 + 5 = 6)', codigo: `await tela.clicar('+5'); afirmar(tela.achar('h2').innerText.trim() === '6 insetos', 'depois de +1 e +5 esperava "6 insetos", veio "' + tela.achar('h2').innerText + '"');` },
            { nome: 'o aviso aparece só a partir de 20', codigo: `await tela.clicar('+5'); await tela.clicar('+5'); for (let i = 0; i < 3; i++) await tela.clicar('+1'); afirmar(!tela.texto().includes('Nível de controle atingido'), 'com 19 o aviso não deveria aparecer'); await tela.clicar('+1'); afirmar(tela.texto().includes('Nível de controle atingido'), 'com 20 o aviso deveria aparecer');` },
            { nome: 'Zerar volta a zero e se desabilita', codigo: `await tela.clicar('Zerar'); afirmar(tela.achar('h2').innerText.trim() === '0 insetos', 'Zerar deveria voltar a "0 insetos"'); afirmar(tela.botao('Zerar').disabled, 'Zerar deveria se desabilitar');` },
          ],
        },
        {
          t: 'quiz',
          pergunta: 'Logo depois de `setN(n + 1)`, na mesma função, quanto vale `n`?',
          opcoes: [
            'O valor novo.',
            'O valor antigo: `n` é uma constante daquela renderização, e o novo valor só existe na próxima.',
            '`undefined`.',
            'Depende do navegador.',
          ],
          correta: 1,
          explicacao: 'Cada renderização tem a sua fotografia do estado. `set` agenda a próxima; não altera a atual.',
        },
        {
          t: 'quiz',
          pergunta: 'Por que `lista.push(x); setLista(lista)` não atualiza a tela?',
          opcoes: [
            'Porque `push` é assíncrono.',
            'Porque o React compara o estado por identidade: o array é o mesmo objeto de antes, então ele conclui que nada mudou.',
            'Porque arrays não podem ser estado.',
            'Porque faltou `await`.',
          ],
          correta: 1,
          explicacao: 'O estado deve ser tratado como imutável. Um array novo (`[...lista, x]`) tem outra identidade, e o React renderiza.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'renderizacao',
      titulo: 'O ciclo de renderização',
      minutos: 13,
      resumo: 'Quando um componente renderiza, o que isso custa, e onde o estado deve morar.',
      blocos: [
        {
          t: 'texto',
          md: `"Renderizar", no React, **não é desenhar na tela**. É chamar a função do componente para obter a descrição nova. O caminho completo tem três passos:

1. **Gatilho**: um \`set\` de estado foi chamado (ou é a primeira vez).
2. **Renderização**: o React chama o componente dono daquele estado **e todos os descendentes dele**, e obtém a árvore nova.
3. **Commit**: compara a árvore nova com a anterior e aplica ao DOM **só as diferenças**.

O passo 2 é barato: são chamadas de função e criação de objetos. O passo 3 é o que custa, e o React o minimiza sozinho. Por isso "renderizou de novo" raramente é um problema.

A prévia abaixo usa uma moldura do laboratório que **pisca** a cada renderização e conta quantas foram. Clique nos botões e observe quem pisca.`,
        },
        {
          t: 'previa',
          titulo: 'Quem renderiza quando o estado muda',
          altura: 330,
          alturaMax: 620,
          codigo: `import { useState } from 'react';
import { Renderizou } from 'lab';

function Contador({ nome }) {
  const [n, setN] = useState(0);
  return (
    <Renderizou nome={'Contador ' + nome}>
      <button onClick={() => setN(n + 1)}>{nome}: {n}</button>
    </Renderizou>
  );
}

function Rodape() {
  return (
    <Renderizou nome="Rodape">
      <small>Não recebo props nem tenho estado.</small>
    </Renderizou>
  );
}

export default function App() {
  const [usina, setUsina] = useState('Boa Vista');
  return (
    <Renderizou nome="App">
      <button onClick={() => setUsina(usina === 'Boa Vista' ? 'Santa Helena' : 'Boa Vista')}>
        Usina: {usina} (estado do App)
      </button>
      <Contador nome="A-01" />
      <Contador nome="A-02" />
      <Rodape />
    </Renderizou>
  );
}`,
        },
        {
          t: 'texto',
          md: `O que dá para ver:

- **Clicar num contador pisca só aquele contador.** O estado é dele, e ele não tem filhos com moldura.
- **Clicar no botão do App pisca tudo**, inclusive o \`Rodape\`, que não recebe nenhuma prop. A regra é simples: quando um componente renderiza, **os filhos renderizam junto**, mudem as props ou não.
- **Os contadores não zeram** quando o App renderiza. Renderizar de novo não recria o estado: o React o guarda por **posição na árvore**.

### Onde o estado mora

Dois componentes irmãos precisam do mesmo dado. Um não enxerga o estado do outro. A solução tem nome: **elevar o estado** para o ancestral comum mais próximo, que passa o valor e a função de alterar para os dois.`,
        },
        {
          t: 'previa',
          titulo: 'Estado elevado: dois componentes, uma fonte',
          altura: 280,
          alturaMax: 560,
          codigo: `import { useState } from 'react';
import { Renderizou } from 'lab';

function Filtro({ minimo, aoMudar }) {
  return (
    <Renderizou nome="Filtro">
      <label>
        Mínimo de insetos: <strong>{minimo}</strong>{' '}
        <input type="range" min="0" max="30" value={minimo} onChange={(e) => aoMudar(Number(e.target.value))} />
      </label>
    </Renderizou>
  );
}

function Lista({ capturas, minimo }) {
  const visiveis = capturas.filter((c) => c.insetos >= minimo);
  return (
    <Renderizou nome="Lista">
      <p>{visiveis.length} de {capturas.length} armadilhas</p>
      <ul>
        {visiveis.map((c) => <li key={c.id}>{c.armadilha}: {c.insetos}</li>)}
      </ul>
    </Renderizou>
  );
}

const CAPTURAS = [
  { id: 1, armadilha: 'A-01', insetos: 12 },
  { id: 2, armadilha: 'A-02', insetos: 31 },
  { id: 3, armadilha: 'A-03', insetos: 4 },
  { id: 4, armadilha: 'A-04', insetos: 19 },
];

export default function App() {
  // o estado mora no ancestral comum dos dois
  const [minimo, setMinimo] = useState(0);
  return (
    <div>
      <Filtro minimo={minimo} aoMudar={setMinimo} />
      <Lista capturas={CAPTURAS} minimo={minimo} />
    </div>
  );
}`,
        },
        {
          t: 'texto',
          md: `Repare no que **não** é estado ali: \`visiveis\`. Ela é **calculada** a partir de \`capturas\` e \`minimo\` a cada renderização. Guardar \`visiveis\` num segundo \`useState\` criaria duas fontes para a mesma informação, e a obrigação de mantê-las em sincronia.

> **Estado é o mínimo que não dá para calcular.** Todo o resto é derivado durante a renderização.

### Quando renderização vira problema

Raramente. Quando acontece (uma lista de milhares de itens, um gráfico pesado), as saídas são, nesta ordem:

1. **Descer o estado.** Estado que só um pedaço usa deve morar naquele pedaço, e não na raiz.
2. **Passar JSX como \`children\`.** Filhos criados pelo componente de cima não renderizam quando o de baixo muda de estado.
3. **\`memo\`**: pula a renderização de um componente cujas props não mudaram.
4. **Virtualizar** listas longas: desenhar só o que está visível.

Desde o fim de 2025 existe o **React Compiler**, que aplica a memoização automaticamente na etapa de build. Em projeto novo com ele ligado, \`memo\`, \`useMemo\` e \`useCallback\` escritos à mão viram exceção. A lição de refs e memoização volta a isso.`,
        },
        {
          t: 'nota',
          estilo: 'entrevista',
          md: `**"O que é o Virtual DOM?"** A árvore de objetos que os componentes devolvem. O React guarda a anterior, compara com a nova (a *reconciliação*) e aplica ao DOM real só as diferenças. Dois elementos na mesma posição e do mesmo tipo são considerados "o mesmo", e é a \`key\` que desfaz a ambiguidade em listas. A resposta que impressiona acrescenta: o ganho não é o DOM virtual ser rápido, é ele permitir escrever a tela como função do estado sem pagar o preço de recriar o DOM inteiro.`,
        },
        {
          t: 'quiz',
          pergunta: 'O componente pai renderizou. O que acontece com um filho cujas props não mudaram?',
          opcoes: [
            'Não renderiza.',
            'Renderiza também, por padrão. O React só pula se o filho estiver embrulhado em `memo` (ou se o compilador tiver memoizado).',
            'É destruído e recriado.',
            'Perde o estado.',
          ],
          correta: 1,
          explicacao: 'Renderizar o pai renderiza a subárvore. Isso costuma ser barato, porque o DOM só é tocado onde algo mudou de fato.',
        },
        {
          t: 'quiz',
          pergunta: 'Uma lista filtrada depende de `itens` (estado) e `busca` (estado). Onde guardar a lista filtrada?',
          opcoes: [
            'Num terceiro `useState`, atualizado sempre que os outros mudarem.',
            'Em lugar nenhum: calcular durante a renderização, a partir dos dois estados.',
            'Numa variável global.',
            'No `localStorage`.',
          ],
          correta: 1,
          explicacao: 'É dado derivado. Guardá-lo em estado duplica a fonte de verdade e abre espaço para dessincronia. Se o cálculo for caro, memoiza-se; continua não sendo estado.',
        },
      ],
    },
  ],
};
