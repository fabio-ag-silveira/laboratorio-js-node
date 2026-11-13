export const modulo = {
  id: 'partida',
  titulo: 'Ponto de partida',
  cor: '#8b8ff5',
  licoes: [
    {
      id: 'mapa',
      titulo: 'O mapa da trilha',
      minutos: 6,
      resumo: 'O que tem aqui, em que ordem, e como tirar proveito sendo alguém que já trabalha na área.',
      blocos: [
        {
          t: 'texto',
          md: `Você já treina detector, já publicou sobre YOLO e já pôs modelo em Jetson. Então esta trilha não é uma introdução: é uma **revisão de ponta a ponta com as lacunas preenchidas**. O objetivo é que, ao final, você consiga explicar cada peça do seu pipeline do pixel até o modelo em produção, e saiba o que mudou no estado da arte.

Quem aprende visão computacional trabalhando costuma ter um buraco de cada lado. De um lado, a base clássica (convolução, geometria de câmera, morfologia), que as bibliotecas escondem. Do outro, o que saiu depois do último projeto (detectores sem NMS, modelos de fundação, vocabulário aberto). A trilha cobre os dois.`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Parte', 'Módulos', 'Pergunta que responde'],
          linhas: [
            ['Clássico', 'Imagem como dado · Processamento clássico', 'O que dá para fazer sem treinar nada, e onde isso para de funcionar?'],
            ['Deep learning', 'Fundamentos · Detecção · Avaliação', 'Como um detector funciona por dentro e como saber se ele melhorou de verdade?'],
            ['Avançado', 'Objetos pequenos · Dados · Além da caixa', 'O que fazer quando a cena é densa, os objetos são minúsculos e os dados são seus?'],
            ['Fronteira', 'Modelos de fundação · Produção · Estado da arte', 'O que mudou de 2023 para cá e como levar isso para produção?'],
          ],
        },
        {
          t: 'texto',
          md: `### Como cada lição funciona

Três ingredientes, sempre na mesma ordem de importância:

1. **Componente interativo.** Um painel para mexer com as mãos: arrastar caixa, deslizar limiar, editar kernel. Entender IoU olhando uma fórmula e entender IoU arrastando duas caixas são coisas diferentes.
2. **Bloco de Python.** Roda no Python da sua máquina, com OpenCV e PyTorch, e a imagem aparece na tela. Mexa no código e rode de novo.
3. **Perguntas.** Poucas e voltadas para o que derruba gente em entrevista e em revisão de código. Elas voltam na aba **Revisão**.`,
        },
        {
          t: 'codigo',
          titulo: 'Teste o ambiente: Python, OpenCV e a imagem na tela',
          rodar: 'python',
          requerPython: ['cv2'],
          codigo: `import cv2
import lab

print("OpenCV", cv2.__version__)

# armadilha adesiva gerada por código: sabemos onde está cada inseto
img, gabarito, detritos = lab.amostra_com_gabarito("armadilha", semente=1)
print("imagem:", img.shape, img.dtype)
print("insetos:", len(gabarito), "| detritos (não são insetos):", len(detritos))

por_classe = {}
for caixa in gabarito:
    por_classe[caixa["classe"]] = por_classe.get(caixa["classe"], 0) + 1
lab.tabela(sorted(por_classe.items()), cabecalho=["classe", "quantidade"])

lab.mostrar(img, lab.desenhar_caixas(img, gabarito), titulos=["imagem", "gabarito"])`,
        },
        {
          t: 'nota',
          estilo: 'campo',
          md: `**Por que imagem sintética.** Este repositório é público, e foto de armadilha de cliente não se publica. A armadilha desenhada por código tem outra vantagem: o gabarito é exato, então dá para medir o erro de qualquer método sem depender de anotação humana. Para testar nas suas fotos, copie-as para a pasta \`imagens/\` do projeto (ela fica fora do git) e use \`lab.imagem("nome.jpg")\`. Nos componentes do navegador, o botão **usar imagem sua** lê o arquivo direto no canvas, sem enviar para lugar nenhum.`,
        },
        {
          t: 'texto',
          md: `### Leitura complementar

A base de deep learning desta trilha segue a mesma ordem de tópicos da especialização da DeepLearning.AI, da qual você já fez o primeiro curso. As anotações e os exercícios resolvidos estão reunidos em [amanchadha/coursera-deep-learning-specialization](https://github.com/amanchadha/coursera-deep-learning-specialization). Serve como segundo ponto de vista sobre redes, otimização e CNNs. O material é da Coursera: use para estudar, não para copiar em projeto.

Para o clássico, a referência gratuita é o livro do Szeliski, [Computer Vision: Algorithms and Applications](https://szeliski.org/Book/). Para detecção moderna, os artigos originais citados em cada lição.`,
        },
      ],
    },
  ],
};
