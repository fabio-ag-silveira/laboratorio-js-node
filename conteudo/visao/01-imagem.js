export const modulo = {
  id: 'imagem',
  titulo: 'Imagem como dado',
  cor: '#5ec9a7',
  licoes: [
    // ------------------------------------------------------------------
    {
      id: 'pixels',
      titulo: 'Pixels, canais e a matriz por baixo',
      minutos: 12,
      resumo: 'Uma imagem é um array de números. Quase todo bug de pré-processamento vem de esquecer isso.',
      blocos: [
        {
          t: 'texto',
          md: `Para o computador não existe imagem, existe um **array de três dimensões**: altura × largura × canais. Cada posição guarda um inteiro de 0 a 255. Todo o resto da visão computacional é conta em cima desse array.

Use o inspetor abaixo. Passe o mouse sobre um inseto, depois troque para um canal isolado e leia os números da vizinhança.`,
        },
        { t: 'visual', componente: 'cv/pixels' },
        {
          t: 'texto',
          md: `### As três convenções que causam bug

**1. O índice é \`[linha, coluna]\`, ou seja, \`[y, x]\`.** Coordenada de caixa vem como (x, y); índice de array vem como (y, x). Trocar os dois em imagem quadrada não dá erro, dá resultado errado.

**2. No OpenCV os canais vêm em BGR.** PIL, matplotlib, PyTorch e praticamente todo modelo pré-treinado esperam RGB. Um modelo recebendo BGR não quebra: só piora, porque o que ele aprendeu como vermelho chega como azul.

**3. O tipo é \`uint8\`, e ele dá a volta.** 250 + 10 em \`uint8\` é 4, não 260. Somar brilho com \`+\` do NumPy produz manchas escuras onde a imagem era clara.`,
        },
        {
          t: 'codigo',
          titulo: 'Formato, índice e ordem dos canais',
          rodar: 'python',
          requerPython: ['cv2'],
          codigo: `import cv2
import numpy as np
import lab

img = lab.amostra("armadilha", semente=1)
print("shape (altura, largura, canais):", img.shape)
print("dtype:", img.dtype, "| bytes:", img.nbytes)

# índice é [y, x]; o resultado vem em B, G, R
y, x = 100, 200
b, g, r = img[y, x]
print(f"pixel em x={x}, y={y}: B={b} G={g} R={r}")

# fatiar é recortar: [y0:y1, x0:x1]. O recorte é uma VISÃO, não uma cópia.
recorte = img[200:320, 380:540]
print("recorte:", recorte.shape, "| compartilha memória:", np.shares_memory(img, recorte))

# separar canais, e o erro clássico de mostrar BGR como se fosse RGB
azul, verde, vermelho = cv2.split(img)
trocado = img[:, :, ::-1]   # inverte a ordem dos canais

lab.mostrar(img, trocado, recorte,
            titulos=["certo", "BGR lido como RGB", "recorte [200:320, 380:540]"])
lab.mostrar(azul, verde, vermelho, titulos=["canal B", "canal G", "canal R"])`,
        },
        {
          t: 'nota',
          estilo: 'pegadinha',
          md: `No canal **B**, o cartão amarelo aparece quase preto, e nos canais **G** e **R** aparece claro. Amarelo é vermelho mais verde, sem azul. Isso tem consequência prática: inseto escuro sobre cartão amarelo tem **muito mais contraste no canal B invertido ou no cinza** do que parece. Escolher o canal certo às vezes resolve o que três filtros não resolvem.`,
        },
        {
          t: 'codigo',
          titulo: 'O estouro do uint8',
          rodar: 'python',
          requerPython: ['cv2'],
          codigo: `import cv2
import numpy as np
import lab

a = np.full((1, 1), 250, dtype=np.uint8)
dez = np.full((1, 1), 10, dtype=np.uint8)
print("numpy:  250 + 10 =", (a + dez)[0, 0], "  <- deu a volta")
print("opencv: 250 + 10 =", cv2.add(a, dez)[0, 0], "<- satura em 255")

img = lab.amostra("armadilha", semente=2)

errado = img + 60                      # estoura onde a imagem é clara
certo = cv2.add(img, (60, 60, 60, 0))  # satura

# o jeito mais seguro: ir para float, fazer a conta, limitar e voltar
seguro = np.clip(img.astype(np.float32) * 1.3 + 20, 0, 255).astype(np.uint8)

lab.mostrar(errado, certo, seguro,
            titulos=["img + 60 (estourou)", "cv2.add (satura)", "float + clip"])`,
        },
        {
          t: 'texto',
          md: `### Do array para o modelo

O caminho de uma imagem até a rede tem sempre os mesmos passos, e cada um é um lugar para errar:

| Passo | De | Para |
|---|---|---|
| Ordem dos canais | BGR (OpenCV) | RGB |
| Tipo e escala | \`uint8\`, 0 a 255 | \`float32\`, 0 a 1 |
| Normalização | 0 a 1 | subtrai média, divide por desvio (se o modelo pedir) |
| Disposição | altura, largura, canais (HWC) | canais, altura, largura (CHW) |
| Lote | uma imagem | \`[N, C, H, W]\` |

Quando o modelo vai bem na validação e mal na aplicação, a causa mais comum é um desses passos feito diferente entre o treino e a inferência. Vamos voltar a isso no módulo de produção, mas a regra já vale: **o pré-processamento faz parte do modelo**.`,
        },
        {
          t: 'quiz',
          pergunta: 'Você carrega uma imagem com `cv2.imread` e passa direto para um modelo treinado com imagens lidas pela PIL. O que acontece?',
          opcoes: [
            'Dá erro de formato, porque os canais não batem.',
            'Funciona igual: a rede aprende padrões, não cores.',
            'Roda sem erro, mas a precisão cai, porque vermelho e azul chegam trocados.',
            'A imagem aparece espelhada na horizontal.',
          ],
          correta: 2,
          explicacao: 'BGR e RGB têm o mesmo formato de array, então nada quebra. O que quebra é o significado: os filtros da primeira camada aprenderam a responder a vermelho no canal 0 e agora recebem azul. É um erro silencioso, e por isso tão comum.',
        },
        {
          t: 'quiz',
          pergunta: 'Uma caixa de detecção diz `x=200, y=100, w=40, h=30`. Qual fatia recorta essa região de `img`?',
          opcoes: ['`img[200:240, 100:130]`', '`img[100:130, 200:240]`', '`img[100:140, 200:230]`', '`img[200:230, 100:140]`'],
          correta: 1,
          explicacao: 'O índice é `[linha, coluna]`, ou seja, `[y0:y1, x0:x1]`. As linhas vão de y=100 a 130 (altura 30) e as colunas de x=200 a 240 (largura 40).',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'cores',
      titulo: 'Espaços de cor',
      minutos: 11,
      resumo: 'RGB mistura cor com iluminação. HSV e LAB separam as duas coisas.',
      blocos: [
        {
          t: 'texto',
          md: `Em RGB, "amarelo claro" e "amarelo na sombra" são três números bem diferentes, embora sejam a mesma cor com outra luz. Isso atrapalha qualquer regra do tipo "selecione o que é amarelo".

Os espaços alternativos reorganizam os mesmos três números para separar **o que é a cor** de **quanta luz há**:

- **HSV**: matiz (qual cor, um ângulo de 0° a 360°), saturação (quão viva) e valor (quão clara). Barato de calcular e fácil de pensar.
- **LAB**: luminosidade L, e dois eixos de cor (a: verde-vermelho, b: azul-amarelo). A distância entre dois pontos aproxima a diferença que o olho percebe.
- **YCrCb / YUV**: luminância e duas crominâncias. É o que JPEG e vídeo usam por dentro.

Experimente: isole o cartão amarelo, depois isole o que é escuro.`,
        },
        { t: 'visual', componente: 'cv/cores' },
        {
          t: 'nota',
          estilo: 'atencao',
          md: `Quando você isola "o que é escuro", o matiz e a saturação ficam soltos e só o brilho manda. É o correto: **pixel escuro não tem cor confiável**. Com pouca luz, o matiz é ruído. Por isso uma regra de cor quase sempre precisa de um piso de saturação e de brilho junto.`,
        },
        {
          t: 'codigo',
          titulo: 'Separar o fundo do cartão com inRange',
          rodar: 'python',
          requerPython: ['cv2'],
          codigo: `import cv2
import numpy as np
import lab

img = lab.amostra("armadilha", semente=3)
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

# No OpenCV (8 bits): H vai de 0 a 179 (graus / 2), S e V de 0 a 255
h, s, v = cv2.split(hsv)
print("faixa de H:", h.min(), "a", h.max(), "| mediana de H:", int(np.median(h)))

# amarelo fica em torno de 30 (60 graus / 2)
fundo = cv2.inRange(hsv, (18, 90, 90), (36, 255, 255))
objetos = cv2.bitwise_not(fundo)

print(f"fundo: {100 * fundo.mean() / 255:.1f}% da imagem")
lab.mostrar(img, fundo, cv2.bitwise_and(img, img, mask=objetos),
            titulos=["original", "máscara do amarelo", "o que não é fundo"])`,
        },
        {
          t: 'nota',
          estilo: 'pegadinha',
          md: `O matiz é um **círculo**: o vermelho fica dos dois lados, perto de 0° e perto de 360°. Para selecionar vermelho são necessárias duas faixas unidas com \`cv2.bitwise_or\`. E no OpenCV de 8 bits o matiz vai de 0 a **179**, não a 360. Copiar valores de um seletor de cores sem dividir por 2 é o erro mais comum com \`inRange\`.`,
        },
        {
          t: 'codigo',
          titulo: 'O que muda e o que fica quando a luz varia',
          rodar: 'python',
          requerPython: ['cv2'],
          codigo: `import cv2
import numpy as np
import lab

img = lab.amostra("armadilha", semente=4)

# simula iluminação desigual: um lado com menos da metade da luz do outro
rampa = np.linspace(0.45, 1.0, img.shape[1], dtype=np.float32)[None, :, None]
torta = np.clip(img.astype(np.float32) * rampa, 0, 255).astype(np.uint8)

H, S, V = cv2.split(cv2.cvtColor(torta, cv2.COLOR_BGR2HSV))
L, a, b = cv2.split(cv2.cvtColor(torta, cv2.COLOR_BGR2LAB))

esq, dir_ = slice(0, 200), slice(-200, None)
def comparar(nome, canal):
    e, d = float(np.median(canal[:, esq])), float(np.median(canal[:, dir_]))
    return [nome, f"{e:.0f}", f"{d:.0f}", f"{abs(d - e) / max(d, e):.0%}"]

lab.tabela([
    comparar("R (vermelho)", torta[:, :, 2]),
    comparar("V do HSV (brilho)", V),
    comparar("L do LAB (luz)", L),
    comparar("b do LAB (azul-amarelo)", b),
    comparar("S do HSV (saturação)", S),
    comparar("H do HSV (matiz)", H),
], cabecalho=["canal", "lado escuro", "lado claro", "variação"])

lab.mostrar(torta, V, H, titulos=["iluminação desigual", "V (brilho)", "H (matiz)"])`,
        },
        {
          t: 'texto',
          md: `Leia a coluna de variação. Com menos da metade da luz de um lado, **R, V e L mudam muito**, e o **matiz (H) quase não muda**: multiplicar os três canais pelo mesmo fator altera o brilho e mantém a proporção entre eles, que é o que define a cor. A saturação também se mantém.

O canal **b** do LAB fica no meio do caminho: varia menos que L, mas varia, porque no LAB a intensidade da cor cresce junto com a luminosidade. O que o LAB oferece é outra coisa: a distância entre dois pontos acompanha a diferença que o olho percebe, o que serve para comparar cores e para equalizar só a luz (aplicando o ajuste no canal L).

Na prática: regra de seleção por cor se escreve em cima do **matiz**, com piso de saturação.

### Onde isso entra num pipeline com rede neural

Detector moderno recebe RGB e aprende sozinho as combinações que importam, então ninguém converte para HSV antes de treinar. Os espaços de cor continuam úteis em três lugares:

- **Aumentação.** A aumentação "HSV" do YOLO sorteia variações de matiz, saturação e brilho. Entender o espaço é entender o que os hiperparâmetros \`hsv_h\`, \`hsv_s\` e \`hsv_v\` fazem. Matiz demais transforma cartão amarelo em verde, coisa que nunca acontece em campo.
- **Controle de qualidade da captura.** Checar se o cartão está na faixa de cor esperada pega foto de coisa errada, balanço de branco absurdo e lente suja antes de gastar inferência.
- **Pré-anotação.** Segmentar o fundo por cor dá candidatos a objeto para acelerar a anotação inicial.`,
        },
        {
          t: 'quiz',
          pergunta: 'Você quer uma regra que selecione o cartão amarelo e continue funcionando em fotos mais claras e mais escuras. Qual é a base mais estável?',
          opcoes: [
            'Faixas fixas de R, G e B.',
            'Faixa de matiz (H) com um piso de saturação, deixando o brilho livre dentro de limites largos.',
            'Só o canal de brilho (V).',
            'A média dos três canais.',
          ],
          correta: 1,
          explicacao: 'O matiz identifica a cor independentemente da quantidade de luz. O piso de saturação descarta cinzas e pretos, onde o matiz é ruído. Faixas fixas em RGB quebram assim que a exposição muda.',
        },
        {
          t: 'quiz',
          pergunta: 'Ao treinar um detector de insetos em cartão amarelo, você aumenta muito o `hsv_h` (variação de matiz) da aumentação. Qual é o risco?',
          opcoes: [
            'Nenhum: mais aumentação sempre ajuda a generalizar.',
            'O treino fica mais lento, mas o resultado é o mesmo.',
            'O modelo passa a ver cartões verdes, azuis e roxos que não existem em campo, gastando capacidade em variação irreal.',
            'As caixas de anotação deixam de corresponder aos objetos.',
          ],
          correta: 2,
          explicacao: 'Aumentação serve para cobrir variação que existe de verdade. Girar muito o matiz cria imagens fora da distribuição real. Aumentação de cor não mexe em geometria, então as caixas continuam certas.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'histograma',
      titulo: 'Histograma, exposição e captura',
      minutos: 11,
      resumo: 'O histograma mostra em um gráfico se a foto serve. E o que se perde na captura não volta.',
      blocos: [
        {
          t: 'texto',
          md: `O histograma conta quantos pixels existem em cada tom, do preto (0) ao branco (255). É o diagnóstico mais rápido que há: dá para ver subexposição, estouro e falta de contraste sem olhar a imagem.

Clique nos cenários de captura e observe o gráfico. Depois tente consertar cada um com os controles.`,
        },
        { t: 'visual', componente: 'cv/histograma' },
        {
          t: 'texto',
          md: `### O que dá e o que não dá para consertar depois

- **Sem contraste** (histograma espremido no meio): dá para esticar. A informação está lá, só comprimida.
- **Subexposta ou superexposta sem corte**: dá para deslocar. O ruído aumenta junto, mas o detalhe existe.
- **Estourada ou afundada** (barra vermelha na ponta): **não tem conserto**. Vários tons diferentes viraram o mesmo 255 ou o mesmo 0, e nenhuma conta separa o que foi fundido.

Daí vem a regra que mais economiza trabalho num projeto de visão: **qualidade se garante na captura, não no pós-processamento**.`,
        },
        {
          t: 'codigo',
          titulo: 'Equalização global e CLAHE',
          rodar: 'python',
          requerPython: ['cv2', 'matplotlib'],
          codigo: `import cv2
import numpy as np
import matplotlib.pyplot as plt
import lab

img = lab.amostra("armadilha", semente=5)
cinza = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

# simula captura ruim: pouco contraste e iluminação desigual
rampa = np.linspace(0.55, 1.0, cinza.shape[1], dtype=np.float32)[None, :]
ruim = np.clip((cinza.astype(np.float32) - 128) * 0.45 + 120, 0, 255) * rampa
ruim = ruim.astype(np.uint8)

global_ = cv2.equalizeHist(ruim)
clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8)).apply(ruim)

lab.mostrar(ruim, global_, clahe, titulos=["captura ruim", "equalização global", "CLAHE"])

fig, eixos = plt.subplots(1, 3, figsize=(11, 2.6), sharey=True)
for eixo, dados, nome in zip(eixos, [ruim, global_, clahe], ["ruim", "global", "CLAHE"]):
    eixo.hist(dados.ravel(), bins=64, range=(0, 255), color="#4a90d9")
    eixo.set_title(nome)
    eixo.set_xlim(0, 255)
lab.mostrar(fig, titulo="histogramas")`,
        },
        {
          t: 'texto',
          md: `A **equalização global** usa uma única curva para a imagem toda: espalha os tons, mas amplifica o ruído das áreas lisas e não resolve iluminação desigual. O **CLAHE** divide a imagem em blocos, equaliza cada um e limita o ganho (\`clipLimit\`) para não transformar ruído em textura. É o que se usa na prática, normalmente aplicado no canal L do LAB para não distorcer cor.

Vale saber que CLAHE como pré-processamento fixo para rede neural raramente compensa. Se entrar no treino, tem que entrar igual na inferência, e a rede costuma aprender a lidar com contraste por conta própria quando a aumentação cobre a variação. Onde ele ajuda sem discussão é na **anotação**: anotador enxerga melhor, anota melhor.`,
        },
        {
          t: 'nota',
          estilo: 'campo',
          md: `**Um portão de qualidade antes da inferência.** Três checagens baratas pegam a maior parte das fotos inúteis enviadas pelo aplicativo: fração de pixels estourados ou afundados (histograma), nitidez (variância do laplaciano, que aparece no próximo módulo) e cor média do cartão dentro da faixa esperada. Recusar a foto na hora, com o motivo, e pedir outra custa muito menos que descobrir no fim do mês que um lote de imagens não serviu.`,
        },
        {
          t: 'codigo',
          titulo: 'Um portão de qualidade de captura',
          rodar: 'python',
          requerPython: ['cv2'],
          codigo: `import cv2
import numpy as np
import lab

def avaliar_captura(img, max_cortado=0.02, min_nitidez=15.0):
    """Devolve (aprovada, motivos, medidas)."""
    cinza = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # Estouro se mede POR CANAL. Num cartão amarelo, R e G batem em 255 muito
    # antes do B, e a média em cinza continua parecendo normal.
    estourado = float((img.max(axis=2) >= 250).mean())
    afundado = float((img.max(axis=2) <= 5).mean())
    # variância do laplaciano: imagem borrada tem pouca variação de 2ª derivada
    nitidez = float(cv2.Laplacian(cinza, cv2.CV_64F).var())

    motivos = []
    if estourado > max_cortado:
        motivos.append(f"{estourado:.0%} da imagem estourada: reduza a luz")
    if afundado > max_cortado:
        motivos.append(f"{afundado:.0%} da imagem sem luz: ilumine melhor")
    if nitidez < min_nitidez:
        motivos.append("imagem borrada: firme o celular e refaça o foco")
    return not motivos, motivos, dict(estourado=estourado, afundado=afundado, nitidez=nitidez)

boa = lab.amostra("armadilha", semente=6)
borrada = cv2.GaussianBlur(boa, (0, 0), 3.5)
estourada = np.clip(boa.astype(np.float32) * 1.6 + 70, 0, 255).astype(np.uint8)

for nome, img in [("boa", boa), ("borrada", borrada), ("estourada", estourada)]:
    ok, motivos, m = avaliar_captura(img)
    print(f"{nome:10s} {'APROVADA ' if ok else 'RECUSADA '} nitidez={m['nitidez']:7.1f} estourado={m['estourado']:.1%}")
    for motivo in motivos:
        print("            ->", motivo)

lab.mostrar(boa, borrada, estourada, titulos=["boa", "borrada", "estourada"])`,
        },
        {
          t: 'nota',
          estilo: 'pegadinha',
          md: `Dois detalhes desse código que costumam passar despercebidos. **O estouro é medido por canal**, não em cinza: num cartão amarelo os canais R e G saturam bem antes do B, e a conversão para cinza faz a média parecer saudável. E **o limiar de nitidez não é universal**: a variância do laplaciano depende do conteúdo da cena, da resolução e do ruído do sensor. O valor certo sai de medir um conjunto de fotos boas e ruins da sua própria captura.`,
        },
        {
          t: 'quiz',
          pergunta: 'O histograma de uma foto tem uma barra alta colada no 255 e quase nada entre 200 e 254. O que isso indica e o que fazer?',
          opcoes: [
            'Pouco contraste: aplicar equalização resolve.',
            'Superexposição com perda de informação: só refazendo a captura com menos luz ou menor exposição.',
            'Ruído de sensor: aplicar um desfoque gaussiano.',
            'Imagem normal: o fundo claro sempre gera esse pico.',
          ],
          correta: 1,
          explicacao: 'O pico colado no extremo é corte: tons diferentes foram todos gravados como 255. Equalizar espalha os valores que existem, mas não recria os que foram fundidos. O conserto é na captura.',
        },
        {
          t: 'quiz',
          pergunta: 'Qual é a diferença essencial entre equalização global e CLAHE?',
          opcoes: [
            'CLAHE trabalha em cores; a global só em cinza.',
            'CLAHE equaliza por blocos e limita o ganho, lidando com iluminação desigual sem explodir o ruído.',
            'A global é mais lenta por percorrer a imagem inteira.',
            'CLAHE precisa de treino; a global não.',
          ],
          correta: 1,
          explicacao: 'A global aplica uma curva única. O CLAHE é adaptativo (por região) e tem limite de contraste, o que evita amplificar ruído em áreas lisas.',
        },
      ],
    },
  ],
};
