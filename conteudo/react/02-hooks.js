export const modulo = {
  id: 'hooks',
  titulo: 'Hooks',
  cor: '#6aa9f0',
  licoes: [
    // ------------------------------------------------------------------
    {
      id: 'formularios',
      titulo: 'Formulários e campos controlados',
      minutos: 12,
      resumo: 'O estado como fonte única do que está no campo, e o que deve ser calculado em vez de guardado.',
      blocos: [
        {
          t: 'texto',
          md: `Um \`<input>\` do HTML guarda o próprio valor. No React, o padrão é inverter isso: o **estado** é a fonte, e o campo só o exibe. Chama-se **campo controlado**.

\`\`\`tsx
<input value={texto} onChange={(e) => setTexto(e.target.value)} />
//     ↑ o campo mostra o estado     ↑ digitar pede a troca do estado
\`\`\`

O ciclo a cada tecla: o evento chama \`setTexto\`, o componente renderiza, o campo recebe o novo \`value\`. Parece volta demais, e é o que permite validar, formatar, limpar ou preencher o campo de qualquer lugar: basta mudar o estado.

| Elemento | Prop do valor | Leitura no evento |
|---|---|---|
| \`<input type="text">\`, \`<textarea>\` | \`value\` | \`e.target.value\` (sempre texto) |
| \`<input type="number">\`, \`type="range"\` | \`value\` | \`Number(e.target.value)\` |
| \`<input type="checkbox">\` | \`checked\` | \`e.target.checked\` |
| \`<select>\` | \`value\` no \`<select>\` | \`e.target.value\` |`,
        },
        {
          t: 'previa',
          titulo: 'Um formulário controlado, com validação derivada',
          altura: 300,
          alturaMax: 620,
          codigo: `import { useState } from 'react';

export default function App() {
  // um objeto para o formulário inteiro
  const [form, setForm] = useState({ armadilha: '', insetos: '', chuva: false });
  const [enviados, setEnviados] = useState([]);

  // uma função serve a todos os campos: o "name" do campo diz qual chave trocar
  function mudar(e) {
    const { name, type, value, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  }

  // NADA disto é estado: é calculado do formulário, a cada renderização
  const insetos = Number(form.insetos);
  const erros = [];
  if (!/^[A-Z]-\\d{2}$/.test(form.armadilha)) erros.push('Código no formato A-01.');
  if (form.insetos === '' || !Number.isInteger(insetos) || insetos < 0) erros.push('Insetos: inteiro, zero ou mais.');
  const valido = erros.length === 0;

  function enviar(e) {
    e.preventDefault();               // sem isto, o navegador recarrega a página
    setEnviados([...enviados, { ...form, insetos }]);
    setForm({ armadilha: '', insetos: '', chuva: false });   // limpar = trocar o estado
  }

  return (
    <form onSubmit={enviar}>
      <p className="linha">
        <input name="armadilha" placeholder="A-01" value={form.armadilha} onChange={mudar} size={6} />
        <input name="insetos" type="number" placeholder="insetos" value={form.insetos} onChange={mudar} style={{ width: 90 }} />
        <label><input name="chuva" type="checkbox" checked={form.chuva} onChange={mudar} /> choveu</label>
        <button disabled={!valido}>Registrar</button>
      </p>
      {form.armadilha !== '' && erros.map((erro) => <p key={erro} className="alerta">{erro}</p>)}
      <ul>
        {enviados.map((c, i) => <li key={i}>{c.armadilha}: {c.insetos} insetos{c.chuva ? ' (chuva)' : ''}</li>)}
      </ul>
    </form>
  );
}`,
        },
        {
          t: 'texto',
          md: `O que vale notar:

- **\`onSubmit\` no \`<form>\`**, e não \`onClick\` no botão. Assim o Enter no campo também envia.
- **\`e.preventDefault()\`** impede o envio tradicional, que recarregaria a página.
- **\`[name]: valor\`** é a chave computada do JavaScript. Uma função atende todos os campos.
- **\`erros\` e \`valido\` não são estado.** São calculados do formulário. Se fossem estado, haveria um instante em que o campo diz uma coisa e a validação outra.
- A lista usa o índice como \`key\` porque só cresce no fim. É o caso em que o índice é aceitável.`,
        },
        {
          t: 'nota',
          estilo: 'dica',
          md: `**Em formulário grande, use uma biblioteca.** Formulário com dezenas de campos, validação assíncrona e campos dependentes dá trabalho com \`useState\` puro. O par mais usado é **React Hook Form** (estado e desempenho) com **Zod** (esquema de validação, o mesmo papel do Pydantic). O React 19 também trouxe as *Actions* de formulário, que aparecem no módulo seguinte. Vale aprender o controlado à mão primeiro: as bibliotecas fazem mais sentido depois.`,
        },
        {
          t: 'previa',
          titulo: 'Filtro de detecções',
          enunciado: `A tabela mostra todas as detecções. Acrescente dois filtros **controlados**:

- um \`<input>\` de texto (com \`placeholder="classe"\`) que filtra pela classe, sem diferenciar maiúsculas;
- um \`<input type="range">\` de 0 a 100 para a confiança mínima, em porcentagem.

Acima da tabela, um \`<p>\` mostra **"N de 5 detecções"**. A lista filtrada deve ser **calculada**, e não guardada em estado.`,
          altura: 280,
          alturaMax: 560,
          codigo: `import { useState } from 'react';

const DETECCOES = [
  { id: 1, classe: 'mariposa', confianca: 0.94 },
  { id: 2, classe: 'cigarrinha', confianca: 0.88 },
  { id: 3, classe: 'mosca', confianca: 0.41 },
  { id: 4, classe: 'mariposa', confianca: 0.63 },
  { id: 5, classe: 'cigarrinha', confianca: 0.27 },
];

export default function App() {
  // estados dos dois filtros

  const visiveis = DETECCOES;   // calcule aqui

  return (
    <div>
      <p className="linha">
        {/* os dois campos */}
      </p>
      <p>{visiveis.length} de {DETECCOES.length} detecções</p>
      <table>
        <thead><tr><th>classe</th><th>confiança</th></tr></thead>
        <tbody>
          {visiveis.map((d) => (
            <tr key={d.id}><td>{d.classe}</td><td>{Math.round(d.confianca * 100)}%</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}`,
          solucao: `import { useState } from 'react';

const DETECCOES = [
  { id: 1, classe: 'mariposa', confianca: 0.94 },
  { id: 2, classe: 'cigarrinha', confianca: 0.88 },
  { id: 3, classe: 'mosca', confianca: 0.41 },
  { id: 4, classe: 'mariposa', confianca: 0.63 },
  { id: 5, classe: 'cigarrinha', confianca: 0.27 },
];

export default function App() {
  const [classe, setClasse] = useState('');
  const [minimo, setMinimo] = useState(0);

  const visiveis = DETECCOES.filter(
    (d) => d.classe.includes(classe.trim().toLowerCase()) && d.confianca * 100 >= minimo,
  );

  return (
    <div>
      <p className="linha">
        <input placeholder="classe" value={classe} onChange={(e) => setClasse(e.target.value)} />
        <label>
          mínimo {minimo}%{' '}
          <input type="range" min="0" max="100" value={minimo} onChange={(e) => setMinimo(Number(e.target.value))} />
        </label>
      </p>
      <p>{visiveis.length} de {DETECCOES.length} detecções</p>
      <table>
        <thead><tr><th>classe</th><th>confiança</th></tr></thead>
        <tbody>
          {visiveis.map((d) => (
            <tr key={d.id}><td>{d.classe}</td><td>{Math.round(d.confianca * 100)}%</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}`,
          dica: 'Dois `useState`: um texto e um número. `visiveis` é um `.filter()` com as duas condições. O valor do `range` chega como texto: converta com `Number()`.',
          testes: [
            { nome: 'há um campo de texto e um range', codigo: `tela.achar('input[placeholder="classe"]'); tela.achar('input[type="range"]');` },
            { nome: 'começa mostrando "5 de 5 detecções"', codigo: `afirmar(tela.texto().includes('5 de 5 detecções'), 'esperava "5 de 5 detecções"');` },
            { nome: 'digitar "mari" deixa 2 linhas', codigo: `await tela.digitar('input[placeholder="classe"]', 'mari'); afirmar(tela.acharTodos('tbody tr').length === 2, 'esperava 2 linhas, achei ' + tela.acharTodos('tbody tr').length); afirmar(tela.texto().includes('2 de 5 detecções'), 'o contador deveria dizer "2 de 5 detecções"');` },
            { nome: 'o filtro ignora maiúsculas', codigo: `await tela.digitar('input[placeholder="classe"]', 'MOSCA'); afirmar(tela.acharTodos('tbody tr').length === 1, 'com "MOSCA" esperava 1 linha, achei ' + tela.acharTodos('tbody tr').length);` },
            { nome: 'confiança mínima de 60% deixa 3 linhas', codigo: `await tela.digitar('input[placeholder="classe"]', ''); await tela.digitar('input[type="range"]', '60'); afirmar(tela.acharTodos('tbody tr').length === 3, 'esperava 3 linhas, achei ' + tela.acharTodos('tbody tr').length);` },
            { nome: 'os dois filtros se combinam', codigo: `await tela.digitar('input[placeholder="classe"]', 'cigarrinha'); afirmar(tela.acharTodos('tbody tr').length === 1, 'cigarrinha com 60% ou mais: esperava 1 linha, achei ' + tela.acharTodos('tbody tr').length);` },
          ],
        },
        {
          t: 'quiz',
          pergunta: 'O que caracteriza um campo controlado?',
          opcoes: [
            'O campo é somente leitura.',
            'O valor exibido vem do estado do React (`value={x}`), e toda digitação passa por `onChange`, que atualiza esse estado.',
            'O campo é validado pelo navegador.',
            'O campo usa `ref`.',
          ],
          correta: 1,
          explicacao: 'O estado é a fonte única. Isso torna trivial validar, formatar e limpar o campo, porque basta ler ou trocar o estado.',
        },
        {
          t: 'quiz',
          pergunta: 'Por que a lista de erros de validação não deveria ficar num `useState`?',
          opcoes: [
            'Porque `useState` não aceita arrays.',
            'Porque ela é derivada dos valores do formulário: calculá-la na renderização garante que nunca fique fora de sincronia com os campos.',
            'Porque validação só pode ser feita no servidor.',
            'Porque deixaria o formulário lento.',
          ],
          correta: 1,
          explicacao: 'Dado derivado guardado em estado exige lembrar de atualizá-lo em todo lugar que muda a origem. Calculado, ele está sempre certo.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'efeitos',
      titulo: 'Efeitos: sincronizar com o mundo de fora',
      minutos: 15,
      resumo: 'useEffect, dependências e limpeza. Buscar dados sem condição de corrida. E quando não usar efeito.',
      blocos: [
        {
          t: 'texto',
          md: `A renderização tem de ser pura: calcula o JSX e mais nada. Mas uma tela real precisa mexer em coisas que estão **fora do React**: a rede, um temporizador, o título da aba, um mapa, um WebSocket. O nome disso é **efeito colateral**, e o lugar dele é o \`useEffect\`.

\`\`\`tsx
useEffect(() => {
  // 1. conecta ao sistema externo, depois de a tela ser desenhada
  const id = setInterval(tique, 1000);

  // 2. devolve a LIMPEZA: como desfazer o que foi feito
  return () => clearInterval(id);
}, [dependencias]);   // 3. roda de novo quando alguma destas mudar
\`\`\`

A forma certa de pensar não é "rode isto quando o componente montar". É **"mantenha este sistema externo sincronizado com estes valores"**.

| Dependências | O efeito roda |
|---|---|
| \`[a, b]\` | depois da primeira renderização, e depois de cada uma em que \`a\` ou \`b\` mudou |
| \`[]\` | uma vez, depois da primeira renderização |
| omitidas | depois de **toda** renderização (quase nunca é o que se quer) |

Antes de rodar de novo, e quando o componente sai da tela, o React chama a limpeza da execução anterior.`,
        },
        {
          t: 'previa',
          titulo: 'Efeito com limpeza: ligar e desligar um temporizador',
          altura: 190,
          codigo: `import { useState, useEffect } from 'react';

function Relogio({ intervalo }) {
  const [tiques, setTiques] = useState(0);

  useEffect(() => {
    console.log('liga o temporizador de', intervalo, 'ms');
    const id = setInterval(() => setTiques((t) => t + 1), intervalo);

    return () => {
      console.log('desliga o temporizador de', intervalo, 'ms');
      clearInterval(id);
    };
  }, [intervalo]);          // mudou o intervalo: desliga o velho, liga o novo

  return <h2>{tiques} tiques</h2>;
}

export default function App() {
  const [ligado, setLigado] = useState(true);
  const [intervalo, setIntervalo] = useState(1000);

  return (
    <div>
      <p className="linha">
        <button onClick={() => setLigado(!ligado)}>{ligado ? 'Tirar da tela' : 'Pôr na tela'}</button>
        <button onClick={() => setIntervalo(intervalo === 1000 ? 250 : 1000)}>intervalo: {intervalo} ms</button>
      </p>
      {ligado && <Relogio intervalo={intervalo} />}
    </div>
  );
}`,
        },
        {
          t: 'texto',
          md: `Acompanhe o console da prévia enquanto clica. Trocar o intervalo imprime **"desliga"** e depois **"liga"**. Tirar o relógio da tela imprime "desliga". Sem a limpeza, cada troca deixaria um temporizador antigo rodando para sempre: é o vazamento clássico.

Repare também em \`setTiques((t) => t + 1)\`. Com \`setTiques(tiques + 1)\`, a função do temporizador enxergaria para sempre o \`tiques\` da fotografia em que o efeito foi criado, e a contagem pararia em 1.`,
        },
        {
          t: 'nota',
          estilo: 'pegadinha',
          md: `**Em desenvolvimento, o efeito roda duas vezes.** Com o \`<StrictMode>\`, que todo projeto criado pelo Vite usa, o React monta, desmonta e monta de novo cada componente na primeira vez: liga, desliga, liga. É de propósito, para revelar efeito sem limpeza. Em produção roda uma vez. Se o seu efeito quebra ao rodar duas vezes, falta a limpeza. As prévias deste laboratório não usam o modo estrito, para a contagem de renderizações ficar legível.`,
        },
        {
          t: 'texto',
          md: `### Buscar dados num efeito

É o uso mais comum, e tem uma armadilha: a **condição de corrida**. O usuário escolhe a classe A, a requisição sai; ele troca para B, outra requisição sai. Se a resposta de A chegar **depois** da de B, a tela mostra B selecionado com os dados de A.

A prévia abaixo simula uma rede em que a primeira classe é a mais lenta. Com a caixa "ignorar respostas antigas" **desmarcada**, clique em **pessoa**, logo em seguida em **capacete**, e espere uns três segundos.`,
        },
        {
          t: 'previa',
          titulo: 'Condição de corrida ao buscar dados',
          altura: 240,
          alturaMax: 520,
          codigo: `import { useState, useEffect } from 'react';
import { esperar } from 'lab';

const ATRASO = { pessoa: 2500, capacete: 300, colete: 300 };

export default function App() {
  const [classe, setClasse] = useState('capacete');
  const [protegido, setProtegido] = useState(false);
  const [estado, setEstado] = useState({ situacao: 'carregando', itens: [] });

  useEffect(() => {
    let ignorar = false;                     // vira true quando este efeito é limpo
    setEstado({ situacao: 'carregando', itens: [] });

    async function buscar() {
      await esperar(ATRASO[classe]);         // rede lenta de mentira
      const resposta = await fetch('/api/lab/deteccoes?classe=' + classe);
      const dados = await resposta.json();
      if (protegido && ignorar) {
        console.log('resposta de', classe, 'chegou tarde e foi ignorada');
        return;
      }
      setEstado({ situacao: 'pronto', itens: dados.itens });
    }
    buscar();

    return () => { ignorar = true; };        // a limpeza marca a resposta como velha
  }, [classe, protegido]);

  return (
    <div>
      <p className="linha">
        {Object.keys(ATRASO).map((c) => (
          <button key={c} onClick={() => setClasse(c)} style={{ borderColor: c === classe ? 'var(--destaque)' : undefined }}>
            {c}
          </button>
        ))}
        <label><input type="checkbox" checked={protegido} onChange={(e) => setProtegido(e.target.checked)} /> ignorar respostas antigas</label>
      </p>
      <p>Selecionado: <strong>{classe}</strong></p>
      {estado.situacao === 'carregando' ? <p className="suave">carregando…</p> : (
        <ul>{estado.itens.map((d) => <li key={d.id}>{d.classe} · {Math.round(d.confianca * 100)}%</li>)}</ul>
      )}
    </div>
  );
}`,
        },
        {
          t: 'texto',
          md: `Sem a proteção, a tela termina com **capacete** selecionado e a lista de **pessoa**. Com ela, a limpeza do efeito antigo marca \`ignorar = true\`, e a resposta atrasada é descartada.

Esse padrão (efeito, função assíncrona interna, bandeira de cancelamento, estados de carregando e erro) é correto e é muito código. Em aplicação real, quase ninguém o escreve à mão: usa-se uma biblioteca de dados como o **TanStack Query**, que resolve corrida, cache, repetição e revalidação. Fica para o módulo seguinte. Aprender à mão serve para entender o que a biblioteca faz.`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Tentação', 'Por que não é efeito', 'O certo'],
          linhas: [
            ['Calcular um valor a partir de props ou estado e guardar com `set` dentro de um efeito', 'causa uma renderização extra com o valor velho na tela', 'calcular direto na renderização'],
            ['Reagir a um clique dentro de um efeito que observa um estado', 'a causa é um evento, e não a sincronização', 'pôr a lógica no manipulador do evento'],
            ['Zerar o estado de um componente quando uma prop muda', 'efeito + `set` renderiza duas vezes', 'dar ao componente uma `key` que muda: o React o recria'],
            ['Avisar o pai de que o estado mudou', 'cascata de renderizações', 'chamar o callback do pai no mesmo evento que mudou o estado'],
            ['Buscar dados', 'é efeito de verdade, mas há ferramenta melhor', 'biblioteca de dados ou o carregador do roteador'],
          ],
        },
        {
          t: 'texto',
          md: `A documentação do React tem uma página inteira chamada *You Might Not Need an Effect*. A regra resumida:

> Efeito é para **sincronizar com algo fora do React**. Se não há sistema externo envolvido, provavelmente não é efeito.`,
        },
        {
          t: 'previa',
          titulo: 'Carregar detecções da API',
          enunciado: `Complete o componente para buscar \`/api/lab/deteccoes?classe=pessoa\` ao montar.

- Enquanto a resposta não chega, mostre um \`<p>\` com **"Carregando…"**.
- Depois, uma \`<ul>\` com um \`<li>\` por item de \`dados.itens\`, no formato **"pessoa · 94%"**.
- Use a bandeira \`ignorar\` na limpeza.

A resposta tem o formato \`{ total, itens: [{ id, classe, confianca }] }\`.`,
          altura: 150,
          codigo: `import { useState, useEffect } from 'react';

export default function App() {
  const [itens, setItens] = useState(null);   // null = ainda não carregou

  // seu efeito aqui

  return <p>Carregando…</p>;
}`,
          solucao: `import { useState, useEffect } from 'react';

export default function App() {
  const [itens, setItens] = useState(null);   // null = ainda não carregou

  useEffect(() => {
    let ignorar = false;
    fetch('/api/lab/deteccoes?classe=pessoa')
      .then((resposta) => resposta.json())
      .then((dados) => {
        if (!ignorar) setItens(dados.itens);
      });
    return () => { ignorar = true; };
  }, []);

  if (itens === null) return <p>Carregando…</p>;

  return (
    <ul>
      {itens.map((d) => (
        <li key={d.id}>{d.classe} · {Math.round(d.confianca * 100)}%</li>
      ))}
    </ul>
  );
}`,
          dica: 'O efeito tem dependências `[]`. Dentro dele, `fetch(...).then(r => r.json()).then(dados => setItens(dados.itens))`. A tela decide o que mostrar com `if (itens === null)`.',
          testes: [
            { nome: 'a lista aparece depois da resposta', codigo: `await tela.esperar(() => tela.acharTodos('li').length > 0, 4000);` },
            { nome: 'mostra as 2 detecções de pessoa', codigo: `afirmar(tela.acharTodos('li').length === 2, 'esperava 2 <li>, achei ' + tela.acharTodos('li').length);` },
            { nome: 'o formato é "pessoa · 94%"', codigo: `afirmar(tela.acharTodos('li').some((li) => li.innerText.trim() === 'pessoa · 94%'), 'nenhum <li> tem o texto "pessoa · 94%"');` },
            { nome: 'o "Carregando…" some', codigo: `afirmar(!tela.texto().includes('Carregando'), 'o texto de carregamento continua na tela');` },
          ],
        },
        {
          t: 'quiz',
          pergunta: 'Para que serve a função devolvida pelo `useEffect`?',
          opcoes: [
            'Para devolver um valor ao componente.',
            'É a limpeza: desfaz o que o efeito fez (cancela temporizador, fecha conexão, ignora resposta), antes de o efeito rodar de novo e quando o componente sai da tela.',
            'Para rodar o efeito de forma assíncrona.',
            'Para declarar as dependências.',
          ],
          correta: 1,
          explicacao: 'Todo efeito que "liga" algo precisa saber "desligar". Sem limpeza, cada nova execução acumula temporizadores, ouvintes e conexões.',
        },
        {
          t: 'quiz',
          pergunta: 'O usuário troca o filtro duas vezes seguidas e a tela mostra os dados do filtro antigo. Qual é a causa?',
          opcoes: [
            'O servidor está com defeito.',
            'Condição de corrida: a resposta da primeira requisição chegou depois da segunda e sobrescreveu o estado. A limpeza do efeito deveria marcá-la para ser ignorada.',
            'Faltou `key` na lista.',
            'O estado foi alterado no lugar.',
          ],
          correta: 1,
          explicacao: 'Respostas de rede não chegam na ordem em que saíram. A bandeira na limpeza (ou um `AbortController`, ou uma biblioteca de dados) garante que só a requisição mais recente altere a tela.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'refs-e-memo',
      titulo: 'Refs e memoização',
      minutos: 12,
      resumo: 'useRef para guardar sem renderizar e para alcançar o DOM. useMemo, useCallback e memo, e o compilador que os aposenta.',
      blocos: [
        {
          t: 'texto',
          md: `### useRef: uma gaveta que não avisa ninguém

\`useRef(inicial)\` devolve um objeto \`{ current: inicial }\` que **sobrevive entre renderizações** e que você pode alterar à vontade. A diferença para o estado: **mudar um ref não renderiza**.

| | \`useState\` | \`useRef\` |
|---|---|---|
| Sobrevive entre renderizações | sim | sim |
| Mudar provoca renderização | sim | **não** |
| Lê-se na renderização | sim | evite: o valor pode ter mudado sem a tela saber |
| Para quê | o que aparece na tela | o que a tela não mostra: id de temporizador, valor anterior, elemento do DOM |

O segundo uso é a **saída de emergência para o DOM**: passar um ref na prop \`ref\` de um elemento faz o React colocar o nó ali. Serve para o que não é declarativo: dar foco, medir tamanho, rolar até um ponto, desenhar num \`<canvas>\`.`,
        },
        {
          t: 'previa',
          titulo: 'Ref para o DOM e ref para um valor',
          altura: 200,
          codigo: `import { useRef, useState } from 'react';
import { Renderizou } from 'lab';

export default function App() {
  const campo = useRef(null);          // vai apontar para o <input>
  const cliques = useRef(0);           // um número que a tela não mostra
  const [mostrados, setMostrados] = useState(0);

  return (
    <Renderizou nome="App">
      <p className="linha">
        <input ref={campo} placeholder="código da armadilha" />
        <button onClick={() => campo.current.focus()}>Focar o campo</button>
      </p>
      <p className="linha">
        <button onClick={() => { cliques.current += 1; console.log('ref agora vale', cliques.current); }}>
          Contar no ref (não renderiza)
        </button>
        <button onClick={() => setMostrados(cliques.current)}>Copiar para o estado</button>
      </p>
      <p>Na tela: <strong>{mostrados}</strong></p>
    </Renderizou>
  );
}`,
        },
        {
          t: 'texto',
          md: `Clicar em "Contar no ref" muda o valor (o console mostra) e a moldura **não pisca**. Só "Copiar para o estado" renderiza.

Para quem escreveu os componentes de canvas da trilha de visão: o padrão é este. Um ref aponta para o \`<canvas>\`, e um efeito desenha nele quando os dados mudam.

### Memoização: lembrar um resultado

Por padrão, a cada renderização tudo é recalculado e toda função é recriada. Quase sempre isso é barato. Quando não é, há três ferramentas:

| Ferramenta | Lembra | Recalcula quando |
|---|---|---|
| \`useMemo(() => calcular(a, b), [a, b])\` | o **resultado** de um cálculo | \`a\` ou \`b\` mudam |
| \`useCallback(fn, [a])\` | a **identidade** de uma função | \`a\` muda |
| \`memo(Componente)\` | a **renderização** de um componente | alguma prop muda (comparação rasa) |

As três trabalham juntas. \`memo\` compara as props por identidade: uma função criada na hora é sempre "nova", e por isso derruba a memoização do filho. \`useCallback\` mantém a mesma função entre renderizações.`,
        },
        {
          t: 'previa',
          titulo: 'memo, e por que ele precisa de useCallback',
          altura: 330,
          alturaMax: 640,
          codigo: `import { useState, useCallback, memo } from 'react';
import { Renderizou } from 'lab';

function Linha({ armadilha, aoRemover }) {
  return (
    <Renderizou nome={'Linha ' + armadilha.codigo}>
      {armadilha.codigo} · {armadilha.insetos} <button onClick={() => aoRemover(armadilha.id)}>remover</button>
    </Renderizou>
  );
}
const LinhaMemo = memo(Linha);     // pula a renderização se as props forem as mesmas

export default function App() {
  const [itens, setItens] = useState([
    { id: 1, codigo: 'A-01', insetos: 12 },
    { id: 2, codigo: 'A-02', insetos: 31 },
  ]);
  const [texto, setTexto] = useState('');
  const [estavel, setEstavel] = useState(false);

  // criada de novo a cada renderização: para o memo, é sempre uma prop diferente
  const removerNova = (id) => setItens((atual) => atual.filter((a) => a.id !== id));
  // a mesma função entre renderizações
  const removerEstavel = useCallback((id) => setItens((atual) => atual.filter((a) => a.id !== id)), []);

  return (
    <div>
      <p className="linha">
        <input placeholder="digite aqui" value={texto} onChange={(e) => setTexto(e.target.value)} />
        <label><input type="checkbox" checked={estavel} onChange={(e) => setEstavel(e.target.checked)} /> usar useCallback</label>
      </p>
      {itens.map((a) => (
        <LinhaMemo key={a.id} armadilha={a} aoRemover={estavel ? removerEstavel : removerNova} />
      ))}
    </div>
  );
}`,
        },
        {
          t: 'texto',
          md: `Digite no campo. Sem a caixa marcada, **as duas linhas piscam a cada tecla**, embora nada nelas tenha mudado: o \`memo\` recebeu uma função nova e desistiu. Marque a caixa e digite de novo: as linhas param de piscar.

### O React Compiler

Escrever \`useMemo\`, \`useCallback\` e \`memo\` à mão é trabalhoso e fácil de errar (uma dependência esquecida, e o valor fica velho). Desde outubro de 2025 o **React Compiler** está em versão estável: é um plugin de build que analisa os componentes e insere a memoização sozinho.

O que muda na prática:

- **Projeto novo, com o compilador ligado:** escreva o código direto, sem memoização manual. Use \`useMemo\` e \`useCallback\` só como saída de emergência.
- **Projeto existente:** você vai ler muito código com os três. Precisa entendê-los.
- **Em qualquer caso:** o compilador só funciona se os componentes seguirem as regras do React (renderização pura, estado imutável). Código que altera props ou estado no lugar é pulado por ele.

A ordem das perguntas, quando algo está lento, continua a mesma: **medir** (o Profiler do React DevTools), **descer o estado**, e só então memoizar.

### Fontes

- [React Compiler: documentação](https://react.dev/learn/react-compiler)
- [React 19.2: Activity e useEffectEvent](https://react.dev/blog/2025/10/01/react-19-2)

Conferido em novembro de 2026.`,
        },
        {
          t: 'quiz',
          pergunta: 'Qual é a diferença essencial entre `useRef` e `useState`?',
          opcoes: [
            '`useRef` só guarda elementos do DOM.',
            'Os dois persistem entre renderizações, mas alterar um ref não provoca nova renderização.',
            '`useRef` é mais rápido para qualquer uso.',
            '`useState` não aceita objetos.',
          ],
          correta: 1,
          explicacao: 'O ref é para o que a tela não exibe: identificadores de temporizador, nós do DOM, valores de apoio. O que aparece na tela é estado.',
        },
        {
          t: 'quiz',
          pergunta: 'Um componente embrulhado em `memo` continua renderizando a cada tecla digitada no pai. Qual é a causa mais provável?',
          opcoes: [
            'O `memo` não funciona com listas.',
            'Alguma prop é um objeto, array ou função criado de novo a cada renderização do pai, e por isso nunca é "igual" à anterior.',
            'Falta a prop `key`.',
            'O componente tem estado próprio.',
          ],
          correta: 1,
          explicacao: 'O `memo` compara as props por identidade. Funções e objetos literais nascem novos a cada renderização. `useCallback` e `useMemo` estabilizam a identidade, e o compilador faz isso sozinho.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'hooks-proprios-e-contexto',
      titulo: 'Hooks próprios, reducer e contexto',
      minutos: 14,
      resumo: 'Extrair lógica para reutilizar, organizar estado complexo, e passar dados sem atravessar dez componentes.',
      blocos: [
        {
          t: 'texto',
          md: `### As regras dos hooks

São duas, e explicam todos os erros do tipo *"Rendered more hooks than during the previous render"*:

1. **Só no nível mais alto** do componente. Nunca dentro de \`if\`, laço ou função aninhada. O React identifica cada hook pela **ordem** das chamadas, e a ordem precisa ser a mesma em toda renderização.
2. **Só em componentes ou em outros hooks.** Não em funções comuns.

### Hook próprio: uma função que usa hooks

Um **hook próprio** é uma função cujo nome começa com \`use\` e que chama outros hooks. É o mecanismo de reutilização de **lógica com estado**, do mesmo jeito que componente é o de reutilização de tela.

O padrão de busca da lição anterior, com carregando, erro e bandeira de cancelamento, vira uma função só:`,
        },
        {
          t: 'previa',
          titulo: 'useBusca: o padrão de busca vira um hook',
          altura: 260,
          alturaMax: 560,
          codigo: `import { useState, useEffect } from 'react';

// Toda a lógica de buscar, com seus três estados, num lugar só.
function useBusca(url) {
  const [estado, setEstado] = useState({ situacao: 'carregando', dados: null, erro: null });

  useEffect(() => {
    let ignorar = false;
    setEstado({ situacao: 'carregando', dados: null, erro: null });

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);   // fetch NÃO rejeita em 404 ou 500
        return r.json();
      })
      .then((dados) => { if (!ignorar) setEstado({ situacao: 'pronto', dados, erro: null }); })
      .catch((erro) => { if (!ignorar) setEstado({ situacao: 'erro', dados: null, erro: erro.message }); });

    return () => { ignorar = true; };
  }, [url]);

  return estado;
}

function Estatisticas() {
  const { situacao, dados, erro } = useBusca('/api/lab/estatisticas');
  if (situacao === 'carregando') return <p className="suave">carregando…</p>;
  if (situacao === 'erro') return <p className="alerta">Falhou: {erro}</p>;
  return <p>{dados.total} detecções, confiança média de {Math.round(dados.confiancaMedia * 100)}%</p>;
}

function Instavel() {
  const [tentativa, setTentativa] = useState(1);
  // a rota /instavel falha metade das vezes; mudar a URL refaz a busca
  const { situacao, erro } = useBusca('/api/lab/instavel?t=' + tentativa);
  return (
    <p className="linha">
      Rota instável: <strong>{situacao}</strong> {erro && <span className="alerta">({erro})</span>}
      <button onClick={() => setTentativa(tentativa + 1)}>tentar de novo</button>
    </p>
  );
}

export default function App() {
  return (
    <div>
      <Estatisticas />
      <Instavel />
    </div>
  );
}`,
        },
        {
          t: 'texto',
          md: `Dois componentes usam o mesmo hook e **cada um tem o seu estado**. Um hook próprio compartilha a lógica, e não os dados.

### useReducer: quando o estado tem regras

Com vários \`useState\` que mudam juntos, ou com muitas formas de alterar o mesmo estado, as regras ficam espalhadas pelos manipuladores de evento. \`useReducer\` as junta numa função:

\`\`\`
(estado atual, ação) → próximo estado
\`\`\`

O componente deixa de dizer **como** o estado muda e passa a dizer **o que aconteceu**: \`despachar({ tipo: 'removida', id })\`. O redutor é uma função pura, fácil de testar sem React nenhum.`,
        },
        {
          t: 'previa',
          titulo: 'Um redutor para a lista de capturas',
          altura: 260,
          alturaMax: 560,
          codigo: `import { useReducer } from 'react';

// Função pura: mesma entrada, mesma saída. Dá para testar sem renderizar nada.
function redutor(estado, acao) {
  switch (acao.tipo) {
    case 'registrada':
      return { ...estado, proximoId: estado.proximoId + 1,
               capturas: [...estado.capturas, { id: estado.proximoId, armadilha: acao.armadilha, insetos: 0 }] };
    case 'contada':
      return { ...estado, capturas: estado.capturas.map((c) => (c.id === acao.id ? { ...c, insetos: c.insetos + acao.quantos } : c)) };
    case 'removida':
      return { ...estado, capturas: estado.capturas.filter((c) => c.id !== acao.id) };
    case 'zerada':
      return inicial;
  }
  throw new Error('ação desconhecida: ' + acao.tipo);
}

const inicial = { proximoId: 3, capturas: [{ id: 1, armadilha: 'A-01', insetos: 12 }, { id: 2, armadilha: 'A-02', insetos: 31 }] };

export default function App() {
  const [estado, despachar] = useReducer(redutor, inicial);
  const total = estado.capturas.reduce((soma, c) => soma + c.insetos, 0);

  return (
    <div>
      <p className="linha">
        <button onClick={() => despachar({ tipo: 'registrada', armadilha: 'A-0' + estado.proximoId })}>Nova armadilha</button>
        <button onClick={() => despachar({ tipo: 'zerada' })}>Recomeçar</button>
        <span>Total: <strong>{total}</strong></span>
      </p>
      {estado.capturas.map((c) => (
        <p key={c.id} className="linha">
          <code>{c.armadilha}</code> {c.insetos} insetos
          <button onClick={() => despachar({ tipo: 'contada', id: c.id, quantos: 1 })}>+1</button>
          <button onClick={() => despachar({ tipo: 'contada', id: c.id, quantos: 5 })}>+5</button>
          <button onClick={() => despachar({ tipo: 'removida', id: c.id })}>remover</button>
        </p>
      ))}
    </div>
  );
}`,
        },
        {
          t: 'texto',
          md: `As ações estão no **passado** (\`registrada\`, \`contada\`): descrevem o que aconteceu. Para quem vem do Python: o redutor é um \`match\` sobre uma união de tipos, e no TypeScript o compilador confere se todos os casos foram tratados.

### Contexto: dados sem atravessar a árvore

Alguns dados interessam a componentes espalhados por toda a tela: o usuário logado, o tema, o idioma, a usina selecionada. Passá-los por props obriga cada componente do caminho a repassar algo que ele mesmo não usa. Chama-se *prop drilling*.

**Contexto** é o mecanismo para isso: um ancestral **provê** um valor, e qualquer descendente o **lê**, sem intermediários.`,
        },
        {
          t: 'previa',
          titulo: 'Contexto: a usina selecionada, lida de longe',
          altura: 240,
          alturaMax: 520,
          codigo: `import { createContext, useContext, useState } from 'react';
import { Renderizou } from 'lab';

const UsinaContexto = createContext(null);

// hook próprio: esconde o contexto e dá um erro claro se faltar o provedor
function useUsina() {
  const valor = useContext(UsinaContexto);
  if (!valor) throw new Error('useUsina precisa estar dentro de <ProvedorDeUsina>');
  return valor;
}

function ProvedorDeUsina({ children }) {
  const [usina, setUsina] = useState('Boa Vista');
  // desde o React 19, o próprio contexto é o provedor: <UsinaContexto value={...}>
  return <UsinaContexto value={{ usina, setUsina }}>{children}</UsinaContexto>;
}

function Seletor() {
  const { usina, setUsina } = useUsina();
  return (
    <select value={usina} onChange={(e) => setUsina(e.target.value)}>
      <option>Boa Vista</option><option>Santa Helena</option><option>São Luiz</option>
    </select>
  );
}

function Cabecalho() {       // não sabe nada de usina, e não renderiza quando ela muda
  return <Renderizou nome="Cabecalho"><Seletor /></Renderizou>;
}

function Painel() {
  const { usina } = useUsina();
  return <Renderizou nome="Painel"><h3>Capturas da usina {usina}</h3></Renderizou>;
}

export default function App() {
  return (
    <ProvedorDeUsina>
      <Cabecalho />
      <Painel />
    </ProvedorDeUsina>
  );
}`,
        },
        {
          t: 'texto',
          md: `O \`Cabecalho\` não recebe nem repassa nada. E repare na moldura: trocar a usina pisca o \`Painel\`, e **não** o \`Cabecalho\`. Só renderiza quem **lê** o contexto. Isso funciona porque o provedor recebe os filhos como \`children\`: eles foram criados pelo \`App\`, que não renderizou.

### Contexto não é gerenciador de estado

Todo componente que lê um contexto renderiza quando **qualquer parte** do valor muda. Para dado que muda pouco (usuário, tema, usina), é ótimo. Para estado que muda muito e é lido por muitos componentes, há ferramentas melhores:

| Tipo de estado | Onde guardar |
|---|---|
| De um componente | \`useState\` ou \`useReducer\` |
| De alguns componentes próximos | estado elevado ao ancestral comum |
| Global, muda pouco | contexto |
| Global, muda muito | uma loja: **Zustand** é a escolha leve mais comum; Redux Toolkit em bases grandes e antigas |
| Que veio do servidor | biblioteca de dados (**TanStack Query**): é cache, e não estado da aplicação |
| Que deve sobreviver ao recarregar ou ser compartilhado por link | a **URL** (parâmetros de busca) |

A última linha é a mais esquecida. Filtro, página e aba selecionada pertencem à URL: o usuário copia o endereço e o colega vê a mesma tela.`,
        },
        {
          t: 'previa',
          titulo: 'useAlternador',
          enunciado: `Escreva o hook \`useAlternador(inicial)\`. Ele devolve um array \`[ligado, alternar]\`: o valor booleano atual e uma função que o inverte.

O \`App\` já usa o hook duas vezes. Cada painel deve abrir e fechar de forma independente.`,
          altura: 190,
          codigo: `import { useState } from 'react';

function useAlternador(inicial = false) {
  // seu código
  return [false, () => {}];
}

function Painel({ titulo, children }) {
  const [aberto, alternar] = useAlternador(false);
  return (
    <div className="cartao">
      <button onClick={alternar}>{aberto ? 'Fechar' : 'Abrir'} {titulo}</button>
      {aberto && <div>{children}</div>}
    </div>
  );
}

export default function App() {
  return (
    <div>
      <Painel titulo="capturas"><p>12 capturas nesta semana</p></Painel>
      <Painel titulo="alertas"><p>1 armadilha acima do nível</p></Painel>
    </div>
  );
}`,
          solucao: `import { useState } from 'react';

function useAlternador(inicial = false) {
  const [ligado, setLigado] = useState(inicial);
  const alternar = () => setLigado((atual) => !atual);
  return [ligado, alternar];
}

function Painel({ titulo, children }) {
  const [aberto, alternar] = useAlternador(false);
  return (
    <div className="cartao">
      <button onClick={alternar}>{aberto ? 'Fechar' : 'Abrir'} {titulo}</button>
      {aberto && <div>{children}</div>}
    </div>
  );
}

export default function App() {
  return (
    <div>
      <Painel titulo="capturas"><p>12 capturas nesta semana</p></Painel>
      <Painel titulo="alertas"><p>1 armadilha acima do nível</p></Painel>
    </div>
  );
}`,
          dica: 'Um `useState` dentro do hook, e uma função que chama `setLigado(atual => !atual)`.',
          testes: [
            { nome: 'os dois painéis começam fechados', codigo: `afirmar(!tela.texto().includes('12 capturas') && !tela.texto().includes('1 armadilha acima'), 'os painéis deveriam começar fechados');` },
            { nome: 'abrir "capturas" mostra o conteúdo dele', codigo: `await tela.clicar('Abrir capturas'); afirmar(tela.texto().includes('12 capturas nesta semana'), 'o conteúdo de capturas não apareceu');` },
            { nome: 'o outro painel continua fechado (estados independentes)', codigo: `afirmar(!tela.texto().includes('1 armadilha acima'), 'abrir um painel não deveria abrir o outro');` },
            { nome: 'o botão vira "Fechar" e fecha', codigo: `await tela.clicar('Fechar capturas'); afirmar(!tela.texto().includes('12 capturas nesta semana'), 'o painel deveria fechar');` },
          ],
        },
        {
          t: 'quiz',
          pergunta: 'Por que hooks não podem ser chamados dentro de um `if`?',
          opcoes: [
            'Porque ficariam lentos.',
            'Porque o React associa cada hook ao seu estado pela ordem das chamadas; uma chamada condicional muda a ordem entre renderizações e embaralha os estados.',
            'Porque o TypeScript proíbe.',
            'Porque `if` não existe em JSX.',
          ],
          correta: 1,
          explicacao: 'Não há nomes nos hooks: o primeiro `useState` é o primeiro estado, o segundo é o segundo. Pular um num `if` faz todos os seguintes pegarem o estado errado.',
        },
        {
          t: 'quiz',
          pergunta: 'Dois componentes usam o mesmo hook próprio `useBusca(url)`. Eles compartilham o estado?',
          opcoes: [
            'Sim, hooks próprios são globais.',
            'Não. Cada chamada tem o próprio estado; o hook compartilha a lógica. Para compartilhar dados usa-se estado elevado, contexto ou um cache de dados.',
            'Só se a URL for igual.',
            'Só dentro do mesmo arquivo.',
          ],
          correta: 1,
          explicacao: 'Um hook próprio é uma função comum que chama hooks. Chamá-la em dois componentes é como chamar `useState` em dois componentes.',
        },
      ],
    },
  ],
};
