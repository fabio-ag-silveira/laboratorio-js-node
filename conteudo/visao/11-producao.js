// Todos os blocos executáveis deste módulo partem do mesmo classificador pequeno
// de recortes (fundo, inseto, detrito). O preâmbulo fica repetido de propósito:
// cada bloco precisa rodar sozinho.
const PREAMBULO = `import warnings
warnings.filterwarnings("ignore")
import numpy as np, torch, torch.nn as nn, cv2
import lab

def tensor(X):                      # BGR uint8 (N, A, L, 3) -> RGB float (N, 3, A, L) em [0, 1]
    return torch.from_numpy(X[..., ::-1].copy()).permute(0, 3, 1, 2).float().div(255)

def treinar(X, y, epocas=12):
    torch.manual_seed(0)
    def bloco(e, s):
        return [nn.Conv2d(e, s, 3, padding=1), nn.GroupNorm(4, s), nn.ReLU(), nn.MaxPool2d(2)]
    rede = nn.Sequential(*bloco(3, 16), *bloco(16, 32), *bloco(32, 64),
                         nn.AdaptiveAvgPool2d(1), nn.Flatten(), nn.Linear(64, 3))
    opt = torch.optim.AdamW(rede.parameters(), lr=2e-3, weight_decay=1e-4)
    Xt, yt = tensor(X), torch.from_numpy(y)
    for _ in range(epocas):
        perm = torch.randperm(len(Xt))
        for i in range(0, len(Xt), 64):
            idx = perm[i:i + 64]
            perda = nn.functional.cross_entropy(rede(Xt[idx]), yt[idx])
            opt.zero_grad(); perda.backward(); opt.step()
    return rede.eval()

def acerto(rede, Xt, y):
    with torch.no_grad():
        return float((rede(Xt).argmax(1).numpy() == y).mean())

Xtr, ytr = lab.recortes(30, semente=0)
Xte, yte = lab.recortes(12, semente=99)
rede = treinar(Xtr, ytr)
`;

export const modulo = {
  id: 'producao',
  titulo: 'Do modelo ao produto',
  cor: '#e0a458',
  licoes: [
    // ------------------------------------------------------------------
    {
      id: 'exportar',
      titulo: 'Exportar: ONNX, TensorRT e companhia',
      minutos: 12,
      resumo: 'O modelo sai do PyTorch e vira um grafo que outro programa executa. O que muda, e o que conferir.',
      blocos: [
        {
          t: 'texto',
          md: `O arquivo \`.pt\` do treino depende de Python, do PyTorch e do código que define a rede. Em produção quase nunca se quer isso. **Exportar** é converter o modelo num **grafo de operações** com os pesos embutidos, que um *runtime* enxuto executa, em C#, em C++, num celular.

| Formato | Runtime | Onde roda | Observação |
|---|---|---|---|
| **ONNX** | ONNX Runtime | CPU, GPU, celular, navegador, .NET | o formato de troca; quase tudo parte dele |
| **TensorRT** (\`.engine\`) | TensorRT | GPU NVIDIA, Jetson | o mais rápido em NVIDIA; o arquivo vale só para aquela GPU e aquela versão |
| **OpenVINO** | OpenVINO | CPU e GPU integrada Intel | o melhor em servidor sem GPU dedicada |
| **Core ML** | Core ML | iPhone, iPad, Mac | usa o Neural Engine da Apple |
| **LiteRT** (\`.tflite\`) | LiteRT | Android, iOS, microcontrolador | o antigo TensorFlow Lite, renomeado |
| **ExecuTorch** (\`.pte\`) | ExecuTorch | celular e embarcados | o caminho direto do PyTorch para o dispositivo |

O ONNX interessa em dobro para você: o **ONNX Runtime tem pacote oficial para .NET**. Um modelo treinado em Python pode rodar dentro da API em C#, sem serviço Python no meio. Fica na trilha de C#.`,
        },
        {
          t: 'nota',
          estilo: 'atencao',
          md: `O bloco abaixo precisa do pacote \`onnx\`, que o PyTorch usa para gravar o arquivo e que não vem junto com o \`onnxruntime\`:

\`\`\`bash
pip install onnx
\`\`\`

Sem ele, o laboratório mostra o código e avisa o que falta.`,
        },
        {
          t: 'codigo',
          titulo: 'Exportar o classificador, conferir e medir',
          rodar: 'python',
          requerPython: ['torch', 'onnx', 'onnxruntime', 'cv2'],
          tempo: 120,
          codigo: `${PREAMBULO}
import os, tempfile, time
from collections import Counter
import onnx, onnxruntime as ort

arquivo = os.path.join(tempfile.gettempdir(), "classificador-recortes.onnx")
exemplo = tensor(Xte[:1])                              # a exportação "grava" uma passada com esta entrada

torch.onnx.export(
    rede, exemplo, arquivo,
    input_names=["imagem"], output_names=["notas"],
    dynamic_axes={"imagem": {0: "lote"}, "notas": {0: "lote"}},   # sem isto, o lote fica fixo em 1
    opset_version=17,
    dynamo=False,                                       # exportador clássico; o novo pede o pacote onnxscript
)

grafo = onnx.load(arquivo)
onnx.checker.check_model(grafo)                         # o arquivo é um ONNX válido?
print(f"arquivo: {os.path.getsize(arquivo) / 1024:.0f} kB")
print("operações no grafo:", dict(Counter(no.op_type for no in grafo.graph.node)))

sessao = ort.InferenceSession(arquivo, providers=["CPUExecutionProvider"])
entrada = sessao.get_inputs()[0]
print("entrada:", entrada.name, entrada.shape, entrada.type)

# 1. as saídas batem?
lote = tensor(Xte[:256])
com_onnx = sessao.run(None, {"imagem": lote.numpy()})[0]
with torch.no_grad():
    com_torch = rede(lote).numpy()
print(f"\\nmaior diferença entre as saídas: {np.abs(com_onnx - com_torch).max():.1e}")
print(f"mesma classe em {(com_onnx.argmax(1) == com_torch.argmax(1)).mean():.1%} dos recortes")

# 2. quanto tempo leva? Uma imagem por vez, na CPU, uma thread no PyTorch
torch.set_num_threads(1)
uma, uma_np = lote[:1], lote[:1].numpy()
def medir(f, n=500):
    for _ in range(50): f()                             # aquecimento
    t = time.perf_counter()
    for _ in range(n): f()
    return (time.perf_counter() - t) / n * 1000
with torch.no_grad():
    t_torch = medir(lambda: rede(uma))
t_onnx = medir(lambda: sessao.run(None, {"imagem": uma_np}))
print(f"\\nPyTorch: {t_torch:.2f} ms por recorte | ONNX Runtime: {t_onnx:.2f} ms por recorte")`,
        },
        {
          t: 'texto',
          md: `Três coisas para notar na saída.

**O grafo não tem as suas camadas.** A rede usa \`GroupNorm\`, e o ONNX não tem essa operação: o exportador a decompôs em \`Reshape\`, \`InstanceNormalization\`, \`Mul\` e \`Add\`. É normal, e é por isso que **toda exportação precisa de conferência numérica**. Uma diferença da ordem de 1e-4 ou menor é ruído de ponto flutuante. Uma diferença de 1e-2 é um erro de conversão.

**O lote dinâmico foi pedido.** Sem \`dynamic_axes\`, o arquivo só aceita o tamanho de lote do exemplo. Em detectores, o mesmo vale para a resolução.

**O runtime tende a ser mais rápido que o framework**, porque não carrega a maquinaria de treino. Num modelo minúsculo como este o ganho é pequeno e varia a cada execução. Em modelo grande e com GPU, a diferença entre PyTorch e TensorRT costuma ser de várias vezes.`,
        },
        {
          t: 'codigo',
          titulo: 'Exportar um detector com o Ultralytics (para ler)',
          lang: 'python',
          codigo: `from ultralytics import YOLO

modelo = YOLO("modelos/treinos/armadilhas/weights/best.pt")

modelo.export(format="onnx", imgsz=640, dynamic=True, simplify=True)
modelo.export(format="engine", imgsz=640, half=True)         # TensorRT em FP16: rode NA máquina de destino
modelo.export(format="openvino", imgsz=640)
modelo.export(format="tflite", imgsz=640)                     # LiteRT, para Android

# o arquivo exportado carrega com a mesma interface, o que facilita comparar
exportado = YOLO("modelos/treinos/armadilhas/weights/best.onnx")
print(exportado.val(data="modelos/dataset-armadilhas/dataset.yaml").box.map50)`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Armadilha da exportação', 'O que acontece', 'Como evitar'],
          linhas: [
            ['Engine do TensorRT copiada entre máquinas', 'não carrega, ou carrega com desempenho pior', 'gerar a engine na GPU e na versão do TensorRT de destino; guardar o ONNX como fonte'],
            ['NMS fora do grafo', 'o modelo exportado devolve milhares de caixas cruas, e cada cliente reimplementa o NMS de um jeito', 'modelos sem NMS (YOLO26, família DETR) eliminam o problema; nos outros, exportar com o NMS embutido'],
            ['Pré-processamento fora do grafo', 'treino e produção redimensionam e normalizam de formas diferentes', 'a lição de paridade, logo adiante'],
            ['Operação sem suporte', 'a conversão falha, ou cai num caminho lento na CPU', 'subir o opset; trocar a camada; testar a exportação antes de treinar por dias'],
            ['Medir só a velocidade', 'a engine FP16 ou INT8 perde precisão sem ninguém notar', 'rodar a validação inteira com o arquivo exportado e comparar o mAP'],
          ],
        },
        {
          t: 'quiz',
          pergunta: 'Depois de exportar um modelo, qual verificação não pode faltar?',
          opcoes: [
            'Que o arquivo exportado é menor que o original.',
            'Que as saídas do modelo exportado batem com as do original nas mesmas entradas, e que a métrica no conjunto de validação se manteve.',
            'Que o arquivo abre num editor de texto.',
            'Que o treino converge de novo.',
          ],
          correta: 1,
          explicacao: 'A exportação reescreve o modelo em outras operações. Só a comparação numérica e a validação completa mostram se a conversão preservou o comportamento.',
        },
        {
          t: 'quiz',
          pergunta: 'Por que uma engine do TensorRT deve ser gerada na máquina de destino?',
          opcoes: [
            'Porque o arquivo é grande demais para copiar.',
            'Porque a engine é otimizada para uma GPU e uma versão específicas do TensorRT; em outra combinação pode não carregar ou render menos.',
            'Porque a licença exige.',
            'Porque ela contém os dados de treino.',
          ],
          correta: 1,
          explicacao: 'O TensorRT escolhe implementações de cada camada medindo no hardware presente. O ONNX é o artefato portátil; a engine é um derivado local.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'quantizacao',
      titulo: 'Quantização, poda e destilação',
      minutos: 13,
      resumo: 'Três formas de encolher um modelo. A quantização na mão, para ver onde ela quebra.',
      blocos: [
        {
          t: 'texto',
          md: `Um peso em ponto flutuante de 32 bits (**FP32**) pode virar um de 16 bits (**FP16**) ou um inteiro de 8 bits (**INT8**). O modelo fica 2 ou 4 vezes menor, e em hardware com suporte fica mais rápido, porque aritmética inteira é barata.

A quantização para inteiros mapeia uma faixa de valores reais numa grade de níveis:

\`\`\`
escala = limite / (2^(bits-1) - 1)
inteiro = arredondar(peso / escala)      limitado a [-limite, +limite]
peso de volta = inteiro × escala
\`\`\`

Tudo depende de como se escolhe o **limite**. O painel mostra a distribuição dos pesos de uma camada, a grade de níveis e o erro. Aumente os valores extremos e troque a calibração.`,
        },
        { t: 'visual', componente: 'cv/quantizacao' },
        {
          t: 'texto',
          md: `Com o limite no valor máximo, **um punhado de pesos enormes estica a grade**, e os milhares de pesos pequenos, que são quase todos, ficam espremidos em poucos níveis. Calibrar por percentil sacrifica os extremos para dar resolução à maioria.

O bloco abaixo quantiza na mão os pesos do classificador de recortes e mede o acerto. Duas escolhas são comparadas: um limite para o **tensor inteiro** ou um limite **por canal** de saída.`,
        },
        {
          t: 'codigo',
          titulo: 'Quantizar os pesos na mão e medir o estrago',
          rodar: 'python',
          requerPython: ['torch', 'cv2'],
          tempo: 180,
          codigo: `${PREAMBULO}
import copy

def quantizar(w, bits, por_canal):
    niveis = 2 ** (bits - 1) - 1                      # 127 para 8 bits
    if por_canal:                                     # um limite por filtro (canal de saída)
        limite = w.abs().flatten(1).max(1).values.view(-1, *([1] * (w.dim() - 1)))
    else:                                             # um limite para a camada inteira
        limite = w.abs().max()
    escala = limite / niveis
    return (w / escala).round().clamp(-niveis, niveis) * escala

def versao_quantizada(rede, bits, por_canal):
    copia = copy.deepcopy(rede)
    with torch.no_grad():
        for camada in copia.modules():
            if isinstance(camada, (nn.Conv2d, nn.Linear)):
                camada.weight.copy_(quantizar(camada.weight, bits, por_canal))
    return copia

teste = tensor(Xte)
n_pesos = sum(c.weight.numel() for c in rede.modules() if isinstance(c, (nn.Conv2d, nn.Linear)))
print(f"{n_pesos} pesos | acerto em FP32: {acerto(rede, teste, yte):.1%}")

meia = copy.deepcopy(rede).half()
with torch.no_grad():
    print(f"acerto em FP16: {(meia(teste.half()).argmax(1).numpy() == yte).mean():.1%}\\n")

linhas = []
for bits in (8, 6, 4, 3, 2):
    linhas.append([f"{bits} bits", f"{n_pesos * bits / 8 / 1024:.1f} kB",
                   f"{acerto(versao_quantizada(rede, bits, False), teste, yte):.1%}",
                   f"{acerto(versao_quantizada(rede, bits, True), teste, yte):.1%}"])
lab.tabela(linhas, cabecalho=["pesos em", "tamanho", "limite por camada", "limite por canal"])`,
        },
        {
          t: 'texto',
          md: `O que a tabela mostra:

- **FP16 e 8 bits não custam nada** aqui. É o caso comum para os **pesos**: redes têm folga.
- **Com 3 bits, a escolha do limite decide tudo.** Com um limite só para a camada, o acerto desaba; por canal, quase não cai. Filtros diferentes têm faixas de valores diferentes, e uma grade única serve mal a todos. É por isso que a quantização **por canal** é o padrão para convoluções.
- **Com 2 bits não há salvação**: três níveis não representam um filtro.

### O que este experimento não mostra

Aqui só os **pesos** foram quantizados. Num modelo INT8 de verdade, as **ativações** (as saídas de cada camada) também são inteiras, e a faixa delas depende da imagem de entrada. Daí vem a **calibração**: rodar algumas centenas de imagens representativas para medir essas faixas. É nesse passo que a quantização costuma dar errado:

- **Conjunto de calibração ruim.** Calibrar com imagens que não parecem as de produção fixa faixas erradas.
- **A cabeça do detector.** As saídas de caixa (valores de 0 a 640) e de classe (de 0 a 1) têm escalas muito diferentes; juntas num tensor só, uma delas perde a resolução.
- **Objetos pequenos sofrem primeiro.** O erro de arredondamento desloca a caixa alguns pixels, o que é irrelevante num objeto de 200 pixels e fatal num de 12.

Um estudo de 2025 em celulares Android mediu isso em detectores YOLO: a quantização INT8 completa custou cerca de **6,5 pontos de mAP no YOLOv8 e 7,2 no YOLO11**, enquanto a de faixa dinâmica (só os pesos em 8 bits) custou de 0,1 a 0,2. São números de um estudo, num conjunto de aparelhos. A ordem de grandeza é o recado: **INT8 em detector não é de graça, e precisa ser medido no seu conjunto de teste**.`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Técnica', 'O que faz', 'Quando usar', 'Custo'],
          linhas: [
            ['FP16', 'metade dos bits, ainda ponto flutuante', 'sempre que houver GPU: é o padrão no TensorRT', 'perda quase nula'],
            ['INT8 pós-treino (PTQ)', 'quantiza pesos e ativações de um modelo pronto, com calibração', 'CPU, celular e NPU, quando a latência exige', 'pode custar vários pontos de mAP; medir'],
            ['Treino ciente de quantização (QAT)', 'simula o arredondamento durante o treino, e a rede se adapta', 'quando o PTQ perdeu demais', 'um ciclo de treino a mais'],
            ['Poda', 'remove pesos ou canais de pouca importância', 'raramente compensa hoje: escolher um modelo menor da família é mais simples', 'retreino; ganho real só com poda de canais inteiros'],
            ['Destilação', 'um modelo pequeno aprende a imitar as saídas de um grande', 'quando o modelo pequeno treinado direto não alcança a precisão', 'treinar o professor e o aluno'],
          ],
        },
        {
          t: 'texto',
          md: `Na prática, a ordem das tentativas é: **(1)** um modelo menor da mesma família, **(2)** FP16, **(3)** resolução de entrada menor, se os objetos aguentarem, **(4)** INT8 com calibração bem-feita, **(5)** QAT. A destilação já apareceu neste curso com outro nome: o padrão "professor grande, aluno pequeno" dos modelos de fundação é destilação feita pelos dados.

### Fontes

- [Otimização de hardware no Android para inferência de modelos (arXiv 2511.13453)](https://arxiv.org/html/2511.13453v1)
- [Quantização em dispositivos móveis, pela Arm](https://developer.arm.com/community/arm-community-blogs/b/ai-blog/posts/neural-network-model-quantization-on-mobile)

Conferido em novembro de 2026.`,
        },
        {
          t: 'quiz',
          pergunta: 'Por que a quantização por canal funciona melhor que um limite único por camada?',
          opcoes: [
            'Porque usa mais bits.',
            'Porque cada filtro tem sua própria faixa de valores; uma grade única desperdiça níveis nos filtros de valores pequenos.',
            'Porque ignora os pesos pequenos.',
            'Porque dispensa calibração das ativações.',
          ],
          correta: 1,
          explicacao: 'Com um limite por filtro, cada grade é ajustada à faixa daquele filtro. No experimento, isso separou um modelo que funciona de um que desaba, com os mesmos 3 bits.',
        },
        {
          t: 'quiz',
          pergunta: 'Um detector exportado em INT8 perdeu 7 pontos de mAP. Qual é o primeiro suspeito?',
          opcoes: [
            'Os pesos, que não cabem em 8 bits.',
            'A quantização das ativações: conjunto de calibração pouco representativo, ou a cabeça do detector misturando escalas muito diferentes.',
            'O tamanho do arquivo.',
            'A taxa de aprendizado.',
          ],
          correta: 1,
          explicacao: 'Pesos em 8 bits quase nunca são o problema. As ativações dependem da entrada, e a calibração define as faixas delas. O passo seguinte, se a calibração boa não resolver, é o treino ciente de quantização.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'onde-rodar',
      titulo: 'Onde rodar: borda, nuvem ou celular',
      minutos: 11,
      resumo: 'A decisão de arquitetura que vem antes do modelo, com as perguntas que a resolvem.',
      blocos: [
        {
          t: 'texto',
          md: `Onde a inferência roda define quase todo o resto: o tamanho do modelo, o formato de exportação, o custo e o que acontece quando não há sinal.

| | Nuvem | Borda (Jetson, mini-PC) | Celular |
|---|---|---|---|
| Modelo | o que couber no orçamento | médio, em TensorRT | pequeno, quantizado |
| Latência percebida | rede + fila + inferência | só a inferência | só a inferência |
| Sem internet | não funciona | funciona | funciona |
| Atualizar o modelo | uma implantação | atualizar cada aparelho | publicar versão do app, ou baixar o modelo |
| Custo | por uso, cresce com o volume | o aparelho, uma vez | zero de infraestrutura |
| Dados para retreino | chegam sozinhos | precisam ser enviados | precisam ser enviados |
| Variedade de hardware | você escolhe | você escolhe | centenas de aparelhos diferentes |

### As perguntas que decidem

1. **Há conexão no momento da captura?** No talhão, muitas vezes não.
2. **A resposta precisa ser imediata?** Contar insetos numa armadilha pode esperar minutos. Avisar o operador de que a foto ficou ruim não pode.
3. **Quantas imagens por dia?** Dez mil fotos por dia numa GPU de nuvem custam pouco. Vídeo contínuo de cem câmeras custa muito.
4. **Quem atualiza?** Um modelo que melhora toda semana é fácil de trocar no servidor e trabalhoso em mil celulares.
5. **A imagem pode sair do aparelho?** Privacidade e contrato às vezes respondem sozinhos.`,
        },
        {
          t: 'texto',
          md: `### O desenho híbrido

Para foto de armadilha tirada no campo, o desenho que costuma vencer divide o trabalho:

- **No celular, na hora:** o que precisa de resposta imediata e é barato. O portão de qualidade (foco, exposição, enquadramento) dos módulos 1 e 8, e talvez um detector pequeno para dar uma contagem provisória.
- **Fila local:** a foto e os metadados ficam guardados no aparelho e sobem quando houver sinal. É o *offline-first* da trilha de React Native.
- **No servidor, depois:** o modelo grande, com fatiamento, que dá a contagem oficial. Atualizar o modelo não exige nova versão do app, e toda imagem fica disponível para retreino.

O custo desse desenho é ter **dois modelos e dois números**: a contagem provisória e a oficial vão divergir, e o produto precisa deixar claro qual é qual.

### Rodar modelo dentro de um app React Native

| Biblioteca | Formato | Observação |
|---|---|---|
| \`react-native-executorch\` (Software Mansion) | \`.pte\` (ExecuTorch) | traz ganchos prontos, como detecção de objetos; exige a Nova Arquitetura |
| \`react-native-fast-tflite\` (Margelo) | \`.tflite\` (LiteRT) | acesso de baixo nível, com delegados de GPU; combina com a VisionCamera para processar quadros |
| \`onnxruntime-react-native\` (Microsoft) | \`.onnx\` | o mesmo arquivo do servidor; menos aceleração por hardware no celular |

Um aviso que vale para as três: **a mesma rede dá resultados diferentes em aceleradores diferentes**. Há relatos de modelos YOLO com confiança mais baixa no delegado de GPU do Android que na CPU. A conferência numérica da lição de exportação precisa ser repetida **no aparelho**, e em mais de um.

### Na borda: Jetson

É o terreno que você já conhece. O que mudou: desde o JetPack 7.2, a linha Orin e a linha Thor compartilham a mesma base de software, com TensorRT 10. A recomendação continua a mesma: exportar para ONNX, gerar a engine FP16 **no próprio aparelho** e validar o mAP com a engine.`,
        },
        {
          t: 'nota',
          estilo: 'campo',
          md: `**Meça a latência do sistema, e não a do modelo.** Um detector de 8 ms dentro de um fluxo em que decodificar o JPEG leva 30 ms, redimensionar leva 10 e o envio da resposta leva 200 não tem problema de modelo. Antes de quantizar, cronometre cada etapa. É comum o gargalo estar no pré-processamento ou na rede.`,
        },
        {
          t: 'texto',
          md: `### Fontes

- [React Native ExecuTorch, no blog da Expo](https://expo.dev/blog/how-to-run-ai-models-with-react-native-executorch)
- [Confiança baixa com o delegado de GPU no Android (fórum da Ultralytics)](https://community.ultralytics.com/t/low-confidence-scores-when-running-yolov11n-tflite-model-with-android-gpu-delegate/1717)
- [onnxruntime-react-native no npm](https://www.npmjs.org/package/onnxruntime-react-native)
- [JetPack 7.2 para a linha Orin (fórum da NVIDIA)](https://forums.developer.nvidia.com/t/jetpack-7-2-jetson-software-goes-agentic-with-jetson-linux-39-2/372057)

Conferido em novembro de 2026. Bibliotecas de celular mudam rápido: confira a versão e os requisitos antes de escolher.`,
        },
        {
          t: 'quiz',
          pergunta: 'O app fotografa armadilhas em áreas sem sinal, e a contagem alimenta um relatório semanal. Qual desenho faz mais sentido?',
          opcoes: [
            'Tudo na nuvem, com o app bloqueado até haver sinal.',
            'Checagem de qualidade no celular na hora da foto, fila local, e a contagem oficial no servidor quando a imagem subir.',
            'O maior modelo possível rodando no celular.',
            'Enviar as fotos por e-mail.',
          ],
          correta: 1,
          explicacao: 'O que precisa ser imediato (a foto presta?) fica no aparelho. O que pode esperar (a contagem) vai para onde o modelo é melhor, mais fácil de atualizar e onde as imagens ficam disponíveis para retreino.',
        },
        {
          t: 'quiz',
          pergunta: 'Por que validar o modelo no próprio aparelho, e não só no computador de desenvolvimento?',
          opcoes: [
            'Porque o aparelho tem tela menor.',
            'Porque o acelerador do aparelho (GPU, NPU) pode executar as operações com outra precisão e dar saídas diferentes das da CPU.',
            'Porque o arquivo muda ao ser copiado.',
            'Porque o conjunto de teste é outro.',
          ],
          correta: 1,
          explicacao: 'Delegados de GPU e NPU usam precisão reduzida e implementações próprias. Divergências entre CPU e acelerador são um problema conhecido, e só aparecem quando se compara no hardware real.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'paridade',
      titulo: 'Paridade entre treino e inferência',
      minutos: 11,
      resumo: 'O modelo é o mesmo, e o resultado piorou. Quase sempre é o pré-processamento.',
      blocos: [
        {
          t: 'texto',
          md: `O defeito mais comum em visão computacional em produção não é do modelo. É a imagem chegar à rede **diferente** de como chegava no treino. O modelo não reclama: devolve números, com confiança alta, e errados.

O bloco abaixo treina o classificador de recortes do jeito certo e depois o avalia com os erros clássicos de pré-processamento. Aposte antes: qual deles derruba mais?`,
        },
        {
          t: 'codigo',
          titulo: 'O mesmo modelo, com pré-processamentos diferentes',
          rodar: 'python',
          requerPython: ['torch', 'cv2'],
          tempo: 180,
          codigo: `${PREAMBULO}
certo = tensor(Xte)
linhas = [["como no treino", f"{acerto(rede, certo, yte):.1%}"]]

# 1. canais trocados: o OpenCV lê BGR, quase todo o resto usa RGB
bgr = torch.from_numpy(Xte.copy()).permute(0, 3, 1, 2).float().div(255)
linhas.append(["BGR no lugar de RGB", f"{acerto(rede, bgr, yte):.1%}"])

# 2. faixa errada: esquecer a divisão por 255
linhas.append(["sem dividir por 255", f"{acerto(rede, certo * 255, yte):.1%}"])

# 3. normalização que o treino não usou (média e desvio do ImageNet)
media = torch.tensor([0.485, 0.456, 0.406]).view(1, 3, 1, 1)
desvio = torch.tensor([0.229, 0.224, 0.225]).view(1, 3, 1, 1)
linhas.append(["normalização do ImageNet a mais", f"{acerto(rede, (certo - media) / desvio, yte):.1%}"])

# 4. outro método de redução: o recorte vem em 64 px e é reduzido a 32
X64, y64 = lab.recortes(12, tamanho=64, semente=99)
for nome, metodo in [("INTER_AREA (o do treino)", cv2.INTER_AREA), ("INTER_LINEAR", cv2.INTER_LINEAR), ("INTER_NEAREST", cv2.INTER_NEAREST)]:
    reduzido = np.stack([cv2.resize(x, (32, 32), interpolation=metodo) for x in X64])
    linhas.append([f"redução 64 → 32 com {nome}", f"{acerto(rede, tensor(reduzido), y64):.1%}"])

# 5. compressão JPEG, como a que um app aplica antes de enviar a foto
for qualidade in (90, 50, 20, 10):
    jpeg = np.stack([cv2.imdecode(cv2.imencode(".jpg", x, [cv2.IMWRITE_JPEG_QUALITY, qualidade])[1], cv2.IMREAD_COLOR) for x in Xte])
    linhas.append([f"JPEG com qualidade {qualidade}", f"{acerto(rede, tensor(jpeg), yte):.1%}"])

lab.tabela(linhas, cabecalho=["pré-processamento na inferência", "acerto"])

exemplo = Xte[np.where(yte == 1)[0][0]]
lab.mostrar(*[cv2.resize(cv2.imdecode(cv2.imencode(".jpg", exemplo, [cv2.IMWRITE_JPEG_QUALITY, q])[1], cv2.IMREAD_COLOR), (160, 160), interpolation=cv2.INTER_NEAREST) for q in (100, 50, 20, 10)],
            titulos=["qualidade 100", "50", "20", "10"])`,
        },
        {
          t: 'texto',
          md: `Três grupos de resultado.

**Erros que zeram o modelo.** Canais trocados, faixa errada e normalização indevida levam o acerto para algo entre 33% e 45%, e um terço é o acaso com três classes. São erros grosseiros, e por isso mesmo fáceis de pegar: basta **um** teste com imagem conhecida.

**Erros que não aparecem aqui.** O método de redução quase não mudou o acerto neste classificador, com redução de apenas 2 vezes. Não generalize: em detectores, com redução de 4 ou 6 vezes e objetos de poucos pixels, a diferença entre os métodos de redimensionamento é uma causa documentada de perda de mAP. O teste é o mesmo, e o resultado depende do caso.

**O erro silencioso: compressão.** O JPEG com qualidade 50 já tira alguns pontos, e com qualidade 10 tira vinte. E é o mais provável de acontecer no seu sistema: o app comprime a foto para economizar dados no campo, alguém baixa a qualidade para o envio ficar mais rápido, e a contagem piora sem que nenhuma linha do modelo tenha mudado. As imagens acima mostram por quê: os blocos de 8×8 do JPEG têm o tamanho do inseto.`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Fonte de diferença', 'Exemplo', 'Defesa'],
          linhas: [
            ['Ordem dos canais', 'OpenCV entrega BGR; PIL, navegador e celular entregam RGB', 'um teste com imagem fixa e saída esperada'],
            ['Faixa e normalização', '0–255 ou 0–1; com ou sem média e desvio', 'embutir a normalização no grafo exportado'],
            ['Redimensionamento', 'esticar ou preencher (letterbox); bilinear do OpenCV e do PIL não são idênticos', 'usar a mesma biblioteca, ou embutir no grafo'],
            ['Decodificação', 'decodificadores de JPEG diferem em alguns níveis por pixel', 'aceitar, e medir o efeito uma vez'],
            ['Orientação EXIF', 'a foto do celular vem "deitada" com uma marca de rotação que o OpenCV antigo ignora', 'aplicar a orientação antes de qualquer coisa'],
            ['Compressão e redução no app', 'qualidade do JPEG e resolução de envio', 'tratar como parâmetro do modelo, versionado junto com ele'],
            ['Perfil de cor e câmera', 'outro aparelho, outro balanço de branco, HDR ligado', 'protocolo de captura; aumentação de cor no treino'],
          ],
        },
        {
          t: 'nota',
          estilo: 'campo',
          md: `**O teste de paridade que vale ouro.** Guarde no repositório umas dez imagens com a saída esperada do modelo (caixas e confianças), geradas pelo código de treino. Todo cliente de inferência, seja a API em C#, o app ou o Jetson, tem um teste que roda essas imagens e compara. Diferença acima de uma tolerância pequena quebra o build. Custa uma hora para montar e pega a maior parte dos erros desta lição antes de chegarem ao campo.`,
        },
        {
          t: 'quiz',
          pergunta: 'O modelo tem 95% no conjunto de teste e vai mal em produção, com as mesmas câmeras. O que investigar primeiro?',
          opcoes: [
            'Treinar por mais épocas.',
            'Se a imagem chega à rede igual à do treino: canais, faixa, redimensionamento, compressão.',
            'Trocar a arquitetura.',
            'Aumentar o limiar de confiança.',
          ],
          correta: 1,
          explicacao: 'Diferença de pré-processamento é a causa mais frequente e a mais barata de verificar. Só depois de descartá-la vale suspeitar de mudança nos dados ou do modelo.',
        },
        {
          t: 'quiz',
          pergunta: 'Por que a qualidade do JPEG usada pelo app deve ser tratada como parte do modelo?',
          opcoes: [
            'Porque o JPEG muda a resolução.',
            'Porque a compressão altera os pixels de objetos pequenos; mudar a qualidade muda a entrada do modelo e pode derrubar a métrica sem nenhuma alteração nos pesos.',
            'Porque o modelo armazena as imagens.',
            'Porque o JPEG troca os canais.',
          ],
          correta: 1,
          explicacao: 'No experimento, baixar a qualidade custou até vinte pontos de acerto. Um parâmetro com esse efeito precisa ser versionado, testado e mudado com a mesma cautela de uma troca de modelo.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'servir-e-monitorar',
      titulo: 'Servir e monitorar',
      minutos: 13,
      resumo: 'Um serviço de inferência mínimo, e como perceber que o modelo piorou sem ter o gabarito.',
      blocos: [
        {
          t: 'texto',
          md: `Servir um modelo é pôr uma API na frente dele. O esqueleto abaixo, em FastAPI, tem o que um serviço de inferência precisa ter, e que um script de demonstração não tem.`,
        },
        {
          t: 'codigo',
          titulo: 'Serviço de inferência em FastAPI (para ler)',
          lang: 'python',
          codigo: `from contextlib import asynccontextmanager
import time, cv2, numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from ultralytics import YOLO

VERSAO = "armadilhas-2026-11-10"          # a versão do modelo acompanha toda resposta
estado = {}

@asynccontextmanager
async def ciclo(app: FastAPI):
    estado["modelo"] = YOLO(f"modelos/{VERSAO}.engine")     # carrega UMA vez, na subida
    estado["modelo"](np.zeros((640, 640, 3), np.uint8))      # aquecimento: a 1ª inferência é lenta
    yield

app = FastAPI(lifespan=ciclo)

@app.get("/saude")
def saude():
    return {"ok": "modelo" in estado, "versao": VERSAO}

@app.post("/detectar")
def detectar(arquivo: UploadFile = File(...)):               # def comum: o FastAPI roda em thread, sem travar o laço
    dados = arquivo.file.read()
    if len(dados) > 12 * 1024 * 1024:
        raise HTTPException(413, "imagem grande demais")
    imagem = cv2.imdecode(np.frombuffer(dados, np.uint8), cv2.IMREAD_COLOR)
    if imagem is None:
        raise HTTPException(422, "não é uma imagem válida")

    inicio = time.perf_counter()
    r = estado["modelo"](imagem, conf=0.25, verbose=False)[0]
    ms = (time.perf_counter() - inicio) * 1000

    return {
        "versao_modelo": VERSAO,
        "ms": round(ms, 1),
        "largura": imagem.shape[1], "altura": imagem.shape[0],
        "deteccoes": [
            {"classe": r.names[int(c)], "confianca": round(float(p), 3), "caixa": [round(float(v), 1) for v in xyxy]}
            for c, p, xyxy in zip(r.boxes.cls, r.boxes.conf, r.boxes.xyxy)
        ],
    }`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Detalhe', 'Por quê'],
          linhas: [
            ['Modelo carregado na subida, uma vez', 'carregar a cada requisição custa segundos'],
            ['Aquecimento', 'a primeira inferência aloca memória e compila; sem aquecer, o primeiro usuário paga'],
            ['Versão do modelo na resposta', 'sem ela, não dá para saber que modelo gerou uma contagem guardada há três meses'],
            ['Validar a entrada', 'arquivo corrompido, imagem de 80 megapixels, PDF renomeado: tudo isso chega'],
            ['Rota de saúde', 'o orquestrador (App Service, Kubernetes) precisa saber se o serviço está pronto'],
            ['Uma GPU, um processo', 'vários processos disputando a mesma GPU rendem menos que um com fila ou lote'],
            ['Guardar a requisição', 'a imagem, as detecções e a versão são a matéria-prima do retreino e da auditoria'],
          ],
        },
        {
          t: 'texto',
          md: `### Monitorar sem gabarito

Em produção não há anotação. Ninguém confere cada armadilha. Como saber que o modelo piorou?

A tentação é acompanhar a **confiança média** das detecções. O bloco abaixo mostra por que isso não basta. O classificador de recortes é avaliado em lotes cada vez mais **escuros**, como se as fotos passassem a ser tiradas ao entardecer. Para cada lote, sem usar os rótulos, medem-se três sinais: o brilho médio da entrada, a confiança do modelo e a proporção de cada classe prevista.`,
        },
        {
          t: 'codigo',
          titulo: 'Detectar mudança nos dados sem ter os rótulos',
          rodar: 'python',
          requerPython: ['torch', 'cv2', 'scipy'],
          tempo: 240,
          codigo: `${PREAMBULO}
from scipy.stats import ks_2samp

def sinais(X):
    with torch.no_grad():
        prob = torch.softmax(rede(tensor(X)), 1)
    return X.reshape(len(X), -1).mean(1), prob.max(1).values.numpy(), prob.argmax(1).numpy()

# a referência: o que o modelo viu na validação
brilho_ref, conf_ref, _ = sinais(Xte)

linhas = []
for brilho in (1.0, 0.9, 0.8, 0.7, 0.55):
    X, y = lab.recortes(12, semente=500, brilho=brilho)      # um lote novo de "produção"
    b, conf, classe = sinais(X)
    linhas.append([
        f"{brilho:.2f}",
        f"{(classe == y).mean():.1%}",                         # só para a lição: em produção você NÃO tem isto
        f"{ks_2samp(brilho_ref, b).statistic:.2f}",
        f"{conf.mean():.3f}",
        f"{ks_2samp(conf_ref, conf).statistic:.2f}",
        f"{(classe == 1).mean():.0%}",
    ])

lab.tabela(linhas, cabecalho=["brilho", "acerto real (oculto)", "KS do brilho", "confiança média", "KS da confiança", "previstos como inseto"])`,
        },
        {
          t: 'texto',
          md: `Leia a última linha. Com o brilho em 0,55, o acerto real caiu para perto do acaso, e a **confiança média continua acima de 0,9**. O modelo está errado e seguro. Quem monitora só a confiança não vê nada.

Os outros dois sinais gritam:

- **A estatística KS do brilho** (a maior distância entre as distribuições acumuladas, de 0 a 1) vai a 1,0: a entrada mudou. E ela acusa a mudança **antes** de o acerto cair, já em 0,9.
- **A proporção de classes previstas** passou de um terço de insetos para quase todos. Num sistema de contagem, é a "infestação" que aparece em todas as usinas no mesmo dia. A explicação mais provável para uma mudança dessas é o sistema, e não a lavoura.

### O que monitorar

| Sinal | Pega | Exemplo de alarme |
|---|---|---|
| Estatísticas da entrada | mudança de câmera, luz, compressão, enquadramento | brilho médio, nitidez, resolução, tamanho do arquivo |
| Distribuição das saídas | o modelo se comportando diferente | detecções por imagem, proporção de classes, histograma de confiança |
| Vetores de um backbone | mudança de aparência que estatística simples não vê | distância ao conjunto de treino |
| Amostra anotada | a única medida real de qualidade | 50 imagens por semana, anotadas e comparadas com o modelo |
| Operação | o serviço em si | latência, taxa de erro, fila |

Dois cuidados com os testes estatísticos:

- **Use o tamanho da diferença, e não o valor-p.** Com milhares de amostras, o teste KS dá "significativo" para diferenças irrelevantes. Na primeira linha da tabela os dados vêm da mesma distribuição, e ainda assim a estatística não é zero. Defina o alarme pela estatística (por exemplo, acima de 0,2), calibrado com semanas normais.
- **Segmente.** Uma média geral esconde o problema de uma usina, de um modelo de celular, de um turno. Os mesmos sinais, por grupo.

Nenhum desses sinais substitui a **amostra anotada**. Eles dizem que algo mudou. Só o gabarito diz se o modelo piorou. O ciclo do módulo de dados fecha aqui: o alarme escolhe o que anotar, e o que foi anotado vira teste e treino.`,
        },
        {
          t: 'quiz',
          pergunta: 'Por que a confiança média não basta para monitorar um modelo em produção?',
          opcoes: [
            'Porque é cara de calcular.',
            'Porque um modelo fora da distribuição de treino pode errar com confiança alta; a confiança mede o quanto a saída é decidida, e não o quanto é correta.',
            'Porque a confiança sempre cai com o tempo.',
            'Porque depende do tamanho do lote.',
          ],
          correta: 1,
          explicacao: 'No experimento, o acerto foi para perto do acaso com confiança média acima de 0,9. As estatísticas da entrada e a proporção de classes previstas foram os sinais que mudaram.',
        },
        {
          t: 'quiz',
          pergunta: 'A contagem média de insetos subiu 40% em todas as usinas na mesma semana. Qual é a primeira hipótese a verificar?',
          opcoes: [
            'Uma infestação generalizada.',
            'Uma mudança no sistema: nova versão do app, do modelo, da compressão ou do pré-processamento, que afeta todas as imagens ao mesmo tempo.',
            'Erro de digitação no relatório.',
            'Mudança de estação.',
          ],
          correta: 1,
          explicacao: 'Fenômenos biológicos variam por local. Uma mudança simultânea em todos os locais aponta para algo que todos compartilham: o software. Por isso a versão do modelo e do app acompanha cada registro.',
        },
      ],
    },
  ],
};
