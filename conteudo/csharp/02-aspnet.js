/**
 * Módulo 2 da trilha de C#: ASP.NET Core, da primeira rota à API protegida.
 *
 * Uma API não cabe num "rodar e ver a saída", então todo exemplo segue o mesmo
 * roteiro: sobe o servidor numa porta livre (porta 0), faz requisições contra
 * si mesmo com HttpClient, imprime as respostas e encerra. A alternativa
 * descartada era mandar o leitor abrir outro terminal: deixaria de ser
 * verificável pelo `npm run verificar`.
 *
 * O banco dos exemplos de Entity Framework é SQLite em memória, pelo mesmo
 * motivo: roda sem instalar nada. A troca para PostgreSQL é mostrada como
 * código para ler e foi conferida contra o contêiner do projeto integrador.
 */

const cs = String.raw;

export const aspnet = {
  id: 'aspnet',
  titulo: 'ASP.NET Core',
  cor: '#7c6cf0',
  licoes: [
    // ------------------------------------------------------------------
    {
      id: 'minimal-api',
      titulo: 'A primeira API',
      minutos: 14,
      resumo: 'Rotas, parâmetros, JSON e códigos de status com a Minimal API, o FastAPI do .NET.',
      blocos: [
        {
          t: 'texto',
          md: `**ASP.NET Core** é o framework web do .NET. Ele tem dois estilos: *controllers* (classes, o estilo antigo, ainda comum em sistema legado) e **Minimal API** (funções ligadas a rotas, o padrão para serviço novo). Se você já usou FastAPI ou Express, a Minimal API é familiar.

| | FastAPI | Express | Minimal API |
|---|---|---|---|
| Criar | \`app = FastAPI()\` | \`express()\` | \`WebApplication.CreateBuilder().Build()\` |
| Rota | \`@app.get("/x/{id}")\` | \`app.get("/x/:id", ...)\` | \`app.MapGet("/x/{id}", ...)\` |
| Corpo JSON | modelo Pydantic no parâmetro | \`req.body\` | um \`record\` no parâmetro |
| Resposta | devolve o objeto | \`res.json()\` | devolve o objeto ou \`TypedResults.*\` |
| Servidor | uvicorn | o do Node | **Kestrel**, embutido |

Todo programa tem duas fases: no **builder** você registra serviços e configuração; depois de \`Build()\`, você monta o **pipeline** (middlewares e rotas).

Os exemplos deste módulo começam com duas linhas próprias de programa de arquivo único:

- \`#:sdk Microsoft.NET.Sdk.Web\` — escolhe o SDK web (num projeto, é a primeira linha do \`.csproj\`);
- \`#:property PublishAot=false\` — programa de arquivo único liga por padrão a compilação nativa (AOT), que proíbe reflexão; sem esta linha, devolver um objeto como JSON falha com erro 500. Num projeto criado com \`dotnet new webapi\` isso vem desligado e você não precisa de nada.`,
        },
        {
          t: 'codigo',
          titulo: 'Rotas, parâmetros e status',
          rodar: 'csharp',
          lang: 'csharp',
          tempo: 120,
          codigo: cs`#:sdk Microsoft.NET.Sdk.Web
#:property PublishAot=false
using System.Net.Http.Json;

var builder = WebApplication.CreateBuilder(args);
builder.Logging.ClearProviders();            // sem log no console, para a saída ficar limpa
var app = builder.Build();
app.Urls.Add("http://127.0.0.1:0");          // porta 0: o sistema escolhe uma livre

// "Banco" em memória, só para esta lição
var armadilhas = new List<Armadilha>
{
    new(1, "SL-001", "T1", true),
    new(2, "SL-002", "T1", true),
    new(3, "SL-003", "T2", false),
};

// Lista, com filtro opcional vindo da query string: /armadilhas?talhao=T1
app.MapGet("/armadilhas", (string? talhao, bool apenasAtivas = false) =>
    armadilhas
        .Where(a => talhao is null || a.Talhao == talhao)
        .Where(a => !apenasAtivas || a.Ativa));

// {id:int} vem da rota; se não for número, a rota nem casa (404)
app.MapGet("/armadilhas/{id:int}", (int id) =>
    armadilhas.FirstOrDefault(a => a.Id == id) is { } achada
        ? Results.Ok(achada)
        : Results.NotFound());

// O record no parâmetro é lido do corpo JSON
app.MapPost("/armadilhas", (NovaArmadilha nova) =>
{
    if (armadilhas.Any(a => a.Codigo == nova.Codigo))
        return Results.Conflict(new { erro = $"já existe a armadilha {nova.Codigo}" });

    var criada = new Armadilha(armadilhas.Max(a => a.Id) + 1, nova.Codigo, nova.Talhao, true);
    armadilhas.Add(criada);
    return Results.Created($"/armadilhas/{criada.Id}", criada);      // 201 + cabeçalho Location
});

app.MapDelete("/armadilhas/{id:int}", (int id) =>
    armadilhas.RemoveAll(a => a.Id == id) > 0 ? Results.NoContent() : Results.NotFound());

await app.StartAsync();

// ---- daqui para baixo, o "cliente": o que você faria com curl ----
var http = new HttpClient { BaseAddress = new Uri(app.Urls.First()) };

await Mostrar("GET", "/armadilhas?talhao=T1");
await Mostrar("GET", "/armadilhas?apenasAtivas=true");
await Mostrar("GET", "/armadilhas/3");
await Mostrar("GET", "/armadilhas/99");
await Mostrar("GET", "/armadilhas/abc");
await Mostrar("POST", "/armadilhas", new NovaArmadilha("SL-004", "T2"));
await Mostrar("POST", "/armadilhas", new NovaArmadilha("SL-004", "T2"));
await Mostrar("DELETE", "/armadilhas/1");
await Mostrar("GET", "/armadilhas");

await app.StopAsync();

async Task Mostrar(string metodo, string caminho, object? corpo = null)
{
    var pedido = new HttpRequestMessage(new HttpMethod(metodo), caminho);
    if (corpo is not null) pedido.Content = JsonContent.Create(corpo);
    var resposta = await http.SendAsync(pedido);
    var texto = await resposta.Content.ReadAsStringAsync();
    Console.WriteLine($"{metodo,-6} {caminho,-32} -> {(int)resposta.StatusCode} {texto}");
}

record Armadilha(int Id, string Codigo, string Talhao, bool Ativa);
record NovaArmadilha(string Codigo, string Talhao);`,
        },
        {
          t: 'texto',
          md: `O que o framework fez sozinho:

- **De onde vem cada parâmetro.** Nome igual a um trecho da rota → rota. Tipo simples (\`string\`, \`int\`, \`bool\`) → query string. Tipo complexo (o \`record\`) → corpo JSON. Dá para ser explícito com \`[FromRoute]\`, \`[FromQuery]\`, \`[FromBody]\`, \`[FromHeader]\`.
- **JSON em camelCase.** \`Codigo\` virou \`codigo\`. Na entrada, aceita qualquer caixa.
- **\`/armadilhas/abc\` deu 404**, e não 400: a restrição \`{id:int}\` faz a rota não casar.
- **\`string? talhao\`** é opcional porque é anulável; \`bool apenasAtivas = false\` é opcional porque tem valor padrão. Um parâmetro de query sem nenhum dos dois é obrigatório, e a falta dele dá 400.

### TypedResults e grupos

Com \`Results.Ok(...)\` o tipo de retorno é um \`IResult\` genérico, e o documento OpenAPI não sabe o que a rota devolve. \`TypedResults\` carrega o tipo, e \`MapGroup\` evita repetir prefixo e configuração.`,
        },
        {
          t: 'codigo',
          titulo: 'Organizando: grupo de rotas, TypedResults e OpenAPI',
          rodar: 'csharp',
          lang: 'csharp',
          tempo: 120,
          codigo: cs`#:sdk Microsoft.NET.Sdk.Web
#:property PublishAot=false
#:package Microsoft.AspNetCore.OpenApi@10.*
using System.Text.Json;
using Microsoft.AspNetCore.Http.HttpResults;

var builder = WebApplication.CreateBuilder(args);
builder.Logging.ClearProviders();
builder.Services.AddOpenApi();                    // gera o documento OpenAPI
var app = builder.Build();
app.Urls.Add("http://127.0.0.1:0");

app.MapOpenApi();                                 // serve em /openapi/v1.json
app.MapGroup("/usinas").MapUsinas().WithTags("Usinas");

await app.StartAsync();
var http = new HttpClient { BaseAddress = new Uri(app.Urls.First()) };

Console.WriteLine(await http.GetStringAsync("/usinas/2"));
Console.WriteLine((int)(await http.GetAsync("/usinas/9")).StatusCode);

// O que o documento OpenAPI sabe sobre a rota
using var doc = JsonDocument.Parse(await http.GetStringAsync("/openapi/v1.json"));
var rota = doc.RootElement.GetProperty("paths").GetProperty("/usinas/{id}").GetProperty("get");
Console.WriteLine($"operação: {rota.GetProperty("operationId").GetString()}");
Console.WriteLine($"respostas documentadas: {string.Join(", ", rota.GetProperty("responses").EnumerateObject().Select(r => r.Name))}");
Console.WriteLine($"esquemas: {string.Join(", ", doc.RootElement.GetProperty("components").GetProperty("schemas").EnumerateObject().Select(s => s.Name))}");

await app.StopAsync();

// Um arquivo por recurso: as rotas saem do Program.cs
static class RotasDeUsinas
{
    private static readonly Usina[] Usinas = [new(1, "Santa Luzia", "MS"), new(2, "Boa Vista", "SP")];

    public static RouteGroupBuilder MapUsinas(this RouteGroupBuilder grupo)
    {
        grupo.MapGet("/", () => Usinas);
        grupo.MapGet("/{id:int}", Obter).WithName("ObterUsina");
        return grupo;
    }

    // O tipo de retorno DIZ quais respostas existem: 200 com Usina, ou 404
    private static Results<Ok<Usina>, NotFound> Obter(int id) =>
        Usinas.FirstOrDefault(u => u.Id == id) is { } usina
            ? TypedResults.Ok(usina)
            : TypedResults.NotFound();
}

record Usina(int Id, string Nome, string Uf);`,
        },
        {
          t: 'nota',
          estilo: 'dica',
          md: `O documento em \`/openapi/v1.json\` é o contrato da API. A partir dele dá para gerar o cliente TypeScript do painel React (com \`openapi-typescript\`, por exemplo) e ter, no front, os mesmos tipos do back. Para uma tela de testes como o \`/docs\` do FastAPI, o pacote **Scalar** (\`Scalar.AspNetCore\`, \`app.MapScalarApiReference()\`) lê esse mesmo documento.`,
        },
        {
          t: 'quiz',
          pergunta: 'Numa rota `app.MapPost("/capturas", (NovaCaptura nova) => ...)`, de onde o ASP.NET Core lê `nova`?',
          opcoes: [
            'Da query string.',
            'Do corpo da requisição, como JSON, porque é um tipo complexo.',
            'Dos cabeçalhos.',
            'Do contêiner de injeção de dependência, sempre.',
          ],
          correta: 1,
          explicacao: 'Tipos simples vêm da rota ou da query; um tipo complexo vem do corpo. (Se o tipo estiver registrado como serviço, aí sim vem da injeção de dependência: é a próxima lição.)',
        },
        {
          t: 'quiz',
          pergunta: 'Qual resposta é a correta para um POST que criou um recurso?',
          opcoes: [
            '200 OK com o texto "criado".',
            '201 Created, com o cabeçalho Location apontando para o recurso novo e o recurso no corpo.',
            '204 No Content.',
            '302 Found.',
          ],
          correta: 1,
          explicacao: '`Results.Created(uri, valor)` monta as três coisas. O cliente descobre o id e o endereço sem precisar de outra chamada.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'injecao-de-dependencia',
      titulo: 'Injeção de dependência e configuração',
      minutos: 14,
      resumo: 'O mecanismo central do ASP.NET Core: você registra serviços, o framework os entrega a quem pede. E os três tempos de vida.',
      blocos: [
        {
          t: 'texto',
          md: `No FastAPI você escreve \`Depends(obter_banco)\`. No ASP.NET Core isso é o **padrão para tudo**, e é embutido: o banco, o cliente HTTP, o relógio, o log e as suas próprias classes de regra de negócio chegam por parâmetro.

O ciclo tem dois passos:

1. **Registrar** no builder: "quando alguém pedir \`IRelogio\`, entregue um \`RelogioDoSistema\`".
2. **Pedir**: declarar o tipo num parâmetro da rota ou no construtor de uma classe.

Quem cria os objetos, em que ordem e quando descartá-los é problema do framework. O ganho aparece nos testes: troca-se a implementação real por uma falsa sem tocar no código que a usa.

No registro você escolhe o **tempo de vida**:

| Registro | Uma instância por | Use para |
|---|---|---|
| \`AddSingleton\` | aplicação inteira | o que é caro de criar e seguro entre threads: modelo carregado, cache, configuração |
| \`AddScoped\` | **requisição** | o que guarda estado de uma requisição: o \`DbContext\`, o usuário atual |
| \`AddTransient\` | cada vez que é pedido | objetos leves e sem estado |`,
        },
        {
          t: 'codigo',
          titulo: 'Os três tempos de vida, medidos',
          rodar: 'csharp',
          lang: 'csharp',
          tempo: 120,
          codigo: cs`#:sdk Microsoft.NET.Sdk.Web
#:property PublishAot=false

var builder = WebApplication.CreateBuilder(args);
builder.Logging.ClearProviders();

builder.Services.AddSingleton<Unico>();
builder.Services.AddScoped<PorRequisicao>();
builder.Services.AddTransient<Passageiro>();
builder.Services.AddScoped<ServicoDeCapturas>();     // depende dos três

var app = builder.Build();
app.Urls.Add("http://127.0.0.1:0");

// A rota pede os serviços por parâmetro; o ServicoDeCapturas pede os mesmos no construtor
app.MapGet("/", (Unico u, PorRequisicao r, Passageiro p, ServicoDeCapturas servico) =>
    $"rota:    singleton={u.Id} scoped={r.Id} transient={p.Id}\n" +
    $"serviço: {servico.Descrever()}");

await app.StartAsync();
var http = new HttpClient { BaseAddress = new Uri(app.Urls.First()) };

Console.WriteLine("--- requisição 1");
Console.WriteLine(await http.GetStringAsync("/"));
Console.WriteLine("--- requisição 2");
Console.WriteLine(await http.GetStringAsync("/"));

await app.StopAsync();

// Cada classe recebe um número de série ao ser criada
static class Serie { private static int _n; public static int Proximo() => Interlocked.Increment(ref _n); }

class Unico { public string Id { get; } = $"S{Serie.Proximo()}"; }
class PorRequisicao { public string Id { get; } = $"R{Serie.Proximo()}"; }
class Passageiro { public string Id { get; } = $"T{Serie.Proximo()}"; }

class ServicoDeCapturas(Unico unico, PorRequisicao porRequisicao, Passageiro passageiro)
{
    public string Descrever() => $"singleton={unico.Id} scoped={porRequisicao.Id} transient={passageiro.Id}";
}`,
        },
        {
          t: 'texto',
          md: `Leia os números de série:

- o **singleton** é o mesmo objeto nas duas requisições, na rota e no serviço;
- o **scoped** é o mesmo dentro de uma requisição (rota e serviço enxergam o mesmo), e outro na requisição seguinte;
- o **transient** é um objeto novo a cada pedido: a rota e o serviço receberam instâncias diferentes na mesma requisição.

É por ser *scoped* que o \`DbContext\` do Entity Framework funciona como unidade de trabalho: tudo o que participa da requisição compartilha a mesma conexão e a mesma transação.`,
        },
        {
          t: 'nota',
          estilo: 'pegadinha',
          md: `**Singleton não pode depender de scoped.** Se um singleton guardar um \`DbContext\`, aquele contexto vive para sempre e passa a ser usado por várias requisições ao mesmo tempo, o que ele não suporta. Em ambiente de desenvolvimento o ASP.NET Core recusa o registro com a mensagem "Cannot consume scoped service ... from singleton". Quando um singleton (um serviço em segundo plano, por exemplo) precisa do banco, ele pede um \`IServiceScopeFactory\` e cria um escopo para cada lote de trabalho.`,
        },
        {
          t: 'texto',
          md: `### Interface no registro: o que permite trocar

O padrão é registrar o **par** interface → implementação. A rota conhece só a interface.`,
        },
        {
          t: 'codigo',
          titulo: 'Trocando a implementação sem tocar na rota',
          rodar: 'csharp',
          lang: 'csharp',
          tempo: 120,
          codigo: cs`#:sdk Microsoft.NET.Sdk.Web
#:property PublishAot=false

async Task<string> Rodar(Action<IServiceCollection> registrar)
{
    var builder = WebApplication.CreateBuilder();
    builder.Logging.ClearProviders();
    registrar(builder.Services);

    var app = builder.Build();
    app.Urls.Add("http://127.0.0.1:0");

    // A rota não sabe qual relógio nem qual contador recebeu
    app.MapGet("/resumo", (IRelogio relogio, IContador contador) =>
        $"{relogio.Agora:yyyy-MM-dd HH:mm} -> {contador.Contar("a14.jpg")} insetos ({contador.GetType().Name})");

    await app.StartAsync();
    var texto = await new HttpClient().GetStringAsync(app.Urls.First() + "/resumo");
    await app.StopAsync();
    return texto;
}

// "Produção": relógio fixo só para a saída não mudar a cada execução
Console.WriteLine(await Rodar(s =>
{
    s.AddSingleton<IRelogio>(new RelogioFixo(new DateTime(2026, 11, 16, 9, 30, 0)));
    s.AddSingleton<IContador, ContadorPorModelo>();
}));

// "Teste": mesma rota, outras implementações
Console.WriteLine(await Rodar(s =>
{
    s.AddSingleton<IRelogio>(new RelogioFixo(new DateTime(2020, 1, 1)));
    s.AddSingleton<IContador, ContadorFalso>();
}));

interface IRelogio { DateTime Agora { get; } }
record RelogioFixo(DateTime Agora) : IRelogio;

interface IContador { int Contar(string foto); }
class ContadorPorModelo : IContador { public int Contar(string foto) => 38; }
class ContadorFalso : IContador { public int Contar(string foto) => 7; }`,
        },
        {
          t: 'nota',
          estilo: 'dica',
          md: `Para o relógio, o .NET já traz a abstração pronta: \`TimeProvider\`. Registre \`TimeProvider.System\` e peça \`TimeProvider\` no construtor; nos testes, use o \`FakeTimeProvider\` do pacote \`Microsoft.Extensions.TimeProvider.Testing\`. Código que chama \`DateTime.Now\` direto não dá para testar com data fixa.`,
        },
        {
          t: 'texto',
          md: `### Configuração

A configuração junta várias fontes numa só árvore de chaves, e **a última fonte ganha**:

1. \`appsettings.json\`
2. \`appsettings.{Ambiente}.json\` (\`Development\`, \`Production\`)
3. segredos de usuário, só em desenvolvimento (\`dotnet user-secrets\`)
4. variáveis de ambiente — o que a nuvem usa; \`Inferencia__Url\` (dois sublinhados) corresponde a \`Inferencia:Url\`
5. argumentos de linha de comando

Em vez de ler chave por chave, liga-se uma seção a uma classe: o **padrão Options**.`,
        },
        {
          t: 'codigo',
          titulo: 'Seção de configuração ligada a uma classe, com validação na partida',
          rodar: 'csharp',
          lang: 'csharp',
          tempo: 120,
          codigo: cs`#:sdk Microsoft.NET.Sdk.Web
#:property PublishAot=false
using System.ComponentModel.DataAnnotations;
using Microsoft.Extensions.Options;

async Task Tentar(string titulo, Dictionary<string, string?> valores)
{
    Console.WriteLine($"--- {titulo}");
    var builder = WebApplication.CreateBuilder();
    builder.Logging.ClearProviders();

    // No laboratório os valores vêm de um dicionário. Num projeto real, de
    // appsettings.json e das variáveis de ambiente, sem mudar mais nada.
    builder.Configuration.AddInMemoryCollection(valores);

    builder.Services.AddOptions<OpcoesDeInferencia>()
        .BindConfiguration("Inferencia")
        .ValidateDataAnnotations()
        .ValidateOnStart();                 // falha ao subir, e não na primeira requisição

    var app = builder.Build();
    app.Urls.Add("http://127.0.0.1:0");
    app.MapGet("/config", (IOptions<OpcoesDeInferencia> opcoes) => opcoes.Value);

    try
    {
        await app.StartAsync();
        Console.WriteLine(await new HttpClient().GetStringAsync(app.Urls.First() + "/config"));
        await app.StopAsync();
    }
    catch (OptionsValidationException e)
    {
        Console.WriteLine("a aplicação se recusou a subir:");
        foreach (var falha in e.Failures) Console.WriteLine($"  {falha}");
    }
}

await Tentar("configuração válida", new()
{
    ["Inferencia:Url"] = "http://inferencia.interno:8000",
    ["Inferencia:ConfiancaMinima"] = "0.35",
});

await Tentar("configuração quebrada", new()
{
    ["Inferencia:ConfiancaMinima"] = "1.7",
});

class OpcoesDeInferencia
{
    [Required, Url]
    public string? Url { get; set; }

    [Range(0.0, 1.0)]
    public double ConfiancaMinima { get; set; } = 0.25;

    [Range(1, 120)]
    public int TempoLimiteSegundos { get; set; } = 10;
}`,
        },
        {
          t: 'nota',
          estilo: 'info',
          md: `**Segredo não vai em \`appsettings.json\`.** O arquivo entra no repositório. Senha de banco e chave de API ficam em \`dotnet user-secrets\` na sua máquina, e em variável de ambiente ou no Key Vault na nuvem (trilha de Azure). Melhor ainda: use identidade gerenciada e não tenha segredo nenhum.`,
        },
        {
          t: 'quiz',
          pergunta: 'Qual tempo de vida usar para o `DbContext` do Entity Framework?',
          opcoes: [
            'Singleton, para reaproveitar a conexão.',
            'Scoped: uma instância por requisição, compartilhada por tudo que participa dela.',
            'Transient, para cada classe ter o seu.',
            'Tanto faz.',
          ],
          correta: 1,
          explicacao: 'O `DbContext` não é seguro entre threads e acumula as entidades que carregou. Uma instância por requisição é o padrão (é o que `AddDbContext` faz). Reaproveitar conexão é trabalho do pool, não do tempo de vida.',
        },
        {
          t: 'quiz',
          pergunta: 'Por que registrar `IContador` → `ContadorPorModelo` em vez de usar a classe direto?',
          opcoes: [
            'Porque o C# exige interface em toda classe.',
            'Porque quem usa passa a depender só do contrato: dá para trocar a implementação (por uma falsa no teste, por outra em produção) sem alterar quem a consome.',
            'Porque fica mais rápido.',
            'Porque interfaces são singleton.',
          ],
          correta: 1,
          explicacao: 'É a inversão de dependência. Não vale para tudo: crie a interface quando houver uma segunda implementação de verdade, nem que seja a do teste.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'validacao-e-erros',
      titulo: 'Validação, erros e o pipeline',
      minutos: 13,
      resumo: 'Recusar dado ruim na porta, responder erro num formato padrão e nunca vazar detalhe interno.',
      blocos: [
        {
          t: 'texto',
          md: `No FastAPI, o modelo Pydantic valida a entrada e devolve 422 sozinho. No .NET 10 a Minimal API ganhou o equivalente: você anota o tipo com atributos de \`System.ComponentModel.DataAnnotations\` e chama \`AddValidation()\`. Entrada inválida vira **400** antes de a sua função rodar.

O formato da resposta de erro também é padronizado: **ProblemDetails** (RFC 9457), um JSON com \`type\`, \`title\`, \`status\` e, na validação, \`errors\` por campo.`,
        },
        {
          t: 'codigo',
          titulo: 'Validação declarativa e erros no formato padrão',
          rodar: 'csharp',
          lang: 'csharp',
          tempo: 120,
          codigo: cs`#:sdk Microsoft.NET.Sdk.Web
#:property PublishAot=false
using System.ComponentModel.DataAnnotations;
using System.Net.Http.Json;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);
builder.Logging.ClearProviders();
builder.Services.AddValidation();        // valida os parâmetros anotados
builder.Services.AddProblemDetails();    // erros no formato padrão

var app = builder.Build();
app.Urls.Add("http://127.0.0.1:0");
app.UseExceptionHandler();               // exceção não tratada -> 500 em ProblemDetails
app.UseStatusCodePages();                // 404 e afins também ganham corpo

app.MapPost("/capturas", (NovaCaptura nova) =>
{
    // Regra de negócio: não é formato, então não cabe em atributo
    if (nova.ColetadaEm > new DateTime(2026, 11, 16))
        return Results.Problem(
            title: "Data de coleta no futuro",
            detail: $"A coleta informada é {nova.ColetadaEm:dd/MM/yyyy}.",
            statusCode: StatusCodes.Status422UnprocessableEntity);

    return Results.Created("/capturas/1", nova);
});

app.MapGet("/quebra", () =>
{
    string? conexao = null;
    return conexao!.Length;             // um defeito qualquer: NullReferenceException
});

await app.StartAsync();
var http = new HttpClient { BaseAddress = new Uri(app.Urls.First()) };

await Enviar("válida", new { armadilhaId = 14, insetos = 38, tecnico = "Marina", coletadaEm = "2026-11-10" });
await Enviar("formato ruim", new { armadilhaId = 0, insetos = -4, coletadaEm = "2026-11-10" });
await Enviar("regra de negócio", new { armadilhaId = 14, insetos = 2, tecnico = "Caio", coletadaEm = "2027-01-01" });

var quebra = await http.GetAsync("/quebra");
Console.WriteLine($"\ndefeito interno -> {(int)quebra.StatusCode}");
Console.WriteLine(Resumir(await quebra.Content.ReadAsStringAsync()));

var inexistente = await http.GetAsync("/nao-existe");
Console.WriteLine($"\nrota inexistente -> {(int)inexistente.StatusCode}");
Console.WriteLine(Resumir(await inexistente.Content.ReadAsStringAsync()));

await app.StopAsync();

async Task Enviar(string titulo, object corpo)
{
    var resposta = await http.PostAsJsonAsync("/capturas", corpo);
    Console.WriteLine($"\n{titulo} -> {(int)resposta.StatusCode}");
    Console.WriteLine(Resumir(await resposta.Content.ReadAsStringAsync()));
}

// Mostra só os campos que interessam do JSON de resposta
static string Resumir(string json)
{
    using var doc = JsonDocument.Parse(json);
    var linhas = new List<string>();
    foreach (var p in doc.RootElement.EnumerateObject())
    {
        if (p.Name is "type" or "traceId") continue;
        if (p.Name == "errors")
            foreach (var campo in p.Value.EnumerateObject())
                linhas.Add($"  errors.{campo.Name}: {campo.Value[0].GetString()}");
        else
            linhas.Add($"  {p.Name}: {p.Value}");
    }
    return string.Join("\n", linhas);
}

public record NovaCaptura(
    [property: Range(1, int.MaxValue)] int ArmadilhaId,
    [property: Range(0, 5000)] int Insetos,
    [property: Required, StringLength(60, MinimumLength = 2)] string? Tecnico,
    DateTime ColetadaEm);`,
        },
        {
          t: 'texto',
          md: `Repare em três decisões:

- **400 para formato, 422 para regra.** O atributo cobre o que dá para decidir olhando só o campo. O que depende de contexto (data no futuro, armadilha desativada) fica no código e responde com \`Results.Problem\`.
- **O defeito interno não vazou.** O cliente recebeu 500 com um título genérico. A mensagem da exceção e a pilha vão para o log, nunca para a resposta.
- **Até o 404 tem corpo no formato padrão**, por causa do \`UseStatusCodePages\`. O cliente trata todo erro do mesmo jeito.

As mensagens saem em inglês por padrão. Para trocar, passe \`ErrorMessage = "..."\` no atributo.

### O pipeline: a ordem importa

Cada requisição atravessa uma fila de **middlewares**, na ordem em que foram registrados com \`app.Use...\`, até chegar à rota. A resposta volta pelo caminho inverso. É o mesmo desenho do Express e dos middlewares do Starlette.`,
        },
        {
          t: 'codigo',
          titulo: 'Middleware e filtro de rota',
          rodar: 'csharp',
          lang: 'csharp',
          tempo: 120,
          codigo: cs`#:sdk Microsoft.NET.Sdk.Web
#:property PublishAot=false
using System.Diagnostics;

var builder = WebApplication.CreateBuilder(args);
builder.Logging.ClearProviders();
var app = builder.Build();
app.Urls.Add("http://127.0.0.1:0");

var passos = new List<string>();

// Middleware 1: mede o tempo e acrescenta um cabeçalho. Vale para TODAS as rotas.
app.Use(async (contexto, proximo) =>
{
    passos.Add("1 entra  (cronômetro)");
    var relogio = Stopwatch.StartNew();
    contexto.Response.OnStarting(() =>
    {
        contexto.Response.Headers["X-Tempo-Ms"] = relogio.ElapsedMilliseconds.ToString();
        return Task.CompletedTask;
    });
    await proximo(contexto);
    passos.Add("1 sai    (cronômetro)");
});

// Middleware 2: corta a requisição cedo, sem chamar o próximo
app.Use(async (contexto, proximo) =>
{
    passos.Add("2 entra  (manutenção?)");
    if (contexto.Request.Headers.ContainsKey("X-Manutencao"))
    {
        contexto.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
        await contexto.Response.WriteAsync("em manutenção");
        passos.Add("2 cortou");
        return;
    }
    await proximo(contexto);
    passos.Add("2 sai    (manutenção?)");
});

// Filtro: como um middleware, mas só desta rota, e já com os argumentos interpretados
app.MapGet("/armadilhas/{id:int}", (int id) =>
    {
        passos.Add("  rota executa");
        return $"armadilha {id}";
    })
    .AddEndpointFilter(async (contexto, proximo) =>
    {
        int id = contexto.GetArgument<int>(0);
        passos.Add($"  filtro vê id={id}");
        if (id <= 0) return Results.BadRequest("id precisa ser positivo");
        return await proximo(contexto);
    });

await app.StartAsync();
var http = new HttpClient { BaseAddress = new Uri(app.Urls.First()) };

async Task Chamar(string titulo, string caminho, bool manutencao = false)
{
    passos.Clear();
    var pedido = new HttpRequestMessage(HttpMethod.Get, caminho);
    if (manutencao) pedido.Headers.Add("X-Manutencao", "1");
    var resposta = await http.SendAsync(pedido);
    Console.WriteLine($"--- {titulo}: {(int)resposta.StatusCode} \"{await resposta.Content.ReadAsStringAsync()}\"  cabeçalho X-Tempo-Ms presente: {resposta.Headers.Contains("X-Tempo-Ms")}");
    foreach (var p in passos) Console.WriteLine($"    {p}");
}

await Chamar("normal", "/armadilhas/14");
await Chamar("filtro recusa", "/armadilhas/0");
await Chamar("middleware corta", "/armadilhas/14", manutencao: true);

await app.StopAsync();`,
        },
        {
          t: 'tabela',
          titulo: 'A ordem usual do pipeline numa API',
          colunas: ['Ordem', 'Chamada', 'Por que nesta posição'],
          linhas: [
            ['1', '`app.UseExceptionHandler()`', 'primeiro: precisa envolver tudo o que vem depois para capturar as exceções'],
            ['2', '`app.UseHttpsRedirection()`', 'antes de qualquer coisa que leia credencial'],
            ['3', '`app.UseCors()`', 'antes da autenticação: a requisição de sondagem do navegador não leva token'],
            ['4', '`app.UseAuthentication()`', 'descobre **quem** é'],
            ['5', '`app.UseAuthorization()`', 'decide se **pode**; depende do anterior'],
            ['6', '`app.UseRateLimiter()`', 'depois da autenticação, se o limite for por usuário'],
            ['7', '`app.Map...`', 'as rotas'],
          ],
        },
        {
          t: 'quiz',
          pergunta: 'Uma exceção não tratada estoura dentro de uma rota em produção. O que o cliente deve receber?',
          opcoes: [
            'A mensagem da exceção e a pilha de chamadas, para facilitar o suporte.',
            'Status 500 com um corpo genérico (ProblemDetails) e, no máximo, um identificador de rastreio; o detalhe vai para o log.',
            'Status 200 com `{ "erro": true }`.',
            'Nada: a conexão é derrubada.',
          ],
          correta: 1,
          explicacao: 'Mensagem de exceção costuma revelar nome de tabela, caminho de arquivo e string de conexão. O `traceId` da resposta liga o relato do usuário à entrada do log.',
        },
        {
          t: 'quiz',
          pergunta: 'Por que `UseAuthentication()` vem antes de `UseAuthorization()`?',
          opcoes: [
            'É só convenção.',
            'Porque a autorização decide com base na identidade que a autenticação montou; na ordem inversa, todo mundo parece anônimo.',
            'Porque autenticação é mais lenta.',
            'Porque o compilador exige.',
          ],
          correta: 1,
          explicacao: 'Middlewares rodam na ordem do registro. Ordem trocada não dá erro de compilação: dá 401 para todo mundo.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'ef-core-consultas',
      titulo: 'Entity Framework Core: do LINQ ao SQL',
      minutos: 16,
      resumo: 'O ORM do .NET: classes viram tabelas, e as mesmas chamadas de LINQ da lição de coleções viram SELECT.',
      blocos: [
        {
          t: 'texto',
          md: `**EF Core** é o ORM padrão do .NET, o papel do SQLAlchemy no Python. Três peças:

- **entidades**: classes comuns, uma por tabela;
- **\`DbContext\`**: a sessão com o banco; cada \`DbSet<T>\` é uma tabela consultável;
- **provedor**: o pacote que fala com um banco específico (\`Npgsql.EntityFrameworkCore.PostgreSQL\`, \`Microsoft.EntityFrameworkCore.Sqlite\`).

No laboratório o provedor é o **SQLite em memória**, para rodar sem instalar nada. O modelo e as consultas são os mesmos com PostgreSQL; o que muda (uma linha de configuração e o dialeto do SQL gerado) está na lição seguinte.

A ideia central: uma consulta LINQ sobre um \`DbSet\` **não roda em memória**. O EF lê a expressão, traduz para SQL e manda ao banco. \`ToQueryString()\` mostra a tradução sem executar.`,
        },
        {
          t: 'codigo',
          titulo: 'Modelo, dados e a tradução para SQL',
          rodar: 'csharp',
          lang: 'csharp',
          tempo: 180,
          codigo: cs`#:property PublishAot=false
#:package Microsoft.EntityFrameworkCore.Sqlite@10.*
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

// SQLite em memória existe enquanto a conexão estiver aberta
using var conexao = new SqliteConnection("Data Source=:memory:");
conexao.Open();

using var db = new Banco(conexao);
db.Database.EnsureCreated();          // cria as tabelas a partir das classes (só para exemplo!)
Semente.Popular(db);

// 1) Filtro + ordenação + limite
var consulta = db.Capturas
    .Where(c => c.Insetos > 30)
    .OrderByDescending(c => c.Insetos)
    .Take(3);

Console.WriteLine("--- LINQ vira este SQL:");
Console.WriteLine(consulta.ToQueryString());
Console.WriteLine("--- resultado:");
foreach (var c in consulta)
    Console.WriteLine($"captura {c.Id}: {c.Insetos} insetos em {c.ColetadaEm:dd/MM}");

// 2) Projeção atravessando relacionamentos: o EF escreve os JOINs
var linhas = db.Capturas
    .Where(c => c.Armadilha.Usina.Nome == "Santa Luzia")
    .Select(c => new { c.Armadilha.Codigo, c.Insetos });

Console.WriteLine("\n--- navegar por propriedades gera JOIN:");
Console.WriteLine(linhas.ToQueryString());

// 3) Agrupamento: o GROUP BY acontece no banco
var porUsina = db.Capturas
    .GroupBy(c => c.Armadilha.Usina.Nome)
    .Select(g => new { Usina = g.Key, Capturas = g.Count(), Insetos = g.Sum(c => c.Insetos), Pico = g.Max(c => c.Insetos) })
    .OrderByDescending(x => x.Insetos);

Console.WriteLine("\n--- agregação:");
Console.WriteLine(porUsina.ToQueryString());
foreach (var u in porUsina)
    Console.WriteLine($"{u.Usina,-12} capturas={u.Capturas} insetos={u.Insetos} pico={u.Pico}");

// ---------------- modelo ----------------
class Usina
{
    public int Id { get; set; }
    public required string Nome { get; set; }
    public List<Armadilha> Armadilhas { get; } = [];          // 1 usina -> N armadilhas
}

class Armadilha
{
    public int Id { get; set; }
    public required string Codigo { get; set; }
    public int UsinaId { get; set; }                           // chave estrangeira
    public Usina Usina { get; set; } = null!;                  // navegação
    public List<Captura> Capturas { get; } = [];
}

class Captura
{
    public int Id { get; set; }
    public int ArmadilhaId { get; set; }
    public Armadilha Armadilha { get; set; } = null!;
    public DateTime ColetadaEm { get; set; }
    public int Insetos { get; set; }
}

class Banco(SqliteConnection conexao) : DbContext
{
    public DbSet<Usina> Usinas => Set<Usina>();
    public DbSet<Armadilha> Armadilhas => Set<Armadilha>();
    public DbSet<Captura> Capturas => Set<Captura>();

    protected override void OnConfiguring(DbContextOptionsBuilder opcoes) => opcoes.UseSqlite(conexao);

    protected override void OnModelCreating(ModelBuilder modelo)
    {
        modelo.Entity<Usina>().Property(u => u.Nome).HasMaxLength(80);
        modelo.Entity<Armadilha>().HasIndex(a => a.Codigo).IsUnique();
        modelo.Entity<Captura>().HasIndex(c => new { c.ArmadilhaId, c.ColetadaEm });
    }
}

static class Semente
{
    public static void Popular(Banco db)
    {
        var luzia = new Usina { Nome = "Santa Luzia" };
        var vista = new Usina { Nome = "Boa Vista" };
        int[][] contagens = [[12, 40, 7], [31, 55], [0, 38, 9], [44]];
        string[] codigos = ["SL-001", "SL-002", "BV-001", "BV-002"];

        for (int i = 0; i < codigos.Length; i++)
        {
            var armadilha = new Armadilha { Codigo = codigos[i], Usina = i < 2 ? luzia : vista };
            for (int dia = 0; dia < contagens[i].Length; dia++)
                armadilha.Capturas.Add(new Captura { ColetadaEm = new DateTime(2026, 11, 2 + 7 * dia), Insetos = contagens[i][dia] });
            db.Armadilhas.Add(armadilha);       // usina e capturas vão junto, pelo relacionamento
        }
        db.SaveChanges();
    }
}`,
        },
        {
          t: 'texto',
          md: `Confira no SQL gerado:

- \`Take(3)\` virou \`LIMIT\`, e o valor foi como **parâmetro** (\`@p\`), não colado no texto. O mesmo acontece com qualquer variável sua: consultas do EF são parametrizadas, então não há injeção de SQL por esse caminho.
- \`c.Armadilha.Usina.Nome\` virou dois \`INNER JOIN\`. Você navega por propriedades; o EF escreve as junções.
- \`GroupBy\` + \`Count\`/\`Sum\`/\`Max\` virou um \`GROUP BY\` de verdade: o banco agrega e devolve uma linha por usina.

### Por convenção

O EF deduziu quase tudo: \`Id\` é chave primária e autoincremento; \`UsinaId\` + \`Usina\` formam a chave estrangeira; \`List<Armadilha>\` é o outro lado do relacionamento. O que foge da convenção (tamanho, índice, nome de coluna) declara-se em \`OnModelCreating\`.`,
        },
        {
          t: 'nota',
          estilo: 'pegadinha',
          md: `**Nem todo C# vira SQL.** Se você chamar um método seu dentro do \`Where\` (\`.Where(c => EhSuspeita(c))\`), o EF não tem como traduzir e lança \`InvalidOperationException\` ("could not be translated"). É proposital: versões antigas traziam a tabela inteira para a memória em silêncio. Se você **quer** filtrar em memória, diga isso com \`.AsEnumerable()\` antes do filtro, sabendo que o banco vai devolver tudo o que veio antes.`,
        },
        {
          t: 'texto',
          md: `### Dados relacionados: o que vem e o que não vem

Carregar uma armadilha **não** carrega as capturas dela. A lista vem vazia, sem erro, e é o primeiro susto de quem começa. Há três jeitos de trazer dados relacionados, e o custo de cada um é bem diferente. O bloco conta os comandos SQL que cada forma dispara.`,
        },
        {
          t: 'codigo',
          titulo: 'Include, projeção e o problema N+1',
          rodar: 'csharp',
          lang: 'csharp',
          tempo: 180,
          codigo: cs`#:property PublishAot=false
#:package Microsoft.EntityFrameworkCore.Sqlite@10.*
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

using var conexao = new SqliteConnection("Data Source=:memory:");
conexao.Open();

int comandos = 0;
Banco Novo() => new(conexao, () => comandos++);

using (var db = Novo())
{
    db.Database.EnsureCreated();
    for (int a = 1; a <= 20; a++)
    {
        var armadilha = new Armadilha { Codigo = $"SL-{a:000}" };
        for (int c = 0; c < 5; c++) armadilha.Capturas.Add(new Captura { Insetos = a + c });
        db.Armadilhas.Add(armadilha);
    }
    db.SaveChanges();
}

void Medir(string titulo, Func<Banco, string> acao)
{
    using var db = Novo();          // contexto novo: nada em cache
    comandos = 0;
    string resultado = acao(db);
    Console.WriteLine($"{titulo,-34} {comandos,2} comando(s) SQL   {resultado}");
}

// 0) Sem pedir, a navegação vem vazia
Medir("sem Include", db =>
{
    var a = db.Armadilhas.First();
    return $"{a.Codigo} tem {a.Capturas.Count} capturas carregadas";
});

// 1) N+1: uma consulta para a lista e mais uma POR armadilha
Medir("N+1 (consulta dentro do laço)", db =>
{
    int total = 0;
    foreach (var a in db.Armadilhas.ToList())
        total += db.Capturas.Where(c => c.ArmadilhaId == a.Id).Sum(c => c.Insetos);
    return $"total={total}";
});

// 2) Include: traz as entidades relacionadas junto
Medir("Include", db =>
{
    var armadilhas = db.Armadilhas.Include(a => a.Capturas).ToList();
    return $"total={armadilhas.Sum(a => a.Capturas.Sum(c => c.Insetos))}";
});

// 3) Projeção: pede só os números; o banco soma
Medir("projeção (Select)", db =>
{
    var linhas = db.Armadilhas.Select(a => new { a.Codigo, Total = a.Capturas.Sum(c => c.Insetos) }).ToList();
    return $"total={linhas.Sum(l => l.Total)}";
});

class Armadilha
{
    public int Id { get; set; }
    public required string Codigo { get; set; }
    public List<Captura> Capturas { get; } = [];
}

class Captura
{
    public int Id { get; set; }
    public int ArmadilhaId { get; set; }
    public int Insetos { get; set; }
}

class Banco(SqliteConnection conexao, Action aoExecutar) : DbContext
{
    public DbSet<Armadilha> Armadilhas => Set<Armadilha>();
    public DbSet<Captura> Capturas => Set<Captura>();

    protected override void OnConfiguring(DbContextOptionsBuilder opcoes) => opcoes
        .UseSqlite(conexao)
        // chama aoExecutar a cada comando enviado ao banco
        .LogTo(_ => aoExecutar(), [RelationalEventId.CommandExecuted]);
}`,
        },
        {
          t: 'texto',
          md: `Com 20 armadilhas, a versão com consulta dentro do laço fez **21** idas ao banco; as outras duas, **uma**. Com 2 mil armadilhas seriam 2001, cada uma pagando a viagem de rede. É o mesmo problema N+1 da trilha de PostgreSQL, agora visto do lado da aplicação.

| Forma | Quando usar |
|---|---|
| \`Include\` | você precisa das **entidades** relacionadas, em geral para alterá-las |
| Projeção com \`Select\` | leitura: listagem, relatório, resposta de API. Traz só as colunas usadas, e é o padrão a preferir |
| Consulta dentro do laço | nunca |

O EF Core **não** carrega navegações sob demanda por padrão (o "lazy loading" existe, mas é opcional). É uma boa escolha: o N+1 precisa ser escrito de propósito, como no exemplo, em vez de acontecer escondido atrás de um acesso a propriedade.`,
        },
        {
          t: 'quiz',
          pergunta: 'O que `db.Capturas.Where(c => c.Insetos > 30)` faz no momento em que a linha executa?',
          opcoes: [
            'Traz todas as capturas e filtra em memória.',
            'Nada no banco: monta uma consulta, que só vira SQL e roda quando for percorrida ou materializada.',
            'Roda o SELECT e guarda o resultado.',
            'Abre uma transação.',
          ],
          correta: 1,
          explicacao: 'É a mesma execução adiada do LINQ em memória. O SQL sai no `ToList`, `First`, `Count`, `foreach` (ou nas versões `Async`).',
        },
        {
          t: 'quiz',
          pergunta: 'Uma tela lista 500 armadilhas com o total de insetos de cada. Qual forma é a mais adequada?',
          opcoes: [
            'Buscar as armadilhas e, num laço, consultar as capturas de cada uma.',
            '`Include(a => a.Capturas)` e somar em memória.',
            'Uma projeção: `Select(a => new { a.Codigo, Total = a.Capturas.Sum(c => c.Insetos) })`.',
            'Carregar a tabela de capturas inteira e agrupar em memória.',
          ],
          correta: 2,
          explicacao: 'A projeção faz uma consulta só e o banco devolve 500 linhas com dois campos. O `Include` também faz uma viagem, mas traz todas as capturas para a aplicação só para somá-las.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'ef-core-na-pratica',
      titulo: 'EF Core na prática: gravar, migrar e usar PostgreSQL',
      minutos: 15,
      resumo: 'O rastreamento de mudanças, transações, alteração em lote, migrações e a configuração real com Npgsql.',
      blocos: [
        {
          t: 'texto',
          md: `Para gravar, o EF usa **rastreamento de mudanças**: o contexto lembra de cada entidade que carregou e do valor original de cada propriedade. Você altera o objeto como qualquer objeto C#, e \`SaveChanges\` descobre o que mudou e gera o \`UPDATE\` mínimo. É a "sessão" do SQLAlchemy.`,
        },
        {
          t: 'codigo',
          titulo: 'Rastreamento, transação e alteração em lote',
          rodar: 'csharp',
          lang: 'csharp',
          tempo: 180,
          codigo: cs`#:property PublishAot=false
#:package Microsoft.EntityFrameworkCore.Sqlite@10.*
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

using var conexao = new SqliteConnection("Data Source=:memory:");
conexao.Open();

var sql = new List<string>();
Banco Novo() => new(conexao, sql);

using (var db = Novo())
{
    db.Database.EnsureCreated();
    db.Armadilhas.AddRange(
        new Armadilha { Codigo = "SL-001", Talhao = "T1", Ativa = true },
        new Armadilha { Codigo = "SL-002", Talhao = "T1", Ativa = true },
        new Armadilha { Codigo = "SL-003", Talhao = "T1", Ativa = true });
    db.SaveChanges();
}

void Mostrar(string titulo)
{
    Console.WriteLine($"--- {titulo}");
    foreach (var comando in sql) Console.WriteLine("    " + comando);
    if (sql.Count == 0) Console.WriteLine("    (nenhum comando)");
    sql.Clear();
}
sql.Clear();

// 1) Alterar: mexe no objeto, SaveChanges gera o UPDATE só da coluna que mudou
using (var db = Novo())
{
    var armadilha = db.Armadilhas.Single(a => a.Codigo == "SL-002");
    Console.WriteLine($"estado ao carregar: {db.Entry(armadilha).State}");
    armadilha.Talhao = "T4";
    Console.WriteLine($"estado ao alterar:  {db.Entry(armadilha).State}");
    db.SaveChanges();
    Mostrar("carregar, alterar, salvar");
}

// 2) AsNoTracking: leitura sem rastrear. Alterar não grava nada.
using (var db = Novo())
{
    var armadilha = db.Armadilhas.AsNoTracking().Single(a => a.Codigo == "SL-001");
    armadilha.Talhao = "T9";
    int gravadas = db.SaveChanges();
    Console.WriteLine($"linhas gravadas com AsNoTracking: {gravadas}");
    sql.Clear();
}

// 3) Transação explícita: tudo ou nada
using (var db = Novo())
{
    using var transacao = db.Database.BeginTransaction();
    try
    {
        db.Armadilhas.Add(new Armadilha { Codigo = "SL-004", Talhao = "T2", Ativa = true });
        db.SaveChanges();
        db.Armadilhas.Add(new Armadilha { Codigo = "SL-001", Talhao = "T2", Ativa = true });   // código repetido
        db.SaveChanges();
        transacao.Commit();
    }
    catch (DbUpdateException e)
    {
        transacao.Rollback();
        Console.WriteLine($"desfeito: {e.InnerException!.Message}");
    }
    sql.Clear();
}

// 4) Alteração em lote: um UPDATE direto, sem carregar entidades
using (var db = Novo())
{
    Console.WriteLine($"armadilhas depois da transação desfeita: {db.Armadilhas.Count()}");
    sql.Clear();

    int afetadas = db.Armadilhas
        .Where(a => a.Talhao == "T1")
        .ExecuteUpdate(s => s.SetProperty(a => a.Ativa, false));
    Console.WriteLine($"desativadas em lote: {afetadas}");
    Mostrar("ExecuteUpdate");
}

class Armadilha
{
    public int Id { get; set; }
    public required string Codigo { get; set; }
    public required string Talhao { get; set; }
    public bool Ativa { get; set; }
}

class Banco(SqliteConnection conexao, List<string> sql) : DbContext
{
    public DbSet<Armadilha> Armadilhas => Set<Armadilha>();

    protected override void OnConfiguring(DbContextOptionsBuilder opcoes) => opcoes
        .UseSqlite(conexao)
        .LogTo(
            mensagem => sql.Add(string.Join(" ", mensagem.Split('\n').Skip(2).Select(l => l.Trim()))),
            [RelationalEventId.CommandExecuted]);

    protected override void OnModelCreating(ModelBuilder modelo) =>
        modelo.Entity<Armadilha>().HasIndex(a => a.Codigo).IsUnique();
}`,
        },
        {
          t: 'texto',
          md: `O que observar:

- O \`UPDATE\` do passo 1 altera **só** \`Talhao\`: o EF comparou com o valor original.
- Com \`AsNoTracking\` o contexto não guarda nada da entidade, e \`SaveChanges\` gravou zero linhas. Em rota de **leitura**, use sempre: gasta menos memória e tempo. (Projeção com \`Select\` para um tipo que não é entidade já não rastreia.)
- Um único \`SaveChanges\` já é uma transação. A transação explícita serve para juntar **vários** \`SaveChanges\`, ou o banco com outra operação.
- \`ExecuteUpdate\` e \`ExecuteDelete\` mandam um comando só, sem trazer linha nenhuma. É o jeito certo de alterar muitas linhas; passam por fora do rastreamento, então entidades já carregadas não ficam sabendo.

### Migrações

\`EnsureCreated\` é só para exemplo e teste: cria o banco do zero e não sabe **alterar** um banco que já tem dados. Em sistema real o esquema evolui por **migrações**: cada mudança no modelo gera um arquivo versionado que leva o banco de um estado ao seguinte. É o Alembic do Python.`,
        },
        {
          t: 'codigo',
          titulo: 'O ciclo das migrações (para ler)',
          lang: 'bash',
          codigo: `dotnet tool install --global dotnet-ef          # a ferramenta, uma vez
dotnet add package Microsoft.EntityFrameworkCore.Design

# 1) mudou uma entidade? gere a migração e LEIA o arquivo criado em Migrations/
dotnet ef migrations add AdicionaNitidezNaCaptura

# 2) aplique no seu banco local
dotnet ef database update

# desfazer a última, se ainda não foi compartilhada
dotnet ef migrations remove

# 3) para produção: gere o SQL e revise, ou um executável que aplica
dotnet ef migrations script --idempotent -o migracao.sql
dotnet ef migrations bundle -o aplicar-migracoes`,
        },
        {
          t: 'nota',
          estilo: 'pegadinha',
          md: `**Não aplique migração na partida da API em produção** (\`db.Database.Migrate()\` no \`Program.cs\`). Com várias réplicas subindo ao mesmo tempo, cada uma tenta migrar; e uma migração demorada ou destrutiva roda sem ninguém ter revisado. Aplique num passo próprio do pipeline de entrega, antes de trocar a versão da aplicação: é o estágio de migração do simulador de pipeline da trilha de Azure. E **nunca edite uma migração já aplicada**: gere a próxima.`,
        },
        {
          t: 'texto',
          md: `### A configuração de verdade: PostgreSQL com Npgsql

Numa API, o contexto recebe as opções pelo construtor e é registrado na injeção de dependência (como *scoped*). Esta configuração (\`UseNpgsql\` com nomes em snake_case, mapeando as tabelas \`usinas\`, \`armadilhas\` e \`capturas\`) foi conferida contra um PostgreSQL com o esquema de \`projeto-integrador/banco\`. Ela não roda no laboratório porque depende desse contêiner.`,
        },
        {
          t: 'codigo',
          titulo: 'DbContext com PostgreSQL numa API (para ler)',
          lang: 'csharp',
          codigo: cs`// dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL
// dotnet add package EFCore.NamingConventions

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<Banco>(opcoes => opcoes
    .UseNpgsql(builder.Configuration.GetConnectionString("Banco"))
    .UseSnakeCaseNamingConvention());       // Captura.ColetadaEm -> capturas.coletada_em

var app = builder.Build();

// O contexto chega por parâmetro. Tudo assíncrono, com o token de cancelamento.
app.MapGet("/usinas/{id:int}/alertas", async (int id, Banco db, CancellationToken ct) =>
    await db.Capturas
        .AsNoTracking()
        .Where(c => c.Armadilha.UsinaId == id && c.Insetos > 30)
        .OrderByDescending(c => c.ColetadaEm)
        .Select(c => new Alerta(c.Armadilha.Codigo, c.ColetadaEm, c.Insetos))
        .Take(50)
        .ToListAsync(ct));

app.Run();

record Alerta(string Armadilha, DateTime ColetadaEm, int Insetos);

class Banco(DbContextOptions<Banco> opcoes) : DbContext(opcoes)
{
    public DbSet<Captura> Capturas => Set<Captura>();
}

// appsettings.Development.json
// { "ConnectionStrings": { "Banco": "Host=localhost;Database=armadilhas;Username=lab;Password=lab" } }`,
        },
        {
          t: 'tabela',
          titulo: 'O que muda de SQLite para PostgreSQL',
          colunas: ['Assunto', 'No laboratório (SQLite)', 'Com Npgsql'],
          linhas: [
            ['Configuração', '`UseSqlite(conexao)`', '`UseNpgsql(stringDeConexao)`'],
            ['Nomes', '`"Capturas"."ColetadaEm"`', 'com `UseSnakeCaseNamingConvention()`: `capturas.coletada_em`'],
            ['Data e hora', 'texto', '`timestamptz`; o Npgsql exige `DateTime` em UTC (`DateTime.UtcNow`) ou `DateTimeOffset`'],
            ['`decimal`', 'sem `Sum` nem ordenação no banco', '`numeric`, completo'],
            ['JSON', 'limitado', '`jsonb` mapeado para classes; consultável por LINQ'],
            ['Vetores', '—', 'pacote `Pgvector.EntityFrameworkCore`: coluna `vector` e ordenação por distância'],
            ['Texto sem diferenciar caixa', '`LIKE`', '`EF.Functions.ILike(...)`'],
          ],
        },
        {
          t: 'nota',
          estilo: 'dica',
          md: `**Quando o EF não basta.** Consulta com função de janela, CTE recursiva ou ajuste fino de plano: escreva SQL. Dá para ficar no EF (\`db.Database.SqlQuery<Linha>($"SELECT ...")\`, que parametriza as interpolações) ou usar o **Dapper**, um mapeador mínimo. Os dois convivem bem no mesmo projeto: EF para gravar e para as consultas comuns, SQL à mão para os relatórios.`,
        },
        {
          t: 'quiz',
          pergunta: 'Quando usar `AsNoTracking()`?',
          opcoes: [
            'Nunca; é só para depuração.',
            'Em consultas de leitura, em que as entidades não serão alteradas e salvas: evita o custo de guardar o estado original de cada uma.',
            'Sempre que for chamar `SaveChanges` em seguida.',
            'Só com SQLite.',
          ],
          correta: 1,
          explicacao: 'Rastrear custa memória e tempo proporcionais ao número de entidades. Leitura não precisa; alteração precisa.',
        },
        {
          t: 'quiz',
          pergunta: 'Qual é o jeito adequado de marcar como inativas 40 mil armadilhas de um cliente?',
          opcoes: [
            'Carregar as 40 mil, alterar uma a uma e chamar `SaveChanges`.',
            '`db.Armadilhas.Where(...).ExecuteUpdate(s => s.SetProperty(a => a.Ativa, false))`: um único UPDATE no banco.',
            'Apagar e inserir de novo.',
            'Um laço com 40 mil transações.',
          ],
          correta: 1,
          explicacao: 'O `ExecuteUpdate` não traz nenhuma linha para a aplicação. Carregar tudo gastaria memória para 40 mil objetos e geraria 40 mil comandos UPDATE.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'testes',
      titulo: 'Testes com xUnit',
      minutos: 13,
      resumo: 'O pytest do .NET: fatos, teorias, dublês por interface e teste de integração da API inteira.',
      blocos: [
        {
          t: 'texto',
          md: `**xUnit** é o framework de testes mais usado no .NET. A correspondência com o pytest é direta.

| pytest | xUnit |
|---|---|
| função \`test_...\` | método com \`[Fact]\` |
| \`@pytest.mark.parametrize\` | \`[Theory]\` + \`[InlineData(...)]\` |
| \`assert x == y\` | \`Assert.Equal(esperado, obtido)\` |
| \`pytest.raises(Erro)\` | \`Assert.Throws<Erro>(() => ...)\` |
| fixture | construtor da classe de teste; \`IClassFixture<T>\` para compartilhar |
| \`uv run pytest\` | \`dotnet test\` |

Na versão 3 do xUnit um projeto de testes é um executável comum, e por isso roda aqui como programa de arquivo único: o que você vê na saída é o próprio executor de testes. Num projeto de verdade o comando é \`dotnet test\`.

O bloco testa uma regra de negócio que depende de um serviço externo. Como a regra recebe a dependência por **interface**, o teste entrega um dublê.`,
        },
        {
          t: 'codigo',
          titulo: 'Fatos, teorias e um dublê',
          rodar: 'csharp',
          lang: 'csharp',
          tempo: 180,
          codigo: cs`#:package xunit.v3@3.*
using Xunit;

public class TestesDoAvaliador
{
    // O construtor roda antes de CADA teste: cada um recebe objetos novos
    private readonly ContadorFalso _contador = new();
    private readonly Avaliador _avaliador;

    public TestesDoAvaliador() => _avaliador = new Avaliador(_contador, limiar: 30);

    [Fact]
    public void Armadilha_sem_insetos_fica_limpa()
    {
        _contador.Devolver(0);

        var resultado = _avaliador.Avaliar("a14.jpg");

        Assert.Equal(Nivel.Limpa, resultado.Nivel);
    }

    [Theory]
    [InlineData(1, Nivel.Normal)]
    [InlineData(30, Nivel.Normal)]     // a fronteira: 30 ainda é normal
    [InlineData(31, Nivel.Alerta)]
    [InlineData(500, Nivel.Alerta)]
    public void Nivel_depende_do_limiar(int insetos, Nivel esperado)
    {
        _contador.Devolver(insetos);

        Assert.Equal(esperado, _avaliador.Avaliar("a14.jpg").Nivel);
    }

    [Fact]
    public void Foto_ilegivel_nao_vira_contagem_zero()
    {
        _contador.Falhar();

        var resultado = _avaliador.Avaliar("escura.jpg");

        Assert.Equal(Nivel.SemLeitura, resultado.Nivel);
        Assert.Null(resultado.Insetos);
    }

    [Fact]
    public void Chama_o_contador_uma_unica_vez()
    {
        _contador.Devolver(12);

        _avaliador.Avaliar("a14.jpg");

        Assert.Equal(["a14.jpg"], _contador.FotosRecebidas);
    }

    [Fact]
    public void Limiar_negativo_e_recusado() =>
        Assert.Throws<ArgumentOutOfRangeException>(() => new Avaliador(_contador, limiar: -1));
}

// ---------------- o código sob teste ----------------
public enum Nivel { Limpa, Normal, Alerta, SemLeitura }
public record Avaliacao(Nivel Nivel, int? Insetos);

public interface IContador { int Contar(string foto); }

public class Avaliador
{
    private readonly IContador _contador;
    private readonly int _limiar;

    public Avaliador(IContador contador, int limiar)
    {
        ArgumentOutOfRangeException.ThrowIfNegative(limiar);
        _contador = contador;
        _limiar = limiar;
    }

    public Avaliacao Avaliar(string foto)
    {
        int insetos;
        try
        {
            insetos = _contador.Contar(foto);
        }
        catch (InvalidOperationException)
        {
            return new Avaliacao(Nivel.SemLeitura, null);
        }

        var nivel = insetos == 0 ? Nivel.Limpa : insetos > _limiar ? Nivel.Alerta : Nivel.Normal;
        return new Avaliacao(nivel, insetos);
    }
}

// ---------------- o dublê ----------------
public class ContadorFalso : IContador
{
    private int _valor;
    private bool _falhar;
    public List<string> FotosRecebidas { get; } = [];

    public void Devolver(int valor) => _valor = valor;
    public void Falhar() => _falhar = true;

    public int Contar(string foto)
    {
        FotosRecebidas.Add(foto);
        return _falhar ? throw new InvalidOperationException("foto ilegível") : _valor;
    }
}`,
        },
        {
          t: 'texto',
          md: `Oito testes: quatro \`[Fact]\` e uma \`[Theory]\` que conta como quatro, um por linha de dados. O dublê foi escrito à mão, em quinze linhas; bibliotecas como **NSubstitute** geram dublês a partir da interface, e valem a pena quando há muitos.

Agora o que você vê quando um teste falha. O código abaixo tem um defeito de fronteira.`,
        },
        {
          t: 'codigo',
          titulo: 'Um teste que pega um defeito (a falha é a lição)',
          rodar: 'csharp',
          lang: 'csharp',
          tempo: 180,
          esperaFalha: true,
          codigo: cs`#:package xunit.v3@3.*
using Xunit;

public class TestesDeNivel
{
    [Theory]
    [InlineData(29, "normal")]
    [InlineData(30, "normal")]      // a regra diz: alerta só ACIMA de 30
    [InlineData(31, "alerta")]
    public void Classifica(int insetos, string esperado) =>
        Assert.Equal(esperado, Regras.Classificar(insetos));
}

public static class Regras
{
    // defeito: >= no lugar de >
    public static string Classificar(int insetos) => insetos >= 30 ? "alerta" : "normal";
}`,
        },
        {
          t: 'texto',
          md: `A saída aponta o caso exato (\`insetos: 30\`), o valor esperado e o obtido, e o programa termina com código diferente de zero: é o que faz o pipeline de entrega parar. Só o caso da fronteira falhou; os valores "confortáveis" (29 e 31) passariam com o defeito lá dentro. **Teste a fronteira.**

### Teste de integração: a API inteira, em memória

Teste de unidade com dublê não pega rota errada, JSON com nome trocado, validação esquecida. Para isso o ASP.NET Core tem a \`WebApplicationFactory\`: sobe a aplicação **dentro do processo de teste**, sem porta de rede, e entrega um \`HttpClient\` ligado a ela. Você troca só o que é externo (o banco, o serviço de inferência).`,
        },
        {
          t: 'codigo',
          titulo: 'Teste de integração com WebApplicationFactory (para ler)',
          lang: 'csharp',
          codigo: cs`// dotnet add package Microsoft.AspNetCore.Mvc.Testing
// No Program.cs da API, ao final:   public partial class Program;

public class TestesDeCapturas(FabricaDaApi fabrica) : IClassFixture<FabricaDaApi>
{
    private readonly HttpClient _http = fabrica.CreateClient();

    [Fact]
    public async Task Post_valido_devolve_201_e_o_recurso()
    {
        var resposta = await _http.PostAsJsonAsync("/capturas",
            new { armadilhaId = 1, insetos = 38, tecnico = "Marina", coletadaEm = "2026-11-10" });

        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        var criada = await resposta.Content.ReadFromJsonAsync<CapturaCriada>();
        Assert.Equal(38, criada!.Insetos);
        Assert.NotNull(resposta.Headers.Location);
    }

    [Fact]
    public async Task Insetos_negativos_devolvem_400() =>
        Assert.Equal(HttpStatusCode.BadRequest,
            (await _http.PostAsJsonAsync("/capturas", new { armadilhaId = 1, insetos = -1 })).StatusCode);
}

// A fábrica sobe a API real, trocando só as dependências externas
public class FabricaDaApi : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder) =>
        builder.ConfigureTestServices(servicos =>
        {
            servicos.RemoveAll<IClienteDeInferencia>();
            servicos.AddSingleton<IClienteDeInferencia, InferenciaFalsa>();
        });
}`,
        },
        {
          t: 'nota',
          estilo: 'dica',
          md: `**E o banco nos testes de integração?** Use o **mesmo** banco de produção, num contêiner: o pacote **Testcontainers** (\`Testcontainers.PostgreSql\`) sobe um PostgreSQL descartável por execução de teste. O provedor "InMemory" do EF e o SQLite escondem diferenças que importam (tipos, \`jsonb\`, restrições, dialeto), e teste que passa neles pode falhar em produção.`,
        },
        {
          t: 'quiz',
          pergunta: 'Qual é a diferença entre `[Fact]` e `[Theory]`?',
          opcoes: [
            'Nenhuma.',
            '`[Fact]` é um teste sem parâmetros; `[Theory]` roda o mesmo teste uma vez para cada conjunto de dados (`[InlineData]`).',
            '`[Theory]` é para testes lentos.',
            '`[Fact]` só serve para testes assíncronos.',
          ],
          correta: 1,
          explicacao: 'É o `parametrize` do pytest. Cada linha de dados aparece como um teste separado no relatório, então dá para ver qual caso falhou.',
        },
        {
          t: 'quiz',
          pergunta: 'O que a `WebApplicationFactory` permite testar que um teste de unidade com dublê não alcança?',
          opcoes: [
            'A velocidade do processador.',
            'O caminho completo de uma requisição: rota, leitura do JSON, validação, injeção de dependência, filtros e o formato da resposta.',
            'Só o banco de dados.',
            'A interface do aplicativo.',
          ],
          correta: 1,
          explicacao: 'Ela sobe o `Program.cs` real em memória. É onde aparecem erros de "cola": registro que faltou, nome de campo diferente, status trocado.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'cliente-http-resiliente',
      titulo: 'Chamando o serviço de inferência em Python',
      minutos: 14,
      resumo: 'A API em C# conversa com o serviço FastAPI da trilha de Python: cliente tipado, JSON em snake_case, tempo limite e novas tentativas.',
      blocos: [
        {
          t: 'texto',
          md: `No sistema desta trilha, a API em C# recebe a foto do aplicativo e **pede a contagem ao serviço de inferência em Python** (o do projeto da trilha "Python para IA"). É uma chamada HTTP entre dois serviços seus, e três coisas dão errado nela com frequência:

1. **Criar \`HttpClient\` do jeito errado.** \`new HttpClient()\` a cada chamada esgota as portas da máquina sob carga; um único \`static\` para sempre não percebe mudança de DNS. A resposta é a **\`IHttpClientFactory\`**: você registra um cliente tipado com \`AddHttpClient<T>\` e o framework cuida do ciclo de vida das conexões.
2. **Nomes diferentes dos dois lados.** O Python fala \`total_insetos\`; o C# quer \`TotalInsetos\`.
3. **Não prever falha.** O serviço reinicia, a rede oscila, a GPU está ocupada. Sem tempo limite e nova tentativa, a falha de um lado vira falha do outro.

O bloco sobe um serviço de inferência **falso** (que responde como o FastAPI responderia e falha de propósito nas duas primeiras chamadas) e o cliente de verdade que a API usaria.`,
        },
        {
          t: 'codigo',
          titulo: 'Cliente tipado, snake_case e novas tentativas',
          rodar: 'csharp',
          lang: 'csharp',
          tempo: 180,
          codigo: cs`#:sdk Microsoft.NET.Sdk.Web
#:property PublishAot=false
#:package Microsoft.Extensions.Http.Resilience@10.*
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

// ---------- o serviço Python, imitado ----------
int chamadas = 0;
var falso = WebApplication.CreateBuilder();
falso.Logging.ClearProviders();
var inferencia = falso.Build();
inferencia.Urls.Add("http://127.0.0.1:0");

inferencia.MapPost("/inferir", async (HttpRequest pedido) =>
{
    int n = Interlocked.Increment(ref chamadas);
    if (n <= 2) return Results.StatusCode(503);                 // "modelo carregando"

    var formulario = await pedido.ReadFormAsync();
    var foto = formulario.Files["foto"]!;
    // JSON como o FastAPI devolveria: snake_case
    return Results.Text($$"""
        {"total_insetos": 38, "tempo_ms": 41.5, "versao_do_modelo": "yolo26s-armadilhas-v7",
         "bytes_recebidos": {{foto.Length}},
         "deteccoes": [{"classe": "mosca-branca", "confianca": 0.91, "caixa": [10, 20, 34, 40]},
                       {"classe": "tripes", "confianca": 0.62, "caixa": [80, 15, 96, 33]}]}
        """, "application/json");
});
await inferencia.StartAsync();

// ---------- a API: registra o cliente tipado ----------
var builder = WebApplication.CreateBuilder();
builder.Logging.ClearProviders();

builder.Services
    .AddHttpClient<ClienteDeInferencia>(http =>
    {
        http.BaseAddress = new Uri(inferencia.Urls.First());    // em produção, vem da configuração
    })
    .AddStandardResilienceHandler(opcoes =>
    {
        opcoes.Retry.MaxRetryAttempts = 3;
        opcoes.Retry.Delay = TimeSpan.FromMilliseconds(100);     // curto, para o exemplo
        opcoes.AttemptTimeout.Timeout = TimeSpan.FromSeconds(5); // por tentativa
        opcoes.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(20);
    });

var app = builder.Build();
app.Urls.Add("http://127.0.0.1:0");

// A rota recebe o cliente por injeção e repassa o token de cancelamento
app.MapPost("/armadilhas/{id:int}/contar", async (int id, HttpRequest pedido, ClienteDeInferencia cliente, CancellationToken ct) =>
{
    using var memoria = new MemoryStream();
    await pedido.Body.CopyToAsync(memoria, ct);

    var resultado = await cliente.InferirAsync(memoria.ToArray(), ct);
    return new
    {
        armadilhaId = id,
        resultado.TotalInsetos,
        porClasse = resultado.Deteccoes.GroupBy(d => d.Classe).ToDictionary(g => g.Key, g => g.Count()),
        resultado.VersaoDoModelo,
    };
});
await app.StartAsync();

// ---------- o aplicativo, imitado ----------
var http = new HttpClient { BaseAddress = new Uri(app.Urls.First()) };
var foto = new ByteArrayContent(new byte[2048]);
foto.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");

var resposta = await http.PostAsync("/armadilhas/14/contar", foto);
Console.WriteLine($"status: {(int)resposta.StatusCode}");
Console.WriteLine(await resposta.Content.ReadAsStringAsync());
Console.WriteLine($"chamadas que o serviço de inferência recebeu: {chamadas}");

await app.StopAsync();
await inferencia.StopAsync();

// ---------- o contrato e o cliente ----------
record Deteccao(string Classe, double Confianca, int[] Caixa);
record ResultadoDaInferencia(int TotalInsetos, double TempoMs, string VersaoDoModelo, long BytesRecebidos, Deteccao[] Deteccoes);

class ClienteDeInferencia(HttpClient http)
{
    // TotalInsetos <-> total_insetos
    private static readonly JsonSerializerOptions Json = new() { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower };

    public async Task<ResultadoDaInferencia> InferirAsync(byte[] foto, CancellationToken ct)
    {
        // multipart/form-data: o UploadFile do FastAPI
        using var formulario = new MultipartFormDataContent();
        var arquivo = new ByteArrayContent(foto);
        arquivo.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        formulario.Add(arquivo, "foto", "armadilha.jpg");

        using var resposta = await http.PostAsync("/inferir", formulario, ct);
        resposta.EnsureSuccessStatusCode();
        return await resposta.Content.ReadFromJsonAsync<ResultadoDaInferencia>(Json, ct)
            ?? throw new InvalidOperationException("resposta vazia do serviço de inferência");
    }
}`,
        },
        {
          t: 'texto',
          md: `O serviço falso recusou as duas primeiras chamadas com 503, e o aplicativo recebeu **200** mesmo assim: o manipulador de resiliência tentou de novo sozinho, e a terceira passou. O contador confirma as três chamadas.

\`AddStandardResilienceHandler\` (pacote \`Microsoft.Extensions.Http.Resilience\`, construído sobre a biblioteca Polly) empilha cinco proteções com padrões razoáveis:

| Camada | O que faz |
|---|---|
| Limite de taxa | não dispara mais chamadas simultâneas do que o configurado |
| Tempo limite total | teto para a operação inteira, somando as tentativas |
| Nova tentativa | repete em erro transitório (5xx, 408, 429, falha de rede), com espera crescente e aleatória |
| Disjuntor | depois de muitas falhas seguidas, para de chamar por um tempo e falha rápido |
| Tempo limite por tentativa | cada tentativa tem o seu teto |`,
        },
        {
          t: 'nota',
          estilo: 'pegadinha',
          md: `**Só repita o que é seguro repetir.** Inferência é idempotente: mandar a mesma foto duas vezes não causa dano. Um POST que **cria** uma captura não é: se a primeira tentativa gravou e a resposta se perdeu, a repetição grava de novo. Para esses, desligue a repetição ou use uma **chave de idempotência** (o cliente manda um identificador único e o servidor ignora o que já viu). É o mesmo cuidado da fila offline da trilha de React Native.`,
        },
        {
          t: 'texto',
          md: `### E quando a inferência demora?

Chamar e esperar funciona enquanto a resposta vem em poucos segundos. Com fila na GPU ou lote grande, o desenho muda: a API grava a captura como **pendente**, publica uma mensagem numa fila (Service Bus ou fila de armazenamento, na trilha de Azure) e responde **202 Accepted** na hora. Um trabalhador consome a fila, chama a inferência e grava o resultado. O aplicativo consulta a situação depois. No .NET, esse trabalhador é um \`BackgroundService\`.`,
        },
        {
          t: 'codigo',
          titulo: 'Um trabalhador em segundo plano (para ler)',
          lang: 'csharp',
          codigo: cs`// builder.Services.AddHostedService<ProcessadorDeCapturas>();

class ProcessadorDeCapturas(IServiceScopeFactory escopos, ILogger<ProcessadorDeCapturas> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        // roda enquanto a aplicação estiver de pé; o token avisa do desligamento
        while (!ct.IsCancellationRequested)
        {
            // Serviço em segundo plano é singleton: cria um escopo para usar o DbContext
            await using var escopo = escopos.CreateAsyncScope();
            var db = escopo.ServiceProvider.GetRequiredService<Banco>();
            var inferencia = escopo.ServiceProvider.GetRequiredService<ClienteDeInferencia>();

            var pendentes = await db.Capturas
                .Where(c => c.Situacao == Situacao.Pendente)
                .OrderBy(c => c.RecebidaEm)
                .Take(8)
                .ToListAsync(ct);

            foreach (var captura in pendentes)
            {
                try
                {
                    var resultado = await inferencia.InferirAsync(captura.Foto, ct);
                    captura.Concluir(resultado.TotalInsetos, resultado.VersaoDoModelo);
                }
                catch (HttpRequestException e)
                {
                    log.LogWarning(e, "Inferência falhou para a captura {Id}", captura.Id);
                    captura.RegistrarFalha();
                }
            }

            await db.SaveChangesAsync(ct);
            if (pendentes.Count == 0) await Task.Delay(TimeSpan.FromSeconds(5), ct);
        }
    }
}`,
        },
        {
          t: 'quiz',
          pergunta: 'Por que registrar o cliente com `AddHttpClient<ClienteDeInferencia>()` em vez de dar `new HttpClient()` em cada chamada?',
          opcoes: [
            'Porque `new HttpClient()` não compila numa API.',
            'Porque criar e descartar clientes a cada chamada esgota as portas de rede sob carga; a fábrica reaproveita as conexões e as renova de tempos em tempos.',
            'Porque fica mais curto de escrever.',
            'Porque a fábrica criptografa as chamadas.',
          ],
          correta: 1,
          explicacao: 'Cada `HttpClient` descartado deixa conexões em estado de espera por minutos. A `IHttpClientFactory` mantém um conjunto de manipuladores reaproveitáveis e ainda é o ponto onde se encaixam resiliência, cabeçalhos padrão e registro.',
        },
        {
          t: 'quiz',
          pergunta: 'Em qual chamada a repetição automática é perigosa?',
          opcoes: [
            'GET que lista armadilhas.',
            'POST que pede a contagem de uma foto.',
            'POST que registra uma nova captura no banco, sem chave de idempotência.',
            'GET que confere a saúde do serviço.',
          ],
          correta: 2,
          explicacao: 'Se a primeira tentativa gravou e só a resposta se perdeu, repetir duplica o registro. Leitura e inferência podem repetir à vontade.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'autenticacao-e-entrega',
      titulo: 'Autenticação, autorização e o que falta para produção',
      minutos: 14,
      resumo: 'Tokens JWT, políticas por papel, o caminho com o Entra ID e a lista do que uma API precisa antes de ir ao ar.',
      blocos: [
        {
          t: 'texto',
          md: `Duas perguntas diferentes, dois middlewares:

- **Autenticação** — *quem é?* Lê a credencial da requisição e monta a identidade (\`ClaimsPrincipal\`). Falhou: **401**.
- **Autorização** — *pode fazer isto?* Olha a identidade e decide. Negou: **403**.

Numa API, a credencial é um **token JWT** no cabeçalho \`Authorization: Bearer ...\`. O token é um JSON assinado com três partes: cabeçalho, **declarações** (*claims*: quem é, papéis, validade) e assinatura. A API não consulta ninguém a cada requisição: ela confere a assinatura, a validade, o emissor e a audiência.

No bloco, o próprio programa emite os tokens com uma chave simétrica, para dar para ver tudo. Em produção quem emite é um **provedor de identidade**, e a API só valida.`,
        },
        {
          t: 'codigo',
          titulo: 'JWT, papéis e políticas',
          rodar: 'csharp',
          lang: 'csharp',
          tempo: 180,
          codigo: cs`#:sdk Microsoft.NET.Sdk.Web
#:property PublishAot=false
#:package Microsoft.AspNetCore.Authentication.JwtBearer@10.*
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

// Chave só para este exemplo. Chave de verdade não fica no código.
var chave = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("chave-de-exemplo-apenas-para-o-laboratorio-0001"));

var builder = WebApplication.CreateBuilder(args);
builder.Logging.ClearProviders();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opcoes => opcoes.TokenValidationParameters = new()
    {
        ValidIssuer = "laboratorio",
        ValidAudience = "api-de-armadilhas",
        IssuerSigningKey = chave,
        ClockSkew = TimeSpan.Zero,          // sem tolerância de relógio, para o exemplo do token vencido
    });

builder.Services.AddAuthorizationBuilder()
    .AddPolicy("gestor", politica => politica.RequireRole("gestor"))
    .AddPolicy("mesma-usina", politica => politica.RequireAssertion(contexto =>
        contexto.Resource is HttpContext http &&
        http.Request.RouteValues["usina"]?.ToString() == contexto.User.FindFirstValue("usina")));

var app = builder.Build();
app.Urls.Add("http://127.0.0.1:0");
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/saude", () => "ok");                                           // aberta
app.MapGet("/eu", (ClaimsPrincipal usuario) =>
    $"{usuario.Identity!.Name}, usina {usuario.FindFirstValue("usina")}").RequireAuthorization();
app.MapDelete("/capturas/{id:int}", (int id) => Results.NoContent()).RequireAuthorization("gestor");
app.MapGet("/usinas/{usina}/capturas", (string usina) => $"capturas da usina {usina}").RequireAuthorization("mesma-usina");

await app.StartAsync();
var http = new HttpClient { BaseAddress = new Uri(app.Urls.First()) };

string Emitir(string nome, string papel, string usina, int validadeEmMinutos = 5) =>
    new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
    {
        Issuer = "laboratorio",
        Audience = "api-de-armadilhas",
        NotBefore = DateTime.UtcNow.AddMinutes(-10),
        Expires = DateTime.UtcNow.AddMinutes(validadeEmMinutos),
        Subject = new ClaimsIdentity([new(ClaimTypes.Name, nome), new(ClaimTypes.Role, papel), new("usina", usina)]),
        SigningCredentials = new SigningCredentials(chave, SecurityAlgorithms.HmacSha256),
    });

async Task Chamar(string descricao, string metodo, string caminho, string? token = null)
{
    var pedido = new HttpRequestMessage(new HttpMethod(metodo), caminho);
    if (token is not null) pedido.Headers.Authorization = new("Bearer", token);
    var resposta = await http.SendAsync(pedido);
    var corpo = await resposta.Content.ReadAsStringAsync();
    Console.WriteLine($"{descricao,-34} {metodo,-6} {caminho,-22} -> {(int)resposta.StatusCode} {corpo}");
}

var marina = Emitir("marina", "tecnico", usina: "1");
var rute = Emitir("rute", "gestor", usina: "2");

Console.WriteLine($"um token tem {marina.Split('.').Length} partes e {marina.Length} caracteres\n");

await Chamar("rota aberta, sem token", "GET", "/saude");
await Chamar("rota protegida, sem token", "GET", "/eu");
await Chamar("com token", "GET", "/eu", marina);
await Chamar("técnica tenta apagar", "DELETE", "/capturas/7", marina);
await Chamar("gestora apaga", "DELETE", "/capturas/7", rute);
await Chamar("Marina na usina dela", "GET", "/usinas/1/capturas", marina);
await Chamar("Marina em outra usina", "GET", "/usinas/2/capturas", marina);
await Chamar("token adulterado", "GET", "/eu", marina[..^3] + "abc");
await Chamar("token vencido", "GET", "/eu", Emitir("marina", "tecnico", "1", validadeEmMinutos: -1));

await app.StopAsync();`,
        },
        {
          t: 'texto',
          md: `Leia a coluna de status:

- **401** quando não há token, quando a assinatura não confere e quando o token venceu. A API não sabe quem é.
- **403** quando sabe quem é e a regra nega: a técnica não é gestora; a Marina é da usina 1 e pediu dados da usina 2.

A política \`mesma-usina\` é a que mais importa num sistema com vários clientes: **papel não basta**. Sem conferir que o recurso pertence a quem pede, qualquer usuário autenticado lê os dados dos outros trocando um número na URL. É a falha mais comum em API (a "referência direta insegura a objeto"). O filtro por cliente também precisa estar na **consulta ao banco**, e não só na rota.`,
        },
        {
          t: 'nota',
          estilo: 'pegadinha',
          md: `**O conteúdo de um JWT não é secreto.** As duas primeiras partes são só Base64: qualquer um lê. A assinatura impede **alterar**, não ler. Não ponha dado sensível no token. E prefira tokens de vida curta (minutos): um JWT vazado vale até vencer, porque a API não consulta ninguém para saber se foi revogado.`,
        },
        {
          t: 'texto',
          md: `### Em produção: Microsoft Entra ID

Você não escreve tela de login nem guarda senha. O **Entra ID** (o provedor de identidade da Azure) autentica o usuário e emite o token; o aplicativo React ou React Native obtém o token com a biblioteca MSAL; a API valida. A configuração troca a chave simétrica pelo endereço do emissor, de onde a API baixa as chaves públicas sozinha.`,
        },
        {
          t: 'codigo',
          titulo: 'Validando tokens do Entra ID (para ler)',
          lang: 'csharp',
          codigo: cs`// dotnet add package Microsoft.Identity.Web

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddMicrosoftIdentityWebApi(builder.Configuration.GetSection("AzureAd"));

// Toda rota exige usuário autenticado, a menos que diga o contrário.
// Esquecer um RequireAuthorization deixa de ser uma falha de segurança.
builder.Services.AddAuthorizationBuilder()
    .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build())
    .AddPolicy("gestor", politica => politica.RequireRole("Armadilhas.Gestor"));

app.MapGet("/saude", () => "ok").AllowAnonymous();

// appsettings.json  (nada disto é segredo)
// "AzureAd": {
//   "Instance": "https://login.microsoftonline.com/",
//   "TenantId": "<id do diretório>",
//   "ClientId": "<id do registro da API>",
//   "Audience": "api://<id do registro da API>"
// }`,
        },
        {
          t: 'tabela',
          titulo: 'O que uma API precisa antes de ir ao ar',
          colunas: ['Item', 'Como no ASP.NET Core', 'Onde aprofundar'],
          linhas: [
            ['Verificação de saúde', '`AddHealthChecks().AddDbContextCheck<Banco>()` + `MapHealthChecks("/saude")`', 'Azure: sondas do Container Apps'],
            ['Log estruturado', '`ILogger<T>` com modelo de mensagem: `log.LogInformation("Captura {Id} em {Ms} ms", id, ms)`', 'Azure: observabilidade'],
            ['Rastreio e métricas', 'OpenTelemetry (`AddOpenTelemetry()`), exportando para o Application Insights', 'Azure: observabilidade'],
            ['Limite de requisições', '`AddRateLimiter` + `UseRateLimiter`, por usuário ou por IP', 'esta trilha: pipeline'],
            ['CORS', '`AddCors` com as origens do painel, nunca `AllowAnyOrigin` com credenciais', 'React: dados do servidor'],
            ['Segredos fora do código', 'identidade gerenciada; Key Vault quando houver segredo', 'Azure: identidade'],
            ['Contêiner', '`dotnet publish` num Dockerfile de dois estágios, usuário sem privilégio', 'Azure: contêineres'],
            ['Migração do banco', 'passo próprio no pipeline, antes de trocar a versão', 'Azure: pipelines'],
            ['Desligamento limpo', 'repassar `CancellationToken`; o ASP.NET Core espera as requisições em curso', 'esta trilha: async'],
          ],
        },
        {
          t: 'quiz',
          pergunta: 'Um usuário autenticado como técnico chama uma rota que exige o papel de gestor. Qual é o status correto?',
          opcoes: ['401 Unauthorized', '403 Forbidden', '404 Not Found', '400 Bad Request'],
          correta: 1,
          explicacao: '401 é "não sei quem você é" (sem token, ou token inválido). 403 é "sei quem você é, e você não pode".',
        },
        {
          t: 'quiz',
          pergunta: 'A rota `GET /usinas/{id}/capturas` exige só `RequireAuthorization()`. Qual é o risco?',
          opcoes: [
            'Nenhum: o usuário está autenticado.',
            'Qualquer usuário autenticado lê as capturas de qualquer usina trocando o id na URL; falta conferir que a usina pertence a quem pede.',
            'O token vence mais rápido.',
            'A rota fica lenta.',
          ],
          correta: 1,
          explicacao: 'Autenticar não é autorizar o acesso a cada recurso. A conferência precisa existir na política e, de preferência, no filtro da própria consulta ao banco.',
        },
      ],
    },
  ],
};
