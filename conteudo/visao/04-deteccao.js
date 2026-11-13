export const modulo = {
  id: 'deteccao',
  titulo: 'Detecção de objetos',
  cor: '#6aa9f0',
  licoes: [
    // ------------------------------------------------------------------
    {
      id: 'anatomia',
      titulo: 'Anatomia de um detector',
      minutos: 13,
      resumo: 'Backbone, pescoço e cabeça: o que cada parte faz e o que sai, exatamente, de um YOLO.',
      blocos: [
        {
          t: 'texto',
          md: `Detectar é responder duas perguntas ao mesmo tempo, para um número desconhecido de objetos: **o quê** e **onde**. Todo detector moderno de um estágio resolve isso com a mesma estrutura de três partes.

- **Backbone**: a CNN (ou transformer) que transforma a imagem em mapas de características, reduzindo a resolução por etapas. É a parte pré-treinada.
- **Pescoço** (*neck*): mistura os mapas de resoluções diferentes. O FPN leva significado dos mapas profundos para os rasos; o PAN faz o caminho de volta, levando posição dos rasos para os profundos.
- **Cabeça** (*head*): para cada célula de cada mapa, prevê uma caixa e as probabilidades de classe.

A saída é uma previsão por célula, em três resoluções:

| Nível | Stride | Mapa (entrada 640) | Previsões | Serve para |
|---|---|---|---|---|
| P3 | 8 | 80 × 80 | 6.400 | objetos pequenos |
| P4 | 16 | 40 × 40 | 1.600 | médios |
| P5 | 32 | 20 × 20 | 400 | grandes |

São **8.400 candidatos** por imagem, quase todos fundo. O trabalho do treino é fazer os poucos certos terem nota alta, e o do pós-processamento é escolher entre eles.`,
        },
        {
          t: 'codigo',
          titulo: 'Abrir dois detectores e olhar a entrada e a saída da cabeça',
          rodar: 'python',
          requerPython: ['ultralytics'],
          tempo: 120,
          codigo: `import logging
import torch
from ultralytics import YOLO
from ultralytics.utils import LOGGER
import lab

LOGGER.setLevel(logging.ERROR)

def inspecionar(arquivo):
    # construir pelo .yaml monta a arquitetura com pesos aleatórios: não baixa nada
    modelo = YOLO(arquivo).model.eval()
    cabeca = modelo.model[-1]

    entradas = []
    gancho = cabeca.register_forward_pre_hook(lambda m, x: entradas.extend(tuple(t.shape[1:]) for t in x[0]))
    with torch.no_grad():
        saida = modelo(torch.zeros(1, 3, 640, 640))
    gancho.remove()

    final = saida[0] if isinstance(saida, (list, tuple)) else saida
    return [arquivo.replace(".yaml", ""),
            f"{sum(p.numel() for p in modelo.parameters()) / 1e6:.2f} M",
            [int(s) for s in modelo.stride],
            " ".join(f"{h}x{w}" for _, h, w in entradas),
            tuple(final.shape),
            "sim" if getattr(cabeca, "end2end", False) else "não"]

lab.tabela([inspecionar(a) for a in ["yolo11n.yaml", "yolo26n.yaml", "yolo26n-p2.yaml"]],
           cabecalho=["modelo", "pesos", "strides", "mapas na cabeça", "saída", "sem NMS"])`,
        },
        {
          t: 'texto',
          md: `Leia a coluna **saída**, porque ela resume a diferença entre duas gerações:

- **(1, 84, 8400)**: o YOLO11 devolve as 8.400 previsões cruas, cada uma com 4 números de caixa e 80 notas de classe (as do COCO). Quase todas são fundo ou repetições, e é o **NMS**, fora da rede, que escolhe as finais.
- **(1, 300, 6)**: o YOLO26 devolve no máximo 300 detecções já prontas, cada uma com caixa, confiança e classe. A seleção acontece dentro do modelo. Não há NMS.

E a linha do **p2**: com um quarto nível, de stride 4, os candidatos passam de 8.400 para 34.000. É o preço de enxergar objetos menores, e volta no módulo de objetos pequenos.

### Um estágio e dois estágios

O **Faster R-CNN** (2015) faz em duas etapas: uma rede propõe regiões candidatas, outra classifica e refina cada uma. É preciso e lento. Os detectores de **um estágio** (YOLO, SSD, RetinaNet) fazem tudo numa passada só. A diferença de precisão que justificava os dois estágios foi fechada por volta de 2017 a 2020, com a *focal loss* e com pescoços melhores, e hoje o de um estágio é o padrão para tempo real.`,
        },
        {
          t: 'nota',
          estilo: 'entrevista',
          md: `**Pergunta frequente:** "o que é uma FPN e por que ela ajuda em objetos pequenos?". Os mapas rasos têm resolução, mas pouca semântica: sabem que há uma borda, não que é uma asa. Os profundos têm semântica e pouca resolução. A FPN soma os profundos, ampliados, aos rasos. O mapa de stride 8 passa a carregar informação de contexto, e é nele que o objeto pequeno é previsto.`,
        },
        {
          t: 'quiz',
          pergunta: 'Um detector com saída em strides 8, 16 e 32 recebe uma imagem de 1280×1280. Quantas previsões ele gera?',
          opcoes: ['8.400', '16.800', '33.600', '25.600'],
          correta: 2,
          explicacao: '160² + 80² + 40² = 25.600 + 6.400 + 1.600 = 33.600. Dobrar o lado da imagem quadruplica o número de candidatos, e o custo de computação cresce junto.',
        },
        {
          t: 'quiz',
          pergunta: 'A saída de um modelo tem formato (1, 300, 6). O que isso indica?',
          opcoes: [
            'Trezentas classes e seis caixas.',
            'Um detector de ponta a ponta: até 300 detecções finais, cada uma com 4 coordenadas, confiança e classe, sem NMS depois.',
            'Um classificador com 300 saídas.',
            'Um erro de exportação.',
          ],
          correta: 1,
          explicacao: 'Detectores sem NMS devolvem um conjunto fixo e pequeno de detecções já selecionadas. O formato cru (4 + classes) × milhares de candidatos é a assinatura de um modelo que ainda precisa de NMS.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'iou-e-perdas',
      titulo: 'IoU e as funções de perda',
      minutos: 12,
      resumo: 'A medida que decide o que é acerto, e as variantes que a tornam treinável.',
      blocos: [
        {
          t: 'texto',
          md: `**IoU** (interseção sobre união) mede o quanto duas caixas coincidem: a área em comum dividida pela área total coberta pelas duas. Vale 1 quando são idênticas e 0 quando não se tocam.

Ela aparece em três lugares de um detector, com papéis diferentes: na **avaliação** (decide se a caixa é acerto), no **NMS** (decide se duas caixas são o mesmo objeto) e na **perda** (diz à rede como corrigir a caixa). Arraste as caixas e passe pelos atalhos.`,
        },
        { t: 'visual', componente: 'cv/iou' },
        {
          t: 'texto',
          md: `### Por que existem variantes

Como medida, o IoU basta. Como **perda**, ele tem um defeito sério, que o atalho *sem se tocar* mostra: quando as caixas não se sobrepõem, o IoU é zero, esteja a predição perto ou longe. Gradiente zero quer dizer que a rede não recebe direção nenhuma.

| Variante | Acrescenta | Resolve |
|---|---|---|
| GIoU | penalidade pela área vazia da caixa envolvente | caixas que não se tocam |
| DIoU | distância entre os centros | convergência lenta do GIoU |
| CIoU | diferença de proporção largura/altura | caixas centradas mas com formato errado |

O CIoU foi a perda de caixa padrão da linha Ultralytics por várias gerações.

### O que mais entra na perda de um detector

- **Classificação**: entropia cruzada binária por classe. Como há milhares de candidatos de fundo para cada objeto, usa-se alguma forma de **focal loss**, que reduz o peso dos exemplos fáceis para o fundo não dominar o gradiente.
- **DFL** (*distribution focal loss*): em vez de prever cada borda da caixa como um número, o modelo prevê uma distribuição sobre 16 posições possíveis. Melhora a localização fina, e complica a exportação. O YOLO26 a removeu.`,
        },
        {
          t: 'codigo',
          titulo: 'O mesmo erro em pixels, em objetos de tamanhos diferentes',
          rodar: 'python',
          codigo: `import lab

def caixa(x, y, lado):
    return dict(x=x, y=y, w=lado, h=lado)

linhas = []
for lado in [8, 12, 16, 32, 64, 128]:
    linha = [f"{lado} px"]
    for erro in [1, 2, 3, 4]:
        v = lab.iou(caixa(0, 0, lado), caixa(erro, erro, lado))   # deslocada na diagonal
        linha.append(f"{v:.2f}" + ("" if v >= 0.5 else " x"))
    linhas.append(linha)

lab.tabela(linhas, cabecalho=["lado do objeto", "erro 1 px", "erro 2 px", "erro 3 px", "erro 4 px"])
print()
print("x = abaixo de 0,5: a predição conta como falso positivo E o objeto como não detectado")`,
        },
        {
          t: 'texto',
          md: `A tabela é a razão numérica de objeto pequeno ser difícil **de avaliar**, além de difícil de detectar. Num inseto de 8 pixels, dois pixels de erro reprovam a caixa; num de 64, quatro pixels mal aparecem.

Duas consequências práticas:

- **A anotação precisa ser mais cuidadosa quanto menor o objeto.** Uma caixa anotada com um pixel de folga de cada lado num inseto de 8 pixels já parte de IoU 0,64 contra a caixa justa. O ruído do anotador vira teto da métrica.
- **mAP@50-95 castiga objeto pequeno de forma desproporcional.** Para muitas aplicações de contagem, mAP@50 é a métrica mais honesta. Existem também medidas pensadas para objetos minúsculos, como a distância de Wasserstein normalizada (NWD), que trata a caixa como uma distribuição e degrada com suavidade.`,
        },
        {
          t: 'quiz',
          pergunta: 'Por que o IoU puro é uma perda ruim no começo do treino?',
          opcoes: [
            'Porque é caro de calcular.',
            'Porque, quando a predição não toca o objeto, o IoU é zero e o gradiente também: a rede não sabe para onde mover a caixa.',
            'Porque só funciona com caixas quadradas.',
            'Porque depende da classe.',
          ],
          correta: 1,
          explicacao: 'No início, muitas predições não se sobrepõem aos objetos. GIoU, DIoU e CIoU acrescentam termos que continuam variando com a distância, mantendo o gradiente informativo.',
        },
        {
          t: 'quiz',
          pergunta: 'Para que serve a focal loss?',
          opcoes: [
            'Para melhorar a localização das caixas.',
            'Para reduzir o peso dos exemplos fáceis, em geral fundo, que são a imensa maioria dos candidatos e dominariam a perda.',
            'Para acelerar a inferência.',
            'Para dispensar o NMS.',
          ],
          correta: 1,
          explicacao: 'De 8.400 candidatos, uma dúzia corresponde a objetos. Sem compensação, o gradiente é quase todo "isto é fundo". A focal loss multiplica a perda por um fator que encolhe quando o exemplo já está bem classificado.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'atribuicao',
      titulo: 'De âncoras à detecção sem NMS',
      minutos: 13,
      resumo: 'A pergunta que mudou três vezes em dez anos: qual das milhares de previsões é responsável por cada objeto?',
      blocos: [
        {
          t: 'texto',
          md: `Durante o treino, cada objeto do gabarito precisa ser **atribuído** a algumas das 8.400 previsões: essas viram exemplos positivos e aprendem a caixa; as demais aprendem "fundo". A regra de atribuição é a parte menos visível de um detector e a que mais mudou.

### 1. Âncoras (YOLOv2 a v5, Faster R-CNN, SSD)

Cada célula tinha um conjunto fixo de caixas de referência, as **âncoras**, com tamanhos e proporções típicos do dataset (escolhidos por k-means sobre as anotações). A rede previa um **ajuste** sobre a âncora. Um objeto era atribuído às âncoras com que tivesse IoU alto.

Funcionava, com um custo: as âncoras eram hiperparâmetros **do dataset**. Âncoras calculadas no COCO eram ruins para insetos de 10 pixels, e recalcular fazia parte de todo projeto. Quem treinou YOLOv3 lembra.

### 2. Sem âncoras (FCOS, YOLOX, YOLOv8 em diante)

A célula prevê diretamente a distância até as quatro bordas da caixa. Somem os hiperparâmetros de âncora, e o modelo generaliza melhor para formatos fora do comum.

### 3. Atribuição dinâmica (SimOTA, TAL)

Em vez de uma regra geométrica fixa, a atribuição passa a depender **do que o modelo está prevendo naquele momento**: são positivas as previsões que já combinam boa nota de classe com boa caixa para aquele objeto. O *task-aligned learning* (TAL) do YOLOv8 é desse tipo. Cada objeto recebe **vários** positivos (um-para-muitos), o que dá sinal de treino abundante e deixa caixas duplicadas na inferência. Daí o NMS.

### 4. Um-para-um (DETR, YOLOv10, YOLO26)

Cada objeto é atribuído a **exatamente uma** previsão, a de menor custo num casamento global (algoritmo húngaro). Como só uma previsão por objeto é treinada para ter nota alta, não sobram duplicatas, e o NMS deixa de ser necessário.

O custo é sinal de treino escasso: um positivo por objeto. O YOLOv10 resolveu com **atribuição dupla**: duas cabeças treinam juntas, uma um-para-muitos (sinal rico) e outra um-para-um (saída limpa), e só a segunda é usada na inferência. O YOLO26 segue esse desenho.`,
        },
        {
          t: 'codigo',
          titulo: 'Um-para-muitos contra um-para-um, com o algoritmo húngaro',
          rodar: 'python',
          requerPython: ['sklearn'],
          codigo: `import numpy as np
from scipy.optimize import linear_sum_assignment
import lab

rng = np.random.default_rng(1)

# 3 objetos e 12 previsões: 3 boas para cada objeto (com alguma variação) e 3 de fundo
objetos = [dict(x=40, y=40, w=30, h=20), dict(x=120, y=50, w=24, h=24), dict(x=80, y=110, w=40, h=18)]
previsoes = []
for o in objetos:
    for _ in range(3):
        previsoes.append(dict(x=o["x"] + rng.normal(0, 3), y=o["y"] + rng.normal(0, 3),
                              w=o["w"] + rng.normal(0, 2), h=o["h"] + rng.normal(0, 2),
                              nota=float(rng.uniform(0.5, 0.95))))
for _ in range(3):
    previsoes.append(dict(x=float(rng.uniform(0, 160)), y=float(rng.uniform(0, 130)), w=20, h=20,
                          nota=float(rng.uniform(0.05, 0.3))))

iou = np.array([[lab.iou(p, o) for p in previsoes] for o in objetos])     # (3 objetos, 12 previsões)
nota = np.array([p["nota"] for p in previsoes])

# um-para-muitos: toda previsão com IoU alto vira exemplo positivo
muitos = [[int(i) for i in np.where(iou[k] > 0.5)[0]] for k in range(len(objetos))]

# um-para-um: casamento global de custo mínimo (custo baixo = nota alta e IoU alto)
custo = -(iou * nota[None, :])
linhas_obj, colunas_prev = linear_sum_assignment(custo)

lab.tabela([[f"objeto {k}", muitos[k], int(colunas_prev[list(linhas_obj).index(k)])] for k in range(len(objetos))],
           cabecalho=["", "positivas (um-para-muitos)", "positiva (um-para-um)"])
print()
print(f"um-para-muitos: {sum(len(m) for m in muitos)} previsões aprendem a ter nota alta -> sobram duplicatas, precisa de NMS")
print(f"um-para-um:     {len(colunas_prev)} previsões aprendem a ter nota alta -> uma por objeto, sem NMS")`,
        },
        {
          t: 'nota',
          estilo: 'campo',
          md: `**O que isso muda para quem tem cena densa.** Num detector com NMS, dois insetos encostados podem perder uma caixa na supressão, por mais bem treinado que esteja o modelo (a próxima lição mostra isso). Num detector um-para-um, a decisão de quantos objetos há é **aprendida**, com os dados, em vez de imposta por um limiar de IoU. Isso não garante resultado melhor em aglomerado, mas tira do caminho um limite que antes era estrutural. Vale testar nos seus dados.`,
        },
        {
          t: 'quiz',
          pergunta: 'Por que um detector treinado com atribuição um-para-muitos precisa de NMS?',
          opcoes: [
            'Porque usa âncoras.',
            'Porque várias previsões são treinadas para dar nota alta ao mesmo objeto, e na inferência todas respondem.',
            'Porque a rede não sabe classificar.',
            'Porque o NMS melhora a localização das caixas.',
          ],
          correta: 1,
          explicacao: 'A redundância é criada no treino, de propósito, para enriquecer o sinal. O NMS é o remendo que a remove depois. Com atribuição um-para-um, a redundância não é criada.',
        },
        {
          t: 'quiz',
          pergunta: 'Qual é a ideia da atribuição dupla, usada no YOLOv10 e no YOLO26?',
          opcoes: [
            'Treinar dois modelos e fazer a média.',
            'Usar duas cabeças no treino: uma um-para-muitos, que dá sinal rico, e uma um-para-um, que dá saída sem duplicatas. Só a segunda é usada na inferência.',
            'Atribuir cada objeto a duas classes.',
            'Rodar o NMS duas vezes.',
          ],
          correta: 1,
          explicacao: 'O backbone e o pescoço recebem gradiente das duas cabeças. A um-para-muitos garante que as características sejam boas; a um-para-um aprende a escolher. Na inferência, a primeira é descartada.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'nms',
      titulo: 'NMS: supressão de não-máximos',
      minutos: 12,
      resumo: 'O pós-processamento que limpa duplicatas, e o defeito dele em cena densa.',
      blocos: [
        {
          t: 'texto',
          md: `O NMS é um algoritmo guloso de três linhas:

1. pegue a caixa de maior confiança e mantenha;
2. apague todas as que têm IoU com ela acima de um limiar;
3. repita com as que sobraram.

A hipótese embutida: **duas caixas muito sobrepostas são o mesmo objeto**. Avance passo a passo nos três cenários.`,
        },
        { t: 'visual', componente: 'cv/nms' },
        {
          t: 'texto',
          md: `### O que os cenários mostram

- **Um inseto, várias caixas**: o caso para o qual o NMS foi feito. Qualquer limiar até 0,60 deixa uma caixa.
- **Dois insetos sobrepostos**: com o padrão de 0,45, um inseto de verdade é apagado. Só funciona numa faixa, de 0,55 a 0,70: abaixo dela some um inseto, acima sobra duplicata.
- **Aglomerado**: **nenhum** limiar dá o resultado certo. Há um par de vizinhos reais que se sobrepõe mais (IoU 0,59) do que uma duplicata se sobrepõe ao seu original (0,47). E existe um limiar em que a contagem bate, com um inseto apagado e uma duplicata no lugar dele.

A hipótese do NMS é falsa em cena densa, e o limiar é uma troca entre dois erros: baixo demais funde vizinhos, alto demais deixa passar duplicatas.

### Variações

| Variação | O que muda | Uso |
|---|---|---|
| Por classe | só suprime caixas da mesma classe | o padrão |
| Agnóstico à classe | suprime entre classes | quando classes parecidas geram caixas dobradas no mesmo objeto |
| Soft-NMS | reduz a confiança das vizinhas em vez de apagá-las | cenas densas; recupera recall |
| Sem NMS | o modelo aprende a não duplicar | YOLOv10, YOLO26, família DETR |`,
        },
        {
          t: 'codigo',
          titulo: 'NMS à mão, conferido contra o do torchvision',
          rodar: 'python',
          requerPython: ['torch', 'torchvision'],
          tempo: 90,
          codigo: `import time
import numpy as np, torch
from torchvision.ops import nms as nms_torch
import lab

def nms(caixas, notas, limiar):
    """caixas: (N, 4) em x1, y1, x2, y2. Devolve os índices mantidos."""
    x1, y1, x2, y2 = caixas.T
    areas = (x2 - x1) * (y2 - y1)
    ordem = notas.argsort()[::-1]          # da maior nota para a menor
    mantidas = []
    while ordem.size:
        i = ordem[0]
        mantidas.append(int(i))
        resto = ordem[1:]
        # IoU da escolhida com todas as restantes, de uma vez (vetorizado)
        ix = np.clip(np.minimum(x2[i], x2[resto]) - np.maximum(x1[i], x1[resto]), 0, None)
        iy = np.clip(np.minimum(y2[i], y2[resto]) - np.maximum(y1[i], y1[resto]), 0, None)
        inter = ix * iy
        iou = inter / (areas[i] + areas[resto] - inter)
        ordem = resto[iou <= limiar]       # sobrevivem as pouco sobrepostas
    return mantidas

# uma armadilha com detecções simuladas, convertidas para x1, y1, x2, y2
img, gabarito, detritos = lab.amostra_com_gabarito("armadilha-densa", semente=3)
det = lab.detector_simulado(gabarito, detritos, "v1", semente=3)
# cada objeto ganha 3 caixas extras, tremidas: é o que sai de um detector ANTES do NMS
rng = np.random.default_rng(0)
cruas = [d for d in det for _ in range(4)]
caixas = np.array([[d["x"], d["y"], d["x"] + d["w"], d["y"] + d["h"]] for d in cruas], dtype=np.float32)
caixas += rng.normal(0, 1.2, caixas.shape).astype(np.float32)
notas = np.array([d["conf"] for d in cruas], dtype=np.float32) * rng.uniform(0.7, 1.0, len(cruas)).astype(np.float32)

print(f"objetos no gabarito: {len(gabarito)} | caixas antes do NMS: {len(caixas)}")
linhas = []
for limiar in [0.2, 0.45, 0.7, 0.9]:
    meu = nms(caixas, notas, limiar)
    oficial = nms_torch(torch.from_numpy(caixas), torch.from_numpy(notas), limiar).tolist()
    linhas.append([limiar, len(meu), "sim" if sorted(meu) == sorted(oficial) else "NÃO"])
lab.tabela(linhas, cabecalho=["limiar de IoU", "caixas mantidas", "igual ao torchvision"])

# custo: o NMS cresce com o quadrado do número de caixas no pior caso
grande = np.tile(caixas, (40, 1)) + rng.normal(0, 200, (len(caixas) * 40, 4)).astype(np.float32)
grande[:, 2:] = grande[:, :2] + 20
t = time.perf_counter()
nms(grande, np.tile(notas, 40), 0.45)
print(f"NMS em {len(grande)} caixas (NumPy, CPU): {1000 * (time.perf_counter() - t):.0f} ms")`,
        },
        {
          t: 'nota',
          estilo: 'pegadinha',
          md: `**O NMS faz parte do modelo, e costuma ficar fora do arquivo exportado.** Ao exportar para ONNX ou TensorRT, o NMS pode ir embutido no grafo ou ficar para o código da aplicação. Se ficar na aplicação, os limiares de confiança e de IoU passam a ser configuração **dela**, e podem divergir dos usados na validação. É uma das causas mais comuns de "o modelo é pior em produção do que no treino". Um detector sem NMS elimina essa classe de problema, e também o tempo de pós-processamento, que em CPU e em borda pode pesar tanto quanto a rede.`,
        },
        {
          t: 'quiz',
          pergunta: 'Numa cena com muitos insetos encostados, o recall está baixo e a análise mostra objetos reais sendo suprimidos. O que testar primeiro?',
          opcoes: [
            'Baixar o limiar de IoU do NMS.',
            'Subir o limiar de IoU do NMS, medindo quantas duplicatas passam a sobrar, e avaliar Soft-NMS ou um detector sem NMS.',
            'Subir o limiar de confiança.',
            'Reduzir a resolução de entrada.',
          ],
          correta: 1,
          explicacao: 'Baixar o limiar de IoU suprime mais, e pioraria. Subir preserva vizinhos reais ao custo de algumas duplicatas, e a troca precisa ser medida. Se nenhum valor resolve, o limite é do próprio NMS.',
        },
        {
          t: 'quiz',
          pergunta: 'O que distingue o Soft-NMS do NMS comum?',
          opcoes: [
            'Roda na GPU.',
            'Em vez de apagar as caixas sobrepostas, reduz a confiança delas conforme a sobreposição; elas só somem se caírem abaixo do limiar de confiança.',
            'Usa GIoU no lugar de IoU.',
            'Dispensa o limiar de confiança.',
          ],
          correta: 1,
          explicacao: 'Um vizinho real, com confiança própria alta, sobrevive ao desconto. Uma duplicata, com confiança menor, tende a cair. Custa um pouco mais e ajuda em aglomerados.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'familia-yolo',
      titulo: 'A família YOLO, do v3 ao YOLO26',
      minutos: 14,
      resumo: 'O que cada geração mudou de fato, sem a propaganda. Você publicou sobre o v3: aqui está o que veio depois.',
      blocos: [
        {
          t: 'texto',
          md: `"YOLO" deixou de ser um modelo e virou um nome que vários grupos sem relação entre si usam. A numeração não é uma linha de sucessão: versões "seguintes" vêm de laboratórios diferentes e nem sempre superam as anteriores. O que ajuda é saber **qual ideia** cada uma trouxe.`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Versão', 'Ano', 'De quem', 'A ideia que ficou'],
          linhas: [
            ['YOLOv1', '2016', 'Redmon et al.', 'Detecção como uma única regressão, numa passada só'],
            ['YOLOv2', '2017', 'Redmon e Farhadi', 'Âncoras por k-means, batch norm'],
            ['YOLOv3', '2018', 'Redmon e Farhadi', 'Previsão em três escalas, backbone Darknet-53'],
            ['YOLOv4', '2020', 'Bochkovskiy et al.', 'Mosaico e um catálogo de truques de treino'],
            ['YOLOv5', '2020', 'Ultralytics', 'PyTorch, ferramentas e exportação fáceis: virou o padrão da indústria'],
            ['YOLOX', '2021', 'Megvii', 'Sem âncoras, cabeça desacoplada, SimOTA'],
            ['YOLOv6 / v7', '2022', 'Meituan / Wang et al.', 'Reparametrização e eficiência para implantação'],
            ['YOLOv8', '2023', 'Ultralytics', 'Sem âncoras, TAL, DFL; uma API para detecção, segmentação e pose'],
            ['YOLOv9', '2024', 'Wang et al.', 'PGI e GELAN: preservar informação ao longo de redes profundas'],
            ['YOLOv10', '2024', 'Tsinghua', 'Atribuição dupla: o primeiro YOLO sem NMS'],
            ['YOLO11', '2024', 'Ultralytics', 'Blocos C3k2 e C2PSA: menos pesos, mesma precisão'],
            ['YOLOv12 / v13', '2025', 'grupos acadêmicos', 'Atenção dentro do backbone'],
            ['YOLO26', '2026', 'Ultralytics', 'Sem NMS e sem DFL; ProgLoss, STAL, otimizador MuSGD'],
            ['YOLO27', 'anunciado', 'Ultralytics', 'Apresentado no YOLO Vision 2026; ainda não lançado'],
          ],
        },
        {
          t: 'texto',
          md: `### O que mudou do v3 para cá, em quatro frases

1. **As âncoras sumiram** (v8). Acabou o k-means por dataset.
2. **A atribuição ficou dinâmica** (YOLOX, v8), e depois **um-para-um** (v10, 26). Acabou o NMS.
3. **A aumentação virou parte do método** (v4, v5): mosaico, mixup, copy-paste, com desligamento nas épocas finais.
4. **O treino ficou curto e padronizado**: pesos pré-treinados, taxa em cosseno com aquecimento, EMA dos pesos. O que no v3 exigia ajuste manual hoje vem configurado.

### YOLO26 em mais detalhe

É a versão corrente da Ultralytics, lançada em janeiro de 2026. As mudanças, segundo o artigo e a documentação dos autores:

- **Sem NMS**, com atribuição dupla, como no YOLOv10.
- **Sem DFL**: a caixa volta a ser prevista como quatro números. A exportação e a quantização ficam mais simples, o que pesa em borda.
- **ProgLoss**: o peso entre as duas cabeças muda ao longo do treino, da um-para-muitos para a um-para-um.
- **STAL**: ajuste na atribuição para que objetos muito pequenos não fiquem sem exemplos positivos.
- **MuSGD**: um otimizador híbrido entre SGD e Muon.

O bloco abaixo abre cinco gerações na sua máquina e mostra o que dá para conferir sem acreditar em ninguém.`,
        },
        {
          t: 'codigo',
          titulo: 'Cinco gerações lado a lado, pela arquitetura instalada',
          rodar: 'python',
          requerPython: ['ultralytics'],
          tempo: 150,
          codigo: `import logging
import torch
from ultralytics import YOLO, __version__
from ultralytics.utils import LOGGER
import lab

LOGGER.setLevel(logging.ERROR)
print("ultralytics", __version__)

linhas = []
for arquivo in ["yolov8n.yaml", "yolov10n.yaml", "yolo11n.yaml", "yolo12n.yaml", "yolo26n.yaml"]:
    modelo = YOLO(arquivo).model.eval()
    cabeca = modelo.model[-1]
    with torch.no_grad():
        saida = modelo(torch.zeros(1, 3, 640, 640))
    final = saida[0] if isinstance(saida, (list, tuple)) else saida
    linhas.append([
        arquivo.replace(".yaml", ""),
        f"{sum(p.numel() for p in modelo.parameters()) / 1e6:.2f} M",
        len(list(modelo.modules())),
        "sim" if cabeca.reg_max > 1 else "não",
        "não precisa" if getattr(cabeca, "end2end", False) else "precisa",
        tuple(final.shape),
    ])

lab.tabela(linhas, cabecalho=["modelo (tamanho n)", "pesos", "módulos", "usa DFL", "NMS", "formato da saída"])`,
        },
        {
          t: 'texto',
          md: `### Como escolher, na prática

- **Números de COCO são do autor.** Cada artigo mede o seu modelo nas condições que o favorecem, e a latência depende de GPU, precisão numérica e se o NMS foi contado. Compare apenas valores medidos por terceiros no mesmo protocolo, ou meça você.
- **COCO não é o seu dataset.** Ordem de ranking em 80 classes de objetos do dia a dia diz pouco sobre insetos de 10 pixels em cartão amarelo. A diferença entre duas gerações vizinhas costuma ser menor que a diferença que **mais 500 imagens bem anotadas** produzem.
- **O protocolo vale mais que o modelo.** Com conjunto de teste fixo e avaliação por fatia, trocar de arquitetura é um experimento de uma tarde. Sem isso, é fé.

### A licença faz parte da decisão

Os modelos e o código da Ultralytics (YOLOv5, v8, 11, 26) saem sob **AGPL-3.0**. Em resumo: usar num produto ou serviço fechado exige abrir o código do produto, ou comprar a licença comercial da Ultralytics. Para uma empresa que entrega software a clientes, isso é assunto de contrato, e a decisão não é do engenheiro sozinho.

Alternativas com licença permissiva (Apache-2.0) existem: RT-DETR, D-FINE, os tamanhos menores do RF-DETR, YOLOX. A próxima lição trata delas.`,
        },
        {
          t: 'nota',
          estilo: 'atencao',
          md: `**Sobre o que está "anunciado".** O YOLO27 foi apresentado no evento YOLO Vision 2026, com números preliminares, e a própria documentação da Ultralytics diz que os modelos ainda não estão disponíveis e que os resultados podem mudar. Trate como roteiro, não como opção de projeto. Conferido em novembro de 2026.`,
        },
        {
          t: 'texto',
          md: `### Fontes

- [YOLO26: artigo dos autores (arXiv 2606.03748)](https://arxiv.org/pdf/2606.03748)
- [YOLO26: análise independente de arquitetura e benchmarks (arXiv 2509.25164)](https://arxiv.org/pdf/2509.25164)
- [YOLO26 como framework sem NMS (arXiv 2601.12882)](https://arxiv.org/html/2601.12882)
- [Revisão da linha Ultralytics, do YOLOv5 ao YOLO27 (arXiv 2510.09653)](https://arxiv.org/pdf/2510.09653)
- [Revisão de uma década de YOLO (arXiv 2406.19407)](https://arxiv.org/abs/2406.19407v8)
- [YOLO27 na documentação da Ultralytics](https://docs.ultralytics.com/models/yolo27)`,
        },
        {
          t: 'quiz',
          pergunta: 'Um artigo novo reporta 1,5 ponto de mAP no COCO acima do modelo que você usa. O que fazer?',
          opcoes: [
            'Migrar: é o estado da arte.',
            'Ignorar: números de artigo nunca valem.',
            'Tratar como hipótese: treinar o novo no seu dataset, com o mesmo protocolo e conjunto de teste, e comparar com intervalo de confiança, considerando também licença e custo de exportação.',
            'Esperar a próxima versão.',
          ],
          correta: 2,
          explicacao: 'O número é reportado pelo autor, num dataset que não é o seu. Vale o experimento, não a migração às cegas. E a decisão envolve mais que mAP: licença, suporte a exportação e latência no hardware de destino.',
        },
        {
          t: 'quiz',
          pergunta: 'O que a licença AGPL-3.0 dos modelos Ultralytics implica para um produto comercial fechado?',
          opcoes: [
            'Nada: é código aberto, então é livre para qualquer uso.',
            'Exige abrir o código do produto que os usa, inclusive quando oferecido como serviço em rede, ou adquirir a licença comercial.',
            'Proíbe qualquer uso comercial.',
            'Só se aplica aos pesos, não ao código.',
          ],
          correta: 1,
          explicacao: 'A AGPL é copyleft forte e alcança o uso por rede. Não proíbe uso comercial, mas condiciona. Por isso a escolha de modelo, numa empresa, passa pela pergunta da licença antes da do mAP.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'familia-detr',
      titulo: 'Detectores com transformer: de DETR a RF-DETR',
      minutos: 13,
      resumo: 'A outra linhagem: detecção como previsão de conjunto. Mais lenta de treinar, sem NMS desde o primeiro dia.',
      blocos: [
        {
          t: 'texto',
          md: `Em 2020, o **DETR** (Carion et al., Facebook AI) propôs outra formulação: em vez de milhares de candidatos em grade, o modelo tem um conjunto pequeno de **consultas** aprendidas (100 a 300). Cada consulta "pergunta" à imagem, por atenção, e devolve um objeto ou "nada". O treino usa casamento húngaro, um-para-um. Sem âncoras, sem grade, sem NMS.

Era elegante e impraticável: precisava de 500 épocas para convergir e ia mal em objetos pequenos. Os cinco anos seguintes foram de consertos:

| Modelo | Ano | O que resolveu |
|---|---|---|
| Deformable DETR | 2021 | Atenção só em alguns pontos por consulta: convergência 10× mais rápida e mapas multiescala |
| DINO (o detector) | 2022 | Consultas com ruído no treino: primeiro DETR a liderar o COCO |
| RT-DETR | 2023 | Codificador híbrido eficiente: o primeiro DETR de tempo real |
| D-FINE | 2024 | Regressão da caixa como refinamento de distribuição, com autodestilação |
| DEIM | 2025 | Método de treino que acelera a convergência; o DEIMv2 usa backbones DINOv3 |
| RF-DETR | 2025–26 | Backbone DINOv2 pré-treinado, com busca de arquitetura para cada latência |

**Cuidado com o nome:** o *DINO* da tabela é um detector (*DETR with Improved deNoising anchOr boxes*). O *DINOv2* e o *DINOv3* são outra coisa: backbones auto-supervisionados da Meta, assunto do módulo de modelos de fundação. O RF-DETR usa o segundo dentro de um detector da família do primeiro.`,
        },
        {
          t: 'codigo',
          titulo: 'Um RT-DETR e um YOLO26 do mesmo porte, lado a lado',
          rodar: 'python',
          requerPython: ['ultralytics'],
          tempo: 150,
          codigo: `import logging, time
import torch
from ultralytics import YOLO, RTDETR
from ultralytics.utils import LOGGER
import lab

LOGGER.setLevel(logging.ERROR)
disp = lab.dispositivo()
x = torch.zeros(1, 3, 640, 640, device=disp)

def medir(classe, arquivo):
    modelo = classe(arquivo).model.to(disp).eval()
    cabeca = modelo.model[-1]
    with torch.no_grad():
        for _ in range(5):                # aquecimento: as primeiras passadas são mais lentas
            modelo(x)
        if disp == "cuda":
            torch.cuda.synchronize()      # a GPU é assíncrona: sem isto, medimos só o envio
        t = time.perf_counter()
        for _ in range(30):
            modelo(x)
        if disp == "cuda":
            torch.cuda.synchronize()
        ms = (time.perf_counter() - t) / 30 * 1000
    return [arquivo.replace(".yaml", ""), type(cabeca).__name__,
            f"{sum(p.numel() for p in modelo.parameters()) / 1e6:.1f} M",
            getattr(cabeca, "num_queries", "-"), f"{ms:.1f} ms"]

lab.tabela([medir(YOLO, "yolo26l.yaml"), medir(RTDETR, "rtdetr-l.yaml")],
           cabecalho=["modelo", "cabeça", "pesos", "consultas", f"passada em {disp} (PyTorch, sem otimizar)"])
print()
print("Latência em PyTorch puro, lote 1, pesos aleatórios: serve para comparar ordens de grandeza")
print("nesta máquina. Número de produção se mede no formato exportado (TensorRT, ONNX).")`,
        },
        {
          t: 'texto',
          md: `### O estado da arte em tempo real

Os números abaixo são os **reportados pelos autores**, em COCO, com latência em GPU T4 via TensorRT. Não foram medidos sob o mesmo protocolo e não devem ser lidos como ranking.`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Modelo', 'AP no COCO (reportado)', 'Licença', 'Observação'],
          linhas: [
            ['RT-DETR-L', '53,1', 'Apache-2.0', '108 FPS em T4, segundo os autores'],
            ['D-FINE-L / X', '54,0 / 55,8', 'Apache-2.0', '124 e 78 FPS em T4, segundo os autores'],
            ['DEIM-D-FINE-L / X', '54,7 / 56,5', 'Apache-2.0', 'Mesma arquitetura do D-FINE, treino diferente'],
            ['RF-DETR nano', 'cerca de 48', 'Apache-2.0', 'Os autores reportam vantagem sobre o D-FINE nano na mesma latência'],
            ['RF-DETR 2XL', 'acima de 60', 'licença própria da Roboflow', 'Primeiro de tempo real a passar de 60 AP, segundo os autores'],
            ['YOLO26 (n a x)', '40,9 a 57,5', 'AGPL-3.0', '1,7 a 11,8 ms em T4, segundo os autores'],
          ],
        },
        {
          t: 'texto',
          md: `### Quando considerar um DETR no lugar de um YOLO

**A favor:**

- **Licença permissiva** (Apache-2.0) em RT-DETR, D-FINE, DEIM e nos RF-DETR menores.
- **Atenção global**: cada consulta enxerga a imagem inteira, o que ajuda em cenas onde o contexto desambigua.
- **Pré-treino forte**: com backbone auto-supervisionado, o ajuste em datasets pequenos e de domínio específico tende a ir bem. Os autores do RF-DETR enfatizam esse ponto, medindo em cem datasets de domínios variados (RF100-VL), além do COCO.
- **Sem NMS** desde a origem.

**Contra:**

- **Treino mais pesado**: mais memória de GPU e mais tempo por época que um YOLO do mesmo porte.
- **Objetos muito pequenos** foram o ponto fraco histórico da família. Melhorou muito, mas confira nos seus dados.
- **Exportação e borda**: operações de atenção têm suporte mais irregular em aceleradores embarcados e em quantização INT8 do que convoluções.

Para o seu caso, a comparação que vale é direta: YOLO26 e um RF-DETR ou D-FINE de porte equivalente, treinados nos mesmos dados, avaliados no mesmo conjunto de teste, por fatia de densidade. O módulo de avaliação tem o protocolo.`,
        },
        {
          t: 'texto',
          md: `### Fontes

- [RF-DETR: artigo (arXiv 2511.09554, ICLR 2026)](https://arxiv.org/pdf/2511.09554)
- [RF-DETR e alternativas, pela Roboflow (fonte com interesse comercial)](https://blog.roboflow.com/rf-detr-vs-alternatives/)
- [Comparativo D-FINE e RT-DETR](https://playground.roboflow.com/models/compare/d-fine-vs-rt-detr)
- [Comparativo DEIM e RT-DETR](https://playground.roboflow.com/models/compare/deim-vs-rt-detr)
- [YOLO26: artigo dos autores (arXiv 2606.03748)](https://arxiv.org/pdf/2606.03748)

Conferido em novembro de 2026.`,
        },
        {
          t: 'quiz',
          pergunta: 'O que são as "consultas" (queries) de um DETR?',
          opcoes: [
            'As perguntas que o usuário faz ao modelo em texto.',
            'Vetores aprendidos, em número fixo, que consultam os mapas de características por atenção; cada um devolve um objeto ou "nenhum objeto".',
            'As âncoras, com outro nome.',
            'As imagens do conjunto de validação.',
          ],
          correta: 1,
          explicacao: 'As consultas substituem a grade de candidatos. Como são poucas (100 a 300) e treinadas com casamento um-para-um, a saída já é o conjunto final de detecções.',
        },
        {
          t: 'quiz',
          pergunta: 'Dois artigos reportam latências de 4,5 ms e 5,2 ms para modelos concorrentes. Dá para dizer qual é mais rápido?',
          opcoes: [
            'Sim, o de 4,5 ms.',
            'Não sem conferir o protocolo: GPU, precisão (FP16 ou FP32), tamanho do lote, resolução e se o NMS entrou na conta. Diferenças assim somem ou se invertem quando se mede tudo igual.',
            'Sim, desde que os dois usem TensorRT.',
            'Não, porque latência não importa.',
          ],
          correta: 1,
          explicacao: 'Latência é uma medida de sistema, não do modelo. Os próprios autores do RF-DETR apontam variação de 0,1 ms só pela compilação do TensorRT. Comparação válida exige o mesmo hardware e o mesmo protocolo.',
        },
      ],
    },
  ],
};
