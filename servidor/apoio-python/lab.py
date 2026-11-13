"""
lab — módulo de apoio do laboratório para os blocos de Python.

Todo bloco de Python executado pelo laboratório pode fazer `import lab`.
Ele resolve três coisas que um script solto não tem:

    lab.mostrar(img)          manda uma imagem para a tela do laboratório
    lab.amostra("armadilha")  devolve uma imagem de exemplo, gerada por código
    lab.imagem("foto.jpg")    lê uma foto SUA, da pasta imagens/ do projeto

Como a imagem chega na tela: `mostrar` grava um PNG na pasta temporária do
processo e imprime uma linha-marcador no stdout. O servidor Node, que está
lendo esse stdout, troca o marcador pela imagem. É um protocolo de uma linha —
e é assim, por texto, que processos de linguagens diferentes costumam conversar.

As imagens de exemplo são SINTÉTICAS de propósito: o repositório é público, e
foto de armadilha de cliente não é coisa que se publique. De quebra, imagem
gerada por código tem gabarito exato — sabemos onde está cada inseto.
"""

from __future__ import annotations

import math
import os
import sys

import numpy as np

try:
    import cv2
except ImportError:  # o laboratório funciona sem OpenCV, mas com menos recursos
    cv2 = None

_MARCADOR = "\x1eLAB:IMG:"
_PASTA_SAIDA = os.environ.get("LAB_SAIDA", ".")
_PASTA_IMAGENS = os.environ.get("LAB_IMAGENS", "imagens")
_PASTA_MODELOS = os.environ.get("LAB_MODELOS", "modelos")
_contador = 0

# Cores em BGR (a ordem do OpenCV), uma por classe.
CORES = {
    "mariposa": (60, 76, 231),
    "cigarrinha": (219, 152, 52),
    "mosca": (113, 204, 46),
    "detrito": (160, 160, 160),
    "gabarito": (113, 204, 46),
    "predicao": (60, 76, 231),
}


# --------------------------------------------------------------------------
#  Mostrar
# --------------------------------------------------------------------------

def _para_bgr(img, rgb: bool) -> np.ndarray:
    """Converte "qualquer coisa que pareça imagem" para uint8 em BGR ou cinza."""
    # tensor do PyTorch: (C, H, W) em RGB, normalmente float
    if hasattr(img, "detach") and hasattr(img, "cpu"):
        img = img.detach().cpu().float().numpy()
        if img.ndim == 3 and img.shape[0] in (1, 3):
            img = np.transpose(img, (1, 2, 0))
        rgb = True

    # imagem da PIL: sempre RGB
    if hasattr(img, "convert") and hasattr(img, "size") and not isinstance(img, np.ndarray):
        img = np.array(img.convert("RGB"))
        rgb = True

    a = np.asarray(img)
    if a.ndim == 3 and a.shape[2] == 1:
        a = a[:, :, 0]
    if a.ndim not in (2, 3):
        raise ValueError(f"lab.mostrar: esperava imagem 2D ou 3D, recebi formato {a.shape}")

    if a.dtype == bool:
        a = a.astype(np.uint8) * 255
    elif a.dtype != np.uint8:
        a = a.astype(np.float32)
        # float entre 0 e 1 é a convenção de PyTorch/scikit-image
        if a.size and float(np.nanmax(a)) <= 1.0 and float(np.nanmin(a)) >= 0.0:
            a = a * 255.0
        a = np.clip(np.nan_to_num(a), 0, 255).astype(np.uint8)

    if a.ndim == 3 and rgb:
        a = a[:, :, ::-1]  # RGB -> BGR
    return np.ascontiguousarray(a)


def _emitir(a: np.ndarray, titulo: str, largura_max: int) -> None:
    global _contador
    if cv2 is None:
        raise RuntimeError("lab.mostrar precisa do OpenCV:  pip install opencv-python")

    h, w = a.shape[:2]
    # imagem minúscula (um kernel 3x3, um recorte): amplia SEM interpolar,
    # para os pixels aparecerem como quadradinhos nítidos
    if max(h, w) < 160:
        fator = max(1, 320 // max(h, w))
        a = cv2.resize(a, (w * fator, h * fator), interpolation=cv2.INTER_NEAREST)
    elif w > largura_max:
        a = cv2.resize(a, (largura_max, round(h * largura_max / w)), interpolation=cv2.INTER_AREA)

    _contador += 1
    nome = f"img-{_contador:03d}.png"
    ok, dados = cv2.imencode(".png", a)
    if not ok:
        raise RuntimeError("não consegui codificar a imagem em PNG")
    # imencode + write em vez de cv2.imwrite: imwrite falha em silêncio quando
    # o caminho tem acento, coisa comum em nome de usuário no Windows
    with open(os.path.join(_PASTA_SAIDA, nome), "wb") as f:
        f.write(dados.tobytes())

    titulo = str(titulo or "").replace("\n", " ").replace("|", "/")
    sys.stdout.write(f"{_MARCADOR}{nome}|{titulo}\n")
    sys.stdout.flush()


def mostrar(*imagens, titulo: str | None = None, titulos=None, rgb: bool = False, largura_max: int = 1100) -> None:
    """
    Mostra uma ou mais imagens na tela do laboratório.

    Aceita array do NumPy (BGR, como no OpenCV — passe rgb=True se for RGB),
    imagem da PIL, tensor do PyTorch e figura do matplotlib.

        lab.mostrar(img, titulo="original")
        lab.mostrar(a, b, c, titulos=["antes", "filtro", "depois"])
    """
    for i, img in enumerate(imagens):
        t = titulos[i] if titulos is not None and i < len(titulos) else (titulo or "")
        if hasattr(img, "savefig"):  # figura do matplotlib
            _mostrar_figura(img, t)
        else:
            _emitir(_para_bgr(img, rgb), t, largura_max)


def _mostrar_figura(figura, titulo: str) -> None:
    global _contador
    _contador += 1
    nome = f"img-{_contador:03d}.png"
    figura.savefig(os.path.join(_PASTA_SAIDA, nome), dpi=110, bbox_inches="tight")
    sys.stdout.write(f"{_MARCADOR}{nome}|{str(titulo or '').replace('|', '/')}\n")
    sys.stdout.flush()


# --------------------------------------------------------------------------
#  Imagens suas e pesos de modelos
# --------------------------------------------------------------------------

def imagem(nome: str) -> np.ndarray:
    """Lê uma imagem da pasta `imagens/` do projeto (ela fica fora do git)."""
    caminho = os.path.join(_PASTA_IMAGENS, os.path.basename(nome))
    if not os.path.exists(caminho):
        disponiveis = sorted(os.listdir(_PASTA_IMAGENS)) if os.path.isdir(_PASTA_IMAGENS) else []
        disponiveis = [d for d in disponiveis if not d.startswith(".") and not d.lower().endswith(".md")]
        raise FileNotFoundError(
            f"'{nome}' não está em imagens/. "
            + (f"Disponíveis: {', '.join(disponiveis)}" if disponiveis else "A pasta está vazia: copie uma foto para lá.")
        )
    dados = np.fromfile(caminho, dtype=np.uint8)  # fromfile aguenta caminho com acento
    img = cv2.imdecode(dados, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError(f"'{nome}' não é uma imagem que o OpenCV consiga ler")
    return img


def modelo(nome: str) -> str:
    """Caminho para guardar pesos baixados (pasta `modelos/`, fora do git)."""
    os.makedirs(_PASTA_MODELOS, exist_ok=True)
    return os.path.join(_PASTA_MODELOS, os.path.basename(nome))


def dispositivo() -> str:
    """'cuda' se houver GPU utilizável pelo PyTorch, senão 'cpu'."""
    try:
        import torch

        return "cuda" if torch.cuda.is_available() else "cpu"
    except ImportError:
        return "cpu"


# --------------------------------------------------------------------------
#  Desenho e texto
# --------------------------------------------------------------------------

def desenhar_caixas(img: np.ndarray, caixas, cor=None, espessura: int = 2, rotulo: bool = True) -> np.ndarray:
    """
    Devolve uma CÓPIA da imagem com as caixas desenhadas.

    Cada caixa é um dicionário com x, y, w, h (canto superior esquerdo, em
    pixels) e, opcionalmente, classe e conf.
    """
    saida = img.copy() if img.ndim == 3 else cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    for c in caixas:
        x, y, w, h = (int(round(c[k])) for k in ("x", "y", "w", "h"))
        tinta = cor or CORES.get(c.get("classe", ""), (60, 76, 231))
        cv2.rectangle(saida, (x, y), (x + w, y + h), tinta, espessura, cv2.LINE_AA)
        if rotulo and c.get("classe"):
            texto = c["classe"] + (f" {c['conf']:.2f}" if "conf" in c else "")
            (tw, th), _ = cv2.getTextSize(texto, cv2.FONT_HERSHEY_SIMPLEX, 0.4, 1)
            cv2.rectangle(saida, (x, y - th - 5), (x + tw + 4, y), tinta, -1)
            cv2.putText(saida, texto, (x + 2, y - 3), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1, cv2.LINE_AA)
    return saida


def tabela(linhas, cabecalho=None) -> None:
    """Imprime uma tabela alinhada. `linhas` é uma lista de listas."""
    linhas = [[str(c) for c in l] for l in linhas]
    todas = ([list(map(str, cabecalho))] if cabecalho else []) + linhas
    if not todas:
        return
    larguras = [max(len(l[i]) for l in todas if i < len(l)) for i in range(max(len(l) for l in todas))]
    formatar = lambda l: "  ".join(c.ljust(larguras[i]) for i, c in enumerate(l)).rstrip()
    if cabecalho:
        print(formatar(todas[0]))
        print("  ".join("-" * n for n in larguras))
        todas = todas[1:]
    for l in todas:
        print(formatar(l))


# --------------------------------------------------------------------------
#  Imagens de exemplo, geradas por código
# --------------------------------------------------------------------------

# tamanho (comprimento em px), proporção largura/comprimento e cor BGR do corpo
_ESPECIES = {
    "mariposa": dict(comp=(30, 42), prop=(0.34, 0.42), cor=(52, 78, 112), peso=0.18),
    "cigarrinha": dict(comp=(15, 22), prop=(0.36, 0.46), cor=(38, 52, 58), peso=0.37),
    "mosca": dict(comp=(7, 11), prop=(0.50, 0.65), cor=(24, 24, 26), peso=0.45),
}


def _fundo_armadilha(rng, largura: int, altura: int) -> np.ndarray:
    """Cartão amarelo com iluminação desigual, grade impressa e granulado."""
    yy, xx = np.mgrid[0:altura, 0:largura].astype(np.float32)
    cx, cy = rng.uniform(0.3, 0.7) * largura, rng.uniform(0.3, 0.7) * altura
    luz = 0.74 + 0.30 * np.exp(-(((xx - cx) / (0.75 * largura)) ** 2 + ((yy - cy) / (0.75 * altura)) ** 2))
    base = np.array([38, 204, 236], np.float32)  # amarelo em BGR
    img = base[None, None, :] * luz[..., None]

    passo = max(40, largura // 12)
    for x in range(passo, largura, passo):
        img[:, x - 1 : x + 1] *= 0.90
    for y in range(passo, altura, passo):
        img[y - 1 : y + 1, :] *= 0.90

    img += rng.normal(0, 4.0, img.shape).astype(np.float32)
    return np.clip(img, 0, 255).astype(np.uint8)


def _caixa_elipse(x, y, a, b, ang_graus, folga=1.0):
    """Caixa alinhada aos eixos que envolve uma elipse rotacionada."""
    t = math.radians(ang_graus)
    meia_l = math.sqrt((a * math.cos(t)) ** 2 + (b * math.sin(t)) ** 2) + folga
    meia_a = math.sqrt((a * math.sin(t)) ** 2 + (b * math.cos(t)) ** 2) + folga
    return dict(x=x - meia_l, y=y - meia_a, w=2 * meia_l, h=2 * meia_a)


def _desenhar_inseto(img, rng, especie, x, y):
    e = _ESPECIES[especie]
    comp = rng.uniform(*e["comp"])
    a, b = comp / 2, comp * rng.uniform(*e["prop"]) / 2
    ang = rng.uniform(0, 180)
    centro = (int(round(x)), int(round(y)))
    cor = tuple(int(np.clip(c + rng.normal(0, 7), 0, 255)) for c in e["cor"])
    folga = 1.0

    if especie == "mariposa":
        # duas asas abertas em V, mais claras, atrás do corpo
        asa = tuple(int(min(255, c + 46)) for c in cor)
        for lado in (-1, 1):
            t = math.radians(ang + 90 * lado)
            ax = int(round(x + 0.42 * a * math.cos(t)))
            ay = int(round(y + 0.42 * a * math.sin(t)))
            cv2.ellipse(img, (ax, ay), (int(a * 0.80), int(a * 0.46)), ang + 24 * lado, 0, 360, asa, -1, cv2.LINE_AA)
        folga = a * 0.50
    elif especie == "mosca":
        # asas translúcidas: uma mistura com o fundo
        camada = img.copy()
        for lado in (-1, 1):
            t = math.radians(ang + 60 * lado)
            ax = int(round(x + 0.7 * a * math.cos(t)))
            ay = int(round(y + 0.7 * a * math.sin(t)))
            cv2.ellipse(camada, (ax, ay), (max(2, int(a * 0.9)), max(1, int(b * 0.7))), ang + 60 * lado, 0, 360, (215, 225, 228), -1, cv2.LINE_AA)
        cv2.addWeighted(camada, 0.45, img, 0.55, 0, dst=img)
        folga = a * 0.55

    cv2.ellipse(img, centro, (max(1, int(round(a))), max(1, int(round(b)))), ang, 0, 360, cor, -1, cv2.LINE_AA)
    return {"classe": especie, **_caixa_elipse(x, y, a, b, ang, folga)}


def _desenhar_detrito(img, rng, x, y):
    """Sujeira que parece inseto: a origem dos falsos positivos."""
    tipo = rng.integers(0, 3)
    if tipo == 0:  # grão de poeira/terra, irregular
        raio = rng.uniform(3, 8)
        pontos = []
        for k in range(7):
            t = 2 * math.pi * k / 7
            r = raio * rng.uniform(0.55, 1.25)
            pontos.append([x + r * math.cos(t), y + r * math.sin(t)])
        cv2.fillPoly(img, [np.array(pontos, np.int32)], (58, 84, 104), cv2.LINE_AA)
        return dict(classe="detrito", x=x - raio, y=y - raio, w=2 * raio, h=2 * raio)
    if tipo == 1:  # fibra / pedaço de palha
        comp, ang = rng.uniform(14, 34), rng.uniform(0, math.pi)
        dx, dy = comp / 2 * math.cos(ang), comp / 2 * math.sin(ang)
        cv2.line(img, (int(x - dx), int(y - dy)), (int(x + dx), int(y + dy)), (70, 120, 150), 2, cv2.LINE_AA)
        return dict(classe="detrito", x=x - abs(dx) - 1, y=y - abs(dy) - 1, w=2 * abs(dx) + 2, h=2 * abs(dy) + 2)
    # gota de cola / reflexo escuro
    a, b = rng.uniform(5, 10), rng.uniform(3, 6)
    cv2.ellipse(img, (int(x), int(y)), (int(a), int(b)), rng.uniform(0, 180), 0, 360, (30, 150, 178), -1, cv2.LINE_AA)
    return dict(classe="detrito", x=x - a, y=y - a, w=2 * a, h=2 * a)


def amostra_com_gabarito(nome: str = "armadilha", semente: int = 0, largura: int = 960, altura: int = 720,
                         insetos: int = 45, detritos: int = 12, aglomerado: float = 0.3):
    """
    Gera uma armadilha adesiva sintética e devolve (imagem, gabarito, detritos).

    gabarito e detritos são listas de caixas {classe, x, y, w, h}. O gabarito
    só tem insetos; os detritos são devolvidos à parte porque um bom detector
    NÃO deve marcá-los — eles existem para provocar falsos positivos.

    `aglomerado` (0 a 1) é a fração de insetos que cai em grupos apertados,
    que é o que torna a contagem difícil.
    """
    if cv2 is None:
        raise RuntimeError("as amostras precisam do OpenCV:  pip install opencv-python")
    if nome not in ("armadilha", "armadilha-densa"):
        raise ValueError(f"amostra desconhecida: {nome}. Use 'armadilha', 'armadilha-densa', 'formas' ou 'xadrez'.")
    if nome == "armadilha-densa":
        insetos, aglomerado = max(insetos, 160), max(aglomerado, 0.6)

    rng = np.random.default_rng(semente)
    img = _fundo_armadilha(rng, largura, altura)
    margem = 30

    lixo = [_desenhar_detrito(img, rng, rng.uniform(margem, largura - margem), rng.uniform(margem, altura - margem))
            for _ in range(detritos)]

    especies = list(_ESPECIES)
    pesos = np.array([_ESPECIES[e]["peso"] for e in especies])
    centros = [(rng.uniform(80, largura - 80), rng.uniform(80, altura - 80)) for _ in range(max(1, insetos // 14))]

    gabarito = []
    for _ in range(insetos):
        if rng.random() < aglomerado:
            cx, cy = centros[rng.integers(0, len(centros))]
            x, y = cx + rng.normal(0, 22), cy + rng.normal(0, 22)
        else:
            x, y = rng.uniform(margem, largura - margem), rng.uniform(margem, altura - margem)
        x, y = float(np.clip(x, margem, largura - margem)), float(np.clip(y, margem, altura - margem))
        especie = especies[rng.choice(len(especies), p=pesos / pesos.sum())]
        gabarito.append(_desenhar_inseto(img, rng, especie, x, y))

    # leve desfoque e granulado de sensor: sem isso a imagem fica "limpa demais"
    img = cv2.GaussianBlur(img, (3, 3), 0.7)
    img = np.clip(img.astype(np.float32) + rng.normal(0, 2.5, img.shape), 0, 255).astype(np.uint8)
    return img, gabarito, lixo


def amostra(nome: str = "armadilha", semente: int = 0, **opcoes) -> np.ndarray:
    """
    Devolve uma imagem de exemplo (BGR, uint8).

        "armadilha"        cartão adesivo amarelo com insetos e sujeira
        "armadilha-densa"  o mesmo, lotado e com insetos encostados
        "formas"           figuras geométricas simples (bordas, contornos)
        "xadrez"           tabuleiro, o alvo clássico de calibração de câmera
    """
    if nome in ("armadilha", "armadilha-densa"):
        return amostra_com_gabarito(nome, semente, **opcoes)[0]

    if cv2 is None:
        raise RuntimeError("as amostras precisam do OpenCV:  pip install opencv-python")

    if nome == "formas":
        rng = np.random.default_rng(semente)
        img = np.full((480, 640, 3), 235, np.uint8)
        cv2.rectangle(img, (60, 70), (220, 200), (60, 76, 231), -1)
        cv2.circle(img, (430, 150), 85, (219, 152, 52), -1, cv2.LINE_AA)
        cv2.fillPoly(img, [np.array([[120, 430], [250, 270], [330, 430]], np.int32)], (113, 204, 46), cv2.LINE_AA)
        cv2.ellipse(img, (480, 360), (110, 55), 25, 0, 360, (70, 70, 70), -1, cv2.LINE_AA)
        return np.clip(img.astype(np.float32) + rng.normal(0, 3, img.shape), 0, 255).astype(np.uint8)

    if nome == "xadrez":
        casas, lado = opcoes.get("casas", (9, 7)), opcoes.get("lado", 60)
        img = np.full((casas[1] * lado + 2 * lado, casas[0] * lado + 2 * lado, 3), 255, np.uint8)
        for j in range(casas[1]):
            for i in range(casas[0]):
                if (i + j) % 2 == 0:
                    cv2.rectangle(img, ((i + 1) * lado, (j + 1) * lado), ((i + 2) * lado, (j + 2) * lado), (0, 0, 0), -1)
        return img

    raise ValueError(f"amostra desconhecida: {nome}. Use 'armadilha', 'armadilha-densa', 'formas' ou 'xadrez'.")
