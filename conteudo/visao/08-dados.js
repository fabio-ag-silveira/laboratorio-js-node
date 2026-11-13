export const modulo = {
  id: 'dados',
  titulo: 'Dados',
  cor: '#7ec96a',
  licoes: [
    // ------------------------------------------------------------------
    {
      id: 'captura',
      titulo: 'O ciclo de vida e o protocolo de captura',
      minutos: 11,
      resumo: 'O modelo é a menor parte do sistema. O mapa do ciclo inteiro, e a etapa que mais barateia todas as outras.',
      blocos: [
        {
          t: 'texto',
          md: `Em projeto de visão que dura mais de uma versão, o que diferencia um resultado bom de um medíocre quase nunca é a arquitetura. É a qualidade e a cobertura dos dados, e a disciplina do ciclo que os produz. Clique em cada etapa: cada uma tem um erro clássico.`,
        },
        { t: 'visual', componente: 'cv/ciclo' },
        {
          t: 'texto',
          md: `### Captura: onde a variação se controla de graça

Tudo que a captura não padroniza, o modelo precisa aprender a tolerar, e isso se paga em dados. Um protocolo de captura decide, por escrito:

| Item | Decisão | O que evita |
|---|---|---|
| Distância e enquadramento | moldura na tela do aplicativo; cartão ocupando o quadro | escala variando 3× entre fotos |
| Escala | cartão de tamanho conhecido, ou marcas nos cantos | impossibilidade de filtrar por tamanho real |
| Iluminação | à sombra, sem flash direto, ou sempre com flash | reflexo na cola, sombra dura, estouro |
| Foco | toque para focar; recusar foto borrada | insetos pequenos virando mancha |
| Fundo | superfície neutra atrás do cartão | o modelo aprendendo o chão da usina |
| Momento | antes de limpar a armadilha; data registrada | contagem sem referência de tempo |

A lição de histograma mostrou o **portão de qualidade**: três checagens baratas, feitas no celular, que recusam a foto na hora e dizem por quê. Recusar custa dez segundos de quem fotografa. Aceitar custa uma imagem inútil no dataset e uma contagem errada entregue ao cliente.

### Metadados: o que guardar junto de cada foto

Usina, identificador da armadilha, talhão, data e hora, modelo do aparelho, versão do aplicativo, quem fotografou. Parece burocracia, e é o que permite, meses depois:

- dividir treino e teste **por armadilha e por data**, sem vazamento;
- cortar a métrica **por fatia** (por usina, por aparelho) e achar onde o modelo vai mal;
- investigar uma queda de desempenho ("começou quando trocaram o celular do técnico").

Sem metadados, essas três perguntas não têm resposta.`,
        },
        {
          t: 'nota',
          estilo: 'campo',
          md: `**Variação que você quer e variação que você não quer.** O protocolo reduz a variação **incidental** (distância, foco, luz). A variação **essencial** (espécies, estágios, densidade, sujeira típica de cada região) tem de entrar no dataset de propósito. Um dataset com mil fotos da mesma usina na mesma semana cobre menos que duzentas fotos de dez usinas ao longo de uma safra.`,
        },
        {
          t: 'quiz',
          pergunta: 'O desempenho caiu em uma usina específica. O que permite descobrir isso e investigar a causa?',
          opcoes: [
            'Treinar um modelo maior.',
            'Ter guardado, junto de cada foto, de onde ela veio e como foi tirada, para cortar a métrica por usina e por aparelho.',
            'Aumentar o conjunto de validação sorteando mais fotos.',
            'Baixar o limiar de confiança naquela usina.',
          ],
          correta: 1,
          explicacao: 'Sem metadados só existe a média geral, que esconde a fatia ruim. Com eles, a métrica por usina mostra o problema e os outros campos (aparelho, data, operador) apontam a causa.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'anotacao',
      titulo: 'Anotação e controle de qualidade',
      minutos: 13,
      resumo: 'A anotação é o teto do modelo e o teto da métrica. Como escrever um guia e medir a qualidade do gabarito.',
      blocos: [
        {
          t: 'texto',
          md: `O modelo aprende a imitar a anotação, com os erros dela. E a métrica mede a concordância com a anotação, não com a realidade. Anotação inconsistente tem dois efeitos: o modelo aprende a média da confusão, e a avaliação passa a punir previsões certas.

### O guia de anotação

Um documento curto, com imagens, que decide de antemão os casos em que duas pessoas discordariam:

- **Onde fica a borda da caixa**: justa no corpo, ou incluindo asas, antenas e pernas?
- **Inseto parcialmente visível**: anota a partir de que fração? E os cortados pela borda da foto?
- **Insetos sobrepostos**: uma caixa por indivíduo, mesmo estimando a parte escondida?
- **Indivíduo danificado ou coberto de cola**: conta, se ainda for identificável?
- **Classe incerta**: existe uma classe "não identificado"? Ou a região é marcada para ser **ignorada** no treino e na avaliação?
- **O que nunca se anota**: sujeira, fragmentos, outros artrópodes fora do escopo.

O guia é um documento vivo: toda dúvida nova vira um exemplo nele. E toda mudança no guia exige revisar o conjunto de **teste**, senão as versões deixam de ser comparáveis.`,
        },
        {
          t: 'texto',
          md: `### Quanto o ruído de anotação custa

O experimento abaixo isola o efeito. Pega-se o gabarito verdadeiro e "anota-se" de novo com os defeitos típicos de um anotador: caixas um pouco deslocadas, alguns insetos esquecidos, alguma sujeira marcada. Depois avalia-se um **detector perfeito** (que devolve o gabarito verdadeiro) contra essa anotação ruidosa.`,
        },
        {
          t: 'codigo',
          titulo: 'Um detector perfeito avaliado contra anotação imperfeita',
          rodar: 'python',
          requerPython: ['cv2'],
          tempo: 150,
          codigo: `import numpy as np
import lab

rng = np.random.default_rng(0)

def anotar(gabarito, detritos, tremor_px, p_esquecer, p_sujeira):
    """Simula um anotador humano: desloca caixas, esquece insetos, marca sujeira."""
    saida = []
    for g in gabarito:
        if rng.random() < p_esquecer:
            continue
        saida.append(dict(g, x=g["x"] + rng.normal(0, tremor_px), y=g["y"] + rng.normal(0, tremor_px),
                          w=max(3, g["w"] + rng.normal(0, tremor_px)), h=max(3, g["h"] + rng.normal(0, tremor_px))))
    for d in detritos:
        if rng.random() < p_sujeira:
            saida.append(dict(d, classe="mosca"))
    return saida

def avaliar(tremor_px, p_esquecer, p_sujeira, n=30):
    linhas = {}
    for iou_min in (0.5, 0.75):
        tp = fp = fn = 0
        por_classe = {}
        for s in range(n):
            _, verdade, detritos = lab.amostra_com_gabarito("armadilha", semente=s)
            anotado = anotar(verdade, detritos, tremor_px, p_esquecer, p_sujeira)
            perfeito = [dict(v, conf=1.0) for v in verdade]         # o detector que acerta tudo
            r = lab.casar(perfeito, anotado, iou_min=iou_min)
            tp += len(r["tp"]); fp += len(r["fp"]); fn += len(r["fn"])
            for k in r["fn"]:
                por_classe[anotado[k]["classe"]] = por_classe.get(anotado[k]["classe"], 0) + 1
        linhas[iou_min] = (tp / max(tp + fp, 1), tp / max(tp + fn, 1))
    (p50, r50), (p75, r75) = linhas[0.5], linhas[0.75]
    return [f"{p50:.1%}", f"{r50:.1%}", f"{p75:.1%}", f"{r75:.1%}"]

lab.tabela([
    ["anotação perfeita"] + avaliar(0, 0, 0),
    ["caixas com 1 px de imprecisão"] + avaliar(1, 0, 0),
    ["caixas com 2 px de imprecisão"] + avaliar(2, 0, 0),
    ["5% dos insetos esquecidos"] + avaliar(0, 0.05, 0),
    ["10% da sujeira anotada como inseto"] + avaliar(0, 0, 0.10),
    ["tudo junto (2 px, 5%, 10%)"] + avaliar(2, 0.05, 0.10),
], cabecalho=["gabarito de teste", "precisão@50", "recall@50", "precisão@75", "recall@75"])
print()
print("O detector avaliado é PERFEITO em todas as linhas. O que muda é a qualidade do gabarito.")`,
        },
        {
          t: 'texto',
          md: `Um modelo perfeito não chega a 100% contra um gabarito imperfeito, e a queda é muito maior no IoU 0,75. Dois pixels de imprecisão do anotador, num conjunto com insetos pequenos, tiram do modelo um desempenho que ele tem.

Três conclusões:

- **Existe um teto de métrica definido pela anotação.** Se dois anotadores concordam em 85% dos casos, um modelo com 85% já empatou com um humano. Perseguir 95% nesse gabarito é perseguir ruído.
- **Insetos esquecidos viram "falsos positivos" do modelo.** Na análise de erro, parte dos FP de confiança alta são objetos reais que faltam no gabarito. É a primeira coisa a conferir.
- **O conjunto de teste merece o dobro do cuidado.** No treino, o modelo tolera algum ruído. No teste, cada erro de anotação é um erro de medição.

### Controle de qualidade na prática

| Prática | Como | Mede |
|---|---|---|
| Dupla anotação por amostragem | 5% a 10% das imagens anotadas por duas pessoas | concordância entre anotadores |
| Revisão por um sênior | amostra de cada lote | erro por anotador |
| Imagens-controle | imagens com gabarito conhecido misturadas no lote | atenção e aderência ao guia |
| Conferência pelo modelo | listar discordâncias fortes entre modelo e anotação | erros de gabarito, baratos de achar |

A última é a de melhor custo-benefício: as detecções de confiança alta sem par no gabarito, e as anotações sem nenhuma detecção por perto, são uma lista curta, e nela se concentram os erros de anotação.`,
        },
        {
          t: 'nota',
          estilo: 'pegadinha',
          md: `**Pré-anotar com o modelo acelera e vicia.** Quem revisa uma pré-anotação tende a aceitar o que está lá: corrige o erro gritante e deixa passar a caixa frouxa e o inseto que o modelo não viu. O dataset herda os pontos cegos do modelo, e a versão seguinte os reforça. Contramedidas: mostrar a pré-anotação só depois de uma primeira passada às cegas numa amostra, medir quanto o revisor altera, e manter o conjunto de teste **anotado do zero**, sem ajuda do modelo.`,
        },
        {
          t: 'quiz',
          pergunta: 'Na análise de erro, muitos falsos positivos de confiança acima de 0,9 estão em cima de insetos reais. O que isso indica?',
          opcoes: [
            'O limiar de confiança está baixo.',
            'O gabarito está incompleto: são objetos que o anotador esqueceu, e a métrica está subestimando o modelo.',
            'O NMS está suprimindo demais.',
            'O modelo está sobreajustado.',
          ],
          correta: 1,
          explicacao: 'Detecção confiante sobre um objeto real, contada como erro, é erro de anotação. Corrigir o gabarito melhora a métrica sem mexer no modelo, e melhora o treino da próxima versão.',
        },
        {
          t: 'quiz',
          pergunta: 'Dois anotadores experientes concordam em 88% das caixas (IoU ≥ 0,5). O que isso diz sobre a meta do modelo?',
          opcoes: [
            'Nada: a meta deve ser sempre 100%.',
            'Que o teto prático de recall e precisão, medido nesse gabarito, fica perto de 88%: acima disso mede-se ruído de anotação.',
            'Que os anotadores precisam ser trocados.',
            'Que o IoU mínimo deve subir para 0,75.',
          ],
          correta: 1,
          explicacao: 'A concordância entre humanos é a referência do que o gabarito consegue medir. Para ir além, o primeiro investimento é melhorar o guia e a anotação, e só depois o modelo.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'divisao-e-balanceamento',
      titulo: 'Divisão, vazamento e classes desbalanceadas',
      minutos: 12,
      resumo: 'Como repartir os dados sem se enganar, e o que fazer com a classe que quase não aparece.',
      blocos: [
        {
          t: 'texto',
          md: `A lição de comparação de versões listou os vazamentos. Aqui está a mecânica de dividir direito.

### A unidade de divisão é o grupo

Tudo que é "quase a mesma imagem" tem de ficar do mesmo lado: fotos da mesma armadilha, da mesma visita, do mesmo quadro de um vídeo. A divisão se faz por **grupo**, e só depois se confere se as classes ficaram representadas dos dois lados (estratificação).

O bloco abaixo é um utilitário de verdade: divide por grupo, preserva a proporção das classes o melhor que consegue, e **prova** que não há grupo dos dois lados. Dá para levar para o seu projeto.`,
        },
        {
          t: 'codigo',
          titulo: 'Divisão por grupo, estratificada, com prova de que não vaza',
          rodar: 'python',
          codigo: `import numpy as np
import lab

rng = np.random.default_rng(0)

# um manifesto de mentira: 400 fotos, de 90 armadilhas, em 6 usinas
CLASSES = ["mariposa", "cigarrinha", "mosca"]
fotos = []
for i in range(400):
    armadilha = int(rng.integers(0, 90))
    usina = armadilha % 6
    # a usina 5 tem muito mais mariposa: desbalanceamento que acompanha o grupo
    p = [0.55, 0.25, 0.20] if usina == 5 else [0.08, 0.37, 0.55]
    contagem = rng.multinomial(int(rng.integers(5, 60)), p)
    fotos.append(dict(arquivo=f"img_{i:04d}.jpg", armadilha=f"A{armadilha:03d}", usina=f"U{usina}",
                      objetos=dict(zip(CLASSES, map(int, contagem)))))

def dividir_por_grupo(fotos, chave, fracao_teste=0.2, tentativas=300, semente=0):
    """Sorteia grupos inteiros para o teste; fica com o sorteio de proporção de classes mais parecida."""
    r = np.random.default_rng(semente)
    grupos = sorted({f[chave] for f in fotos})
    total = np.array([sum(f["objetos"][c] for f in fotos) for c in CLASSES], dtype=float)
    melhor, melhor_custo = None, np.inf
    for _ in range(tentativas):
        teste = set(r.choice(grupos, size=max(1, round(len(grupos) * fracao_teste)), replace=False))
        no_teste = np.array([sum(f["objetos"][c] for f in fotos if f[chave] in teste) for c in CLASSES], dtype=float)
        # custo: distância entre a fração de cada classe no teste e a fração desejada
        custo = np.abs(no_teste / total - fracao_teste).sum()
        if custo < melhor_custo:
            melhor, melhor_custo = teste, custo
    return [f for f in fotos if f[chave] not in melhor], [f for f in fotos if f[chave] in melhor]

def resumo(nome, treino, teste, chave):
    linha = [nome, len(treino), len(teste)]
    for c in CLASSES:
        a, b = sum(f["objetos"][c] for f in treino), sum(f["objetos"][c] for f in teste)
        linha.append(f"{b / (a + b):.0%}")
    vazou = {f[chave] for f in treino} & {f[chave] for f in teste}
    linha.append(len(vazou))
    return linha

# 1. o jeito errado: sortear fotos
indices = rng.permutation(len(fotos))
corte = int(len(fotos) * 0.8)
errado = [fotos[i] for i in indices[:corte]], [fotos[i] for i in indices[corte:]]

# 2. por armadilha   3. por usina (o teste mais duro: local nunca visto)
por_armadilha = dividir_por_grupo(fotos, "armadilha")
por_usina = dividir_por_grupo(fotos, "usina", fracao_teste=0.17)

lab.tabela([
    resumo("sorteando fotos", *errado, "armadilha"),
    resumo("por armadilha", *por_armadilha, "armadilha"),
    resumo("por usina", *por_usina, "usina"),
], cabecalho=["divisão", "treino", "teste", "% mariposa no teste", "% cigarrinha", "% mosca", "grupos dos dois lados"])

assert not ({f["armadilha"] for f in por_armadilha[0]} & {f["armadilha"] for f in por_armadilha[1]})
print()
print("verificado: nenhuma armadilha aparece no treino e no teste na divisão por armadilha")`,
        },
        {
          t: 'texto',
          md: `A coluna da direita é a que importa: sorteando fotos, dezenas de armadilhas ficam dos dois lados, e o teste mede memorização. As colunas do meio mostram o segundo cuidado: a fração de cada classe que foi para o teste deve ficar perto dos 20% pedidos, senão uma classe é avaliada com meia dúzia de exemplos.

A divisão **por usina** responde a uma pergunta diferente e mais dura: como o modelo se sai num **local que nunca viu**? É o número que prevê o desempenho ao entrar num cliente novo, e costuma ser bem pior que o da divisão por armadilha. Vale ter os dois.

Repare na linha dela: só 8% das mariposas foram para o teste. Uma usina concentra essa espécie, e ou ela inteira vai para o teste, ou inteira fica no treino. Com poucos grupos grandes, não existe divisão que equilibre tudo, e a tabela é o que avisa: aquele teste mede mal a mariposa.

### Classes desbalanceadas

Em qualquer dataset real, uma espécie domina e outra aparece em 2% das anotações. O modelo aprende bem a primeira e mal a segunda, e o mAP médio esconde isso.

| Remédio | Como | Cuidado |
|---|---|---|
| Coletar mais da classe rara | direcionar a coleta para onde ela ocorre | o mais eficaz, e o mais demorado |
| Reamostrar | repetir no treino as imagens que contêm a classe rara | sobreajusta naquelas poucas imagens |
| Copiar e colar | recortar instâncias raras e colá-las em outras imagens | bordas artificiais; colar em contexto plausível |
| Pesar a perda | erro na classe rara pesa mais | costuma trocar recall por falsos positivos |
| Juntar classes | fundir espécies que o uso não precisa separar | decisão de produto, não só técnica |

Dois princípios valem para todos. O conjunto de **teste não se rebalanceia**: ele deve ter a proporção de produção, senão a métrica deixa de prever o que vai acontecer. E a métrica se lê **por classe**, sempre.`,
        },
        {
          t: 'nota',
          estilo: 'entrevista',
          md: `**Pergunta frequente:** "o dataset tem 95% de uma classe; o que você faz?". A resposta fraca lista técnicas. A forte começa perguntando o que a aplicação precisa: se a classe rara é a praga que dispara o manejo, o recall dela é o que importa, e vale sacrificar precisão. Depois vem a ordem: medir por classe, coletar mais, reamostrar ou copiar e colar, e só então mexer na perda.`,
        },
        {
          t: 'quiz',
          pergunta: 'Você quer estimar o desempenho do modelo num cliente novo, de uma região ainda não atendida. Qual divisão dá a estimativa mais honesta?',
          opcoes: [
            'Sorteio de fotos, por ter mais variedade no teste.',
            'Por armadilha.',
            'Por usina (ou região): o teste contém só locais que não aparecem no treino.',
            'Por classe.',
          ],
          correta: 2,
          explicacao: 'A pergunta é sobre generalização para um local novo, então o teste deve ser um local novo. Dividir por armadilha ainda deixa o modelo ver a iluminação, a sujeira e as espécies típicas de cada usina.',
        },
        {
          t: 'quiz',
          pergunta: 'Para compensar uma classe rara, alguém propõe rebalancear também o conjunto de teste. Qual é o problema?',
          opcoes: [
            'Nenhum: melhora a medição.',
            'O teste deixa de ter a distribuição de produção, e a métrica agregada deixa de prever o desempenho real. O certo é manter a proporção e ler a métrica por classe.',
            'O teste fica grande demais.',
            'A classe rara passa a ter recall menor.',
          ],
          correta: 1,
          explicacao: 'O teste existe para prever o que acontece em produção. Para enxergar a classe rara, usa-se a métrica por classe, e garante-se um número mínimo de exemplos dela no teste, sem alterar as proporções das demais.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'ciclo-de-producao',
      titulo: 'O ciclo com dados de produção',
      minutos: 12,
      resumo: 'Quais imagens mandar para anotar, como minerar negativos difíceis e como versionar o dataset.',
      blocos: [
        {
          t: 'texto',
          md: `Com o modelo em produção, chegam mais imagens do que dá para anotar. Anotar ao acaso desperdiça dinheiro: a maioria das imagens é parecida com o que o modelo já acerta. A pergunta do ciclo de melhoria é **quais** imagens valem a anotação.

### Aprendizado ativo, sem mistério

A ideia: usar o próprio modelo para apontar onde ele está inseguro, e anotar isso primeiro. Critérios que funcionam para detecção:

- **Incerteza**: imagens com muitas detecções de confiança intermediária (entre 0,3 e 0,6). O modelo viu algo e não se decidiu.
- **Discordância**: imagens em que duas versões do modelo, ou o modelo com e sem aumentação no teste, dão respostas diferentes.
- **Novidade**: imagens distantes de tudo que há no dataset, medidas por *embeddings* (assunto do módulo de modelos de fundação). Pega celular novo, usina nova, praga nova.
- **Sinal do usuário**: toda correção feita por um técnico no aplicativo é uma anotação de altíssimo valor.

O experimento abaixo compara sortear imagens com escolher pela incerteza, medindo quantos **erros do modelo** cada estratégia captura com o mesmo orçamento de anotação.`,
        },
        {
          t: 'codigo',
          titulo: 'Sortear contra escolher pela incerteza',
          rodar: 'python',
          requerPython: ['cv2'],
          tempo: 150,
          codigo: `import numpy as np
import lab

rng = np.random.default_rng(0)

# 120 imagens "de produção", de dificuldade variada: algumas limpas, algumas sujas e densas
imagens = []
for s in range(120):
    dificil = rng.random() < 0.3
    cena = dict(insetos=int(rng.integers(50, 80)), detritos=int(rng.integers(20, 40)), aglomerado=0.6) if dificil \\
        else dict(insetos=int(rng.integers(10, 40)), detritos=int(rng.integers(0, 8)), aglomerado=0.2)
    _, gabarito, detritos = lab.amostra_com_gabarito("armadilha", semente=3000 + s, **cena)
    det = lab.detector_simulado(gabarito, detritos, "v1", semente=3000 + s)
    r = lab.casar(det, gabarito, conf_min=0.25)
    imagens.append(dict(
        erros=len(r["fp"]) + len(r["fn"]),                       # só se conhece depois de anotar
        incerteza=sum(1 for d in det if 0.3 <= d["conf"] <= 0.6),  # disponível ANTES de anotar
        deteccoes=sum(1 for d in det if d["conf"] >= 0.25),
        dificil=dificil,
    ))

total_erros = sum(i["erros"] for i in imagens)
ORCAMENTO = 24      # só dá para anotar 20% das imagens

def capturado(escolhidas):
    erros = sum(imagens[i]["erros"] for i in escolhidas)
    dificeis = sum(imagens[i]["dificil"] for i in escolhidas)
    return [f"{erros / total_erros:.0%}", f"{dificeis} de {ORCAMENTO}"]

sorteios = [capturado(rng.choice(len(imagens), ORCAMENTO, replace=False))[0] for _ in range(200)]
media_sorteio = np.mean([float(s.strip("%")) for s in sorteios])

por_incerteza = sorted(range(len(imagens)), key=lambda i: -imagens[i]["incerteza"])[:ORCAMENTO]
por_contagem = sorted(range(len(imagens)), key=lambda i: -imagens[i]["deteccoes"])[:ORCAMENTO]

lab.tabela([
    ["sorteio (média de 200)", f"{media_sorteio:.0f}%", f"cerca de {0.3 * ORCAMENTO:.0f} de {ORCAMENTO}"],
    ["mais detecções de confiança intermediária"] + capturado(por_incerteza),
    ["mais detecções no total"] + capturado(por_contagem),
], cabecalho=["como escolher 24 de 120 imagens", "erros do modelo capturados", "imagens difíceis escolhidas"])`,
        },
        {
          t: 'texto',
          md: `Com o mesmo orçamento, escolher pela incerteza captura mais que o dobro dos erros que o sorteio captura. É o argumento econômico do aprendizado ativo.

A terceira linha merece atenção: ordenar pelo **número total de detecções**, um critério que nem olha a confiança, vai quase tão bem. Neste conjunto, as imagens difíceis são também as mais cheias. Antes de montar um sistema sofisticado de seleção, vale testar o critério mais simples.

Duas ressalvas, para não trocar um vício por outro:

- **Só incerteza enviesa o dataset** para casos difíceis, e o modelo pode piorar nos fáceis. A prática é misturar: a maior parte escolhida por critério, e uma parte sorteada.
- **O conjunto de teste continua sendo sorteado**, da distribuição de produção. Teste montado com casos escolhidos pelo modelo mede outra coisa.

### Negativos difíceis

O falso positivo de confiança alta é o exemplo de treino mais valioso que existe: mostra exatamente o que o modelo confunde. O fluxo:

1. coletar, em produção, detecções de confiança alta que um revisor rejeitou;
2. incluir essas imagens no treino **sem caixa sobre o objeto confundido** (o resto da imagem, anotado normalmente);
3. medir, no teste fixo, se os falsos positivos daquele tipo caíram **sem** perder recall.

Imagem inteira sem nenhum objeto (fundo puro) também serve, em proporção pequena: a recomendação usual do Ultralytics é de até 10% do dataset.`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['O que versionar', 'Por quê', 'Como'],
          linhas: [
            ['Imagens e anotações', 'reproduzir qualquer treino antigo', 'manifesto com o hash de cada arquivo; DVC ou armazenamento por conteúdo'],
            ['A divisão treino/validação/teste', 'comparar versões no mesmo teste', 'lista de arquivos por conjunto, no repositório'],
            ['O guia de anotação', 'saber com que critério cada lote foi anotado', 'documento versionado, com data'],
            ['Configuração do treino', 'saber o que mudou entre v3 e v4', 'arquivo de configuração junto dos pesos'],
            ['Pesos e métricas', 'voltar atrás quando a versão nova regride', 'registro de modelos, com o relatório por fatia'],
          ],
        },
        {
          t: 'texto',
          md: `O teste de sanidade do versionamento é uma pergunta: **dá para retreinar hoje, bit a bit, o modelo que estava em produção há seis meses?** Se não dá, uma regressão descoberta amanhã não tem como ser investigada.

### Monitorar sem gabarito

Em produção não há anotação, então não há mAP. O que dá para acompanhar, por dia e por usina:

- **Distribuição das confianças**: se a fração de detecções abaixo de 0,5 dobra, algo mudou na entrada.
- **Contagem média por armadilha e por classe**: uma queda brusca numa usina pode ser entressafra, ou pode ser celular novo.
- **Taxa de recusa do portão de qualidade**: mede a captura, que costuma degradar antes do modelo.
- **Amostra auditada**: algumas imagens por semana, anotadas por uma pessoa, dão uma estimativa real de precisão e recall com intervalo de confiança.

Os três primeiros são alarmes baratos; o quarto é a medição. A lição de produção mostra como detectar a mudança de distribuição com um teste estatístico.`,
        },
        {
          t: 'quiz',
          pergunta: 'Por que não montar o conjunto de teste com as imagens escolhidas por incerteza do modelo?',
          opcoes: [
            'Porque são imagens demais.',
            'Porque o teste deixaria de representar a produção: ficaria concentrado em casos difíceis para aquele modelo, e a métrica não preveria o desempenho real nem seria justa com versões futuras.',
            'Porque imagens incertas não têm objetos.',
            'Porque a anotação delas é mais barata.',
          ],
          correta: 1,
          explicacao: 'Seleção pelo modelo é ótima para o treino e ruim para o teste. O teste precisa ser uma amostra da distribuição de uso, independente de qualquer modelo.',
        },
        {
          t: 'quiz',
          pergunta: 'Como se usa um negativo difícil no treino de um detector?',
          opcoes: [
            'Anotando o objeto confundido com uma classe "lixo".',
            'Incluindo a imagem com as anotações normais e NENHUMA caixa sobre o objeto confundido, para o modelo aprender que aquilo é fundo.',
            'Removendo a imagem do dataset.',
            'Subindo o limiar de confiança no treino.',
          ],
          correta: 1,
          explicacao: 'Em detecção, tudo que não tem caixa é tratado como fundo na perda. A ausência de anotação sobre a sujeira é o sinal de treino. Criar uma classe "lixo" também é possível, mas obriga a anotar toda a sujeira, com consistência.',
        },
      ],
    },
  ],
};
