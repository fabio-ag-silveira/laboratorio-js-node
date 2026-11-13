export const modulo = {
  id: 'pequenos',
  titulo: 'Objetos pequenos e cena densa',
  cor: '#f0736a',
  licoes: [
    // ------------------------------------------------------------------
    {
      id: 'por-que-somem',
      titulo: 'Por que objetos pequenos somem',
      minutos: 11,
      resumo: 'A conta que vai da foto do celular até a célula do mapa de características.',
      blocos: [
        {
          t: 'texto',
          md: `"O modelo não detecta os insetos pequenos" raramente é um problema de arquitetura. Quase sempre é uma conta de pixels que ninguém fez. Um objeto perde resolução em **dois lugares** antes de chegar à cabeça de detecção:

1. **Na entrada**: a foto de 4000 pixels é reduzida para os 640 do modelo. Tudo encolhe 6,25 vezes.
2. **No backbone**: o mapa mais fino usado na detecção tem stride 8. Cada célula resume 8×8 pixels da entrada.

Multiplique os dois: uma célula do mapa P3 cobre **50×50 pixels da foto original**. Um inseto de 30 pixels na foto ocupa pouco mais de meia célula.

As lições de CNN e de IoU mostraram as duas consequências: falta sinal para detectar, e falta tolerância para avaliar. O bloco abaixo faz a conta para a sua situação: mude os números e rode.`,
        },
        {
          t: 'codigo',
          titulo: 'Quantos pixels sobram, em cada estratégia',
          rodar: 'python',
          codigo: `import lab

FOTO = 4000          # lado maior da foto, em px
PX_POR_MM = 10       # escala da captura: quantos px da foto valem 1 mm
insetos_mm = {"tripes (1,5 mm)": 1.5, "mosca-branca (3 mm)": 3, "cigarrinha (6 mm)": 6, "mariposa (15 mm)": 15}

estrategias = {
    "foto inteira em 640": 640 / FOTO,
    "foto inteira em 1280": 1280 / FOTO,
    "fatias de 1280 em 640": 640 / 1280,
    "fatias de 640 em 640": 1.0,
}

linhas = []
for nome, mm in insetos_mm.items():
    na_foto = mm * PX_POR_MM
    linha = [nome, f"{na_foto:.0f} px"]
    for escala in estrategias.values():
        px = na_foto * escala
        # menos de ~1 célula no stride 8 (8 px) é a zona em que o recall despenca
        marca = " !!" if px < 8 else " !" if px < 16 else ""
        linha.append(f"{px:.1f}{marca}")
    linhas.append(linha)

lab.tabela(linhas, cabecalho=["inseto", "na foto"] + list(estrategias))
print()
print("!! = menos de 8 px na entrada (menos de uma célula no stride 8)")
print("!  = menos de 16 px (menos de duas células): detectável, mas frágil")`,
        },
        {
          t: 'texto',
          md: `A tabela costuma encerrar discussões. Se a espécie que interessa chega à entrada do modelo com 5 pixels, nenhuma troca de arquitetura resolve: o que resolve é mudar **quantos pixels chegam**.

### As alavancas, da mais barata para a mais cara

| Alavanca | Custo | Quando |
|---|---|---|
| Aproximar a câmera ou padronizar a distância | só processo | sempre que o protocolo permitir |
| Recortar a região de interesse antes de reduzir | um passo clássico (achar o cartão) | quando o cartão ocupa só parte da foto |
| Aumentar a resolução de entrada (640 → 1280) | 4× a computação e a memória | objetos entre 8 e 16 px |
| Fatiar a imagem | N inferências por foto | objetos abaixo de 8 px; fotos muito grandes |
| Nível P2 na cabeça (stride 4) | cerca de 4× os candidatos | objetos de 8 a 16 px depois de tudo acima |

A primeira linha merece destaque: **o ganho mais barato está na captura**. Uma foto tirada à metade da distância dobra os pixels de cada inseto, sem custo de computação.`,
        },
        {
          t: 'nota',
          estilo: 'campo',
          md: `**Treino e inferência têm de combinar na escala.** Um modelo treinado com insetos de 20 pixels e usado em fotos onde eles têm 8 vai mal, mesmo sendo "o mesmo inseto". Se a inferência usa fatias de 1280 reduzidas para 640, o treino deve ver fatias de 1280 reduzidas para 640. É o item que mais se perde quando alguém "só muda o imgsz" em produção.`,
        },
        {
          t: 'quiz',
          pergunta: 'Uma foto de 4000 px é reduzida para 640 px e passa por um detector cujo mapa mais fino tem stride 8. Quantos pixels da foto original cada célula desse mapa cobre, de lado?',
          opcoes: ['8', '32', '50', '6,25'],
          correta: 2,
          explicacao: 'A redução da entrada é de 4000/640 = 6,25 vezes. Cada célula do stride 8 cobre 8 px da entrada, ou 8 × 6,25 = 50 px da foto.',
        },
        {
          t: 'quiz',
          pergunta: 'A espécie-alvo chega à entrada do modelo com 5 pixels de lado, e o recall é ruim. Qual é a primeira coisa a mudar?',
          opcoes: [
            'Trocar o detector por um maior da mesma família.',
            'Aumentar o número de épocas.',
            'Fazer chegar mais pixels: aproximar a captura, recortar o cartão, subir a resolução ou fatiar.',
            'Baixar o limiar de confiança.',
          ],
          correta: 2,
          explicacao: 'Com 5 px o objeto ocupa menos de uma célula no mapa mais fino. Modelo maior tem os mesmos strides. O que muda o resultado é a quantidade de pixels por objeto na entrada.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'fatiamento',
      titulo: 'Fatiar a imagem (SAHI)',
      minutos: 13,
      resumo: 'Inferir pedaços em vez da foto inteira: o que se ganha, o que custa e o que dá errado nas emendas.',
      blocos: [
        {
          t: 'texto',
          md: `A ideia do **SAHI** (*Slicing Aided Hyper Inference*, 2022) é simples: em vez de espremer a foto inteira na entrada do modelo, cortá-la em fatias com sobreposição, inferir cada fatia e juntar as detecções.

No painel, a cena é uma foto de 4000×3000 pixels. Compare *foto inteira* com *fatiada*, mude o lado da fatia e zere a sobreposição para ver as emendas falharem.`,
        },
        { t: 'visual', componente: 'cv/sahi' },
        {
          t: 'texto',
          md: `### As três decisões

**1. Lado da fatia.** Define quantos pixels o objeto terá na entrada. Fatia menor aumenta o objeto e multiplica as inferências: reduzir o lado à metade quadruplica o custo.

**2. Sobreposição.** Tem de ser pelo menos do tamanho do **maior objeto** que você quer detectar. Com menos que isso, um inseto em cima da emenda fica partido nas duas fatias e não aparece inteiro em nenhuma. O valor usual, 20%, é só um ponto de partida.

**3. Como fundir.** Objetos na região de sobreposição são detectados duas vezes, e as caixas, convertidas para a coordenada da foto, precisam de um NMS **entre fatias**. Objetos partidos geram duas meias-caixas com IoU baixo entre si, que o NMS comum não funde. Por isso as implementações usam também fusão por **interseção sobre a menor área** (IoS), que pega a meia-caixa contida na caixa inteira.`,
        },
        {
          t: 'codigo',
          titulo: 'Fatiar, inferir, converter coordenadas e fundir',
          rodar: 'python',
          requerPython: ['cv2'],
          tempo: 120,
          codigo: `import numpy as np
import lab

def fatias(largura, altura, lado, sobreposicao):
    """Lista de (x0, y0, x1, y1) cobrindo a imagem, com sobreposição entre vizinhas."""
    passo = max(1, int(lado * (1 - sobreposicao)))
    saida = []
    for y in range(0, max(altura - lado, 0) + passo, passo):
        for x in range(0, max(largura - lado, 0) + passo, passo):
            x0, y0 = min(x, max(largura - lado, 0)), min(y, max(altura - lado, 0))
            if (x0, y0, x0 + lado, y0 + lado) not in saida:
                saida.append((x0, y0, min(x0 + lado, largura), min(y0 + lado, altura)))
    return saida

def recortar_caixa(c, f):
    """A parte da caixa que cai dentro da fatia, em coordenadas DA FATIA (ou None)."""
    x0, y0 = max(c["x"], f[0]), max(c["y"], f[1])
    x1, y1 = min(c["x"] + c["w"], f[2]), min(c["y"] + c["h"], f[3])
    if x1 - x0 < 3 or y1 - y0 < 3:
        return None
    visivel = (x1 - x0) * (y1 - y0) / (c["w"] * c["h"])
    return dict(classe=c["classe"], x=x0 - f[0], y=y0 - f[1], w=x1 - x0, h=y1 - y0, visivel=visivel)

def fundir(det, limiar=0.5):
    """NMS entre fatias, pela interseção sobre a MENOR área (pega meia-caixa dentro da inteira)."""
    det = sorted(det, key=lambda d: -d["conf"] * d["w"] * d["h"])     # prefere a caixa maior e confiante
    mantidas = []
    for d in det:
        for m in mantidas:
            ix = max(0, min(d["x"] + d["w"], m["x"] + m["w"]) - max(d["x"], m["x"]))
            iy = max(0, min(d["y"] + d["h"], m["y"] + m["h"]) - max(d["y"], m["y"]))
            if ix * iy / min(d["w"] * d["h"], m["w"] * m["h"]) > limiar:
                break
        else:
            mantidas.append(d)
    return mantidas

# cena grande: 1920x1440, com insetos de 8 a 50 px
W, H = 1920, 1440
_, gabarito, detritos = lab.amostra_com_gabarito("armadilha", semente=3, largura=W, altura=H, insetos=160, detritos=30)

def inferir_fatiado(lado, sobreposicao, entrada=640):
    todas = []
    lista = fatias(W, H, lado, sobreposicao)
    for k, f in enumerate(lista):
        escala = entrada / lado            # o modelo vê a fatia reduzida (ou não) para 640
        # o que o detector "enxerga" nesta fatia: caixas recortadas e na escala da entrada
        visiveis = [r for r in (recortar_caixa(c, f) for c in gabarito) if r and r["visivel"] > 0.4]
        na_entrada = [dict(r, x=r["x"] * escala, y=r["y"] * escala, w=r["w"] * escala, h=r["h"] * escala) for r in visiveis]
        for d in lab.detector_simulado(na_entrada, [], "v2", semente=100 + k, largura=entrada, altura=entrada):
            if d["origem"] == "fundo":
                continue
            # de volta: coordenada da entrada -> da fatia -> da foto
            todas.append(dict(d, x=d["x"] / escala + f[0], y=d["y"] / escala + f[1], w=d["w"] / escala, h=d["h"] / escala))
    return todas, len(lista)

linhas = []
for nome, lado, sobre in [("foto inteira", max(W, H), 0.0), ("fatias de 960, sem sobreposição", 960, 0.0),
                          ("fatias de 960, 20%", 960, 0.2), ("fatias de 640, 20%", 640, 0.2)]:
    cruas, n = inferir_fatiado(lado, sobre)
    finais = fundir(cruas)
    r = lab.casar(finais, gabarito, iou_min=0.5)
    tp, fp, fn = len(r["tp"]), len(r["fp"]), len(r["fn"])
    linhas.append([nome, n, len(cruas), len(finais), f"{tp / max(tp + fn, 1):.0%}", f"{tp / max(tp + fp, 1):.0%}"])

lab.tabela(linhas, cabecalho=["estratégia", "inferências", "caixas cruas", "após fundir", "recall", "precisão"])
print(f"objetos na cena: {len(gabarito)}, com lado médio de {np.mean([np.sqrt(c['w'] * c['h']) for c in gabarito]):.1f} px")`,
        },
        {
          t: 'texto',
          md: `Leia as colunas juntas. O recall sobe conforme a fatia diminui, porque cada inseto chega maior ao modelo: de 30% com a foto inteira para perto de 80% com fatias de 640. A coluna de **caixas cruas** mostra a duplicação nas sobreposições, e a de **após fundir**, o que sobra depois do NMS entre fatias.

Compare as duas linhas de fatias de 960. Com o mesmo lado, tirar a sobreposição custa dez pontos de recall: os insetos em cima da emenda aparecem recortados nas duas fatias, e meia-caixa não casa com o gabarito.

### Custo, sem ilusão

- **Tempo**: N fatias, N inferências. Inferir em lote ajuda, até o limite da memória da GPU.
- **Contexto**: cada fatia vê um pedaço. Um objeto maior que a fatia deixa de ser detectável. A prática é somar uma inferência da **foto inteira reduzida** às fatias, para os objetos grandes.
- **Bordas**: a fusão é mais uma etapa com limiares próprios, e mais um lugar para o resultado de produção divergir do de validação.

### Treinar fatiado

Se a inferência é fatiada, o treino também deve ser: recortam-se as imagens de treino em fatias do mesmo lado, com as anotações recortadas junto. Objeto com menos de uns 30% a 40% visível na fatia é descartado da anotação. Fatias sem nenhum objeto entram como **exemplo de fundo**, em proporção controlada.

A biblioteca \`sahi\`, que você tem instalada, faz o fatiamento e a fusão em volta de modelos Ultralytics, e o próprio Ultralytics traz exemplos de inferência fatiada. A lógica é a do bloco acima.`,
        },
        {
          t: 'quiz',
          pergunta: 'Com fatias de 640 px e sobreposição de 10% (64 px), o maior inseto tem 90 px. O que acontece com um inseto desses em cima de uma emenda?',
          opcoes: [
            'Nada: 10% é suficiente.',
            'Ele não cabe inteiro em nenhuma das duas fatias: aparece partido nas duas. A sobreposição precisa cobrir o maior objeto.',
            'Ele é detectado duas vezes e o NMS resolve.',
            'A fatia é redimensionada para caber.',
          ],
          correta: 1,
          explicacao: 'Para um objeto na emenda aparecer inteiro em pelo menos uma fatia, a sobreposição precisa ser maior ou igual ao tamanho dele. Com 64 px de sobreposição e objeto de 90 px, sobram duas detecções parciais.',
        },
        {
          t: 'quiz',
          pergunta: 'Por que a fusão entre fatias usa interseção sobre a menor área, além do IoU?',
          opcoes: [
            'Porque é mais rápida de calcular.',
            'Porque uma meia-caixa (objeto cortado numa fatia) tem IoU baixo com a caixa inteira (vista em outra fatia), mas está quase toda contida nela.',
            'Porque o IoU não funciona com caixas pequenas.',
            'Porque o SAHI não suporta NMS.',
          ],
          correta: 1,
          explicacao: 'Metade de uma caixa tem IoU 0,5 ou menos com a caixa completa, e escapa do NMS comum. A razão interseção/menor área fica perto de 1 e identifica a duplicata parcial.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'alternativas',
      titulo: 'Além do fatiamento: P2, perdas e contagem por densidade',
      minutos: 11,
      resumo: 'O que mexer dentro do modelo, e o que fazer quando caixa por objeto deixa de fazer sentido.',
      blocos: [
        {
          t: 'texto',
          md: `Depois de garantir que os pixels chegam, há ajustes dentro do modelo. Em ordem de retorno típico:

### 1. Nível P2 na cabeça

Acrescenta um mapa de **stride 4** à detecção. Um objeto de 12 pixels passa de 1,5 célula (no P3) para 3. O custo aparece no bloco abaixo: quatro vezes mais candidatos, mais memória e mais tempo de treino. O Ultralytics traz a variante pronta (\`yolo26-p2.yaml\`).

### 2. Atribuição pensada para objetos pequenos

Com atribuição por IoU, um objeto minúsculo pode não atingir o limiar com **nenhuma** previsão e ficar sem exemplo positivo: o modelo nunca é treinado nele. O **STAL** do YOLO26 ajusta a atribuição para garantir positivos a objetos pequenos.

### 3. Perda que não desaba com 1 pixel de erro

A lição de IoU mostrou a tabela: em 8 pixels, 2 de erro derrubam o IoU para 0,39. A **distância de Wasserstein normalizada** (NWD) trata cada caixa como uma gaussiana e mede a distância entre elas, que varia com suavidade mesmo sem sobreposição. Aparece em vários trabalhos de detecção de pragas em armadilha adesiva, combinada com fatiamento.

### 4. Aumentação a favor

Copiar e colar objetos pequenos em outras posições (*copy-paste*) aumenta o número de exemplos da classe difícil. E **desligar o mosaico** nas épocas finais (o \`close_mosaic\`) importa mais aqui que em outros domínios, porque o mosaico reduz cada imagem à metade.`,
        },
        {
          t: 'codigo',
          titulo: 'O custo do nível P2, medido na arquitetura',
          rodar: 'python',
          requerPython: ['ultralytics'],
          tempo: 150,
          codigo: `import logging, time
import torch
from ultralytics import YOLO
from ultralytics.utils import LOGGER
import lab

LOGGER.setLevel(logging.ERROR)
disp = lab.dispositivo()
x = torch.zeros(1, 3, 640, 640, device=disp)

linhas = []
for arquivo in ["yolo26n.yaml", "yolo26n-p2.yaml", "yolo26s.yaml", "yolo26s-p2.yaml"]:
    modelo = YOLO(arquivo).model.to(disp).eval()
    candidatos = sum((640 // int(s)) ** 2 for s in modelo.stride)
    with torch.no_grad():
        for _ in range(5):
            modelo(x)
        if disp == "cuda":
            torch.cuda.synchronize()
        t = time.perf_counter()
        for _ in range(30):
            modelo(x)
        if disp == "cuda":
            torch.cuda.synchronize()
    ms = (time.perf_counter() - t) / 30 * 1000
    linhas.append([arquivo.replace(".yaml", ""), [int(s) for s in modelo.stride], f"{candidatos:,}".replace(",", "."),
                   f"{sum(p.numel() for p in modelo.parameters()) / 1e6:.2f} M", f"{ms:.1f} ms"])

lab.tabela(linhas, cabecalho=["modelo", "strides", "candidatos (640 px)", "pesos", f"passada em {disp}"])
print()
print("Um objeto de 12 px ocupa 1,5 célula no stride 8 e 3 células no stride 4.")`,
        },
        {
          t: 'texto',
          md: `Os pesos quase não mudam; o que cresce é o número de candidatos e a conta sobre o mapa grande. P2 costuma compensar para objetos entre 8 e 16 pixels **depois** de a resolução de entrada estar resolvida. Antes disso, é pagar caro por um mapa fino de uma imagem que já chegou sem detalhe.

### Quando a caixa deixa de fazer sentido

Numa armadilha lotada, com centenas de insetos empilhados, nem um anotador humano consegue desenhar uma caixa por indivíduo. Insistir em detecção ali dá anotação inconsistente e métrica sem sentido. Existem formulações alternativas:

| Formulação | Anotação | Saída | Quando |
|---|---|---|---|
| Detecção | uma caixa por objeto | caixas | objetos separáveis, mesmo que encostados |
| Pontos | um clique por objeto | posições e contagem | muitos objetos pequenos; anotar caixa é caro |
| Mapa de densidade | pontos | um mapa cuja soma é a contagem | sobreposição extrema, multidões |
| Regressão direta | só o número por imagem | um número | quando só o total importa e não há como localizar |

A contagem por **mapa de densidade** vem da contagem de multidões: cada ponto anotado vira uma pequena gaussiana, a rede aprende a produzir o mapa, e a contagem é a integral dele. Perde-se a localização individual e a classificação fina; ganha-se robustez onde os objetos se fundem.

Na prática, sistemas maduros combinam: detecção nas armadilhas normais, e um **critério de saturação** ("esta armadilha passou do ponto em que a contagem é confiável") que troca a resposta por "acima de N" ou por uma estimativa de densidade. Dizer que não sabe contar ali é melhor que entregar um número errado com cara de exato.`,
        },
        {
          t: 'nota',
          estilo: 'campo',
          md: `**A saturação é uma informação agronômica.** Uma armadilha tão cheia que não dá para contar já ultrapassou qualquer nível de controle. Para a decisão de manejo, "mais de 200" e "237" levam à mesma ação. Vale conversar com quem usa o número antes de gastar meses tentando contar o incontável.`,
        },
        {
          t: 'quiz',
          pergunta: 'O que o nível P2 acrescenta a um detector, e qual é o custo?',
          opcoes: [
            'Um mapa de stride 64, para objetos enormes; custo desprezível.',
            'Um mapa de stride 4, em que objetos pequenos ocupam mais células; cerca de quatro vezes mais candidatos e mais computação.',
            'Um segundo backbone; o dobro dos pesos.',
            'NMS mais preciso; nenhum custo.',
          ],
          correta: 1,
          explicacao: 'P2 é o mapa de stride 4: 160×160 células numa entrada de 640, contra 80×80 do P3. O número de pesos mal muda; o custo vem da resolução do mapa.',
        },
        {
          t: 'quiz',
          pergunta: 'Em que situação um mapa de densidade é preferível à detecção por caixas?',
          opcoes: [
            'Quando é preciso classificar a espécie de cada indivíduo.',
            'Quando os objetos estão tão sobrepostos que não dá para anotar nem prever uma caixa por indivíduo, e o que importa é o total.',
            'Quando há poucos objetos grandes.',
            'Quando a imagem é em tons de cinza.',
          ],
          correta: 1,
          explicacao: 'O mapa de densidade abre mão de localizar e classificar cada indivíduo em troca de uma contagem robusta em sobreposição extrema. Com objetos separáveis, a detecção entrega mais informação.',
        },
      ],
    },
  ],
};
