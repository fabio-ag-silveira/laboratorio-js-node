export const modulo = {
  id: 'classico',
  titulo: 'Processamento clássico',
  cor: '#6aa9f0',
  licoes: [
    // ------------------------------------------------------------------
    {
      id: 'convolucao',
      titulo: 'Convolução e filtros',
      minutos: 13,
      resumo: 'Uma janela de números deslizando sobre a imagem. É a operação que as CNNs herdaram.',
      blocos: [
        {
          t: 'texto',
          md: `Quase todo filtro de imagem é a mesma operação: uma pequena matriz de pesos (o **kernel**) desliza sobre a imagem e, em cada posição, o pixel de saída é a soma dos vizinhos multiplicados pelos pesos.

Mudam só os nove números. Troque o kernel abaixo e passe o mouse sobre a imagem para ver a conta de um pixel.`,
        },
        { t: 'visual', componente: 'cv/convolucao' },
        {
          t: 'texto',
          md: `### Como ler um kernel

Duas perguntas resolvem a maioria dos casos:

- **Quanto somam os pesos?** Soma 1 preserva o brilho médio (desfoque, nitidez). Soma 0 zera regiões lisas e só responde onde há mudança (derivadas: Sobel, laplaciano).
- **Os pesos são todos positivos?** Então é uma média ponderada, isto é, um desfoque. Se há positivos e negativos, o kernel mede diferença, isto é, realça borda ou detalhe.

O **Sobel X** tem negativos à esquerda e positivos à direita: mede quanto a imagem muda ao andar na horizontal, e por isso acende em bordas verticais. O **laplaciano** compara o centro com os quatro vizinhos: acende em qualquer mudança brusca, em qualquer direção.`,
        },
        {
          t: 'codigo',
          titulo: 'Três jeitos de tirar ruído, e o que cada um destrói',
          rodar: 'python',
          requerPython: ['cv2'],
          codigo: `import cv2
import numpy as np
import lab

img = lab.amostra("armadilha", semente=7)
rng = np.random.default_rng(0)

# ruído "sal e pimenta": pixels mortos e saturados, típico de sensor ruim
sujo = img.copy()
sorteio = rng.random(img.shape[:2])
sujo[sorteio < 0.02] = 0
sujo[sorteio > 0.98] = 255

gauss = cv2.GaussianBlur(sujo, (5, 5), 0)
mediana = cv2.medianBlur(sujo, 5)
bilateral = cv2.bilateralFilter(sujo, 9, 60, 60)

def erro(a):
    return float(np.abs(a.astype(np.float32) - img.astype(np.float32)).mean())

lab.tabela([
    ["com ruído", f"{erro(sujo):.2f}"],
    ["gaussiano 5x5", f"{erro(gauss):.2f}"],
    ["mediana 5x5", f"{erro(mediana):.2f}"],
    ["bilateral", f"{erro(bilateral):.2f}"],
], cabecalho=["filtro", "erro médio vs. original"])

zoom = (slice(120, 300), slice(200, 440))
lab.mostrar(sujo[zoom], gauss[zoom], mediana[zoom], bilateral[zoom],
            titulos=["com ruído", "gaussiano", "mediana", "bilateral"])`,
        },
        {
          t: 'texto',
          md: `Leia a tabela antes das imagens: **só a mediana reduziu o erro**. Os outros dois deixaram a imagem mais longe da original do que ela estava com o ruído.

- O **gaussiano** é uma média. Ele não remove o pixel defeituoso, dilui o valor dele nos vizinhos, e ainda borra as bordas de tudo.
- A **mediana** não é convolução: ordena os vizinhos e fica com o do meio. Um pixel 255 isolado nunca é o valor do meio, então desaparece.
- O **bilateral** é uma média que dá pouco peso a vizinhos de cor muito diferente, para preservar bordas. Um pixel de ruído extremo é, para ele, uma borda a preservar. É ótimo contra granulado suave e a ferramenta errada para este caso.

A lição geral: **o filtro certo depende do tipo de ruído**, e se escolhe medindo, não pela fama. E todos apagam objetos pequenos: um inseto de 7 pixels some com uma mediana 7×7.`,
        },
        {
          t: 'nota',
          estilo: 'dica',
          md: `**A ponte para as redes convolucionais.** Uma camada convolucional é exatamente esta operação, com duas diferenças: os números do kernel são **aprendidos** por gradiente em vez de escolhidos, e há dezenas de kernels em paralelo, cada um gerando um mapa. As primeiras camadas de uma CNN treinada aprendem sozinhas filtros muito parecidos com Sobel e gaussiano. Isso reaparece no módulo de deep learning.`,
        },
        {
          t: 'quiz',
          pergunta: 'Um kernel 3×3 tem todos os pesos positivos e soma 1. O que ele faz?',
          opcoes: ['Detecta bordas.', 'Calcula uma média ponderada: é um desfoque que preserva o brilho.', 'Aumenta a nitidez.', 'Inverte a imagem.'],
          correta: 1,
          explicacao: 'Pesos todos positivos fazem uma média dos vizinhos. Soma 1 mantém o brilho médio. Para detectar borda é preciso ter pesos positivos e negativos, com soma zero.',
        },
        {
          t: 'quiz',
          pergunta: 'A imagem tem pixels mortos isolados (sal e pimenta). Qual filtro é o mais indicado?',
          opcoes: ['Gaussiano, por ser o mais suave.', 'Mediana, que descarta valores extremos isolados.', 'Laplaciano, que realça os pontos.', 'Sobel, que encontra a borda dos pontos.'],
          correta: 1,
          explicacao: 'A mediana ignora valores extremos: um pixel 255 cercado de valores normais nunca é o valor do meio. O gaussiano só dilui o ponto nos vizinhos.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'limiar-morfologia',
      titulo: 'Limiar e morfologia',
      minutos: 12,
      resumo: 'Transformar a imagem em "objeto ou fundo" e depois consertar a máscara.',
      blocos: [
        {
          t: 'texto',
          md: `**Limiarizar** é a forma mais simples de segmentação: escolhe-se um valor de corte, e cada pixel vira objeto ou fundo. O difícil é escolher o corte, e há três estratégias:

| Estratégia | Como escolhe | Quando serve |
|---|---|---|
| Manual | você fixa o número | iluminação controlada e constante |
| Otsu | acha o corte que melhor separa o histograma em dois grupos | histograma com dois picos claros |
| Adaptativo | compara cada pixel com a média da vizinhança | iluminação desigual |

O resultado nunca sai limpo: ficam pontos de ruído e buracos. A **morfologia** conserta a máscara com duas operações básicas e suas combinações:

- **Erosão**: o objeto encolhe. Pontos pequenos desaparecem.
- **Dilatação**: o objeto cresce. Buracos pequenos fecham.
- **Abertura** (erosão, depois dilatação): remove ruído sem encolher o que sobra.
- **Fechamento** (dilatação, depois erosão): tapa buracos sem engordar o objeto.

As mesmas operações existem em tons de cinza, e delas saem duas ferramentas para **tirar o fundo** antes de limiarizar: o **top-hat** (imagem menos a abertura) isola o que é claro e pequeno, e o **black-hat** (fechamento menos a imagem) isola o que é escuro e pequeno.`,
        },
        {
          t: 'codigo',
          titulo: 'Manual, Otsu e adaptativo sob iluminação desigual',
          rodar: 'python',
          requerPython: ['cv2'],
          codigo: `import cv2
import numpy as np
import lab

img = lab.amostra("armadilha", semente=8)
cinza = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

# sombra forte num dos lados
rampa = np.linspace(0.35, 1.1, cinza.shape[1], dtype=np.float32)[None, :]
sombra = np.clip(cinza * rampa, 0, 255).astype(np.uint8)

# THRESH_BINARY_INV: queremos o que é ESCURO como objeto (branco na máscara)
_, manual = cv2.threshold(sombra, 90, 255, cv2.THRESH_BINARY_INV)
corte, otsu = cv2.threshold(sombra, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
adaptativo = cv2.adaptiveThreshold(sombra, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                   cv2.THRESH_BINARY_INV, 41, 12)

print("corte escolhido pelo Otsu:", int(corte))
lab.mostrar(sombra, manual, otsu, adaptativo,
            titulos=["com sombra", "manual (90)", f"Otsu ({int(corte)})", "adaptativo"])`,
        },
        {
          t: 'texto',
          md: `Com sombra, os métodos de corte único marcam o lado escuro inteiro como objeto, porque ali o próprio fundo fica abaixo do limiar. O adaptativo acerta os dois lados, já que só pergunta "este pixel é mais escuro que os vizinhos?".

### A outra falha do Otsu: objeto raro

O Otsu procura o corte que melhor divide o histograma em **dois grupos**. Ele não sabe o que é objeto. Numa armadilha com poucos insetos, eles somam 1% dos pixels, e os dois grupos mais nítidos do histograma passam a ser a parte clara e a parte escura do **próprio cartão**. O corte cai no meio do fundo.`,
        },
        {
          t: 'codigo',
          titulo: 'Otsu direto contra Otsu depois de tirar o fundo',
          rodar: 'python',
          requerPython: ['cv2'],
          codigo: `import cv2
import numpy as np
import lab

# poucos insetos: o objeto é uma fração minúscula da imagem
img, gabarito, _ = lab.amostra_com_gabarito("armadilha", semente=2, insetos=20, detritos=0, aglomerado=0.0)
cinza = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

corte1, direto = cv2.threshold(cinza, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

# black-hat: fechamento - imagem. O pincel precisa ser MAIOR que o maior inseto.
pincel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (45, 45))
sem_fundo = cv2.morphologyEx(cinza, cv2.MORPH_BLACKHAT, pincel)
corte2, limpo = cv2.threshold(sem_fundo, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

print(f"Otsu direto:      corte {corte1:.0f}, {direto.mean() / 255:.1%} da imagem marcada como objeto")
print(f"black-hat + Otsu: corte {corte2:.0f}, {limpo.mean() / 255:.1%} da imagem marcada como objeto")
print(f"as caixas dos insetos de verdade somam {sum(c['w'] * c['h'] for c in gabarito) / cinza.size:.1%}")

lab.mostrar(img, direto, sem_fundo, limpo,
            titulos=["original", "Otsu direto", "black-hat (fundo zerado)", "black-hat + Otsu"])`,
        },
        {
          t: 'texto',
          md: `Depois do black-hat o fundo vale zero em toda a imagem, com luz desigual ou não, e o histograma volta a ter dois grupos de verdade: nada e inseto. A ordem que funciona é **normalizar o fundo primeiro, limiarizar depois**. O limiar adaptativo da tabela é a mesma ideia com a média local no lugar do fechamento.`,
        },
        {
          t: 'codigo',
          titulo: 'As quatro operações morfológicas',
          rodar: 'python',
          requerPython: ['cv2'],
          codigo: `import cv2
import numpy as np
import lab

img = lab.amostra("armadilha", semente=9)
cinza = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
sem_fundo = cv2.morphologyEx(cinza, cv2.MORPH_BLACKHAT,
                             cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (45, 45)))
_, mascara = cv2.threshold(sem_fundo, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

# elemento estruturante: a "forma do pincel" da operação
pincel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))

erodida = cv2.erode(mascara, pincel)
dilatada = cv2.dilate(mascara, pincel)
aberta = cv2.morphologyEx(mascara, cv2.MORPH_OPEN, pincel)
fechada = cv2.morphologyEx(mascara, cv2.MORPH_CLOSE, pincel)

def ilhas(m):
    return cv2.connectedComponents(m)[0] - 1   # o rótulo 0 é o fundo

lab.tabela([
    ["original", ilhas(mascara)], ["erosão", ilhas(erodida)], ["dilatação", ilhas(dilatada)],
    ["abertura", ilhas(aberta)], ["fechamento", ilhas(fechada)],
], cabecalho=["máscara", "ilhas"])

zoom = (slice(100, 320), slice(180, 480))
lab.mostrar(mascara[zoom], erodida[zoom], dilatada[zoom], aberta[zoom], fechada[zoom],
            titulos=["original", "erosão", "dilatação", "abertura", "fechamento"])`,
        },
        {
          t: 'nota',
          estilo: 'atencao',
          md: `O número de ilhas muda a cada operação. Isso quer dizer que **a contagem depende do tamanho do pincel**, um parâmetro que você escolhe olhando meia dúzia de imagens. Erosão separa insetos encostados, mas apaga os pequenos. Dilatação recupera os pequenos, mas funde vizinhos. Não existe valor que acerte os dois ao mesmo tempo, e esse é o limite do método que a próxima lição mede.`,
        },
        {
          t: 'quiz',
          pergunta: 'A máscara tem os objetos certos, mas está cheia de pontinhos brancos de ruído no fundo. Qual operação resolve sem encolher os objetos?',
          opcoes: ['Dilatação', 'Fechamento', 'Abertura', 'Limiar adaptativo'],
          correta: 2,
          explicacao: 'A abertura é erosão seguida de dilatação: a erosão elimina os pontos menores que o elemento estruturante e a dilatação devolve o tamanho ao que sobreviveu.',
        },
        {
          t: 'quiz',
          pergunta: 'Por que o método de Otsu falha numa imagem com sombra forte de um lado?',
          opcoes: [
            'Porque só funciona em imagens coloridas.',
            'Porque escolhe um único corte para a imagem toda, e o fundo na sombra fica mais escuro que o objeto na luz.',
            'Porque exige que se informe o número de objetos.',
            'Porque é lento demais em imagens grandes.',
          ],
          correta: 1,
          explicacao: 'Otsu pressupõe um histograma com dois grupos separáveis por um valor global. Com iluminação desigual, fundo e objeto se sobrepõem em intensidade, e nenhum corte único funciona.',
        },
        {
          t: 'quiz',
          pergunta: 'Insetos escuros e pequenos num cartão claro com iluminação desigual. Qual operação zera o fundo e mantém os insetos?',
          opcoes: [
            'Top-hat (imagem menos a abertura).',
            'Black-hat (fechamento menos a imagem), com elemento estruturante maior que o maior inseto.',
            'Erosão com elemento estruturante pequeno.',
            'Equalização de histograma.',
          ],
          correta: 1,
          explicacao: 'O fechamento em tons de cinza apaga o que é escuro e menor que o elemento estruturante, deixando uma estimativa do fundo. Subtrair a imagem dessa estimativa deixa só os objetos escuros pequenos. O top-hat faz o mesmo para objetos claros.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'bordas-contornos',
      titulo: 'Bordas e contornos',
      minutos: 12,
      resumo: 'Do gradiente ao Canny, e do contorno às medidas de forma.',
      blocos: [
        {
          t: 'texto',
          md: `Borda é onde a intensidade muda depressa, ou seja, onde a **derivada** é grande. O detector de Canny, de 1986 e ainda o padrão, organiza isso em quatro etapas. Veja o resultado de cada uma e mexa nos parâmetros.`,
        },
        { t: 'visual', componente: 'cv/bordas' },
        {
          t: 'texto',
          md: `### Os três parâmetros

- **Sigma** controla a escala. Pequeno: pega detalhe fino e ruído. Grande: só as bordas principais, e insetos pequenos somem.
- **Limiar alto** decide o que é borda com certeza.
- **Limiar baixo** decide até onde uma borda certa pode se estender. A proporção usual entre alto e baixo fica entre 2:1 e 3:1.

A histerese com dois limiares é a ideia que faz o Canny funcionar: uma borda fraca só é aceita se estiver conectada a uma forte. Isso dá contornos contínuos em vez de tracejados. A mesma ideia, dois limiares em que o baixo depende do alto, reaparece em rastreamento de objetos (ByteTrack).`,
        },
        {
          t: 'codigo',
          titulo: 'Do contorno às medidas de forma',
          rodar: 'python',
          requerPython: ['cv2'],
          codigo: `import cv2
import numpy as np
import lab

img, gabarito, _ = lab.amostra_com_gabarito("armadilha", semente=10, insetos=18, detritos=6, aglomerado=0.0)
cinza = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
# tirar o fundo, limiarizar, limpar (lição anterior)
sem_fundo = cv2.morphologyEx(cinza, cv2.MORPH_BLACKHAT,
                             cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (45, 45)))
_, mascara = cv2.threshold(sem_fundo, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
mascara = cv2.morphologyEx(mascara, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))

# RETR_EXTERNAL: só o contorno de fora de cada objeto
contornos, _ = cv2.findContours(mascara, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

linhas = []
saida = img.copy()
for c in contornos:
    area = cv2.contourArea(c)
    if area < 12:
        continue
    perimetro = cv2.arcLength(c, True)
    # circularidade: 1.0 para um círculo perfeito, perto de 0 para um fio
    circularidade = 4 * np.pi * area / (perimetro ** 2 + 1e-6)
    (cx, cy), (w, h), _ang = cv2.minAreaRect(c)
    alongamento = max(w, h) / (min(w, h) + 1e-6)
    linhas.append([f"{area:.0f}", f"{circularidade:.2f}", f"{alongamento:.1f}"])

    # regra de forma: fio comprido não é inseto
    suspeito = alongamento > 5 or circularidade < 0.25
    cor = (60, 76, 231) if suspeito else (113, 204, 46)
    cv2.drawContours(saida, [c], -1, cor, 2)

lab.tabela(sorted(linhas, key=lambda l: -float(l[0]))[:10],
           cabecalho=["área", "circularidade", "alongamento"])
print(f"contornos: {len(linhas)} | insetos no gabarito: {len(gabarito)}")
lab.mostrar(saida, titulo="verde = forma de inseto, vermelho = forma suspeita (fio, fragmento)")`,
        },
        {
          t: 'texto',
          md: `Do contorno saem medidas que não dependem de aprendizado: área, perímetro, circularidade, alongamento, caixa mínima rotacionada. Com elas dá para escrever regras como "fio comprido não é inseto".

Essas medidas têm uso mesmo num projeto que usa rede neural: **triagem de falsos positivos por tamanho e forma** depois do detector. Se a espécie-alvo mede entre 3 e 6 mm e a escala da imagem é conhecida, uma detecção de 15 mm está errada independentemente da confiança que o modelo deu a ela.`,
        },
        {
          t: 'nota',
          estilo: 'entrevista',
          md: `**Pergunta frequente:** "por que suavizar antes de detectar bordas?". Porque derivar amplifica alta frequência, e ruído é alta frequência. Sem suavização, cada grão do sensor vira uma borda. A resposta completa menciona o custo: suavizar demais desloca e apaga bordas reais, e por isso sigma é uma escolha de escala.`,
        },
        {
          t: 'quiz',
          pergunta: 'No Canny, para que servem dois limiares em vez de um?',
          opcoes: [
            'Um vale para bordas horizontais e o outro para verticais.',
            'Bordas acima do alto são aceitas; entre os dois, só se estiverem ligadas a uma borda forte. Isso dá contornos contínuos sem aceitar ruído isolado.',
            'O baixo é usado em imagens escuras e o alto em claras.',
            'Um define o tamanho do desfoque e o outro o do kernel de Sobel.',
          ],
          correta: 1,
          explicacao: 'É a histerese. Com um limiar só, ou se aceita ruído (limiar baixo) ou as bordas saem tracejadas (limiar alto). Os dois juntos resolvem.',
        },
        {
          t: 'quiz',
          pergunta: 'Um contorno tem circularidade 0,12 e alongamento 9. O que provavelmente é?',
          opcoes: ['Um inseto arredondado.', 'Um objeto fino e comprido, como uma fibra ou um pedaço de palha.', 'Dois insetos encostados.', 'Um círculo com um buraco.'],
          correta: 1,
          explicacao: 'Circularidade perto de 0 indica muito perímetro para pouca área, e alongamento alto indica comprimento muito maior que a largura. É o perfil de um fio.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'contagem-classica',
      titulo: 'Contagem clássica e onde ela quebra',
      minutos: 14,
      resumo: 'O pipeline sem aprendizado, medido contra o gabarito. Saber o limite dele é saber por que se treina um detector.',
      blocos: [
        {
          t: 'texto',
          md: `Juntando as lições anteriores, sai um contador completo: **tirar o fundo → limiar → abertura → componentes conexos → filtro por área**. Não precisa de dataset, de anotação nem de GPU, e roda em milissegundos.

O painel abaixo mostra esse pipeline confrontado com o gabarito. Três coisas para fazer nele:

1. Baixe o número de insetos para uns 8 e troque o fundo para **usar a imagem direto**: o Otsu corta o cartão ao meio. Volte ao black-hat e o problema some.
2. Suba os insetos para 60 e a aglomeração para 70%: agora o que falha é a separação, e nenhum parâmetro resolve.
3. Numa cena intermediária, ajuste tudo para zerar o erro de contagem, clique em **outra armadilha** e veja se o ajuste se mantém.`,
        },
        { t: 'visual', componente: 'cv/limiar' },
        {
          t: 'texto',
          md: `### Os quatro tipos de resultado

- **Certo** (verde): uma mancha, um inseto.
- **Fundido** (amarelo): vários insetos encostados viraram uma mancha só. O método conta um e perde os demais.
- **Falso** (vermelho): sujeira, fibra ou gota de cola contada como inseto.
- **Perdido**: inseto que não gerou mancha, normalmente por ser pequeno ou claro demais.

Repare numa coisa que se repete: muitas vezes o **número total quase bate**, com fundidos tirando de um lado e falsos pondo do outro. É o motivo de erro de contagem sozinho ser uma métrica fraca: ele não distingue acertar de errar duas vezes em sentidos opostos. Voltaremos a isso no módulo de avaliação.`,
        },
        {
          t: 'codigo',
          titulo: 'O pipeline completo, avaliado em 30 armadilhas',
          rodar: 'python',
          requerPython: ['cv2'],
          tempo: 90,
          codigo: `import cv2
import numpy as np
import lab

PINCEL_FUNDO = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (45, 45))

def contar(img, abertura=3, area_min=12):
    cinza = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    sem_fundo = cv2.morphologyEx(cinza, cv2.MORPH_BLACKHAT, PINCEL_FUNDO)
    _, m = cv2.threshold(sem_fundo, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((abertura, abertura), np.uint8))
    n, _, stats, _ = cv2.connectedComponentsWithStats(m)
    return int(sum(1 for i in range(1, n) if stats[i, cv2.CC_STAT_AREA] >= area_min))

def avaliar(nome, **opcoes):
    erros = []
    for semente in range(30):
        img, gabarito, _ = lab.amostra_com_gabarito(nome, semente=semente, **opcoes)
        erros.append(contar(img) - len(gabarito))
    erros = np.array(erros)
    return [f"{np.abs(erros).mean():.1f}", f"{erros.mean():+.1f}", f"{np.abs(erros).max()}"]

lab.tabela([
    ["esparsa, limpa"] + avaliar("armadilha", insetos=20, detritos=0, aglomerado=0.0),
    ["esparsa, com sujeira"] + avaliar("armadilha", insetos=20, detritos=15, aglomerado=0.0),
    ["aglomerada"] + avaliar("armadilha", insetos=45, detritos=8, aglomerado=0.6),
    ["densa (160+)"] + avaliar("armadilha-densa"),
], cabecalho=["cenário", "erro abs. médio", "viés", "pior caso"])

img, gabarito, _ = lab.amostra_com_gabarito("armadilha-densa", semente=3)
print(f"exemplo denso: contou {contar(img)}, gabarito {len(gabarito)}")
lab.mostrar(img, titulo="armadilha densa")`,
        },
        {
          t: 'texto',
          md: `A tabela mostra o padrão: na cena esparsa e limpa o método é quase perfeito; com sujeira o viés fica **positivo** (conta a mais); com aglomeração e densidade o viés fica **negativo** e cresce (conta a menos, porque funde). Na armadilha densa, cerca de um terço dos insetos some da contagem.

### Por que não tem conserto dentro do método

O pipeline decide tudo por **intensidade e conectividade**. Dois insetos encostados são uma região conexa; uma gota de cola escura tem a mesma intensidade de um inseto. Para separar esses casos é preciso reconhecer **aparência**: forma de asa, textura, proporção. Dá para escrever mais regras (transformada de distância com watershed para separar aglomerados, filtros de forma), e cada regra conserta um caso e quebra outro.

É esse o ponto em que aprender a partir de exemplos passa a compensar: em vez de escrever regras de aparência, mostram-se exemplos rotulados e o modelo aprende as regras.`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Situação', 'Clássico basta?', 'Por quê'],
          linhas: [
            ['Cena controlada, objetos separados, fundo uniforme', 'Sim', 'Rápido, explicável, sem dataset'],
            ['Checar qualidade da captura (foco, exposição, enquadramento)', 'Sim', 'Medidas diretas; rede seria desperdício'],
            ['Achar e endireitar o cartão na foto', 'Quase sempre', 'Cor e contorno resolvem; é pré-processamento'],
            ['Objetos encostados ou sobrepostos', 'Não', 'Conectividade não separa'],
            ['Distinguir espécies parecidas', 'Não', 'Exige aparência, não só tamanho'],
            ['Sujeira parecida com o alvo', 'Não', 'Mesma intensidade, forma diferente'],
            ['Iluminação e fundo variando muito', 'Não', 'Cada limiar vale para uma condição'],
          ],
        },
        {
          t: 'nota',
          estilo: 'campo',
          md: `**O clássico não some do projeto.** Num sistema de detecção em produção, o processamento clássico costuma ficar antes e depois da rede: antes, validando a captura e recortando a região de interesse; depois, filtrando detecções por tamanho físico e posição. É a parte barata, determinística e fácil de explicar a um cliente quando ele pergunta por que uma foto foi recusada.`,
        },
        {
          t: 'quiz',
          pergunta: 'Um contador por limiar e componentes conexos tem erro médio de contagem próximo de zero num conjunto de teste. O que dá para concluir?',
          opcoes: [
            'Que ele localiza corretamente cada inseto.',
            'Pouco: fundidos (conta a menos) e falsos positivos (conta a mais) podem estar se cancelando.',
            'Que ele funcionará igual em armadilhas mais densas.',
            'Que não vale a pena treinar um detector.',
          ],
          correta: 1,
          explicacao: 'Erro de contagem agregado esconde erros de sinais opostos. Para saber se o método acerta, é preciso casar cada detecção com um objeto do gabarito e contar verdadeiros positivos, falsos positivos e falsos negativos.',
        },
        {
          t: 'quiz',
          pergunta: 'Em armadilhas muito densas, o erro do contador clássico tende a ser para qual lado?',
          opcoes: [
            'Para cima, porque há mais sujeira.',
            'Para baixo, porque insetos encostados formam uma única região conexa.',
            'Aleatório, sem tendência.',
            'Zero, porque a densidade melhora o contraste.',
          ],
          correta: 1,
          explicacao: 'Quanto mais densa a cena, mais insetos se tocam. Cada grupo conexo é contado como um, então a subcontagem cresce com a densidade.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'geometria',
      titulo: 'Geometria: perspectiva, câmera e escala',
      minutos: 14,
      resumo: 'Endireitar a foto, entender a distorção da lente e converter pixel em milímetro.',
      blocos: [
        {
          t: 'texto',
          md: `Quem fotografa a armadilha com o celular na mão nunca fica perfeitamente de frente. O cartão aparece como um quadrilátero torto, e o mesmo inseto ocupa mais pixels na parte próxima e menos na distante.

A **homografia** é a transformação que desfaz isso para superfícies planas: uma matriz 3×3 que leva os quatro cantos do cartão na foto para os quatro cantos de um retângulo. Arraste os pontos até os cantos.`,
        },
        { t: 'visual', componente: 'cv/homografia' },
        {
          t: 'texto',
          md: `### A família das transformações

Cada nível acrescenta liberdade e preserva menos coisas:

| Transformação | Graus de liberdade | Preserva | Pares de pontos |
|---|---|---|---|
| Translação | 2 | tudo, menos posição | 1 |
| Rígida (rotação + translação) | 3 | distâncias e ângulos | 2 |
| Similaridade (+ escala) | 4 | ângulos e proporções | 2 |
| Afim (+ cisalhamento) | 6 | paralelismo | 3 |
| Homografia (perspectiva) | 8 | só as retas | 4 |

A homografia é exata para **planos**. Um cartão é plano; uma planta não é.`,
        },
        {
          t: 'codigo',
          titulo: 'Achar o cartão e endireitar automaticamente',
          rodar: 'python',
          requerPython: ['cv2'],
          codigo: `import cv2
import numpy as np
import lab

cartao = lab.amostra("armadilha", semente=11, largura=640, altura=480)
h, w = cartao.shape[:2]

# simula a foto: o cartão cai torto sobre um fundo cinza
cantos_cartao = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
cantos_foto = np.float32([[130, 70], [640, 40], [700, 500], [60, 470]])
H_ida = cv2.getPerspectiveTransform(cantos_cartao, cantos_foto)
foto = cv2.warpPerspective(cartao, H_ida, (760, 560), borderValue=(92, 82, 74))

# 1. achar o cartão pela cor (HSV, lição de espaços de cor)
hsv = cv2.cvtColor(foto, cv2.COLOR_BGR2HSV)
mascara = cv2.inRange(hsv, (15, 80, 80), (40, 255, 255))
mascara = cv2.morphologyEx(mascara, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))

# 2. o maior contorno, aproximado por um polígono de 4 lados
contornos, _ = cv2.findContours(mascara, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
maior = max(contornos, key=cv2.contourArea)
poligono = cv2.approxPolyDP(maior, 0.02 * cv2.arcLength(maior, True), True)
print("vértices encontrados:", len(poligono))

# 3. ordenar os cantos: superior-esq, superior-dir, inferior-dir, inferior-esq
pts = poligono.reshape(-1, 2).astype(np.float32)
soma, dif = pts.sum(axis=1), np.diff(pts, axis=1).ravel()
ordenados = np.float32([pts[soma.argmin()], pts[dif.argmin()], pts[soma.argmax()], pts[dif.argmax()]])

# 4. homografia de volta e deformação
H_volta = cv2.getPerspectiveTransform(ordenados, cantos_cartao)
reto = cv2.warpPerspective(foto, H_volta, (w, h))

marcada = foto.copy()
cv2.polylines(marcada, [ordenados.astype(np.int32)], True, (60, 76, 231), 3)
erro = np.abs(ordenados - cantos_foto).max()
print(f"maior erro de canto: {erro:.1f} px")
lab.mostrar(marcada, reto, titulos=["foto com o cartão localizado", "endireitado"])`,
        },
        {
          t: 'nota',
          estilo: 'pegadinha',
          md: `**A ordem dos cantos.** \`getPerspectiveTransform\` casa o primeiro ponto de origem com o primeiro de destino, e assim por diante. Se \`approxPolyDP\` devolver os cantos começando por outro vértice, a imagem sai girada ou espelhada. O truque da soma e da diferença de coordenadas (menor soma é o superior esquerdo, maior soma é o inferior direito) ordena de forma estável, desde que o cartão não esteja girado mais de uns 45°.`,
        },
        {
          t: 'texto',
          md: `### A lente também entorta

A homografia supõe uma câmera ideal. Lente de verdade, e a grande-angular de celular em particular, curva as retas. O modelo usual é radial: quanto mais longe do centro, maior o deslocamento.`,
        },
        { t: 'visual', componente: 'cv/distorcao' },
        {
          t: 'texto',
          md: `A **calibração** estima os parâmetros da câmera a partir de várias fotos de um padrão conhecido, normalmente um tabuleiro de xadrez:

- **Intrínsecos**: distância focal e centro óptico (a matriz K) e os coeficientes de distorção (k1, k2, p1, p2, k3). Dependem da câmera e do foco, não da cena.
- **Extrínsecos**: rotação e translação da câmera em relação à cena. Mudam a cada foto.`,
        },
        {
          t: 'codigo',
          titulo: 'Calibração com tabuleiro (para ler, não para rodar)',
          lang: 'python',
          codigo: `import cv2
import numpy as np

CANTOS = (8, 6)        # cantos INTERNOS do tabuleiro: colunas, linhas
LADO_MM = 25.0         # tamanho real de cada casa

# coordenadas 3D dos cantos no próprio tabuleiro (z = 0, porque é plano)
modelo = np.zeros((CANTOS[0] * CANTOS[1], 3), np.float32)
modelo[:, :2] = np.mgrid[0:CANTOS[0], 0:CANTOS[1]].T.reshape(-1, 2) * LADO_MM

pontos_3d, pontos_2d = [], []
for caminho in fotos_do_tabuleiro:            # 15 a 20 fotos, em ângulos variados
    cinza = cv2.cvtColor(cv2.imread(caminho), cv2.COLOR_BGR2GRAY)
    achou, cantos = cv2.findChessboardCorners(cinza, CANTOS)
    if not achou:
        continue
    # refina a posição dos cantos para precisão de subpixel
    cantos = cv2.cornerSubPix(cinza, cantos, (11, 11), (-1, -1),
                              (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.001))
    pontos_3d.append(modelo)
    pontos_2d.append(cantos)

erro, K, distorcao, rvecs, tvecs = cv2.calibrateCamera(
    pontos_3d, pontos_2d, cinza.shape[::-1], None, None)

print("erro de reprojeção (px):", erro)       # abaixo de 0,5 é bom; acima de 1, refaça
corrigida = cv2.undistort(imagem, K, distorcao)`,
        },
        {
          t: 'texto',
          md: `### De pixel para milímetro

Com o cartão endireitado e o tamanho real dele conhecido, a escala sai direto: um cartão de 200 mm que ocupa 1600 pixels dá **8 px/mm**. A partir daí, tamanho em pixel vira tamanho físico, e isso habilita duas coisas:

- **Filtrar detecções por tamanho real**, que é a triagem de falso positivo mais robusta que existe. Vale para qualquer modelo.
- **Padronizar a entrada do modelo.** Se toda imagem é reamostrada para a mesma escala física, o detector vê cada espécie sempre com o mesmo tamanho em pixels, e deixa de precisar aprender invariância a escala. Em objetos pequenos isso costuma render mais que trocar de arquitetura.

Sem endireitar e sem escala, o tamanho em pixel mistura três coisas: o tamanho do inseto, a distância da câmera e a posição no quadro.`,
        },
        {
          t: 'nota',
          estilo: 'campo',
          md: `**Captura padronizada é geometria aplicada.** Um gabarito na tela do aplicativo (moldura para alinhar o cartão), distância fixa por um suporte e marcas nos cantos do cartão eliminam na origem o que a homografia e a calibração corrigem depois. O ideal é ter os dois: o protocolo reduz a variação, e a correção geométrica trata o que sobrar.`,
        },
        {
          t: 'quiz',
          pergunta: 'Quantos pares de pontos correspondentes são necessários para determinar uma homografia, e por quê?',
          opcoes: [
            '3, porque um plano é definido por três pontos.',
            '4, porque a matriz tem 8 graus de liberdade e cada par fornece 2 equações.',
            '8, um para cada elemento livre da matriz.',
            '2, desde que a escala seja conhecida.',
          ],
          correta: 1,
          explicacao: 'A matriz 3×3 tem 9 elementos, mas é definida a menos de um fator de escala, restando 8 incógnitas. Cada correspondência de ponto dá duas equações (uma para x, outra para y), então são necessários 4 pares.',
        },
        {
          t: 'quiz',
          pergunta: 'A homografia endireitou o cartão, mas as linhas da grade impressa continuam levemente curvas. O que falta?',
          opcoes: [
            'Mais pares de pontos na homografia.',
            'Corrigir a distorção radial da lente, que a homografia não modela.',
            'Aumentar a resolução da imagem de saída.',
            'Converter a imagem para tons de cinza.',
          ],
          correta: 1,
          explicacao: 'A homografia leva retas em retas. Se as retas chegaram curvas, a causa está antes dela: é a distorção da lente, que se corrige com os coeficientes obtidos na calibração (`cv2.undistort`), aplicados antes da homografia.',
        },
        {
          t: 'quiz',
          pergunta: 'Quais parâmetros de câmera precisam ser reestimados a cada nova foto?',
          opcoes: [
            'Os intrínsecos (focal, centro óptico, distorção).',
            'Os extrínsecos (rotação e translação da câmera em relação à cena).',
            'Ambos, sempre.',
            'Nenhum: uma calibração vale para qualquer foto de qualquer câmera.',
          ],
          correta: 1,
          explicacao: 'Os intrínsecos pertencem à câmera e ficam fixos enquanto lente e foco não mudarem. Os extrínsecos descrevem onde a câmera estava naquela foto, então mudam a cada captura.',
        },
      ],
    },
  ],
};
