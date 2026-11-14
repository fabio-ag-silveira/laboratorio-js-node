export const modulo = {
  id: 'fundacao',
  titulo: 'Transformers e modelos de fundação',
  cor: '#4fb3d9',
  licoes: [
    // ------------------------------------------------------------------
    {
      id: 'vit-e-atencao',
      titulo: 'Vision Transformer e atenção',
      minutos: 13,
      resumo: 'A imagem como sequência de patches, e a operação que deixa cada um olhar para todos os outros.',
      blocos: [
        {
          t: 'texto',
          md: `O transformer nasceu para texto, em 2017. Em 2020, o **Vision Transformer** (ViT) mostrou que a mesma arquitetura funciona em imagens com uma adaptação mínima: cortar a imagem em quadradinhos e tratar cada um como uma palavra.

1. A imagem é dividida em **patches** de 16×16 pixels (ou 14, ou 8).
2. Cada patch é achatado e projetado num vetor: o **token**.
3. Soma-se a cada token uma **codificação de posição**, porque a atenção, sozinha, não sabe onde cada patch estava.
4. A sequência passa por camadas de **autoatenção** e de redes densas.

O painel faz os dois primeiros passos de verdade, e uma versão de brinquedo da atenção. Clique num inseto.`,
        },
        { t: 'visual', componente: 'cv/atencao' },
        {
          t: 'texto',
          md: `### A autoatenção em quatro linhas

Para cada token, a atenção calcula uma **média ponderada de todos os tokens**, em que os pesos dependem do quanto eles "combinam":

\`\`\`
Q, K, V = X·Wq, X·Wk, X·Wv          três projeções aprendidas de cada token
notas   = Q · Kᵀ / √d               quanto cada token combina com cada outro
pesos   = softmax(notas)            cada linha soma 1
saída   = pesos · V                 mistura dos valores, ponderada pela atenção
\`\`\`

No painel, \`Q\` e \`K\` são as mesmas características feitas à mão, sem projeção aprendida, e por isso a atenção vira "olhe para quem se parece com você". Num ViT treinado, as projeções aprendem relações mais úteis: a cabeça de um inseto atende ao abdômen, a borda atende ao lado de dentro.`,
        },
        {
          t: 'codigo',
          titulo: 'Autoatenção em NumPy, com as formas de cada passo',
          rodar: 'python',
          requerPython: ['cv2'],
          codigo: `import numpy as np
import lab

rng = np.random.default_rng(0)
img = lab.amostra("armadilha", semente=1, largura=224, altura=224, insetos=8, detritos=0)

P, d = 16, 64                       # lado do patch e dimensão do token
n = (224 // P) ** 2

# 1. cortar em patches e achatar: (196, 16*16*3)
patches = img.reshape(224 // P, P, 224 // P, P, 3).transpose(0, 2, 1, 3, 4).reshape(n, -1) / 255.0
print("patches achatados:", patches.shape)

# 2. projeção linear (aqui aleatória; no modelo, aprendida) + posição
X = patches @ rng.normal(0, 0.05, (patches.shape[1], d)) + rng.normal(0, 0.02, (n, d))
print("tokens:", X.shape)

# 3. autoatenção de UMA cabeça
Wq, Wk, Wv = (rng.normal(0, d ** -0.5, (d, d)) for _ in range(3))
Q, K, V = X @ Wq, X @ Wk, X @ Wv
notas = Q @ K.T / np.sqrt(d)                              # (196, 196): todo token contra todo token
pesos = np.exp(notas - notas.max(axis=1, keepdims=True))
pesos /= pesos.sum(axis=1, keepdims=True)                 # softmax por linha
saida = pesos @ V

print("matriz de atenção:", pesos.shape, "| cada linha soma", round(float(pesos[0].sum()), 6))
print("saída:", saida.shape, "(mesmo formato da entrada: dá para empilhar camadas)")

print()
lab.tabela([[f"{lado} px", f"patch {p}", (lado // p) ** 2, f"{((lado // p) ** 2) ** 2:,}".replace(",", ".")]
            for lado, p in [(224, 16), (518, 14), (640, 16), (1280, 16), (640, 8)]],
           cabecalho=["imagem", "patch", "tokens", "pares na matriz de atenção"])`,
        },
        {
          t: 'texto',
          md: `A tabela final é o custo. A matriz de atenção tem **tokens ao quadrado** de entradas, por cabeça e por camada. Dobrar o lado da imagem quadruplica os tokens e multiplica a atenção por dezesseis. É a razão de transformers serem caros em alta resolução, e de quase toda variante eficiente (Swin, atenção deformável, atenção por áreas) existir para cortar essa conta.

### CNN e ViT: o que cada um traz de fábrica

| | CNN | ViT |
|---|---|---|
| Localidade | embutida: o kernel só vê vizinhos | nenhuma: aprende dos dados |
| Invariância à translação | embutida | aprendida |
| Alcance | cresce devagar, com a profundidade | global desde a primeira camada |
| Fome de dados | menor | muito maior |
| Custo com a resolução | linear nos pixels | quadrático nos tokens |

A CNN parte de suposições que são verdadeiras para imagens, e por isso aprende com menos dados. O ViT não supõe nada: com poucos dados perde, com centenas de milhões de imagens ganha. É por isso que o ViT **anda junto com pré-treino em grande escala**, o assunto da próxima lição.

Na prática, os modelos atuais misturam os dois: convoluções nas primeiras camadas, onde localidade ajuda, e atenção nas últimas, onde contexto global ajuda.`,
        },
        {
          t: 'quiz',
          pergunta: 'Por que um ViT precisa de codificação de posição?',
          opcoes: [
            'Para reduzir o número de tokens.',
            'Porque a autoatenção trata os tokens como um conjunto: sem a posição, embaralhar os patches daria o mesmo resultado.',
            'Para acelerar o treino.',
            'Porque os patches têm tamanhos diferentes.',
          ],
          correta: 1,
          explicacao: 'A atenção calcula relações entre tokens sem saber a ordem deles. A posição é somada a cada token para que "o patch do canto" e "o patch do centro" sejam distinguíveis.',
        },
        {
          t: 'quiz',
          pergunta: 'Passar a imagem de 640 para 1280 pixels, mantendo o patch de 16, faz o quê com o custo da atenção?',
          opcoes: ['Dobra.', 'Quadruplica.', 'Multiplica por 16.', 'Não muda.'],
          correta: 2,
          explicacao: 'Os tokens passam de 1.600 para 6.400 (4×), e a matriz de atenção tem tokens² entradas: 16×. Numa CNN o custo cresceria 4×.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'auto-supervisao',
      titulo: 'Auto-supervisão: DINOv2 e DINOv3',
      minutos: 14,
      resumo: 'Aprender características de imagem sem nenhuma anotação. O que isso entrega, e um experimento que mostra onde não entrega.',
      blocos: [
        {
          t: 'texto',
          md: `Anotar é o gargalo. Imagens sem anotação existem aos bilhões. O **aprendizado auto-supervisionado** inventa uma tarefa que não precisa de rótulo e que, para ser resolvida, obriga a rede a entender imagens.

| Família | A tarefa inventada | Exemplos |
|---|---|---|
| Contrastiva | duas versões aumentadas da mesma imagem devem ter vetores próximos; imagens diferentes, distantes | SimCLR, MoCo |
| Autodestilação | um "aluno" prevê a saída de um "professor" para outra vista da mesma imagem; o professor é a média móvel do aluno | DINO, DINOv2, DINOv3 |
| Reconstrução mascarada | esconder a maior parte dos patches e reconstruí-los | MAE |

O resultado é um **backbone** cujas características servem para muitas tarefas **sem ajuste**: classificar com uma camada linear, segmentar, estimar profundidade, buscar imagens parecidas.

### A linha DINO

- **DINOv2** (Meta, 2023): ViTs treinados em 142 milhões de imagens selecionadas. Licença Apache-2.0. Virou o backbone "padrão" de quem precisa de boas características sem treinar.
- **DINOv3** (Meta, agosto de 2025): professor de 7 bilhões de parâmetros, treinado em 1,7 bilhão de imagens; destilado em ViTs menores e em ConvNeXts, para uso em dispositivos; uma variante treinada em imagens de satélite. As características densas (por patch) melhoraram muito, o que interessa a detecção e segmentação. A licença é **própria** (DINOv3 License): permite uso comercial, com condições.

Os dois já aparecem dentro de detectores: o RF-DETR usa backbone DINOv2, e o DEIMv2 usa DINOv3.`,
        },
        {
          t: 'texto',
          md: `### O experimento: poucos exemplos por classe

A promessa mais repetida sobre modelos de fundação é "funciona com poucos exemplos". O bloco abaixo testa isso nos recortes de armadilha: classificar fundo, inseto e detrito com 2, 5, 20 e 100 exemplos por classe, de dois jeitos.

- **Backbone de fundação congelado** (DINOv3 pequeno) com uma regressão logística em cima.
- **Rede pequena treinada do zero**, a mesma dos módulos anteriores, só com aqueles exemplos.

Antes de rodar, faça a sua aposta.`,
        },
        {
          t: 'nota',
          estilo: 'atencao',
          md: `Este bloco **baixa os pesos do DINOv3 pequeno** (cerca de 90 MB) na primeira execução, para o cache do Hugging Face, e leva um ou dois minutos. Precisa de internet uma vez.`,
        },
        {
          t: 'codigo',
          titulo: 'Backbone de fundação congelado contra rede pequena do zero',
          rodar: 'python',
          lento: true,
          requerPython: ['torch', 'timm', 'sklearn', 'cv2'],
          tempo: 600,
          codigo: `import warnings
warnings.filterwarnings("ignore")
import numpy as np, torch, torch.nn as nn, timm
from sklearn.linear_model import LogisticRegression
import lab

disp = lab.dispositivo()
Xtr, ytr = lab.recortes(12, tamanho=64, semente=0)
Xte, yte = lab.recortes(10, tamanho=64, semente=99)

def tensor(X):
    return torch.from_numpy(X[..., ::-1].copy()).permute(0, 3, 1, 2).float().div(255).to(disp)

# ---- backbone de fundação, congelado: só extrai vetores -------------------------
dino = timm.create_model("vit_small_patch16_dinov3", pretrained=True, num_classes=0).to(disp).eval()
cfg = dino.pretrained_cfg
media = torch.tensor(cfg["mean"], device=disp).view(1, 3, 1, 1)
desvio = torch.tensor(cfg["std"], device=disp).view(1, 3, 1, 1)
lado = cfg["input_size"][-1]
print(f"DINOv3 pequeno: {sum(p.numel() for p in dino.parameters()) / 1e6:.1f} M de pesos, entrada {lado} px")

def vetores(X):
    saida = []
    with torch.no_grad():
        for i in range(0, len(X), 64):
            lote = nn.functional.interpolate(tensor(X[i:i + 64]), size=lado, mode="bilinear", align_corners=False)
            saida.append(nn.functional.normalize(dino((lote - media) / desvio), dim=1))   # mesma normalização do pré-treino
    return torch.cat(saida).cpu().numpy()

Etr, Ete = vetores(Xtr), vetores(Xte)
print("um vetor de", Etr.shape[1], "números por recorte")

# ---- rede pequena, treinada do zero só com os k exemplos -----------------------
def do_zero(Xk, yk):
    torch.manual_seed(0)
    def bloco(e, s):
        return [nn.Conv2d(e, s, 3, padding=1), nn.GroupNorm(4, s), nn.ReLU(), nn.MaxPool2d(2)]
    rede = nn.Sequential(*bloco(3, 16), *bloco(16, 32), *bloco(32, 64),
                         nn.AdaptiveAvgPool2d(1), nn.Flatten(), nn.Linear(64, 3)).to(disp)
    opt = torch.optim.AdamW(rede.parameters(), lr=2e-3, weight_decay=1e-4)
    Xt, yt = tensor(Xk), torch.from_numpy(yk).to(disp)
    for _ in range(60):
        perda = nn.functional.cross_entropy(rede(Xt), yt)
        opt.zero_grad(); perda.backward(); opt.step()
    with torch.no_grad():
        return float((rede(tensor(Xte)).argmax(1).cpu().numpy() == yte).mean())

linhas = []
for k in (2, 5, 20, 100):
    a, b = [], []
    for rep in range(5):                                   # 5 sorteios de quais exemplos usar
        rng = np.random.default_rng(rep)
        idx = np.concatenate([rng.choice(np.where(ytr == c)[0], k, replace=False) for c in range(3)])
        a.append(LogisticRegression(max_iter=2000, C=10).fit(Etr[idx], ytr[idx]).score(Ete, yte))
        b.append(do_zero(Xtr[idx], ytr[idx]))
    linhas.append([k, f"{np.mean(a):.1%}", f"{np.mean(b):.1%}", "fundação" if np.mean(a) > np.mean(b) else "do zero"])

lab.tabela(linhas, cabecalho=["exemplos por classe", "DINOv3 congelado + linear", "rede pequena do zero", "quem ganha"])`,
        },
        {
          t: 'texto',
          md: `Na máquina em que esta lição foi escrita, a **rede pequena do zero ganhou** com 2 e 5 exemplos por classe (cerca de 6 pontos), empatou com 20, e o DINOv3 só passou à frente com 100. Um ResNet-18 pré-treinado e o DINOv2 deram o mesmo quadro. É o contrário do que se lê por aí, e vale entender por quê.

- **A tarefa é de baixo nível.** Separar inseto escuro, sujeira parda e fundo amarelo se resolve com cor e contraste. Uma rede pequena aprende isso em dezenas de passos. As características de um modelo de fundação foram moldadas para distinguir conceitos em fotografias (um cachorro de um lobo), e a informação de que a tarefa precisa está lá, mas diluída entre centenas de dimensões.
- **O domínio é outro.** Desenho sintético de cartão amarelo não se parece com as imagens do pré-treino.
- **Com mais dados, o quadro vira.** Com 100 exemplos por classe, o classificador linear já consegue achar, no vetor de 384 números, as direções que importam.

O que **não** dá para concluir daqui: que modelos de fundação não servem para insetos. Em fotografia real, com textura, variação de pose e classes que diferem por detalhe, a literatura e a prática mostram vantagem consistente deles com poucos dados. O que dá para concluir é a regra que vale para tudo neste módulo:

> Modelo de fundação é uma **hipótese forte**, não uma garantia. Compare com a alternativa simples, **nos seus dados**, antes de adotar.`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Uso de um backbone auto-supervisionado', 'Como', 'Custo'],
          linhas: [
            ['Classificar com poucos rótulos', 'vetor por imagem + classificador linear ou vizinhos', 'uma passada por imagem; nenhum treino da rede'],
            ['Achar duplicatas e quase-duplicatas', 'vetores muito próximos', 'evita vazamento entre treino e teste'],
            ['Achar o que é novo', 'imagens longe de tudo que há no dataset', 'aprendizado ativo por novidade'],
            ['Buscar por exemplo', '"ache mais imagens como esta"', 'banco vetorial (pgvector, na trilha de PostgreSQL)'],
            ['Backbone de detector', 'RF-DETR, DEIMv2', 'treino mais pesado; convergência melhor com poucos dados'],
          ],
        },
        {
          t: 'texto',
          md: `### Fontes

- [DINOv3: anúncio da Meta](https://ai.meta.com/blog/dinov3-self-supervised-vision-model/)
- [DINOv3: página do projeto](https://ai.meta.com/dinov3/)
- [DINOv3 explicado, pela Lightly](https://lightly.ai/blog/dinov3)

Conferido em novembro de 2026. Antes de usar em produto, leia a licença do DINOv3 no repositório oficial.`,
        },
        {
          t: 'quiz',
          pergunta: 'O que caracteriza o aprendizado auto-supervisionado?',
          opcoes: [
            'Usa rótulos gerados por outro modelo.',
            'Cria a tarefa de treino a partir das próprias imagens (duas vistas da mesma imagem, patches escondidos), sem anotação humana.',
            'Treina sem nenhuma função de perda.',
            'Só funciona com texto.',
          ],
          correta: 1,
          explicacao: 'O sinal de treino vem da estrutura dos dados. Isso libera o uso de bilhões de imagens sem rótulo, que é o que viabilizou os backbones de fundação.',
        },
        {
          t: 'quiz',
          pergunta: 'No experimento dos recortes, a rede pequena treinada do zero ganhou do backbone de fundação com poucos exemplos. Qual é a conclusão correta?',
          opcoes: [
            'Modelos de fundação são inferiores a redes pequenas.',
            'O resultado depende da tarefa e do domínio: aqui a tarefa é de baixo nível e o domínio é distante do pré-treino. A decisão sai de comparar as alternativas nos seus dados.',
            'O experimento está errado.',
            'Redes pequenas sempre ganham com poucos dados.',
          ],
          correta: 1,
          explicacao: 'Um resultado mede uma situação. Ele derruba a ideia de que fundação ganha sempre, e não autoriza a ideia oposta. O hábito que fica é ter uma alternativa simples como referência.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'clip-e-zero-shot',
      titulo: 'CLIP e classificação sem treino',
      minutos: 11,
      resumo: 'Imagem e texto no mesmo espaço vetorial: classificar descrevendo a classe em palavras.',
      blocos: [
        {
          t: 'texto',
          md: `O **CLIP** (OpenAI, 2021) treinou dois codificadores juntos, um de imagem e um de texto, em 400 milhões de pares imagem-legenda da internet. A tarefa: fazer o vetor de cada imagem ficar perto do vetor da sua legenda e longe das outras.

O resultado é um espaço em que **imagem e texto são comparáveis**. Daí sai a classificação **zero-shot**: em vez de treinar um classificador, escreve-se uma frase por classe e escolhe-se a mais próxima da imagem.`,
        },
        {
          t: 'codigo',
          titulo: 'Classificação zero-shot (para ler; exige baixar um modelo de centenas de MB)',
          lang: 'python',
          codigo: `import torch
from PIL import Image
from transformers import AutoModel, AutoProcessor

# SigLIP 2: sucessor do CLIP, treinado com perda sigmoide em vez de softmax
nome = "google/siglip2-base-patch16-224"
modelo = AutoModel.from_pretrained(nome).eval()
processador = AutoProcessor.from_pretrained(nome)

# as "classes" são frases. A forma de escrever muda o resultado.
frases = [
    "a photo of a moth on a yellow sticky trap",
    "a photo of a small fly on a yellow sticky trap",
    "a photo of dirt and debris on a yellow sticky trap",
]

imagem = Image.open("recorte.jpg")
entrada = processador(text=frases, images=imagem, padding="max_length", return_tensors="pt")
with torch.no_grad():
    saida = modelo(**entrada)

# semelhança entre o vetor da imagem e o de cada frase
probabilidades = torch.sigmoid(saida.logits_per_image)[0]
for frase, p in zip(frases, probabilidades):
    print(f"{p:.2f}  {frase}")`,
        },
        {
          t: 'texto',
          md: `### Onde funciona e onde não

**Funciona bem** com categorias que a internet descreve em legendas: cachorro, carro, praia, "inseto num cartão amarelo".

**Funciona mal** em:

- **Classificação fina.** Distinguir duas espécies de cigarrinha exige um detalhe que quase nenhuma legenda da internet menciona. O modelo sabe que é "um inseto".
- **Domínio técnico.** Imagem de microscópio, raio-X, armadilha: pouco representadas no treino.
- **Contagem e posição.** O vetor resume a imagem inteira. "Três insetos" e "trinta insetos" ficam próximos.
- **Frases.** O resultado muda com a redação. Fazer a média de várias formulações por classe ajuda.

### Para que serve num projeto de detecção

Menos como classificador final, mais como **ferramenta de dados**:

- **Buscar no dataset por texto**: "fotos com reflexo", "cartão dobrado", "imagem borrada". Acha em minutos o que levaria horas de rolagem.
- **Triagem**: separar o que nem é foto de armadilha antes de gastar anotação.
- **Achar duplicatas** e montar divisões sem vazamento.
- **Peça de modelos maiores**: detectores de vocabulário aberto e modelos de linguagem com visão usam um codificador desse tipo por dentro.

Os sucessores trocaram detalhes e mantiveram a ideia: **SigLIP** e **SigLIP 2** (Google) usam perda sigmoide por par, que escala melhor; e há variantes ajustadas a domínios, como o **BioCLIP**, treinado em imagens de organismos com a árvore taxonômica nas legendas, que é o tipo de modelo a testar primeiro para espécies.`,
        },
        {
          t: 'nota',
          estilo: 'campo',
          md: `**Um teste de uma tarde.** Antes de investir num classificador de espécies, vale passar um conjunto de recortes já rotulados por um CLIP de biologia e por um genérico, com as espécies escritas por extenso, e medir o acerto. Se der 40%, o modelo não distingue as suas classes e o caminho é treinar. Se der 85%, você ganhou um pré-anotador. Nos dois casos, a decisão sai de um número.`,
        },
        {
          t: 'quiz',
          pergunta: 'Como funciona a classificação zero-shot com um modelo do tipo CLIP?',
          opcoes: [
            'O modelo é ajustado com poucos exemplos de cada classe.',
            'Cada classe é descrita por uma frase; a imagem recebe a classe cuja frase tem o vetor mais próximo do vetor dela.',
            'O modelo gera uma legenda e ela é comparada às classes por palavras iguais.',
            'O modelo detecta objetos e conta as classes.',
          ],
          correta: 1,
          explicacao: 'Imagem e texto são levados ao mesmo espaço vetorial, e a decisão é por semelhança. Nenhum peso é treinado para as novas classes.',
        },
        {
          t: 'quiz',
          pergunta: 'Por que o CLIP genérico vai mal em separar espécies de insetos muito parecidas?',
          opcoes: [
            'Porque não aceita imagens pequenas.',
            'Porque aprendeu com legendas da internet, que raramente descrevem a diferença fina entre espécies; o que ele distingue é o que as legendas distinguem.',
            'Porque só funciona em inglês.',
            'Porque precisa de GPU.',
          ],
          correta: 1,
          explicacao: 'O sinal de treino define o que o modelo separa. Diferenças que quase ninguém escreve em legendas ficam sem representação. Modelos treinados com taxonomia nas legendas, como o BioCLIP, atacam exatamente isso.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'sam',
      titulo: 'SAM: segmentar por prompt',
      minutos: 11,
      resumo: 'Do clique à máscara, do vídeo ao conceito. O que mudou em cada versão e onde entra num projeto.',
      blocos: [
        {
          t: 'texto',
          md: `O **Segment Anything** (Meta, 2023) mudou a pergunta da segmentação. Em vez de "que classe é cada pixel?", passou a ser "qual é o objeto que estou apontando?". O modelo não conhece as suas classes: recebe um *prompt* (um ponto, uma caixa) e devolve a máscara do que está ali.

| Versão | Ano | Prompt | O que acrescentou |
|---|---|---|---|
| SAM | 2023 | pontos, caixas | máscara de qualquer objeto, sem treino na classe; base de 1 bilhão de máscaras |
| SAM 2 | 2024 | pontos, caixas | vídeo: propaga a máscara pelos quadros, com memória |
| SAM 3 | nov. 2025 | **texto curto** ou imagens de exemplo, além dos anteriores | segmenta **todas as instâncias de um conceito**: detecção, segmentação e rastreamento a partir de uma frase |

A mudança do SAM 3 é de tarefa. As versões anteriores segmentavam **um** objeto por prompt. O SAM 3 recebe "inseto" e devolve as máscaras de todos os insetos da imagem, e segue cada um num vídeo. Por dentro são um detector e um rastreador (este, herdado do SAM 2) compartilhando o mesmo codificador de imagem.`,
        },
        {
          t: 'codigo',
          titulo: 'De caixas anotadas para máscaras (para ler; exige baixar os pesos)',
          lang: 'python',
          codigo: `from ultralytics import SAM

# o Ultralytics embrulha os modelos SAM com a mesma interface dos detectores
modelo = SAM("sam2.1_b.pt")

# cada caixa do seu dataset vira o prompt que pede a máscara daquele objeto
caixas = [[412, 230, 460, 271], [130, 88, 155, 109]]     # x1, y1, x2, y2
resultado = modelo("armadilha.jpg", bboxes=caixas)[0]

for mascara, caixa in zip(resultado.masks.xy, caixas):
    # mascara é o polígono do contorno: o formato de anotação de segmentação do YOLO
    print(len(mascara), "pontos de contorno para a caixa", caixa)

# Com isso, um dataset de DETECÇÃO vira um de SEGMENTAÇÃO sem anotar máscara à mão.
# Revise uma amostra: em objeto de poucos pixels, a máscara do SAM costuma vazar para o fundo.`,
        },
        {
          t: 'texto',
          md: `### Onde entra num projeto de armadilhas

**Anotação.** É o uso mais direto: o anotador clica ou desenha uma caixa e ganha a máscara. As ferramentas de anotação (Label Studio, CVAT, Roboflow) trazem isso embutido.

**Converter dataset.** Caixas já anotadas viram máscaras, como no código acima.

**Pré-anotação por conceito.** Com o SAM 3, uma frase gera candidatos para a imagem inteira. Serve de ponto de partida para um dataset novo.

### Os limites que importam aqui

- **Objetos muito pequenos.** A máscara de um inseto de 10 pixels sai grosseira. O codificador reduz a imagem bastante antes de segmentar.
- **Custo.** São modelos grandes, lentos para rodar em toda foto de produção. O uso típico é **fora de linha**: gerar anotação para treinar um modelo pequeno e rápido.
- **Não classifica espécie.** "Inseto" funciona. "Cigarrinha-das-raízes" depende de o modelo ter visto esse conceito, e não conte com isso.
- **Licença.** O SAM 2 saiu sob Apache-2.0. O SAM 3 usa uma licença própria (SAM License), e os pesos ficam atrás de um pedido de acesso. Leia antes de pôr num produto.

O padrão de uso que se consolidou é **professor grande, aluno pequeno**: o modelo de fundação anota, uma pessoa revisa, e um YOLO ou RF-DETR treinado nessas anotações vai para produção.`,
        },
        {
          t: 'texto',
          md: `### Fontes

- [SAM 3: repositório oficial](https://github.com/facebookresearch/sam3)
- [SAM 3: artigo (arXiv 2511.16719)](https://arxiv.org/html/2511.16719v2)
- [Comparativo SAM 2 e SAM 3, pela Roboflow](https://playground.roboflow.com/models/compare/sam-2-vs-sam-3)

Conferido em novembro de 2026.`,
        },
        {
          t: 'quiz',
          pergunta: 'Qual é a diferença de tarefa entre o SAM 2 e o SAM 3?',
          opcoes: [
            'O SAM 3 é só mais rápido.',
            'O SAM 2 segmenta o objeto apontado por um prompt visual; o SAM 3 também aceita um conceito (texto ou exemplo) e devolve todas as instâncias dele.',
            'O SAM 3 só funciona em vídeo.',
            'O SAM 2 precisa de treino nas classes; o SAM 3 não.',
          ],
          correta: 1,
          explicacao: 'O SAM 3 generaliza a tarefa: mantém os prompts visuais e acrescenta a segmentação por conceito, que junta detecção e segmentação a partir de uma frase curta.',
        },
        {
          t: 'quiz',
          pergunta: 'Por que o uso típico do SAM num produto de detecção é fora de linha, e não na inferência de produção?',
          opcoes: [
            'Porque ele não roda em GPU.',
            'Porque é grande e lento para rodar em toda imagem, não classifica as espécies do problema e vai mal em objetos minúsculos; o que compensa é usá-lo para gerar anotação e treinar um modelo pequeno.',
            'Porque a licença proíbe.',
            'Porque só aceita imagens quadradas.',
          ],
          correta: 1,
          explicacao: 'É o padrão professor-aluno: a capacidade do modelo grande é transferida para um modelo específico e barato por meio dos dados que ele ajuda a anotar.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'vocabulario-aberto',
      titulo: 'Vocabulário aberto e modelos de linguagem com visão',
      minutos: 12,
      resumo: 'Detectar o que se descreve em texto, sem treinar. O que os números dizem, e o lugar certo disso num pipeline.',
      blocos: [
        {
          t: 'texto',
          md: `Um detector comum tem uma lista fechada de classes, fixada no treino. Um detector de **vocabulário aberto** recebe as classes como **texto**, na hora da inferência: "inseto", "mariposa", "gota de cola".

| Modelo | Origem | Característica | Licença |
|---|---|---|---|
| Grounding DINO | IDEA Research, 2023 | detector DETR guiado por texto; a referência em precisão | Apache-2.0 |
| OWLv2 | Google, 2023 | baseado em CLIP; bom em categorias raras | Apache-2.0 |
| YOLO-World / YOLOE | 2024–25 | vocabulário aberto em tempo real, na arquitetura YOLO | AGPL-3.0 (YOLOE) |
| SAM 3 | Meta, 2025 | conceito por texto ou exemplo, com máscaras | própria |

E há os **modelos de linguagem com visão** (VLMs): Florence-2, PaliGemma, a família Qwen-VL, e os modelos comerciais de uso geral. Recebem imagem e instrução em texto, e respondem em texto, que pode incluir coordenadas de caixas. São os mais flexíveis ("conte os insetos escuros e descreva o estado do cartão") e os mais lentos.`,
        },
        {
          t: 'texto',
          md: `### O que os números dizem

Dois resultados de 2026 calibram a expectativa. São de fontes com protocolos próprios: leia como ordem de grandeza.

**Num conjunto de avaliação geral** (objetos descritos por texto, publicado pela Roboflow):`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Modelo', 'Acerto reportado', 'Tempo médio por imagem'],
          linhas: [
            ['SAM 3', '60,3%', '—'],
            ['Grounding DINO', '36,1%', '0,76 s'],
            ['YOLO-World', '29,8%', '0,33 s'],
            ['OWLv2', '20,9%', '3,63 s'],
          ],
        },
        {
          t: 'texto',
          md: `**Fora do domínio de treino** (imagens aéreas, estudo de janeiro de 2026): o melhor detector de vocabulário aberto testado chegou a **27,6% de F1**, com **69% de falsos positivos**. Modelos de tempo real ficaram abaixo de 4%.

A leitura é direta. Em categorias comuns e fotografia comum, esses modelos já são úteis sem treino. Em **domínio especializado**, com objetos pequenos e vistos de um ângulo incomum, o desempenho despenca. Uma armadilha adesiva fotografada de cima, com insetos de 20 pixels, está muito mais perto do segundo caso que do primeiro.

### O lugar certo num pipeline

| Uso | Faz sentido? | Por quê |
|---|---|---|
| Inferência de produção em armadilhas | raramente | lento, caro e fraco no domínio |
| Pré-anotar um dataset novo | sim, com revisão | cortar o tempo de anotação inicial, mesmo com 50% de acerto |
| Minerar imagens ("ache fotos com teia de aranha") | sim | não precisa de precisão alta |
| Checagem de sanidade ("isto é uma armadilha?") | sim | tarefa grosseira, onde eles são fortes |
| Descrever a cena para um relatório | sim, com VLM | saída em texto livre |

A regra é a mesma do SAM: **o modelo grande trabalha nos dados, o modelo pequeno trabalha em produção**. O que muda de um projeto para outro é quanto da anotação o modelo grande consegue adiantar, e isso se mede em uma tarde com o seu conjunto de teste.`,
        },
        {
          t: 'nota',
          estilo: 'pegadinha',
          md: `**Auto-anotação sem revisão envenena o dataset.** Se o modelo de vocabulário aberto confunde sujeira com inseto em 30% dos casos, treinar um detector nas anotações dele ensina exatamente essa confusão, e o detector final a reproduz com confiança alta. O ganho da auto-anotação existe quando há revisão humana, ao menos por amostragem, e quando o conjunto de **teste** é anotado por pessoas, do zero.`,
        },
        {
          t: 'texto',
          md: `### Fontes

- [Avaliação de detecção por texto, da Roboflow](https://benchmarklist.com/benchmarks/roboflow_vision_evals_detection/)
- [Detectores de vocabulário aberto em imagens aéreas (jan. 2026)](https://benchmarklist.com/benchmarks/do_open_vocabulary_detectors_transfer_to_aerial_imagery_a_comparative_evaluation/)
- [YOLOE: artigo (arXiv 2503.07465)](https://arxiv.org/pdf/2503.07465)
- [Robustez de detectores de vocabulário aberto sob mudança de distribuição (arXiv 2405.14874)](https://arxiv.org/pdf/2405.14874)

Conferido em novembro de 2026.`,
        },
        {
          t: 'quiz',
          pergunta: 'Um detector de vocabulário aberto vai bem em fotos do dia a dia e mal em imagens aéreas. O que isso sugere para armadilhas de insetos?',
          opcoes: [
            'Que funcionará bem, porque insetos são uma categoria comum.',
            'Que o desempenho deve ser medido antes de confiar: é um domínio especializado, com objetos pequenos e ângulo incomum, onde esses modelos costumam cair muito.',
            'Que basta escrever o prompt em português.',
            'Que é preciso um modelo maior.',
          ],
          correta: 1,
          explicacao: 'A queda fora do domínio é o padrão documentado. O conhecimento de "inseto" do modelo vem de fotos de insetos grandes e bem enquadrados, não de manchas de 20 pixels num cartão.',
        },
        {
          t: 'quiz',
          pergunta: 'Qual é o padrão recomendado para usar modelos de fundação num sistema de detecção em produção?',
          opcoes: [
            'Rodar o modelo de fundação em toda imagem de produção.',
            'Usar o modelo de fundação para adiantar a anotação, com revisão humana, e treinar um detector pequeno e específico para a produção.',
            'Substituir o conjunto de teste pelas previsões do modelo de fundação.',
            'Não usar modelos de fundação.',
          ],
          correta: 1,
          explicacao: 'Professor grande, aluno pequeno. O custo e a fragilidade do modelo grande ficam fora da produção, e o conjunto de teste anotado por pessoas continua sendo a régua.',
        },
      ],
    },
  ],
};
