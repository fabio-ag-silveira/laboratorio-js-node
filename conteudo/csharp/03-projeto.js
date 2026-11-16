/**
 * Módulo 3 da trilha de C#: o projeto, que é a etapa 3 do projeto integrador
 * em miniatura.
 *
 * O programa é montado em três pedaços (preparação, rotas, conferências) para
 * que o ponto de partida e a solução compartilhem tudo menos as rotas. Copiar
 * o arquivo inteiro duas vezes faria as conferências divergirem na primeira
 * correção.
 *
 * As conferências rodam dentro do próprio programa, como cliente HTTP da API,
 * e o código de saída diz se passou. xUnit ficou de fora aqui porque ele traz
 * o próprio ponto de entrada, e este arquivo precisa do seu para subir a API.
 */

const cs = String.raw;

const PREPARACAO = cs`#:sdk Microsoft.NET.Sdk.Web
#:property PublishAot=false
#:package Microsoft.EntityFrameworkCore.Sqlite@10.*
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

const string ChaveInterna = "chave-do-servico-de-inferencia";   // em produção: identidade gerenciada

var conexao = new SqliteConnection("Data Source=:memory:");
conexao.Open();

var builder = WebApplication.CreateBuilder(args);
builder.Logging.ClearProviders();
builder.Services.AddProblemDetails();
builder.Services.AddDbContext<Banco>(opcoes => opcoes.UseSqlite(conexao));
builder.Services.ConfigureHttpJsonOptions(o => o.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

var app = builder.Build();
app.Urls.Add("http://127.0.0.1:0");
app.UseExceptionHandler();

using (var escopo = app.Services.CreateScope())
{
    var db = escopo.ServiceProvider.GetRequiredService<Banco>();
    db.Database.EnsureCreated();
    db.Armadilhas.AddRange(
        new Armadilha { Codigo = "SL-001", Ativa = true },      // id 1
        new Armadilha { Codigo = "SL-002", Ativa = false });    // id 2: desativada
    db.SaveChanges();
}
`;

const ROTAS_INICIAIS = cs`
// ======================= ROTAS: o seu trabalho é aqui =======================

app.MapPut("/capturas/{id:guid}", async (Guid id, NovaCaptura nova, Banco db, CancellationToken ct) =>
{
    var erros = new Dictionary<string, string[]>();
    if (nova.CapturadaEm > DateTime.UtcNow.AddMinutes(5)) erros["capturadaEm"] = ["não pode estar no futuro"];
    if (!await db.Armadilhas.AnyAsync(a => a.Id == nova.ArmadilhaId, ct)) erros["armadilhaId"] = ["armadilha inexistente"];
    // TAREFA 1: armadilha desativada também é 422, no campo armadilhaId.
    if (erros.Count > 0) return Results.ValidationProblem(erros, statusCode: 422);

    // TAREFA 2: o app reenvia quando a resposta se perde. Se já existe captura com este id:
    //   - mesmos dados     -> 200 com a captura (e nenhuma linha nova)
    //   - dados diferentes -> 409
    var captura = new Captura { Id = id, ArmadilhaId = nova.ArmadilhaId, CapturadaEm = nova.CapturadaEm, VersaoDoApp = nova.VersaoDoApp };
    db.Capturas.Add(captura);
    await db.SaveChangesAsync(ct);
    return Results.Created($"/capturas/{id}", Resumo.De(captura, 0));
});

app.MapGet("/capturas/{id:guid}", async (Guid id, Banco db, CancellationToken ct) =>
    await db.Capturas.AsNoTracking()
        .Where(c => c.Id == id)
        .Select(c => new Resumo(c.Id, c.ArmadilhaId, c.CapturadaEm, c.Situacao, c.Deteccoes.Count))
        .FirstOrDefaultAsync(ct) is { } resumo
            ? Results.Ok(resumo)
            : Results.NotFound());

app.MapGet("/capturas", async (Banco db, CancellationToken ct, int pagina = 1, int tamanho = 20) =>
{
    // TAREFA 3: paginar. Hoje devolve tudo, em qualquer ordem.
    var itens = await db.Capturas.AsNoTracking()
        .Select(c => new Resumo(c.Id, c.ArmadilhaId, c.CapturadaEm, c.Situacao, c.Deteccoes.Count))
        .ToListAsync(ct);
    return new Pagina(itens, itens.Count, pagina);
});

var interno = app.MapGroup("/interno");
// TAREFA 4: as rotas de /interno exigem o cabeçalho X-Chave-Interna com o valor de ChaveInterna (401 sem ele).

interno.MapPost("/capturas/{id:guid}/deteccoes", async (Guid id, ResultadoDaInferencia resultado, Banco db, CancellationToken ct) =>
{
    var captura = await db.Capturas.FirstOrDefaultAsync(c => c.Id == id, ct);
    if (captura is null) return Results.NotFound();

    // TAREFA 5: se esta versão do modelo já gravou detecções para a captura -> 409.
    // TAREFA 6: gravar as detecções E marcar a captura como Processada, tudo ou nada.
    foreach (var d in resultado.Deteccoes)
        db.Deteccoes.Add(new Deteccao { CapturaId = id, VersaoDoModelo = resultado.VersaoDoModelo, Classe = d.Classe, Confianca = d.Confianca });
    await db.SaveChangesAsync(ct);
    return Results.NoContent();
});
`;

const ROTAS_DA_SOLUCAO = cs`
// ================================ ROTAS ================================

app.MapPut("/capturas/{id:guid}", async (Guid id, NovaCaptura nova, Banco db, CancellationToken ct) =>
{
    var erros = new Dictionary<string, string[]>();
    if (nova.CapturadaEm > DateTime.UtcNow.AddMinutes(5)) erros["capturadaEm"] = ["não pode estar no futuro"];

    var armadilha = await db.Armadilhas.AsNoTracking().FirstOrDefaultAsync(a => a.Id == nova.ArmadilhaId, ct);
    if (armadilha is null) erros["armadilhaId"] = ["armadilha inexistente"];
    else if (!armadilha.Ativa) erros["armadilhaId"] = ["armadilha desativada"];

    if (erros.Count > 0) return Results.ValidationProblem(erros, statusCode: 422);

    // Idempotência: o mesmo id com os mesmos dados é a MESMA captura chegando de novo
    var existente = await db.Capturas.AsNoTracking()
        .Where(c => c.Id == id)
        .Select(c => new { Captura = c, Deteccoes = c.Deteccoes.Count })
        .FirstOrDefaultAsync(ct);

    if (existente is not null)
    {
        bool identica = existente.Captura.ArmadilhaId == nova.ArmadilhaId
            && existente.Captura.CapturadaEm == nova.CapturadaEm
            && existente.Captura.VersaoDoApp == nova.VersaoDoApp;

        return identica
            ? Results.Ok(Resumo.De(existente.Captura, existente.Deteccoes))
            : Results.Problem(title: "Já existe outra captura com este identificador", statusCode: 409);
    }

    var captura = new Captura { Id = id, ArmadilhaId = nova.ArmadilhaId, CapturadaEm = nova.CapturadaEm, VersaoDoApp = nova.VersaoDoApp };
    db.Capturas.Add(captura);
    await db.SaveChangesAsync(ct);
    return Results.Created($"/capturas/{id}", Resumo.De(captura, 0));
});

app.MapGet("/capturas/{id:guid}", async (Guid id, Banco db, CancellationToken ct) =>
    await db.Capturas.AsNoTracking()
        .Where(c => c.Id == id)
        .Select(c => new Resumo(c.Id, c.ArmadilhaId, c.CapturadaEm, c.Situacao, c.Deteccoes.Count))
        .FirstOrDefaultAsync(ct) is { } resumo
            ? Results.Ok(resumo)
            : Results.NotFound());

app.MapGet("/capturas", async (Banco db, CancellationToken ct, int pagina = 1, int tamanho = 20) =>
{
    pagina = Math.Max(pagina, 1);
    tamanho = Math.Clamp(tamanho, 1, 100);            // o cliente não escolhe trazer a tabela inteira

    var consulta = db.Capturas.AsNoTracking();
    int total = await consulta.CountAsync(ct);
    var itens = await consulta
        .OrderByDescending(c => c.CapturadaEm).ThenBy(c => c.Id)     // sem ordem estável, página não significa nada
        .Skip((pagina - 1) * tamanho)
        .Take(tamanho)
        .Select(c => new Resumo(c.Id, c.ArmadilhaId, c.CapturadaEm, c.Situacao, c.Deteccoes.Count))
        .ToListAsync(ct);
    return new Pagina(itens, total, pagina);
});

// Um filtro no grupo protege todas as rotas internas, as de hoje e as futuras
var interno = app.MapGroup("/interno").AddEndpointFilter(async (contexto, proximo) =>
    contexto.HttpContext.Request.Headers["X-Chave-Interna"] == ChaveInterna
        ? await proximo(contexto)
        : Results.Unauthorized());

interno.MapPost("/capturas/{id:guid}/deteccoes", async (Guid id, ResultadoDaInferencia resultado, Banco db, CancellationToken ct) =>
{
    var captura = await db.Capturas.FirstOrDefaultAsync(c => c.Id == id, ct);
    if (captura is null) return Results.NotFound();

    if (await db.Deteccoes.AnyAsync(d => d.CapturaId == id && d.VersaoDoModelo == resultado.VersaoDoModelo, ct))
        return Results.Problem(title: "Esta versão do modelo já processou a captura", statusCode: 409);

    foreach (var d in resultado.Deteccoes)
        db.Deteccoes.Add(new Deteccao { CapturaId = id, VersaoDoModelo = resultado.VersaoDoModelo, Classe = d.Classe, Confianca = d.Confianca });
    captura.Situacao = Situacao.Processada;

    // Um único SaveChanges é uma transação: as detecções e a situação entram juntas, ou nada entra
    await db.SaveChangesAsync(ct);
    return Results.NoContent();
});
`;

const CONFERENCIAS = cs`
// ============================ CONFERÊNCIAS ============================
// Daqui para baixo não é para alterar: é o "aplicativo" e o "serviço de inferência" usando a API.

await app.StartAsync();
var http = new HttpClient { BaseAddress = new Uri(app.Urls.First()) };
int falhas = 0;

void Conferir(string descricao, bool passou, string obtido = "")
{
    if (!passou) falhas++;
    Console.WriteLine($"{(passou ? "ok    " : "FALHOU")} {descricao}{(passou || obtido == "" ? "" : $"  (obtido: {obtido})")}");
}

async Task<(int Status, JsonElement Corpo)> Enviar(HttpMethod metodo, string caminho, object? corpo = null, string? chave = null)
{
    var pedido = new HttpRequestMessage(metodo, caminho);
    if (corpo is not null) pedido.Content = JsonContent.Create(corpo);
    if (chave is not null) pedido.Headers.Add("X-Chave-Interna", chave);
    var resposta = await http.SendAsync(pedido);
    var texto = await resposta.Content.ReadAsStringAsync();
    JsonElement json = default;
    try { if (texto != "") json = JsonDocument.Parse(texto).RootElement; } catch (JsonException) { }
    return ((int)resposta.StatusCode, json);
}

string Campo(JsonElement json, string nome) =>
    json.ValueKind == JsonValueKind.Object && json.TryGetProperty(nome, out var valor) ? valor.ToString() : "(ausente)";

var id = Guid.Parse("0193b3a0-0000-7000-8000-000000000001");
var captura = new { armadilhaId = 1, capturadaEm = "2026-11-10T14:30:00Z", versaoDoApp = "1.4.0" };

var r = await Enviar(HttpMethod.Put, $"/capturas/{id}", captura);
Conferir("PUT de captura nova responde 201", r.Status == 201, r.Status.ToString());

r = await Enviar(HttpMethod.Put, $"/capturas/{id}", captura);
Conferir("PUT repetido, idêntico, responde 200", r.Status == 200, r.Status.ToString());

r = await Enviar(HttpMethod.Get, "/capturas");
Conferir("... e não criou outra linha", Campo(r.Corpo, "total") == "1", Campo(r.Corpo, "total"));

r = await Enviar(HttpMethod.Put, $"/capturas/{id}", new { armadilhaId = 1, capturadaEm = "2026-11-11T08:00:00Z", versaoDoApp = "1.4.0" });
Conferir("PUT com o mesmo id e dados diferentes responde 409", r.Status == 409, r.Status.ToString());

r = await Enviar(HttpMethod.Put, $"/capturas/{Guid.NewGuid()}", new { armadilhaId = 99, capturadaEm = "2026-11-10T14:30:00Z", versaoDoApp = "1.4.0" });
Conferir("armadilha inexistente responde 422, apontando o campo",
    r.Status == 422 && Campo(r.Corpo, "errors").Contains("armadilhaId"), $"{r.Status} {Campo(r.Corpo, "errors")}");

r = await Enviar(HttpMethod.Put, $"/capturas/{Guid.NewGuid()}", new { armadilhaId = 2, capturadaEm = "2026-11-10T14:30:00Z", versaoDoApp = "1.4.0" });
Conferir("armadilha desativada responde 422", r.Status == 422, r.Status.ToString());

r = await Enviar(HttpMethod.Put, $"/capturas/{Guid.NewGuid()}", new { armadilhaId = 1, capturadaEm = "2099-01-01T00:00:00Z", versaoDoApp = "1.4.0" });
Conferir("data no futuro responde 422", r.Status == 422, r.Status.ToString());

r = await Enviar(HttpMethod.Get, $"/capturas/{Guid.NewGuid()}");
Conferir("GET de captura inexistente responde 404", r.Status == 404, r.Status.ToString());

r = await Enviar(HttpMethod.Get, $"/capturas/{id}");
Conferir("captura nova está AguardandoInferencia", Campo(r.Corpo, "situacao") == "AguardandoInferencia", Campo(r.Corpo, "situacao"));

var resultado = new
{
    versaoDoModelo = "yolo26s-armadilhas-v7",
    deteccoes = new[]
    {
        new { classe = "mosca-branca", confianca = 0.91 },
        new { classe = "mosca-branca", confianca = 0.84 },
        new { classe = "tripes", confianca = 0.62 },
    },
};

r = await Enviar(HttpMethod.Post, $"/interno/capturas/{id}/deteccoes", resultado);
Conferir("rota interna sem a chave responde 401", r.Status == 401, r.Status.ToString());

r = await Enviar(HttpMethod.Post, $"/interno/capturas/{id}/deteccoes", resultado, ChaveInterna);
Conferir("rota interna com a chave grava e responde 204", r.Status == 204, r.Status.ToString());

r = await Enviar(HttpMethod.Get, $"/capturas/{id}");
Conferir("captura passou a Processada, com 3 insetos",
    Campo(r.Corpo, "situacao") == "Processada" && Campo(r.Corpo, "insetos") == "3", $"{Campo(r.Corpo, "situacao")}, {Campo(r.Corpo, "insetos")} insetos");

r = await Enviar(HttpMethod.Post, $"/interno/capturas/{id}/deteccoes", resultado, ChaveInterna);
Conferir("o mesmo resultado, da mesma versão do modelo, responde 409", r.Status == 409, r.Status.ToString());

r = await Enviar(HttpMethod.Get, $"/capturas/{id}");
Conferir("... e as detecções não duplicaram", Campo(r.Corpo, "insetos") == "3", Campo(r.Corpo, "insetos"));

r = await Enviar(HttpMethod.Post, $"/interno/capturas/{Guid.NewGuid()}/deteccoes", resultado, ChaveInterna);
Conferir("resultado para captura inexistente responde 404", r.Status == 404, r.Status.ToString());

// mais duas capturas, para a paginação
await Enviar(HttpMethod.Put, $"/capturas/{Guid.Parse("0193b3a0-0000-7000-8000-000000000002")}", new { armadilhaId = 1, capturadaEm = "2026-11-12T09:00:00Z", versaoDoApp = "1.4.0" });
await Enviar(HttpMethod.Put, $"/capturas/{Guid.Parse("0193b3a0-0000-7000-8000-000000000003")}", new { armadilhaId = 1, capturadaEm = "2026-11-14T09:00:00Z", versaoDoApp = "1.4.0" });

r = await Enviar(HttpMethod.Get, "/capturas?pagina=1&tamanho=2");
bool paginou = r.Corpo.ValueKind == JsonValueKind.Object && r.Corpo.GetProperty("itens").GetArrayLength() == 2 && Campo(r.Corpo, "total") == "3";
Conferir("página 1 de tamanho 2 traz 2 itens e total 3", paginou);
Conferir("... começando pela captura mais recente",
    paginou && r.Corpo.GetProperty("itens")[0].GetProperty("capturadaEm").GetString()!.StartsWith("2026-11-14"));

r = await Enviar(HttpMethod.Get, "/capturas?pagina=2&tamanho=2");
Conferir("página 2 traz o item que sobrou",
    r.Corpo.ValueKind == JsonValueKind.Object && r.Corpo.GetProperty("itens").GetArrayLength() == 1);

await app.StopAsync();
Console.WriteLine(falhas == 0 ? "\nTudo certo: a API cumpre o contrato." : $"\n{falhas} conferência(s) falharam.");
return falhas == 0 ? 0 : 1;

// ============================ CONTRATO E MODELO ============================
record NovaCaptura(int ArmadilhaId, DateTime CapturadaEm, string VersaoDoApp);
record DeteccaoRecebida(string Classe, double Confianca);
record ResultadoDaInferencia(string VersaoDoModelo, DeteccaoRecebida[] Deteccoes);

record Resumo(Guid Id, int ArmadilhaId, DateTime CapturadaEm, Situacao Situacao, int Insetos)
{
    public static Resumo De(Captura c, int insetos) => new(c.Id, c.ArmadilhaId, c.CapturadaEm, c.Situacao, insetos);
}

record Pagina(List<Resumo> Itens, int Total, int Numero);

enum Situacao { AguardandoInferencia, Processada }

class Armadilha
{
    public int Id { get; set; }
    public required string Codigo { get; set; }
    public bool Ativa { get; set; }
}

class Captura
{
    public Guid Id { get; set; }                       // gerado no aparelho
    public int ArmadilhaId { get; set; }
    public Armadilha Armadilha { get; set; } = null!;
    public DateTime CapturadaEm { get; set; }
    public required string VersaoDoApp { get; set; }
    public Situacao Situacao { get; set; }
    public List<Deteccao> Deteccoes { get; } = [];
}

class Deteccao
{
    public long Id { get; set; }
    public Guid CapturaId { get; set; }
    public required string VersaoDoModelo { get; set; }
    public required string Classe { get; set; }
    public double Confianca { get; set; }
}

class Banco(DbContextOptions<Banco> opcoes) : DbContext(opcoes)
{
    public DbSet<Armadilha> Armadilhas => Set<Armadilha>();
    public DbSet<Captura> Capturas => Set<Captura>();
    public DbSet<Deteccao> Deteccoes => Set<Deteccao>();

    protected override void OnModelCreating(ModelBuilder modelo) =>
        modelo.Entity<Captura>().Property(c => c.Id).ValueGeneratedNever();   // o id vem do cliente
}`;

export const projeto = {
  id: 'projeto',
  titulo: 'Projeto',
  cor: '#5b8def',
  licoes: [
    {
      id: 'api-de-capturas',
      titulo: 'Projeto: a API de capturas',
      minutos: 60,
      resumo: 'Uma API com banco, idempotência, rota interna protegida e paginação, até dezoito conferências passarem. É o núcleo da etapa 3 do projeto integrador.',
      blocos: [
        {
          t: 'texto',
          md: `Este é o centro do sistema: a API que o aplicativo de campo e o serviço de inferência usam. O contrato é um recorte do **projeto integrador**.

| Rota | Quem chama | Respostas |
|---|---|---|
| \`PUT /capturas/{id}\` | o app; o \`id\` é um UUID gerado no aparelho | 201 criada · 200 já existia, idêntica · 409 já existia, diferente · 422 inválida |
| \`GET /capturas/{id}\` | app e painel | 200 · 404 |
| \`GET /capturas?pagina=&tamanho=\` | painel | 200, paginada, da mais recente para a mais antiga |
| \`POST /interno/capturas/{id}/deteccoes\` | o serviço de inferência, com a chave no cabeçalho \`X-Chave-Interna\` | 204 · 401 sem a chave · 404 · 409 se esta versão do modelo já processou |

O programa abaixo já sobe, tem o modelo, o banco (SQLite em memória) e as rotas no caminho feliz. Faltam seis tarefas, marcadas com \`TAREFA\` no código. No fim do arquivo, um cliente exercita a API e imprime uma linha por conferência.

Rode primeiro como está e leia quais conferências falham. Depois resolva uma tarefa por vez, rodando a cada passo.`,
        },
        {
          t: 'tabela',
          titulo: 'As seis tarefas',
          colunas: ['Tarefa', 'O que fazer', 'Lição que ajuda'],
          linhas: [
            ['1', 'Armadilha desativada é entrada inválida: 422 no campo `armadilhaId`', 'Validação, erros e o pipeline'],
            ['2', '`PUT` repetido: 200 se os dados são os mesmos, 409 se são outros; nunca uma segunda linha', 'Chamando o serviço de inferência (idempotência)'],
            ['3', 'Paginar a lista: ordem estável, `Skip`/`Take`, e o total vindo de uma contagem', 'EF Core: do LINQ ao SQL'],
            ['4', 'Proteger tudo que está em `/interno` com um filtro no grupo', 'Validação, erros e o pipeline (filtro de rota)'],
            ['5', 'Resultado repetido da mesma versão do modelo: 409, sem gravar', 'EF Core na prática'],
            ['6', 'Gravar as detecções e marcar a captura como `Processada` na mesma transação', 'EF Core na prática'],
          ],
        },
        {
          t: 'codigo',
          titulo: 'API de capturas: complete até todas as conferências passarem',
          rodar: 'csharp',
          lang: 'csharp',
          tempo: 240,
          esperaFalha: true,
          codigo: PREPARACAO + ROTAS_INICIAIS + CONFERENCIAS,
        },
        {
          t: 'nota',
          estilo: 'dica',
          md: `**Leia as falhas como pistas.** O \`PUT\` repetido responde 500 no ponto de partida: é a violação de chave primária do banco, que estourou como exceção e foi convertida em resposta genérica pelo \`UseExceptionHandler\`. Um 500 quase sempre significa "um caso previsível que o código não previu". Tente antes de abrir a solução abaixo.`,
        },
        {
          t: 'codigo',
          titulo: 'Uma solução',
          rodar: 'csharp',
          lang: 'csharp',
          tempo: 240,
          codigo: PREPARACAO + ROTAS_DA_SOLUCAO + CONFERENCIAS,
        },
        {
          t: 'texto',
          md: `### O que a solução decide

- **Validar antes de olhar a idempotência.** Uma requisição inválida é inválida mesmo se repetida.
- **Comparar os dados para distinguir 200 de 409.** "O mesmo \`id\` de novo" só é a mesma captura se o conteúdo bate. Dados diferentes com o mesmo identificador indicam defeito no cliente, e o servidor não deve escolher um lado em silêncio.
- **Um filtro no grupo \`/interno\`**, e não um \`if\` em cada rota. A rota interna que alguém criar no mês que vem já nasce protegida.
- **Um \`SaveChanges\` para as detecções e para a situação.** Se cair no meio, o banco não fica com detecções gravadas e captura "aguardando".
- **Limite no tamanho da página.** Sem o \`Clamp\`, \`?tamanho=1000000\` vira uma forma de derrubar a API.

### O que falta para ser a etapa 3 de verdade

Este exercício cabe num arquivo. No projeto integrador, a mesma API precisa de mais:

| No exercício | No projeto |
|---|---|
| SQLite em memória, \`EnsureCreated\` | PostgreSQL com Npgsql, o esquema de \`projeto-integrador/banco\` e migrações |
| conferir "já existe?" e depois inserir | **também** capturar a violação de unicidade (\`DbUpdateException\` com \`SqlState\` 23505): duas requisições simultâneas passam juntas pela conferência, e só o banco decide |
| chave fixa num cabeçalho | identidade gerenciada do serviço de inferência, validada como token |
| conferências no próprio arquivo | xUnit com \`WebApplicationFactory\` e Testcontainers |
| um arquivo | projetos separados: API, domínio, testes |
| sem usuário | Entra ID, com o filtro por usina em toda consulta |`,
        },
        {
          t: 'quiz',
          pergunta: 'Por que conferir "já existe uma captura com este id?" antes de inserir não basta, sozinho, num sistema real?',
          opcoes: [
            'Porque a consulta é lenta.',
            'Porque duas requisições simultâneas com o mesmo id passam as duas pela conferência antes de qualquer uma inserir; a segunda inserção viola a chave. É preciso tratar também o erro de unicidade do banco.',
            'Porque UUID pode colidir com frequência.',
            'Porque o EF Core não permite consultar antes de inserir.',
          ],
          correta: 1,
          explicacao: 'Conferir e depois agir tem uma janela entre os dois passos. A restrição do banco é a única garantia; o código precisa transformar a violação (SQLSTATE 23505) na resposta certa, e não em 500.',
        },
        {
          t: 'quiz',
          pergunta: 'Por que a lista paginada precisa de um `OrderBy` com critério de desempate?',
          opcoes: [
            'Porque `Skip` não compila sem `OrderBy`.',
            'Porque sem ordem definida o banco pode devolver as linhas em qualquer sequência a cada consulta: um item aparece em duas páginas e outro em nenhuma.',
            'Porque fica mais rápido.',
            'Porque o JSON exige ordem.',
          ],
          correta: 1,
          explicacao: 'SQL não garante ordem sem `ORDER BY`. E se duas capturas têm a mesma data, só um segundo critério único (o id) torna a ordem estável entre uma página e a seguinte.',
        },
      ],
    },
  ],
};
