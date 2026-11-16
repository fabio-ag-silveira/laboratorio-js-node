export const pytorch = {
  id: 'pytorch',
  titulo: 'PyTorch por dentro',
  cor: '#f0c14b',
  licoes: [
    // ------------------------------------------------------------------
    {
      id: 'tensores-e-autograd',
      titulo: 'Tensores e autograd',
      minutos: 13,
      resumo: 'O que o backward faz de fato, por que o gradiente acumula, e as quatro formas de desligar o grafo.',
      blocos: [
        {
          t: 'texto',
          md: `Um tensor é um array do NumPy com duas coisas a mais: pode morar na **GPU**, e pode **lembrar das operações** que o produziram. A segunda é o **autograd**, e é o PyTorch inteiro: o resto são camadas de conveniência sobre ele.

Quando um tensor tem \`requires_grad=True\`, cada operação sobre ele registra um nó num **grafo**. Chamar \`.backward()\` num escalar percorre o grafo de trás para a frente, aplicando a regra da cadeia, e deposita em cada folha o \`.grad\`: a derivada daquele escalar em relação a ela.

O bloco abaixo ajusta uma reta, sem \`nn.Module\` nem otimizador, para o mecanismo ficar à vista.`,
        },
        {
          t: 'codigo',
          titulo: 'Regressão linear só com autograd',
          rodar: 'python',
          requerPython: ['torch'],
          codigo: `import torch

torch.manual_seed(0)
x = torch.linspace(0, 10, 50)
y = 3.0 * x + 2.0 + torch.randn(50) * 0.5           # a reta "verdadeira": inclinação 3, intercepto 2

w = torch.zeros(1, requires_grad=True)               # as duas folhas do grafo
b = torch.zeros(1, requires_grad=True)

for passo in range(1501):
    previsto = w * x + b                             # cada operação registra um nó
    perda = ((previsto - y) ** 2).mean()             # um ESCALAR

    perda.backward()                                 # preenche w.grad e b.grad

    with torch.no_grad():                            # atualizar os pesos NÃO faz parte do grafo
        w -= 0.01 * w.grad
        b -= 0.01 * b.grad
    w.grad.zero_()                                   # sem isto, o próximo backward SOMA ao anterior
    b.grad.zero_()

    if passo % 500 == 0:
        print(f"passo {passo:3d}: perda {perda.item():8.3f} | w = {w.item():.3f} | b = {b.item():.3f}")

print("\\no grafo, lido de trás para a frente:", perda.grad_fn, "<-", perda.grad_fn.next_functions[0][0])`,
        },
        {
          t: 'texto',
          md: `É o laço de treino inteiro, em doze linhas: **prever, medir a perda, \`backward\`, atualizar, zerar**. O \`optimizer.step()\` e o \`optimizer.zero_grad()\` que você escreve todo dia fazem as quatro últimas linhas do laço.

Três detalhes desse código explicam a maioria dos erros de quem estende um laço de treino.

**O gradiente acumula.** \`backward()\` **soma** ao \`.grad\` existente. É proposital (permite acumular vários lotes antes de um passo), e é por isso que esquecer o \`zero_grad()\` faz o treino divergir.

**\`no_grad\` na atualização.** Se \`w -= ...\` fosse registrado no grafo, cada passo encadearia no anterior, e a memória cresceria sem fim.

**\`.item()\` para tirar o número.** Guardar \`perda\` numa lista, em vez de \`perda.item()\`, guarda o grafo inteiro de cada iteração: é o vazamento de memória mais comum em código de treino.`,
        },
        {
          t: 'codigo',
          titulo: 'O gradiente que acumula, e as formas de desligar o grafo',
          rodar: 'python',
          requerPython: ['torch'],
          codigo: `import torch

w = torch.tensor([2.0], requires_grad=True)

(w * 3).backward(); print("depois de 1 backward:", w.grad.item())     # d(3w)/dw = 3
(w * 3).backward(); print("depois de 2, sem zerar:", w.grad.item())   # somou: 6
w.grad.zero_()
(w * 3).backward(); print("zerando antes:", w.grad.item())

# Quatro jeitos de "sair" do grafo, para quatro situações
x = torch.ones(3, requires_grad=True)
y = x * 2

print("\\ny.requires_grad:", y.requires_grad)
print("y.detach().requires_grad:", y.detach().requires_grad, " <- mesmo dado, fora do grafo (para usar como alvo fixo)")
with torch.no_grad():
    print("dentro de no_grad:", (x * 2).requires_grad, "          <- validação: sem grafo, menos memória")
with torch.inference_mode():
    print("dentro de inference_mode:", (x * 2).requires_grad, "   <- produção: ainda mais enxuto")
print("y.sum().item():", y.sum().item(), "                 <- um número Python, para registrar")

# O erro clássico: alterar no lugar um tensor de que o backward precisa
a = torch.ones(3, requires_grad=True)
b = a.exp()                # o backward de exp usa o próprio resultado
b += 1                     # ...que acaba de ser alterado no lugar
try:
    b.sum().backward()
except RuntimeError as e:
    print("\\nRuntimeError:", str(e)[:98], "...")`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Ferramenta', 'Faz', 'Quando'],
          linhas: [
            ['`tensor.detach()`', 'devolve o mesmo dado, desligado do grafo', 'usar uma saída como alvo ou entrada fixa (destilação, alvo de rede congelada)'],
            ['`with torch.no_grad():`', 'nenhuma operação dentro registra grafo', 'validação, métricas, atualização manual de pesos'],
            ['`with torch.inference_mode():`', 'como `no_grad`, com mais otimizações; o resultado nunca pode voltar a um grafo', 'inferência em produção'],
            ['`.item()`, `.tolist()`, `.cpu().numpy()`', 'tira o valor para Python ou NumPy', 'registrar, plotar, pós-processar'],
            ['`param.requires_grad_(False)`', 'congela um parâmetro', 'transfer learning: congelar o backbone'],
            ['`model.eval()`', '**não desliga gradiente**: muda o comportamento de Dropout e BatchNorm', 'sempre na validação e na inferência, junto com um dos de cima'],
          ],
        },
        {
          t: 'nota',
          estilo: 'pegadinha',
          md: `**\`model.eval()\` e \`torch.no_grad()\` são coisas diferentes, e as duas são necessárias.** O primeiro troca o modo das camadas (Dropout desliga, BatchNorm usa as médias acumuladas). O segundo desliga o grafo. Validar com \`no_grad\` e sem \`eval()\` dá métricas ruidosas e piores que as reais. Voltar ao treino sem \`model.train()\` congela a BatchNorm sem aviso.`,
        },
        {
          t: 'texto',
          md: `### Dispositivo e tipo

Todo tensor tem um **dispositivo** e um **dtype**, e operar dois tensores exige que os dois coincidam.

\`\`\`python
dispositivo = "cuda" if torch.cuda.is_available() else "cpu"
x = torch.from_numpy(img).to(dispositivo)        # from_numpy NÃO copia: compartilha a memória
modelo.to(dispositivo)                            # move os pesos (no lugar)
\`\`\`

- \`torch.from_numpy\` e \`.numpy()\` são **vistas**, como as do NumPy: alterar um altera o outro.
- O dtype padrão do PyTorch é \`float32\`, e o do NumPy é \`float64\`. Um array vindo do NumPy chega como \`float64\` e a primeira camada reclama de \`Double\` contra \`Float\`.
- Mover para a GPU **dentro do laço**, tensor por tensor, é lento. Move-se o lote inteiro, uma vez.
- \`tensor.cpu().numpy()\` espera a GPU terminar. Chamado a cada iteração, sincroniza o laço e derruba o desempenho.`,
        },
        {
          t: 'quiz',
          pergunta: 'O que acontece se o laço de treino não chamar `optimizer.zero_grad()`?',
          opcoes: [
            'Nada: os gradientes são sobrescritos.',
            'Os gradientes de cada lote somam-se aos anteriores, e o passo do otimizador usa a soma acumulada: o treino se torna instável.',
            'O PyTorch levanta um erro.',
            'O treino fica mais lento, e só.',
          ],
          correta: 1,
          explicacao: '`backward()` acumula em `.grad` por projeto. Isso permite simular lotes grandes somando vários pequenos, e exige zerar quando não é essa a intenção.',
        },
        {
          t: 'quiz',
          pergunta: 'Qual é a diferença entre `model.eval()` e `torch.no_grad()`?',
          opcoes: [
            'Nenhuma.',
            '`eval()` muda o comportamento de camadas como Dropout e BatchNorm; `no_grad()` impede a construção do grafo de gradiente. A validação precisa dos dois.',
            '`eval()` é para GPU e `no_grad()` para CPU.',
            '`no_grad()` congela os pesos para sempre.',
          ],
          correta: 1,
          explicacao: 'São mecanismos independentes. Um afeta o que as camadas calculam; o outro, o que o autograd registra.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'laco-de-treino',
      titulo: 'O laço de treino, peça por peça',
      minutos: 14,
      resumo: 'Dataset, DataLoader, treino, validação e checkpoint: o esqueleto que as bibliotecas escondem.',
      blocos: [
        {
          t: 'texto',
          md: `O Ultralytics, o Lightning e o \`Trainer\` do Hugging Face embrulham o mesmo esqueleto. Vale escrevê-lo uma vez à mão: é o que permite depurar quando a biblioteca faz algo inesperado, e escrever o que ela não prevê.

| Peça | Responsabilidade |
|---|---|
| \`Dataset\` | "me dê o item \`i\`": lê, decodifica, aumenta, devolve tensor e rótulo |
| \`DataLoader\` | junta itens em **lotes**, embaralha, e paraleliza a leitura em processos |
| \`nn.Module\` | o modelo: parâmetros e \`forward\` |
| função de perda | um escalar que mede o erro do lote |
| otimizador | usa os gradientes para atualizar os parâmetros |
| agendador | muda a taxa de aprendizado ao longo do treino |
| laço de validação | mede em dados que o treino não viu, sem gradiente |
| checkpoint | o estado necessário para retomar ou usar depois |

O bloco treina o classificador de recortes de armadilha (fundo, inseto, detrito) da trilha de visão.`,
        },
        {
          t: 'codigo',
          titulo: 'O esqueleto completo',
          rodar: 'python',
          requerPython: ['torch', 'cv2'],
          tempo: 240,
          codigo: `import os, tempfile, time
import numpy as np, torch, torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import lab

torch.manual_seed(0)
dispositivo = lab.dispositivo()

# ---- 1. Dataset: um item por vez ----------------------------------------------
class Recortes(Dataset):
    def __init__(self, X: np.ndarray, y: np.ndarray, aumentar: bool = False):
        self.X, self.y, self.aumentar = X, y, aumentar      # X: (N, 32, 32, 3) uint8 BGR

    def __len__(self) -> int:
        return len(self.X)

    def __getitem__(self, i: int):
        img = self.X[i]
        if self.aumentar and np.random.rand() < 0.5:
            img = img[:, ::-1]                               # espelho: só no treino
        t = torch.from_numpy(img[..., ::-1].copy()).permute(2, 0, 1).float() / 255   # RGB, CHW, [0, 1]
        return t, int(self.y[i])

X, y = lab.recortes(24, semente=0)
Xv, yv = lab.recortes(8, semente=99)                         # OUTRAS armadilhas: validação honesta
treino = DataLoader(Recortes(X, y, aumentar=True), batch_size=64, shuffle=True, drop_last=True)
validacao = DataLoader(Recortes(Xv, yv), batch_size=256)
print(f"{len(treino.dataset)} recortes de treino em {len(treino)} lotes | {len(validacao.dataset)} de validação")

# ---- 2. Modelo, perda, otimizador, agendador ----------------------------------
def bloco(e, s):
    return [nn.Conv2d(e, s, 3, padding=1), nn.GroupNorm(4, s), nn.ReLU(), nn.MaxPool2d(2)]
modelo = nn.Sequential(*bloco(3, 16), *bloco(16, 32), *bloco(32, 64),
                       nn.AdaptiveAvgPool2d(1), nn.Flatten(), nn.Linear(64, 3)).to(dispositivo)
criterio = nn.CrossEntropyLoss()
EPOCAS = 6
otimizador = torch.optim.AdamW(modelo.parameters(), lr=3e-3, weight_decay=1e-4)
agendador = torch.optim.lr_scheduler.OneCycleLR(otimizador, max_lr=3e-3, total_steps=EPOCAS * len(treino))

# ---- 3. Validação: eval() + sem gradiente -------------------------------------
@torch.no_grad()
def avaliar() -> tuple[float, float]:
    modelo.eval()
    perda, certos, total = 0.0, 0, 0
    for imagens, rotulos in validacao:
        imagens, rotulos = imagens.to(dispositivo), rotulos.to(dispositivo)
        saida = modelo(imagens)
        perda += criterio(saida, rotulos).item() * len(rotulos)
        certos += (saida.argmax(1) == rotulos).sum().item()
        total += len(rotulos)
    return perda / total, certos / total

# ---- 4. O laço ----------------------------------------------------------------
melhor, arquivo = 0.0, os.path.join(tempfile.gettempdir(), "recortes-melhor.pt")
inicio = time.perf_counter()
for epoca in range(1, EPOCAS + 1):
    modelo.train()                                           # volta ao modo de treino a cada época
    soma = 0.0
    for imagens, rotulos in treino:
        imagens, rotulos = imagens.to(dispositivo), rotulos.to(dispositivo)
        perda = criterio(modelo(imagens), rotulos)
        otimizador.zero_grad(set_to_none=True)
        perda.backward()
        otimizador.step()
        agendador.step()                                     # OneCycle anda a cada LOTE
        soma += perda.item()

    perda_val, acerto = avaliar()
    marca = ""
    if acerto > melhor:                                      # guarda o melhor, e não o último
        melhor = acerto
        torch.save({"modelo": modelo.state_dict(), "epoca": epoca, "acerto": acerto,
                    "classes": ["fundo", "inseto", "detrito"], "entrada": "RGB, 32x32, [0, 1]"}, arquivo)
        marca = "  <- salvo"
    print(f"época {epoca}: perda de treino {soma / len(treino):.3f} | validação {perda_val:.3f} | acerto {acerto:.1%}{marca}")

print(f"\\n{time.perf_counter() - inicio:.1f} s em {dispositivo}")

# ---- 5. Carregar para usar ----------------------------------------------------
ponto = torch.load(arquivo, weights_only=True)               # weights_only: não executa código do arquivo
modelo.load_state_dict(ponto["modelo"])
print("checkpoint da época", ponto["epoca"], "| acerto", f"{ponto['acerto']:.1%}", "| entrada esperada:", ponto["entrada"])`,
        },
        {
          t: 'texto',
          md: `Cada linha desse esqueleto existe por causa de um erro que alguém já cometeu.

| Linha | Sem ela |
|---|---|
| validação em **outras armadilhas** | recortes da mesma foto nos dois lados: a métrica mede memorização (o vazamento da trilha de visão) |
| \`aumentar\` só no treino | a validação muda a cada época e deixa de ser comparável |
| \`shuffle=True\` no treino | lotes sempre iguais, e ordenados por classe se o dataset estiver ordenado |
| \`drop_last=True\` | um último lote minúsculo desestabiliza BatchNorm e a perda |
| \`modelo.train()\` no início de cada época | a validação deixou o modelo em \`eval()\`, e ele fica assim |
| \`perda.item()\` | acumular o tensor guarda o grafo de todos os lotes: a memória estoura |
| salvar o **melhor** | o último pode já estar sobreajustado |
| salvar \`state_dict\`, e não o modelo | \`torch.save(modelo)\` usa pickle da classe: quebra quando o código muda de lugar |
| guardar classes e pré-processamento **no checkpoint** | seis meses depois, ninguém lembra se era RGB ou BGR |
| \`weights_only=True\` | um \`.pt\` é pickle: carregar arquivo de origem duvidosa executa código |`,
        },
        {
          t: 'texto',
          md: `### Reprodutibilidade, até onde dá

\`\`\`python
import random, numpy as np, torch

def semear(semente: int) -> None:
    random.seed(semente)
    np.random.seed(semente)
    torch.manual_seed(semente)                 # CPU e todas as GPUs

semear(0)
gerador = torch.Generator().manual_seed(0)
DataLoader(..., shuffle=True, generator=gerador,
           worker_init_fn=lambda i: np.random.seed(i))    # cada processo de leitura com a sua semente
\`\`\`

Com isso, duas execuções **na mesma máquina e na mesma versão** costumam dar resultados muito próximos. Idênticos, bit a bit, exigem \`torch.use_deterministic_algorithms(True)\`, que deixa algumas operações de GPU mais lentas. Entre máquinas ou versões diferentes, não há garantia.

A consequência prática está na trilha de visão: uma diferença de meio ponto entre dois treinos pode ser só a semente. Para afirmar que uma mudança ajudou, treina-se mais de uma vez de cada lado.

### O que registrar de cada treino

O commit do código, a configuração inteira, a versão do dataset, as sementes, as versões das bibliotecas, as curvas de treino e validação, e o checkpoint. Ferramentas como **MLflow** e **Weights & Biases** fazem isso. Um arquivo JSON por execução, numa pasta com data, já resolve o essencial. O que não se registra não se reproduz.`,
        },
        {
          t: 'nota',
          estilo: 'campo',
          md: `**DataLoader no Windows.** \`num_workers > 0\` cria processos com *spawn*: o script inteiro é reimportado em cada um, e por isso o código de treino precisa estar dentro de \`if __name__ == "__main__":\`. Os processos demoram a subir; use \`persistent_workers=True\` para não pagar isso a cada época. No Linux (e no contêiner de produção) isso não incomoda. Com dataset pequeno em memória, como aqui, \`num_workers=0\` é o mais rápido.`,
        },
        {
          t: 'quiz',
          pergunta: 'Por que salvar o `state_dict` em vez do objeto do modelo inteiro?',
          opcoes: [
            'Porque o arquivo fica maior.',
            'Porque o `state_dict` é só um dicionário de tensores; salvar o objeto usa pickle e amarra o arquivo ao caminho e à definição da classe, quebrando quando o código muda.',
            'Porque o objeto não pode ir para a GPU.',
            'Porque o `state_dict` inclui o otimizador.',
          ],
          correta: 1,
          explicacao: 'O checkpoint durável é: pesos, mais os metadados para reconstruir o modelo e o pré-processamento. A classe vem do código, versionado no git.',
        },
        {
          t: 'quiz',
          pergunta: 'A perda de validação oscila muito de uma época para outra, e o treino usa aumentação aleatória. O que conferir primeiro?',
          opcoes: [
            'A taxa de aprendizado.',
            'Se a aumentação está sendo aplicada também na validação, e se a validação roda em `eval()`: as duas coisas tornam a métrica ruidosa.',
            'O tamanho do modelo.',
            'A versão do CUDA.',
          ],
          correta: 1,
          explicacao: 'A validação precisa ser determinística: mesmas imagens, mesmo pré-processamento, modelo em modo de avaliação. Só assim duas épocas são comparáveis.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'desempenho',
      titulo: 'Desempenho: medir antes de mexer',
      minutos: 13,
      resumo: 'Como cronometrar GPU sem se enganar, e o que precisão mista, formato de memória e tamanho de lote entregam na sua máquina.',
      blocos: [
        {
          t: 'texto',
          md: `Otimizar treino ou inferência sem medir é trocar peças às cegas. E medir GPU tem uma armadilha logo de saída.

### A GPU é assíncrona

Uma operação em CUDA **devolve na hora** e executa em segundo plano. \`time.perf_counter()\` em volta de \`modelo(x)\` mede o tempo de **enfileirar**. Para medir de verdade:

1. **Aquecer**: as primeiras chamadas alocam memória e escolhem algoritmos.
2. **Sincronizar**: \`torch.cuda.synchronize()\` antes de ler o relógio, no início e no fim.
3. **Repetir** e usar a mediana.

O bloco mede uma ResNet-18 nesta máquina. Os números dependem da sua GPU: o que interessa são as **proporções**.`,
        },
        {
          t: 'codigo',
          titulo: 'Cronometrar certo, e o que cada ajuste entrega',
          rodar: 'python',
          requerPython: ['torch', 'torchvision'],
          tempo: 300,
          codigo: `import statistics, time
import torch, torchvision
import lab

dispositivo = lab.dispositivo()
gpu = dispositivo == "cuda"
print("dispositivo:", torch.cuda.get_device_name(0) if gpu else "CPU (os ajustes de GPU serão pulados)")

modelo = torchvision.models.resnet18(weights=None).to(dispositivo).eval()
LOTE = 32 if gpu else 4
x = torch.randn(LOTE, 3, 224, 224, device=dispositivo)

def medir(f, repeticoes=20, esperar_o_fim=True):
    for _ in range(5): f()                                   # aquecimento
    tempos = []
    for _ in range(repeticoes):
        if gpu: torch.cuda.synchronize()                     # fila vazia antes de ligar o relógio
        t = time.perf_counter()
        f()
        if gpu and esperar_o_fim: torch.cuda.synchronize()   # ...e só para o relógio quando a GPU terminou
        tempos.append(time.perf_counter() - t)
    return statistics.median(tempos) * 1000

linhas = []
def registrar(nome, ms, base=None):
    linhas.append([nome, f"{ms:.2f} ms", f"{LOTE / ms * 1000:.0f} img/s", "" if base is None else f"{base / ms:.2f}x"])

@torch.inference_mode()
def fp32(): return modelo(x)

if gpu:
    registrar("sem esperar a GPU (medida ERRADA)", medir(fp32, esperar_o_fim=False))
base = medir(fp32)
registrar("float32, a referência", base, base)


if gpu:
    @torch.inference_mode()
    def amp():
        with torch.autocast("cuda", dtype=torch.float16):    # precisão mista
            return modelo(x)
    registrar("precisão mista (autocast float16)", medir(amp), base)

    modelo_cl = modelo.to(memory_format=torch.channels_last)
    x_cl = x.to(memory_format=torch.channels_last)
    @torch.inference_mode()
    def amp_cl():
        with torch.autocast("cuda", dtype=torch.float16):
            return modelo_cl(x_cl)
    registrar("precisão mista + channels_last", medir(amp_cl), base)

lab.tabela(linhas, cabecalho=["configuração", f"lote de {LOTE}", "vazão", "ganho"])

if gpu:                                                      # o que o inference_mode economiza é MEMÓRIA
    def pico(f):
        torch.cuda.reset_peak_memory_stats(); f(); torch.cuda.synchronize()
        return torch.cuda.max_memory_allocated() / 2**20
    print(f"\\npico de memória: {pico(fp32):.0f} MB com inference_mode | {pico(lambda: modelo(x)):.0f} MB sem (o grafo guarda as ativações)")

if gpu:
    print()
    vazao = []
    for lote in (1, 4, 16, 64):
        xl = torch.randn(lote, 3, 224, 224, device=dispositivo).to(memory_format=torch.channels_last)
        @torch.inference_mode()
        def f():
            with torch.autocast("cuda", dtype=torch.float16):
                return modelo_cl(xl)
        torch.cuda.reset_peak_memory_stats()
        ms = medir(f, repeticoes=10)
        vazao.append([lote, f"{ms:.2f} ms", f"{ms / lote:.2f} ms", f"{lote / ms * 1000:.0f} img/s", f"{torch.cuda.max_memory_allocated() / 2**20:.0f} MB"])
    lab.tabela(vazao, cabecalho=["lote", "latência do lote", "por imagem", "vazão", "pico de memória"])`,
        },
        {
          t: 'texto',
          md: `O que procurar nas duas tabelas, na sua máquina:

- **A primeira linha é o engano.** Parando o relógio sem esperar a GPU, o tempo medido é uma fração do real: mediu-se o enfileiramento. Quem compara dois modelos assim compara ruído.
- **\`inference_mode\`** quase não muda o tempo desta rede. O que ele economiza é **memória**: sem ele, o autograd guarda as ativações de todas as camadas para um \`backward\` que nunca virá, e o pico mais que dobra. É a diferença entre caber ou não um lote maior.
- **Precisão mista** (\`autocast\` com \`float16\`) costuma ser o maior ganho isolado em GPUs com *tensor cores*, na inferência e no treino. No treino, vai junto com o \`GradScaler\`, que evita que gradientes pequenos virem zero em \`float16\`.
- **\`channels_last\`** reorganiza a memória de NCHW para NHWC, que é o formato que as rotinas de convolução da NVIDIA preferem. Ajuda em redes convolucionais, sobretudo junto com precisão mista.
- **Lote**: a latência por imagem cai conforme o lote cresce, até a GPU saturar. Vazão e latência puxam para lados opostos, e a escolha depende do uso: num serviço interativo, lote pequeno; num processamento noturno, o maior lote que couber.

### No treino, o gargalo raramente é a GPU

Se o \`nvidia-smi\` mostra a GPU abaixo de 90% de uso durante o treino, ela está **esperando dados**. O problema é a leitura.`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Sintoma', 'Causa provável', 'O que fazer'],
          linhas: [
            ['GPU oscilando entre 0% e 100%', 'o DataLoader não dá conta', 'mais `num_workers`; `persistent_workers=True`; `pin_memory=True`'],
            ['CPU em 100% em todos os núcleos', 'decodificação e aumentação caras', 'imagens já redimensionadas em disco; decodificar na GPU (DALI, `torchvision.io.decode_jpeg(device="cuda")`)'],
            ['Disco em 100%', 'milhões de arquivos pequenos', 'empacotar em fragmentos (WebDataset, LMDB); SSD'],
            ['Primeira época lenta, as seguintes rápidas', 'cache do sistema de arquivos enchendo', 'normal'],
            ['Tudo lento com GPU ociosa', '`.item()` ou `.cpu()` a cada passo', 'registrar métricas a cada N passos'],
            ['Memória da GPU cresce até estourar', 'tensores com grafo guardados em lista', '`.item()` ou `.detach()` antes de guardar'],
          ],
        },
        {
          t: 'texto',
          md: `### A caixa de ferramentas

| Ferramenta | Para |
|---|---|
| \`torch.profiler\` | onde o tempo vai, por operação, em CPU e GPU |
| \`torch.cuda.max_memory_allocated()\` | pico de memória de um trecho |
| \`nvidia-smi dmon\`, \`nvtop\` | uso da GPU ao longo do tempo |
| \`py-spy top --pid ...\` | o que o processo Python está fazendo agora, sem alterar o código |
| \`torch.compile(modelo)\` | compila o grafo; ganho variável, com tempo de compilação na primeira chamada. Mais maduro no Linux |
| \`torch.backends.cudnn.benchmark = True\` | deixa o cuDNN testar algoritmos; ajuda com entrada de tamanho fixo |

E para inferência em produção, o caminho da trilha de visão continua valendo: **exportar** (ONNX, TensorRT) rende mais do que qualquer ajuste dentro do PyTorch.

A ordem de trabalho, sempre: **medir, achar o gargalo, mexer em uma coisa, medir de novo.**`,
        },
        {
          t: 'quiz',
          pergunta: 'Por que é preciso chamar `torch.cuda.synchronize()` ao cronometrar código de GPU?',
          opcoes: [
            'Para liberar memória.',
            'Porque as operações em CUDA são assíncronas: a chamada retorna antes de o cálculo terminar, e sem sincronizar mede-se só o tempo de enfileirar.',
            'Para ativar a precisão mista.',
            'Porque a GPU tem relógio próprio.',
          ],
          correta: 1,
          explicacao: 'O Python segue adiante enquanto a GPU trabalha. Sincronizar espera a fila esvaziar, e só então o relógio reflete o trabalho feito.',
        },
        {
          t: 'quiz',
          pergunta: 'Durante o treino, a GPU fica em 40% de uso. O que isso sugere?',
          opcoes: [
            'Que o modelo é pequeno demais.',
            'Que a GPU está esperando dados: o gargalo está na leitura, decodificação ou aumentação, e não no modelo.',
            'Que falta memória de vídeo.',
            'Que a taxa de aprendizado está baixa.',
          ],
          correta: 1,
          explicacao: 'Trocar de GPU ou ativar precisão mista não ajuda quando o que limita é o pipeline de dados. O primeiro passo é acelerar o DataLoader.',
        },
      ],
    },
  ],
};
