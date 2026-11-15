export const partida = {
  id: 'partida',
  titulo: 'Ponto de partida',
  cor: '#58c4dc',
  licoes: [
    {
      id: 'mapa',
      titulo: 'React Native para quem vem do Flutter e do React',
      minutos: 10,
      resumo: 'O mesmo React, com componentes nativos no lugar de HTML. O que é Expo, e o que esta prévia consegue mostrar.',
      blocos: [
        {
          t: 'texto',
          md: `**React Native** é React com outro alvo. Os componentes, o estado, os hooks e o JSX são os mesmos da trilha anterior. O que muda é o que está nas folhas da árvore: em vez de \`<div>\` e \`<p>\`, que o navegador desenha, usa-se \`<View>\` e \`<Text>\`, que viram **componentes nativos** do Android e do iOS.

Para quem vem do Flutter, a diferença de arquitetura é esta:

| | Flutter | React Native |
|---|---|---|
| Linguagem | Dart | TypeScript |
| Quem desenha | o próprio motor (Impeller) pinta cada pixel | os componentes nativos da plataforma |
| Aparência | idêntica nas duas plataformas | a de cada plataforma, por padrão |
| Layout | widgets de layout (\`Row\`, \`Column\`, \`Padding\`) | Flexbox em propriedades de estilo |
| Estado | \`setState\`, Provider, Riverpod, BLoC | \`useState\`, contexto, Zustand, TanStack Query |
| Ferramenta padrão | \`flutter\` CLI | **Expo** |
| Atualizar sem loja | não | sim, o JavaScript (EAS Update) |
| Reaproveita com a web | pouco | lógica, tipos, hooks e bibliotecas do React |

A última linha é o argumento prático para a sua situação: o painel em React e o app em React Native compartilham tipos, validação, chamadas de API e a forma de pensar.`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Flutter', 'React Native', 'Observação'],
          linhas: [
            ['`Container`, `SizedBox`, `Padding`', '`<View style={...}>`', 'uma caixa só; margem e espaçamento são estilo'],
            ['`Text`', '`<Text>`', 'todo texto precisa estar dentro de um `<Text>`'],
            ['`Row` / `Column`', '`<View style={{ flexDirection: "row" }}>`', 'a coluna é o padrão'],
            ['`Expanded`', '`style={{ flex: 1 }}`', ''],
            ['`ListView.builder`', '`<FlatList>`', 'as duas só montam o que está visível'],
            ['`GestureDetector`, `InkWell`', '`<Pressable>`', ''],
            ['`TextField`', '`<TextInput>`', ''],
            ['`StatefulWidget` + `setState`', 'função + `useState`', ''],
            ['`initState` / `dispose`', '`useEffect` e a função de limpeza', ''],
            ['`Navigator`, `go_router`', 'Expo Router', 'rotas pelos arquivos da pasta `app/`'],
            ['`pubspec.yaml`', '`package.json` e `app.json`', ''],
            ['*hot reload*', '*fast refresh*', ''],
          ],
        },
        {
          t: 'texto',
          md: `### A primeira prévia

O bloco abaixo é o mesmo editor da trilha de React, com a prévia numa moldura de celular. Mexa no código.`,
        },
        {
          t: 'previa',
          plataforma: 'nativo',
          titulo: 'Um componente React Native',
          codigo: `import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

export default function App() {
  const [capturas, setCapturas] = useState(0);
  const alerta = capturas >= 5;

  return (
    <View style={estilos.tela}>
      <Text style={estilos.rotulo}>Armadilha A-01</Text>
      <Text style={[estilos.numero, alerta && estilos.numeroAlerta]}>{capturas}</Text>
      <Text style={estilos.rotulo}>insetos contados</Text>

      <Pressable style={estilos.botao} onPress={() => setCapturas(capturas + 1)}>
        <Text style={estilos.textoDoBotao}>Registrar captura</Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#f4f6fa' },
  rotulo: { fontSize: 14, color: '#5b657d' },
  numero: { fontSize: 72, fontWeight: '700', color: '#1a1f2e' },
  numeroAlerta: { color: '#d64545' },
  botao: { marginTop: 24, backgroundColor: '#2f6fed', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12 },
  textoDoBotao: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});`,
        },
        {
          t: 'texto',
          md: `O que já é diferente da web:

- **\`View\` e \`Text\`** no lugar de \`div\` e \`p\`. Texto solto dentro de uma \`View\` é erro.
- **\`onPress\`**, e não \`onClick\`.
- **\`StyleSheet.create\`**: os estilos são objetos JavaScript. Não há CSS, nem seletores, nem cascata.
- **Números sem unidade**: \`fontSize: 14\` são 14 pontos independentes de densidade (o \`dp\` do Android, o ponto lógico do Flutter).
- **\`style\` aceita array**: \`[base, condicao && extra]\`. É o idioma para estilo condicional.

### O que esta prévia é, e o que não é

A prévia usa o **react-native-web**: a mesma API do React Native implementada com elementos do navegador. É o que o próprio Expo usa para rodar um app no navegador. Layout, estado, listas, formulários e navegação se comportam como no aparelho.

| Funciona na prévia | Só no aparelho |
|---|---|
| \`View\`, \`Text\`, \`Image\`, \`ScrollView\`, \`FlatList\` | câmera, GPS, sensores, notificações |
| Flexbox, estilos, \`Pressable\`, \`TextInput\` | gestos nativos, teclado real, áreas seguras |
| estado, hooks, \`fetch\` | SQLite, armazenamento seguro, tarefas em segundo plano |
| | desempenho real, aparência de cada plataforma |

As lições de câmera e de publicação mostram o código para ler e o roteiro para rodar no seu celular.

### Expo

**Expo** é para o React Native o que o Vite é para o React, e mais: cria o projeto, roda no aparelho, dá acesso às APIs nativas por pacotes (\`expo-camera\`, \`expo-location\`, \`expo-sqlite\`) e faz o build na nuvem. A documentação do React Native recomenda começar por ele.

\`\`\`bash
npx create-expo-app@latest armadilhas
cd armadilhas
npx expo start
\`\`\`

O terminal mostra um código QR. Com o aplicativo **Expo Go** no celular, na mesma rede, o app abre em segundos, sem Android Studio nem Xcode. Quando o projeto precisar de um módulo nativo que o Expo Go não traz, passa-se para um **build de desenvolvimento**, que é o seu app com as ferramentas de desenvolvimento embutidas.

Em novembro de 2026 a versão corrente é o Expo SDK 58, com React Native 0.88. Desde o React Native 0.82, só existe a **Nova Arquitetura** (o renderizador Fabric e os módulos Turbo): tutoriais antigos que falam em "bridge" descrevem um mecanismo que não existe mais.

### A trilha

- **1 · Fundamentos**: componentes nativos, Flexbox, listas e toque, formulários e teclado.
- **2 · O aplicativo**: navegação, dados e funcionamento sem sinal, câmera e captura padronizada, publicação, e o projeto do app de armadilhas.

### Fontes

- [React Native: começar com Expo](https://reactnative.dev/docs/environment-setup)
- [Expo SDK 57](https://expo.dev/changelog/sdk-57) e [atualização para o SDK 58](https://expo.dev/blog/how-to-upgrade-to-sdk-58)
- [React Native 0.86](https://reactnative.dev/blog/2026/06/11/react-native-0.86)

Conferido em novembro de 2026.`,
        },
        {
          t: 'quiz',
          pergunta: 'Qual é a diferença de arquitetura entre Flutter e React Native na hora de desenhar a tela?',
          opcoes: [
            'Nenhuma: os dois usam uma WebView.',
            'O Flutter pinta cada pixel com o próprio motor; o React Native monta componentes nativos da plataforma a partir da árvore de componentes React.',
            'O React Native compila para Dart.',
            'O Flutter usa HTML.',
          ],
          correta: 1,
          explicacao: 'Por isso um app Flutter é idêntico nas duas plataformas, e um app React Native tem, por padrão, a aparência e o comportamento de cada uma.',
        },
        {
          t: 'quiz',
          pergunta: 'O que o Expo Go permite, e qual é o limite dele?',
          opcoes: [
            'Publicar na loja sem conta de desenvolvedor.',
            'Abrir o projeto no celular em segundos, lendo um código QR; o limite é que só traz os módulos nativos embutidos nele, e bibliotecas com código nativo próprio pedem um build de desenvolvimento.',
            'Rodar o app sem JavaScript.',
            'Converter um app Flutter.',
          ],
          correta: 1,
          explicacao: 'O Expo Go é um app pronto que carrega o seu JavaScript. É ótimo para começar e para estudar. Projeto de produção costuma migrar cedo para o build de desenvolvimento.',
        },
      ],
    },
  ],
};

// A prévia do playground de Flexbox: os controles são o próprio exemplo.
const FLEXBOX = `import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

const OPCOES = {
  flexDirection: ['column', 'row'],
  justifyContent: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around'],
  alignItems: ['stretch', 'flex-start', 'center', 'flex-end'],
};

// Um seletor que troca para a próxima opção a cada toque.
function Seletor({ nome, valor, aoMudar }) {
  const lista = OPCOES[nome];
  const proximo = lista[(lista.indexOf(valor) + 1) % lista.length];
  return (
    <Pressable style={estilos.seletor} onPress={() => aoMudar(proximo)}>
      <Text style={estilos.nome}>{nome}</Text>
      <Text style={estilos.valor}>{valor}</Text>
    </Pressable>
  );
}

export default function App() {
  const [flexDirection, setDirecao] = useState('column');
  const [justifyContent, setJustificar] = useState('flex-start');
  const [alignItems, setAlinhar] = useState('stretch');
  const [cresce, setCresce] = useState(false);

  return (
    <View style={estilos.tela}>
      <Seletor nome="flexDirection" valor={flexDirection} aoMudar={setDirecao} />
      <Seletor nome="justifyContent" valor={justifyContent} aoMudar={setJustificar} />
      <Seletor nome="alignItems" valor={alignItems} aoMudar={setAlinhar} />
      <Pressable style={estilos.seletor} onPress={() => setCresce(!cresce)}>
        <Text style={estilos.nome}>caixa B com flex: 1</Text>
        <Text style={estilos.valor}>{cresce ? 'sim' : 'não'}</Text>
      </Pressable>

      {/* o contêiner que os controles alteram */}
      <View style={[estilos.palco, { flexDirection, justifyContent, alignItems }]}>
        <View style={[estilos.caixa, { backgroundColor: '#2f6fed' }]}><Text style={estilos.letra}>A</Text></View>
        <View style={[estilos.caixa, { backgroundColor: '#1fa971' }, cresce && { flex: 1 }]}><Text style={estilos.letra}>B</Text></View>
        <View style={[estilos.caixa, { backgroundColor: '#e0892f' }]}><Text style={estilos.letra}>C</Text></View>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, padding: 12, gap: 6, backgroundColor: '#f4f6fa' },
  seletor: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#ffffff', padding: 10, borderRadius: 8 },
  nome: { fontSize: 13, color: '#5b657d' },
  valor: { fontSize: 13, fontWeight: '700', color: '#1a1f2e' },
  palco: { flex: 1, marginTop: 6, padding: 8, gap: 8, borderRadius: 10, borderWidth: 2, borderColor: '#c9d0de', borderStyle: 'dashed' },
  caixa: { minWidth: 44, minHeight: 44, padding: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  letra: { color: '#ffffff', fontWeight: '700' },
});`;

export const fundamentos = {
  id: 'fundamentos',
  titulo: 'Fundamentos',
  cor: '#58c4dc',
  licoes: [
    // ------------------------------------------------------------------
    {
      id: 'componentes-nativos',
      titulo: 'Componentes nativos e estilo',
      minutos: 12,
      resumo: 'As peças básicas, o StyleSheet, e as diferenças de quem chega do CSS.',
      blocos: [
        {
          t: 'texto',
          md: `O React Native tem um conjunto pequeno de componentes básicos. Com meia dúzia se constrói quase qualquer tela.

| Componente | Para quê | Na web seria |
|---|---|---|
| \`View\` | caixa de layout | \`div\` |
| \`Text\` | todo e qualquer texto | \`p\`, \`span\`, \`h1\` |
| \`Image\` | imagem local ou remota | \`img\` |
| \`Pressable\` | qualquer coisa tocável | \`button\` |
| \`TextInput\` | campo de texto | \`input\` |
| \`ScrollView\` | conteúdo que rola | \`div\` com \`overflow\` |
| \`FlatList\` | lista longa e eficiente | lista virtualizada |
| \`ActivityIndicator\`, \`Switch\`, \`Modal\` | o indicador de espera, a chave e o modal da plataforma | |

Três regras que pegam quem chega da web:

1. **Texto só dentro de \`<Text>\`.** \`<View>Olá</View>\` quebra o app.
2. **Nada rola sozinho.** Uma \`View\` com conteúdo maior que a tela corta o excesso. Para rolar, \`ScrollView\` ou \`FlatList\`.
3. **Estilo não é herdado** de \`View\` para os filhos. Só de \`Text\` para \`Text\` aninhado. Não existe "fonte padrão da página": definem-se componentes próprios (\`<Titulo>\`, \`<Rotulo>\`).`,
        },
        {
          t: 'previa',
          plataforma: 'nativo',
          titulo: 'As peças básicas numa tela',
          codigo: `import { View, Text, Image, ScrollView, StyleSheet } from 'react-native';

function Cartao({ codigo, insetos, nivel }) {
  const cor = nivel === 'alto' ? '#d64545' : nivel === 'médio' ? '#c98a12' : '#1fa971';
  return (
    <View style={estilos.cartao}>
      <View style={[estilos.faixa, { backgroundColor: cor }]} />
      <View style={{ flex: 1 }}>
        <Text style={estilos.titulo}>{codigo}</Text>
        {/* Text aninhado herda o estilo do Text de fora */}
        <Text style={estilos.detalhe}>
          {insetos} insetos · nível <Text style={{ color: cor, fontWeight: '700' }}>{nivel}</Text>
        </Text>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <ScrollView style={estilos.tela} contentContainerStyle={estilos.conteudo}>
      <Text style={estilos.cabecalho}>Talhão 14</Text>
      <Image
        style={estilos.imagem}
        source={{ uri: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="90"><rect width="300" height="90" fill="%23e9d94a"/><circle cx="60" cy="40" r="6" fill="%23333"/><circle cx="150" cy="60" r="4" fill="%23333"/><circle cx="230" cy="30" r="7" fill="%23333"/></svg>' }}
      />
      <Cartao codigo="A-01" insetos={31} nivel="alto" />
      <Cartao codigo="A-02" insetos={12} nivel="médio" />
      <Cartao codigo="A-03" insetos={3} nivel="baixo" />
      <Cartao codigo="A-04" insetos={8} nivel="médio" />
      <Cartao codigo="A-05" insetos={0} nivel="baixo" />
      <Cartao codigo="A-06" insetos={22} nivel="alto" />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#f4f6fa' },
  conteudo: { padding: 14, gap: 10 },
  cabecalho: { fontSize: 22, fontWeight: '700', color: '#1a1f2e' },
  imagem: { width: '100%', height: 90, borderRadius: 10 },
  cartao: { flexDirection: 'row', gap: 12, backgroundColor: '#ffffff', borderRadius: 10, padding: 12,
            // sombra: propriedades diferentes em cada plataforma
            shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  faixa: { width: 5, borderRadius: 3 },
  titulo: { fontSize: 16, fontWeight: '600', color: '#1a1f2e' },
  detalhe: { fontSize: 13, color: '#5b657d', marginTop: 2 },
});`,
        },
        {
          t: 'texto',
          md: `Role a lista dentro do celular. Repare que o \`ScrollView\` tem **dois** estilos: \`style\` é a moldura (o tamanho na tela) e \`contentContainerStyle\` é o conteúdo que rola (o espaçamento interno).

### Estilo: parecido com CSS, e diferente onde importa

| | CSS na web | React Native |
|---|---|---|
| Onde se escreve | arquivo \`.css\`, seletores | objeto JavaScript, direto no componente |
| Nomes | \`background-color\` | \`backgroundColor\` |
| Unidades | \`px\`, \`rem\`, \`%\`, \`vh\` | número puro (pontos independentes de densidade) e \`'50%'\` |
| Cascata e herança | sim | não (só entre \`Text\` aninhados) |
| Layout padrão | bloco | Flexbox em **coluna** |
| \`display\` | muitos | \`flex\` ou \`none\` |
| Sombra | \`box-shadow\` | \`shadow*\` no iOS, \`elevation\` no Android; \`boxShadow\` nas versões recentes |
| Pseudo-classes (\`:hover\`, \`:active\`) | sim | não: \`Pressable\` entrega o estado \`pressed\` |
| *Media queries* | sim | \`useWindowDimensions()\` e lógica |

\`StyleSheet.create\` valida os nomes das propriedades em desenvolvimento e deixa os estilos fora do componente. Estilo que depende de estado entra pelo array: \`style={[estilos.base, ativo && estilos.ativo]}\`.

Em projeto real, muita gente usa **NativeWind**, que traz as classes do Tailwind para o React Native. Por baixo continua sendo este modelo.`,
        },
        {
          t: 'nota',
          estilo: 'pegadinha',
          md: `**\`Platform\` e os arquivos por plataforma.** Quando o comportamento precisa mudar: \`Platform.OS === 'ios'\`, ou \`Platform.select({ ios: ..., android: ... })\`. Para componentes inteiros diferentes, dois arquivos: \`Botao.ios.tsx\` e \`Botao.android.tsx\`, e o empacotador escolhe. Use com parcimônia: cada bifurcação é uma tela a mais para testar.`,
        },
        {
          t: 'previa',
          plataforma: 'nativo',
          titulo: 'Cartão de usina',
          enunciado: `Complete o componente \`Usina\`. Ele recebe \`nome\`, \`armadilhas\` e \`alertas\`.

- Uma \`View\` com dois \`Text\`: o nome, e a linha **"42 armadilhas · 3 alertas"**.
- Quando \`alertas\` for zero, a segunda linha mostra **"42 armadilhas · sem alertas"**.`,
          codigo: `import { View, Text, StyleSheet } from 'react-native';

function Usina({ nome, armadilhas, alertas }) {
  // devolva a View com os dois Text
  return null;
}

export default function App() {
  return (
    <View style={estilos.tela}>
      <Usina nome="Boa Vista" armadilhas={42} alertas={3} />
      <Usina nome="Santa Helena" armadilhas={17} alertas={0} />
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, padding: 14, gap: 10, backgroundColor: '#f4f6fa' },
  cartao: { backgroundColor: '#ffffff', borderRadius: 10, padding: 14 },
  nome: { fontSize: 17, fontWeight: '600', color: '#1a1f2e' },
  detalhe: { fontSize: 13, color: '#5b657d', marginTop: 4 },
});`,
          solucao: `import { View, Text, StyleSheet } from 'react-native';

function Usina({ nome, armadilhas, alertas }) {
  return (
    <View style={estilos.cartao}>
      <Text style={estilos.nome}>{nome}</Text>
      <Text style={estilos.detalhe}>
        {armadilhas} armadilhas · {alertas > 0 ? alertas + ' alertas' : 'sem alertas'}
      </Text>
    </View>
  );
}

export default function App() {
  return (
    <View style={estilos.tela}>
      <Usina nome="Boa Vista" armadilhas={42} alertas={3} />
      <Usina nome="Santa Helena" armadilhas={17} alertas={0} />
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, padding: 14, gap: 10, backgroundColor: '#f4f6fa' },
  cartao: { backgroundColor: '#ffffff', borderRadius: 10, padding: 14 },
  nome: { fontSize: 17, fontWeight: '600', color: '#1a1f2e' },
  detalhe: { fontSize: 13, color: '#5b657d', marginTop: 4 },
});`,
          dica: 'Os estilos `cartao`, `nome` e `detalhe` já existem. A segunda linha é um `Text` só, com um ternário dentro das chaves.',
          testes: [
            { nome: 'os dois nomes aparecem', codigo: `afirmar(tela.texto().includes('Boa Vista') && tela.texto().includes('Santa Helena'), 'faltou o nome de alguma usina');` },
            { nome: 'mostra "42 armadilhas · 3 alertas"', codigo: `afirmar(tela.texto().replace(/\\s+/g, ' ').includes('42 armadilhas · 3 alertas'), 'não achei "42 armadilhas · 3 alertas"');` },
            { nome: 'com zero alertas, mostra "sem alertas"', codigo: `afirmar(tela.texto().replace(/\\s+/g, ' ').includes('17 armadilhas · sem alertas'), 'não achei "17 armadilhas · sem alertas"');` },
            { nome: 'não mostra "0 alertas"', codigo: `afirmar(!tela.texto().includes('0 alertas'), 'com zero, o texto deveria ser "sem alertas"');` },
          ],
        },
        {
          t: 'quiz',
          pergunta: 'O que acontece ao escrever texto diretamente dentro de uma `<View>`?',
          opcoes: [
            'O texto aparece com a fonte padrão.',
            'É um erro: no React Native todo texto precisa estar dentro de um `<Text>`.',
            'O texto é ignorado em silêncio.',
            'Vira um `<Text>` automaticamente.',
          ],
          correta: 1,
          explicacao: '`View` corresponde a um contêiner nativo, que não sabe desenhar texto. O componente nativo de texto é outro, e o React Native exige que isso fique explícito.',
        },
        {
          t: 'quiz',
          pergunta: 'Uma `View` tem `fontSize: 20` no estilo. Os `Text` dentro dela ficam com 20?',
          opcoes: [
            'Sim, como no CSS.',
            'Não. Estilo de texto não desce de `View` para os filhos; só um `Text` aninhado em outro `Text` herda.',
            'Só no Android.',
            'Só com `StyleSheet.create`.',
          ],
          correta: 1,
          explicacao: 'Não há cascata. A prática é criar componentes de texto próprios (`Titulo`, `Corpo`) que carregam a tipografia do app.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'flexbox',
      titulo: 'Flexbox: o layout inteiro',
      minutos: 11,
      resumo: 'Um modelo só para posicionar tudo. Um playground para ganhar intuição, e as receitas que mais se repetem.',
      blocos: [
        {
          t: 'texto',
          md: `No React Native, **todo layout é Flexbox**. Cada \`View\` é um contêiner flexível, e três propriedades resolvem nove de cada dez telas:

- **\`flexDirection\`**: o eixo principal. \`column\` (padrão, de cima para baixo) ou \`row\`.
- **\`justifyContent\`**: como distribuir os filhos **ao longo** do eixo principal.
- **\`alignItems\`**: como alinhar os filhos no eixo **cruzado**.

E no filho: **\`flex: 1\`** significa "ocupe o espaço que sobrar".

Para quem vem do Flutter: \`flexDirection: 'row'\` é o \`Row\`, \`justifyContent\` é o \`mainAxisAlignment\`, \`alignItems\` é o \`crossAxisAlignment\`, e \`flex: 1\` é o \`Expanded\`.

Toque em cada linha do painel para trocar o valor, e observe as três caixas.`,
        },
        { t: 'previa', plataforma: 'nativo', titulo: 'Playground de Flexbox', codigo: FLEXBOX },
        {
          t: 'texto',
          md: `Experimentos que valem fazer:

- Troque \`flexDirection\` para \`row\` e veja \`justifyContent\` e \`alignItems\` **trocarem de eixo**. É a fonte número um de confusão: eles são relativos à direção.
- Com \`alignItems: stretch\` (o padrão), as caixas esticam no eixo cruzado. Com qualquer outro valor, encolhem para o próprio conteúdo.
- Ligue o \`flex: 1\` na caixa B: ela toma todo o espaço que sobra, e \`justifyContent\` deixa de ter efeito, porque não sobra espaço para distribuir.`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Quero', 'Receita'],
          linhas: [
            ['Centralizar na tela', 'no pai: `flex: 1, justifyContent: "center", alignItems: "center"`'],
            ['Cabeçalho fixo, conteúdo que ocupa o resto, rodapé fixo', 'pai em coluna; o do meio com `flex: 1`'],
            ['Rótulo à esquerda e valor à direita', '`flexDirection: "row", justifyContent: "space-between"`'],
            ['Ícone, texto que ocupa o meio, botão no fim', 'linha; o texto com `flex: 1`'],
            ['Duas colunas iguais', 'linha; cada filho com `flex: 1`'],
            ['Espaço entre itens', '`gap: 8` no pai (em vez de margem em cada filho)'],
            ['Grade de cartões', '`flexDirection: "row", flexWrap: "wrap"`, ou `FlatList` com `numColumns`'],
            ['Botão flutuante no canto', '`position: "absolute", right: 16, bottom: 16`'],
            ['Texto longo que não empurra o vizinho', '`flex: 1` no `Text`, com `numberOfLines={1}`'],
          ],
        },
        {
          t: 'nota',
          estilo: 'pegadinha',
          md: `**A tela em branco do \`flex: 1\` esquecido.** Uma \`FlatList\` ou um filho com \`flex: 1\` dentro de uma \`View\` **sem altura definida** fica com altura zero e some. A cadeia de \`flex: 1\` precisa vir desde a raiz. Quando algo não aparece, ponha uma cor de fundo berrante em cada \`View\` do caminho e veja qual tem tamanho zero.`,
        },
        {
          t: 'previa',
          plataforma: 'nativo',
          titulo: 'Linha de armadilha',
          enunciado: `Monte o layout da linha de uma lista. A \`View\` de teste \`linha\` deve ficar assim:

- os três filhos **lado a lado** (em linha), alinhados ao centro no eixo vertical;
- o bloco do meio (\`meio\`) ocupa **todo o espaço que sobrar**;
- espaço de 12 entre os filhos.

Só os estilos \`linha\` e \`meio\` precisam mudar.`,
          codigo: `import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={estilos.tela}>
      <View testID="linha" style={estilos.linha}>
        <View style={estilos.icone}><Text style={estilos.letra}>A</Text></View>
        <View testID="meio" style={estilos.meio}>
          <Text style={estilos.titulo}>Armadilha A-01</Text>
          <Text style={estilos.detalhe}>Talhão 14 · lida há 2 dias</Text>
        </View>
        <Text testID="numero" style={estilos.numero}>31</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, padding: 14, backgroundColor: '#f4f6fa' },
  linha: { backgroundColor: '#ffffff', borderRadius: 10, padding: 12 },
  meio: {},
  icone: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2f6fed', alignItems: 'center', justifyContent: 'center' },
  letra: { color: '#ffffff', fontWeight: '700' },
  titulo: { fontSize: 15, fontWeight: '600', color: '#1a1f2e' },
  detalhe: { fontSize: 12, color: '#5b657d' },
  numero: { fontSize: 22, fontWeight: '700', color: '#d64545' },
});`,
          solucao: `import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={estilos.tela}>
      <View testID="linha" style={estilos.linha}>
        <View style={estilos.icone}><Text style={estilos.letra}>A</Text></View>
        <View testID="meio" style={estilos.meio}>
          <Text style={estilos.titulo}>Armadilha A-01</Text>
          <Text style={estilos.detalhe}>Talhão 14 · lida há 2 dias</Text>
        </View>
        <Text testID="numero" style={estilos.numero}>31</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, padding: 14, backgroundColor: '#f4f6fa' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#ffffff', borderRadius: 10, padding: 12 },
  meio: { flex: 1 },
  icone: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2f6fed', alignItems: 'center', justifyContent: 'center' },
  letra: { color: '#ffffff', fontWeight: '700' },
  titulo: { fontSize: 15, fontWeight: '600', color: '#1a1f2e' },
  detalhe: { fontSize: 12, color: '#5b657d' },
  numero: { fontSize: 22, fontWeight: '700', color: '#d64545' },
});`,
          dica: 'Em `linha`: `flexDirection: "row"`, `alignItems: "center"` e `gap: 12`. Em `meio`: `flex: 1`.',
          testes: [
            { nome: 'os filhos ficam lado a lado', codigo: `const m = tela.achar('[data-testid="meio"]').getBoundingClientRect(); const n = tela.achar('[data-testid="numero"]').getBoundingClientRect(); afirmar(n.left >= m.right - 1, 'o número deveria ficar à direita do bloco do meio, e não abaixo');` },
            { nome: 'o número encosta na borda direita (o meio ocupou a sobra)', codigo: `const l = tela.achar('[data-testid="linha"]').getBoundingClientRect(); const n = tela.achar('[data-testid="numero"]').getBoundingClientRect(); afirmar(l.right - n.right <= 14, 'sobrou espaço à direita do número: falta flex: 1 no meio');` },
            { nome: 'há 12 de espaço entre o meio e o número', codigo: `const m = tela.achar('[data-testid="meio"]').getBoundingClientRect(); const n = tela.achar('[data-testid="numero"]').getBoundingClientRect(); afirmar(Math.abs(n.left - m.right - 12) <= 1, 'esperava 12 de espaço, medi ' + Math.round(n.left - m.right));` },
            { nome: 'alinhados ao centro na vertical', codigo: `const m = tela.achar('[data-testid="meio"]').getBoundingClientRect(); const n = tela.achar('[data-testid="numero"]').getBoundingClientRect(); afirmar(Math.abs((m.top + m.bottom) / 2 - (n.top + n.bottom) / 2) <= 2, 'os centros verticais não coincidem: falta alignItems: "center"');` },
          ],
        },
        {
          t: 'quiz',
          pergunta: 'Com `flexDirection: "row"`, qual propriedade centraliza os filhos na vertical?',
          opcoes: ['`justifyContent`', '`alignItems`', '`textAlign`', '`verticalAlign`'],
          correta: 1,
          explicacao: 'Em linha, o eixo principal é o horizontal (`justifyContent`) e o cruzado é o vertical (`alignItems`). Em coluna, invertem.',
        },
        {
          t: 'quiz',
          pergunta: 'Uma `FlatList` não aparece na tela, sem nenhum erro. Qual é a causa mais comum?',
          opcoes: [
            'Falta a prop `key`.',
            'Algum ancestral não tem altura: falta `flex: 1` em alguma `View` do caminho até a raiz, e a lista ficou com altura zero.',
            'A lista está vazia.',
            'O `FlatList` não funciona no Android.',
          ],
          correta: 1,
          explicacao: 'Altura não se propaga sozinha. Cada contêiner entre a raiz e a lista precisa ocupar espaço, em geral com `flex: 1`.',
        },
      ],
    },
  ],
};
