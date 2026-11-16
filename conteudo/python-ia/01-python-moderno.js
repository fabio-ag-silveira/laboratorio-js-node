export const moderno = {
  id: 'python-moderno',
  titulo: 'Python moderno',
  cor: '#f0c14b',
  licoes: [
    // ------------------------------------------------------------------
    {
      id: 'ambiente-e-projeto',
      titulo: 'Ambiente e projeto: uv, pyproject e ruff',
      minutos: 10,
      resumo: 'O ferramental de 2026, que substituiu pip, venv, requirements.txt, black, isort e flake8 por duas ferramentas.',
      blocos: [
        {
          t: 'texto',
          md: `Você escreve Python há anos. Esta trilha não ensina a linguagem: ela atualiza o **entorno** (ferramentas, tipagem), revisita por dentro o que você usa todo dia (NumPy, PyTorch) e termina no que faz um modelo virar serviço.

O ferramental mudou muito de 2023 para cá, e mudou para algo parecido com o que você viu no mundo do Node.

| Tarefa | Jeito antigo | Hoje |
|---|---|---|
| Instalar o Python | instalador, pyenv, conda | \`uv python install 3.13\` |
| Ambiente virtual | \`python -m venv .venv\` + ativar | o **uv** cria e usa sozinho |
| Dependências | \`requirements.txt\`, à mão | \`pyproject.toml\` + \`uv.lock\` |
| Instalar | \`pip install\` | \`uv add\`, \`uv sync\` |
| Rodar | ativar o ambiente, \`python x.py\` | \`uv run x.py\` |
| Formatar | black + isort | \`ruff format\` |
| Lint | flake8 + plugins | \`ruff check\` |
| Tipos | mypy | pyright (ou mypy; e o \`ty\`, da mesma equipe do uv, ainda novo) |
| Testes | pytest | pytest |

**uv** e **ruff** são escritos em Rust pela Astral, e são de dez a cem vezes mais rápidos que as ferramentas que substituem. A ponte com o Node é quase direta:

| Node | Python com uv |
|---|---|
| \`package.json\` | \`pyproject.toml\` |
| \`package-lock.json\` | \`uv.lock\` |
| \`node_modules/\` | \`.venv/\` |
| \`npm install\` | \`uv sync\` |
| \`npm install pacote\` | \`uv add pacote\` |
| \`npm run teste\` / \`npx ferramenta\` | \`uv run pytest\` / \`uvx ferramenta\` |`,
        },
        {
          t: 'codigo',
          titulo: 'Um projeto do zero (para ler)',
          lang: 'bash',
          codigo: `# instalar o uv (uma vez)
winget install astral-sh.uv

uv init servico-de-inferencia          # cria pyproject.toml, .python-version, README
cd servico-de-inferencia

uv add fastapi "uvicorn[standard]" pydantic numpy opencv-python-headless
uv add --dev pytest ruff pyright httpx    # só para desenvolvimento

uv run pytest                          # cria a .venv e instala, se preciso; depois roda
uv run ruff check --fix . && uv run ruff format .
uv run pyright

uv lock --upgrade                      # atualiza as versões travadas
uv sync --frozen                       # na CI e no Docker: instala EXATAMENTE o uv.lock`,
        },
        {
          t: 'codigo',
          titulo: 'pyproject.toml: um arquivo para o projeto inteiro (para ler)',
          lang: 'bash',
          codigo: `[project]
name = "servico-de-inferencia"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115",
    "numpy>=2.0",
    "opencv-python-headless>=4.10",
    "pydantic>=2.9",
    "uvicorn[standard]>=0.30",
]

[dependency-groups]
dev = ["httpx", "pyright", "pytest", "ruff"]

[tool.ruff]
line-length = 110
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B", "SIM", "NPY"]   # erros, imports, modernização, armadilhas, NumPy

[tool.pyright]
typeCheckingMode = "standard"

[tool.pytest.ini_options]
testpaths = ["tests"]`,
        },
        {
          t: 'texto',
          md: `### PyTorch com GPU, a pegadinha de sempre

O \`torch\` do PyPI nem sempre é o que tem CUDA. No \`pyproject.toml\` declara-se de onde ele vem:

\`\`\`bash
[[tool.uv.index]]
name = "pytorch-cu128"
url = "https://download.pytorch.org/whl/cu128"
explicit = true

[tool.uv.sources]
torch = { index = "pytorch-cu128" }
torchvision = { index = "pytorch-cu128" }
\`\`\`

Assim o arquivo de trava registra a variante exata, e a máquina de treino, a CI e o contêiner instalam a mesma coisa.

### A estrutura que evita dor

\`\`\`
servico-de-inferencia/
├── pyproject.toml
├── uv.lock                   vai para o git
├── src/inferencia/           o pacote: importável como "inferencia"
│   ├── __init__.py
│   ├── api.py                FastAPI
│   ├── modelo.py             carregar e rodar o modelo
│   ├── preprocessamento.py   o MESMO do treino (lição de paridade)
│   └── esquemas.py           modelos Pydantic
├── tests/
├── notebooks/                exploração; não é código de produção
└── Dockerfile
\`\`\`

O layout com \`src/\` impede o erro clássico de os testes passarem porque importam a pasta local, e o pacote instalado estar quebrado.

### E o conda?

Continua útil quando o problema é **dependência que não é Python**: CUDA, GDAL, bibliotecas de sistema. Para projeto de aplicação, o par uv e Docker resolve com mais reprodutibilidade. Se precisar dos pacotes do conda-forge, o **pixi** é o equivalente moderno.

### Fontes

- [uv: documentação](https://docs.astral.sh/uv/)
- [Ruff: documentação](https://docs.astral.sh/ruff/)
- [PyTorch com uv](https://docs.astral.sh/uv/guides/integration/pytorch/)

Conferido em novembro de 2026.`,
        },
        {
          t: 'quiz',
          pergunta: 'Qual é o papel do arquivo `uv.lock`?',
          opcoes: [
            'Listar as dependências diretas do projeto.',
            'Registrar a versão exata de todas as dependências, diretas e indiretas, para que toda máquina instale o mesmo conjunto. Vai para o controle de versão.',
            'Impedir que dois processos instalem ao mesmo tempo.',
            'Guardar o cache de downloads.',
          ],
          correta: 1,
          explicacao: 'É o `package-lock.json` do Python. O `pyproject.toml` diz o que você quer ("numpy>=2.0"); o arquivo de trava diz o que foi resolvido.',
        },
        {
          t: 'quiz',
          pergunta: 'Por que o layout com a pasta `src/` é recomendado?',
          opcoes: [
            'Porque o Python exige.',
            'Porque impede importar o pacote direto da pasta do projeto por acidente: os testes passam a usar o pacote instalado, como o usuário usará.',
            'Porque é mais rápido.',
            'Porque o ruff só lê `src/`.',
          ],
          correta: 1,
          explicacao: 'Sem `src/`, `import inferencia` acha a pasta local mesmo com o empacotamento quebrado. Com `src/`, só funciona se a instalação estiver certa.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'tipagem',
      titulo: 'Tipagem que paga o aluguel',
      minutos: 13,
      resumo: 'Anotações modernas, dataclass, Protocol e Pydantic. Onde o tipo evita bug, e a diferença entre conferir e validar.',
      blocos: [
        {
          t: 'texto',
          md: `Código de pesquisa sobrevive sem tipos. Código de serviço, mantido por mais de uma pessoa durante anos, não. E há um motivo novo: você vai trabalhar com **TypeScript e C#**, onde o tipo é parte do contrato. Python com anotações deixa as três pontas falando a mesma língua.

Duas coisas diferentes, que se confundem:

| | Quando age | Ferramenta | O que garante |
|---|---|---|---|
| **Conferência estática** | antes de rodar, no editor e na CI | pyright, mypy | que o **seu código** é coerente com as anotações |
| **Validação em execução** | quando o dado chega | Pydantic | que o **dado de fora** tem o formato esperado |

Anotação sozinha não valida nada: \`def f(x: int)\` aceita uma string em tempo de execução, sem reclamar. O tipo estático protege o interior do programa; a validação protege as **fronteiras** (HTTP, arquivo, banco, fila).

### A sintaxe de hoje

\`\`\`python
# antigo (até 3.8)                       # hoje (3.10+)
from typing import List, Dict,           list[int]
    Optional, Union                      dict[str, float]
List[int]                                str | None
Optional[str]                            int | str
Union[int, str]
\`\`\``,
        },
        {
          t: 'codigo',
          titulo: 'dataclass, Literal e Protocol',
          rodar: 'python',
          codigo: `from dataclasses import dataclass, field
from typing import Literal, Protocol

Classe = Literal["mariposa", "cigarrinha", "mosca"]       # um conjunto fechado de textos

@dataclass(frozen=True, slots=True)                        # imutável e enxuta em memória
class Deteccao:
    classe: Classe
    confianca: float
    caixa: tuple[float, float, float, float]               # x1, y1, x2, y2

    @property
    def area(self) -> float:
        x1, y1, x2, y2 = self.caixa
        return max(0.0, x2 - x1) * max(0.0, y2 - y1)

@dataclass
class Resultado:
    arquivo: str
    deteccoes: list[Deteccao] = field(default_factory=list)   # NUNCA "= []" como padrão

    def contar(self, minimo: float = 0.5) -> dict[Classe, int]:
        contagem: dict[Classe, int] = {}
        for d in self.deteccoes:
            if d.confianca >= minimo:
                contagem[d.classe] = contagem.get(d.classe, 0) + 1
        return contagem

# Protocol: "qualquer coisa que tenha este método". É a tipagem do duck typing.
class Detector(Protocol):
    def detectar(self, arquivo: str) -> Resultado: ...

class DetectorFalso:                                       # não herda de nada
    def detectar(self, arquivo: str) -> Resultado:
        return Resultado(arquivo, [Deteccao("mariposa", 0.91, (10, 10, 40, 30)),
                                   Deteccao("mosca", 0.42, (80, 60, 95, 72)),
                                   Deteccao("mariposa", 0.77, (200, 120, 236, 150))])

def processar(detector: Detector, arquivo: str) -> dict[Classe, int]:
    return detector.detectar(arquivo).contar()

r = DetectorFalso().detectar("a-01.jpg")
print(r.deteccoes[0], "| área:", r.deteccoes[0].area)
print("contagem com confiança >= 0.5:", processar(DetectorFalso(), "a-01.jpg"))

try:
    r.deteccoes[0].confianca = 0.1                         # frozen: não deixa
except Exception as e:
    print(type(e).__name__, "->", e)

# E a prova de que anotação NÃO valida em execução:
errada = Deteccao("abelha", "alta", (0, 0, 0, 0))          # o pyright acusa as duas; o Python aceita
print("o Python aceitou:", errada)`,
        },
        {
          t: 'texto',
          md: `O \`Protocol\` é o que torna o código **testável sem herança**: \`processar\` aceita o detector real em produção e o \`DetectorFalso\` no teste, e o verificador de tipos confere os dois. É o mesmo papel de uma \`interface\` no C# e no TypeScript, com a diferença de que a classe não precisa declarar que a implementa.

A última linha é o ponto da lição: o Python criou uma \`Deteccao\` com classe \`"abelha"\` e confiança \`"alta"\`. O pyright teria sublinhado a linha no editor. Em execução, ninguém impede. Se esse dado viesse de um JSON, o erro só apareceria muito depois, numa conta com a confiança.

### Pydantic: validar na fronteira

O **Pydantic** usa as mesmas anotações para **validar e converter** os dados na entrada. É a base do FastAPI, e o equivalente do Zod no TypeScript.`,
        },
        {
          t: 'codigo',
          titulo: 'Pydantic: o dado de fora é conferido ao entrar',
          rodar: 'python',
          requerPython: ['pydantic'],
          codigo: `from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field, ValidationError, field_validator

class Deteccao(BaseModel):
    classe: Literal["mariposa", "cigarrinha", "mosca"]
    confianca: float = Field(ge=0, le=1)                      # entre 0 e 1
    caixa: tuple[float, float, float, float]

    @field_validator("caixa")
    @classmethod
    def caixa_coerente(cls, c):
        x1, y1, x2, y2 = c
        if x2 <= x1 or y2 <= y1:
            raise ValueError("x2 deve ser maior que x1, e y2 maior que y1")
        return c

class Captura(BaseModel):
    armadilha: str = Field(pattern=r"^[A-Z]-\\d{2}$")
    capturada_em: datetime
    deteccoes: list[Deteccao] = []                            # no Pydantic, padrão mutável é seguro

# 1. JSON bom: tipos convertidos (texto ISO vira datetime; "0.91" vira float)
bom = '{"armadilha": "A-01", "capturada_em": "2026-03-03T07:37:00-04:00", "deteccoes": [{"classe": "mariposa", "confianca": "0.91", "caixa": [10, 10, 40, 30]}]}'
c = Captura.model_validate_json(bom)
print(type(c.capturada_em).__name__, c.capturada_em.utcoffset(), "|", type(c.deteccoes[0].confianca).__name__, c.deteccoes[0].confianca)

# 2. JSON ruim: TODOS os problemas, com o caminho de cada um
ruim = '{"armadilha": "a1", "capturada_em": "ontem", "deteccoes": [{"classe": "abelha", "confianca": 1.7, "caixa": [40, 10, 10, 30]}]}'
try:
    Captura.model_validate_json(ruim)
except ValidationError as e:
    for erro in e.errors():
        print("  ", ".".join(str(p) for p in erro["loc"]), "->", erro["msg"])

# 3. De volta para JSON, e o esquema que documenta a API sozinho
print(c.model_dump_json()[:90], "...")
print("campos obrigatórios no JSON Schema:", Captura.model_json_schema()["required"])`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Ferramenta', 'Use para', 'Não use para'],
          linhas: [
            ['`dataclass`', 'estruturas internas do programa: leves, sem validação', 'dado que vem de fora'],
            ['`TypedDict`', 'dar tipo a dicionários que já existem (JSON de terceiros)', 'modelar o domínio'],
            ['`NamedTuple`', 'tuplas pequenas com nome: `Caixa(x1, y1, x2, y2)`', 'estruturas que crescem'],
            ['Pydantic `BaseModel`', 'fronteiras: requisição e resposta HTTP, configuração, arquivos', 'o laço interno de processamento: a validação tem custo'],
            ['`Protocol`', 'dizer o que uma dependência precisa fazer, sem herança', ''],
            ['`Literal`, `Enum`', 'conjuntos fechados de valores', 'texto livre'],
          ],
        },
        {
          t: 'texto',
          md: `### Arrays: a parte em que a tipagem ainda é fraca

O tipo de um array NumPy ou de um tensor não carrega o **formato**. \`np.ndarray\` não diz se é \`(N, 4)\` ou \`(4, N)\`, que é exatamente onde os erros de visão computacional moram. O que se faz na prática:

- **Nome e docstring com o formato**: \`caixas: np.ndarray  # (N, 4), xyxy, float32\`.
- **\`assert\` de formato na entrada** das funções centrais: \`assert caixas.ndim == 2 and caixas.shape[1] == 4\`.
- A biblioteca **jaxtyping** permite anotar \`Float[np.ndarray, "n 4"]\` e conferir em execução. Vale em código de modelo.

### Configurar com gosto

\`pyright\` no modo \`standard\` em projeto existente, \`strict\` em projeto novo. A regra \`UP\` do ruff reescreve as anotações antigas para as novas sozinha. E a conferência de tipos entra na CI: tipo que ninguém confere apodrece.`,
        },
        {
          t: 'quiz',
          pergunta: 'A função `def area(caixa: tuple[float, float, float, float]) -> float` recebe uma string em tempo de execução. O que acontece?',
          opcoes: [
            'O Python levanta `TypeError` na chamada.',
            'Nada na chamada: anotações não são conferidas em execução. O erro, se houver, aparece quando o corpo tentar usar o valor.',
            'A string é convertida.',
            'O programa não compila.',
          ],
          correta: 1,
          explicacao: 'Anotações são metadados. Quem as confere antes de rodar é o pyright ou o mypy; quem valida dado em execução é uma biblioteca como o Pydantic.',
        },
        {
          t: 'quiz',
          pergunta: 'Onde a validação com Pydantic deve ficar num serviço de inferência?',
          opcoes: [
            'Em toda função, para garantir.',
            'Nas fronteiras: o que entra por HTTP, arquivo de configuração, fila. Por dentro, o código confia nos tipos e usa estruturas leves.',
            'Só nos testes.',
            'Em lugar nenhum: o tipo estático basta.',
          ],
          correta: 1,
          explicacao: 'Validar custa tempo e só é necessário onde o dado não é confiável. Depois de validado na entrada, o interior do programa trabalha com tipos garantidos.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'numpy-vetorizado',
      titulo: 'NumPy por dentro: broadcasting, vistas e vetorização',
      minutos: 14,
      resumo: 'As três regras do broadcasting, a diferença entre vista e cópia, e a matriz de IoU sem nenhum laço.',
      blocos: [
        {
          t: 'texto',
          md: `Você usa NumPy todo dia. Esta lição é sobre os três mecanismos que, entendidos a fundo, eliminam laços e uma classe inteira de bugs silenciosos.

### Broadcasting: as regras

Quando dois arrays de formatos diferentes entram numa operação, o NumPy alinha os formatos **pela direita** e, para cada dimensão:

1. se os tamanhos são iguais, segue;
2. se um deles é **1**, ele é esticado para o tamanho do outro;
3. se falta a dimensão num dos arrays, ela entra como 1;
4. caso contrário, erro.

\`\`\`
imagem   (720, 960, 3)        caixas     (N, 1, 4)
média              (3,)       gabarito      (M, 4)
resultado (720, 960, 3)       resultado  (N, M, 4)
\`\`\`

O segundo caso é o truque central da lição: inserir uma dimensão de tamanho 1 faz o NumPy calcular **todos os pares**.`,
        },
        {
          t: 'codigo',
          titulo: 'Broadcasting: formatos que casam, e o que casa por acidente',
          rodar: 'python',
          codigo: `import numpy as np

def tentar(a, b):
    try:
        return np.broadcast_shapes(a, b)
    except ValueError:
        return "ERRO"

for a, b in [((720, 960, 3), (3,)), ((720, 960, 3), (960, 3)), ((720, 960, 3), (720, 960)),
             ((5, 1, 4), (7, 4)), ((5, 4), (7, 4)), ((5,), (5, 1))]:
    print(f"{str(a):>14} com {str(b):<10} -> {tentar(a, b)}")

# A última linha é o acidente clássico: vetor (5,) menos coluna (5, 1) vira matriz (5, 5).
previsto = np.array([1.0, 2.0, 3.0, 4.0, 5.0])            # (5,)
real = np.array([[1.1], [2.1], [2.9], [4.2], [5.0]])      # (5, 1): saiu de um modelo, ou de um reshape
erro = previsto - real
print("\\nformato do 'erro':", erro.shape, "| erro médio absoluto calculado:", round(float(np.abs(erro).mean()), 3))
print("o certo:", round(float(np.abs(previsto - real.ravel()).mean()), 3))`,
        },
        {
          t: 'texto',
          md: `O acidente da última linha não dá erro. Dá um **número plausível e errado**: em vez de cinco diferenças, vinte e cinco, e a métrica sai inflada. É um dos bugs mais comuns em código de avaliação e de função de perda. A defesa é um \`assert previsto.shape == real.shape\` antes de qualquer conta entre previsão e gabarito.

### Vetorizar: a matriz de IoU

Na trilha de visão, o IoU apareceu entre duas caixas. Avaliar um detector exige o IoU de **cada detecção contra cada caixa do gabarito**: uma matriz \`N × M\`. Com dois laços, são \`N × M\` chamadas de função em Python. Com broadcasting, são umas dez operações em C.`,
        },
        {
          t: 'codigo',
          titulo: 'IoU de todos contra todos: laço contra broadcasting',
          rodar: 'python',
          codigo: `import time
import numpy as np

rng = np.random.default_rng(0)

def caixas_aleatorias(n):
    xy = rng.uniform(0, 900, (n, 2))
    wh = rng.uniform(10, 60, (n, 2))
    return np.hstack([xy, xy + wh]).astype(np.float32)          # (n, 4): x1, y1, x2, y2

def iou_com_lacos(a, b):
    saida = np.zeros((len(a), len(b)), dtype=np.float32)
    for i, (ax1, ay1, ax2, ay2) in enumerate(a):
        for j, (bx1, by1, bx2, by2) in enumerate(b):
            largura = max(0.0, min(ax2, bx2) - max(ax1, bx1))
            altura = max(0.0, min(ay2, by2) - max(ay1, by1))
            inter = largura * altura
            uniao = (ax2 - ax1) * (ay2 - ay1) + (bx2 - bx1) * (by2 - by1) - inter
            saida[i, j] = inter / uniao
    return saida

def iou_vetorizado(a, b):
    assert a.ndim == 2 and a.shape[1] == 4 and b.ndim == 2 and b.shape[1] == 4
    a = a[:, None, :]                                            # (N, 1, 4)
    b = b[None, :, :]                                            # (1, M, 4)
    cima_esq = np.maximum(a[..., :2], b[..., :2])                # (N, M, 2)
    baixo_dir = np.minimum(a[..., 2:], b[..., 2:])               # (N, M, 2)
    inter = np.clip(baixo_dir - cima_esq, 0, None).prod(axis=-1)  # (N, M)
    area_a = (a[..., 2:] - a[..., :2]).prod(axis=-1)             # (N, 1)
    area_b = (b[..., 2:] - b[..., :2]).prod(axis=-1)             # (1, M)
    return inter / (area_a + area_b - inter)

a, b = caixas_aleatorias(400), caixas_aleatorias(300)

t = time.perf_counter(); lento = iou_com_lacos(a, b); t_laco = time.perf_counter() - t
t = time.perf_counter(); rapido = iou_vetorizado(a, b); t_vet = time.perf_counter() - t

print("formato:", rapido.shape, "| maior diferença entre as duas versões:", float(np.abs(lento - rapido).max()))
print(f"laços: {t_laco * 1000:.0f} ms | vetorizado: {t_vet * 1000:.2f} ms | {t_laco / t_vet:.0f} vezes mais rápido")

# O casamento da avaliação sai da matriz, sem laço:
melhor = rapido.argmax(axis=1)                                   # para cada detecção, o gabarito mais sobreposto
print("detecções com IoU >= 0.5 com algum gabarito:", int((rapido.max(axis=1) >= 0.5).sum()), "de", len(a))`,
        },
        {
          t: 'texto',
          md: `O ganho é de dezenas de vezes aqui, cresce com o número de caixas, e os dois resultados são idênticos. O custo é **memória**: os intermediários têm formato \`(N, M, 2)\`. Com 100 mil caixas contra 100 mil, isso não cabe. A saída é processar em blocos, ou usar \`torchvision.ops.box_iou\` na GPU, que faz exatamente esta conta.

### Vista ou cópia

Fatiar um array **não copia**: devolve uma **vista**, outra janela para a mesma memória. Alterar a vista altera o original. Indexação "avançada" (com lista, array de índices ou máscara) **copia**.`,
        },
        {
          t: 'codigo',
          titulo: 'Quem compartilha memória com quem',
          rodar: 'python',
          codigo: `import numpy as np

img = np.zeros((4, 6), dtype=np.uint8)

recorte = img[1:3, 2:5]              # fatia: VISTA
recorte[:] = 255
print("depois de pintar o recorte, a imagem original mudou:")
print(img)

selecao = img[[0, 1]]                # lista de índices: CÓPIA
selecao[:] = 7
print("\\npintar a seleção por índices NÃO muda o original:", img[0].tolist())

for nome, x in [("fatia", img[1:3]), ("máscara", img[img > 0]), ("lista", img[[0, 1]]),
                ("reshape", img.reshape(6, 4)), ("transposta", img.T), ("astype", img.astype(np.float32)),
                ("ravel", img.ravel()), ("flatten", img.flatten())]:
    print(f"{nome:>10}: {'vista' if np.shares_memory(img, x) else 'cópia'}")

# A consequência em visão: o recorte "guardado" muda quando a imagem é reaproveitada
quadro = np.full((2, 2), 10, dtype=np.uint8)
guardado = quadro[0:1]               # vista
quadro[:] = 99                       # o próximo quadro do vídeo reaproveita o mesmo buffer
print("\\nrecorte guardado sem .copy():", guardado.tolist(), "<- virou o quadro novo")`,
        },
        {
          t: 'texto',
          md: `Regra prática: **quem guarda um recorte para depois chama \`.copy()\`**. Câmeras e decodificadores de vídeo reaproveitam o mesmo buffer a cada quadro, e o recorte guardado "muda sozinho".

O \`transpose\` também é vista, e daí vem um detalhe que aparece em exportação de modelo: o array transposto deixa de ser **contíguo** na memória. Algumas funções (\`torch.from_numpy(...).view\`, bibliotecas em C) exigem \`np.ascontiguousarray(x)\`.

### Mais três ferramentas que substituem laços

| Em vez de | Use |
|---|---|
| laço acumulando em lista e \`np.array(lista)\` | pré-alocar, ou operar no array inteiro |
| \`if\` dentro do laço | \`np.where(cond, a, b)\`, máscaras booleanas |
| contar por categoria com dicionário | \`np.bincount(ids, minlength=n)\`, \`np.unique(x, return_counts=True)\` |
| somas e produtos com eixos trocados | \`np.einsum('nchw,c->nhw', x, pesos)\`: os índices dizem o que acontece |
| ordenar tudo para pegar os k maiores | \`np.argpartition(x, -k)[-k:]\` |`,
        },
        {
          t: 'nota',
          estilo: 'pegadinha',
          md: `**NumPy 2 mudou a promoção de tipos.** Desde o NumPy 2.0, um número Python não "alarga" mais o tipo do array. Com um array \`uint8\` valendo 200: somar \`100\` **dá a volta** e resulta em 44, ainda \`uint8\`; somar \`300\` levanta \`OverflowError\`, porque 300 não cabe em \`uint8\`. E \`np.float32(3) + 3.0\` continua \`float32\`, em vez de virar \`float64\`. Código antigo que contava com o alargamento muda de resultado. Em imagem \`uint8\`, converta de forma explícita antes de fazer conta: \`img.astype(np.float32)\`.`,
        },
        {
          t: 'quiz',
          pergunta: 'Qual é o formato do resultado de `a - b`, com `a.shape == (5,)` e `b.shape == (5, 1)`?',
          opcoes: ['`(5,)`', '`(5, 5)`: o broadcasting estica as duas dimensões, e a conta vira "todos contra todos".', '`(5, 1)`', 'Erro.'],
          correta: 1,
          explicacao: 'Alinhando pela direita: (1, 5) com (5, 1) vira (5, 5). É o acidente que infla métricas e perdas sem dar erro.',
        },
        {
          t: 'quiz',
          pergunta: 'Você guarda `recorte = quadro[y1:y2, x1:x2]` numa lista para processar depois, e os recortes aparecem todos iguais ao último quadro. Por quê?',
          opcoes: [
            'Porque a lista guarda só o último item.',
            'Porque a fatia é uma vista do buffer do quadro, que a câmera reaproveita; sem `.copy()`, todos os recortes apontam para a mesma memória.',
            'Porque `uint8` estourou.',
            'Porque faltou converter para RGB.',
          ],
          correta: 1,
          explicacao: 'Fatiar não copia. Quem precisa do conteúdo depois que a origem mudar tem de copiar.',
        },
      ],
    },
  ],
};
