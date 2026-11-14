export const modulo = {
  id: 'fronteira',
  titulo: 'Estado da arte e carreira',
  cor: '#c98bdb',
  licoes: [
    // ------------------------------------------------------------------
    {
      id: 'mapa-2026',
      titulo: 'O mapa de 2026 e como ler um benchmark',
      minutos: 12,
      resumo: 'Onde está cada família de modelos, e as perguntas que separam um número útil de um número de propaganda.',
      blocos: [
        {
          t: 'texto',
          md: `Este painel reúne os detectores de tempo real que apareceram nas lições anteriores, com precisão e latência **como os autores reportaram**. Clique em cada ponto e leia a observação: quase todo número tem uma ressalva.`,
        },
        { t: 'visual', componente: 'cv/mapa' },
        {
          t: 'texto',
          md: `### O estado das coisas, em uma página

| Área | Onde está em 2026 | O que isso muda para você |
|---|---|---|
| Detecção em tempo real | duas linhagens maduras: YOLO (convolucional, YOLO26 sem NMS) e DETR (RT-DETR, D-FINE, DEIM, RF-DETR) | a escolha passa mais por licença, ecossistema e exportação que por 1 ponto de AP |
| Backbones | auto-supervisionados (DINOv2, DINOv3) viraram a base de detectores e segmentadores | bom ponto de partida com poucos dados reais, a confirmar por medição |
| Segmentação | por prompt e por conceito (SAM 2, SAM 3) | anotação de máscara ficou barata |
| Vocabulário aberto | útil em fotografia comum, fraco em domínio especializado | ferramenta de dados, e não de produção |
| Objetos pequenos | sem solução geral: fatiamento, resolução e cabeças de alta resolução continuam sendo o caminho | o seu problema ainda é um problema de engenharia |
| Modelos de linguagem com visão | entendem cena e documento; contam e localizam mal objetos pequenos e numerosos | bons para triagem e descrição |
| Borda e celular | NPUs em todo aparelho; a quantização é o gargalo de qualidade | validar no hardware real |

Uma constatação incômoda atravessa a tabela: **a fronteira avança em benchmarks de fotografia comum, e o seu domínio não é fotografia comum.** O ganho de um modelo novo no COCO não se transfere na mesma proporção para armadilha adesiva. Às vezes nem se transfere.`,
        },
        {
          t: 'texto',
          md: `### Dez perguntas para fazer a um número

1. **Quem mediu?** O autor do modelo, um concorrente ou um terceiro? Autores comparam o seu melhor resultado com o resultado padrão dos outros.
2. **Em que dados?** COCO tem objetos médios e grandes, 80 classes do cotidiano. Qual é a distância até o seu caso?
3. **O conjunto de teste ficou intocado?** Ajustar hiperparâmetros olhando para a validação infla o número. É uma crítica que o artigo do RF-DETR faz a trabalhos anteriores.
4. **A latência inclui o quê?** Com ou sem NMS, com ou sem pré-processamento, em que GPU, com que precisão numérica, com que tamanho de lote.
5. **Qual resolução de entrada?** Um modelo a 640 e outro a 1280 não estão sendo comparados.
6. **Quantas épocas e que pré-treino?** Pré-treino em Objects365 vale alguns pontos. Comparar com quem não usou é comparar outra coisa.
7. **Qual é a variação entre execuções?** Diferença de 0,3 AP entre dois treinos da mesma receita é normal. Uma tabela que comemora 0,2 está comemorando ruído.
8. **O código e os pesos estão disponíveis?** Sem eles, o número é uma afirmação.
9. **Alguém reproduziu?** Uma análise independente vale mais que dez tabelas do autor.
10. **A unidade está certa?** FPS ou ms, AP ou AP50, mAP em que faixa de IoU. No painel acima há um caso real de "78 FPS" que virou "78 ms" num texto de terceiros.

Você já tem a ferramenta para responder à única pergunta que importa: o módulo de avaliação ensinou a comparar dois modelos no **seu** conjunto de teste, com intervalo de confiança. Benchmark público escolhe os **candidatos**. O seu conjunto de teste escolhe o **modelo**.`,
        },
        {
          t: 'nota',
          estilo: 'campo',
          md: `**Como se manter atualizado sem se afogar.** Uma vez por mês: os artigos mais citados em detecção no Papers with Code ou no arXiv (cs.CV), as notas de versão das duas ou três bibliotecas que você usa, e um boletim de curadoria. Quando um modelo novo parecer relevante, o teste é sempre o mesmo e leva uma tarde: treinar no seu dataset com a receita padrão e comparar com o modelo atual no seu conjunto de teste. Nove em cada dez vezes a diferença fica dentro do intervalo de confiança, e você volta a trabalhar nos dados.`,
        },
        {
          t: 'texto',
          md: `### Fontes

As fontes de cada família estão nas lições do módulo de detecção. As do painel:

- [YOLO26: artigo (arXiv 2606.03748)](https://arxiv.org/pdf/2606.03748)
- [RF-DETR: ICLR 2026](https://mlanthology.org/iclr/2026/robinson2026iclr-rfdetr/)
- [RF-DETR e alternativas, pela Roboflow](https://blog.roboflow.com/rf-detr-vs-alternatives/)
- [D-FINE e RT-DETR, comparativo](https://playground.roboflow.com/models/compare/d-fine-vs-rt-detr)
- [DEIM e RT-DETR, comparativo](https://playground.roboflow.com/models/compare/deim-vs-rt-detr)

Conferido em novembro de 2026.`,
        },
        {
          t: 'quiz',
          pergunta: 'Um artigo mostra o modelo novo 0,4 AP acima do anterior no COCO. O que dá para concluir sobre o seu dataset de armadilhas?',
          opcoes: [
            'Que ele será 0,4 AP melhor também.',
            'Quase nada: a diferença está na faixa de variação entre treinos, e o COCO tem objetos e classes muito diferentes dos seus. O modelo vira candidato a um teste nos seus dados.',
            'Que ele será pior.',
            'Que vale migrar imediatamente.',
          ],
          correta: 1,
          explicacao: 'Diferenças pequenas em benchmark geral não predizem o resultado em domínio especializado. A decisão sai da comparação no seu conjunto de teste, com intervalo de confiança.',
        },
        {
          t: 'quiz',
          pergunta: 'Dois detectores reportam 8 ms de latência. Um usa NMS e o outro não. O que verificar?',
          opcoes: [
            'Nada: 8 ms é 8 ms.',
            'Se a latência do primeiro inclui o NMS. É comum reportá-la sem o pós-processamento, que em cena densa pode custar vários milissegundos.',
            'Qual tem mais parâmetros.',
            'Qual foi publicado primeiro.',
          ],
          correta: 1,
          explicacao: 'A comparação justa é de ponta a ponta. O custo do NMS cresce com o número de caixas candidatas, e uma armadilha cheia é o pior caso.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'licencas',
      titulo: 'Licenças: o que pode ir para um produto',
      minutos: 10,
      resumo: 'AGPL, Apache e licenças próprias. A pergunta que se faz antes de treinar, e não depois de vender.',
      blocos: [
        {
          t: 'nota',
          estilo: 'atencao',
          md: `Esta lição é um mapa para você saber **quando parar e perguntar**. Não é aconselhamento jurídico. Licenças mudam entre versões e entre tamanhos do mesmo modelo: a fonte é sempre o arquivo \`LICENSE\` do repositório e a página do modelo, na versão que você vai usar.`,
        },
        {
          t: 'texto',
          md: `Num produto comercial, a licença do modelo é uma restrição de engenharia tão real quanto a latência. E são **três** coisas licenciadas separadamente: o **código** (a biblioteca de treino e inferência), os **pesos** pré-treinados e os **dados** em que esses pesos foram treinados.

### As famílias de licença

| Licença | Em uma frase | Consequência para produto fechado |
|---|---|---|
| **Apache-2.0**, MIT, BSD | pode usar, modificar e vender; mantenha os avisos | nenhuma obrigação de abrir o seu código |
| **GPL-3.0** | quem **distribui** o software derivado precisa abrir o código | afeta o que você entrega ao cliente (app, aparelho) |
| **AGPL-3.0** | igual à GPL, e **oferecer pela rede também conta** | um serviço web que usa o código também é alcançado |
| **Licença própria** | o que o texto disser | ler o texto: uso comercial, redistribuição, campos de uso proibidos |
| **Não comercial** (CC BY-NC e afins) | só pesquisa | fora de produto |

A AGPL é a que mais pega equipes de surpresa, porque fecha a saída que a GPL deixava para serviços em nuvem.`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Modelo ou biblioteca', 'Licença (nov. 2026)', 'Observação'],
          linhas: [
            ['Ultralytics (YOLOv8, YOLO11, YOLO26)', 'AGPL-3.0, ou licença comercial paga', 'a empresa oferece a licença Enterprise para uso em produto fechado'],
            ['RF-DETR, detecção, tamanhos Nano a Large', 'Apache-2.0', 'os tamanhos XL e 2XL saem em pacote separado, sob licença própria da Roboflow'],
            ['RT-DETR, D-FINE, DEIM', 'Apache-2.0', 'implementações de terceiros podem ter outra licença: o RT-DETR dentro do Ultralytics é AGPL'],
            ['YOLOX, RTMDet', 'Apache-2.0', 'alternativas da linhagem YOLO com licença permissiva'],
            ['Grounding DINO, OWLv2', 'Apache-2.0', ''],
            ['YOLOE, YOLO-World', 'AGPL-3.0 / GPL-3.0', ''],
            ['DINOv2', 'Apache-2.0', ''],
            ['DINOv3', 'própria (DINOv3 License)', 'permite uso comercial, com condições; pesos atrás de formulário'],
            ['SAM 2', 'Apache-2.0', ''],
            ['SAM 3', 'própria (SAM License)', 'pesos atrás de pedido de acesso'],
            ['ONNX Runtime, OpenCV, PyTorch', 'MIT / Apache-2.0 / BSD', 'a infraestrutura é permissiva'],
          ],
        },
        {
          t: 'texto',
          md: `### As perguntas que aparecem na prática

**"Treinei com os meus dados. Os pesos são meus?"** Os dados são seus. Mas os pesos foram produzidos pelo código de treino e, em geral, a partir de pesos pré-treinados. A posição pública da Ultralytics é que modelos treinados com o código dela ficam sob a AGPL, salvo licença comercial. É uma interpretação contestada, e exatamente o tipo de dúvida que se resolve com o jurídico e não com um fórum.

**"Só uso internamente."** O uso interno, sem distribuir nem oferecer a terceiros, em geral não aciona as obrigações da GPL nem da AGPL. Um app nas mãos de clientes, ou uma API que clientes chamam, é outra situação.

**"Exportei para ONNX, então a licença sumiu."** Não. O arquivo exportado é derivado dos pesos. Trocar o runtime troca a licença do **runtime**, e não a do modelo.

**"E os dados de pré-treino?"** O COCO tem imagens do Flickr sob licenças variadas, e o ImageNet é liberado para pesquisa. A prática do mercado é tratar pesos pré-treinados nesses conjuntos como utilizáveis, mas é uma zona cinzenta que clientes grandes às vezes questionam em auditoria.

### O roteiro, antes de começar um projeto

1. Liste código, pesos e dados de pré-treino de cada candidato.
2. Classifique o uso: interno, serviço para terceiros, ou distribuído (app, aparelho).
3. Se o candidato for AGPL e o uso não for interno, há três saídas: comprar a licença comercial, abrir o código, ou escolher um modelo de licença permissiva.
4. Registre a decisão, com a versão e a data. Licenças mudam, e o que vale é a da versão que você usou.

A existência de detectores Apache-2.0 competitivos (a família DETR de tempo real) mudou esta conversa: hoje a escolha de um modelo AGPL em produto fechado é uma decisão de custo, e não mais uma falta de alternativa.

### Fontes

- [Licenciamento do RF-DETR, pela Roboflow](https://roboflow.com/model-licenses/rf-detr)
- [RF-DETR sob Apache-2.0, anúncio](https://blog.roboflow.com/rf-detr-is-free-to-use-commercially/)
- [Alternativas ao Ultralytics em 2026, pela Lightly](https://lightly.ai/blog/best-ultralytics-alternatives-in-2026)
- [Licenças da Ultralytics](https://www.ultralytics.com/license)

Conferido em novembro de 2026. Boa parte das fontes é de empresas com interesse na comparação; confira nos repositórios.`,
        },
        {
          t: 'quiz',
          pergunta: 'O que a AGPL-3.0 acrescenta em relação à GPL-3.0?',
          opcoes: [
            'Proíbe o uso comercial.',
            'Estende a obrigação de abrir o código a quem oferece o software como serviço pela rede, e não só a quem distribui.',
            'Libera o uso sem nenhuma condição.',
            'Vale só para modelos de IA.',
          ],
          correta: 1,
          explicacao: 'Com a GPL, um serviço em nuvem não distribui o programa e não precisava abrir nada. A AGPL fecha essa saída, e por isso alcança APIs de inferência oferecidas a clientes.',
        },
        {
          t: 'quiz',
          pergunta: 'Um modelo treinado com biblioteca AGPL é exportado para ONNX e roda no ONNX Runtime, que é MIT. Qual é a situação da licença do modelo?',
          opcoes: [
            'Passa a ser MIT.',
            'Continua a mesma: o arquivo exportado deriva dos pesos, e trocar o runtime não muda a licença do modelo.',
            'Deixa de ter licença.',
            'Passa a ser Apache-2.0.',
          ],
          correta: 1,
          explicacao: 'A conversão de formato não altera a origem dos pesos. A licença do runtime vale para o runtime.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'entrevista',
      titulo: 'Banco de entrevista e desenho de sistema',
      minutos: 16,
      resumo: 'As perguntas que voltam em toda entrevista de visão computacional, e um desenho de sistema resolvido.',
      blocos: [
        {
          t: 'texto',
          md: `Esta lição é para revisitar. As perguntas abaixo cobrem a trilha inteira e entram na página de **Revisão**. Antes delas, o exercício que mais pesa em entrevista de nível pleno e sênior: o **desenho de sistema**.

### Desenho de sistema: contagem de insetos em armadilhas

*"Desenhe um sistema que conta insetos em armadilhas adesivas fotografadas por técnicos de campo, para 200 usinas."*

A resposta fraca começa pelo modelo. A resposta forte começa pelas perguntas.

**1. Esclarecer o problema.**
Qual decisão a contagem alimenta, e com que erro tolerável? Quantas fotos por dia? Há sinal no campo? Quais espécies importam? Em quanto tempo o resultado precisa chegar? Quem anota, e com que orçamento?

**2. Definir a métrica antes do modelo.**
A métrica de negócio é o erro de contagem por armadilha, por classe. O mAP é métrica de desenvolvimento. O conjunto de teste é separado **por usina e por data**, para medir generalização e não memorização.

**3. Dados.**
Protocolo de captura (distância, enquadramento, luz) com portão de qualidade no app. Guia de anotação, com dupla anotação numa amostra para medir concordância. Ciclo de aprendizado ativo: produção alimenta a fila de anotação.

**4. Modelo.**
Uma linha de base em uma semana: detector pequeno pré-treinado, ajustado. Objetos pequenos pedem resolução alta ou fatiamento. Comparar candidatos no conjunto de teste, com intervalo de confiança. Só então discutir arquitetura.

**5. Arquitetura.**
App com fila local e envio quando houver sinal. API que recebe, valida e enfileira. Serviço de inferência com GPU, modelo exportado, versão em toda resposta. Banco relacional para capturas e detecções, armazenamento de objetos para imagens. Painel para o agrônomo.

**6. Operação.**
Monitorar entrada, saída e uma amostra anotada. Paridade testada em cada cliente. Implantação gradual de modelo novo: rodar em sombra, comparar, promover. Plano de reversão.

**7. Riscos, ditos em voz alta.**
Mudança de fabricante da armadilha. Espécie nova. Aparelho novo com câmera diferente. Auto-anotação contaminando o teste. Licença do modelo.

Cada item tem uma lição nesta trilha. O que o entrevistador avalia é a **ordem**: problema, métrica, dados, modelo, sistema, operação.`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Pergunta aberta comum', 'O esqueleto de uma boa resposta'],
          linhas: [
            ['"O modelo vai bem no teste e mal em produção. E agora?"', 'paridade de pré-processamento → mudança nos dados (comparar distribuições) → vazamento no teste → só então o modelo'],
            ['"Como você melhoraria este detector?"', 'análise de erro primeiro: que tipo de erro domina (fundo, localização, classe, perdidos)? A resposta define se o remédio é dado, resolução, limiar ou arquitetura'],
            ['"YOLO ou DETR?"', 'depende: latência-alvo, hardware, licença, cena densa (NMS), facilidade de exportação. Testar os dois no dataset'],
            ['"Como lidar com classes desbalanceadas?"', 'medir por classe; coletar mais da classe rara; amostragem ou peso na perda; cuidado com a métrica agregada'],
            ['"Como você sabe que o modelo novo é melhor?"', 'mesmo conjunto de teste, intocado; intervalo de confiança por bootstrap pareado; métrica de negócio além do mAP; teste em sombra'],
            ['"Tenho 200 imagens anotadas. O que fazer?"', 'transfer learning; aumentação forte; backbone de fundação como hipótese; anotação assistida para crescer o dataset; teste separado desde o primeiro dia'],
            ['"Conte um erro seu."', 'um caso real, com o que você mediu, o que estava errado e o processo que passou a seguir. A trilha está cheia de candidatos: o Otsu que falha em armadilha esparsa, a BatchNorm que oscila'],
          ],
        },
        {
          t: 'quiz',
          pergunta: 'Qual é a diferença entre precisão e revocação?',
          opcoes: [
            'Precisão mede velocidade; revocação mede memória.',
            'Precisão: das detecções feitas, quantas estão certas. Revocação: dos objetos existentes, quantos foram encontrados.',
            'São a mesma medida em escalas diferentes.',
            'Precisão é por classe; revocação é global.',
          ],
          correta: 1,
          explicacao: 'Precisão = VP / (VP + FP). Revocação = VP / (VP + FN). Subir o limiar de confiança troca revocação por precisão.',
        },
        {
          t: 'quiz',
          pergunta: 'O que o mAP@50-95 mede que o mAP@50 não mede?',
          opcoes: [
            'A velocidade do modelo.',
            'A qualidade da localização: é a média do AP em limiares de IoU de 0,50 a 0,95, e exige caixas cada vez mais justas.',
            'O número de classes.',
            'A confiança média.',
          ],
          correta: 1,
          explicacao: 'Com IoU 0,50 uma caixa frouxa já conta como acerto. A média até 0,95 premia caixas precisas, e por isso é bem mais baixa e mais sensível em objetos pequenos.',
        },
        {
          t: 'quiz',
          pergunta: 'Por que objetos pequenos são difíceis para um detector?',
          opcoes: [
            'Porque há poucos deles nas imagens.',
            'Porque somem nos mapas de características reduzidos (um objeto de 12 pixels vira menos de 1 célula com passo 16), e porque um desvio de poucos pixels derruba o IoU.',
            'Porque a GPU não processa pixels pequenos.',
            'Porque exigem mais classes.',
          ],
          correta: 1,
          explicacao: 'São dois efeitos: perda de informação na redução de resolução e sensibilidade do IoU. Os remédios atacam o primeiro: mais resolução, fatiamento, cabeça de passo menor.',
        },
        {
          t: 'quiz',
          pergunta: 'O que o NMS faz, e quando ele erra?',
          opcoes: [
            'Aumenta a confiança das caixas; erra em imagens escuras.',
            'Remove caixas que se sobrepõem a uma caixa de confiança maior; erra em cena densa, onde dois objetos reais vizinhos se sobrepõem e um é suprimido.',
            'Treina a rede; erra com poucos dados.',
            'Redimensiona a imagem; erra em alta resolução.',
          ],
          correta: 1,
          explicacao: 'O NMS supõe que caixas muito sobrepostas são duplicatas. Em aglomerados essa suposição falha. Detectores com atribuição um-para-um (YOLO26, família DETR) dispensam o NMS.',
        },
        {
          t: 'quiz',
          pergunta: 'O que é vazamento de dados (data leakage) em visão, e como evitá-lo?',
          opcoes: [
            'Perda de imagens no disco; evita-se com backup.',
            'Informação do teste presente no treino, como quadros do mesmo vídeo ou fotos da mesma armadilha nos dois conjuntos; evita-se dividindo por grupo (local, data, aparelho).',
            'Uso excessivo de GPU; evita-se com lotes menores.',
            'Publicar o modelo; evita-se com licença.',
          ],
          correta: 1,
          explicacao: 'Imagens quase idênticas nos dois lados fazem o teste medir memorização. A divisão por grupo garante que o teste represente uma situação realmente nova.',
        },
        {
          t: 'quiz',
          pergunta: 'Qual é a diferença entre transfer learning com extração de características e fine-tuning?',
          opcoes: [
            'Nenhuma.',
            'Na extração, o backbone fica congelado e só a cabeça treina; no fine-tuning, o backbone também é atualizado, em geral com taxa de aprendizado menor.',
            'O fine-tuning não usa pesos pré-treinados.',
            'A extração de características exige mais dados.',
          ],
          correta: 1,
          explicacao: 'Congelar é mais barato e mais seguro com pouquíssimos dados. Ajustar tudo rende mais quando há dados suficientes, com o risco de esquecer o que o pré-treino ensinou se a taxa for alta.',
        },
        {
          t: 'quiz',
          pergunta: 'Por que a BatchNorm se comporta diferente no treino e na inferência?',
          opcoes: [
            'Porque é desligada na inferência.',
            'No treino usa a média e a variância do lote; na inferência usa as médias acumuladas durante o treino. Com lotes pequenos ou dados diferentes, as duas divergem.',
            'Porque troca os pesos por inteiros.',
            'Porque só funciona em GPU.',
          ],
          correta: 1,
          explicacao: 'É a origem de bugs clássicos: esquecer o modo de avaliação, ou treinar com lote pequeno demais. Normalizações que não dependem do lote, como a GroupNorm, evitam o problema.',
        },
        {
          t: 'quiz',
          pergunta: 'O que o campo receptivo de um neurônio de uma CNN representa?',
          opcoes: [
            'O número de filtros da camada.',
            'A região da imagem de entrada que influencia aquele neurônio; cresce com a profundidade, o tamanho do kernel e o passo.',
            'A resolução da imagem.',
            'A taxa de aprendizado local.',
          ],
          correta: 1,
          explicacao: 'Um detector só reconhece um objeto se o campo receptivo o cobre com contexto. É um dos motivos de as cabeças de detecção usarem vários níveis da rede.',
        },
        {
          t: 'quiz',
          pergunta: 'Como funciona a perda focal (focal loss), e que problema ela resolve?',
          opcoes: [
            'Aumenta a resolução das caixas.',
            'Reduz o peso dos exemplos fáceis, já bem classificados, para que os milhares de pontos de fundo não dominem o gradiente frente aos poucos pontos com objeto.',
            'Substitui o otimizador.',
            'Remove caixas duplicadas.',
          ],
          correta: 1,
          explicacao: 'Em detecção densa, quase todo ponto do mapa é fundo. A perda focal multiplica a entropia cruzada por um fator que encolhe quando a previsão já é confiante e correta.',
        },
        {
          t: 'quiz',
          pergunta: 'Para que serve uma homografia?',
          opcoes: [
            'Para comprimir imagens.',
            'Para mapear pontos entre duas vistas de um mesmo plano; com ela se retifica a foto inclinada de uma superfície plana, como um cartão.',
            'Para corrigir a distorção radial da lente.',
            'Para calcular o histograma.',
          ],
          correta: 1,
          explicacao: 'A homografia é uma transformação projetiva 3×3, definida por quatro pares de pontos. A distorção de lente é outro fenômeno, não linear, corrigido pela calibração.',
        },
        {
          t: 'quiz',
          pergunta: 'O que diferencia o treino ciente de quantização (QAT) da quantização pós-treino (PTQ)?',
          opcoes: [
            'O QAT usa mais bits.',
            'O PTQ quantiza um modelo pronto usando um conjunto de calibração; o QAT simula o arredondamento durante o treino, e os pesos se adaptam a ele.',
            'O PTQ exige retreinar do zero.',
            'O QAT só funciona em CPU.',
          ],
          correta: 1,
          explicacao: 'O PTQ é barato e resolve muitos casos. Quando a perda de precisão é grande, o QAT recupera boa parte dela ao custo de um ciclo de treino.',
        },
        {
          t: 'quiz',
          pergunta: 'Num rastreador por detecção, o que é uma troca de identidade (ID switch) e o que a causa?',
          opcoes: [
            'A troca de classe de um objeto; causada por pouca luz.',
            'O rastreador atribui a um objeto o identificador de outro; ocorre em oclusões, cruzamentos e detecções perdidas, quando a associação entre quadros se confunde.',
            'A troca de câmera; causada pela rede.',
            'Um erro de exportação.',
          ],
          correta: 1,
          explicacao: 'A associação por IoU ou por aparência falha quando os objetos se sobrepõem ou somem por alguns quadros. Em contagem por linha, uma troca pode contar o mesmo objeto duas vezes.',
        },
        {
          t: 'texto',
          md: `### Fim da trilha de visão

Você passou do pixel ao serviço em produção. Três hábitos atravessaram todas as lições, e são eles que distinguem um engenheiro de visão experiente:

1. **Medir antes de afirmar.** Várias afirmações "óbvias" desta trilha caíram quando o código rodou: o Otsu na armadilha esparsa, o filtro bilateral no ruído impulsivo, o modelo de fundação com poucos exemplos.
2. **Olhar os erros, e não só a métrica.** O número diz quanto. As imagens erradas dizem por quê.
3. **Tratar dados e pré-processamento como parte do modelo.** A maior parte dos ganhos, e dos desastres, vem daí.

A página de **Revisão** sorteia perguntas de todas as lições concluídas. E o projeto integrador, no fim das trilhas, junta esta com as outras: o app que fotografa, a API em .NET, o Postgres, o serviço de inferência e o painel.

Leitura complementar para a base teórica: as notas da [especialização em Deep Learning](https://github.com/amanchadha/coursera-deep-learning-specialization), em especial o curso de redes convolucionais.`,
        },
      ],
    },
  ],
};
