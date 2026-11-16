// Um "modelo" de brinquedo, igual nas duas lições de serviço: conta manchas
// escuras com OpenCV. O que importa aqui é o entorno, e não o modelo.
const DETECTOR = `import cv2, numpy as np

class Detector:
    """Faz o papel do modelo: carrega devagar, e detecta manchas escuras."""
    versao = "manchas-2026-11"

    def __init__(self) -> None:
        self.carregado = True                      # num modelo real: ler os pesos, mover para a GPU

    def detectar(self, imagem: np.ndarray) -> list[dict]:
        cinza = cv2.cvtColor(imagem, cv2.COLOR_BGR2GRAY)
        fundo = cv2.morphologyEx(cinza, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31)))
        _, binaria = cv2.threshold(cv2.subtract(fundo, cinza), 40, 255, cv2.THRESH_BINARY)
        n, _, estat, _ = cv2.connectedComponentsWithStats(binaria)
        return [{"caixa": [int(x), int(y), int(x + w), int(y + h)], "area": int(a)}
                for x, y, w, h, a in estat[1:n] if a >= 25]
`;

export const servico = {
  id: 'servico',
  titulo: 'Do modelo ao serviço',
  cor: '#f0c14b',
  licoes: [
    // ------------------------------------------------------------------
    {
      id: 'fastapi',
      titulo: 'FastAPI: a API de inferência, com testes',
      minutos: 14,
      resumo: 'Esquemas, ciclo de vida, injeção de dependência e upload. E o cliente de teste que exercita tudo sem subir servidor.',
      blocos: [
        {
          t: 'texto',
          md: `A trilha de visão mostrou um esqueleto de serviço de inferência para ler. Aqui ele **roda**, e é testado, dentro do bloco, com o cliente de teste do FastAPI: as requisições percorrem a aplicação inteira (rotas, validação, serialização) sem abrir uma porta.

As quatro ideias do FastAPI, com a ponte para o que você vai ver em C#:

| Ideia | No FastAPI | No ASP.NET |
|---|---|---|
| A rota é uma função tipada | \`@app.post("/detectar")\` + anotações | \`app.MapPost("/detectar", ...)\` |
| O tipo valida e documenta | modelos Pydantic → OpenAPI automático | records + validação → OpenAPI |
| Recursos de vida longa | \`lifespan\` | serviços *singleton* |
| Dependências declaradas | \`Depends(...)\` | injeção de dependência nativa |`,
        },
        {
          t: 'codigo',
          titulo: 'A API completa, exercitada pelo cliente de teste',
          rodar: 'python',
          requerPython: ['fastapi', 'httpx', 'cv2'],
          tempo: 120,
          codigo: `from contextlib import asynccontextmanager
from typing import Annotated
import time
from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile
from fastapi.testclient import TestClient
from pydantic import BaseModel, Field
import lab
${DETECTOR}
# ---- esquemas: o contrato da API ----------------------------------------------
class Deteccao(BaseModel):
    caixa: tuple[int, int, int, int] = Field(description="x1, y1, x2, y2, em pixels")
    area: int

class Resposta(BaseModel):
    versao_modelo: str
    largura: int
    altura: int
    ms: float
    total: int
    deteccoes: list[Deteccao]

# ---- ciclo de vida: o modelo carrega UMA vez, na subida -------------------------
estado: dict = {}

@asynccontextmanager
async def ciclo(app: FastAPI):
    estado["detector"] = Detector()
    yield                                           # a aplicação atende requisições aqui
    estado.clear()                                  # na descida: liberar GPU, fechar conexões

app = FastAPI(title="Inferência de armadilhas", lifespan=ciclo)

def obter_detector() -> Detector:                   # dependência: quem precisa do modelo, declara
    return estado["detector"]

LIMITE = 8 * 1024 * 1024

@app.get("/saude")
def saude() -> dict:
    return {"ok": "detector" in estado, "versao_modelo": Detector.versao}

@app.post("/detectar")
def detectar(arquivo: UploadFile,
             detector: Annotated[Detector, Depends(obter_detector)],
             area_minima: Annotated[int, Query(ge=0, le=10_000)] = 25) -> Resposta:
    dados = arquivo.file.read(LIMITE + 1)
    if len(dados) > LIMITE:
        raise HTTPException(413, "imagem maior que 8 MB")
    imagem = cv2.imdecode(np.frombuffer(dados, np.uint8), cv2.IMREAD_COLOR)
    if imagem is None:
        raise HTTPException(422, "o arquivo não é uma imagem que eu saiba ler")

    inicio = time.perf_counter()
    achadas = [d for d in detector.detectar(imagem) if d["area"] >= area_minima]
    return Resposta(versao_modelo=detector.versao, largura=imagem.shape[1], altura=imagem.shape[0],
                    ms=round((time.perf_counter() - inicio) * 1000, 2), total=len(achadas), deteccoes=achadas)

# ---- testes: a aplicação inteira, sem servidor ----------------------------------
img, gabarito, _ = lab.amostra_com_gabarito("armadilha", semente=3, insetos=20, detritos=0)
jpeg = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 92])[1].tobytes()

with TestClient(app) as cliente:                    # o "with" dispara o lifespan
    print("GET /saude                  ->", cliente.get("/saude").json())

    r = cliente.post("/detectar", files={"arquivo": ("a-01.jpg", jpeg, "image/jpeg")})
    corpo = r.json()
    print(f"POST /detectar              -> {r.status_code} | {corpo['total']} detecções (o gabarito tem {len(gabarito)}) | {corpo['largura']}x{corpo['altura']} | modelo {corpo['versao_modelo']}")

    r = cliente.post("/detectar?area_minima=150", files={"arquivo": ("a-01.jpg", jpeg, "image/jpeg")})
    print("POST /detectar?area_minima=150 ->", r.status_code, "|", r.json()["total"], "detecções")

    r = cliente.post("/detectar", files={"arquivo": ("nota.txt", b"isto nao e uma imagem", "text/plain")})
    print("arquivo que não é imagem    ->", r.status_code, r.json())

    r = cliente.post("/detectar?area_minima=-3", files={"arquivo": ("a-01.jpg", jpeg, "image/jpeg")})
    print("parâmetro inválido          ->", r.status_code, "|", r.json()["detail"][0]["msg"])

    r = cliente.post("/detectar")
    print("sem arquivo                 ->", r.status_code, "|", r.json()["detail"][0]["msg"])

esquema = app.openapi()
print("\\nrotas no OpenAPI:", list(esquema["paths"]), "| esquemas:", sorted(esquema["components"]["schemas"])[:4], "...")`,
        },
        {
          t: 'texto',
          md: `O que o cliente de teste mostrou:

- **A validação é do framework.** O parâmetro negativo e a falta do arquivo devolveram **422** com a explicação, sem uma linha de \`if\` escrita por você.
- **Os erros de negócio são seus.** "Não é imagem" e "grande demais" são \`HTTPException\`, com o código que o cliente precisa para decidir o que fazer.
- **O contrato é gerado.** O OpenAPI saiu das anotações. É dele que o painel em TypeScript e a API em C# geram clientes tipados, e é o que aparece em \`/docs\`.
- **\`response_model\` pelo tipo de retorno.** A função declara \`-> Resposta\`, e o FastAPI valida e filtra a saída: campo a mais não vaza.

### \`def\` ou \`async def\`

É a decisão que mais derruba serviços de inferência em FastAPI.

| A rota faz | Declare | Por quê |
|---|---|---|
| Inferência, OpenCV, NumPy: trabalho de **CPU ou GPU**, que bloqueia | \`def\` | o FastAPI roda a função num conjunto de threads; o laço de eventos continua livre |
| Só espera **rede ou disco**, com bibliotecas assíncronas (\`httpx\`, \`asyncpg\`) | \`async def\` | milhares de esperas simultâneas numa thread |
| \`async def\` com código que bloqueia dentro | **nunca** | trava o laço: enquanto uma inferência roda, o serviço não atende nem o \`/saude\` |

O bloco acima usa \`def\` de propósito. A próxima lição mede a diferença.`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Do exemplo à produção', ''],
          linhas: [
            ['Servidor', '`uvicorn inferencia.api:app --host 0.0.0.0 --port 8000`; com GPU, **um** processo por GPU'],
            ['Configuração', '`pydantic-settings`: lê variáveis de ambiente para um modelo tipado; nada fixo no código'],
            ['Limites', 'tamanho do corpo no proxy; tempo limite por requisição; fila com tamanho máximo, devolvendo 503 quando cheia'],
            ['Observabilidade', 'registro estruturado (JSON) com id da requisição; métricas de latência e de fila; OpenTelemetry'],
            ['Saúde', '`/saude` separado em "vivo" e "pronto": o orquestrador só manda tráfego depois de o modelo carregar'],
            ['Segurança', 'autenticação na borda (chave de API, JWT); nunca confiar no `content-type` nem no nome do arquivo'],
            ['Contêiner', 'imagem com a versão exata do CUDA; pesos fora da imagem, baixados na subida ou montados'],
            ['Testes', 'os deste bloco, mais o teste de paridade da trilha de visão: imagens fixas com a saída esperada'],
          ],
        },
        {
          t: 'quiz',
          pergunta: 'Onde o modelo deve ser carregado num serviço FastAPI?',
          opcoes: [
            'Dentro da função da rota, a cada requisição.',
            'No `lifespan`, uma vez na subida do processo, ficando disponível para as rotas por dependência.',
            'No import do módulo, sem controle.',
            'No cliente.',
          ],
          correta: 1,
          explicacao: 'Carregar pesos custa segundos e memória. O `lifespan` dá um ponto controlado para subir e para liberar recursos, e os testes conseguem dispará-lo.',
        },
        {
          t: 'quiz',
          pergunta: 'Uma rota `async def` chama `modelo(imagem)`, que leva 300 ms de GPU. O que acontece com as outras requisições nesse intervalo?',
          opcoes: [
            'São atendidas em paralelo.',
            'Ficam paradas: o código bloqueante dentro de `async def` ocupa o laço de eventos, e nada mais roda até ele terminar.',
            'São redirecionadas.',
            'Recebem 503 automaticamente.',
          ],
          correta: 1,
          explicacao: '`async` só ajuda quando a função cede o controle em um `await`. Trabalho de CPU ou GPU não cede. Declarar a rota com `def` manda a execução para uma thread.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'concorrencia',
      titulo: 'Concorrência: GIL, threads, processos e asyncio',
      minutos: 13,
      resumo: 'Qual ferramenta para qual gargalo, medido. E o lote dinâmico, que é como um serviço de GPU ganha vazão.',
      blocos: [
        {
          t: 'texto',
          md: `Python tem três modelos de concorrência, e escolher o errado não dá erro: dá um programa que não fica mais rápido.

A peça que decide é o **GIL** (*global interpreter lock*): no CPython padrão, só **uma thread por vez executa código Python**. Threads continuam úteis, porque o GIL é **solto** durante esperas de rede e disco, e dentro de muito código em C (NumPy, OpenCV, PyTorch).

| O gargalo é | Use | Por quê |
|---|---|---|
| **Esperar** rede ou disco, muitas vezes | \`asyncio\` (ou threads) | durante a espera ninguém precisa do processador |
| **Calcular em Python puro** | processos (\`ProcessPoolExecutor\`) | cada processo tem o seu interpretador e o seu GIL |
| **Calcular em NumPy, OpenCV, PyTorch** | threads, ou nada | as bibliotecas soltam o GIL e já usam vários núcleos por dentro |
| **GPU** | uma fila e **lotes** | a GPU é um recurso só: o ganho vem de agrupar, e não de paralelizar chamadas |

O bloco mede os três primeiros casos.`,
        },
        {
          t: 'codigo',
          titulo: 'O mesmo trabalho, quatro jeitos',
          rodar: 'python',
          requerPython: ['cv2'],
          tempo: 180,
          codigo: `import asyncio, time
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
import cv2, numpy as np

def esperar(_):                 # faz de conta que é uma chamada de rede de 200 ms
    time.sleep(0.2)

def python_puro(n):             # CPU em Python: o GIL fica preso o tempo todo
    total = 0
    for i in range(n):
        total += i * i % 7
    return total

def com_opencv(semente):        # CPU dentro de C: o OpenCV solta o GIL
    img = np.random.default_rng(semente).integers(0, 255, (1400, 1400), dtype=np.uint8)
    for _ in range(6):
        img = cv2.GaussianBlur(img, (21, 21), 0)
    return int(img.sum())

def cronometrar(f):
    t = time.perf_counter(); f(); return time.perf_counter() - t

def em_serie(funcao, args):      return lambda: [funcao(a) for a in args]
def em_threads(funcao, args):    return lambda: list(ThreadPoolExecutor(8).map(funcao, args))
def em_processos(funcao, args):
    def rodar():
        with ProcessPoolExecutor(4) as p:
            return list(p.map(funcao, args))
    return rodar

async def esperas_assincronas():
    await asyncio.gather(*[asyncio.sleep(0.2) for _ in range(8)])

if __name__ == "__main__":       # obrigatório com processos no Windows
    cv2.setNumThreads(1)         # para o OpenCV não paralelizar sozinho e confundir a medida

    linhas = []
    base = cronometrar(em_serie(esperar, range(8)))
    linhas.append(["8 esperas de 200 ms", f"{base:.2f} s", f"{cronometrar(em_threads(esperar, range(8))):.2f} s",
                   "-", f"{cronometrar(lambda: asyncio.run(esperas_assincronas())):.2f} s"])

    args = [6_000_000] * 4
    linhas.append(["4 cálculos em Python puro", f"{cronometrar(em_serie(python_puro, args)):.2f} s",
                   f"{cronometrar(em_threads(python_puro, args)):.2f} s",
                   f"{cronometrar(em_processos(python_puro, args)):.2f} s", "-"])

    args = range(4)
    linhas.append(["4 filtros no OpenCV", f"{cronometrar(em_serie(com_opencv, args)):.2f} s",
                   f"{cronometrar(em_threads(com_opencv, args)):.2f} s",
                   f"{cronometrar(em_processos(com_opencv, args)):.2f} s", "-"])

    import lab
    lab.tabela(linhas, cabecalho=["tarefa", "em série", "threads", "processos", "asyncio"])`,
        },
        {
          t: 'texto',
          md: `Leia a tabela por linha.

- **Esperas**: threads e \`asyncio\` fazem as oito ao mesmo tempo. O total cai para o tempo de uma.
- **Python puro**: threads **não ajudam** (o GIL deixa uma por vez). Processos ajudam, descontado o custo de criá-los, que no Windows é alto.
- **OpenCV**: threads ajudam, porque o trabalho pesado acontece em C, sem o GIL. Processos, com um trabalho curto como este, saem **mais lentos que a execução em série**: criar os processos e copiar as imagens entre eles custa mais que o cálculo.

A consequência para um serviço de visão: o pré-processamento em OpenCV e NumPy escala bem com **threads**. É por isso que rotas \`def\` do FastAPI, que rodam num conjunto de threads, funcionam para inferência.

### Python sem GIL

Desde o Python 3.13 existe uma variante **sem GIL** (*free-threaded*), e no 3.14 ela deixou de ser experimental. Com ela, threads rodam Python puro em paralelo. A adoção depende de cada biblioteca com código em C declarar suporte, e a variante é um pouco mais lenta em código de uma thread só. Em 2026, é para acompanhar e testar, e não para apostar um serviço de produção sem medir.

### GPU: o ganho está no lote

A lição de desempenho mediu: uma imagem por vez custa cerca de 2 ms cada; em lotes de 16, um oitavo disso. Um serviço que atende requisição por requisição desperdiça a GPU. O **lote dinâmico** junta as requisições que chegam num intervalo curto e as processa de uma vez.`,
        },
        {
          t: 'codigo',
          titulo: 'Lote dinâmico com asyncio',
          rodar: 'python',
          tempo: 120,
          codigo: `import asyncio, time

LOTE_MAX, ESPERA_MAX = 16, 0.010        # até 16 itens, ou 10 ms: o que vier primeiro

def modelo(lote: list[int]) -> list[int]:
    """Uma GPU de mentira: custo fixo por chamada, e pouco por item (como na lição de desempenho)."""
    time.sleep(0.004 + 0.0003 * len(lote))
    return [x * 2 for x in lote]

async def trabalhador(fila: asyncio.Queue, tamanhos: list[int]) -> None:
    laco = asyncio.get_running_loop()
    while True:
        itens = [await fila.get()]                               # espera o primeiro
        prazo = laco.time() + ESPERA_MAX
        while len(itens) < LOTE_MAX and (falta := prazo - laco.time()) > 0:
            try:
                itens.append(await asyncio.wait_for(fila.get(), falta))   # junta os que chegarem no prazo
            except asyncio.TimeoutError:
                break
        tamanhos.append(len(itens))
        saidas = await asyncio.to_thread(modelo, [x for x, _ in itens])   # o trabalho que bloqueia vai para uma thread
        for (_, futuro), saida in zip(itens, saidas):
            futuro.set_result(saida)                             # devolve a cada requisição a SUA resposta

async def inferir(fila: asyncio.Queue, x: int) -> int:
    futuro = asyncio.get_running_loop().create_future()
    await fila.put((x, futuro))
    return await futuro

async def simular(requisicoes: int, com_lote: bool) -> tuple[float, float]:
    fila: asyncio.Queue = asyncio.Queue(maxsize=1000)            # fila com limite: cheia, o serviço recusa
    tamanhos: list[int] = []
    tarefa = asyncio.create_task(trabalhador(fila, tamanhos))
    inicio = time.perf_counter()
    if com_lote:
        respostas = await asyncio.gather(*[inferir(fila, i) for i in range(requisicoes)])
    else:
        respostas = [await asyncio.to_thread(modelo, [i]) for i in range(requisicoes)]   # uma por vez
        tamanhos = [1] * requisicoes
    total = time.perf_counter() - inicio
    tarefa.cancel()
    assert len(respostas) == requisicoes
    return total, sum(tamanhos) / len(tamanhos)

for com_lote in (False, True):
    total, medio = asyncio.run(simular(200, com_lote))
    print(f"{'com lote dinâmico' if com_lote else 'uma por vez      '}: 200 requisições em {total:.2f} s | {200 / total:5.0f} req/s | lote médio {medio:.1f}")`,
        },
        {
          t: 'texto',
          md: `A vazão multiplica, com o mesmo "hardware". O preço é a **espera máxima** (10 ms aqui): cada requisição pode aguardar esse tempo pelo fechamento do lote. É uma troca explícita entre latência e vazão, com dois botões.

Em produção, raramente se escreve isso à mão. O **NVIDIA Triton**, o **Ray Serve**, o **BentoML** e o **LitServe** trazem lote dinâmico pronto. Vale ter escrito uma vez para saber o que configurar: tamanho máximo do lote, espera máxima, tamanho da fila, e o que responder quando ela enche.`,
        },
        {
          t: 'nota',
          estilo: 'entrevista',
          md: `**"O que é o GIL, e ele atrapalha em aprendizado de máquina?"** O GIL permite que só uma thread execute código Python por vez. Atrapalha pouco em ML, porque o tempo é gasto em bibliotecas em C e na GPU, que o soltam. Atrapalha no que é Python puro: pré-processamento escrito com laços, análise de JSON, lógica de pós-processamento. Aí a saída é vetorizar, ou usar processos, que é o que o \`DataLoader\` faz com \`num_workers\`.`,
        },
        {
          t: 'quiz',
          pergunta: 'Quatro threads executando um laço de cálculo em Python puro terminam em quanto tempo, comparado a uma thread fazendo os quatro em série?',
          opcoes: [
            'Em um quarto do tempo.',
            'Praticamente no mesmo tempo: o GIL deixa uma thread por vez executar código Python.',
            'No dobro do tempo, sempre.',
            'Depende do sistema operacional.',
          ],
          correta: 1,
          explicacao: 'Threads ajudam quando o trabalho espera (rede, disco) ou acontece em código C que solta o GIL. Para Python puro, processos ou vetorização.',
        },
        {
          t: 'quiz',
          pergunta: 'Como um serviço de inferência em GPU aumenta a vazão sem mais hardware?',
          opcoes: [
            'Abrindo mais threads, cada uma chamando o modelo.',
            'Agrupando as requisições que chegam num intervalo curto em um lote e processando-as numa única chamada do modelo.',
            'Usando `async def` nas rotas.',
            'Reduzindo o tempo limite.',
          ],
          correta: 1,
          explicacao: 'A GPU processa um lote de 16 quase no tempo de uma imagem. O lote dinâmico troca alguns milissegundos de espera por várias vezes mais vazão.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'llm-com-visao',
      titulo: 'Modelos de linguagem com visão, na prática',
      minutos: 13,
      resumo: 'Chamar um modelo com imagem, exigir saída estruturada, e medir antes de confiar. Onde isso entra num sistema de visão.',
      blocos: [
        {
          t: 'texto',
          md: `A trilha de visão situou os modelos de linguagem com visão: fortes em **entender a cena** e produzir texto, fracos em contar e localizar objetos pequenos e numerosos. Esta lição é a parte prática: como chamá-los a partir de um serviço Python, e como tratá-los como o que são, **um componente não determinístico que precisa de contrato e de medição**.

O código desta lição é para ler: precisa de uma chave de API, e cada chamada custa. Os exemplos usam o SDK da Anthropic; a estrutura (mensagem com imagem, esquema de saída, tratamento de recusa) é a mesma nos outros provedores.

### Onde isso serve num sistema de armadilhas

| Tarefa | Serve? | Observação |
|---|---|---|
| Contar insetos num cartão cheio | não | é trabalho do detector |
| Dizer se a foto presta: foco, enquadramento, reflexo, cartão errado | sim | triagem; complementa as medidas simples do portão de qualidade |
| Descrever o estado do cartão para o relatório | sim | "cartão saturado de poeira na metade inferior" |
| Ler o código escrito à mão no cartão | sim | com conferência contra a lista de armadilhas |
| Pré-anotar classes raras para revisão humana | sim, com revisão | o padrão professor e aluno |
| Explicar um alerta ao agrônomo, a partir dos números | sim | os números vêm do banco; o modelo só redige |`,
        },
        {
          t: 'codigo',
          titulo: 'Triagem de foto com saída estruturada (para ler)',
          lang: 'python',
          codigo: `import base64
from typing import Literal
import anthropic
from pydantic import BaseModel, Field

# O contrato: o modelo NÃO devolve texto livre, devolve isto.
class Triagem(BaseModel):
    e_armadilha_adesiva: bool
    nitidez: Literal["boa", "aceitável", "ruim"]
    enquadramento: Literal["cartão inteiro", "cartão cortado", "cartão pequeno demais"]
    problemas: list[Literal["reflexo", "sombra forte", "desfoque", "dedo na frente", "cartão dobrado", "sujeira"]]
    codigo_escrito: str | None = Field(description="Código escrito no cartão, como A-01. Nulo se não houver ou se estiver ilegível.")
    aproveitavel: bool = Field(description="Verdadeiro se um detector de insetos conseguiria trabalhar nesta foto.")
    motivo: str = Field(description="Uma frase, em português, para o técnico de campo.")

INSTRUCOES = """Você faz a triagem de fotos de armadilhas adesivas para insetos, tiradas em campo.
A foto só é aproveitável se o cartão aparece inteiro, em foco, sem reflexo cobrindo a área adesiva.
Não conte os insetos e não tente identificá-los: outro sistema faz isso.
Na dúvida sobre o código escrito, devolva nulo em vez de adivinhar."""

cliente = anthropic.Anthropic()        # lê a credencial do ambiente; nunca fica no código

def triar(caminho: str) -> Triagem | None:
    with open(caminho, "rb") as f:
        imagem = base64.standard_b64encode(f.read()).decode("utf-8")

    resposta = cliente.messages.parse(
        model="claude-opus-5-5",
        max_tokens=16000,
        system=INSTRUCOES,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": imagem}},
                {"type": "text", "text": "Faça a triagem desta foto."},
            ],
        }],
        output_format=Triagem,          # o SDK envia o esquema e valida a resposta
    )

    if resposta.stop_reason == "refusal":   # o modelo pode se recusar: é um resultado, não uma exceção
        return None
    return resposta.parsed_output           # uma instância de Triagem, já validada

t = triar("imagens/a-01.jpg")
if t and not t.aproveitavel:
    print("Pedir outra foto:", t.motivo)`,
        },
        {
          t: 'texto',
          md: `O que faz desse código algo que se pode pôr num serviço:

- **Saída estruturada.** O esquema Pydantic é enviado ao modelo, e a resposta volta **validada**. Nada de extrair JSON de texto com expressão regular.
- **Categorias fechadas** (\`Literal\`) onde há um conjunto conhecido. Texto livre só no campo que é para uma pessoa ler.
- **A saída "não sei" existe.** \`codigo_escrito\` pode ser nulo, e a instrução diz para preferir isso a adivinhar. Sem essa porta, o modelo inventa.
- **A tarefa é delimitada.** A instrução diz o que **não** fazer (contar, identificar), que é onde o modelo erraria com segurança.
- **A recusa é tratada.** \`stop_reason\` é conferido antes de usar o conteúdo. Nos modelos mais recentes dá para pedir à API que tente um modelo alternativo quando há recusa (o parâmetro \`fallbacks\`, hoje em beta).

### Erros, limites e custo`,
        },
        {
          t: 'codigo',
          titulo: 'Tratar as falhas que vão acontecer (para ler)',
          lang: 'python',
          codigo: `import anthropic

# O SDK já tenta de novo, sozinho, em 429, 5xx e falha de conexão (2 vezes, por padrão).
cliente = anthropic.Anthropic(max_retries=3, timeout=60.0)

def triar_com_cuidado(caminho: str) -> Triagem | None:
    try:
        return triar(caminho)
    except anthropic.RateLimitError:
        # passou do limite mesmo depois das tentativas: devolver a foto para a fila, com espera
        raise
    except anthropic.APIConnectionError:
        # rede: idem. A triagem é opcional; o fluxo principal não pode depender dela
        return None
    except anthropic.BadRequestError as e:
        # imagem grande demais, formato não aceito: não adianta repetir. Registrar e seguir
        registrar("triagem recusada pela API", arquivo=caminho, erro=str(e))
        return None
    except anthropic.APIStatusError as e:
        registrar("erro da API", status=e.status_code, arquivo=caminho)
        return None

# Custo e latência são parte do desenho:
# - reduzir a imagem antes de enviar (o lado maior em ~1.500 px costuma bastar para triagem);
# - a parte fixa do prompt (instruções longas, exemplos) entra no cache de prompt, e as chamadas seguintes pagam uma fração por ela;
# - o que não é urgente vai pela API de lotes, mais barata e assíncrona;
# - registrar tokens de entrada e saída de cada chamada (resposta.usage), por tarefa, desde o primeiro dia.`,
        },
        {
          t: 'texto',
          md: `### Medir, como qualquer outro modelo

Um modelo de linguagem não é exceção às regras da trilha de visão. Antes de confiar:

1. **Monte um conjunto de avaliação**: 100 a 300 fotos com a resposta certa anotada por uma pessoa, incluindo os casos difíceis.
2. **Escolha a métrica por campo**: acerto em \`aproveitavel\`, precisão e revocação de cada problema, acerto exato do código lido.
3. **Rode e leia os erros**, um por um. É a análise de erro de sempre.
4. **Mude uma coisa** (a instrução, um exemplo, o tamanho da imagem, o modelo) e rode de novo, no mesmo conjunto.
5. **Guarde o conjunto**: ele é o teste de regressão para toda mudança de prompt e toda troca de versão do modelo.

Sem isso, "melhorei o prompt" é impressão. Com isso, é um número, com intervalo de confiança.

### Embeddings

Para **busca por semelhança** (a lição de pgvector), usa-se um modelo de embedding, e não um modelo de conversa:

- **Imagem**: DINOv2 ou DINOv3, ou um CLIP/SigLIP quando a busca é por texto. Rodam na sua máquina, como na trilha de visão.
- **Texto** (observações dos técnicos, laudos): modelos de embedding de texto, locais (pela biblioteca sentence-transformers) ou por API de um provedor que ofereça.

O vetor vai para uma coluna \`vector\` no Postgres. Uma regra evita dor: **guarde junto o nome e a versão do modelo que gerou o vetor**. Vetores de modelos diferentes não são comparáveis, e trocar de modelo exige recalcular tudo.

### Fontes

- [Visão na API da Anthropic](https://platform.claude.com/docs/en/build-with-claude/vision)
- [Saídas estruturadas](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)

Conferido em novembro de 2026. APIs de modelos mudam rápido: confira os nomes de modelo e de parâmetro na documentação antes de usar.`,
        },
        {
          t: 'quiz',
          pergunta: 'Por que pedir saída estruturada, com esquema, em vez de pedir "responda em JSON" no texto do prompt?',
          opcoes: [
            'Porque fica mais barato.',
            'Porque o esquema é imposto e a resposta chega validada: o código recebe um objeto tipado, em vez de torcer para o texto vir no formato certo.',
            'Porque o modelo responde mais rápido.',
            'Porque dispensa as instruções.',
          ],
          correta: 1,
          explicacao: 'Um serviço não pode depender de o modelo "lembrar" do formato. Com o esquema, o contrato é garantido pela API e conferido pelo Pydantic.',
        },
        {
          t: 'quiz',
          pergunta: 'Você alterou o prompt de triagem e "parece melhor" nos três exemplos que testou. O que falta?',
          opcoes: [
            'Nada.',
            'Rodar a versão antiga e a nova num conjunto de avaliação com respostas anotadas, e comparar a métrica: três exemplos não distinguem melhora de acaso.',
            'Aumentar o `max_tokens`.',
            'Trocar de modelo.',
          ],
          correta: 1,
          explicacao: 'Prompt é código, e muda o comportamento em casos que você não olhou. O conjunto de avaliação é o teste de regressão.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'projeto',
      titulo: 'Projeto: o serviço de inferência, testado',
      minutos: 35,
      resumo: 'Completar um serviço com validação, portão de qualidade e versão do modelo, até os testes passarem.',
      blocos: [
        {
          t: 'texto',
          md: `O projeto junta a trilha: tipos nas fronteiras, NumPy vetorizado, e uma API testada. O serviço recebe a foto de uma armadilha e devolve as detecções, **mas só se a foto passar no portão de qualidade**. É o serviço Python do projeto integrador, que a API em .NET vai chamar.

O bloco abaixo já tem o detector, os testes e o esqueleto da API. Faltam três partes, marcadas com \`TODO\`. Rode: os testes dizem o que falta.

| Parte | O que fazer |
|---|---|
| 1. \`medir_qualidade\` | devolver a **nitidez** (variância do laplaciano da imagem em cinza) e a **fração de pixels estourados** (canal máximo ≥ 250) |
| 2. Portão | se a nitidez for menor que \`NITIDEZ_MINIMA\`, ou a fração estourada maior que \`ESTOURO_MAXIMO\`, responder **422** com \`{"detail": {"motivo": ..., "qualidade": {...}}}\` |
| 3. Resposta | preencher \`contagem\` e \`densidade_por_megapixel\` (detecções por milhão de pixels, com 1 casa decimal) |`,
        },
        {
          t: 'codigo',
          titulo: 'Serviço de inferência: complete até os testes passarem',
          rodar: 'python',
          requerPython: ['fastapi', 'httpx', 'cv2'],
          esperaFalha: true,
          tempo: 120,
          codigo: `from contextlib import asynccontextmanager
from typing import Annotated
from fastapi import Depends, FastAPI, HTTPException, UploadFile
from fastapi.testclient import TestClient
from pydantic import BaseModel
import lab
${DETECTOR}
NITIDEZ_MINIMA = 20.0
ESTOURO_MAXIMO = 0.20

class Qualidade(BaseModel):
    nitidez: float
    fracao_estourada: float

class Resposta(BaseModel):
    versao_modelo: str
    qualidade: Qualidade
    contagem: int
    densidade_por_megapixel: float
    deteccoes: list[dict]

def medir_qualidade(imagem: np.ndarray) -> Qualidade:
    # TODO 1: nitidez = variância do laplaciano (cv2.Laplacian em CV_64F) da imagem em cinza;
    #         fracao_estourada = fração de pixels cujo MAIOR canal é >= 250
    return Qualidade(nitidez=0.0, fracao_estourada=0.0)

estado: dict = {}

@asynccontextmanager
async def ciclo(app: FastAPI):
    estado["detector"] = Detector()
    yield
    estado.clear()

app = FastAPI(lifespan=ciclo)

def obter_detector() -> Detector:
    return estado["detector"]

@app.post("/detectar")
def detectar(arquivo: UploadFile, detector: Annotated[Detector, Depends(obter_detector)]) -> Resposta:
    imagem = cv2.imdecode(np.frombuffer(arquivo.file.read(), np.uint8), cv2.IMREAD_COLOR)
    if imagem is None:
        raise HTTPException(422, {"motivo": "não é uma imagem"})

    qualidade = medir_qualidade(imagem)
    # TODO 2: o portão de qualidade (422 com motivo e qualidade)

    deteccoes = detector.detectar(imagem)
    # TODO 3: contagem e densidade_por_megapixel
    return Resposta(versao_modelo=detector.versao, qualidade=qualidade, contagem=0,
                    densidade_por_megapixel=0.0, deteccoes=deteccoes)

# =============================== testes ===============================
def como_jpeg(img):
    return cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 95])[1].tobytes()

boa, gabarito, _ = lab.amostra_com_gabarito("armadilha", semente=3, insetos=20, detritos=0)
borrada = cv2.GaussianBlur(boa, (41, 41), 0)
estourada = np.clip(boa.astype(np.float32) * 2.2, 0, 255).astype(np.uint8)

falhas = []
def conferir(nome, condicao, detalhe=""):
    print(("  ok    " if condicao else "  FALHA ") + nome + ("" if condicao else f"  -> {detalhe}"))
    if not condicao: falhas.append(nome)

with TestClient(app) as cliente:
    enviar = lambda img: cliente.post("/detectar", files={"arquivo": ("a.jpg", como_jpeg(img), "image/jpeg")})

    q = medir_qualidade(boa)
    conferir("1. a foto boa tem nitidez acima do mínimo", q.nitidez > NITIDEZ_MINIMA, f"nitidez {q.nitidez:.1f}")
    conferir("1. a foto borrada tem nitidez abaixo do mínimo", 0 < medir_qualidade(borrada).nitidez < NITIDEZ_MINIMA, f"nitidez {medir_qualidade(borrada).nitidez:.1f}")
    conferir("1. a foto estourada tem mais de 20% de pixels estourados", medir_qualidade(estourada).fracao_estourada > ESTOURO_MAXIMO, f"fração {medir_qualidade(estourada).fracao_estourada:.2f}")
    conferir("1. a foto boa quase não tem pixels estourados", q.fracao_estourada < 0.05, f"fração {q.fracao_estourada:.2f}")

    r = enviar(borrada)
    conferir("2. foto borrada é recusada com 422", r.status_code == 422, f"veio {r.status_code}")
    conferir("2. a recusa explica o motivo e traz a qualidade medida",
             r.status_code == 422 and "motivo" in r.json().get("detail", {}) and "qualidade" in r.json().get("detail", {}), str(r.json())[:80])
    conferir("2. foto estourada é recusada com 422", enviar(estourada).status_code == 422, f"veio {enviar(estourada).status_code}")

    r = enviar(boa)
    conferir("3. foto boa é aceita com 200", r.status_code == 200, f"veio {r.status_code}")
    if r.status_code == 200:
        c = r.json()
        conferir("3. contagem é o número de detecções", c["contagem"] == len(c["deteccoes"]) > 0, f"contagem {c['contagem']}, detecções {len(c['deteccoes'])}")
        esperado = round(len(c["deteccoes"]) / (boa.shape[0] * boa.shape[1] / 1e6), 1)
        conferir("3. densidade por megapixel, com 1 casa", c["densidade_por_megapixel"] == esperado, f"veio {c['densidade_por_megapixel']}, esperado {esperado}")
        conferir("3. a versão do modelo acompanha a resposta", c["versao_modelo"] == Detector.versao)

print(f"\\n{11 - len(falhas)} de 11 testes passaram.")
assert not falhas, f"{len(falhas)} teste(s) falhando"`,
        },
        {
          t: 'texto',
          md: `O bloco **termina com erro enquanto houver teste falhando**, e é assim que se trabalha: rodar, ler qual falhou, escrever o mínimo, rodar de novo.

Se travar, a solução está abaixo. Tente antes: as três partes somam umas quinze linhas.`,
        },
        {
          t: 'codigo',
          titulo: 'Solução das três partes',
          rodar: 'python',
          requerPython: ['fastapi', 'httpx', 'cv2'],
          tempo: 120,
          codigo: `from contextlib import asynccontextmanager
from typing import Annotated
from fastapi import Depends, FastAPI, HTTPException, UploadFile
from fastapi.testclient import TestClient
from pydantic import BaseModel
import lab
${DETECTOR}
NITIDEZ_MINIMA = 20.0
ESTOURO_MAXIMO = 0.20

class Qualidade(BaseModel):
    nitidez: float
    fracao_estourada: float

class Resposta(BaseModel):
    versao_modelo: str
    qualidade: Qualidade
    contagem: int
    densidade_por_megapixel: float
    deteccoes: list[dict]

def medir_qualidade(imagem: np.ndarray) -> Qualidade:
    cinza = cv2.cvtColor(imagem, cv2.COLOR_BGR2GRAY)
    nitidez = float(cv2.Laplacian(cinza, cv2.CV_64F).var())           # parte 1
    estourada = float((imagem.max(axis=2) >= 250).mean())             # pelo canal MÁXIMO, e não pelo cinza
    return Qualidade(nitidez=round(nitidez, 1), fracao_estourada=round(estourada, 4))

estado: dict = {}

@asynccontextmanager
async def ciclo(app: FastAPI):
    estado["detector"] = Detector()
    yield
    estado.clear()

app = FastAPI(lifespan=ciclo)

def obter_detector() -> Detector:
    return estado["detector"]

@app.post("/detectar")
def detectar(arquivo: UploadFile, detector: Annotated[Detector, Depends(obter_detector)]) -> Resposta:
    imagem = cv2.imdecode(np.frombuffer(arquivo.file.read(), np.uint8), cv2.IMREAD_COLOR)
    if imagem is None:
        raise HTTPException(422, {"motivo": "não é uma imagem"})

    qualidade = medir_qualidade(imagem)
    motivo = ("foto fora de foco" if qualidade.nitidez < NITIDEZ_MINIMA                      # parte 2
              else "foto estourada" if qualidade.fracao_estourada > ESTOURO_MAXIMO else None)
    if motivo:
        raise HTTPException(422, {"motivo": motivo, "qualidade": qualidade.model_dump()})

    deteccoes = detector.detectar(imagem)
    megapixels = imagem.shape[0] * imagem.shape[1] / 1e6                                    # parte 3
    return Resposta(versao_modelo=detector.versao, qualidade=qualidade, contagem=len(deteccoes),
                    densidade_por_megapixel=round(len(deteccoes) / megapixels, 1), deteccoes=deteccoes)

boa, gabarito, _ = lab.amostra_com_gabarito("armadilha", semente=3, insetos=20, detritos=0)
borrada = cv2.GaussianBlur(boa, (41, 41), 0)
estourada = np.clip(boa.astype(np.float32) * 2.2, 0, 255).astype(np.uint8)
como_jpeg = lambda img: cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 95])[1].tobytes()

with TestClient(app) as cliente:
    for nome, img in [("boa", boa), ("borrada", borrada), ("estourada", estourada)]:
        r = cliente.post("/detectar", files={"arquivo": ("a.jpg", como_jpeg(img), "image/jpeg")})
        c = r.json()
        if r.status_code == 200:
            print(f"{nome:>9}: 200 | contagem {c['contagem']} (gabarito {len(gabarito)}) | {c['densidade_por_megapixel']} por megapixel | qualidade {c['qualidade']}")
        else:
            print(f"{nome:>9}: {r.status_code} | {c['detail']['motivo']} | {c['detail']['qualidade']}")

lab.mostrar(boa, borrada, estourada, titulos=["boa", "borrada", "estourada"], largura_max=900)`,
        },
        {
          t: 'texto',
          md: `### Para ir além

- **Lote dinâmico.** Troque a chamada direta ao detector pela fila da lição de concorrência.
- **Teste de paridade.** Salve a resposta da foto boa num arquivo JSON e escreva o teste que falha se uma mudança no pré-processamento alterar as detecções.
- **Configuração.** Mova \`NITIDEZ_MINIMA\` e \`ESTOURO_MAXIMO\` para variáveis de ambiente, lidas com \`pydantic-settings\`.
- **Projeto de verdade.** Crie o repositório com \`uv init\`, separe em \`api.py\`, \`modelo.py\`, \`qualidade.py\` e \`esquemas.py\`, ponha os testes no pytest e rode com \`uvicorn\`.
- **Modelo de verdade.** Troque o \`Detector\` pelo YOLO treinado no laboratório da trilha de visão, exportado para ONNX.

### O que você reforçou

- Um projeto Python reprodutível, com as ferramentas de hoje.
- Tipos onde eles pagam: contratos nas fronteiras, estruturas leves por dentro.
- NumPy sem laços e sem os acidentes de formato e de memória compartilhada.
- O que o autograd faz, e o esqueleto de treino que toda biblioteca esconde.
- Medir desempenho de GPU sem se enganar.
- Uma API de inferência com validação, ciclo de vida e testes.
- Qual modelo de concorrência serve a qual gargalo, e o lote dinâmico.
- Modelos de linguagem com visão como componente com contrato e avaliação.`,
        },
        {
          t: 'quiz',
          pergunta: 'Por que o serviço recusa a foto ruim com 422, em vez de rodar o detector e devolver o que achar?',
          opcoes: [
            'Para economizar GPU.',
            'Porque uma contagem feita numa foto borrada ou estourada é um número errado com cara de certo; recusar com o motivo permite ao aplicativo pedir outra foto na hora.',
            'Porque o FastAPI exige.',
            'Porque fotos ruins travam o OpenCV.',
          ],
          correta: 1,
          explicacao: 'O pior resultado de um sistema de contagem é o dado silenciosamente errado. O portão de qualidade transforma esse caso num erro explícito e acionável.',
        },
        {
          t: 'quiz',
          pergunta: 'Por que a fração de pixels estourados é medida pelo canal máximo, e não pela imagem em cinza?',
          opcoes: [
            'Porque é mais rápido.',
            'Porque num cartão amarelo saturado o vermelho e o verde chegam a 255 com o azul baixo: o cinza, que é uma média ponderada, fica abaixo do limite e esconde o estouro.',
            'Porque o OpenCV não calcula cinza.',
            'Não faz diferença.',
          ],
          correta: 1,
          explicacao: 'É o achado da lição de histograma da trilha de visão. Basta um canal saturar para a informação de cor daquele pixel se perder.',
        },
      ],
    },
  ],
};
