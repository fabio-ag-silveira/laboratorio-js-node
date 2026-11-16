/**
 * Módulo 1 da trilha de C#: a linguagem, para quem vem de Python e TypeScript.
 *
 * Todo bloco com `rodar: 'csharp'` é um programa de arquivo único, executado
 * com `dotnet run arquivo.cs` (SDK 10 ou mais novo).
 *
 * O código vai em `String.raw` para que barras invertidas do C# ("\n", "\t")
 * cheguem intactas. Só dois cuidados restam: não escrever cifrão seguido de
 * chave, nem crase, dentro do código.
 */

const cs = String.raw;

export const linguagem = {
  id: 'linguagem',
  titulo: 'A linguagem',
  cor: '#9b7fe8',
  licoes: [
    // ------------------------------------------------------------------
    {
      id: 'primeiro-programa',
      titulo: 'Primeiro programa: compilado, tipado e com SDK',
      minutos: 12,
      resumo: 'O que muda de Python e TypeScript para C#: o compilador confere tudo antes de rodar, e uma ferramenta só (dotnet) cria, compila, testa e publica.',
      blocos: [
        {
          t: 'texto',
          md: `C# é a linguagem; **.NET** é a plataforma que a executa (o runtime, a biblioteca padrão e as ferramentas). A relação é a de TypeScript com Node, com uma diferença grande: aqui os tipos **não somem** depois de compilar. O compilador confere, e o runtime também conhece os tipos.

| | Python | TypeScript | C# |
|---|---|---|---|
| Tipos | opcionais, não conferidos ao rodar | conferidos ao compilar, apagados depois | conferidos ao compilar **e** presentes ao rodar |
| Executa | interpretador | Node (JIT) | runtime do .NET (JIT, ou nativo com AOT) |
| Ferramenta | uv / pip | npm | \`dotnet\` |
| Projeto | \`pyproject.toml\` | \`package.json\` | \`Projeto.csproj\` |
| Pacotes | PyPI | npm | NuGet |
| Paralelismo de CPU | limitado pelo GIL | uma thread | threads de verdade |

O laboratório usa um recurso do .NET 10: **programa de arquivo único**. \`dotnet run arquivo.cs\` compila e executa um arquivo solto, sem projeto. É o jeito de experimentar; sistema de verdade tem um \`.csproj\`, que você vê no fim desta lição.

A primeira execução de cada bloco leva alguns segundos (está compilando). Rodar de novo sem mudar nada é quase instantâneo, porque o resultado fica em cache.`,
        },
        {
          t: 'codigo',
          titulo: 'Olá, usina',
          rodar: 'csharp',
          lang: 'csharp',
          codigo: cs`// Sem classe e sem Main: são "instruções de nível superior".
var usina = "Santa Luzia";          // var: o compilador deduz string. Continua tipado.
int armadilhas = 60;
int capturas = 1376;

double media = capturas / (double)armadilhas;

Console.WriteLine($"Usina {usina}: {armadilhas} armadilhas, {capturas} capturas");
Console.WriteLine($"Média por armadilha: {media:F2}");
Console.WriteLine($"Dividindo inteiro por inteiro: {capturas / armadilhas}");
Console.WriteLine($"Tipo de 'usina': {usina.GetType().Name}; de 'media': {media.GetType().Name}");
Console.WriteLine($".NET {Environment.Version}");`,
        },
        {
          t: 'texto',
          md: `Três coisas para notar na saída:

- \`$"...{expressao}"\` é a f-string do C#. Depois dos dois-pontos vem o formato: \`F2\` são duas casas decimais.
- \`1376 / 60\` deu **22**, sem casas. Inteiro dividido por inteiro é inteiro, como o \`//\` do Python. Para ter a fração, um dos lados precisa ser \`double\`.
- A média saiu com **vírgula** se o seu Windows está em português. O .NET formata números e datas pela cultura da máquina. Num servidor isso é fonte clássica de defeito: a lição seguinte mostra como fixar.

Agora o que mais diferencia C# de Python: o erro abaixo aparece **antes de o programa começar**. Nenhuma linha executa.`,
        },
        {
          t: 'codigo',
          titulo: 'O compilador recusa (o erro é a lição)',
          rodar: 'csharp',
          lang: 'csharp',
          esperaFalha: true,
          codigo: cs`Console.WriteLine("Esta linha nunca aparece: o programa nem chega a existir.");

int contagem = 12;
contagem = "doze";             // erro CS0029: string não vira int

string nome = "Santa Luzia";
Console.WriteLine(nome.Lenght); // erro CS1061: 'Lenght' não existe (é Length)`,
        },
        {
          t: 'texto',
          md: `Os dois erros vieram juntos, com arquivo, linha e coluna, e a primeira linha do programa não imprimiu nada. Em Python, o \`nome.Lenght\` só quebraria quando a execução chegasse ali, talvez em produção, num ramo raro. É a mesma proteção do TypeScript, mas sem a porta dos fundos do \`any\`.

**Funções** em C# são sempre métodos de algum tipo. Num arquivo de nível superior você pode declarar funções locais, que é o mais parecido com \`def\`.`,
        },
        {
          t: 'codigo',
          titulo: 'Funções, parâmetros e tuplas',
          rodar: 'csharp',
          lang: 'csharp',
          codigo: cs`// Corpo de expressão: uma linha, sem chaves nem return.
double Densidade(int insetos, double areaCm2) => insetos / areaCm2;

// Parâmetro opcional e tipo de retorno explícito (sempre obrigatório).
string Classificar(int insetos, int limiar = 30)
{
    if (insetos == 0) return "limpa";
    return insetos > limiar ? "alerta" : "normal";
}

// Tupla nomeada: devolve dois valores sem criar uma classe.
(int Total, int Maior) Resumir(int[] contagens)
{
    int total = 0, maior = 0;
    foreach (var c in contagens)
    {
        total += c;
        if (c > maior) maior = c;
    }
    return (total, maior);
}

Console.WriteLine(Densidade(42, 300.0).ToString("F3"));
Console.WriteLine(Classificar(42));
Console.WriteLine(Classificar(insetos: 42, limiar: 50));   // argumentos nomeados

var resumo = Resumir([12, 40, 7, 31]);
Console.WriteLine($"total={resumo.Total} maior={resumo.Maior}");

var (total, maior) = Resumir([3, 9]);                     // desestruturação
Console.WriteLine($"{total} {maior}");`,
        },
        {
          t: 'comparacao',
          esq: {
            titulo: 'Python',
            lang: 'python',
            codigo: `def classificar(insetos: int, limiar: int = 30) -> str:
    if insetos == 0:
        return "limpa"
    return "alerta" if insetos > limiar else "normal"


def resumir(contagens: list[int]) -> tuple[int, int]:
    return sum(contagens), max(contagens)


total, maior = resumir([12, 40, 7, 31])
print(f"total={total} maior={maior}")`,
          },
          dir: {
            titulo: 'C#',
            lang: 'csharp',
            codigo: cs`string Classificar(int insetos, int limiar = 30)
{
    if (insetos == 0) return "limpa";
    return insetos > limiar ? "alerta" : "normal";
}

(int Total, int Maior) Resumir(int[] contagens)
    => (contagens.Sum(), contagens.Max());


var (total, maior) = Resumir([12, 40, 7, 31]);
Console.WriteLine($"total={total} maior={maior}");`,
          },
        },
        {
          t: 'tabela',
          titulo: 'Convenções que todo código C# segue',
          colunas: ['O quê', 'Como', 'Exemplo'],
          linhas: [
            ['Tipos, métodos, propriedades', 'PascalCase', '`Armadilha`, `ContarInsetos()`, `Nome`'],
            ['Variáveis locais e parâmetros', 'camelCase', '`totalDeCapturas`'],
            ['Campos privados', '`_camelCase`', '`_repositorio`'],
            ['Interfaces', 'começam com `I`', '`IRepositorioDeCapturas`'],
            ['Métodos assíncronos', 'terminam em `Async`', '`SalvarAsync()`'],
            ['Chaves', 'na linha de baixo', 'estilo Allman, o padrão do `dotnet format`'],
          ],
        },
        {
          t: 'texto',
          md: `### E o projeto de verdade?

Fora do laboratório você trabalha com um projeto. Os comandos abaixo são os que você vai digitar todo dia.`,
        },
        {
          t: 'codigo',
          titulo: 'O dia a dia com a ferramenta dotnet (para ler)',
          lang: 'bash',
          codigo: `dotnet new webapi -n Armadilhas.Api      # cria o projeto a partir de um modelo
dotnet new xunit3 -n Armadilhas.Testes   # projeto de testes
dotnet new sln -n Armadilhas             # a "solução" agrupa os projetos
dotnet sln add Armadilhas.Api Armadilhas.Testes

dotnet add Armadilhas.Api package Npgsql.EntityFrameworkCore.PostgreSQL
dotnet add Armadilhas.Testes reference Armadilhas.Api

dotnet build            # compila tudo
dotnet run --project Armadilhas.Api
dotnet watch --project Armadilhas.Api    # recompila ao salvar, como o node --watch
dotnet test             # roda os testes
dotnet format           # formata, como o ruff format

dotnet publish Armadilhas.Api -c Release -o saida/   # o que vai para o contêiner`,
        },
        {
          t: 'codigo',
          titulo: 'Armadilhas.Api.csproj: o package.json do .NET (para ler)',
          lang: 'bash',
          codigo: `<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>               <!-- o compilador avisa sobre null -->
    <ImplicitUsings>enable</ImplicitUsings>   <!-- System, System.Linq etc. já importados -->
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="10.0.0" />
  </ItemGroup>

</Project>`,
        },
        {
          t: 'nota',
          estilo: 'dica',
          md: `**Versões.** Sai uma versão do .NET todo novembro. As pares (8, 10) são LTS, com três anos de suporte; as ímpares têm suporte mais curto. Para sistema novo, use a LTS mais recente: hoje, o .NET 10. Editor: **Visual Studio Code com a extensão C# Dev Kit**, **Rider** (gratuito para uso não comercial) ou o Visual Studio.`,
        },
        {
          t: 'quiz',
          pergunta: 'Em C#, quanto vale `7 / 2`?',
          opcoes: ['3.5', '3', '4', 'Erro de compilação'],
          correta: 1,
          explicacao: 'Os dois operandos são `int`, então a divisão é inteira e trunca. Para 3.5, escreva `7 / 2.0` ou converta um dos lados com `(double)`.',
        },
        {
          t: 'quiz',
          pergunta: 'O que `var x = 10;` significa em C#?',
          opcoes: [
            'Que `x` é dinâmico e pode receber uma string depois.',
            'Que o compilador deduz o tipo `int` na declaração; `x` continua sendo `int` para sempre.',
            'Que `x` é uma constante.',
            'Que `x` pode ser nulo.',
          ],
          correta: 1,
          explicacao: '`var` é só economia de digitação. Diferente do `var`/`let` do JavaScript, o tipo fica fixo: `x = "dez"` não compila.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'tipos-e-nulos',
      titulo: 'Tipos de valor, tipos de referência e o null',
      minutos: 14,
      resumo: 'struct copia, class compartilha. E o compilador passa a acompanhar onde um null pode aparecer.',
      blocos: [
        {
          t: 'texto',
          md: `Em Python tudo é referência a objeto. Em C# existem **duas famílias de tipo**, e a diferença aparece em toda atribuição e em toda chamada de função.

| | Tipo de valor | Tipo de referência |
|---|---|---|
| Declarado com | \`struct\`, \`enum\`, e os numéricos (\`int\`, \`double\`, \`bool\`, \`DateTime\`, \`Guid\`) | \`class\`, \`record\`, \`string\`, arrays, \`List<T>\` |
| Atribuir | **copia** o conteúdo | copia a **referência** (os dois nomes apontam para o mesmo objeto) |
| Pode ser \`null\`? | não, a menos que seja \`T?\` | sim |
| Valor padrão | zero (\`0\`, \`false\`) | \`null\` |`,
        },
        {
          t: 'codigo',
          titulo: 'Copiar ou compartilhar',
          rodar: 'csharp',
          lang: 'csharp',
          codigo: cs`var a = new PontoValor { X = 1, Y = 1 };
var b = a;            // struct: b é uma CÓPIA
b.X = 99;
Console.WriteLine($"struct: a.X={a.X}  b.X={b.X}");

var c = new PontoReferencia { X = 1, Y = 1 };
var d = c;            // class: d aponta para o MESMO objeto
d.X = 99;
Console.WriteLine($"class:  c.X={c.X}  d.X={d.X}");

// O mesmo vale ao passar para uma função.
void Zerar(PontoValor p) { p.X = 0; }          // mexe na cópia
void ZerarRef(PontoReferencia p) { p.X = 0; }  // mexe no original

Zerar(a);
ZerarRef(c);
Console.WriteLine($"depois de zerar: a.X={a.X}  c.X={c.X}");

// Arrays e listas são referência, como em Python.
int[] contagens = [3, 5];
int[] outra = contagens;
outra[0] = 100;
Console.WriteLine($"contagens[0]={contagens[0]}");

struct PontoValor { public int X; public int Y; }
class PontoReferencia { public int X; public int Y; }`,
        },
        {
          t: 'texto',
          md: `### Números: escolha o tipo com intenção

| Tipo | Tamanho | Use para |
|---|---|---|
| \`int\` | 32 bits | contagens, índices: o padrão |
| \`long\` | 64 bits | identificadores de tabela grande, milissegundos |
| \`double\` | 64 bits, binário | medidas, coordenadas, confiança de modelo |
| \`float\` | 32 bits | tensores e interoperação com modelos |
| \`decimal\` | 128 bits, **decimal** | dinheiro e tudo que precisa de casas exatas |
| \`byte\` | 8 bits, sem sinal | pixels, dados binários |

Dois comportamentos pegam quem vem do Python, onde o inteiro não tem limite.`,
        },
        {
          t: 'codigo',
          titulo: 'Estouro de inteiro, double e decimal',
          rodar: 'csharp',
          lang: 'csharp',
          codigo: cs`using System.Globalization;

int maximo = int.MaxValue;
Console.WriteLine($"int.MaxValue      = {maximo}");
Console.WriteLine($"int.MaxValue + 1  = {unchecked(maximo + 1)}");   // dá a volta, em silêncio

try
{
    int estourou = checked(maximo + 1);      // checked: vira exceção
}
catch (OverflowException)
{
    Console.WriteLine("checked: OverflowException");
}

long grande = (long)maximo + 1;              // a saída certa: um tipo maior
Console.WriteLine($"como long         = {grande}");

double d = 0.1 + 0.2;
decimal m = 0.1m + 0.2m;                     // o sufixo m marca um literal decimal
Console.WriteLine($"double:  0.1 + 0.2 == 0.3 ? {d == 0.3}");
Console.WriteLine($"decimal: 0.1 + 0.2 == 0.3 ? {m == 0.3m}");

// Texto -> número. A cultura decide o que é vírgula e o que é ponto.
var brasil = CultureInfo.GetCultureInfo("pt-BR");
var neutra = CultureInfo.InvariantCulture;
Console.WriteLine($"\"1.234\" lido em pt-BR:    {double.Parse("1.234", brasil)}");
Console.WriteLine($"\"1.234\" lido sem cultura: {double.Parse("1.234", neutra).ToString(neutra)}");

// Entrada de fora: TryParse em vez de exceção.
if (!int.TryParse("doze", out var numero))
    Console.WriteLine($"\"doze\" não é número; numero ficou {numero}");`,
        },
        {
          t: 'nota',
          estilo: 'pegadinha',
          md: `**A cultura da máquina entra em toda conversão.** \`"1.234"\` vira mil duzentos e trinta e quatro em português e um vírgula dois três quatro em inglês. O mesmo código se comporta diferente no seu Windows e num contêiner Linux. Regra: ao ler ou gravar dado de máquina (arquivo, API, banco), passe \`CultureInfo.InvariantCulture\`; só use a cultura do usuário para **exibir**. JSON já sai certo: o serializador do .NET sempre usa ponto.`,
        },
        {
          t: 'texto',
          md: `### O null sob controle

\`null\` é o \`None\` do Python. O problema clássico é o mesmo: usar algo que está vazio e receber uma exceção (\`NullReferenceException\`, o \`AttributeError: 'NoneType'\` de lá).

Com \`<Nullable>enable</Nullable>\`, padrão em todo projeto novo, o tipo passa a dizer se aceita nulo:

- \`string\` → **nunca** deveria ser nulo;
- \`string?\` → pode ser nulo, e o compilador avisa se você usar sem conferir.

É o \`str | None\` do Python conferido pelo pyright, ou o \`strictNullChecks\` do TypeScript. Os operadores também são os do TypeScript.`,
        },
        {
          t: 'codigo',
          titulo: 'Os operadores de nulo',
          rodar: 'csharp',
          lang: 'csharp',
          codigo: cs`string? observacao = null;        // pode ser nulo
int? temperatura = null;          // int? = Nullable<int>: um int que pode faltar

// ?.  só acessa se não for nulo; senão a expressão inteira vale null
Console.WriteLine($"tamanho: {observacao?.Length.ToString() ?? "sem observação"}");

// ??  valor padrão quando é nulo
string texto = observacao ?? "(vazio)";
Console.WriteLine(texto);

// ??= atribui só se estiver nulo
observacao ??= "armadilha molhada";
Console.WriteLine(observacao);

// int? tem HasValue e Value; ou use ?? para sair do "talvez"
Console.WriteLine($"temperatura informada? {temperatura.HasValue}");
int graus = temperatura ?? 25;
Console.WriteLine($"graus = {graus}");

// "is not null" estreita o tipo: dentro do if, o compilador sabe que não é nulo
string? tecnico = BuscarTecnico(3);
if (tecnico is not null)
    Console.WriteLine($"técnico: {tecnico.ToUpper()}");

string? ausente = BuscarTecnico(99);
Console.WriteLine($"ausente é nulo? {ausente is null}");

string? BuscarTecnico(int id) => id == 3 ? "Marina" : null;`,
        },
        {
          t: 'codigo',
          titulo: 'O que o aviso evita (a exceção é a lição)',
          rodar: 'csharp',
          lang: 'csharp',
          esperaFalha: true,
          codigo: cs`string? BuscarTecnico(int id) => id == 3 ? "Marina" : null;

string? tecnico = BuscarTecnico(99);

// O compilador avisa aqui (CS8602: possível desreferência de nulo).
// Aviso não impede de rodar, e o programa quebra em execução:
Console.WriteLine(tecnico.ToUpper());`,
        },
        {
          t: 'texto',
          md: `O programa compilou com um **aviso** e morreu com \`NullReferenceException\`. É por isso que projeto sério liga \`<TreatWarningsAsErrors>true</TreatWarningsAsErrors>\`: o aviso vira erro, e esse código não chega a rodar.

Um limite honesto: a anotação é conferida só na compilação. Dado que vem de fora (JSON, banco, biblioteca antiga) pode chegar nulo num campo declarado \`string\`. Valide na borda, como você faz com Pydantic.`,
        },
        {
          t: 'quiz',
          pergunta: 'Depois de `var b = a; b.X = 99;`, quando `a.X` também vira 99?',
          opcoes: [
            'Sempre.',
            'Nunca.',
            'Quando o tipo de `a` é uma `class` (ou outro tipo de referência). Se for `struct`, `b` é uma cópia.',
            'Só se `a` foi declarado com `var`.',
          ],
          correta: 2,
          explicacao: 'Atribuir um tipo de referência copia o ponteiro; atribuir um tipo de valor copia o conteúdo.',
        },
        {
          t: 'quiz',
          pergunta: 'Qual tipo usar para guardar o valor em reais de um serviço prestado?',
          opcoes: ['`double`', '`float`', '`decimal`', '`int`'],
          correta: 2,
          explicacao: '`decimal` representa casas decimais de forma exata. `double` é binário: 0.1 + 0.2 não dá 0.3, e centavos somem em somas longas. No PostgreSQL o par dele é `numeric`.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'classes-e-records',
      titulo: 'Classes, records, interfaces e casamento de padrões',
      minutos: 16,
      resumo: 'Como modelar o domínio: class para o que tem identidade e muda, record para dado imutável, interface para contrato.',
      blocos: [
        {
          t: 'texto',
          md: `Uma classe C# tem **propriedades** no lugar de atributos soltos. A propriedade parece um campo para quem usa, mas é um par de métodos (\`get\` e \`set\`) que você pode restringir.

| Declaração | Quem pode atribuir |
|---|---|
| \`public string Nome { get; set; }\` | qualquer um, a qualquer hora |
| \`public string Nome { get; init; }\` | só na criação do objeto |
| \`public string Nome { get; private set; }\` | só a própria classe |
| \`public string Nome { get; }\` | só o construtor |
| \`public required string Nome { get; init; }\` | **obrigatório** informar ao criar |`,
        },
        {
          t: 'codigo',
          titulo: 'Uma classe com regras',
          rodar: 'csharp',
          lang: 'csharp',
          codigo: cs`var armadilha = new Armadilha { Codigo = "SL-014", Talhao = "T3" };
Console.WriteLine(armadilha);

armadilha.RegistrarCaptura(12);
armadilha.RegistrarCaptura(40);
Console.WriteLine(armadilha);
Console.WriteLine($"em alerta? {armadilha.EmAlerta}");

try
{
    armadilha.RegistrarCaptura(-3);
}
catch (ArgumentOutOfRangeException e)
{
    Console.WriteLine($"recusou: {e.ParamName}");
}

// armadilha.Total = 0;        // não compila: o set é privado
// armadilha.Codigo = "X";     // não compila: init só vale na criação
// new Armadilha();            // não compila: Codigo e Talhao são required

class Armadilha
{
    public required string Codigo { get; init; }
    public required string Talhao { get; init; }

    public int Total { get; private set; }             // só a classe altera
    public int Capturas { get; private set; }

    public bool EmAlerta => UltimaContagem > 30;       // propriedade calculada
    public int UltimaContagem { get; private set; }

    public void RegistrarCaptura(int insetos)
    {
        ArgumentOutOfRangeException.ThrowIfNegative(insetos);
        UltimaContagem = insetos;
        Total += insetos;
        Capturas++;
    }

    // o __str__ do Python
    public override string ToString() => $"{Codigo} ({Talhao}): {Capturas} capturas, {Total} insetos";
}`,
        },
        {
          t: 'texto',
          md: `### record: dado imutável com igualdade por valor

Boa parte do que trafega num sistema é só dado: o corpo de uma requisição, uma linha de resultado, uma detecção. Para isso existe o \`record\`: uma linha declara o tipo inteiro, com construtor, \`ToString\`, igualdade **pelo conteúdo** e cópia com alteração. É a \`@dataclass(frozen=True)\` do Python.`,
        },
        {
          t: 'codigo',
          titulo: 'record, with e igualdade',
          rodar: 'csharp',
          lang: 'csharp',
          codigo: cs`var a = new Deteccao("mosca-branca", 0.91, new Caixa(10, 20, 34, 40));
var b = new Deteccao("mosca-branca", 0.91, new Caixa(10, 20, 34, 40));

Console.WriteLine(a);                                  // ToString pronto
Console.WriteLine($"a == b ?            {a == b}");    // compara o conteúdo
Console.WriteLine($"mesmo objeto?       {ReferenceEquals(a, b)}");

// "with" copia trocando alguns campos; o original não muda
var revisada = a with { Classe = "tripes", Confianca = 0.55 };
Console.WriteLine(revisada);
Console.WriteLine($"original intacto:   {a.Classe}");

// desestruturação posicional
var (classe, confianca, caixa) = a;
Console.WriteLine($"{classe} {confianca} largura={caixa.Largura}");

// a.Confianca = 0.5;   // não compila: propriedades de record posicional são init

// Com class, a comparação seria por referência:
var c1 = new CaixaClasse { X1 = 1 };
var c2 = new CaixaClasse { X1 = 1 };
Console.WriteLine($"classes iguais?     {c1 == c2}");

record Caixa(int X1, int Y1, int X2, int Y2)
{
    public int Largura => X2 - X1;          // record também aceita membros
    public int Area => (X2 - X1) * (Y2 - Y1);
}

record Deteccao(string Classe, double Confianca, Caixa Caixa);

class CaixaClasse { public int X1 { get; set; } }`,
        },
        {
          t: 'tabela',
          titulo: 'Qual tipo declarar',
          colunas: ['Use', 'Quando', 'Exemplo'],
          linhas: [
            ['`record`', 'dado imutável: entrada e saída de API, resultado, mensagem', '`record NovaCaptura(int ArmadilhaId, DateTime Em)`'],
            ['`class`', 'tem identidade e muda com o tempo; entidade do banco; serviço', '`class Armadilha`, `class ServicoDeCapturas`'],
            ['`record struct`', 'valor pequeno criado aos milhões', '`readonly record struct Ponto(float X, float Y)`'],
            ['`enum`', 'conjunto fechado de opções', '`enum Situacao { Pendente, Processada, Falhou }`'],
            ['`interface`', 'contrato com mais de uma implementação (ou uma falsa, para teste)', '`interface IClienteDeInferencia`'],
          ],
        },
        {
          t: 'texto',
          md: `### Interface: o contrato

Em Python, basta o objeto **ter** o método (o "duck typing", ou um \`Protocol\`). Em C#, a classe precisa **declarar** que implementa a interface, e o compilador confere se cumpriu. É por interfaces que a injeção de dependência e os testes do módulo seguinte funcionam.`,
        },
        {
          t: 'codigo',
          titulo: 'Interface, enum e switch que casa padrões',
          rodar: 'csharp',
          lang: 'csharp',
          codigo: cs`IContador[] contadores = [new ContadorClassico(), new ContadorPorModelo(0.5)];

foreach (var contador in contadores)
    Console.WriteLine($"{contador.Nome,-18} -> {contador.Contar("armadilha-014.jpg")} insetos");

// switch como EXPRESSÃO: cada braço devolve um valor
string Descrever(Situacao s) => s switch
{
    Situacao.Pendente => "aguardando inferência",
    Situacao.Processada => "contagem disponível",
    Situacao.Falhou => "precisa de nova foto",
    _ => throw new ArgumentOutOfRangeException(nameof(s)),
};
Console.WriteLine(Descrever(Situacao.Processada));

// Casando por FORMA: tipo, propriedades, faixas e condições
string Avaliar(object resultado) => resultado switch
{
    null => "sem resultado",
    Contagem { Insetos: 0 } => "armadilha limpa",
    Contagem { Insetos: > 30, Confianca: >= 0.8 } => "ALERTA confiável",
    Contagem { Insetos: > 30 } => "alerta a conferir",
    Contagem c => $"normal ({c.Insetos})",
    Falha { Tentativas: var n } when n >= 3 => "desistir",
    Falha f => $"tentar de novo: {f.Motivo}",
    _ => "tipo desconhecido",
};

object?[] casos = [new Contagem(0, 0.9), new Contagem(42, 0.93), new Contagem(42, 0.4),
                   new Contagem(7, 0.7), new Falha("foto escura", 1), new Falha("tempo esgotado", 3), null];
foreach (var caso in casos)
    Console.WriteLine($"{caso?.ToString() ?? "null",-52} => {Avaliar(caso!)}");

interface IContador
{
    string Nome { get; }
    int Contar(string caminhoDaFoto);
}

class ContadorClassico : IContador
{
    public string Nome => "limiar + contornos";
    public int Contar(string caminhoDaFoto) => 31;
}

class ContadorPorModelo(double confiancaMinima) : IContador   // construtor primário
{
    public string Nome => $"detector (conf {confiancaMinima})";
    public int Contar(string caminhoDaFoto) => 38;
}

enum Situacao { Pendente, Processada, Falhou }
record Contagem(int Insetos, double Confianca);
record Falha(string Motivo, int Tentativas);`,
        },
        {
          t: 'nota',
          estilo: 'dica',
          md: `**Herança existe, e usa-se pouco.** \`class B : A\` herda de uma classe só. O código C# atual prefere **composição e interfaces**: uma classe recebe as dependências pelo construtor em vez de herdar comportamento. Herança aparece em hierarquia de exceções e quando um framework pede (\`DbContext\`, \`BackgroundService\`). Marque como \`sealed\` a classe que não foi feita para ser estendida.`,
        },
        {
          t: 'quiz',
          pergunta: 'Dois objetos criados com os mesmos valores. Em qual caso `a == b` é verdadeiro?',
          opcoes: [
            'Em `class` e em `record`.',
            'Só em `record`: ele compara o conteúdo. Em `class`, `==` compara a referência.',
            'Só em `class`.',
            'Em nenhum dos dois.',
          ],
          correta: 1,
          explicacao: 'O compilador gera a igualdade por valor para o `record`. Uma `class` só compara conteúdo se você sobrescrever `Equals` e o operador.',
        },
        {
          t: 'quiz',
          pergunta: 'O que `public required string Codigo { get; init; }` garante?',
          opcoes: [
            'Que `Codigo` pode ser alterado a qualquer momento.',
            'Que quem cria o objeto é obrigado a informar `Codigo`, e que depois disso o valor não muda.',
            'Que `Codigo` nunca é nulo em tempo de execução, mesmo vindo de JSON.',
            'Que `Codigo` é privado.',
          ],
          correta: 1,
          explicacao: '`required` obriga a preencher no inicializador (erro de compilação se faltar) e `init` só permite atribuir na criação.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'colecoes-e-linq',
      titulo: 'Coleções e LINQ',
      minutos: 16,
      resumo: 'List, Dictionary e a ferramenta que substitui compreensões de lista, map/filter e boa parte dos laços.',
      blocos: [
        {
          t: 'tabela',
          titulo: 'As coleções do dia a dia',
          colunas: ['Python', 'TypeScript', 'C#', 'Observação'],
          linhas: [
            ['`list`', '`Array`', '`List<T>`', 'cresce; `.Add`, `.Count`'],
            ['—', '—', '`T[]`', 'array de tamanho fixo; `.Length`'],
            ['`dict`', '`Map` / objeto', '`Dictionary<K, V>`', 'chave ausente em `d[k]` lança exceção'],
            ['`set`', '`Set`', '`HashSet<T>`', ''],
            ['`tuple`', 'tupla', '`(int, string)`', 'ou um `record`'],
            ['iterável / gerador', 'iterável', '`IEnumerable<T>`', 'a base do LINQ'],
          ],
        },
        {
          t: 'codigo',
          titulo: 'List e Dictionary',
          rodar: 'csharp',
          lang: 'csharp',
          codigo: cs`List<int> contagens = [12, 40, 7];          // expressão de coleção
contagens.Add(31);
contagens.AddRange([5, 0]);
Console.WriteLine($"{contagens.Count} itens; primeiro={contagens[0]}; último={contagens[^1]}");
Console.WriteLine($"fatia [1..3]: {string.Join(", ", contagens[1..3])}");

int[] extras = [99, 98];
int[] tudo = [.. contagens, .. extras, 1];  // ".." espalha, como o * do Python
Console.WriteLine(string.Join(" ", tudo));

var porTalhao = new Dictionary<string, int>
{
    ["T1"] = 52,
    ["T2"] = 18,
};
porTalhao["T3"] = 71;

// Chave ausente: TryGetValue em vez de exceção (o .get() do Python)
if (porTalhao.TryGetValue("T9", out var total))
    Console.WriteLine(total);
else
    Console.WriteLine("T9 não existe");

Console.WriteLine($"T9 com padrão: {porTalhao.GetValueOrDefault("T9", -1)}");

foreach (var (talhao, insetos) in porTalhao)
    Console.WriteLine($"{talhao}: {insetos}");

try
{
    Console.WriteLine(porTalhao["T9"]);
}
catch (KeyNotFoundException)
{
    Console.WriteLine("porTalhao[\"T9\"] lança KeyNotFoundException");
}`,
        },
        {
          t: 'texto',
          md: `### LINQ

LINQ é um conjunto de métodos que funciona sobre **qualquer** sequência: lista, array, dicionário, e (no módulo seguinte) tabela do banco. Cada método recebe uma função curta, escrita como **lambda**: \`x => x * 2\` é o \`lambda x: x * 2\` do Python.

| Python | JavaScript | LINQ |
|---|---|---|
| \`[f(x) for x in xs]\` | \`.map\` | \`.Select\` |
| \`[x for x in xs if c(x)]\` | \`.filter\` | \`.Where\` |
| \`sorted(xs, key=...)\` | \`.toSorted\` | \`.OrderBy\`, \`.OrderByDescending\`, \`.ThenBy\` |
| \`sum\`, \`max\`, \`len\` | \`.reduce\` | \`.Sum\`, \`.Max\`, \`.Count\`, \`.Average\` |
| \`any\`, \`all\` | \`.some\`, \`.every\` | \`.Any\`, \`.All\` |
| \`next(x for ...)\` | \`.find\` | \`.First\`, \`.FirstOrDefault\`, \`.Single\` |
| \`itertools.groupby\` | \`Object.groupBy\` | \`.GroupBy\` |
| \`xs[:n]\` | \`.slice\` | \`.Take\`, \`.Skip\` |

O bloco abaixo trabalha com capturas em memória. Guarde os nomes: na lição de Entity Framework, as **mesmas** chamadas viram SQL.`,
        },
        {
          t: 'codigo',
          titulo: 'Consultas sobre capturas',
          rodar: 'csharp',
          lang: 'csharp',
          codigo: cs`Captura[] capturas =
[
    new("SL-001", "T1", "Marina", 12),
    new("SL-002", "T1", "Marina", 40),
    new("SL-003", "T2", "Caio",    7),
    new("SL-004", "T2", "Caio",   31),
    new("SL-005", "T3", "Marina", 55),
    new("SL-006", "T3", "Rute",    0),
    new("SL-007", "T3", "Rute",   38),
];

// filtrar, ordenar, projetar
var emAlerta = capturas
    .Where(c => c.Insetos > 30)
    .OrderByDescending(c => c.Insetos)
    .Select(c => $"{c.Armadilha}={c.Insetos}");
Console.WriteLine("alerta:  " + string.Join("  ", emAlerta));

// agregações
Console.WriteLine($"total:   {capturas.Sum(c => c.Insetos)}");
Console.WriteLine($"média:   {capturas.Average(c => c.Insetos):F1}");
Console.WriteLine($"alguma limpa? {capturas.Any(c => c.Insetos == 0)}   todas abaixo de 60? {capturas.All(c => c.Insetos < 60)}");

// agrupar: o GROUP BY
var porTalhao = capturas
    .GroupBy(c => c.Talhao)
    .Select(g => new { Talhao = g.Key, Total = g.Sum(c => c.Insetos), Pior = g.MaxBy(c => c.Insetos)!.Armadilha })
    .OrderByDescending(x => x.Total);

foreach (var linha in porTalhao)
    Console.WriteLine($"{linha.Talhao}: total={linha.Total,3}  pior={linha.Pior}");

// um item só
var primeira = capturas.First(c => c.Tecnico == "Caio");
var nenhuma = capturas.FirstOrDefault(c => c.Tecnico == "Zeca");
Console.WriteLine($"primeira do Caio: {primeira.Armadilha};  do Zeca: {nenhuma?.Armadilha ?? "nenhuma"}");

// dicionário e conjunto a partir da sequência
Dictionary<string, int> totalPorTecnico = capturas
    .GroupBy(c => c.Tecnico)
    .ToDictionary(g => g.Key, g => g.Sum(c => c.Insetos));
Console.WriteLine(string.Join(", ", totalPorTecnico.Select(p => $"{p.Key}={p.Value}")));

record Captura(string Armadilha, string Talhao, string Tecnico, int Insetos);`,
        },
        {
          t: 'nota',
          estilo: 'info',
          md: `\`new { Talhao = ..., Total = ... }\` cria um **tipo anônimo**: um objeto com propriedades, sem declarar classe. Serve para resultado intermediário dentro de um método. Se o valor sai do método, declare um \`record\`.`,
        },
        {
          t: 'texto',
          md: `### A consulta só roda quando alguém pede o resultado

\`Where\` e \`Select\` não percorrem nada. Eles montam uma **receita**. O trabalho acontece quando você itera (\`foreach\`) ou materializa (\`ToList\`, \`Count\`, \`First\`). É o comportamento de um gerador em Python, com uma diferença: a receita pode ser percorrida várias vezes, e **refaz o trabalho a cada vez**.`,
        },
        {
          t: 'codigo',
          titulo: 'Execução adiada',
          rodar: 'csharp',
          lang: 'csharp',
          codigo: cs`int avaliacoes = 0;
List<int> contagens = [12, 40, 7, 31];

var altas = contagens.Where(c =>
{
    avaliacoes++;                   // conta quantas vezes o filtro roda
    return c > 30;
});

Console.WriteLine($"depois do Where:      avaliações = {avaliacoes}");

Console.WriteLine($"Count() = {altas.Count()}   avaliações = {avaliacoes}");
Console.WriteLine($"Count() = {altas.Count()}   avaliações = {avaliacoes}   (refez tudo)");

contagens.Add(99);                  // a receita enxerga a lista atual
Console.WriteLine($"após Add(99): {string.Join(", ", altas)}");

// ToList executa uma vez e guarda o resultado
avaliacoes = 0;
var fixas = contagens.Where(c => { avaliacoes++; return c > 30; }).ToList();
_ = fixas.Count;
_ = fixas.Count;
contagens.Add(100);
Console.WriteLine($"com ToList: {string.Join(", ", fixas)}   avaliações = {avaliacoes}");`,
        },
        {
          t: 'nota',
          estilo: 'pegadinha',
          md: `**Enumerar duas vezes custa duas vezes.** Em memória é só desperdício. Quando a sequência vem do banco, cada enumeração é **uma consulta SQL**. Se vai usar o resultado mais de uma vez, termine com \`.ToList()\` (ou \`.ToListAsync()\`).`,
        },
        {
          t: 'quiz',
          pergunta: 'Quando o filtro de `var q = lista.Where(x => x > 10);` é executado?',
          opcoes: [
            'Na própria linha do `Where`.',
            'Quando `q` é percorrida ou materializada (`foreach`, `ToList`, `Count`...), e de novo a cada vez.',
            'Uma única vez, na primeira leitura; depois fica em cache.',
            'Nunca, a menos que se chame `.Execute()`.',
          ],
          correta: 1,
          explicacao: 'LINQ é adiado. Sem `ToList`, cada enumeração refaz a consulta, e também enxerga mudanças feitas na coleção de origem.',
        },
        {
          t: 'quiz',
          pergunta: 'Qual é a diferença entre `First(...)` e `FirstOrDefault(...)`?',
          opcoes: [
            'Nenhuma.',
            '`First` lança exceção se nada casar; `FirstOrDefault` devolve o valor padrão (`null` para classes).',
            '`FirstOrDefault` é mais rápido.',
            '`First` só funciona em listas ordenadas.',
          ],
          correta: 1,
          explicacao: 'Use `First` quando a ausência é um defeito, e `FirstOrDefault` quando "não achei" é um resultado válido que você vai tratar.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'erros-genericos-e-recursos',
      titulo: 'Exceções, genéricos e liberação de recursos',
      minutos: 14,
      resumo: 'try/catch como no Python, <T> como no TypeScript, e using no lugar do with.',
      blocos: [
        {
          t: 'texto',
          md: `Exceções funcionam como em Python: \`try\` / \`catch\` / \`finally\`, com hierarquia de classes. O que muda são os nomes e dois detalhes que rendem defeito.

| Python | C# |
|---|---|
| \`raise ValueError("...")\` | \`throw new ArgumentException("...")\` |
| \`except KeyError as e:\` | \`catch (KeyNotFoundException e)\` |
| \`except Exception:\` | \`catch (Exception)\` |
| \`raise\` (relançar) | \`throw;\` |
| \`raise Nova(...) from e\` | \`throw new Nova("...", e)\` |
| \`finally:\` | \`finally { }\` |`,
        },
        {
          t: 'codigo',
          titulo: 'Lançar, capturar, filtrar e relançar',
          rodar: 'csharp',
          lang: 'csharp',
          codigo: cs`int Contar(string foto)
{
    if (string.IsNullOrWhiteSpace(foto))
        throw new ArgumentException("informe o caminho da foto", nameof(foto));
    if (foto.EndsWith(".txt"))
        throw new FotoInvalidaException(foto, "não é imagem");
    if (foto.Contains("escura"))
        throw new FotoInvalidaException(foto, "nitidez abaixo do mínimo") { PodeRepetir = true };
    return 42;
}

string[] fotos = ["a14.jpg", "", "notas.txt", "a15-escura.jpg"];

foreach (var foto in fotos)
{
    try
    {
        Console.WriteLine($"{foto}: {Contar(foto)} insetos");
    }
    catch (FotoInvalidaException e) when (e.PodeRepetir)      // filtro: só captura se a condição valer
    {
        Console.WriteLine($"pedir nova foto -> {e.Message}");
    }
    catch (FotoInvalidaException e)
    {
        Console.WriteLine($"descartar -> {e.Message}");
    }
    catch (ArgumentException e)
    {
        Console.WriteLine($"argumento inválido ({e.ParamName})");
    }
    finally
    {
        // roda sempre, com erro ou sem
    }
}

// Embrulhar preservando a causa: o "raise ... from e"
try
{
    try
    {
        int.Parse("doze");
    }
    catch (FormatException e)
    {
        throw new InvalidOperationException("planilha de contagens corrompida", e);
    }
}
catch (InvalidOperationException e)
{
    Console.WriteLine($"{e.Message}  <- causa: {e.InnerException!.GetType().Name}");
}

class FotoInvalidaException(string foto, string motivo) : Exception($"{foto}: {motivo}")
{
    public bool PodeRepetir { get; init; }
}`,
        },
        {
          t: 'nota',
          estilo: 'pegadinha',
          md: `**\`throw;\` e \`throw e;\` não são a mesma coisa.** Dentro de um \`catch\`, \`throw;\` relança preservando a pilha de chamadas original. \`throw e;\` reinicia a pilha naquele ponto, e você perde a linha onde o erro nasceu. E nunca escreva \`catch (Exception) { }\` vazio: o erro some e o defeito aparece longe dali.`,
        },
        {
          t: 'texto',
          md: `### using: liberar o que não é memória

Memória o coletor de lixo devolve. Arquivo aberto, conexão com o banco e requisição HTTP precisam ser fechados **na hora**. O \`with\` do Python é o \`using\` do C#, e o protocolo \`__enter__\`/\`__exit__\` é a interface \`IDisposable\`, com um método: \`Dispose\`.`,
        },
        {
          t: 'codigo',
          titulo: 'using e IDisposable',
          rodar: 'csharp',
          lang: 'csharp',
          codigo: cs`void Processar()
{
    using var conexao = new Conexao("banco");       // fecha ao sair do método
    using var arquivo = new Conexao("arquivo");
    Console.WriteLine("  trabalhando...");
    throw new InvalidOperationException("falhou no meio");
}

try
{
    Processar();
}
catch (InvalidOperationException e)
{
    Console.WriteLine($"capturado: {e.Message}");
}

// Forma com bloco, quando o recurso deve durar menos que o método
using (var curta = new Conexao("temporária"))
{
    Console.WriteLine("  dentro do bloco");
}
Console.WriteLine("depois do bloco");

class Conexao : IDisposable
{
    private readonly string _nome;

    public Conexao(string nome)
    {
        _nome = nome;
        Console.WriteLine($"  abriu {_nome}");
    }

    public void Dispose() => Console.WriteLine($"  fechou {_nome}");
}`,
        },
        {
          t: 'texto',
          md: `Mesmo com a exceção, as duas conexões foram fechadas, na **ordem inversa** da abertura. É o mesmo comportamento de \`with\` aninhados.

### Genéricos

\`List<int>\` e \`Dictionary<string, int>\` são tipos **genéricos**: o \`<T>\` é um parâmetro de tipo, como em TypeScript. A diferença é que aqui o tipo existe em execução: \`List<int>\` guarda inteiros de verdade, sem empacotar cada um num objeto.`,
        },
        {
          t: 'codigo',
          titulo: 'Um tipo genérico: o resultado que pode falhar',
          rodar: 'csharp',
          lang: 'csharp',
          codigo: cs`// Método genérico com restrição: T precisa saber se comparar
T Maior<T>(IEnumerable<T> itens) where T : IComparable<T>
{
    var melhor = itens.First();
    foreach (var item in itens)
        if (item.CompareTo(melhor) > 0) melhor = item;
    return melhor;
}

Console.WriteLine(Maior([12, 40, 7]));
Console.WriteLine(Maior(["T1", "T3", "T2"]));
Console.WriteLine(Maior([0.4, 0.91]));

// Falha esperada não precisa ser exceção: devolva um resultado
Resultado<int> Contar(string foto) => foto.Contains("escura")
    ? Resultado<int>.Falha("nitidez abaixo do mínimo")
    : Resultado<int>.Ok(42);

foreach (var foto in new[] { "a14.jpg", "a15-escura.jpg" })
{
    var r = Contar(foto);
    Console.WriteLine(r.Sucesso ? $"{foto}: {r.Valor} insetos" : $"{foto}: {r.Erro}");
}

// Método de extensão: acrescenta um método a um tipo que não é seu
Console.WriteLine(new[] { 12, 40, 7, 31 }.Mediana());

record Resultado<T>(bool Sucesso, T? Valor, string? Erro)
{
    public static Resultado<T> Ok(T valor) => new(true, valor, null);
    public static Resultado<T> Falha(string erro) => new(false, default, erro);
}

static class ExtensoesDeEstatistica
{
    public static double Mediana(this IEnumerable<int> valores)
    {
        var ordenados = valores.Order().ToArray();
        int meio = ordenados.Length / 2;
        return ordenados.Length % 2 == 1 ? ordenados[meio] : (ordenados[meio - 1] + ordenados[meio]) / 2.0;
    }
}`,
        },
        {
          t: 'nota',
          estilo: 'info',
          md: `**Exceção ou resultado?** Use exceção para o que não deveria acontecer (defeito, banco fora do ar). Use um valor de retorno para o que faz parte do negócio (foto recusada, armadilha não encontrada). Exceção em C# é cara: lançar e capturar custa ordens de grandeza mais que devolver um valor, então não serve para controlar fluxo comum. Os métodos de extensão são o mecanismo por trás do LINQ: \`Where\` e \`Select\` são extensões de \`IEnumerable<T>\`.`,
        },
        {
          t: 'quiz',
          pergunta: 'O que `using var conexao = new Conexao();` garante?',
          opcoes: [
            'Que a conexão é criada só quando usada.',
            'Que `conexao.Dispose()` é chamado ao sair do escopo, mesmo se uma exceção for lançada.',
            'Que a variável não pode ser nula.',
            'Que o coletor de lixo roda imediatamente.',
          ],
          correta: 1,
          explicacao: 'É o `with` do Python. O compilador transforma em `try/finally` com a chamada a `Dispose` no `finally`.',
        },
        {
          t: 'quiz',
          pergunta: 'Dentro de um `catch (Exception e)`, como relançar sem perder a pilha de chamadas original?',
          opcoes: ['`throw e;`', '`throw;`', '`throw new Exception(e.Message);`', '`return e;`'],
          correta: 1,
          explicacao: '`throw;` preserva a pilha. `throw e;` a reinicia, e `new Exception(e.Message)` joga fora o tipo e a pilha (a menos que você passe `e` como causa).',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'async-await',
      titulo: 'async e await: Task no lugar de corrotina',
      minutos: 16,
      resumo: 'A mesma escrita do asyncio e das Promises, com threads de verdade por baixo. Concorrência, cancelamento e os erros clássicos.',
      blocos: [
        {
          t: 'texto',
          md: `Uma API passa quase o tempo todo **esperando**: o banco responder, o serviço de inferência devolver, o disco gravar. \`async\`/\`await\` existe para não deixar uma thread parada durante a espera.

| | Python (asyncio) | JavaScript | C# |
|---|---|---|---|
| O "valor futuro" | corrotina / \`Task\` | \`Promise\` | \`Task<T>\` |
| Quando começa a rodar | só ao dar \`await\` ou criar \`Task\` | ao chamar | **ao chamar** |
| Esperar vários | \`asyncio.gather\` | \`Promise.all\` | \`Task.WhenAll\` |
| Quem executa | um laço, uma thread | um laço, uma thread | um **conjunto de threads** |
| Trabalho de CPU em paralelo | não (GIL) | não | **sim** |

A terceira linha é a que mais confunde quem vem do Python: chamar um método \`async\` já **inicia** o trabalho. O \`await\` só espera o fim.`,
        },
        {
          t: 'codigo',
          titulo: 'Em série e ao mesmo tempo',
          rodar: 'csharp',
          lang: 'csharp',
          codigo: cs`using System.Diagnostics;

async Task<int> ContarAsync(string foto)
{
    await Task.Delay(300);              // finge uma chamada de 300 ms ao serviço de inferência
    return foto.Length;
}

string[] fotos = ["a01.jpg", "a02.jpg", "a03.jpg", "a04.jpg"];

// Em série: cada await espera terminar antes de começar a próxima
var relogio = Stopwatch.StartNew();
int total = 0;
foreach (var foto in fotos)
    total += await ContarAsync(foto);
Console.WriteLine($"em série:        total={total}  ~{Arredondar(relogio)} ms");

// Ao mesmo tempo: dispara todas, depois espera todas
relogio.Restart();
Task<int>[] tarefas = fotos.Select(ContarAsync).ToArray();   // já estão rodando
int[] resultados = await Task.WhenAll(tarefas);
Console.WriteLine($"ao mesmo tempo:  total={resultados.Sum()}  ~{Arredondar(relogio)} ms");

// A tarefa começa na chamada, não no await
relogio.Restart();
Task<int> adiantada = ContarAsync("b01.jpg");   // começou a contar os 300 ms
await Task.Delay(300);                           // faço outra coisa enquanto isso
int valor = await adiantada;                     // já está pronta
Console.WriteLine($"adiantada:       valor={valor}  ~{Arredondar(relogio)} ms (e não 600)");

static long Arredondar(Stopwatch r) => r.ElapsedMilliseconds / 100 * 100;`,
        },
        {
          t: 'texto',
          md: `Quatro esperas de 300 ms levaram por volta de 1200 ms em série e 300 ms juntas. Nenhuma thread ficou bloqueada: \`Task.Delay\`, como uma consulta ao banco, devolve a thread enquanto espera.

### Limitar a concorrência e cancelar

Disparar tudo de uma vez derruba o serviço do outro lado. E toda operação que espera precisa poder ser **cancelada**: o cliente desistiu, o tempo acabou, a aplicação está desligando. Em .NET isso é o \`CancellationToken\`, que você repassa a cada chamada.`,
        },
        {
          t: 'codigo',
          titulo: 'No máximo N por vez, com tempo limite',
          rodar: 'csharp',
          lang: 'csharp',
          codigo: cs`int emAndamento = 0, pico = 0;

async Task<int> ContarAsync(int foto, CancellationToken ct)
{
    int agora = Interlocked.Increment(ref emAndamento);
    InterlockedMax(ref pico, agora);
    try
    {
        await Task.Delay(100 + foto * 10, ct);     // o token chega até a espera
        return foto * 2;
    }
    finally
    {
        Interlocked.Decrement(ref emAndamento);
    }
}

// 1) Limite de concorrência com Parallel.ForEachAsync
var resultados = new System.Collections.Concurrent.ConcurrentBag<int>();
await Parallel.ForEachAsync(
    Enumerable.Range(1, 12),
    new ParallelOptions { MaxDegreeOfParallelism = 3 },
    async (foto, ct) => resultados.Add(await ContarAsync(foto, ct)));

Console.WriteLine($"12 fotos, soma={resultados.Sum()}, pico de chamadas simultâneas={pico}");

// 2) Tempo limite: o token é cancelado sozinho depois de 150 ms
using var limite = new CancellationTokenSource(TimeSpan.FromMilliseconds(150));
try
{
    await ContarAsync(1, limite.Token);            // leva 110 ms: dá tempo
    Console.WriteLine("primeira chamada terminou");
    await ContarAsync(30, limite.Token);           // levaria 400 ms: é interrompida
    Console.WriteLine("esta linha não aparece");
}
catch (OperationCanceledException)
{
    Console.WriteLine("cancelado pelo tempo limite");
}

// 3) Uma falha entre várias tarefas
async Task<int> AsVezesFalha(int n)
{
    await Task.Delay(50);
    return n == 2 ? throw new InvalidOperationException($"foto {n} corrompida") : n;
}

try
{
    await Task.WhenAll(AsVezesFalha(1), AsVezesFalha(2), AsVezesFalha(3));
}
catch (InvalidOperationException e)
{
    Console.WriteLine($"WhenAll relançou: {e.Message}");
}

static void InterlockedMax(ref int alvo, int valor)
{
    int atual;
    while (valor > (atual = Volatile.Read(ref alvo)))
        Interlocked.CompareExchange(ref alvo, valor, atual);
}`,
        },
        {
          t: 'nota',
          estilo: 'info',
          md: `O exemplo usa \`Interlocked\` porque aqui há **threads de verdade**: dois trechos podem mexer em \`emAndamento\` no mesmo instante, e um \`emAndamento++\` comum perderia contagens. Em asyncio isso não acontece entre dois \`await\`. Regra prática: evite estado compartilhado; quando precisar, use \`Interlocked\`, \`lock\` ou as coleções de \`System.Collections.Concurrent\`.`,
        },
        {
          t: 'texto',
          md: `### Trabalho de CPU

\`await\` não acelera cálculo, só libera a thread durante **espera**. Para dividir cálculo entre os núcleos existe \`Parallel.For\` e \`Task.Run\`. Diferente do Python, não é preciso criar processos: as threads rodam em paralelo de verdade.`,
        },
        {
          t: 'codigo',
          titulo: 'Paralelismo de CPU sem processos',
          rodar: 'csharp',
          lang: 'csharp',
          codigo: cs`using System.Diagnostics;

// Trabalho puro de CPU: conta primos até n
static int ContarPrimos(int n)
{
    int quantos = 0;
    for (int i = 2; i < n; i++)
    {
        bool primo = true;
        for (int d = 2; d * d <= i; d++)
            if (i % d == 0) { primo = false; break; }
        if (primo) quantos++;
    }
    return quantos;
}

int[] cargas = Enumerable.Repeat(400_000, 8).ToArray();

var relogio = Stopwatch.StartNew();
int[] serie = cargas.Select(ContarPrimos).ToArray();
long tempoSerie = relogio.ElapsedMilliseconds;

relogio.Restart();
int[] paralelo = new int[cargas.Length];
Parallel.For(0, cargas.Length, i => paralelo[i] = ContarPrimos(cargas[i]));
long tempoParalelo = relogio.ElapsedMilliseconds;

Console.WriteLine($"primos abaixo de 400 mil: {serie[0]}");
Console.WriteLine($"resultados iguais: {serie.SequenceEqual(paralelo)}");
Console.WriteLine($"núcleos: {Environment.ProcessorCount}");
Console.WriteLine($"paralelo foi mais rápido que em série: {tempoParalelo < tempoSerie}");
Console.WriteLine($"(nesta execução: {tempoSerie} ms em série, {tempoParalelo} ms em paralelo)");`,
        },
        {
          t: 'tabela',
          titulo: 'Os erros clássicos de async em C#',
          colunas: ['Erro', 'O que acontece', 'Faça'],
          linhas: [
            ['`tarefa.Result` ou `.Wait()`', 'bloqueia a thread esperando; sob carga esgota o conjunto de threads, e em alguns ambientes trava de vez', '`await tarefa`, do começo ao fim da cadeia'],
            ['`async void`', 'ninguém consegue esperar nem capturar a exceção: ela derruba o processo', '`async Task`; `async void` só em manipulador de evento de interface'],
            ['esquecer o `await`', 'o método segue sem esperar; exceção se perde (o compilador avisa: CS4014)', 'dê `await`, ou guarde a `Task` de propósito'],
            ['não repassar o `CancellationToken`', 'o cliente desiste e o servidor continua trabalhando', 'receba `CancellationToken ct` e passe adiante em toda chamada'],
            ['`Task.Run` dentro de uma API para "ficar assíncrono"', 'só troca uma thread por outra', 'use a versão `Async` da biblioteca (banco, HTTP, arquivo)'],
          ],
        },
        {
          t: 'quiz',
          pergunta: 'Em C#, o que acontece na linha `var t = BuscarAsync();` (sem `await`)?',
          opcoes: [
            'Nada: o método só começa quando alguém der `await`.',
            'O método começa a executar na hora e devolve uma `Task` que representa o trabalho em andamento.',
            'Erro de compilação.',
            'O programa bloqueia até terminar.',
          ],
          correta: 1,
          explicacao: 'Tasks nascem "quentes". É por isso que `Task.WhenAll(a(), b())` roda as duas ao mesmo tempo. Em Python, chamar uma corrotina sem `await` não executa nada.',
        },
        {
          t: 'quiz',
          pergunta: 'Um endpoint chama o banco com `.Result` em vez de `await`. Qual é o efeito sob carga?',
          opcoes: [
            'Nenhum; é só estilo.',
            'Cada requisição segura uma thread parada durante a espera; as threads acabam e a API para de responder, mesmo com CPU ociosa.',
            'A consulta fica mais rápida.',
            'O compilador recusa.',
          ],
          correta: 1,
          explicacao: 'O ganho do `await` é devolver a thread enquanto espera. Bloquear joga isso fora, e a fila de requisições cresce até a API parecer travada.',
        },
      ],
    },
  ],
};
