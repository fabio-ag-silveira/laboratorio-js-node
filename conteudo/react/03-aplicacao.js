const PAINEL_INICIO = `import { useState, useEffect } from 'react';

const CLASSES = ['pessoa', 'capacete', 'colete', 'empilhadeira', 'caixa'];

export default function App() {
  const [deteccoes, setDeteccoes] = useState(null);

  // Já pronto: carrega a lista ao montar. (Reinicia a base de treino antes,
  // para o exercício começar sempre com as mesmas 6 detecções.)
  useEffect(() => {
    let ignorar = false;
    async function carregar() {
      await fetch('/api/lab/reiniciar', { method: 'POST' });
      const resposta = await fetch('/api/lab/deteccoes');
      const dados = await resposta.json();
      if (!ignorar) setDeteccoes(dados.itens);
    }
    carregar();
    return () => { ignorar = true; };
  }, []);

  if (deteccoes === null) return <p>Carregando…</p>;

  // 1. filtro por classe      2. resumo      3. remover      4. adicionar
  const visiveis = deteccoes;

  return (
    <div>
      <table>
        <thead><tr><th>classe</th><th>confiança</th><th>câmera</th><th></th></tr></thead>
        <tbody>
          {visiveis.map((d) => (
            <tr key={d.id}>
              <td>{d.classe}</td>
              <td>{Math.round(d.confianca * 100)}%</td>
              <td>{d.camera}</td>
              <td><button>remover</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}`;

const PAINEL_SOLUCAO = `import { useState, useEffect } from 'react';

const CLASSES = ['pessoa', 'capacete', 'colete', 'empilhadeira', 'caixa'];

export default function App() {
  const [deteccoes, setDeteccoes] = useState(null);
  const [filtro, setFiltro] = useState('todas');
  const [form, setForm] = useState({ classe: 'pessoa', confianca: '' });
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let ignorar = false;
    async function carregar() {
      await fetch('/api/lab/reiniciar', { method: 'POST' });
      const resposta = await fetch('/api/lab/deteccoes');
      const dados = await resposta.json();
      if (!ignorar) setDeteccoes(dados.itens);
    }
    carregar();
    return () => { ignorar = true; };
  }, []);

  if (deteccoes === null) return <p>Carregando…</p>;

  // derivado: nada disto é estado
  const visiveis = filtro === 'todas' ? deteccoes : deteccoes.filter((d) => d.classe === filtro);
  const media = visiveis.length ? visiveis.reduce((soma, d) => soma + d.confianca, 0) / visiveis.length : 0;

  async function remover(id) {
    const resposta = await fetch('/api/lab/deteccoes/' + id, { method: 'DELETE' });
    if (resposta.ok) setDeteccoes((atual) => atual.filter((d) => d.id !== id));
  }

  async function adicionar(e) {
    e.preventDefault();
    setErro(null);
    const resposta = await fetch('/api/lab/deteccoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classe: form.classe, confianca: Number(form.confianca) / 100, caixa: [0, 0, 10, 10] }),
    });
    const corpo = await resposta.json();
    if (!resposta.ok) return setErro(corpo.detalhes?.join(' ') ?? corpo.erro);
    setDeteccoes((atual) => [...atual, corpo]);       // a API devolve o item criado, com id
    setForm({ ...form, confianca: '' });
  }

  return (
    <div>
      <p className="linha">
        <select name="filtro" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="todas">todas</option>
          {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <span>{visiveis.length} detecções · confiança média {Math.round(media * 100)}%</span>
      </p>

      <table>
        <thead><tr><th>classe</th><th>confiança</th><th>câmera</th><th></th></tr></thead>
        <tbody>
          {visiveis.map((d) => (
            <tr key={d.id}>
              <td>{d.classe}</td>
              <td>{Math.round(d.confianca * 100)}%</td>
              <td>{d.camera}</td>
              <td><button onClick={() => remover(d.id)}>remover</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      <form onSubmit={adicionar} className="linha" style={{ marginTop: 10 }}>
        <select name="classe" value={form.classe} onChange={(e) => setForm({ ...form, classe: e.target.value })}>
          {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input name="confianca" type="number" min="0" max="100" placeholder="confiança %" style={{ width: 120 }}
               value={form.confianca} onChange={(e) => setForm({ ...form, confianca: e.target.value })} />
        <button disabled={form.confianca === ''}>Adicionar</button>
        {erro && <span className="alerta">{erro}</span>}
      </form>
    </div>
  );
}`;

export const modulo = {
  id: 'aplicacao',
  titulo: 'Aplicação',
  cor: '#6aa9f0',
  licoes: [
    // ------------------------------------------------------------------
    {
      id: 'typescript',
      titulo: 'TypeScript no React',
      minutos: 12,
      resumo: 'Tipar props, eventos e estado. A união discriminada, que elimina uma classe inteira de bugs de tela.',
      blocos: [
        {
          t: 'texto',
          md: `Projeto React profissional é em TypeScript. O arquivo passa a ser \`.tsx\`, e o ganho é o mesmo das anotações de tipo do Python com \`mypy\`, só que mais forte: o editor completa as props de um componente, e passar a prop errada é erro **antes de rodar**.

O que se tipa, na prática, são quatro coisas.`,
        },
        {
          t: 'comparacao',
          esq: {
            titulo: 'Python (dataclass + typing)',
            lang: 'python',
            codigo: `from dataclasses import dataclass
from typing import Callable, Literal

Nivel = Literal["baixo", "médio", "alto"]

@dataclass
class PropsArmadilha:
    codigo: str
    insetos: int
    nivel: Nivel = "baixo"
    observacao: str | None = None
    ao_abrir: Callable[[str], None] | None = None`,
          },
          dir: {
            titulo: 'TypeScript (props de um componente)',
            lang: 'tsx',
            codigo: `type Nivel = 'baixo' | 'médio' | 'alto';

type PropsArmadilha = {
  codigo: string;
  insetos: number;
  nivel?: Nivel;              // ? = opcional
  observacao?: string;
  aoAbrir?: (codigo: string) => void;
  children?: React.ReactNode; // qualquer coisa desenhável
};

function Armadilha({ codigo, insetos, nivel = 'baixo' }: PropsArmadilha) {
  return <p>{codigo}: {insetos} ({nivel})</p>;
}`,
          },
          nota: '`type` e `interface` servem para props. A convenção mais comum hoje é `type`. Uniões de literais (`"baixo" | "médio" | "alto"`) fazem o papel do `Literal` e do `Enum`.',
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['O que tipar', 'Como', 'Observação'],
          linhas: [
            ['Props', '`function C({ a, b }: Props)`', 'evite `React.FC`: caiu em desuso'],
            ['Estado', '`useState<Captura[]>([])`, `useState<Usuario | null>(null)`', 'com valor inicial simples (`useState(0)`), o tipo é inferido'],
            ['Evento de campo', '`(e: React.ChangeEvent<HTMLInputElement>) => ...`', 'escrito inline no JSX, o tipo é inferido e não precisa anotar'],
            ['Evento de formulário', '`(e: React.FormEvent<HTMLFormElement>) => ...`', ''],
            ['Ref de elemento', '`useRef<HTMLInputElement>(null)`', '`ref.current` pode ser `null`: o compilador obriga a checar'],
            ['Resposta de API', 'um `type` para o formato, e validação em tempo de execução (Zod)', 'o tipo sozinho é uma promessa: a rede pode devolver outra coisa'],
          ],
        },
        {
          t: 'nota',
          estilo: 'atencao',
          md: `**As prévias deste laboratório aceitam TypeScript e não conferem os tipos.** O esbuild apenas apaga as anotações, que é também o que o Vite faz ao rodar em desenvolvimento. Quem confere é o compilador \`tsc\`, no editor e no \`npm run build\`. Os erros de tipo mostrados nesta lição estão em comentários.`,
        },
        {
          t: 'texto',
          md: `### A união discriminada

É o recurso do TypeScript que mais melhora código de interface. O problema: uma busca tem três situações, e a modelagem ingênua permite combinações que não existem.

\`\`\`tsx
// Ruim: 3 campos independentes = 8 combinações, das quais 3 fazem sentido
type Estado = { carregando: boolean; dados?: Captura[]; erro?: string };
// carregando: true E erro: "falhou"? carregando: false SEM dados e SEM erro?
\`\`\`

A união discriminada lista **só os estados que existem**. Um campo em comum (o discriminante) diz qual é o caso, e o compilador **estreita** o tipo dentro de cada \`if\` ou \`switch\`.`,
        },
        {
          t: 'previa',
          titulo: 'Estados impossíveis não se representam',
          altura: 220,
          alturaMax: 520,
          codigo: `import { useState } from 'react';

type Captura = { id: number; armadilha: string; insetos: number };

// Só três formas possíveis. "situacao" é o discriminante.
type Busca =
  | { situacao: 'carregando' }
  | { situacao: 'erro'; mensagem: string }
  | { situacao: 'pronto'; capturas: Captura[] };

function Resultado({ busca }: { busca: Busca }) {
  switch (busca.situacao) {
    case 'carregando':
      return <p className="suave">carregando…</p>;
    case 'erro':
      // aqui o compilador SABE que existe busca.mensagem, e que NÃO existe busca.capturas
      return <p className="alerta">Falhou: {busca.mensagem}</p>;
    case 'pronto':
      return (
        <ul>
          {busca.capturas.map((c) => <li key={c.id}>{c.armadilha}: {c.insetos}</li>)}
        </ul>
      );
    // sem "default": se surgir uma quarta situação, o compilador aponta este switch
  }
}

const EXEMPLOS: Busca[] = [
  { situacao: 'carregando' },
  { situacao: 'erro', mensagem: 'HTTP 503' },
  { situacao: 'pronto', capturas: [{ id: 1, armadilha: 'A-01', insetos: 12 }, { id: 2, armadilha: 'A-02', insetos: 31 }] },
];

export default function App() {
  const [i, setI] = useState(0);
  return (
    <div>
      <p className="linha">
        {EXEMPLOS.map((e, n) => <button key={e.situacao} onClick={() => setI(n)}>{e.situacao}</button>)}
      </p>
      <Resultado busca={EXEMPLOS[i]} />
    </div>
  );
}`,
        },
        {
          t: 'texto',
          md: `É a mesma ideia do \`match\` com classes no Python 3.10+, e das uniões que o C# 15 acabou de ganhar. Você vai usá-la em três lugares: estado de requisição, ações de um redutor, e variantes de um componente (um \`Botao\` que ou tem \`href\` ou tem \`onClick\`, nunca os dois).`,
        },
        {
          t: 'codigo',
          titulo: 'O que o compilador pega (para ler)',
          lang: 'tsx',
          codigo: `type Props = { codigo: string; insetos: number; aoAbrir: (codigo: string) => void };
function Armadilha({ codigo, insetos, aoAbrir }: Props) { /* ... */ }

<Armadilha codigo="A-01" insetos="12" aoAbrir={abrir} />
//                       ~~~~~~~ Type 'string' is not assignable to type 'number'.

<Armadilha codigo="A-01" insetos={12} />
// ~~~~~~~ Property 'aoAbrir' is missing in type '{ codigo: string; insetos: number; }'

<Armadilha codigo="A-01" insetos={12} aoAbrir={abrir} talhao={14} />
//                                                    ~~~~~~ Property 'talhao' does not exist

const [usina, setUsina] = useState<Usina | null>(null);
usina.nome;
// ~~~ 'usina' is possibly 'null'.      →  usina?.nome   ou   if (usina) { ... }

// Componente genérico: a tabela serve para qualquer tipo de linha
type PropsTabela<T> = { linhas: T[]; colunas: { titulo: string; valor: (linha: T) => React.ReactNode }[] };
function Tabela<T extends { id: number }>({ linhas, colunas }: PropsTabela<T>) { /* ... */ }

<Tabela linhas={capturas} colunas={[{ titulo: 'Insetos', valor: (c) => c.insetos }]} />
//                                                              ↑ "c" é inferido como Captura`,
        },
        {
          t: 'quiz',
          pergunta: 'Qual é a vantagem de modelar o estado de uma requisição como união discriminada?',
          opcoes: [
            'O código fica mais curto.',
            'Só os estados que existem de fato são representáveis, e o compilador garante que cada caso seja tratado e que só os campos daquele caso sejam acessados.',
            'A requisição fica mais rápida.',
            'Dispensa o tratamento de erro.',
          ],
          correta: 1,
          explicacao: 'Com campos booleanos soltos, combinações sem sentido passam pelo compilador. Com a união, "carregando com erro" nem pode ser escrito.',
        },
        {
          t: 'quiz',
          pergunta: 'O tipo `Captura[]` anotado na resposta de um `fetch` garante que o servidor devolveu capturas?',
          opcoes: [
            'Sim, o TypeScript valida a resposta.',
            'Não. Tipos somem na compilação; em tempo de execução o JSON pode ter qualquer formato. Para garantir, valida-se com uma biblioteca de esquema, como o Zod.',
            'Sim, se o servidor for em TypeScript.',
            'Só em modo estrito.',
          ],
          correta: 1,
          explicacao: 'O tipo é uma declaração de intenção. Na fronteira do sistema (rede, formulário, armazenamento local) é preciso validar de verdade, como o Pydantic faz no FastAPI.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'dados-do-servidor',
      titulo: 'Dados do servidor e o React 19',
      minutos: 15,
      resumo: 'Estado do servidor é cache. TanStack Query, e as novidades do React 19: Actions, useOptimistic e use.',
      blocos: [
        {
          t: 'texto',
          md: `Os dados que vêm de uma API **não são estado da sua aplicação**. São uma **cópia**, possivelmente velha, de algo que mora em outro lugar e que outras pessoas alteram. Tratar isso com \`useState\` e \`useEffect\` obriga a reescrever, em cada tela:

- carregando, erro, sucesso;
- condição de corrida e cancelamento;
- cache (voltar a uma tela já visitada não deveria mostrar "carregando");
- revalidar quando a aba volta ao foco ou a rede retorna;
- depois de salvar, atualizar as listas que dependem daquele dado;
- nova tentativa em falha transitória.

O **TanStack Query** resolve isso e é o padrão de mercado em aplicações que consomem API REST. A ideia: cada dado tem uma **chave**, e a biblioteca mantém um cache por chave.`,
        },
        {
          t: 'codigo',
          titulo: 'A mesma tela com TanStack Query (para ler)',
          lang: 'tsx',
          codigo: `import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

async function buscarDeteccoes(classe: string): Promise<Deteccao[]> {
  const r = await fetch(\`/api/deteccoes?classe=\${classe}\`);
  if (!r.ok) throw new Error(\`HTTP \${r.status}\`);
  return (await r.json()).itens;
}

function Lista({ classe }: { classe: string }) {
  const cliente = useQueryClient();

  // LER: a chave identifica o dado. Mudou a classe, é outro dado, com outro cache.
  const { data, isPending, error } = useQuery({
    queryKey: ['deteccoes', classe],
    queryFn: () => buscarDeteccoes(classe),
  });

  // ESCREVER: depois de remover, as listas em cache são marcadas como velhas e recarregam.
  const remover = useMutation({
    mutationFn: (id: number) => fetch(\`/api/deteccoes/\${id}\`, { method: 'DELETE' }),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['deteccoes'] }),
  });

  if (isPending) return <p>carregando…</p>;
  if (error) return <p>Falhou: {error.message}</p>;

  return (
    <ul>
      {data.map((d) => (
        <li key={d.id}>
          {d.classe} <button onClick={() => remover.mutate(d.id)} disabled={remover.isPending}>remover</button>
        </li>
      ))}
    </ul>
  );
}`,
        },
        {
          t: 'texto',
          md: `Sem efeito, sem bandeira de cancelamento, sem três \`useState\`. E com cache, deduplicação e revalidação de graça.

### O que o React 19 trouxe

O React 19 (dezembro de 2024) incorporou à biblioteca padrões que antes dependiam de código manual. Três valem conhecer, porque aparecem em código novo e em entrevista.

**1. Actions.** Uma função assíncrona passada ao \`action\` de um \`<form>\`. O React cuida do estado pendente, do erro e de limpar o formulário. O hook \`useActionState\` guarda o resultado da última execução.`,
        },
        {
          t: 'previa',
          titulo: 'Formulário com Action e useActionState',
          altura: 200,
          alturaMax: 480,
          codigo: `import { useActionState } from 'react';

// A action recebe o estado anterior e os dados do formulário. O que ela devolve
// vira o novo estado. Sem useState para os campos, sem preventDefault.
async function registrar(anterior, dados: FormData) {
  const confianca = Number(dados.get('confianca')) / 100;
  const resposta = await fetch('/api/lab/deteccoes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ classe: dados.get('classe'), confianca, caixa: [0, 0, 10, 10] }),
  });
  const corpo = await resposta.json();
  if (!resposta.ok) return { erro: corpo.detalhes?.join(' ') ?? corpo.erro, criadas: anterior.criadas };
  return { erro: null, criadas: [...anterior.criadas, corpo] };
}

export default function App() {
  const [estado, acao, pendente] = useActionState(registrar, { erro: null, criadas: [] });

  return (
    <form action={acao}>
      <p className="linha">
        <input name="classe" placeholder="classe (ex.: capacete)" />
        <input name="confianca" type="number" placeholder="confiança %" style={{ width: 120 }} />
        <button disabled={pendente}>{pendente ? 'Enviando…' : 'Registrar'}</button>
      </p>
      {estado.erro && <p className="alerta">{estado.erro}</p>}
      <ul>
        {estado.criadas.map((d) => <li key={d.id}>#{d.id} {d.classe} · {Math.round(d.confianca * 100)}%</li>)}
      </ul>
    </form>
  );
}`,
        },
        {
          t: 'texto',
          md: `Envie o formulário vazio, depois com uma classe inválida, depois com \`capacete\` e \`80\`. As mensagens de erro vêm da validação da **API**, a mesma que você exercitou na trilha de JavaScript. Os campos não são controlados: o React lê tudo do \`FormData\` na hora do envio.

**2. \`useOptimistic\`.** Mostra o resultado **antes** de o servidor confirmar, e desfaz sozinho se a operação falhar. É o que faz um botão de curtir responder na hora.`,
        },
        {
          t: 'previa',
          titulo: 'Atualização otimista',
          altura: 220,
          alturaMax: 480,
          codigo: `import { useState, useOptimistic, startTransition } from 'react';

async function salvarNoServidor(falhar) {
  await fetch('/api/lab/lento?ms=1500');            // um servidor que demora 1,5 s
  if (falhar) throw new Error('o servidor recusou');
}

export default function App() {
  const [revisadas, setRevisadas] = useState([]);       // o que o servidor confirmou
  // o que a tela mostra enquanto a confirmação não chega
  const [otimistas, marcarOtimista] = useOptimistic(revisadas, (atual, id) => [...atual, id]);
  const [falhar, setFalhar] = useState(false);
  const [aviso, setAviso] = useState('');

  function revisar(id) {
    setAviso('');
    startTransition(async () => {
      marcarOtimista(id);                    // a tela muda JÁ
      try {
        await salvarNoServidor(falhar);
        setRevisadas((atual) => [...atual, id]);      // confirmado: vira estado de verdade
      } catch (e) {
        setAviso('Não salvou (' + e.message + '). A marca foi desfeita.');
      }                                       // ao fim da transição, o otimista some sozinho
    });
  }

  return (
    <div>
      <p><label><input type="checkbox" checked={falhar} onChange={(e) => setFalhar(e.target.checked)} /> fazer o servidor falhar</label></p>
      {['A-01', 'A-02', 'A-03'].map((id) => (
        <p key={id} className="linha">
          <code>{id}</code>
          {otimistas.includes(id)
            ? <span>✓ revisada {!revisadas.includes(id) && <small>(salvando…)</small>}</span>
            : <button onClick={() => revisar(id)}>marcar como revisada</button>}
        </p>
      ))}
      {aviso && <p className="alerta">{aviso}</p>}
    </div>
  );
}`,
        },
        {
          t: 'texto',
          md: `O "✓ revisada" aparece no instante do clique, um segundo e meio antes da resposta. Marque "fazer o servidor falhar" e clique em outra: a marca aparece e, quando o erro chega, **volta atrás sozinha**.

**3. \`use\` e Suspense.** \`use(promessa)\` lê o valor de uma promessa **durante a renderização**. Enquanto ela não resolve, o componente "suspende" e o \`<Suspense>\` mais próximo mostra o \`fallback\`. O estado de carregando sai do componente e vai para quem o envolve.`,
        },
        {
          t: 'previa',
          titulo: 'use + Suspense: o carregando sai do componente',
          altura: 170,
          alturaMax: 420,
          codigo: `import { use, Suspense, useState } from 'react';

// A promessa é criada FORA da renderização (aqui, num cache simples por chave).
// Criá-la dentro do componente dispararia uma busca nova a cada renderização.
const cache = new Map();
function buscar(ms) {
  if (!cache.has(ms)) {
    cache.set(ms, fetch('/api/lab/lento?ms=' + ms).then(() => fetch('/api/lab/estatisticas')).then((r) => r.json()));
  }
  return cache.get(ms);
}

function Resumo({ ms }) {
  const dados = use(buscar(ms));      // sem if (carregando): aqui o dado JÁ existe
  return <p>{dados.total} detecções em {Object.keys(dados.porClasse).length} classes (esperou {ms} ms)</p>;
}

export default function App() {
  const [ms, setMs] = useState(1200);
  return (
    <div>
      <p className="linha">
        <button onClick={() => setMs(ms + 1)}>buscar de novo (chave nova)</button>
        <button onClick={() => setMs(1200)}>voltar à primeira (já em cache)</button>
      </p>
      <Suspense fallback={<p className="suave">carregando o resumo…</p>}>
        <Resumo ms={ms} />
      </Suspense>
    </div>
  );
}`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Novidade', 'Versão', 'Para quê'],
          linhas: [
            ['Actions, `useActionState`, `useFormStatus`', '19.0', 'formulários e mutações com pendente e erro embutidos'],
            ['`useOptimistic`', '19.0', 'interface que responde antes do servidor'],
            ['`use`', '19.0', 'ler promessa ou contexto durante a renderização'],
            ['`ref` como prop comum', '19.0', 'acabou a necessidade de `forwardRef`'],
            ['`<Contexto value>` como provedor', '19.0', 'dispensa o `.Provider`'],
            ['React Compiler', 'estável em out. 2025', 'memoização automática'],
            ['`<Activity>`, `useEffectEvent`', '19.2', 'esconder uma tela mantendo o estado; ler valor atual num efeito sem torná-lo dependência'],
            ['View Transitions, Fragment Refs', '19.3 (set. 2026)', 'animação entre estados de tela pela API do navegador'],
          ],
        },
        {
          t: 'nota',
          estilo: 'campo',
          md: `**O que usar no painel da Agroverita.** Para um painel interno que consome uma API em .NET: **TanStack Query** para ler e escrever dados, \`useState\` para estado de tela, a URL para filtros. As Actions do React 19 brilham em frameworks com servidor (Next.js, React Router em modo framework), onde a função da action roda **no servidor**. Num SPA puro elas ajudam em formulários, e o TanStack Query continua sendo a peça central.`,
        },
        {
          t: 'texto',
          md: `### Fontes

- [React 19: anúncio](https://react.dev/blog/2024/12/05/react-19)
- [React 19.2](https://react.dev/blog/2025/10/01/react-19-2)
- [React 19.3](https://react.dev/blog/2026/09/09/react-19-3)
- [TanStack Query: documentação](https://tanstack.com/query/latest)

Conferido em novembro de 2026.`,
        },
        {
          t: 'quiz',
          pergunta: 'Por que dados vindos de uma API não deveriam ser tratados como estado comum da aplicação?',
          opcoes: [
            'Porque são grandes demais.',
            'Porque são uma cópia de algo que mora no servidor e pode mudar sem a tela saber: precisam de cache, revalidação e invalidação, que é o trabalho de uma biblioteca de dados.',
            'Porque o React não aceita JSON em estado.',
            'Porque só podem ser lidos uma vez.',
          ],
          correta: 1,
          explicacao: 'Estado do cliente é seu e está sempre atual. Estado do servidor é emprestado e envelhece. Misturar os dois leva a telas desatualizadas e a muito código repetido.',
        },
        {
          t: 'quiz',
          pergunta: 'O que acontece com uma atualização feita por `useOptimistic` quando a operação falha?',
          opcoes: [
            'Ela permanece na tela até recarregar.',
            'Ao fim da transição, o valor otimista é descartado e a tela volta ao estado real, que não mudou.',
            'A aplicação quebra.',
            'O React tenta de novo sozinho.',
          ],
          correta: 1,
          explicacao: 'O valor otimista só vale enquanto a transição está em andamento. Se o estado real não foi atualizado, a marca some. Avisar o usuário do erro continua sendo trabalho seu.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'projeto-real',
      titulo: 'O projeto real: Vite, rotas, testes e deploy',
      minutos: 14,
      resumo: 'Do arquivo único da prévia a um repositório de verdade, e as decisões que aparecem no primeiro dia.',
      blocos: [
        {
          t: 'texto',
          md: `Tudo até aqui rodou num arquivo. Um projeto tem pastas, rotas, variáveis de ambiente, testes e um processo de build. Esta lição é o mapa.

### Criar e rodar

\`\`\`bash
npm create vite@latest painel -- --template react-ts
cd painel
npm install
npm run dev        # servidor de desenvolvimento, com atualização instantânea
npm run build      # confere os tipos (tsc) e gera a pasta dist/
npm run preview    # serve a dist/ para conferir o build
\`\`\`

O **Create React App** foi oficialmente aposentado em fevereiro de 2025. Para um SPA, o caminho é o Vite. Para aplicação com renderização no servidor, um framework: Next.js ou React Router em modo framework.

### Organizar por funcionalidade

\`\`\`
src/
├── main.tsx                  ponto de entrada: provedores e roteador
├── rotas.tsx                 a tabela de rotas
├── api/
│   ├── cliente.ts            fetch com URL base, token e tratamento de erro
│   └── tipos.ts              os tipos (ou esquemas Zod) das respostas
├── funcionalidades/
│   ├── capturas/
│   │   ├── PaginaDeCapturas.tsx
│   │   ├── TabelaDeCapturas.tsx
│   │   ├── useCapturas.ts    as consultas desta funcionalidade
│   │   └── TabelaDeCapturas.test.tsx
│   └── usinas/
└── componentes/              só o que é genérico de verdade: Botao, Modal, Tabela
\`\`\`

A pasta por **funcionalidade** (e não por tipo de arquivo) mantém junto o que muda junto. O teste mora ao lado do que testa.`,
        },
        {
          t: 'codigo',
          titulo: 'Rotas com React Router (para ler)',
          lang: 'tsx',
          codigo: `import { createBrowserRouter, RouterProvider, Outlet, NavLink, useParams, useSearchParams } from 'react-router';

function Moldura() {
  return (
    <>
      <nav>
        <NavLink to="/">Usinas</NavLink>
        <NavLink to="/capturas">Capturas</NavLink>
      </nav>
      <main><Outlet /></main>          {/* a rota filha aparece aqui */}
    </>
  );
}

function PaginaDaUsina() {
  const { id } = useParams();                          // /usinas/42  →  id = "42"
  const [busca, setBusca] = useSearchParams();         // ?talhao=14  →  estado na URL
  const talhao = busca.get('talhao') ?? 'todos';
  return (
    <select value={talhao} onChange={(e) => setBusca({ talhao: e.target.value })}>
      {/* trocar o filtro muda a URL: o link copiado abre na mesma visão */}
    </select>
  );
}

const roteador = createBrowserRouter([
  {
    path: '/',
    element: <Moldura />,
    children: [
      { index: true, element: <PaginaDeUsinas /> },
      { path: 'usinas/:id', element: <PaginaDaUsina /> },
      { path: 'capturas', element: <PaginaDeCapturas /> },
      { path: '*', element: <p>Página não encontrada</p> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={roteador} />;
}`,
        },
        {
          t: 'texto',
          md: `### Falar com a API: ambiente, CORS e proxy

O front em desenvolvimento roda em \`http://localhost:5173\`. A API em .NET roda em \`http://localhost:5000\`. Para o navegador são **origens diferentes**, e ele bloqueia a leitura da resposta a menos que a API autorize com os cabeçalhos de **CORS**.

| Saída | Como | Quando |
|---|---|---|
| Proxy do Vite | \`server.proxy = { '/api': 'http://localhost:5000' }\` no \`vite.config.ts\`: o front chama \`/api/...\` e o Vite repassa | desenvolvimento; o navegador vê uma origem só |
| CORS na API | no ASP.NET, \`app.UseCors(...)\` listando as origens do front | produção com front e API em domínios diferentes |
| Mesma origem | o front e a API atrás do mesmo domínio (um proxy reverso, ou o Azure Static Web Apps com API vinculada) | o mais simples de operar |

A URL da API nunca fica fixa no código. No Vite, variáveis de ambiente que começam com \`VITE_\` ficam disponíveis em \`import.meta.env\`:

\`\`\`bash
# .env.development
VITE_API_URL=http://localhost:5000
\`\`\`

Atenção: tudo que tem prefixo \`VITE_\` vai **embutido no JavaScript público**. Segredo de verdade (chave de API, senha) nunca entra num front.`,
        },
        {
          t: 'codigo',
          titulo: 'Teste de componente com Vitest e Testing Library (para ler)',
          lang: 'tsx',
          codigo: `import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { Contador } from './Contador';

test('soma e mostra o aviso a partir de 20', async () => {
  const usuario = userEvent.setup();
  render(<Contador />);

  // procura como o usuário procuraria: pelo papel e pelo texto, não por classe CSS
  expect(screen.getByRole('heading')).toHaveTextContent('0 insetos');

  await usuario.click(screen.getByRole('button', { name: '+5' }));
  expect(screen.getByRole('heading')).toHaveTextContent('5 insetos');

  expect(screen.queryByText('Nível de controle atingido')).not.toBeInTheDocument();
  for (let i = 0; i < 3; i++) await usuario.click(screen.getByRole('button', { name: '+5' }));
  expect(screen.getByText('Nível de controle atingido')).toBeInTheDocument();
});

// Para componente que busca dados: findBy... espera o elemento aparecer,
// e a rede é simulada com o MSW (Mock Service Worker), que intercepta o fetch.
test('lista as capturas vindas da API', async () => {
  render(<ListaDeCapturas />);
  expect(await screen.findByText('A-01: 12 insetos')).toBeInTheDocument();
});`,
        },
        {
          t: 'texto',
          md: `Os testes dos exercícios desta trilha seguem a mesma filosofia, com uma versão caseira (\`tela.clicar\`, \`tela.texto\`): **testar o comportamento visível, e não a implementação**. Um teste que confere "o estado interno vale 5" quebra em toda refatoração. Um que confere "a tela mostra 5 insetos" só quebra quando o comportamento muda.

| Tipo de teste | Ferramenta | Cobre |
|---|---|---|
| Unidade (funções puras, redutores, hooks) | Vitest | regras de negócio; rápido |
| Componente | Vitest + Testing Library + MSW | a tela reage certo a cliques e a respostas da API |
| Ponta a ponta | Playwright | o fluxo inteiro num navegador real, contra um ambiente de teste |

### Build e publicação

\`npm run build\` gera \`dist/\`: HTML, CSS e JavaScript estáticos, com nomes que carregam um hash do conteúdo. Não há servidor Node em produção: qualquer hospedagem de arquivos estáticos serve.

- **Azure Static Web Apps** é o equivalente ao Cloudflare Pages e ao Netlify que você já usa: liga no repositório, faz o build a cada push e publica com HTTPS e ambiente de prévia por pull request. Fica na trilha de Azure.
- Um SPA com rotas precisa da regra de **fallback**: qualquer caminho desconhecido devolve o \`index.html\`, senão recarregar a página em \`/usinas/42\` dá 404.

### A lista de decisões do primeiro dia`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Decisão', 'Escolha comum em 2026', 'Alternativa'],
          linhas: [
            ['Build', 'Vite', 'framework completo (Next.js) se precisar de renderização no servidor'],
            ['Linguagem', 'TypeScript em modo estrito', '—'],
            ['Rotas', 'React Router', 'TanStack Router (rotas tipadas de ponta a ponta)'],
            ['Dados do servidor', 'TanStack Query', 'carregadores do roteador; SWR'],
            ['Estado global do cliente', 'o mínimo possível; Zustand quando precisar', 'Redux Toolkit'],
            ['Formulários', 'React Hook Form + Zod', 'Actions do React 19'],
            ['Estilo', 'Tailwind CSS, ou CSS Modules', 'biblioteca de componentes: shadcn/ui, MUI, Mantine'],
            ['Testes', 'Vitest + Testing Library; Playwright', 'Jest em bases antigas'],
            ['Qualidade', 'ESLint (com as regras de hooks) + Prettier, ou Biome', '—'],
          ],
        },
        {
          t: 'nota',
          estilo: 'entrevista',
          md: `**"SPA ou Next.js?"** Um painel interno atrás de login não precisa de indexação nem de primeira pintura rápida para visitantes anônimos: SPA com Vite é mais simples de construir, hospedar e depurar, e combina com uma API separada em .NET. Site público, com conteúdo e SEO, pede renderização no servidor. A resposta fraca é escolher pelo que está na moda. A forte parte de quem usa e do que precisa carregar primeiro.`,
        },
        {
          t: 'texto',
          md: `### Fontes

- [Vite: guia](https://vite.dev/guide/)
- [React Router: documentação](https://reactrouter.com/)
- [Testing Library: princípios](https://testing-library.com/docs/guiding-principles)
- [Fim do Create React App](https://devclass.com/2025/02/18/react-team-formally-deprecates-create-react-app-following-perfect-storm-of-incompatibility/)

Conferido em novembro de 2026.`,
        },
        {
          t: 'quiz',
          pergunta: 'O front em `localhost:5173` chama a API em `localhost:5000` e o navegador bloqueia. Qual é a solução mais simples em desenvolvimento?',
          opcoes: [
            'Desligar a segurança do navegador.',
            'Configurar o proxy do Vite: o front chama `/api/...` na própria origem e o servidor de desenvolvimento repassa para a API.',
            'Trocar `fetch` por `axios`.',
            'Usar `mode: "no-cors"` no `fetch`.',
          ],
          correta: 1,
          explicacao: 'Portas diferentes são origens diferentes. Com o proxy, o navegador só fala com uma origem. O `no-cors` não resolve: ele devolve uma resposta opaca, que o código não consegue ler.',
        },
        {
          t: 'quiz',
          pergunta: 'Por que procurar elementos por papel e texto (`getByRole("button", { name: "+5" })`) em vez de por classe CSS ou id?',
          opcoes: [
            'Porque é mais rápido.',
            'Porque o teste passa a depender do que o usuário percebe, e não de detalhes de implementação; refatorar o componente não quebra o teste, e de quebra confere a acessibilidade.',
            'Porque classes CSS não existem em teste.',
            'Porque o Vitest exige.',
          ],
          correta: 1,
          explicacao: 'É o princípio da Testing Library: quanto mais o teste se parece com o uso real, mais confiança ele dá. Se o botão não é achado pelo papel, um leitor de tela também não o acha.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'painel',
      titulo: 'Projeto: painel de detecções',
      minutos: 30,
      resumo: 'Tudo junto: carregar, filtrar, resumir, criar e remover, contra a API do laboratório.',
      blocos: [
        {
          t: 'texto',
          md: `O exercício final junta a trilha: estado, dado derivado, formulário, efeito e chamadas à API. É o esqueleto de qualquer tela administrativa, e a base do painel do projeto integrador.

A API é a de treino do laboratório, a mesma do **Explorador de API**:

| Método | Rota | Faz |
|---|---|---|
| \`GET\` | \`/api/lab/deteccoes\` | lista: \`{ total, itens: [{ id, classe, confianca, camera }] }\` |
| \`POST\` | \`/api/lab/deteccoes\` | cria; corpo \`{ classe, confianca, caixa }\`; responde **201** com o item criado, ou **400** com \`{ erro, detalhes }\` |
| \`DELETE\` | \`/api/lab/deteccoes/:id\` | remove; responde **204**, sem corpo |

O carregamento inicial e a tabela já estão prontos. Faltam quatro partes.`,
        },
        {
          t: 'previa',
          titulo: 'Painel de detecções',
          enunciado: `1. **Filtro.** Um \`<select name="filtro">\` com a opção \`todas\` e uma opção por classe. A tabela mostra só a classe escolhida.
2. **Resumo.** Um texto no formato **"6 detecções · confiança média 78%"**, calculado das linhas visíveis.
3. **Remover.** O botão de cada linha chama \`DELETE\` e tira a linha da tabela.
4. **Adicionar.** Um formulário com \`<select name="classe">\`, \`<input name="confianca" type="number">\` (em porcentagem) e um botão **"Adicionar"**. Envia \`POST\` com \`confianca\` entre 0 e 1 e \`caixa: [0, 0, 10, 10]\`, e acrescenta à tabela o item que a API devolver.

Dica de método: faça uma parte por vez e rode os testes a cada uma.`,
          altura: 380,
          alturaMax: 700,
          codigo: PAINEL_INICIO,
          solucao: PAINEL_SOLUCAO,
          dica: 'O filtro e o resumo são dados derivados: um `.filter()` e um `.reduce()` antes do `return`. Remover: `await fetch(url, { method: "DELETE" })` e depois `setDeteccoes(atual => atual.filter(...))`. Adicionar: no `onSubmit`, `preventDefault`, `POST` com `JSON.stringify`, e `setDeteccoes(atual => [...atual, itemDevolvido])`.',
          testes: [
            { nome: 'carrega as 6 detecções', codigo: `await tela.esperar(() => tela.acharTodos('tbody tr').length === 6, 5000);` },
            { nome: 'o resumo mostra "6 detecções · confiança média 78%"', codigo: `afirmar(tela.texto().includes('6 detecções · confiança média 78%'), 'não achei o texto "6 detecções · confiança média 78%"');` },
            { nome: 'filtrar por "pessoa" deixa 2 linhas', codigo: `await tela.digitar('select[name="filtro"]', 'pessoa'); afirmar(tela.acharTodos('tbody tr').length === 2, 'esperava 2 linhas, achei ' + tela.acharTodos('tbody tr').length); afirmar(tela.texto().includes('2 detecções'), 'o resumo deveria dizer "2 detecções"');` },
            { nome: 'voltar para "todas" mostra as 6', codigo: `await tela.digitar('select[name="filtro"]', 'todas'); afirmar(tela.acharTodos('tbody tr').length === 6, 'esperava 6 linhas, achei ' + tela.acharTodos('tbody tr').length);` },
            { nome: 'remover tira a linha da tela', codigo: `await tela.clicar(tela.achar('tbody tr button')); await tela.esperar(() => tela.acharTodos('tbody tr').length === 5, 3000);` },
            { nome: 'remover apagou no servidor também', codigo: `const r = await (await fetch('/api/lab/deteccoes')).json(); afirmar(r.total === 5, 'a API ainda tem ' + r.total + ' detecções: faltou o DELETE?');` },
            { nome: 'adicionar "colete" com 50% cria uma linha', codigo: `await tela.digitar('select[name="classe"]', 'colete'); await tela.digitar('input[name="confianca"]', '50'); await tela.clicar('Adicionar'); await tela.esperar(() => tela.acharTodos('tbody tr').length === 6, 3000); const ultima = tela.acharTodos('tbody tr').at(-1).innerText; afirmar(ultima.includes('colete') && ultima.includes('50%'), 'a última linha deveria ser colete com 50%, veio: ' + ultima);` },
            { nome: 'o item novo foi salvo com confiança 0.5', codigo: `const r = await (await fetch('/api/lab/deteccoes')).json(); const novo = r.itens.at(-1); afirmar(r.total === 6 && novo.classe === 'colete' && novo.confianca === 0.5, 'esperava colete com confianca 0.5 na API, veio ' + JSON.stringify(novo));` },
          ],
        },
        {
          t: 'texto',
          md: `### Para ir além, no mesmo editor

- **Erro de validação.** Envie uma confiança de 150 e mostre ao usuário a mensagem que a API devolve em \`detalhes\`.
- **Remoção otimista.** Tire a linha da tela antes da resposta e devolva se o \`DELETE\` falhar.
- **Ordenar.** Clique no cabeçalho "confiança" para alternar a ordem. O que é estado, e o que é derivado?
- **Extrair.** Mova as chamadas para um hook \`useDeteccoes()\` que devolve \`{ deteccoes, remover, adicionar }\`. O componente fica só com a tela.

### De volta ao mundo real

Para levar este painel a um projeto Vite: crie o projeto, cole o componente, configure o proxy de \`/api\` para \`http://localhost:4000\` e mantenha o laboratório rodando. Depois troque o \`useEffect\` por \`useQuery\` e compare o tamanho do código.

### O que você já sabe fazer

- Descrever uma tela como função do estado, com componentes, props e listas.
- Decidir o que é estado, o que é derivado e onde cada estado mora.
- Sincronizar com o mundo de fora por efeitos, sem vazamento e sem corrida.
- Extrair lógica em hooks, organizar estado com redutor e distribuir com contexto.
- Tipar componentes e modelar estados com uniões.
- Consumir uma API, e saber quais bibliotecas assumem esse trabalho num projeto real.

A trilha de **React Native** parte exatamente daqui: os mesmos componentes, hooks e estado, com \`<View>\` e \`<Text>\` no lugar de \`<div>\` e \`<p>\`.`,
        },
        {
          t: 'quiz',
          pergunta: 'No painel, a confiança média mostrada no resumo deveria ser guardada em `useState`?',
          opcoes: [
            'Sim, para não recalcular.',
            'Não: é derivada da lista e do filtro. Calculada na renderização, está sempre certa depois de adicionar, remover ou filtrar.',
            'Sim, e atualizada num `useEffect`.',
            'Só se a lista for grande.',
          ],
          correta: 1,
          explicacao: 'Três operações alteram a lista. Se a média fosse estado, cada uma teria de lembrar de atualizá-la. Derivada, não há o que esquecer.',
        },
        {
          t: 'quiz',
          pergunta: 'Depois de um `POST` bem-sucedido, por que usar o item devolvido pela API em vez do que estava no formulário?',
          opcoes: [
            'Por nenhum motivo: são iguais.',
            'Porque o servidor é a fonte da verdade: ele atribui o `id`, preenche valores padrão e pode normalizar campos. O item do formulário não tem `id` para servir de `key` nem para o `DELETE`.',
            'Porque o formulário já foi limpo.',
            'Porque o `fetch` exige.',
          ],
          correta: 1,
          explicacao: 'A resposta 201 traz o recurso como ficou gravado. Usá-la evita divergência entre a tela e o banco, e dá o identificador para as próximas operações.',
        },
      ],
    },
  ],
};
