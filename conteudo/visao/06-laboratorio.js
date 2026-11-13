export const modulo = {
  id: 'laboratorio',
  titulo: 'Laboratório: um detector de verdade',
  cor: '#7ec96a',
  licoes: [
    {
      id: 'treinar-e-avaliar',
      titulo: 'Treinar, avaliar e analisar um YOLO26',
      minutos: 30,
      resumo: 'Do dataset à análise de erro, com um modelo real treinando na sua GPU. Três blocos, rodados em ordem.',
      blocos: [
        {
          t: 'texto',
          md: `Os módulos anteriores usaram um detector simulado para isolar um conceito de cada vez. Aqui o ciclo roda inteiro com um modelo de verdade: **gerar o dataset, treinar, avaliar e olhar os erros**.

O dataset é sintético (as armadilhas geradas por código), o que tem duas vantagens para estudo: o gabarito é perfeito, então todo erro é do modelo; e você pode mudar a dificuldade (mais sujeira, mais aglomeração) e ver o efeito em minutos.

Os três blocos dependem um do outro. **Rode em ordem.** Tudo é gravado em \`modelos/\`, na raiz do projeto, que fica fora do git.`,
        },
        {
          t: 'nota',
          estilo: 'atencao',
          md: `O segundo bloco **baixa os pesos pré-treinados do YOLO26n** (cerca de 5 MB) na primeira execução, e treina por alguns minutos usando a GPU. Precisa de internet uma vez. Enquanto ele roda, o botão fica em "rodando…": é normal.`,
        },
        {
          t: 'codigo',
          titulo: '1. Gerar o dataset no formato YOLO',
          rodar: 'python',
          lento: true,
          requerPython: ['cv2'],
          tempo: 300,
          codigo: `import os, shutil
import cv2
import lab

CLASSES = ["mariposa", "cigarrinha", "mosca"]
raiz = os.path.join(os.path.dirname(lab.modelo("x")), "dataset-armadilhas")
shutil.rmtree(raiz, ignore_errors=True)

def gravar(parte, sementes):
    os.makedirs(os.path.join(raiz, "images", parte), exist_ok=True)
    os.makedirs(os.path.join(raiz, "labels", parte), exist_ok=True)
    objetos = 0
    for s in sementes:
        img, gabarito, _ = lab.amostra_com_gabarito("armadilha", semente=s, largura=640, altura=480,
                                                   insetos=28, detritos=10, aglomerado=0.35)
        h, w = img.shape[:2]
        cv2.imwrite(os.path.join(raiz, "images", parte, f"{s:05d}.jpg"), img, [cv2.IMWRITE_JPEG_QUALITY, 92])
        # formato YOLO: classe, centro x, centro y, largura, altura, tudo de 0 a 1
        with open(os.path.join(raiz, "labels", parte, f"{s:05d}.txt"), "w") as f:
            for c in gabarito:
                x0, y0 = max(0.0, c["x"]), max(0.0, c["y"])
                x1, y1 = min(w, c["x"] + c["w"]), min(h, c["y"] + c["h"])
                f.write(f"{CLASSES.index(c['classe'])} {(x0 + x1) / 2 / w:.6f} {(y0 + y1) / 2 / h:.6f} "
                        f"{(x1 - x0) / w:.6f} {(y1 - y0) / h:.6f}\\n")
        objetos += len(gabarito)
    return objetos

# A divisão é por ARMADILHA (por semente): nenhuma cena aparece nos dois lados.
# Os detritos NÃO são anotados: são fundo, e o modelo precisa aprender a ignorá-los.
n_treino = gravar("train", range(1000, 1240))
n_val = gravar("val", range(5000, 5060))

with open(os.path.join(raiz, "data.yaml"), "w", encoding="utf-8") as f:
    f.write(f"path: {raiz.replace(os.sep, '/')}\\ntrain: images/train\\nval: images/val\\n")
    f.write("names:\\n" + "".join(f"  {i}: {n}\\n" for i, n in enumerate(CLASSES)))

print("dataset em:", raiz)
print(f"treino: 240 imagens, {n_treino} objetos | validação: 60 imagens, {n_val} objetos")
exemplo = cv2.imread(os.path.join(raiz, "images", "train", "01000.jpg"))
lab.mostrar(exemplo, titulo="uma imagem de treino (640x480)")`,
        },
        {
          t: 'codigo',
          titulo: '2. Treinar o YOLO26n a partir dos pesos pré-treinados',
          rodar: 'python',
          lento: true,
          requerPython: ['ultralytics'],
          tempo: 900,
          codigo: `import os, time
from ultralytics import YOLO
import lab

base = os.path.dirname(lab.modelo("x"))
dados = os.path.join(base, "dataset-armadilhas", "data.yaml")
if not os.path.exists(dados):
    raise SystemExit("Rode antes o bloco 1, que gera o dataset.")

# Trabalhar dentro de modelos/: a biblioteca procura pesos na pasta atual, e sem
# isto ela baixaria o yolo26n.pt de novo a cada execução, para a pasta temporária.
os.chdir(base)
modelo = YOLO(lab.modelo("yolo26n.pt"))     # baixa os pesos na primeira vez
inicio = time.time()
modelo.train(
    data=dados,
    epochs=25,
    imgsz=640,
    batch=16,
    device=0 if lab.dispositivo() == "cuda" else "cpu",
    workers=0,            # no Windows, carregadores em subprocesso exigem um "if __name__ == '__main__'"
    project=os.path.join(base, "treinos"),
    name="armadilhas",
    exist_ok=True,        # reaproveita a pasta em vez de criar armadilhas2, armadilhas3...
    plots=False,
    verbose=False,
    seed=0,
)
print(f"treino concluído em {time.time() - inicio:.0f} s")

# o histórico de cada época fica em results.csv
import csv
with open(os.path.join(base, "treinos", "armadilhas", "results.csv")) as f:
    linhas = list(csv.DictReader(f))
chaves = {k.strip(): k for k in linhas[0]}
def col(nome):
    return chaves[nome]
tabela = [[l[col("epoch")].strip(), f"{float(l[col('train/box_loss')]):.3f}", f"{float(l[col('val/box_loss')]):.3f}",
           f"{float(l[col('metrics/mAP50(B)')]):.3f}", f"{float(l[col('metrics/mAP50-95(B)')]):.3f}"]
          for l in linhas if int(float(l[col("epoch")])) % 5 == 0 or l is linhas[-1]]
lab.tabela(tabela, cabecalho=["época", "perda caixa (treino)", "perda caixa (val)", "mAP@50", "mAP@50-95"])
print("pesos em:", os.path.join(base, "treinos", "armadilhas", "weights", "best.pt"))`,
        },
        {
          t: 'codigo',
          titulo: '3. Avaliar em armadilhas novas e classificar os erros',
          rodar: 'python',
          lento: true,
          requerPython: ['ultralytics'],
          tempo: 300,
          codigo: `import os
import numpy as np
from ultralytics import YOLO
import lab

base = os.path.dirname(lab.modelo("x"))
pesos = os.path.join(base, "treinos", "armadilhas", "weights", "best.pt")
if not os.path.exists(pesos):
    raise SystemExit("Rode antes o bloco 2, que treina o modelo.")

modelo = YOLO(pesos)
CLASSES = ["mariposa", "cigarrinha", "mosca"]

def prever(img, conf=0.001):
    r = modelo.predict(img, imgsz=640, conf=conf, verbose=False)[0]
    return [dict(classe=CLASSES[int(c)], conf=float(p), x=float(x1), y=float(y1), w=float(x2 - x1), h=float(y2 - y1))
            for (x1, y1, x2, y2), p, c in zip(r.boxes.xyxy.tolist(), r.boxes.conf.tolist(), r.boxes.cls.tolist())]

def avaliar(nome, conf=0.25, n=40, **cena):
    """Conjunto de teste NOVO: sementes que não estão nem no treino nem na validação."""
    tp = fp = fn = fp_sujeira = 0
    erros_contagem = []
    for s in range(9000, 9000 + n):
        img, gabarito, detritos = lab.amostra_com_gabarito("armadilha", semente=s, largura=640, altura=480, **cena)
        det = [d for d in prever(img) if d["conf"] >= conf]
        r = lab.casar(det, gabarito)
        tp += len(r["tp"]); fp += len(r["fp"]); fn += len(r["fn"])
        # falso positivo em cima de sujeira: a caixa cobre um detrito
        fp_sujeira += sum(1 for i in r["fp"] if any(lab.iou(det[i], d) > 0.3 for d in detritos))
        erros_contagem.append(len(det) - len(gabarito))
    e = np.array(erros_contagem)
    return [nome, f"{tp / max(tp + fp, 1):.1%}", f"{tp / max(tp + fn, 1):.1%}", fp, fp_sujeira, fn,
            f"{np.abs(e).mean():.2f}", f"{e.mean():+.2f}"]

lab.tabela([
    avaliar("igual ao treino", insetos=28, detritos=10, aglomerado=0.35),
    avaliar("o dobro de sujeira", insetos=28, detritos=20, aglomerado=0.35),
    avaliar("muito aglomerada", insetos=28, detritos=10, aglomerado=0.85),
    avaliar("densa (70 insetos)", insetos=70, detritos=10, aglomerado=0.5),
], cabecalho=["cenário de teste", "precisão", "recall", "FP", "FP em sujeira", "FN", "MAE contagem", "viés"])

# uma imagem, com os erros pintados
img, gabarito, detritos = lab.amostra_com_gabarito("armadilha", semente=9001, largura=640, altura=480,
                                                   insetos=70, detritos=10, aglomerado=0.5)
det = [d for d in prever(img) if d["conf"] >= 0.25]
r = lab.casar(det, gabarito)
saida = lab.desenhar_caixas(img, [det[i] for i, _, _ in r["tp"]], cor=(113, 204, 46), rotulo=False, espessura=1)
saida = lab.desenhar_caixas(saida, [det[i] for i in r["fp"]], cor=(60, 76, 231), rotulo=False)
saida = lab.desenhar_caixas(saida, [gabarito[k] for k in r["fn"]], cor=(15, 196, 241), rotulo=False)
print(f"imagem densa: {len(gabarito)} insetos, {len(r['tp'])} acertos, {len(r['fp'])} falsos positivos, {len(r['fn'])} perdidos")
lab.mostrar(saida, titulo="cena densa: verde = acerto, vermelho = falso positivo, amarelo = perdido")`,
        },
        {
          t: 'texto',
          md: `### Como ler o resultado

A tabela do bloco 3 avalia o mesmo modelo em quatro condições. A primeira linha é a que um relatório apressado mostraria: teste com a mesma distribuição do treino. As outras três são **mudanças de distribuição**, e é nelas que se descobre o que o modelo aprendeu de fato.

Perguntas para responder com os seus números:

1. Em qual cenário o recall mais cai? O que os objetos perdidos têm em comum, na imagem?
2. Dobrar a sujeira dobra os falsos positivos em sujeira? Se não, o modelo aprendeu a ignorá-la; se sim, ele precisa de mais exemplos negativos.
3. O viés de contagem muda de sinal entre os cenários? Se muda, um limiar único de confiança não serve para todos.

### Experimentos que valem a tarde

- **Dataset menor**: gere 40 imagens de treino em vez de 240 e compare. É a curva de aprendizado, o argumento mais forte para decidir se vale anotar mais.
- **Treino denso**: mude o bloco 1 para \`insetos=70, aglomerado=0.5\` e veja quanto o cenário denso melhora. É o princípio do módulo de dados: **o treino tem de conter o que a produção vai mostrar**.
- **Do zero**: troque \`"yolo26n.pt"\` por \`"yolo26n.yaml"\` no bloco 2 (pesos aleatórios) e compare o mAP na mesma época. É a transferência de aprendizado, medida.
- **Com a cabeça P2**: \`"yolo26n-p2.yaml"\` acrescenta o nível de stride 4. Compare o recall da classe menor.
- **Suas imagens**: se você tem um dataset real no formato YOLO, aponte o \`data\` do bloco 2 para o \`data.yaml\` dele. O bloco 3 precisa de adaptação, porque usa o gerador sintético.`,
        },
        {
          t: 'nota',
          estilo: 'campo',
          md: `**O que este laboratório não mostra.** Dado sintético é limpo demais: sem desfoque de movimento, sem reflexo, sem inseto parcialmente coberto de cola, sem anotação inconsistente. Os números daqui são otimistas, e o valor do exercício está no **procedimento**, que é o mesmo com dado real: dividir por cena, treinar, avaliar fora da distribuição, classificar os erros, decidir o próximo passo com base neles.`,
        },
        {
          t: 'quiz',
          pergunta: 'O modelo vai bem no teste "igual ao treino" e mal no cenário denso. Qual é a causa mais provável e o conserto?',
          opcoes: [
            'O modelo é pequeno demais; trocar por um maior.',
            'O treino quase não tinha cenas densas; incluir cenas densas no treino e manter um conjunto de teste denso para medir.',
            'O limiar de confiança está alto; baixar para 0,01.',
            'Faltaram épocas de treino.',
          ],
          correta: 1,
          explicacao: 'É descasamento entre treino e uso. O modelo só generaliza para o que viu parecido. Modelo maior e mais épocas atacam viés e variância dentro da mesma distribuição, e não essa lacuna.',
        },
      ],
    },
  ],
};
