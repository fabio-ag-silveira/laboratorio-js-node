export const modulo = {
  id: 'avaliacao',
  titulo: 'Avaliar de verdade',
  cor: '#e88fb8',
  licoes: [
    // ------------------------------------------------------------------
    {
      id: 'acertos-e-erros',
      titulo: 'Acertos, erros e o limiar de confiança',
      minutos: 13,
      resumo: 'TP, FP e FN em detecção, a regra de casamento com o gabarito e o que o limiar de confiança troca por quê.',
      blocos: [
        {
          t: 'texto',
          md: `Um detector não responde "sim ou não": ele devolve uma lista de caixas, cada uma com classe e confiança. Avaliar é decidir, para cada caixa, se ela corresponde a um objeto de verdade. Disso saem três contagens:

- **TP** (verdadeiro positivo): caixa que casa com um objeto do gabarito.
- **FP** (falso positivo): caixa que não casa com nenhum. Sujeira, duplicata, caixa mal posicionada.
- **FN** (falso negativo): objeto do gabarito que ficou sem caixa.

Não existe verdadeiro negativo em detecção: "todos os lugares onde não há inseto e o modelo não marcou nada" é um conjunto infinito. Por isso não se usa acurácia, e sim:

\`\`\`
precisão = TP / (TP + FP)      das caixas que o modelo deu, quantas estão certas
recall   = TP / (TP + FN)      dos objetos que existem, quantos o modelo achou
F1       = 2 · P · R / (P + R)  média harmônica: só é alta se as duas forem
\`\`\`

O simulador abaixo roda um detector com defeitos conhecidos sobre doze armadilhas. Faça os quatro experimentos.`,
        },
        { t: 'visual', componente: 'cv/metricas' },
        {
          t: 'texto',
          md: `### Quatro experimentos

1. **Deslize a confiança mínima** de 0 a 1. A precisão sobe, o recall cai, e o ponto vermelho percorre a curva. Não existe limiar "certo": existe o ponto de operação que o uso pede.
2. **Suba o IoU mínimo** para 0,75. Caixas que eram acerto viram erro, e cada uma conta **duas vezes**: um FP pela caixa e um FN pelo objeto que ficou sem par.
3. **Troque para o modelo v2.** Os falsos positivos caem para cerca de um terço, quase todos os de sujeira. O recall também sobe, e a causa é a localização: caixas mais precisas deixam de ser reprovadas no IoU, e cada uma delas era um FP e um FN de uma vez. É o tipo de melhoria que negativos difíceis e anotação mais cuidadosa produzem.
4. **Ignore a classe.** O que melhora é a parcela dos erros que era só confusão entre espécies.

### A regra de casamento

Detalhe que muda o número e que quase ninguém confere: **como** uma caixa é declarada acerto. A regra padrão (COCO, Pascal VOC, Ultralytics):

1. ordenar as detecções da mais confiante para a menos;
2. cada uma fica com o objeto **ainda livre**, da mesma classe, de maior IoU, desde que o IoU passe do limiar;
3. cada objeto casa **uma vez só**. A segunda caixa sobre o mesmo inseto é falso positivo.`,
        },
        {
          t: 'codigo',
          titulo: 'O casamento escrito à mão, numa imagem',
          rodar: 'python',
          requerPython: ['cv2'],
          codigo: `import cv2
import lab

img, gabarito, detritos = lab.amostra_com_gabarito("armadilha", semente=4)
deteccoes = lab.detector_simulado(gabarito, detritos, "v1", semente=4)

def casar(deteccoes, gabarito, iou_min=0.5, conf_min=0.25):
    candidatas = [d for d in deteccoes if d["conf"] >= conf_min]
    candidatas.sort(key=lambda d: -d["conf"])          # 1. da mais confiante para a menos
    livre = [True] * len(gabarito)
    tp, fp = [], []
    for d in candidatas:
        melhor, melhor_iou = None, iou_min
        for k, g in enumerate(gabarito):
            if livre[k] and g["classe"] == d["classe"]:  # 2. objeto livre, mesma classe
                v = lab.iou(d, g)
                if v >= melhor_iou:
                    melhor, melhor_iou = k, v
        if melhor is None:
            fp.append(d)
        else:
            livre[melhor] = False                        # 3. cada objeto casa uma vez só
            tp.append(d)
    fn = [g for k, g in enumerate(gabarito) if livre[k]]
    return tp, fp, fn

tp, fp, fn = casar(deteccoes, gabarito)
precisao = len(tp) / (len(tp) + len(fp))
recall = len(tp) / (len(tp) + len(fn))
print(f"gabarito {len(gabarito)} | detecções acima de 0.25: {len(tp) + len(fp)}")
print(f"TP {len(tp)}  FP {len(fp)}  FN {len(fn)}")
print(f"precisão {precisao:.1%}  recall {recall:.1%}  F1 {2 * precisao * recall / (precisao + recall):.1%}")

# de onde vêm os falsos positivos? (num detector real você não tem este campo)
origens = {}
for d in fp:
    origens[d["origem"]] = origens.get(d["origem"], 0) + 1
print("origem dos FP:", origens)

saida = lab.desenhar_caixas(img, tp, cor=(113, 204, 46), rotulo=False)
saida = lab.desenhar_caixas(saida, fp, cor=(60, 76, 231), rotulo=False)
saida = lab.desenhar_caixas(saida, fn, cor=(15, 196, 241), rotulo=False)
lab.mostrar(saida, titulo="verde = TP, vermelho = FP, amarelo = FN")`,
        },
        {
          t: 'nota',
          estilo: 'pegadinha',
          md: `**Dois números com o mesmo nome.** A precisão e o recall que o Ultralytics imprime no fim do treino são medidos no limiar de confiança que **maximiza o F1** na validação. Os que você mede em produção usam o limiar que está configurado na aplicação. Se os dois limiares forem diferentes, os números não são comparáveis, e a discrepância não é culpa do modelo. Sempre que citar precisão ou recall, cite junto o limiar de confiança e o de IoU.`,
        },
        {
          t: 'quiz',
          pergunta: 'Duas caixas do modelo cobrem bem o mesmo inseto, com confianças 0,9 e 0,6. Como a avaliação conta isso?',
          opcoes: [
            'Dois verdadeiros positivos.',
            'Um verdadeiro positivo (a de 0,9) e um falso positivo (a de 0,6).',
            'Um verdadeiro positivo; a segunda é ignorada.',
            'Dois falsos positivos, por serem duplicadas.',
          ],
          correta: 1,
          explicacao: 'Cada objeto do gabarito só pode casar uma vez, com a detecção mais confiante. A outra caixa não tem com quem casar e conta como falso positivo. É por isso que duplicatas derrubam a precisão.',
        },
        {
          t: 'quiz',
          pergunta: 'Uma caixa está sobre o inseto certo, mas com IoU 0,42, e o limiar é 0,5. Quantos erros isso gera?',
          opcoes: ['Nenhum: a caixa está no objeto certo.', 'Um: um falso positivo.', 'Dois: um falso positivo e um falso negativo.', 'Um: um falso negativo.'],
          correta: 2,
          explicacao: 'A caixa não casa, então é um FP. E o objeto fica sem par, então é um FN. Erro de localização é penalizado duas vezes, o que explica a queda brusca das métricas quando o limiar de IoU sobe.',
        },
        {
          t: 'quiz',
          pergunta: 'Por que acurácia não é usada para avaliar detectores?',
          opcoes: [
            'Porque é mais lenta de calcular.',
            'Porque exige verdadeiros negativos, e em detecção eles não são contáveis: há infinitas regiões sem objeto que o modelo corretamente não marcou.',
            'Porque só funciona com duas classes.',
            'Porque depende do tamanho da imagem.',
          ],
          correta: 1,
          explicacao: 'Acurácia é (TP + TN) / total. Sem um conjunto definido de negativos, a conta não existe. Precisão e recall usam só TP, FP e FN.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'curva-pr-e-map',
      titulo: 'Curva PR, AP e mAP',
      minutos: 14,
      resumo: 'Um número que resume todos os limiares de confiança, e as duas versões dele que você precisa distinguir.',
      blocos: [
        {
          t: 'texto',
          md: `Precisão e recall dependem do limiar de confiança. Para comparar modelos sem escolher um limiar, olha-se a curva inteira.

### Do ranking à curva

Ordene todas as detecções do conjunto de teste pela confiança. Percorrer essa lista de cima para baixo equivale a baixar o limiar aos poucos: a cada detecção incluída, o recall sobe (se for acerto) ou a precisão cai (se for erro). Cada posição da lista dá um ponto (recall, precisão).

### AP

A **precisão média** (AP) é a área sob essa curva, depois de torná-la monótona: em cada recall, usa-se a maior precisão obtida dali para a direita. Vai de 0 a 1 e resume o comportamento do modelo em **todos** os limiares de confiança.

### mAP

- **AP** é calculado por classe.
- **mAP** é a média do AP entre as classes.
- **mAP@50** usa IoU ≥ 0,5 para declarar acerto. Tolera caixa frouxa.
- **mAP@50-95** é a média do mAP em dez limiares de IoU, de 0,50 a 0,95. Cobra localização precisa. É a métrica principal do COCO.

Os dois contam histórias diferentes, e a diferença entre eles é informação: mAP@50 alto com mAP@50-95 baixo quer dizer que o modelo **acha** os objetos e **desenha mal** as caixas.`,
        },
        {
          t: 'codigo',
          titulo: 'AP calculado à mão, por classe e por limiar de IoU',
          rodar: 'python',
          requerPython: ['cv2', 'matplotlib'],
          tempo: 120,
          codigo: `import numpy as np
import matplotlib.pyplot as plt
import lab

dados = lab.conjunto(40, "v1", semente=1)      # 40 armadilhas, gabarito e detecções
CLASSES = ["mariposa", "cigarrinha", "mosca"]

def curva_pr(dados, classe, iou_min):
    """Curva PR de UMA classe no conjunto inteiro."""
    registros, total = [], 0                    # (confiança, acertou?)
    for item in dados:
        gab = [g for g in item["gabarito"] if g["classe"] == classe]
        det = [d for d in item["deteccoes"] if d["classe"] == classe]
        total += len(gab)
        # o casamento é POR IMAGEM; a ordenação por confiança, mais abaixo, é global
        acertos = {i for i, _, _ in lab.casar(det, gab, iou_min=iou_min)["tp"]}
        registros += [(d["conf"], i in acertos) for i, d in enumerate(det)]

    registros.sort(key=lambda r: -r[0])
    certo = np.array([r[1] for r in registros], dtype=float)
    tp = np.cumsum(certo)
    precisao = tp / np.arange(1, len(certo) + 1)
    recall = tp / max(total, 1)

    envoltoria = np.maximum.accumulate(precisao[::-1])[::-1]     # monótona
    ap = float(np.sum(np.diff(np.concatenate([[0.0], recall])) * envoltoria))
    return recall, precisao, envoltoria, ap

limiares = np.arange(0.5, 0.96, 0.05)
linhas, fig = [], plt.figure(figsize=(8.5, 4))
for classe in CLASSES:
    recall, precisao, env, ap50 = curva_pr(dados, classe, 0.5)
    ap_medio = np.mean([curva_pr(dados, classe, t)[3] for t in limiares])
    ap75 = curva_pr(dados, classe, 0.75)[3]
    linhas.append([classe, f"{ap50:.3f}", f"{ap75:.3f}", f"{ap_medio:.3f}"])
    plt.plot(recall, env, label=f"{classe} (AP@50 = {ap50:.2f})")

linhas.append(["mAP", *[f"{np.mean([float(l[c]) for l in linhas]):.3f}" for c in (1, 2, 3)]])
lab.tabela(linhas, cabecalho=["classe", "AP@50", "AP@75", "AP@50-95"])

plt.xlabel("recall"); plt.ylabel("precisão"); plt.xlim(0, 1); plt.ylim(0, 1.02)
plt.legend(); plt.grid(alpha=0.3)
lab.mostrar(fig, titulo="curvas precisão x recall por classe (IoU 0,5)")`,
        },
        {
          t: 'texto',
          md: `Duas leituras da tabela. A classe de objeto menor tem o pior AP, e a distância entre ela e as outras **cresce** do AP@50 para o AP@50-95. A lição de IoU explicou por quê: num objeto de poucos pixels, um erro de dois pixels na caixa já derruba o IoU.

### O que o mAP não diz

- **Não diz o ponto de operação.** Dois modelos com o mesmo mAP podem ter comportamentos opostos no limiar que você vai usar. O AP também premia a parte da curva de recall alto e precisão baixa, onde nenhuma aplicação opera.
- **Esconde classe ruim atrás de classe boa.** Leia sempre o AP por classe.
- **Depende do conjunto de teste.** mAP não se compara entre conjuntos diferentes, nem entre o seu dataset e o COCO.
- **Depende do avaliador.** COCO amostra a curva em 101 pontos de recall; Pascal VOC antigo usava 11; o Ultralytics usa interpolação própria. Diferenças de um ou dois pontos entre ferramentas são normais. Compare versões sempre com a **mesma** ferramenta.`,
        },
        {
          t: 'nota',
          estilo: 'entrevista',
          md: `**Pergunta frequente:** "mAP@50 subiu e mAP@50-95 caiu. O que aconteceu?". O modelo passou a encontrar mais objetos, com caixas piores. Causas comuns: anotações novas menos cuidadosas, aumentação que afrouxa as caixas (rotação), resolução de treino menor. A resposta completa pergunta de volta qual das duas importa para o uso: contagem tolera caixa frouxa; medição de tamanho, não.`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Tamanho (COCO)', 'Área da caixa', 'Lado equivalente', 'Métrica'],
          linhas: [
            ['pequeno', 'menos de 32² px', 'até 32 px', 'AP_S'],
            ['médio', 'de 32² a 96² px', '32 a 96 px', 'AP_M'],
            ['grande', 'mais de 96² px', 'acima de 96 px', 'AP_L'],
          ],
        },
        {
          t: 'texto',
          md: `O COCO separa o AP por tamanho de objeto. Pela definição dele, **praticamente todo inseto de armadilha é "pequeno"**, e nos rankings públicos o AP_S costuma ser bem menor que o AP geral do mesmo modelo. É a razão de um detector que lidera benchmark não ser, automaticamente, o melhor para o seu problema.`,
        },
        {
          t: 'quiz',
          pergunta: 'O que significa mAP@50 alto com mAP@50-95 baixo?',
          opcoes: [
            'O modelo perde muitos objetos.',
            'O modelo encontra os objetos, mas as caixas são imprecisas: passam no IoU 0,5 e falham nos limiares mais altos.',
            'O modelo confunde as classes.',
            'O conjunto de teste é pequeno demais.',
          ],
          correta: 1,
          explicacao: 'O mAP@50-95 faz a média em limiares de IoU de 0,50 a 0,95. Caixas frouxas contam como acerto no primeiro e como erro nos demais.',
        },
        {
          t: 'quiz',
          pergunta: 'Mover o limiar de confiança da aplicação de 0,25 para 0,5 muda o AP do modelo?',
          opcoes: [
            'Sim, o AP sobe porque a precisão sobe.',
            'Sim, o AP cai porque o recall cai.',
            'Não: o AP é calculado sobre todas as detecções, percorrendo todos os limiares. O limiar da aplicação só escolhe um ponto da curva.',
            'Depende da classe.',
          ],
          correta: 2,
          explicacao: 'AP resume a curva inteira. Por isso, para avaliar, exporta-se o modelo com limiar de confiança bem baixo (0,001 no Ultralytics). Avaliar com limiar alto corta a cauda da curva e subestima o AP.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'analise-de-erro',
      titulo: 'Análise de erro e falsos positivos',
      minutos: 14,
      resumo: 'Antes de treinar de novo, descubra qual erro custa mais. É o passo que decide onde gastar a próxima semana.',
      blocos: [
        {
          t: 'texto',
          md: `O mAP diz **quanto** o modelo erra. Para melhorar, é preciso saber **como** ele erra, porque cada tipo de erro tem um conserto diferente. Uma classificação que funciona (inspirada no TIDE, de Bolya e colegas, 2020):

| Tipo | Definição | Conserto típico |
|---|---|---|
| Duplicata | casa com um objeto que já tinha outra caixa | NMS, ou detector sem NMS |
| Localização | classe certa, IoU entre 0,1 e 0,5 | anotação mais precisa, mais resolução |
| Classe | caixa boa, classe errada | mais exemplos das classes confundidas |
| Fundo | não toca objeto nenhum | exemplos negativos difíceis no treino |
| Perdido (FN) | objeto que nenhuma caixa alcançou | mais dados daquele caso, mais resolução |

O detector simulado guarda de onde veio cada detecção. O bloco abaixo classifica os erros **só olhando a geometria**, como você faria com um modelo real, e confere contra a origem verdadeira.`,
        },
        {
          t: 'codigo',
          titulo: 'Classificar cada falso positivo e medir o teto de ganho',
          rodar: 'python',
          requerPython: ['cv2'],
          tempo: 120,
          codigo: `import lab

CONF = 0.25
dados = lab.conjunto(40, "v1", semente=1)

def tipo_do_erro(d, gabarito, casados):
    """Classifica UM falso positivo pela sobreposição com o gabarito."""
    melhor_iou, melhor = 0.0, None
    for k, g in enumerate(gabarito):
        v = lab.iou(d, g)
        if v > melhor_iou:
            melhor_iou, melhor = v, k
    if melhor is None or melhor_iou < 0.1:
        return "fundo"
    mesma_classe = gabarito[melhor]["classe"] == d["classe"]
    if melhor_iou >= 0.5:
        if not mesma_classe:
            return "classe"
        return "duplicata" if melhor in casados else "localização"
    return "localização" if mesma_classe else "classe+localização"

contagem, cruzada = {}, {}
TP = FP = FN = 0
for item in dados:
    r = lab.casar(item["deteccoes"], item["gabarito"], conf_min=CONF)
    TP += len(r["tp"]); FP += len(r["fp"]); FN += len(r["fn"])
    casados = {k for _, k, _ in r["tp"]}
    for i in r["fp"]:
        d = item["deteccoes"][i]
        tipo = tipo_do_erro(d, item["gabarito"], casados)
        contagem[tipo] = contagem.get(tipo, 0) + 1
        cruzada[(d["origem"], tipo)] = cruzada.get((d["origem"], tipo), 0) + 1

def f1(tp, fp, fn):
    return 2 * tp / (2 * tp + fp + fn)

print(f"TP {TP}  FP {FP}  FN {FN}  ->  F1 {f1(TP, FP, FN):.3f}")

# teto de ganho: quanto o F1 subiria se UM tipo de erro sumisse por completo
linhas = []
for tipo, n in sorted(contagem.items(), key=lambda par: -par[1]):
    # erro de localização ou de classe, se consertado, vira acerto e tira um FN junto
    vira_acerto = n if tipo in ("localização", "classe", "classe+localização") else 0
    teto = f1(TP + vira_acerto, FP - n, FN - vira_acerto)
    linhas.append([tipo, n, f"{n / FP:.0%}", f"{teto:.3f}", f"+{teto - f1(TP, FP, FN):.3f}"])
linhas.append(["perdidos (FN)", FN, "-", f"{f1(TP + FN, FP, 0):.3f}", f"+{f1(TP + FN, FP, 0) - f1(TP, FP, FN):.3f}"])
lab.tabela(linhas, cabecalho=["tipo de erro", "quantos", "% dos FP", "F1 se sumisse", "ganho"])

print()
print("conferência: origem plantada x tipo inferido")
origens = sorted({o for o, _ in cruzada})
tipos = sorted({t for _, t in cruzada})
lab.tabela([[o] + [cruzada.get((o, t), 0) for t in tipos] for o in origens], cabecalho=["origem"] + tipos)`,
        },
        {
          t: 'texto',
          md: `A primeira tabela é uma **análise de teto**: para cada tipo de erro, quanto a métrica subiria se ele desaparecesse por completo. Ela responde a pergunta de planejamento: mesmo um conserto perfeito das duplicatas rende pouco; atacar o tipo do topo rende muito. É assim que se decide entre gastar a semana reanotando, coletando negativos ou mexendo no pós-processamento.

A segunda tabela mostra o limite do método. A geometria classifica como "fundo" tanto a sujeira quanto o ruído solto, porque em nenhum dos dois casos há objeto do gabarito por perto. Para separar "confundiu sujeira com inseto" de "inventou do nada" é preciso **olhar as imagens**.

### O ritual de olhar cem erros

A prática que mais rende em projeto de visão, e a menos glamorosa:

1. Separe cem erros ao acaso (falsos positivos e negativos), de imagens de produção.
2. Monte uma planilha: uma linha por erro, uma coluna por causa possível (sujeira, borrado, sombra, espécie parecida, inseto cortado na borda, **anotação errada**).
3. Marque e some as colunas.

Em meia hora você tem a distribuição das causas. Duas surpresas são comuns: uma única causa responde por metade dos erros, e uma fatia considerável dos "erros do modelo" são **erros do gabarito**. Nesse segundo caso, o que precisa de conserto é a anotação, e a métrica estava subestimando o modelo.`,
        },
        {
          t: 'nota',
          estilo: 'campo',
          md: `**Falso positivo se combate com dado, não com limiar.** Subir o limiar de confiança reduz FP e leva recall junto. O conserto que não cobra esse preço é pôr no treino aquilo que o modelo confunde: imagens com a sujeira, sem caixa nenhuma sobre ela (exemplo negativo). Em projeto de armadilha, vale manter uma coleta dedicada: toda detecção de alta confiança que um revisor marcou como errada volta para o dataset como imagem de fundo. É mineração de negativos difíceis, e costuma ser o que separa a versão 2 da versão 1.`,
        },
        {
          t: 'quiz',
          pergunta: 'A análise mostra que 60% dos falsos positivos são sujeira detectada como inseto com confiança alta. Qual é a ação mais eficaz?',
          opcoes: [
            'Subir o limiar de confiança até eles sumirem.',
            'Reduzir o limiar de IoU do NMS.',
            'Adicionar ao treino imagens com esse tipo de sujeira sem anotação sobre ela (negativos difíceis).',
            'Treinar por mais épocas com os mesmos dados.',
          ],
          correta: 2,
          explicacao: 'Confiança alta em sujeira significa que o modelo aprendeu que aquilo é inseto. Subir o limiar cortaria insetos de verdade com confiança igual ou menor. O conserto é mostrar o contraexemplo no treino.',
        },
        {
          t: 'quiz',
          pergunta: 'Para que serve a análise de teto?',
          opcoes: [
            'Para descobrir o maior mAP que a arquitetura consegue atingir.',
            'Para estimar, por tipo de erro, quanto a métrica subiria se ele fosse eliminado, e assim priorizar o trabalho.',
            'Para escolher o limiar de confiança.',
            'Para medir a velocidade máxima de inferência.',
          ],
          correta: 1,
          explicacao: 'É uma ferramenta de priorização: mostra onde está o ganho possível antes de gastar esforço. Um tipo de erro raro não merece uma semana de trabalho, por mais incômodo que seja.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'comparar-versoes',
      titulo: 'Comparar versões com rigor',
      minutos: 13,
      resumo: 'Quando "0,812 contra 0,798" é melhoria e quando é ruído. E os vazamentos que inflam o número.',
      blocos: [
        {
          t: 'texto',
          md: `Toda métrica medida num conjunto de teste finito tem incerteza. Se o conjunto fosse outro, com outras armadilhas sorteadas da mesma população, o número seria um pouco diferente. A pergunta honesta ao comparar duas versões é: a diferença é maior que essa oscilação?

O **bootstrap** responde sem fórmula. Sorteia-se, com reposição, um novo conjunto de teste do mesmo tamanho a partir do original; recalcula-se a métrica; repete-se mil vezes. A dispersão dos resultados é a incerteza. Para comparar modelos, reamostra-se **as mesmas imagens** para os dois e olha-se a distribuição da **diferença**.`,
        },
        {
          t: 'codigo',
          titulo: 'Intervalo de confiança da diferença entre duas versões',
          rodar: 'python',
          requerPython: ['cv2'],
          tempo: 180,
          codigo: `import numpy as np
import lab

CONF = 0.25
rng = np.random.default_rng(0)

def contagens(dados):
    """TP, FP e FN de cada imagem: a unidade de reamostragem é a IMAGEM."""
    saida = []
    for item in dados:
        r = lab.casar(item["deteccoes"], item["gabarito"], conf_min=CONF)
        saida.append((len(r["tp"]), len(r["fp"]), len(r["fn"])))
    return np.array(saida)

def f1(c):
    tp, fp, fn = c.sum(axis=0)
    return 2 * tp / (2 * tp + fp + fn)

def comparar(n_imagens, perfil_a, perfil_b, semente_teste=5):
    # MESMAS armadilhas para os dois modelos. Cada modelo tem o seu próprio
    # sorteio de erros (semente_detector): dois modelos reais não erram nos
    # mesmos lugares.
    a = contagens(lab.conjunto(n_imagens, perfil_a, semente=semente_teste, semente_detector=1))
    b = contagens(lab.conjunto(n_imagens, perfil_b, semente=semente_teste, semente_detector=2))
    difs = []
    for _ in range(2000):
        i = rng.integers(0, n_imagens, n_imagens)       # sorteio com reposição
        difs.append(f1(b[i]) - f1(a[i]))
    baixo, alto = np.percentile(difs, [2.5, 97.5])
    veredito = "diferença real" if baixo > 0 or alto < 0 else "não dá para afirmar"
    return [f"{f1(a):.3f}", f"{f1(b):.3f}", f"{f1(b) - f1(a):+.3f}", f"[{baixo:+.3f}, {alto:+.3f}]", veredito]

# um perfil intermediário: uma melhoria moderada, e real, sobre a v1
v1 = dict(lab.PERFIS["v1"])
v1_mais = dict(v1, p_falso_detrito=0.35)

lab.tabela([
    ["o MESMO modelo duas vezes, 10 imagens"] + comparar(10, v1, v1),
    ["v1 x melhoria moderada, 10 imagens"] + comparar(10, v1, v1_mais),
    ["v1 x melhoria moderada, 120 imagens"] + comparar(120, v1, v1_mais),
    ["v1 x v2, 10 imagens"] + comparar(10, "v1", "v2"),
], cabecalho=["comparação", "F1 A", "F1 B", "diferença", "IC 95%", "conclusão"])`,
        },
        {
          t: 'texto',
          md: `Leia linha por linha.

- **Primeira linha: o mesmo modelo comparado com ele mesmo.** A diferença não é zero. Com dez imagens, o acaso sozinho produz dois pontos de F1 para um lado ou para o outro. Esse é o tamanho do ruído que qualquer comparação neste conjunto carrega.
- **Segunda linha: uma melhoria real, em dez imagens.** A diferença medida é da mesma ordem da linha de cima, e o intervalo inclui o zero. Não dá para distinguir a melhoria do acaso.
- **Terceira linha: a mesma melhoria, em 120 imagens.** O intervalo aperta e deixa o zero de fora. A melhoria sempre esteve lá; faltava teste para enxergá-la.
- **Quarta linha: uma melhoria grande** aparece até com dez imagens.

Sem o intervalo, a decisão entre publicar e não publicar uma melhoria moderada é um cara ou coroa disfarçado de número com três casas decimais.

### Vazamento: o que infla a métrica

O número mais bonito do projeto costuma ser o mais contaminado. As fontes clássicas:

- **A mesma cena no treino e no teste.** Duas fotos da mesma armadilha, tiradas com segundos de diferença, caindo uma em cada lado. O modelo é avaliado no que decorou. Divida por **armadilha**, por **dia de coleta** ou por **local**, nunca por foto sorteada.
- **Ajustar no teste.** Escolher limiar, arquitetura ou época olhando o conjunto de teste faz dele um segundo conjunto de validação. São três papéis: **treino** ajusta pesos, **validação** ajusta decisões, **teste** só mede, e pouco.
- **Teste que não parece produção.** Se o teste saiu da mesma coleta do treino e o aplicativo recebe fotos de outros celulares, outra luz, outras usinas, a métrica mede outro problema. O teste precisa ser amostrado **de onde o modelo vai rodar**.
- **Gabarito que mudou.** Reanotar o teste entre versões muda a régua. Reavalie a versão antiga no gabarito novo antes de comparar.`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Item do protocolo', 'Regra'],
          linhas: [
            ['Conjunto de teste', 'Fixo e versionado. Só cresce por acréscimo, com registro da data.'],
            ['Divisão', 'Por armadilha, data ou local. Nunca por imagem sorteada.'],
            ['Limiares', 'Escolhidos na validação e congelados antes de olhar o teste.'],
            ['Ferramenta', 'A mesma para todas as versões, com as mesmas configurações.'],
            ['Fatias', 'Métrica por condição que importa: usina, celular, densidade, espécie.'],
            ['Regressão', 'Piora em qualquer fatia crítica bloqueia a publicação.'],
            ['Incerteza', 'Diferença relatada com intervalo, não só com o valor.'],
          ],
        },
        {
          t: 'nota',
          estilo: 'campo',
          md: `**Métrica por fatia pega o que a média esconde.** Uma versão pode subir dois pontos no geral e cair dez nas armadilhas mais densas, que são exatamente as que importam para a decisão agronômica. Guardar, junto de cada imagem do teste, de onde ela veio e em que condição foi tirada custa pouco, e permite cortar o resultado por usina, por modelo de celular e por faixa de densidade.`,
        },
        {
          t: 'quiz',
          pergunta: 'A v2 tem mAP 0,741 e a v1 tem 0,733, num teste de 50 imagens. O intervalo de confiança da diferença é [−0,021; +0,037]. O que concluir?',
          opcoes: [
            'A v2 é melhor: o número é maior.',
            'A v1 é melhor.',
            'Não dá para afirmar que há diferença: o intervalo inclui o zero. É preciso um teste maior ou uma melhoria maior.',
            'O teste está com vazamento.',
          ],
          correta: 2,
          explicacao: 'Quando o intervalo da diferença contém zero, os dados são compatíveis com "nenhuma melhoria" e também com "pequena piora". A decisão de publicar precisa de outros critérios, ou de mais dados.',
        },
        {
          t: 'quiz',
          pergunta: 'O dataset tem 3 fotos de cada armadilha, tiradas em sequência. Como dividir em treino e teste?',
          opcoes: [
            'Sorteando as fotos: 80% para treino, 20% para teste.',
            'Mantendo as 3 fotos de cada armadilha sempre do mesmo lado da divisão.',
            'Pondo a primeira foto de cada armadilha no teste.',
            'Tanto faz, desde que as classes fiquem balanceadas.',
          ],
          correta: 1,
          explicacao: 'Fotos da mesma armadilha são quase a mesma imagem. Se uma vai para o treino e outra para o teste, o teste mede memorização. A unidade de divisão tem de ser a armadilha (ou a data, ou o local).',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'contagem-e-negocio',
      titulo: 'Métricas de contagem e de negócio',
      minutos: 13,
      resumo: 'O cliente não compra mAP. Como medir o que ele usa e escolher o limiar pelo custo do erro.',
      blocos: [
        {
          t: 'texto',
          md: `Num sistema de monitoramento de pragas, a saída que importa é **quantos insetos de cada espécie havia na armadilha**, porque é esse número que entra na decisão de manejo. O mAP mede a qualidade das caixas, e é um meio para chegar lá.

### Métricas de contagem

| Métrica | Fórmula | Lê-se como |
|---|---|---|
| Erro absoluto médio (MAE) | média de \\|contado − real\\| | quantos insetos se erra por armadilha |
| Viés | média de (contado − real) | conta a mais (+) ou a menos (−), em média |
| Erro percentual (MAPE) | média de \\|erro\\| / real | erro relativo; explode quando o real é perto de zero |
| Erro acima do tolerado | % de armadilhas com erro maior que X | quantas contagens são inúteis |

O **viés** merece atenção separada: um modelo com MAE baixo e viés zero erra para os dois lados; um com viés −15% subestima sistematicamente, e isso atrasa a decisão em todas as armadilhas ao mesmo tempo.

### Contagem e detecção discordam sobre o limiar

Para contar, falsos positivos e falsos negativos **se cancelam**: o melhor limiar de contagem é aquele em que FP ≈ FN, que raramente é o que maximiza o F1.`,
        },
        {
          t: 'codigo',
          titulo: 'O limiar que maximiza F1 e o que minimiza o erro de contagem',
          rodar: 'python',
          requerPython: ['cv2', 'matplotlib'],
          tempo: 150,
          codigo: `import numpy as np
import matplotlib.pyplot as plt
import lab

dados = lab.conjunto(60, "v1", semente=2)
reais = np.array([len(item["gabarito"]) for item in dados])

limiares = np.arange(0.05, 0.96, 0.05)
f1s, maes, vieses = [], [], []
for conf in limiares:
    tp = fp = fn = 0
    contados = []
    for item in dados:
        r = lab.casar(item["deteccoes"], item["gabarito"], conf_min=conf)
        tp += len(r["tp"]); fp += len(r["fp"]); fn += len(r["fn"])
        contados.append(len(r["tp"]) + len(r["fp"]))       # contagem = caixas acima do limiar
    erro = np.array(contados) - reais
    f1s.append(2 * tp / (2 * tp + fp + fn))
    maes.append(np.abs(erro).mean())
    vieses.append(erro.mean())

i_f1, i_mae = int(np.argmax(f1s)), int(np.argmin(maes))
lab.tabela([
    ["maximiza F1", f"{limiares[i_f1]:.2f}", f"{f1s[i_f1]:.3f}", f"{maes[i_f1]:.2f}", f"{vieses[i_f1]:+.2f}"],
    ["minimiza erro de contagem", f"{limiares[i_mae]:.2f}", f"{f1s[i_mae]:.3f}", f"{maes[i_mae]:.2f}", f"{vieses[i_mae]:+.2f}"],
], cabecalho=["critério", "limiar", "F1", "MAE (insetos/armadilha)", "viés"])
print(f"média de insetos por armadilha: {reais.mean():.1f}")

fig, (e1, e2) = plt.subplots(1, 2, figsize=(10, 3.6))
e1.plot(limiares, f1s, marker="o"); e1.axvline(limiares[i_f1], ls="--", color="gray")
e1.set_title("F1"); e1.set_xlabel("limiar de confiança"); e1.grid(alpha=0.3)
e2.plot(limiares, maes, marker="o", label="MAE"); e2.plot(limiares, vieses, marker="s", label="viés")
e2.axhline(0, color="gray", lw=0.8); e2.axvline(limiares[i_mae], ls="--", color="gray")
e2.set_title("erro de contagem"); e2.set_xlabel("limiar de confiança"); e2.legend(); e2.grid(alpha=0.3)
lab.mostrar(fig, titulo="os dois critérios escolhem limiares diferentes")`,
        },
        {
          t: 'nota',
          estilo: 'pegadinha',
          md: `**Contagem certa por cancelamento é frágil.** O limiar em que FP e FN se anulam depende da proporção entre sujeira e insetos **naquele** conjunto. Numa usina com mais poeira, os falsos positivos sobem e a contagem passa a superestimar; numa armadilha lotada, os perdidos sobem e ela subestima. Um modelo com menos erros dos dois tipos é robusto a essa variação; um modelo com muitos erros que se cancelam, não. Por isso se otimiza a detecção primeiro, e o limiar de contagem se escolhe depois, sobre o melhor detector.`,
        },
        {
          t: 'texto',
          md: `### Escolher o limiar pelo custo

Os dois tipos de erro raramente custam o mesmo. Na dúvida entre "alarme falso" e "infestação não vista", qual é pior? Depende da praga e da decisão que o número dispara, e quem sabe responder é o agrônomo, não o engenheiro. O que cabe ao engenheiro é transformar a resposta em conta:

\`\`\`
custo(limiar) = custo_FP × FP(limiar) + custo_FN × FN(limiar)
\`\`\`

e escolher o limiar que minimiza esse custo **na validação**.

### A confiança diz a verdade?

Um modelo é **calibrado** quando, entre as detecções com confiança 0,8, cerca de 80% estão certas. Detectores modernos tendem a ser confiantes demais. Calibração importa quando a confiança é usada para decidir, por exemplo, quais imagens mandar para revisão humana.`,
        },
        {
          t: 'codigo',
          titulo: 'Limiar por custo e diagrama de calibração',
          rodar: 'python',
          requerPython: ['cv2'],
          tempo: 120,
          codigo: `import numpy as np
import lab

dados = lab.conjunto(60, "v1", semente=2)
limiares = np.arange(0.05, 0.96, 0.05)

def erros(conf):
    fp = fn = 0
    for item in dados:
        r = lab.casar(item["deteccoes"], item["gabarito"], conf_min=conf)
        fp += len(r["fp"]); fn += len(r["fn"])
    return fp, fn

tabela = [erros(c) for c in limiares]
linhas = []
for nome, custo_fp, custo_fn in [("erros com o mesmo custo", 1, 1),
                                  ("perder inseto custa 5x mais", 1, 5),
                                  ("alarme falso custa 5x mais", 5, 1)]:
    custos = [custo_fp * fp + custo_fn * fn for fp, fn in tabela]
    i = int(np.argmin(custos))
    linhas.append([nome, f"{limiares[i]:.2f}", tabela[i][0], tabela[i][1]])
lab.tabela(linhas, cabecalho=["cenário", "melhor limiar", "FP", "FN"])

# calibração: em cada faixa de confiança, que fração das detecções está certa?
confs, certos = [], []
for item in dados:
    acertos = {i for i, _, _ in lab.casar(item["deteccoes"], item["gabarito"])["tp"]}
    for i, d in enumerate(item["deteccoes"]):
        confs.append(d["conf"]); certos.append(i in acertos)
confs, certos = np.array(confs), np.array(certos, dtype=float)

print()
linhas, ece = [], 0.0
for a in np.arange(0, 1, 0.2):
    faixa = (confs >= a) & (confs < a + 0.2)
    if faixa.sum() == 0:
        continue
    media_conf, fracao_certa = confs[faixa].mean(), certos[faixa].mean()
    ece += faixa.mean() * abs(media_conf - fracao_certa)
    linhas.append([f"{a:.1f} a {a + 0.2:.1f}", int(faixa.sum()), f"{media_conf:.2f}", f"{fracao_certa:.2f}",
                   "confiante demais" if media_conf - fracao_certa > 0.05 else "ok"])
lab.tabela(linhas, cabecalho=["faixa de confiança", "detecções", "confiança média", "fração certa", "leitura"])
print(f"erro de calibração esperado (ECE): {ece:.3f}")`,
        },
        {
          t: 'texto',
          md: `A primeira tabela mostra o limiar se deslocando conforme o custo relativo dos erros: é a tradução de uma decisão de negócio em configuração. A segunda mostra onde a confiança promete mais do que entrega.

### O que entregar a quem decide

Um relatório de versão que serve para o cliente e para a equipe tem três camadas:

1. **Negócio**: erro de contagem por armadilha, viés, e a fração de armadilhas com erro acima do tolerável. Por espécie.
2. **Detecção**: precisão e recall no limiar de produção, e mAP@50 e mAP@50-95 para acompanhar a evolução.
3. **Diagnóstico**: os tipos de erro mais frequentes, com exemplos visuais, e o que a próxima versão vai atacar.

A primeira camada é a que o cliente lê. A terceira é a que justifica o roteiro.`,
        },
        {
          t: 'quiz',
          pergunta: 'Um modelo tem MAE de contagem de 2,1 insetos por armadilha e viés de −2,0. O que isso indica?',
          opcoes: [
            'Erros aleatórios para os dois lados.',
            'Subcontagem sistemática: quase todo o erro é para menos. Vale investigar objetos perdidos ou baixar o limiar.',
            'Excesso de falsos positivos.',
            'Modelo bem calibrado.',
          ],
          correta: 1,
          explicacao: 'Viés próximo do MAE em módulo significa que os erros têm quase todos o mesmo sinal. Erros aleatórios dariam viés perto de zero com o mesmo MAE.',
        },
        {
          t: 'quiz',
          pergunta: 'Por que o limiar que minimiza o erro de contagem costuma ser diferente do que maximiza o F1?',
          opcoes: [
            'Porque a contagem ignora a classe.',
            'Porque na contagem um falso positivo e um falso negativo se anulam, então o ótimo é onde FP ≈ FN; o F1 penaliza os dois.',
            'Porque o F1 só vale para duas classes.',
            'Porque a contagem usa IoU mais alto.',
          ],
          correta: 1,
          explicacao: 'A contagem só enxerga o total de caixas. O F1 enxerga cada erro. Um limiar que equilibra FP e FN zera o viés de contagem sem ser o de menor número de erros.',
        },
      ],
    },
  ],
};
