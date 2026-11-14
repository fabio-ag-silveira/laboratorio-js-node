export const modulo = {
  id: 'alem-da-caixa',
  titulo: 'Além da caixa',
  cor: '#a78bfa',
  licoes: [
    // ------------------------------------------------------------------
    {
      id: 'segmentacao',
      titulo: 'Segmentação',
      minutos: 12,
      resumo: 'Do retângulo ao contorno exato. O que as máscaras dão a mais, e o que custam.',
      blocos: [
        {
          t: 'texto',
          md: `A caixa diz **onde** está o objeto, com folga. A segmentação diz **quais pixels** são dele. Há três tarefas com esse nome, e convém não misturar:

| Tarefa | Saída | Separa indivíduos? | Exemplo |
|---|---|---|---|
| Semântica | uma classe por pixel | não | "isto é cartão, isto é inseto" |
| De instância | uma máscara por objeto | sim | cada inseto com a sua máscara |
| Panóptica | as duas juntas | sim, e classifica o fundo | cena completa rotulada |

Para contagem, só a de instância serve: a semântica devolve uma mancha única para dez insetos encostados.

### O que a máscara dá a mais

- **Área real**, em vez da área do retângulo. Para estimar tamanho ou biomassa, a caixa de um inseto na diagonal erra muito.
- **Separação em aglomerados**: duas caixas que se sobrepõem em 60% podem ter máscaras que mal se tocam.
- **Recorte limpo** para um classificador de segundo estágio, sem o vizinho dentro do recorte.

### O que custa

Anotar máscara leva de cinco a dez vezes o tempo de anotar caixa. É aí que os modelos de segmentação por *prompt* (SAM, no próximo módulo) mudaram a conta: um clique ou uma caixa vira máscara, e o anotador só corrige.`,
        },
        {
          t: 'codigo',
          titulo: 'Quanto da caixa é objeto, e por que a medida muda',
          rodar: 'python',
          requerPython: ['cv2'],
          codigo: `import cv2
import numpy as np
import lab

img, gabarito, _ = lab.amostra_com_gabarito("armadilha", semente=12, insetos=30, detritos=0, aglomerado=0.0)
cinza = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

# máscara dos insetos pelo método clássico (tirar o fundo e limiarizar)
sem_fundo = cv2.morphologyEx(cinza, cv2.MORPH_BLACKHAT, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (45, 45)))
_, mascara = cv2.threshold(sem_fundo, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

# de máscara semântica para instâncias: componentes conexos
n, rotulos = cv2.connectedComponents(mascara)
cores = np.random.default_rng(1).integers(60, 255, (n, 3)).astype(np.uint8)
cores[0] = 0
print("instâncias encontradas:", n - 1, "| insetos no gabarito:", len(gabarito))

# que fração de cada caixa do gabarito é, de fato, inseto?
por_classe = {}
for c in gabarito:
    x, y, w, h = (int(round(c[k])) for k in ("x", "y", "w", "h"))
    recorte = mascara[max(y, 0): y + h, max(x, 0): x + w]
    if recorte.size:
        por_classe.setdefault(c["classe"], []).append(float((recorte > 0).mean()))
lab.tabela([[k, len(v), f"{np.mean(v):.0%}"] for k, v in sorted(por_classe.items())],
           cabecalho=["classe", "objetos", "fração da caixa que é inseto"])

# IoU e Dice da mesma máscara deslocada 1 px: são medidas diferentes do mesmo erro
deslocada = np.roll(mascara, 1, axis=1)
inter = np.logical_and(mascara > 0, deslocada > 0).sum()
uniao = np.logical_or(mascara > 0, deslocada > 0).sum()
total = (mascara > 0).sum() + (deslocada > 0).sum()
print(f"máscara deslocada 1 px:  IoU {inter / uniao:.2f}   Dice {2 * inter / total:.2f}")

lab.mostrar(img, mascara, cores[rotulos], titulos=["original", "semântica: inseto x fundo", "instâncias: uma cor por objeto"])`,
        },
        {
          t: 'texto',
          md: `A tabela mostra o tamanho da folga: boa parte de cada caixa é fundo. Para medir área, ou para alimentar um classificador com o recorte, é ruído.

E as duas últimas linhas da saída resolvem uma confusão frequente. **IoU** e **Dice** medem a mesma sobreposição com fórmulas diferentes, e o Dice é sempre o maior dos dois (vale Dice = 2·IoU / (1 + IoU)). Um artigo que reporta Dice 0,85 está reportando IoU 0,74. Antes de comparar números de segmentação, confira qual dos dois é.

### As arquiteturas, em uma linha cada

- **U-Net** (2015): codificador que reduz, decodificador que amplia, com ligações diretas entre os níveis. Semântica. Ainda é o padrão em imagem médica e sensoriamento.
- **Mask R-CNN** (2017): um detector de dois estágios com uma cabeça extra que prevê a máscara dentro de cada caixa. A referência em instância por anos.
- **YOLO-seg**: a cabeça de detecção prevê também coeficientes que combinam um pequeno conjunto de máscaras-protótipo. Rápido, com bordas menos precisas.
- **Mask2Former** e sucessores: transformers com consultas, unificando as três tarefas.
- **SAM**: não é treinado para as suas classes. Recebe um *prompt* e devolve a máscara do que foi apontado.`,
        },
        {
          t: 'nota',
          estilo: 'campo',
          md: `**Um caminho barato para máscaras.** Se você já tem caixas anotadas, um modelo de segmentação por *prompt* transforma cada caixa em máscara sem trabalho manual. Treinar um YOLO-seg nessas máscaras geradas, revisando só uma amostra, costuma dar um segmentador útil por uma fração do custo de anotar do zero. A qualidade tem de ser medida num conjunto pequeno anotado à mão.`,
        },
        {
          t: 'quiz',
          pergunta: 'Dez insetos estão encostados, formando uma mancha. O que uma segmentação semântica devolve, e o que uma de instância devolve?',
          opcoes: [
            'As duas devolvem dez máscaras.',
            'A semântica devolve uma região única da classe "inseto"; a de instância devolve dez máscaras, uma por indivíduo.',
            'A semântica devolve dez caixas; a de instância, uma máscara.',
            'Nenhuma funciona em objetos encostados.',
          ],
          correta: 1,
          explicacao: 'Semântica classifica pixels, sem noção de indivíduo. Para contar é preciso a de instância, ou algum pós-processamento que separe a mancha.',
        },
        {
          t: 'quiz',
          pergunta: 'Um trabalho reporta Dice 0,80 e outro reporta IoU 0,70 no mesmo conjunto. Qual modelo segmenta melhor?',
          opcoes: [
            'O primeiro, porque 0,80 é maior que 0,70.',
            'O segundo: Dice 0,80 equivale a IoU 0,67, menor que 0,70.',
            'São equivalentes.',
            'Não dá para converter uma medida na outra.',
          ],
          correta: 1,
          explicacao: 'IoU = Dice / (2 − Dice). Para Dice 0,80: 0,80 / 1,20 = 0,67. O Dice é sempre maior ou igual ao IoU, então comparar os dois diretamente favorece quem reporta Dice.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'pose-e-caixas-orientadas',
      titulo: 'Caixas orientadas e pontos-chave',
      minutos: 10,
      resumo: 'Duas saídas intermediárias entre a caixa e a máscara, baratas de anotar e úteis para objetos alongados.',
      blocos: [
        {
          t: 'texto',
          md: `### Caixas orientadas (OBB)

A caixa comum é alinhada aos eixos da imagem. Um objeto **alongado e inclinado** cabe mal nela: a caixa de um inseto a 45° tem mais fundo que inseto, e as caixas de dois vizinhos paralelos se sobrepõem mesmo quando os insetos não se tocam.

A **caixa orientada** acrescenta um quinto número, o ângulo. Nasceu em imagens aéreas (navios, aviões, carros vistos de cima), que têm exatamente esse problema: objetos alongados, em qualquer direção, muitas vezes estacionados lado a lado.

O bloco abaixo mede a diferença: para cada inseto, a área da caixa alinhada e a da caixa orientada mínima.`,
        },
        {
          t: 'codigo',
          titulo: 'Caixa alinhada contra caixa orientada',
          rodar: 'python',
          requerPython: ['cv2'],
          codigo: `import cv2
import numpy as np
import lab

img, gabarito, _ = lab.amostra_com_gabarito("armadilha", semente=14, insetos=26, detritos=0, aglomerado=0.0)
cinza = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
sem_fundo = cv2.morphologyEx(cinza, cv2.MORPH_BLACKHAT, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (45, 45)))
_, mascara = cv2.threshold(sem_fundo, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
contornos, _ = cv2.findContours(mascara, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

saida = img.copy()
linhas = []
for c in contornos:
    area_objeto = cv2.contourArea(c)
    if area_objeto < 25:
        continue
    x, y, w, h = cv2.boundingRect(c)                    # alinhada aos eixos
    (cx, cy), (lw, lh), angulo = cv2.minAreaRect(c)     # orientada: centro, lados e ângulo
    if lw * lh < 1:
        continue
    alongamento = max(lw, lh) / max(min(lw, lh), 1e-6)
    linhas.append((alongamento, area_objeto / (w * h), area_objeto / (lw * lh)))
    cv2.rectangle(saida, (x, y), (x + w, y + h), (60, 76, 231), 1)
    cv2.drawContours(saida, [cv2.boxPoints(((cx, cy), (lw, lh), angulo)).astype(np.int32)], 0, (113, 204, 46), 2)

a = np.array(linhas)
tabela = []
for nome, baixo, alto in [("quase redondos (até 1,4)", 0, 1.4), ("um pouco alongados (1,4 a 2)", 1.4, 2.0), ("alongados (acima de 2)", 2.0, 99)]:
    g = a[(a[:, 0] >= baixo) & (a[:, 0] < alto)]
    if len(g):
        tabela.append([nome, len(g), f"{g[:, 1].mean():.0%}", f"{g[:, 2].mean():.0%}", f"+{(g[:, 2] - g[:, 1]).mean() * 100:.0f} pontos"])
lab.tabela(tabela, cabecalho=["lado maior ÷ lado menor", "quantos", "caixa alinhada: % que é objeto",
                              "caixa orientada: % que é objeto", "ganho"])
lab.mostrar(saida, titulo="vermelho = caixa alinhada, verde = caixa orientada")`,
        },
        {
          t: 'texto',
          md: `A caixa orientada aproveita mais da área em todos os grupos, com ganho um pouco maior quanto mais alongado o objeto. Nem os "quase redondos" empatam: nenhum inseto é um círculo, e asas e pernas em diagonal já desperdiçam caixa alinhada. O empate só acontece em objeto realmente circular, caso em que o ângulo vira um número sem significado que o modelo precisa aprender mesmo assim.

**Quando vale a pena:** objetos alongados, densos e em orientações variadas. **Custos:** o ângulo tem uma descontinuidade (0° e 180° são a mesma caixa), que exige perdas específicas; a anotação é mais lenta; e o IoU entre caixas rotacionadas é mais caro de calcular. O Ultralytics tem variante pronta (\`yolo26-obb\`).

### Pontos-chave (pose)

Em vez de contornar o objeto, marcam-se pontos com significado: no corpo humano, ombros, cotovelos, joelhos. Num inseto, cabeça, tórax, ponta do abdômen, pontas das asas.

Servem para **medir** (comprimento do corpo, envergadura), para **orientar** (para onde o animal está virado) e para **distinguir espécies** por proporções. A métrica é a OKS (*object keypoint similarity*), que faz para pontos o papel que o IoU faz para caixas: mede a distância de cada ponto ao gabarito, normalizada pelo tamanho do objeto.

É pouco usado em armadilhas, onde o inseto está em qualquer posição e muitas vezes danificado. É o padrão em fenotipagem e em estudos de comportamento.`,
        },
        {
          t: 'quiz',
          pergunta: 'Em qual cenário a caixa orientada traz mais ganho sobre a caixa alinhada aos eixos?',
          opcoes: [
            'Objetos redondos e isolados.',
            'Objetos alongados, próximos uns dos outros e em ângulos variados.',
            'Objetos muito pequenos, de poucos pixels.',
            'Qualquer cenário: é sempre melhor.',
          ],
          correta: 1,
          explicacao: 'O ganho vem de reduzir o fundo dentro da caixa e a sobreposição entre vizinhos inclinados. Em objeto redondo o ângulo não acrescenta nada, e em objeto de poucos pixels o ângulo nem é estimável.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'rastreamento',
      titulo: 'Rastreamento e contagem em vídeo',
      minutos: 12,
      resumo: 'Ligar detecções no tempo: dar identidade aos objetos, contar sem repetir e o truque do ByteTrack.',
      blocos: [
        {
          t: 'texto',
          md: `Num vídeo, detectar quadro a quadro não basta: o mesmo inseto é detectado trinta vezes por segundo. **Rastrear** é decidir quais detecções, em quadros diferentes, são o mesmo objeto, e dar a ele um identificador.

A abordagem dominante é o **rastreamento por detecção**, com três peças:

1. **Detector**: roda em cada quadro.
2. **Previsão de movimento**: estima onde cada rastro deve estar no quadro seguinte (um filtro de Kalman, em geral com modelo de velocidade constante).
3. **Associação**: casa as posições previstas com as detecções novas, por IoU ou distância, com o algoritmo húngaro.

Um rastro que fica sem detecção por alguns quadros é mantido "em espera" e, se o objeto não reaparece, encerrado. No painel, rode até o fim com cada estratégia.`,
        },
        { t: 'visual', componente: 'cv/rastreador' },
        {
          t: 'texto',
          md: `### O que observar

- **IDs a mais.** Toda vez que um rastro se perde e o objeto reaparece, nasce um identificador novo. Contar "quantos IDs únicos apareceram" superestima o número de objetos, e quanto pior o detector, maior o exagero.
- **Trocas de ID.** Quando dois objetos se cruzam, os rastros podem trocar de dono. A contagem total fica certa e as trajetórias, erradas.
- **Memória do rastro.** Aumente e veja os IDs a mais diminuírem: o rastro espera mais tempo pelo objeto. O custo é manter vivo um rastro que deveria ter acabado, e que pode roubar a detecção de outro objeto.

### A ideia do ByteTrack

Rastreadores anteriores descartavam as detecções de confiança baixa antes de associar. O **ByteTrack** (2021) notou que, num cruzamento ou numa oclusão parcial, o detector continua vendo o objeto, só que com confiança baixa. A solução tem duas etapas:

1. associar os rastros às detecções **confiantes**;
2. os rastros que sobraram sem par tentam as detecções **fracas**.

A regra que evita o desastre: detecção fraca **nunca cria rastro novo**, só mantém um que já existe. Assim o ruído de baixa confiança não vira objeto.

É a mesma lógica da histerese do Canny, que você viu no módulo clássico: um limiar alto para começar, um baixo para continuar.`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Rastreador', 'Associa por', 'Quando usar'],
          linhas: [
            ['SORT', 'IoU com a posição prevista por Kalman', 'cenas simples, câmera fixa; muito rápido'],
            ['DeepSORT', 'movimento + aparência (um vetor por recorte)', 'oclusões longas, objetos distinguíveis pela aparência'],
            ['ByteTrack', 'movimento, em duas etapas de confiança', 'padrão atual quando a aparência não ajuda'],
            ['BoT-SORT', 'ByteTrack + aparência + compensação do movimento da câmera', 'câmera em movimento (drone, veículo)'],
          ],
        },
        {
          t: 'texto',
          md: `ByteTrack e BoT-SORT vêm no Ultralytics: \`modelo.track(fonte, tracker="bytetrack.yaml")\`.

### Contar em vídeo

A forma robusta de contar **não** é somar IDs. É definir uma **linha** (ou uma região) e contar os rastros que a atravessam. Um ID a mais criado longe da linha não altera a contagem, e um objeto parado não é contado mil vezes.

### Métricas

| Métrica | Mede | Lê-se como |
|---|---|---|
| MOTA | erros de detecção e trocas de ID, somados | dominada pela qualidade do detector |
| IDF1 | por quanto tempo cada objeto manteve a identidade certa | qualidade da associação |
| HOTA | equilíbrio entre detectar e associar | a mais usada hoje para comparar rastreadores |

Para insetos, o rastreamento aparece em armadilhas com câmera contínua, em estudos de comportamento e em contagem de animais em esteira. Num cartão fotografado uma vez por semana, não há o que rastrear.`,
        },
        {
          t: 'quiz',
          pergunta: 'Um sistema conta insetos em vídeo somando os IDs únicos gerados pelo rastreador. O número fica sistematicamente alto. Por quê?',
          opcoes: [
            'Porque o detector tem recall baixo.',
            'Porque cada vez que um rastro se perde e o objeto reaparece, nasce um ID novo: um inseto pode gerar vários.',
            'Porque o filtro de Kalman superestima a velocidade.',
            'Porque o NMS está desligado.',
          ],
          correta: 1,
          explicacao: 'Fragmentação de rastros infla a contagem por IDs. A alternativa robusta é contar cruzamentos de uma linha, ou exigir que o rastro dure um mínimo de quadros.',
        },
        {
          t: 'quiz',
          pergunta: 'No ByteTrack, o que as detecções de baixa confiança podem e não podem fazer?',
          opcoes: [
            'Podem criar rastros novos, mas não manter os antigos.',
            'Podem manter vivos os rastros que já existem; não podem iniciar rastros novos.',
            'São descartadas antes da associação.',
            'Substituem as detecções de alta confiança quando há conflito.',
          ],
          correta: 1,
          explicacao: 'A detecção fraca perto de um rastro existente é provavelmente o objeto ocluído. Longe de qualquer rastro, é provavelmente ruído. Por isso só a detecção confiante inicia rastro.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'classificacao-fina',
      titulo: 'Classificação fina e o problema do desconhecido',
      minutos: 13,
      resumo: 'Separar espécies parecidas, e o que um classificador faz quando vê algo que nunca viu.',
      blocos: [
        {
          t: 'texto',
          md: `Distinguir "inseto" de "sujeira" é fácil. Distinguir duas espécies de cigarrinha que diferem por uma mancha na asa é **classificação fina**: a diferença entre classes é menor que a variação dentro de cada uma (pose, iluminação, desgaste).

### Dois estágios

O detector acha e recorta; um classificador dedicado decide a espécie. Vantagens sobre pedir tudo ao detector:

- o classificador vê o recorte **em resolução plena**, e não reduzido junto com a imagem inteira;
- pode ser retreinado sozinho, com dados de coleções e fotos de laboratório;
- pode usar um backbone grande, porque roda só nos recortes.

### Hierarquia

Espécies se organizam em árvore: ordem, família, gênero, espécie. Um erro entre duas espécies do mesmo gênero é menos grave que confundir uma mariposa com um besouro, e a perda e a métrica podem refletir isso. Na prática: quando o modelo não tem confiança na espécie, responder o gênero é melhor que errar a espécie.`,
        },
        {
          t: 'texto',
          md: `### O problema que mais derruba em produção: o desconhecido

Um classificador com saída softmax **sempre** distribui 100% entre as classes que conhece. Quando recebe algo que nunca viu, não tem como dizer "não sei": escolhe a classe mais parecida, muitas vezes com confiança alta.

O experimento abaixo treina um classificador só com **fundo** e **inseto**, e depois mostra a ele recortes de **sujeira**, que ele nunca viu.`,
        },
        {
          t: 'codigo',
          titulo: 'O que um classificador responde para o que nunca viu',
          rodar: 'python',
          requerPython: ['torch', 'cv2'],
          tempo: 240,
          codigo: `import numpy as np, torch, torch.nn as nn
import lab

disp = lab.dispositivo()
torch.manual_seed(0)

def tensor(X):
    return torch.from_numpy(X[..., ::-1].copy()).permute(0, 3, 1, 2).float().div(255).to(disp)

X, y = lab.recortes(40, semente=0)             # 0 = fundo, 1 = inseto, 2 = detrito
Xt, yt = lab.recortes(15, semente=99)

conhecidas = y < 2                              # o treino NÃO vê a classe 2
Xtr, ytr = tensor(X[conhecidas]), torch.from_numpy(y[conhecidas]).to(disp)

def bloco(e, s):
    return [nn.Conv2d(e, s, 3, padding=1), nn.GroupNorm(4, s), nn.ReLU(), nn.MaxPool2d(2)]
corpo = nn.Sequential(*bloco(3, 16), *bloco(16, 32), *bloco(32, 64), nn.AdaptiveAvgPool2d(1), nn.Flatten()).to(disp)
cabeca = nn.Linear(64, 2).to(disp)
opt = torch.optim.AdamW([*corpo.parameters(), *cabeca.parameters()], lr=2e-3, weight_decay=1e-4)
for _ in range(8):
    for i in torch.randperm(len(Xtr), device=disp).split(64):
        perda = nn.functional.cross_entropy(cabeca(corpo(Xtr[i])), ytr[i])
        opt.zero_grad(); perda.backward(); opt.step()

with torch.no_grad():
    vetores = corpo(tensor(Xt))                          # o "embedding": 64 números por recorte
    prob = cabeca(vetores).softmax(1).cpu().numpy()
    vet_treino = corpo(Xtr)
    centros = torch.stack([vet_treino[ytr == c].mean(0) for c in (0, 1)])
    # distância de cada recorte ao centro de classe mais próximo, no espaço dos vetores
    d_teste = torch.cdist(vetores, centros)
    dist, perto = d_teste.min(1).values.cpu().numpy(), d_teste.argmin(1).cpu().numpy()
    d_treino = torch.cdist(vet_treino, centros)
    # cada classe tem o seu espalhamento: o limite é por classe (99% do treino dela fica abaixo)
    limites = np.array([np.percentile(d_treino[ytr == c, c].cpu().numpy(), 99) for c in (0, 1)])

nomes = ["fundo", "inseto", "detrito (nunca visto)"]
linhas = []
for c in range(3):
    p = prob[yt == c]
    linhas.append([nomes[c], len(p), f"{(p.argmax(1) == 1).mean():.0%}", f"{p.max(1).mean():.2f}",
                   f"{(p.max(1) > 0.9).mean():.0%}", f"{dist[yt == c].mean():.2f}"])
lab.tabela(linhas, cabecalho=["o que foi mostrado", "recortes", "respondeu 'inseto'", "confiança média",
                              "com confiança > 0,9", "distância ao centro mais próximo"])

# um critério de rejeição: longe demais do centro da classe a que foi atribuído
rejeitado = dist > limites[perto]
print()
print(f"limite de distância: fundo {limites[0]:.2f}, inseto {limites[1]:.2f} (99% do treino de cada classe fica abaixo)")
for c in range(3):
    print(f"  {nomes[c]:24s} rejeitados como 'desconhecido': {rejeitado[yt == c].mean():.0%}")`,
        },
        {
          t: 'texto',
          md: `Leia a linha do detrito. O classificador nunca viu aquilo, e mesmo assim responde com confiança alta, repartindo a sujeira entre as duas classes que conhece. A confiança do softmax mede "qual das minhas classes se parece mais com isto", e não "eu conheço isto".

A última coluna aponta uma saída. No espaço dos vetores internos da rede (o *embedding*), a sujeira fica, em média, **mais longe** dos centros das classes conhecidas do que os exemplos legítimos. Rejeitar o que está longe demais é a forma mais simples de dar ao sistema a resposta "desconhecido".

Agora leia o fim da saída, que é a parte honesta do experimento: o critério rejeita só uns 4% da sujeira. A média é maior, mas as distribuições se sobrepõem, e o limite que preserva 99% dos exemplos legítimos deixa passar quase todo o resto. Esta rede é pequena e foi treinada para separar duas classes; o espaço interno dela só organiza o que essa tarefa exigia. Rejeição por distância depende de um espaço de características **bom**, e é por isso que ela anda junto com os backbones do próximo módulo.

### Formas de lidar com o desconhecido

| Abordagem | Como | Limite |
|---|---|---|
| Classe "outros" | treinar uma classe com tudo que não é alvo | só cobre os "outros" que você conseguiu coletar |
| Limiar na confiança | rejeitar abaixo de um valor | o experimento mostra que o desconhecido pode vir com confiança alta |
| Distância no embedding | rejeitar o que está longe das classes conhecidas | depende de um bom espaço de características |
| Busca por vizinhos | classificar pela semelhança com uma galeria de exemplos | permite incluir espécie nova **sem retreinar**: basta adicionar exemplos |

A última linha é a ponte para o próximo módulo. Com um backbone de fundação, treinado em centenas de milhões de imagens, o espaço de embeddings é bom o suficiente para classificar por vizinhos com poucos exemplos por classe.`,
        },
        {
          t: 'nota',
          estilo: 'campo',
          md: `**Espécie nova na armadilha é evento, não erro.** Num sistema de monitoramento, o inseto que não se parece com nada conhecido pode ser a informação mais importante da semana: uma praga chegando a uma região. Um modelo que força tudo para as classes existentes esconde isso. Vale ter uma fila de "não reconhecidos" revisada por uma pessoa.`,
        },
        {
          t: 'quiz',
          pergunta: 'Um classificador de três espécies recebe a foto de uma quarta, que não existia no treino, e responde "espécie B, 96%". O que isso mostra?',
          opcoes: [
            'Que a quarta espécie é uma variação da B.',
            'Que o softmax normaliza entre as classes conhecidas: confiança alta quer dizer "a mais parecida das três", e não "tenho certeza de que conheço isto".',
            'Que o modelo está sobreajustado.',
            'Que o limiar de confiança está baixo.',
          ],
          correta: 1,
          explicacao: 'A soma das probabilidades é sempre 1 entre as classes existentes. O modelo não tem a opção de abster-se, a menos que o sistema acrescente um mecanismo de rejeição.',
        },
        {
          t: 'quiz',
          pergunta: 'Qual é a vantagem de classificar por vizinhos mais próximos num espaço de embeddings, em vez de uma camada final treinada?',
          opcoes: [
            'É sempre mais preciso.',
            'Uma classe nova pode ser incluída adicionando exemplos à galeria, sem retreinar a rede; e a distância aos vizinhos serve de sinal de "desconhecido".',
            'Não precisa de GPU.',
            'Dispensa o detector.',
          ],
          correta: 1,
          explicacao: 'A rede vira um extrator fixo de características, e a decisão passa a depender só da galeria. Isso troca um pouco de precisão por muita flexibilidade, o que compensa quando as classes mudam com frequência.',
        },
      ],
    },
  ],
};
