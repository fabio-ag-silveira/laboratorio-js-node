export const modulo = {
  id: 'aprendizado',
  titulo: 'Fundamentos de deep learning',
  cor: '#f0c14b',
  licoes: [
    // ------------------------------------------------------------------
    {
      id: 'neuronio-mlp',
      titulo: 'Do neurônio à rede',
      minutos: 14,
      resumo: 'Soma ponderada, não linearidade e a regra da cadeia. O resto é escala.',
      blocos: [
        {
          t: 'texto',
          md: `A lição anterior terminou num limite: regras escritas à mão não dão conta de aparência. A saída é trocar "escrever a regra" por "ajustar parâmetros até a regra aparecer". Uma rede neural é a forma mais flexível de fazer isso.

A peça básica é o **neurônio**: uma soma ponderada das entradas, mais um viés, passada por uma função não linear.

\`\`\`
saída = f(w₁·x₁ + w₂·x₂ + ... + b)
\`\`\`

Sozinho, um neurônio só consegue separar o plano com **uma reta**. O poder vem de empilhar camadas: cada camada reorganiza o espaço para que a seguinte consiga separar com uma reta o que antes era curvo.

No painel abaixo há uma rede de verdade, com forward e backpropagation escritos à mão, treinando no seu navegador. Faça os três experimentos da lista.`,
        },
        { t: 'visual', componente: 'cv/rede' },
        {
          t: 'texto',
          md: `### Três experimentos

1. **O limite da reta.** Dados em *círculo*, rede *sem camada oculta*, treinar. O acerto estaciona perto de 65%: nenhuma reta separa o miolo do anel. Troque para *1 oculta de 4* e a fronteira se fecha em volta do centro.
2. **Decorar em vez de aprender.** Dados em *círculo*, *40 exemplos*, *ruído 0,25*, rede de *2 ocultas de 32*, taxa 1,0. Deixe rodar. A perda de treino segue caindo, a de validação desce e depois sobe. A fronteira ganha recortes em volta de pontos isolados.
3. **Freio.** No mesmo cenário, suba o *decaimento (L2)* para 0,02 e reinicie os pesos. A fronteira fica mais lisa e a validação para de piorar.

O segundo experimento é o motivo de existir conjunto de validação: a perda de treino sozinha diz que está tudo melhorando.`,
        },
        {
          t: 'nota',
          estilo: 'pegadinha',
          md: `**Por que precisa de não linearidade.** Empilhar camadas lineares dá outra camada linear: \`W₂·(W₁·x)\` é só \`(W₂·W₁)·x\`. Sem a função de ativação entre elas, dez camadas valem uma. É a tanh (ou a ReLU) que deixa a rede dobrar o espaço.`,
        },
        {
          t: 'texto',
          md: `### Como a rede aprende

Quatro passos, repetidos milhares de vezes:

1. **Forward**: passa os exemplos pela rede e obtém as previsões.
2. **Perda**: mede em um número quão erradas elas estão.
3. **Backward**: calcula, para cada peso, quanto a perda mudaria se ele mudasse um pouco. É o gradiente, obtido pela regra da cadeia de trás para a frente (backpropagation).
4. **Atualização**: move cada peso um pouco na direção que reduz a perda. O tamanho desse passo é a **taxa de aprendizado**.

O bloco abaixo faz isso em NumPy puro, e confere o gradiente analítico contra uma derivada numérica. Essa conferência (*gradient checking*) é o teste que pega erro de backpropagation escrita à mão.`,
        },
        {
          t: 'codigo',
          titulo: 'Uma rede em NumPy, com conferência do gradiente',
          rodar: 'python',
          codigo: `import numpy as np

rng = np.random.default_rng(0)

# dados: miolo (classe 0) e anel (classe 1)
n = 200
raio = np.where(np.arange(n) % 2 == 0, rng.uniform(0, 0.35, n), rng.uniform(0.55, 0.9, n))
ang = rng.uniform(0, 2 * np.pi, n)
X = np.stack([raio * np.cos(ang), raio * np.sin(ang)], axis=1)   # (200, 2)
y = (np.arange(n) % 2).astype(float)[:, None]                     # (200, 1)

# rede 2 -> 8 -> 1
W1, b1 = rng.normal(0, 0.8, (2, 8)), np.zeros(8)
W2, b2 = rng.normal(0, 0.8, (8, 1)), np.zeros(1)

def forward(W1, b1, W2, b2):
    h = np.tanh(X @ W1 + b1)                    # camada oculta
    p = 1 / (1 + np.exp(-(h @ W2 + b2)))        # sigmoide na saída
    perda = -np.mean(y * np.log(p + 1e-9) + (1 - y) * np.log(1 - p + 1e-9))
    return h, p, perda

def gradientes(W1, b1, W2, b2):
    h, p, _ = forward(W1, b1, W2, b2)
    d2 = (p - y) / n                 # sigmoide + entropia cruzada: o erro é (previsto - real)
    gW2, gb2 = h.T @ d2, d2.sum(0)
    d1 = (d2 @ W2.T) * (1 - h ** 2)  # regra da cadeia; derivada da tanh é 1 - tanh²
    return X.T @ d1, d1.sum(0), gW2, gb2

# conferência: derivada numérica de UM peso, por diferença central
gW1, *_ = gradientes(W1, b1, W2, b2)
eps = 1e-5
Wm, Wp = W1.copy(), W1.copy()
Wp[0, 3] += eps
Wm[0, 3] -= eps
numerico = (forward(Wp, b1, W2, b2)[2] - forward(Wm, b1, W2, b2)[2]) / (2 * eps)
print(f"gradiente analítico {gW1[0, 3]:+.8f} | numérico {numerico:+.8f}")

# treino por descida de gradiente
taxa = 1.0
for epoca in range(2001):
    gW1, gb1, gW2, gb2 = gradientes(W1, b1, W2, b2)
    W1 -= taxa * gW1; b1 -= taxa * gb1; W2 -= taxa * gW2; b2 -= taxa * gb2
    if epoca % 500 == 0:
        _, p, perda = forward(W1, b1, W2, b2)
        print(f"época {epoca:4d}  perda {perda:.4f}  acerto {np.mean((p > 0.5) == (y > 0.5)):.1%}")`,
        },
        {
          t: 'quiz',
          pergunta: 'Uma rede com três camadas lineares, sem função de ativação entre elas, equivale a quê?',
          opcoes: [
            'A uma rede três vezes mais expressiva que uma camada só.',
            'A uma única camada linear: a composição de transformações lineares é linear.',
            'A uma rede convolucional.',
            'A nada utilizável: o treino não converge sem ativação.',
          ],
          correta: 1,
          explicacao: 'O produto de matrizes é uma matriz. Sem não linearidade, a profundidade não acrescenta capacidade de representação, e a fronteira de decisão continua sendo uma reta (ou um hiperplano).',
        },
        {
          t: 'quiz',
          pergunta: 'A perda de treino cai sem parar, e a de validação caiu e voltou a subir. O que está acontecendo?',
          opcoes: [
            'Subajuste: a rede é pequena demais.',
            'A taxa de aprendizado está alta demais.',
            'Sobreajuste: a rede está memorizando particularidades do treino que não se repetem fora dele.',
            'Erro no cálculo do gradiente.',
          ],
          correta: 2,
          explicacao: 'O afastamento entre as duas curvas é a assinatura do sobreajuste. Taxa alta demais faria a própria perda de treino oscilar ou explodir. Subajuste apareceria como perda de treino alta.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'treino',
      titulo: 'Treinar: otimizador, taxa e diagnóstico',
      minutos: 14,
      resumo: 'O que cada botão do treino faz, e como ler as curvas para saber qual apertar.',
      blocos: [
        {
          t: 'texto',
          md: `Treinar um modelo grande é a mesma descida de gradiente da lição anterior, com três complicações práticas: os dados não cabem na memória de uma vez, a superfície da perda é irregular, e o treino dura horas. Cada hiperparâmetro existe por causa de uma delas.

### Lote (batch)

Em vez de calcular o gradiente com todos os dados, usa-se um **lote** sorteado. O gradiente fica ruidoso, e esse ruído ajuda: funciona como uma regularização leve. Lote maior dá gradiente mais estável e usa mais memória de GPU. Uma **época** é uma passada pelo conjunto inteiro.

### Otimizador

| Otimizador | Ideia | Quando |
|---|---|---|
| SGD | passo na direção do gradiente | base de comparação |
| SGD com momento | acumula velocidade, atravessa vales estreitos | detectores clássicos; generaliza bem |
| Adam | taxa própria para cada peso, ajustada pelo histórico | converge rápido com pouco ajuste |
| AdamW | Adam com o decaimento de peso aplicado do jeito certo | padrão atual para transformers e para muito detector |

### Taxa de aprendizado

É o hiperparâmetro que mais importa. Alta demais: a perda oscila ou explode. Baixa demais: o treino anda, mas não chega. Na prática ela não é fixa: começa com um **aquecimento** (sobe de quase zero nas primeiras épocas, para não destruir pesos pré-treinados) e depois **decai**, quase sempre em cosseno.`,
        },
        {
          t: 'codigo',
          titulo: 'Três taxas de aprendizado e dois otimizadores, lado a lado',
          rodar: 'python',
          requerPython: ['torch', 'matplotlib'],
          tempo: 120,
          codigo: `import torch, torch.nn as nn
import matplotlib.pyplot as plt
import lab

torch.manual_seed(0)

# dados: duas espirais entrelaçadas, um problema que exige várias dobras
n = 400
t = torch.rand(n) * 3.5 * torch.pi / 2 + 0.3
classe = torch.arange(n) % 2
raio = t / (1.8 * torch.pi)
X = torch.stack([raio * torch.cos(t + classe * torch.pi), raio * torch.sin(t + classe * torch.pi)], 1)
X = X + 0.03 * torch.randn_like(X)
y = classe.float().unsqueeze(1)

def treinar(otimizador, taxa, epocas=400):
    torch.manual_seed(1)   # mesma inicialização para todos: só o otimizador muda
    rede = nn.Sequential(nn.Linear(2, 32), nn.Tanh(), nn.Linear(32, 32), nn.Tanh(), nn.Linear(32, 1))
    opt = (torch.optim.SGD(rede.parameters(), lr=taxa, momentum=0.9) if otimizador == "sgd"
           else torch.optim.AdamW(rede.parameters(), lr=taxa))
    perdas = []
    for _ in range(epocas):
        for i in torch.randperm(n).split(64):          # lotes de 64
            perda = nn.functional.binary_cross_entropy_with_logits(rede(X[i]), y[i])
            opt.zero_grad()
            perda.backward()
            opt.step()
        perdas.append(nn.functional.binary_cross_entropy_with_logits(rede(X), y).item())
    acerto = ((rede(X) > 0) == (y > 0.5)).float().mean().item()
    return perdas, acerto

casos = [("sgd", 0.003), ("sgd", 0.1), ("sgd", 3.0), ("adamw", 0.0003), ("adamw", 0.01)]
fig, eixo = plt.subplots(figsize=(8.5, 4))
linhas = []
for otimizador, taxa in casos:
    perdas, acerto = treinar(otimizador, taxa)
    eixo.plot(perdas, label=f"{otimizador} lr={taxa}")
    linhas.append([otimizador, taxa, f"{perdas[-1]:.3f}", f"{acerto:.1%}"])
eixo.set_xlabel("época"); eixo.set_ylabel("perda"); eixo.set_ylim(0, 1.0); eixo.legend(); eixo.grid(alpha=0.3)

lab.tabela(linhas, cabecalho=["otimizador", "taxa", "perda final", "acerto"])
lab.mostrar(fig, titulo="mesma rede, mesmos dados, mesma inicialização")`,
        },
        {
          t: 'texto',
          md: `Repare em três coisas na tabela e no gráfico. A taxa pequena demais mal sai do lugar no mesmo número de épocas. A taxa grande demais não converge. E a faixa boa do AdamW fica ordens de grandeza abaixo da do SGD: **taxa de aprendizado não se transfere de um otimizador para outro**.

### Diagnóstico: o que fazer com o que as curvas mostram

A estrutura abaixo vem da tradição de "viés e variância", e é a que resolve mais rápido a pergunta "e agora, o que eu mudo?":`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Erro de treino', 'Erro de validação', 'Diagnóstico', 'O que ajuda', 'O que não ajuda'],
          linhas: [
            ['alto', 'alto', 'viés alto (subajuste)', 'modelo maior, treinar mais, reduzir regularização, entrada com mais resolução', 'mais dados'],
            ['baixo', 'alto', 'variância alta (sobreajuste)', 'mais dados, aumentação, decaimento de peso, modelo menor, parar antes', 'modelo maior'],
            ['baixo', 'baixo, mas ruim em produção', 'descasamento de dados', 'validação com dados iguais aos de produção; incluir esses dados no treino', 'mais épocas'],
            ['baixo', 'baixo', 'bom', 'parar de mexer e medir em produção', '—'],
          ],
        },
        {
          t: 'nota',
          estilo: 'campo',
          md: `**A terceira linha é a que mais custa em projeto real.** O modelo vai bem na validação e mal nas fotos que chegam do aplicativo, porque a validação saiu da mesma coleta do treino. Mais épocas, outro otimizador, outra arquitetura: nada disso mexe no ponteiro. A regra é montar o conjunto de validação e o de teste com dados **da distribuição que você quer acertar**, mesmo que sejam poucos, e deixar o resto para o treino.`,
        },
        {
          t: 'texto',
          md: `### Regularização em uma frase cada

- **Decaimento de peso**: puxa os pesos para zero a cada passo. Rede com pesos pequenos produz funções mais suaves.
- **Dropout**: desliga neurônios ao acaso no treino, para a rede não depender de nenhum caminho isolado. Comum em classificadores e transformers, raro em detectores convolucionais.
- **Aumentação de dados**: a mais eficaz em visão. Tem lição própria.
- **Parada antecipada**: guardar os pesos da época de melhor validação. É o que o \`best.pt\` do Ultralytics faz.
- **Normalização em lote (batch norm)**: mantém a escala das ativações estável entre camadas. Nasceu para acelerar o treino, e regulariza de brinde. Tem comportamento diferente em treino e em inferência, e por isso todo framework tem \`model.eval()\`.`,
        },
        {
          t: 'quiz',
          pergunta: 'Um detector tem mAP 0,95 no treino e 0,62 na validação. Qual ação tem mais chance de ajudar?',
          opcoes: [
            'Trocar para uma arquitetura maior.',
            'Treinar por mais épocas.',
            'Coletar e anotar mais dados, e reforçar a aumentação.',
            'Aumentar a taxa de aprendizado.',
          ],
          correta: 2,
          explicacao: 'Treino ótimo com validação ruim é variância alta. Modelo maior e mais épocas pioram o sobreajuste. O que reduz variância é mais dado, mais aumentação e mais regularização.',
        },
        {
          t: 'quiz',
          pergunta: 'Você trocou SGD por AdamW mantendo `lr=0.01`, e o treino ficou instável. Por quê?',
          opcoes: [
            'O AdamW não funciona com redes convolucionais.',
            'O AdamW normaliza o gradiente por peso, então o mesmo valor de taxa produz passos efetivos muito maiores: a faixa boa dele é bem mais baixa.',
            'O AdamW exige lote de tamanho 1.',
            'Faltou desligar o decaimento de peso.',
          ],
          correta: 1,
          explicacao: 'Em Adam, cada passo é dividido pela raiz da média dos gradientes ao quadrado, o que deixa o passo com magnitude próxima da própria taxa. Valores típicos ficam entre 1e-4 e 1e-3, contra 1e-2 do SGD.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'cnn',
      titulo: 'CNN por dentro',
      minutos: 15,
      resumo: 'Por que convolução, o que stride e campo receptivo fazem, e o que isso custa para objeto pequeno.',
      blocos: [
        {
          t: 'texto',
          md: `Ligar cada pixel a cada neurônio não escala: uma imagem de 640×640×3 tem 1,2 milhão de entradas, e uma única camada densa de 1000 neurônios teria 1,2 bilhão de pesos. A rede convolucional resolve isso com duas restrições que são verdadeiras para imagens:

- **Localidade**: o que identifica uma borda ou uma asa está em pixels vizinhos. Cada neurônio olha só uma janela pequena.
- **Compartilhamento de pesos**: um detector de borda útil no canto esquerdo é útil no direito. O mesmo kernel é usado na imagem inteira.

O resultado é a convolução da lição de filtros, com os números aprendidos. Uma camada com 64 kernels de 3×3 sobre 3 canais tem 64 × (3×3×3 + 1) = **1.792 pesos**, seja a imagem de 64 ou de 4000 pixels.

### A conta do tamanho de saída

\`\`\`
saída = (entrada + 2·padding − kernel) / stride + 1      (arredondando para baixo)
\`\`\`

Kernel 3 com padding 1 e stride 1 mantém o tamanho. Stride 2 divide por dois. Um backbone típico aplica cinco reduções por dois, chegando a **stride 32**: uma imagem de 640 vira um mapa de 20×20.`,
        },
        { t: 'visual', componente: 'cv/cnn' },
        {
          t: 'texto',
          md: `### O preço da redução

Reduzir o mapa é o que dá **contexto**: no stride 32, cada célula "enxerga" uma região grande da imagem (o campo receptivo). Mas é também o que apaga objeto pequeno. Use o controle de redução da foto: um inseto de 14 pixels numa foto reduzida quatro vezes fica com 3,5 pixels, menos de meia célula já no stride 8.

Esse é o conflito central da detecção de objetos pequenos, e ele volta num módulo próprio. Três famílias de solução, todas atacando a mesma conta:

- **não reduzir tanto a entrada**: treinar e inferir com resolução maior, ou fatiar a imagem em pedaços;
- **prever em mapas mais finos**: acrescentar um nível P2 (stride 4) à cabeça de detecção;
- **levar contexto para os mapas finos**: é o que a pirâmide de características (FPN) faz, misturando os mapas profundos, ricos em significado, com os rasos, ricos em posição.`,
        },
        {
          t: 'codigo',
          titulo: 'Formas, pesos e campo receptivo na prática',
          rodar: 'python',
          requerPython: ['torch'],
          tempo: 90,
          codigo: `import torch, torch.nn as nn
import lab

x = torch.zeros(1, 3, 640, 640)   # lote de 1, 3 canais, 640x640

camadas = [
    ("conv 3x3, 16 canais, stride 2", nn.Conv2d(3, 16, 3, stride=2, padding=1)),
    ("conv 3x3, 32 canais, stride 2", nn.Conv2d(16, 32, 3, stride=2, padding=1)),
    ("conv 3x3, 64 canais, stride 2", nn.Conv2d(32, 64, 3, stride=2, padding=1)),
    ("conv 3x3, 128 canais, stride 2", nn.Conv2d(64, 128, 3, stride=2, padding=1)),
    ("conv 3x3, 256 canais, stride 2", nn.Conv2d(128, 256, 3, stride=2, padding=1)),
]

linhas, campo, salto = [], 1, 1
for nome, camada in camadas:
    x = camada(x)
    campo += (3 - 1) * salto          # cada conv 3x3 soma 2 x (salto acumulado)
    salto *= 2
    pesos = sum(p.numel() for p in camada.parameters())
    linhas.append([nome, tuple(x.shape[1:]), f"{pesos:,}".replace(",", "."), salto, f"{campo} px"])

lab.tabela(linhas, cabecalho=["camada", "saída (C, H, W)", "pesos", "stride acum.", "campo receptivo"])

densa = 640 * 640 * 3 * 1000
print(f"uma camada densa de 1000 neurônios na mesma entrada: {densa:,} pesos".replace(",", "."))`,
        },
        {
          t: 'texto',
          md: `### As peças que aparecem em todo backbone

- **Convolução + normalização + ativação** é o bloco básico. No YOLO moderno a ativação é a SiLU; a ReLU ainda domina em modelos para hardware limitado.
- **Conexão residual** (ResNet, 2015): a saída do bloco é somada à entrada. O gradiente ganha um caminho direto até as primeiras camadas, e foi isso que permitiu treinar redes com dezenas ou centenas de camadas.
- **Convolução separável em profundidade** (MobileNet): troca uma conv 3×3 completa por uma 3×3 por canal seguida de uma 1×1 que mistura canais. Corta a conta em cerca de oito vezes, com alguma perda de precisão. É a base dos modelos para celular.
- **Pooling**: reduz o mapa ficando com o máximo ou a média de cada bloco. Nos backbones atuais a redução costuma ser feita por convolução com stride 2.

O bloco abaixo treina uma CNN pequena de verdade, na sua GPU, para separar recortes de inseto, de sujeira e de fundo. Depois mostra os kernels que a primeira camada aprendeu.`,
        },
        {
          t: 'codigo',
          titulo: 'Treinar uma CNN pequena e ver o que a primeira camada aprendeu',
          rodar: 'python',
          requerPython: ['torch', 'cv2'],
          tempo: 180,
          codigo: `import numpy as np, torch, torch.nn as nn
import lab

torch.manual_seed(0)
disp = lab.dispositivo()
print("dispositivo:", disp)

# recortes 32x32: 0 = fundo, 1 = inseto, 2 = detrito
X_tr, y_tr = lab.recortes(40, semente=0)
X_va, y_va = lab.recortes(15, semente=99)      # armadilhas diferentes das de treino

def tensor(X):   # BGR uint8 (N, H, W, C) -> RGB float (N, C, H, W) em 0..1
    return torch.from_numpy(X[..., ::-1].copy()).permute(0, 3, 1, 2).float().div(255)

Xt, yt = tensor(X_tr).to(disp), torch.from_numpy(y_tr).to(disp)
Xv, yv = tensor(X_va).to(disp), torch.from_numpy(y_va).to(disp)
print("treino:", tuple(Xt.shape), "| validação:", tuple(Xv.shape))

def bloco(entrada, saida):
    return [nn.Conv2d(entrada, saida, 3, padding=1), nn.GroupNorm(4, saida), nn.ReLU(), nn.MaxPool2d(2)]

rede = nn.Sequential(*bloco(3, 16), *bloco(16, 32), *bloco(32, 64),
                     nn.AdaptiveAvgPool2d(1), nn.Flatten(), nn.Linear(64, 3)).to(disp)
print("pesos:", sum(p.numel() for p in rede.parameters()))

opt = torch.optim.AdamW(rede.parameters(), lr=2e-3, weight_decay=1e-4)
for epoca in range(8):
    rede.train()
    for i in torch.randperm(len(Xt), device=disp).split(64):
        perda = nn.functional.cross_entropy(rede(Xt[i]), yt[i])
        opt.zero_grad(); perda.backward(); opt.step()
    rede.eval()
    with torch.no_grad():
        acerto_tr = (rede(Xt).argmax(1) == yt).float().mean().item()
        acerto_va = (rede(Xv).argmax(1) == yv).float().mean().item()
    print(f"época {epoca + 1}: perda {perda.item():.3f}  treino {acerto_tr:.1%}  validação {acerto_va:.1%}")

# matriz de confusão na validação
with torch.no_grad():
    previsto = rede(Xv).argmax(1).cpu().numpy()
nomes = ["fundo", "inseto", "detrito"]
matriz = np.zeros((3, 3), int)
for real, prev in zip(y_va, previsto):
    matriz[real, prev] += 1
lab.tabela([[nomes[i]] + list(matriz[i]) for i in range(3)], cabecalho=["real \\\\ previsto"] + nomes)

# os 16 kernels 3x3 da primeira camada, cada um normalizado para 0..1
k = rede[0].weight.detach().cpu()
k = (k - k.amin(dim=(1, 2, 3), keepdim=True)) / (k.amax(dim=(1, 2, 3), keepdim=True) - k.amin(dim=(1, 2, 3), keepdim=True) + 1e-9)
painel = np.ones((2 * 4 + 1, 8 * 4 + 1, 3), np.float32)
for i in range(16):
    l, c = divmod(i, 8)
    painel[1 + l * 4: 4 + l * 4, 1 + c * 4: 4 + c * 4] = k[i].permute(1, 2, 0).numpy()
lab.mostrar(painel, rgb=True, titulo="os 16 kernels 3x3 aprendidos pela primeira camada")
lab.mostrar(*[X_va[y_va == c][0] for c in range(3)], titulos=["um fundo", "um inseto", "um detrito"])`,
        },
        {
          t: 'nota',
          estilo: 'dica',
          md: `Leia a matriz de confusão antes do acerto geral. O erro que interessa é a linha **detrito** caindo na coluna **inseto**: é o falso positivo do seu problema real, isolado num experimento de segundos. Classificador de recortes como este também tem uso em produção, como segundo estágio barato para confirmar as detecções duvidosas de um detector.`,
        },
        {
          t: 'nota',
          estilo: 'pegadinha',
          md: `**Por que GroupNorm e não BatchNorm neste código.** A primeira versão deste bloco usava BatchNorm, e o acerto de avaliação oscilava entre 50% e 99% de uma época para a outra, com a perda de treino sempre baixa. A BatchNorm normaliza com as estatísticas **do lote** durante o treino e com uma **média acumulada** na avaliação; quando as duas divergem, o modelo que treina bem avalia mal. A GroupNorm calcula as estatísticas por imagem, faz a mesma conta nos dois modos, e o treino ficou estável. Se um modelo seu vai bem em \`train()\` e mal em \`eval()\`, a BatchNorm é a primeira suspeita: lote pequeno demais, treino curto demais, ou dados de inferência com estatística diferente da do treino.`,
        },
        {
          t: 'quiz',
          pergunta: 'Uma camada convolucional com 32 kernels 3×3 recebe um mapa de 16 canais. Quantos pesos ela tem (com viés)?',
          opcoes: ['32 × 9 = 288', '32 × (3×3×16 + 1) = 4.640', '16 × 32 = 512', 'Depende do tamanho da imagem.'],
          correta: 1,
          explicacao: 'Cada kernel cobre 3×3 posições em todos os 16 canais de entrada (144 pesos) mais 1 viés. São 32 kernels: 32 × 145 = 4.640. O tamanho da imagem não entra na conta, e é essa a vantagem do compartilhamento de pesos.',
        },
        {
          t: 'quiz',
          pergunta: 'Por que um objeto de 6 pixels é difícil de detectar num mapa de stride 32?',
          opcoes: [
            'Porque o campo receptivo é pequeno demais para vê-lo.',
            'Porque ele ocupa menos de um quinto de uma célula, que representa também fundo e vizinhos: sobra pouco sinal dele.',
            'Porque redes convolucionais não detectam objetos escuros.',
            'Porque o stride 32 só existe em classificadores.',
          ],
          correta: 1,
          explicacao: 'No stride 32, cada célula resume 32×32 pixels. Um objeto de 6 px contribui com uma fração mínima da célula. O campo receptivo nesse nível é grande, não pequeno: o problema é a resolução espacial.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'aumentacao',
      titulo: 'Aumentação de dados',
      minutos: 12,
      resumo: 'Fabricar variação plausível. E reconhecer quando a aumentação ensina um mundo que não existe.',
      blocos: [
        {
          t: 'texto',
          md: `Aumentação é a regularização mais eficaz em visão: cada imagem do treino aparece de um jeito um pouco diferente a cada época, e o modelo deixa de poder decorar. Mas ela só ajuda sob uma condição:

> A transformação precisa produzir uma imagem que **poderia ter vindo do mundo real**, e a anotação precisa continuar correta.

Mexa nos controles e leia os avisos. O atalho *exagerada* quebra as duas partes da regra de uma vez.`,
        },
        { t: 'visual', componente: 'cv/aumentacoes' },
        {
          t: 'texto',
          md: `### Os hiperparâmetros do Ultralytics, lidos para armadilhas

O bloco abaixo lê os valores padrão direto da biblioteca instalada na sua máquina. A tabela seguinte diz o que cada um faz e onde mora o risco neste domínio.`,
        },
        {
          t: 'codigo',
          titulo: 'Os valores padrão de aumentação do Ultralytics instalado',
          rodar: 'python',
          requerPython: ['ultralytics'],
          tempo: 90,
          codigo: `from ultralytics import __version__
from ultralytics.cfg import get_cfg
import lab

cfg = get_cfg()
nomes = ["hsv_h", "hsv_s", "hsv_v", "degrees", "translate", "scale", "shear", "perspective",
         "flipud", "fliplr", "mosaic", "close_mosaic", "mixup", "copy_paste", "erasing"]
print("ultralytics", __version__)
lab.tabela([[n, getattr(cfg, n, "(não existe nesta versão)")] for n in nomes], cabecalho=["hiperparâmetro", "padrão"])`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Hiperparâmetro', 'O que faz', 'Leitura para armadilhas'],
          linhas: [
            ['hsv_h', 'gira o matiz', 'Manter baixo. O cartão tem uma cor só; girar muito cria cartões que não existem.'],
            ['hsv_s, hsv_v', 'varia saturação e brilho', 'Úteis: a iluminação de campo varia de verdade.'],
            ['degrees', 'rotação', 'Inseto pousa em qualquer ângulo, então faz sentido. Mas a caixa alinhada aos eixos incha com a rotação.'],
            ['translate, scale', 'desloca e muda a escala', 'Escala para baixo encolhe objeto que já é pequeno. Se a captura é padronizada, reduza a faixa.'],
            ['fliplr, flipud', 'espelha', 'Seguros aqui: não há "em cima" nem "esquerda" numa armadilha vista de frente.'],
            ['mosaic', 'junta 4 imagens numa', 'Varia o contexto, mas cada imagem entra reduzida. Desligado nas épocas finais (close_mosaic).'],
            ['mixup, copy_paste', 'mistura imagens; cola objetos de uma em outra', 'copy_paste ajuda classe rara. mixup gera insetos semitransparentes, pouco plausíveis.'],
          ],
        },
        {
          t: 'texto',
          md: `### Medindo o efeito

Aumentação se justifica por experimento, não por lista de boas práticas. O bloco abaixo treina o classificador de recortes duas vezes, sem e com variação de brilho, e avalia os dois em fotos normais e em fotos **bem mais escuras** do que qualquer uma do treino.`,
        },
        {
          t: 'codigo',
          titulo: 'Aumentação de brilho contra mudança de iluminação',
          rodar: 'python',
          requerPython: ['torch', 'cv2'],
          tempo: 240,
          codigo: `import numpy as np, torch, torch.nn as nn
import lab

disp = lab.dispositivo()

def tensor(X):
    return torch.from_numpy(X[..., ::-1].copy()).permute(0, 3, 1, 2).float().div(255).to(disp)

X_tr, y_tr = lab.recortes(40, semente=0)
X_normal, y_normal = lab.recortes(15, semente=99)
X_escuro, y_escuro = lab.recortes(15, semente=99, brilho=0.45)   # mesma cena, com 45% da luz

Xt, yt = tensor(X_tr), torch.from_numpy(y_tr).to(disp)

def treinar(com_aumentacao):
    torch.manual_seed(0)
    def bloco(e, s):
        return [nn.Conv2d(e, s, 3, padding=1), nn.GroupNorm(4, s), nn.ReLU(), nn.MaxPool2d(2)]
    rede = nn.Sequential(*bloco(3, 16), *bloco(16, 32), *bloco(32, 64),
                         nn.AdaptiveAvgPool2d(1), nn.Flatten(), nn.Linear(64, 3)).to(disp)
    opt = torch.optim.AdamW(rede.parameters(), lr=2e-3, weight_decay=1e-4)
    for _ in range(10):
        rede.train()
        for i in torch.randperm(len(Xt), device=disp).split(64):
            lote = Xt[i]
            if com_aumentacao:
                # brilho sorteado por imagem, entre 35% e 130%, e espelhamento
                ganho = torch.empty(len(i), 1, 1, 1, device=disp).uniform_(0.35, 1.3)
                lote = (lote * ganho).clamp(0, 1)
                if torch.rand(1).item() < 0.5:
                    lote = lote.flip(3)
            perda = nn.functional.cross_entropy(rede(lote), yt[i])
            opt.zero_grad(); perda.backward(); opt.step()
    rede.eval()
    return rede

def acerto(rede, X, y):
    with torch.no_grad():
        return (rede(tensor(X)).argmax(1).cpu().numpy() == y).mean()

linhas = []
for nome, com in [("sem aumentação", False), ("com brilho e espelho", True)]:
    rede = treinar(com)
    linhas.append([nome, f"{acerto(rede, X_normal, y_normal):.1%}", f"{acerto(rede, X_escuro, y_escuro):.1%}"])

lab.tabela(linhas, cabecalho=["treino", "fotos normais", "fotos escuras"])
lab.mostrar(X_normal[y_normal == 1][0], X_escuro[y_escuro == 1][0], titulos=["normal", "escura (45% da luz)"])`,
        },
        {
          t: 'texto',
          md: `Nas fotos normais os dois modelos empatam. Nas escuras, o que nunca viu variação de brilho desaba, e o outro se mantém. Aumentação raramente melhora o número no conjunto de validação que veio da mesma coleta: o que ela compra é **robustez a condições que o treino não cobriu**. Se você só mede na validação de sempre, conclui que ela não serve para nada.

Daí o corolário: para saber se uma aumentação vale a pena, é preciso um conjunto de teste que contenha a variação em questão.`,
        },
        {
          t: 'quiz',
          pergunta: 'Qual destas aumentações é a mais arriscada para um detector de dígitos em placas de identificação?',
          opcoes: ['Variação de brilho.', 'Espelhamento horizontal.', 'Pequena translação.', 'Leve desfoque.'],
          correta: 1,
          explicacao: 'Espelhar muda o significado: um 2 espelhado não é um 2, e vários caracteres viram outros. A aumentação precisa preservar o rótulo. Numa armadilha de insetos o espelhamento é seguro; em texto, não.',
        },
        {
          t: 'quiz',
          pergunta: 'Você adicionou aumentação forte de brilho e o mAP na validação ficou igual. O que concluir?',
          opcoes: [
            'Que a aumentação é inútil e deve ser removida.',
            'Nada ainda: se a validação tem a mesma iluminação do treino, ela não mede robustez à iluminação. É preciso testar em fotos com iluminação diferente.',
            'Que o modelo já está sobreajustado.',
            'Que a taxa de aprendizado precisa aumentar.',
          ],
          correta: 1,
          explicacao: 'A aumentação protege contra mudança de distribuição. Um conjunto de validação da mesma distribuição do treino não consegue mostrar esse ganho.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'transferencia',
      titulo: 'Transferência, fine-tuning e esquecimento',
      minutos: 13,
      resumo: 'Partir de pesos prontos, e o cuidado que o ciclo de melhoria contínua exige.',
      blocos: [
        {
          t: 'texto',
          md: `Quase nenhum detector é treinado do zero. Parte-se de pesos **pré-treinados** num conjunto grande e genérico (ImageNet, COCO, Objects365) e continua-se o treino nos dados do problema. Funciona porque as primeiras camadas de qualquer rede de visão aprendem a mesma coisa (bordas, cantos, texturas), e isso serve para inseto tanto quanto para carro.

### As escolhas

| Estratégia | Como | Quando |
|---|---|---|
| Extração de características | congela o backbone, treina só a cabeça | pouquíssimos dados; domínio parecido com o do pré-treino |
| Fine-tuning completo | treina tudo, com taxa baixa | o caso comum; é o padrão do Ultralytics |
| Descongelamento gradual | começa pela cabeça, libera o backbone depois | dados poucos e domínio distante |
| Do zero | inicialização aleatória | muito dado, ou entrada que não é imagem RGB comum |

Dois cuidados valem para todas: a **taxa de aprendizado é menor** que num treino do zero, para não destruir o que os pesos já sabem, e o **pré-processamento tem de ser o do pré-treino** (mesma normalização, mesma ordem de canais).`,
        },
        {
          t: 'texto',
          md: `### O ciclo de versões e o esquecimento

Seu fluxo real é outro tipo de transferência: chegam imagens novas de produção, você reanota e treina a versão N+1 **a partir da versão N**. É eficiente, e tem uma armadilha conhecida: o **esquecimento catastrófico**. Treinar só com os dados novos melhora o modelo neles e piora no que ele já sabia, sem aviso, porque ninguém está medindo o antigo.

O experimento abaixo reproduz isso em segundos. A condição A são fotos com iluminação normal. A condição B são fotos escuras, a "novidade de produção". Compare três jeitos de produzir a versão 2.`,
        },
        {
          t: 'codigo',
          titulo: 'Fine-tuning só com dados novos contra dados novos + antigos',
          rodar: 'python',
          requerPython: ['torch', 'cv2'],
          tempo: 300,
          codigo: `import copy
import numpy as np, torch, torch.nn as nn
import lab

disp = lab.dispositivo()

def tensor(X):
    return torch.from_numpy(X[..., ::-1].copy()).permute(0, 3, 1, 2).float().div(255).to(disp)

# condição A: iluminação normal.  condição B: fotos com 40% da luz
XA, yA = lab.recortes(40, semente=0)
XB, yB = lab.recortes(12, semente=7, brilho=0.4)      # poucos dados novos, como em produção
testeA = lab.recortes(15, semente=99)
testeB = lab.recortes(15, semente=98, brilho=0.4)

def nova_rede():
    torch.manual_seed(0)
    def bloco(e, s):
        return [nn.Conv2d(e, s, 3, padding=1), nn.GroupNorm(4, s), nn.ReLU(), nn.MaxPool2d(2)]
    return nn.Sequential(*bloco(3, 16), *bloco(16, 32), *bloco(32, 64),
                         nn.AdaptiveAvgPool2d(1), nn.Flatten(), nn.Linear(64, 3)).to(disp)

def treinar(rede, X, y, epocas, taxa):
    Xt, yt = tensor(X), torch.from_numpy(y).to(disp)
    opt = torch.optim.AdamW(rede.parameters(), lr=taxa, weight_decay=1e-4)
    for _ in range(epocas):
        rede.train()
        for i in torch.randperm(len(Xt), device=disp).split(64):
            perda = nn.functional.cross_entropy(rede(Xt[i]), yt[i])
            opt.zero_grad(); perda.backward(); opt.step()
    return rede.eval()

def acerto(rede, par):
    X, y = par
    with torch.no_grad():
        return f"{(rede(tensor(X)).argmax(1).cpu().numpy() == y).mean():.1%}"

v1 = treinar(nova_rede(), XA, yA, epocas=8, taxa=2e-3)

# três candidatas a versão 2, todas partindo da v1
so_novos = treinar(copy.deepcopy(v1), XB, yB, epocas=10, taxa=1e-3)
misturado = treinar(copy.deepcopy(v1), np.concatenate([XA, XB]), np.concatenate([yA, yB]), epocas=10, taxa=1e-3)
# só uma amostra do antigo junto: o "replay" de quem não pode retreinar com tudo
amostra = np.random.default_rng(0).choice(len(XA), len(XB), replace=False)
com_replay = treinar(copy.deepcopy(v1), np.concatenate([XA[amostra], XB]),
                     np.concatenate([yA[amostra], yB]), epocas=10, taxa=1e-3)

lab.tabela([
    ["v1 (treinada só em A)", acerto(v1, testeA), acerto(v1, testeB)],
    ["v2: fine-tuning só com B", acerto(so_novos, testeA), acerto(so_novos, testeB)],
    ["v2: fine-tuning com A + B", acerto(misturado, testeA), acerto(misturado, testeB)],
    ["v2: B + amostra de A do mesmo tamanho", acerto(com_replay, testeA), acerto(com_replay, testeB)],
], cabecalho=["modelo", "teste A (normal)", "teste B (escuro)"])
print(f"dados: A = {len(XA)} recortes, B = {len(XB)} recortes")`,
        },
        {
          t: 'texto',
          md: `Leia a tabela pelas colunas. No teste B, toda versão 2 ganha da v1: se você medisse só nos dados novos, as três pareceriam igualmente boas. A diferença está na coluna A. O fine-tuning **só com os dados novos** despenca no que a v1 já fazia: 33% é o acerto de quem responde sempre a mesma classe entre três. O modelo não ficou "um pouco pior" no cenário antigo, ele o esqueceu. Misturar o antigo, mesmo numa amostra do tamanho dos dados novos, mantém os dois.

### Regras para o ciclo de melhoria contínua

1. **Nunca treine a versão nova só com os dados novos.** Misture o conjunto antigo inteiro ou uma amostra representativa dele.
2. **Mantenha um conjunto de teste fixo por condição** (um "conjunto de ouro" para cada cenário que importa) e avalie toda versão em todos. Regressão em cenário antigo é motivo para não publicar.
3. **Compare duas rotas a cada ciclo**: partir da versão anterior e partir do pré-treinado original com todos os dados. A primeira é mais barata; a segunda evita acumular vícios de várias gerações de fine-tuning. Quando a segunda ganha, é hora de recomeçar a linhagem.
4. **Reanotar muda o gabarito.** Se o critério de anotação mudou entre versões, as métricas antigas e novas não são comparáveis. Reanote também o conjunto de teste e reavalie a versão antiga nele.`,
        },
        {
          t: 'nota',
          estilo: 'entrevista',
          md: `**Pergunta frequente:** "quando congelar o backbone?". Quando há poucos dados e o domínio é próximo do pré-treino, para não sobreajustar e para treinar rápido. Com dados suficientes ou domínio distante (imagem médica, térmica, macro de insetos), o fine-tuning completo com taxa baixa costuma ganhar. A resposta boa termina dizendo que se decide **medindo as duas opções** no conjunto de validação.`,
        },
        {
          t: 'quiz',
          pergunta: 'A v2 foi treinada a partir da v1 só com as 300 imagens novas de produção. No conjunto de teste montado com imagens novas, ela é melhor que a v1. Pode publicar?',
          opcoes: [
            'Sim: melhorou no teste.',
            'Ainda não: falta avaliar no conjunto de teste das condições antigas, porque fine-tuning só com dados novos pode causar esquecimento.',
            'Não: fine-tuning a partir de versão anterior nunca funciona.',
            'Sim, desde que a taxa de aprendizado tenha sido baixa.',
          ],
          correta: 1,
          explicacao: 'O teste novo mede o que a v2 ganhou. Ele não mede o que ela pode ter perdido. Sem avaliar nos cenários antigos, a regressão passa despercebida até aparecer em produção.',
        },
        {
          t: 'quiz',
          pergunta: 'Por que o fine-tuning usa taxa de aprendizado menor que o treino do zero?',
          opcoes: [
            'Porque redes pré-treinadas têm menos parâmetros.',
            'Para o treino durar menos.',
            'Porque os pesos já estão num ponto bom: passos grandes os tirariam de lá e destruiriam o que foi aprendido no pré-treino.',
            'Porque a GPU aquece menos.',
          ],
          correta: 2,
          explicacao: 'O valor do pré-treino está nos pesos. Taxa alta no início do fine-tuning equivale a reinicializar boa parte da rede. É também a razão do aquecimento da taxa nas primeiras épocas.',
        },
      ],
    },
  ],
};
