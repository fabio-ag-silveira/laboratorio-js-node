const ESTILO_BASE = `const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#f4f6fa' },
  cabecalho: { padding: 14, paddingBottom: 8, fontSize: 20, fontWeight: '700', color: '#1a1f2e' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#ffffff', padding: 12, marginHorizontal: 12, borderRadius: 10 },
  titulo: { fontSize: 15, fontWeight: '600', color: '#1a1f2e' },
  detalhe: { fontSize: 12, color: '#5b657d' },
  numero: { fontSize: 20, fontWeight: '700', color: '#1a1f2e' },
  botao: { backgroundColor: '#2f6fed', padding: 13, borderRadius: 10, alignItems: 'center' },
  textoDoBotao: { color: '#ffffff', fontWeight: '600', fontSize: 15 },
  campo: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#c9d0de', borderRadius: 10, padding: 12, fontSize: 15 },
  aviso: { color: '#d64545', fontSize: 13 },
});`;

const PROJETO_INICIO = `import { useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, Switch, StyleSheet } from 'react-native';

// A "API": falha quando não há sinal.
async function enviarAoServidor(captura, online) {
  await new Promise((r) => setTimeout(r, 150));
  if (!online) throw new Error('sem sinal');
  return { ...captura, situacao: 'enviada' };
}

export default function App() {
  const [online, setOnline] = useState(false);
  const [armadilha, setArmadilha] = useState('');
  const [insetos, setInsetos] = useState('');
  const [capturas, setCapturas] = useState([]);     // { id, armadilha, insetos, situacao }

  // 1. registrar(): valida, cria a captura como 'pendente' e limpa os campos
  // 2. sincronizar(): envia as pendentes, uma a uma, e marca como 'enviada'
  // 3. contagem de pendentes e botão de sincronizar

  return (
    <View style={estilos.tela}>
      <View style={estilos.barra}>
        <Text style={estilos.titulo}>{online ? 'Com sinal' : 'Sem sinal'}</Text>
        <Switch testID="sinal" value={online} onValueChange={setOnline} />
      </View>

      <View style={estilos.formulario}>
        <TextInput testID="armadilha" style={estilos.campo} placeholder="armadilha (A-01)" autoCapitalize="characters"
                   value={armadilha} onChangeText={setArmadilha} />
        <TextInput testID="insetos" style={estilos.campo} placeholder="insetos" keyboardType="number-pad"
                   value={insetos} onChangeText={setInsetos} />
        <Pressable style={estilos.botao}>
          <Text style={estilos.textoDoBotao}>Registrar</Text>
        </Pressable>
      </View>

      <FlatList
        data={capturas}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={{ padding: 12, gap: 8 }}
        ListEmptyComponent={<Text style={estilos.detalhe}>Nenhuma captura registrada.</Text>}
        renderItem={({ item }) => (
          <View style={estilos.linha}>
            <Text style={estilos.titulo}>{item.armadilha}: {item.insetos} insetos</Text>
            <Text style={estilos.detalhe}>{item.situacao}</Text>
          </View>
        )}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#f4f6fa' },
  barra: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#ffffff' },
  formulario: { padding: 12, gap: 8 },
  campo: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#c9d0de', borderRadius: 10, padding: 11, fontSize: 15 },
  botao: { backgroundColor: '#2f6fed', padding: 12, borderRadius: 10, alignItems: 'center' },
  botaoSecundario: { backgroundColor: '#1fa971' },
  desligado: { opacity: 0.4 },
  textoDoBotao: { color: '#ffffff', fontWeight: '600', fontSize: 15 },
  linha: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#ffffff', padding: 12, borderRadius: 10 },
  titulo: { fontSize: 15, fontWeight: '600', color: '#1a1f2e' },
  detalhe: { fontSize: 13, color: '#5b657d' },
  aviso: { color: '#d64545', fontSize: 13 },
});`;

const PROJETO_SOLUCAO = PROJETO_INICIO
  .replace(
    `  // 1. registrar(): valida, cria a captura como 'pendente' e limpa os campos
  // 2. sincronizar(): envia as pendentes, uma a uma, e marca como 'enviada'
  // 3. contagem de pendentes e botão de sincronizar
`,
    `  const [proximoId, setProximoId] = useState(1);
  const [erro, setErro] = useState('');

  const pendentes = capturas.filter((c) => c.situacao === 'pendente');   // derivado

  function registrar() {
    const n = Number(insetos);
    if (armadilha.trim() === '' || insetos.trim() === '' || !Number.isInteger(n) || n < 0) {
      return setErro('Preencha a armadilha e um número inteiro de insetos.');
    }
    setErro('');
    // grava PRIMEIRO no aparelho, como pendente. A rede vem depois.
    setCapturas((atual) => [...atual, { id: proximoId, armadilha: armadilha.trim(), insetos: n, situacao: 'pendente' }]);
    setProximoId(proximoId + 1);
    setArmadilha('');
    setInsetos('');
  }

  async function sincronizar() {
    for (const captura of pendentes) {
      try {
        const enviada = await enviarAoServidor(captura, online);
        setCapturas((atual) => atual.map((c) => (c.id === enviada.id ? enviada : c)));
      } catch {
        break;            // caiu o sinal: o que falta continua pendente
      }
    }
  }
`,
  )
  .replace(
    `        <Pressable style={estilos.botao}>
          <Text style={estilos.textoDoBotao}>Registrar</Text>
        </Pressable>
      </View>
`,
    `        {erro !== '' && <Text style={estilos.aviso}>{erro}</Text>}
        <Pressable style={estilos.botao} onPress={registrar}>
          <Text style={estilos.textoDoBotao}>Registrar</Text>
        </Pressable>
        <Text testID="pendentes" style={estilos.detalhe}>{pendentes.length} pendentes</Text>
        <Pressable
          style={[estilos.botao, estilos.botaoSecundario, (!online || pendentes.length === 0) && estilos.desligado]}
          disabled={!online || pendentes.length === 0}
          onPress={sincronizar}
        >
          <Text style={estilos.textoDoBotao}>Sincronizar</Text>
        </Pressable>
      </View>
`,
  );

export const interacao = {
  id: 'interacao',
  titulo: 'Listas, toque e formulários',
  cor: '#58c4dc',
  licoes: [
    // ------------------------------------------------------------------
    {
      id: 'listas-e-toque',
      titulo: 'Listas e toque',
      minutos: 12,
      resumo: 'FlatList para listas de qualquer tamanho, e Pressable para tudo que se toca.',
      blocos: [
        {
          t: 'texto',
          md: `Na web, desenhar mil linhas com \`.map()\` é lento mas funciona. No celular, mil componentes nativos montados de uma vez travam o app e consomem memória. A **\`FlatList\`** resolve montando **só o que está perto da área visível** e reciclando o resto. É o \`ListView.builder\` do Flutter.

\`\`\`tsx
<FlatList
  data={armadilhas}                          // o array
  keyExtractor={(a) => String(a.id)}         // a "key" de cada item
  renderItem={({ item }) => <Linha armadilha={item} />}
/>
\`\`\`

| Prop | Para quê |
|---|---|
| \`ItemSeparatorComponent\` | o que vai entre os itens |
| \`ListHeaderComponent\`, \`ListFooterComponent\` | cabeçalho e rodapé que rolam junto |
| \`ListEmptyComponent\` | o que mostrar com a lista vazia |
| \`refreshing\` + \`onRefresh\` | puxar para atualizar |
| \`onEndReached\` | carregar a próxima página ao chegar ao fim |
| \`numColumns\` | grade |

A regra: \`.map()\` dentro de \`ScrollView\` para **poucos itens de tamanho conhecido**. \`FlatList\` para o que vem de uma API. Para listas realmente longas, a biblioteca **FlashList**, da Shopify, tem a mesma interface e recicla melhor.

### Pressable

Tudo que se toca é um \`Pressable\`. Ele não tem aparência própria, e entrega o estado do toque por uma função no \`style\`:`,
        },
        {
          t: 'previa',
          plataforma: 'nativo',
          titulo: 'FlatList com seleção, lista vazia e atualização',
          codigo: `import { useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';

const INICIAL = Array.from({ length: 40 }, (_, i) => ({
  id: i + 1,
  codigo: 'A-' + String(i + 1).padStart(2, '0'),
  insetos: (i * 7) % 33,
}));

function Linha({ armadilha, selecionada, aoTocar }) {
  return (
    <Pressable
      onPress={() => aoTocar(armadilha.id)}
      onLongPress={() => console.log('toque longo em', armadilha.codigo)}
      // "pressed" é true enquanto o dedo está sobre o item
      style={({ pressed }) => [estilos.linha, selecionada && estilos.selecionada, pressed && { opacity: 0.55 }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={estilos.titulo}>{armadilha.codigo}</Text>
        <Text style={estilos.detalhe}>{armadilha.insetos >= 20 ? 'acima do nível de controle' : 'dentro do esperado'}</Text>
      </View>
      <Text style={[estilos.numero, armadilha.insetos >= 20 && { color: '#d64545' }]}>{armadilha.insetos}</Text>
    </Pressable>
  );
}

export default function App() {
  const [dados, setDados] = useState(INICIAL);
  const [selecionada, setSelecionada] = useState(null);
  const [atualizando, setAtualizando] = useState(false);

  function atualizar() {
    setAtualizando(true);
    setTimeout(() => {
      setDados((atual) => atual.map((a) => ({ ...a, insetos: (a.insetos + 5) % 33 })));
      setAtualizando(false);
    }, 900);
  }

  return (
    <View style={estilos.tela}>
      <FlatList
        data={dados}
        keyExtractor={(a) => String(a.id)}
        renderItem={({ item }) => <Linha armadilha={item} selecionada={item.id === selecionada} aoTocar={setSelecionada} />}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListHeaderComponent={<Text style={estilos.cabecalho}>{dados.length} armadilhas</Text>}
        ListEmptyComponent={<Text style={estilos.detalhe}>Nada por aqui.</Text>}
        contentContainerStyle={{ paddingBottom: 16 }}
        refreshing={atualizando}
        onRefresh={atualizar}
      />
      <Pressable style={[estilos.botao, { margin: 12 }]} onPress={() => setDados(dados.length ? [] : INICIAL)}>
        <Text style={estilos.textoDoBotao}>{dados.length ? 'Esvaziar a lista' : 'Recarregar'}</Text>
      </Pressable>
    </View>
  );
}

${ESTILO_BASE.replace("linha: {", "selecionada: { borderWidth: 2, borderColor: '#2f6fed' },\n  linha: {")}`,
        },
        {
          t: 'texto',
          md: `Toque num item (ele escurece enquanto pressionado e ganha a borda de seleção), segure para o toque longo (veja o console) e esvazie a lista para ver o \`ListEmptyComponent\`. No aparelho, \`refreshing\` e \`onRefresh\` ativam o gesto de puxar para atualizar.

### O que deixa uma lista lenta

1. **\`renderItem\` criando função e objeto novos a cada renderização**, com itens pesados. Extraia o item para um componente e, se preciso, use \`memo\`.
2. **Imagens grandes.** Peça ao servidor a miniatura. Use \`expo-image\`, que faz cache em disco.
3. **Falta de \`keyExtractor\` estável**, que impede a reciclagem.
4. **Trabalho pesado em JavaScript durante a rolagem.** A rolagem em si é nativa e não trava, mas o conteúdo novo aparece em branco se o JavaScript estiver ocupado.

### Área de toque

Um dedo não é um cursor. O alvo mínimo recomendado é de **44 a 48 pontos** de lado. Ícone pequeno recebe \`hitSlop={12}\`, que aumenta a área tocável sem mudar o desenho. Em campo, com luva ou tela molhada, botões grandes deixam de ser gosto e viram requisito.`,
        },
        {
          t: 'quiz',
          pergunta: 'Por que usar `FlatList` em vez de `.map()` dentro de um `ScrollView` para uma lista vinda da API?',
          opcoes: [
            'Porque `.map()` não funciona no React Native.',
            'Porque a `FlatList` monta só os itens próximos da área visível e recicla os demais; o `ScrollView` monta todos de uma vez, o que custa memória e trava com listas grandes.',
            'Porque a `FlatList` é mais bonita.',
            'Porque o `ScrollView` não rola na vertical.',
          ],
          correta: 1,
          explicacao: 'É virtualização. Com 20 itens a diferença não existe; com 2.000, o `ScrollView` congela o app na abertura da tela.',
        },
        {
          t: 'quiz',
          pergunta: 'Como dar retorno visual enquanto o dedo está sobre um `Pressable`?',
          opcoes: [
            'Com a pseudo-classe `:active`.',
            'Passando uma função em `style`: ela recebe `{ pressed }` e devolve o estilo para aquele momento.',
            'Não é possível.',
            'Com `onHover`.',
          ],
          correta: 1,
          explicacao: 'Não há pseudo-classes. O `Pressable` expõe o estado do toque, e o estilo é calculado a partir dele.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'formularios-e-teclado',
      titulo: 'Formulários e teclado',
      minutos: 10,
      resumo: 'TextInput, o tipo de teclado certo para cada campo, e o teclado que cobre a tela.',
      blocos: [
        {
          t: 'texto',
          md: `O \`TextInput\` é controlado como o \`<input>\` da web, com uma diferença de conforto: \`onChangeText\` entrega **o texto direto**, sem \`e.target.value\`.

\`\`\`tsx
<TextInput value={codigo} onChangeText={setCodigo} />
\`\`\`

No celular, metade da qualidade de um formulário está em **pedir o teclado certo**:

| Prop | Efeito |
|---|---|
| \`keyboardType="number-pad"\` | só dígitos; \`"decimal-pad"\` com vírgula; \`"email-address"\`; \`"phone-pad"\` |
| \`autoCapitalize="characters"\` | tudo em maiúsculas (códigos); \`"none"\` para e-mail e usuário |
| \`autoCorrect={false}\` | sem corretor: essencial para códigos e nomes próprios |
| \`secureTextEntry\` | senha |
| \`returnKeyType="next"\` + \`onSubmitEditing\` | a tecla Enter vira "próximo" e leva o foco ao campo seguinte |
| \`autoComplete\`, \`textContentType\` | preenchimento automático do sistema (e-mail, senha, código por SMS) |
| \`maxLength\`, \`multiline\` | |`,
        },
        {
          t: 'previa',
          plataforma: 'nativo',
          titulo: 'Formulário de captura',
          codigo: `import { useState, useRef } from 'react';
import { View, Text, TextInput, Pressable, Switch, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

export default function App() {
  const [armadilha, setArmadilha] = useState('');
  const [insetos, setInsetos] = useState('');
  const [chuva, setChuva] = useState(false);
  const [salvas, setSalvas] = useState([]);
  const campoInsetos = useRef(null);          // para levar o foco ao próximo campo

  const erroArmadilha = armadilha !== '' && !/^[A-Z]-\\d{2}$/.test(armadilha) ? 'Use o formato A-01.' : '';
  const valido = /^[A-Z]-\\d{2}$/.test(armadilha) && /^\\d+$/.test(insetos);

  function salvar() {
    setSalvas([{ armadilha, insetos: Number(insetos), chuva }, ...salvas]);
    setArmadilha(''); setInsetos(''); setChuva(false);
  }

  return (
    // empurra o conteúdo para cima quando o teclado abre (no iOS)
    <KeyboardAvoidingView style={estilos.tela} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }} keyboardShouldPersistTaps="handled">
        <Text style={estilos.titulo}>Código da armadilha</Text>
        <TextInput
          style={[estilos.campo, erroArmadilha !== '' && { borderColor: '#d64545' }]}
          placeholder="A-01"
          value={armadilha}
          onChangeText={(t) => setArmadilha(t.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={4}
          returnKeyType="next"
          onSubmitEditing={() => campoInsetos.current?.focus()}
        />
        {erroArmadilha !== '' && <Text style={estilos.aviso}>{erroArmadilha}</Text>}

        <Text style={estilos.titulo}>Insetos contados</Text>
        <TextInput
          ref={campoInsetos}
          style={estilos.campo}
          placeholder="0"
          value={insetos}
          onChangeText={(t) => setInsetos(t.replace(/\\D/g, ''))}    // só dígitos, mesmo se colarem texto
          keyboardType="number-pad"
          returnKeyType="done"
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={estilos.titulo}>Choveu desde a última leitura</Text>
          <Switch value={chuva} onValueChange={setChuva} />
        </View>

        <Pressable style={[estilos.botao, !valido && { opacity: 0.4 }]} disabled={!valido} onPress={salvar}>
          <Text style={estilos.textoDoBotao}>Salvar captura</Text>
        </Pressable>

        {salvas.map((c, i) => (
          <Text key={i} style={estilos.detalhe}>{c.armadilha}: {c.insetos} insetos{c.chuva ? ' · chuva' : ''}</Text>
        ))}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

${ESTILO_BASE}`,
        },
        {
          t: 'texto',
          md: `Tente digitar letras no campo de insetos, ou minúsculas no código: o estado é quem decide o que fica no campo, e as transformações acontecem no \`onChangeText\`.

### O teclado cobre a tela

É o problema clássico de formulário em celular: o teclado sobe e esconde o campo que está sendo preenchido e o botão de salvar. As peças da solução:

- **\`ScrollView\`** em volta do formulário, para o usuário poder rolar.
- **\`keyboardShouldPersistTaps="handled"\`**: sem isso, o primeiro toque num botão só fecha o teclado, e é preciso tocar de novo.
- **\`KeyboardAvoidingView\`**: encolhe a área útil quando o teclado abre. O comportamento difere entre plataformas, daí o \`Platform.OS\`.
- Em formulários grandes, a biblioteca **react-native-keyboard-controller** resolve os casos que o componente padrão não resolve.

Nada disso aparece nesta prévia, que não tem teclado virtual. É o tipo de coisa que só se acerta com o aparelho na mão.

### Validação e bibliotecas

Tudo da lição de formulários do React vale aqui: estado como fonte única, erros **derivados**. E as mesmas bibliotecas funcionam: **React Hook Form** com **Zod**. O esquema Zod pode ser o **mesmo arquivo** usado no painel web e, com alguma disciplina, espelhar a validação da API.`,
        },
        {
          t: 'quiz',
          pergunta: 'O usuário preenche um campo, toca em "Salvar" e nada acontece; só no segundo toque o botão responde. Qual é a causa?',
          opcoes: [
            'O botão está desabilitado.',
            'O primeiro toque foi consumido para fechar o teclado. Falta `keyboardShouldPersistTaps="handled"` no `ScrollView`.',
            'Falta `await` no `onPress`.',
            'O `Pressable` precisa de toque duplo.',
          ],
          correta: 1,
          explicacao: 'Por padrão, tocar fora do campo com o teclado aberto só o dispensa. Com `handled`, o toque chega ao botão.',
        },
        {
          t: 'quiz',
          pergunta: 'Qual combinação de props é a certa para um campo de código como "A-01"?',
          opcoes: [
            '`secureTextEntry` e `multiline`.',
            '`autoCapitalize="characters"`, `autoCorrect={false}` e `maxLength`.',
            '`keyboardType="email-address"`.',
            'Nenhuma: o padrão serve.',
          ],
          correta: 1,
          explicacao: 'Sem isso, o corretor "conserta" o código e o usuário briga com o teclado. Em campo, cada atrito de digitação vira dado errado.',
        },
      ],
    },
  ],
};

export const aplicativo = {
  id: 'aplicativo',
  titulo: 'O aplicativo',
  cor: '#58c4dc',
  licoes: [
    // ------------------------------------------------------------------
    {
      id: 'navegacao',
      titulo: 'Navegação com Expo Router',
      minutos: 11,
      resumo: 'Pilha, abas e modal. Rotas definidas pelos arquivos, e o que isso tem a ver com o React Router.',
      blocos: [
        {
          t: 'texto',
          md: `Navegação em celular não é a da web. Não há barra de endereço, e as telas se organizam em três padrões nativos:

| Padrão | O que é | Exemplo |
|---|---|---|
| **Pilha** (*stack*) | uma tela entra por cima da outra; "voltar" a remove | lista de usinas → usina → armadilha |
| **Abas** (*tabs*) | seções irmãs na barra inferior, cada uma com a sua pilha | Capturas · Mapa · Perfil |
| **Modal** | sobe por cima de tudo, para uma tarefa curta | registrar captura |

Um app real combina os três: abas na raiz, uma pilha dentro de cada aba, modais por cima.

### Expo Router: os arquivos são as rotas

O **Expo Router** é o padrão em projeto Expo. A estrutura da pasta \`app/\` **é** a tabela de rotas, como no Next.js:`,
        },
        {
          t: 'codigo',
          titulo: 'Estrutura de rotas e as peças principais (para ler)',
          lang: 'tsx',
          codigo: `// app/
// ├── _layout.tsx              pilha raiz
// ├── (abas)/                  grupo: os parênteses não entram na URL
// │   ├── _layout.tsx          a barra de abas
// │   ├── index.tsx            "/"          aba Usinas
// │   └── capturas.tsx         "/capturas"  aba Capturas
// ├── usinas/[id].tsx          "/usinas/42" tela de detalhe
// └── nova-captura.tsx         "/nova-captura", aberta como modal

// ---- app/_layout.tsx ---------------------------------------------------
import { Stack } from 'expo-router';

export default function LayoutRaiz() {
  return (
    <Stack>
      <Stack.Screen name="(abas)" options={{ headerShown: false }} />
      <Stack.Screen name="usinas/[id]" options={{ title: 'Usina' }} />
      <Stack.Screen name="nova-captura" options={{ presentation: 'modal', title: 'Nova captura' }} />
    </Stack>
  );
}

// ---- app/(abas)/index.tsx ----------------------------------------------
import { Link, router } from 'expo-router';

export default function Usinas() {
  return (
    <>
      {/* declarativo: um link, como na web */}
      <Link href="/usinas/42">Boa Vista</Link>

      {/* imperativo: depois de salvar, por exemplo */}
      <Pressable onPress={() => router.push({ pathname: '/usinas/[id]', params: { id: 42 } })}>
        <Text>Abrir</Text>
      </Pressable>
    </>
  );
}

// ---- app/usinas/[id].tsx -----------------------------------------------
import { useLocalSearchParams, Stack } from 'expo-router';

export default function Usina() {
  const { id } = useLocalSearchParams<{ id: string }>();     // parâmetros chegam como TEXTO
  return (
    <>
      <Stack.Screen options={{ title: 'Usina ' + id }} />     {/* título definido pela própria tela */}
      <Text>Detalhe da usina {id}</Text>
    </>
  );
}

// router.back()      volta uma tela
// router.replace()   troca a tela atual, sem deixar "voltar" (depois do login)`,
        },
        {
          t: 'texto',
          md: `Por baixo, o Expo Router usa o **React Navigation**, a biblioteca que domina o ecossistema há anos. Em projeto mais antigo você vai encontrá-la direta, com as telas registradas em código. Os conceitos são os mesmos.

| | React Router (web) | Expo Router |
|---|---|---|
| Definição das rotas | objeto em código | arquivos em \`app/\` |
| Parâmetro | \`useParams()\` | \`useLocalSearchParams()\` |
| Link | \`<Link to>\` | \`<Link href>\` |
| Navegar por código | \`navigate()\` | \`router.push()\`, \`router.back()\` |
| Moldura comum | componente com \`<Outlet />\` | \`_layout.tsx\` |
| O que "voltar" faz | histórico do navegador | desempilha a tela, com animação e gesto nativos |

Como toda tela tem uma URL, **links profundos** vêm quase de graça: uma notificação pode abrir \`armadilhas://usinas/42\` direto na tela certa.

### Uma pilha em miniatura

A prévia abaixo não usa o Expo Router (ele depende do aparelho). Ela implementa a ideia de **pilha** com um array no estado, para deixar claro o que a biblioteca faz: empilhar, desempilhar, e passar parâmetros.`,
        },
        {
          t: 'previa',
          plataforma: 'nativo',
          titulo: 'Uma pilha de telas feita à mão',
          codigo: `import { useState } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';

const USINAS = [
  { id: 1, nome: 'Boa Vista', armadilhas: ['A-01', 'A-02', 'A-03'] },
  { id: 2, nome: 'Santa Helena', armadilhas: ['B-01', 'B-02'] },
];

// Cada tela recebe os parâmetros e as funções de navegação, como numa biblioteca de verdade.
function TelaUsinas({ ir }) {
  return (
    <FlatList
      data={USINAS}
      keyExtractor={(u) => String(u.id)}
      contentContainerStyle={{ gap: 8, paddingVertical: 12 }}
      renderItem={({ item }) => (
        <Pressable style={estilos.linha} onPress={() => ir('usina', { id: item.id })}>
          <Text style={[estilos.titulo, { flex: 1 }]}>{item.nome}</Text>
          <Text style={estilos.detalhe}>{item.armadilhas.length} armadilhas ›</Text>
        </Pressable>
      )}
    />
  );
}

function TelaUsina({ params, ir }) {
  const usina = USINAS.find((u) => u.id === params.id);
  return (
    <View style={{ gap: 8, paddingVertical: 12 }}>
      {usina.armadilhas.map((codigo) => (
        <Pressable key={codigo} style={estilos.linha} onPress={() => ir('armadilha', { codigo, usina: usina.nome })}>
          <Text style={[estilos.titulo, { flex: 1 }]}>{codigo}</Text>
          <Text style={estilos.detalhe}>›</Text>
        </Pressable>
      ))}
    </View>
  );
}

function TelaArmadilha({ params }) {
  return <Text style={[estilos.detalhe, { padding: 14 }]}>Armadilha {params.codigo}, da usina {params.usina}.</Text>;
}

const TELAS = {
  usinas: { titulo: () => 'Usinas', componente: TelaUsinas },
  usina: { titulo: (p) => USINAS.find((u) => u.id === p.id).nome, componente: TelaUsina },
  armadilha: { titulo: (p) => p.codigo, componente: TelaArmadilha },
};

export default function App() {
  // a pilha: a última posição é a tela visível
  const [pilha, setPilha] = useState([{ nome: 'usinas', params: {} }]);
  const atual = pilha.at(-1);
  const Tela = TELAS[atual.nome].componente;

  const ir = (nome, params) => setPilha([...pilha, { nome, params }]);     // push
  const voltar = () => setPilha(pilha.slice(0, -1));                        // back

  return (
    <View style={estilos.tela}>
      <View style={estilos.barra}>
        {pilha.length > 1 && <Pressable onPress={voltar} hitSlop={12}><Text style={estilos.voltar}>‹ Voltar</Text></Pressable>}
        <Text style={estilos.tituloDaBarra}>{TELAS[atual.nome].titulo(atual.params)}</Text>
      </View>
      <Tela params={atual.params} ir={ir} />
      <Text style={estilos.rodape}>pilha: {pilha.map((t) => t.nome).join(' › ')}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#f4f6fa' },
  barra: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e0e4ed' },
  voltar: { color: '#2f6fed', fontSize: 15 },
  tituloDaBarra: { fontSize: 17, fontWeight: '700', color: '#1a1f2e' },
  linha: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', padding: 14, marginHorizontal: 12, borderRadius: 10 },
  titulo: { fontSize: 15, fontWeight: '600', color: '#1a1f2e' },
  detalhe: { fontSize: 13, color: '#5b657d' },
  rodape: { position: 'absolute', bottom: 10, left: 14, fontSize: 11, color: '#7d8699' },
});`,
        },
        {
          t: 'texto',
          md: `Navegue até uma armadilha e volte, acompanhando o rodapé. Uma biblioteca de navegação é isto, mais o que dá trabalho: animação nativa, gesto de voltar, cabeçalho da plataforma, preservação do estado e da rolagem de cada tela da pilha, e links profundos.

Repare num detalhe com consequência prática: **as telas de baixo da pilha continuam montadas**. Um efeito com \`[]\` não roda de novo quando o usuário volta para a tela. Para recarregar dados ao voltar, usa-se \`useFocusEffect\`, ou deixa-se o TanStack Query revalidar.`,
        },
        {
          t: 'quiz',
          pergunta: 'No Expo Router, como se cria a rota `/usinas/42`?',
          opcoes: [
            'Registrando a rota num arquivo de configuração.',
            'Criando o arquivo `app/usinas/[id].tsx`; o valor chega por `useLocalSearchParams()`.',
            'Com `<Route path>` dentro do `App`.',
            'Não é possível ter parâmetros.',
          ],
          correta: 1,
          explicacao: 'As rotas vêm da estrutura de arquivos. Colchetes marcam um segmento dinâmico, e o parâmetro chega como texto.',
        },
        {
          t: 'quiz',
          pergunta: 'O usuário vai da lista para o detalhe, edita, e volta. A lista não mostra a alteração. Por quê?',
          opcoes: [
            'A lista foi destruída.',
            'A tela da lista continuou montada no fundo da pilha: o efeito de carga com `[]` não roda de novo ao voltar. É preciso revalidar quando a tela ganha foco.',
            'O Expo Router não suporta edição.',
            'Faltou `key`.',
          ],
          correta: 1,
          explicacao: 'Na web, trocar de rota desmonta a página anterior. Numa pilha nativa, ela fica viva. `useFocusEffect` ou uma biblioteca de dados com revalidação resolvem.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'dados-e-offline',
      titulo: 'Dados, armazenamento e funcionamento sem sinal',
      minutos: 14,
      resumo: 'Onde guardar cada coisa no aparelho, e o desenho que permite trabalhar no talhão sem internet.',
      blocos: [
        {
          t: 'texto',
          md: `Buscar dados no React Native é igual ao React: \`fetch\`, e de preferência o **TanStack Query**, que funciona sem mudança. O que é novo é o **armazenamento local** e a **rede que some**.

### Onde guardar

| O quê | Onde | Observação |
|---|---|---|
| Preferências, sinalizadores, o último filtro | **AsyncStorage** (ou MMKV, mais rápido) | chave e valor, texto; **sem criptografia** |
| Token de acesso, senha | **expo-secure-store** | Keychain no iOS, Keystore no Android |
| Dados estruturados, fila de envio, cache para uso sem rede | **expo-sqlite** | SQLite de verdade, com SQL e transações |
| Fotos e arquivos | **expo-file-system** | o banco guarda só o caminho |
| Estado de tela | \`useState\` | some ao fechar o app |

O erro clássico é guardar o token no AsyncStorage: é um arquivo de texto legível em aparelho com acesso de administrador.`,
        },
        {
          t: 'codigo',
          titulo: 'SQLite no aparelho, com expo-sqlite (para ler)',
          lang: 'tsx',
          codigo: `import * as SQLite from 'expo-sqlite';

const banco = await SQLite.openDatabaseAsync('armadilhas.db');

// Migração: roda uma vez na abertura do app.
await banco.execAsync(\`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS capturas (
    id          TEXT PRIMARY KEY,         -- UUID gerado NO APARELHO
    armadilha   TEXT NOT NULL,
    insetos     INTEGER NOT NULL,
    foto        TEXT,                     -- caminho do arquivo local
    capturada_em TEXT NOT NULL,           -- relógio do aparelho, ISO 8601
    situacao    TEXT NOT NULL DEFAULT 'pendente',   -- pendente | enviada | erro
    tentativas  INTEGER NOT NULL DEFAULT 0
  );
\`);

// Gravar: SEMPRE com parâmetros, nunca concatenando texto (injeção de SQL existe no celular também)
await banco.runAsync(
  'INSERT INTO capturas (id, armadilha, insetos, foto, capturada_em) VALUES (?, ?, ?, ?, ?)',
  [crypto.randomUUID(), 'A-01', 12, caminhoDaFoto, new Date().toISOString()],
);

// Ler a fila de envio
const pendentes = await banco.getAllAsync<Captura>(
  "SELECT * FROM capturas WHERE situacao = 'pendente' ORDER BY capturada_em",
);`,
        },
        {
          t: 'texto',
          md: `### Sem sinal não é exceção, é o caso normal

Num talhão, o celular passa horas sem rede. Um app que mostra "sem conexão" e trava não serve. O desenho que funciona tem nome: **offline-first**.

1. **Toda ação grava primeiro no aparelho**, e a tela responde na hora.
2. **Uma fila** guarda o que ainda não foi enviado.
3. **A sincronização** roda quando há rede: ao abrir o app, ao voltar o sinal, e em segundo plano.
4. **A tela mostra a situação** de cada registro: pendente, enviado, com erro.

A prévia simula isso. Registre capturas com a chave "sem sinal", ligue o sinal, e sincronize.`,
        },
        {
          t: 'previa',
          plataforma: 'nativo',
          titulo: 'Fila de envio com rede que cai',
          codigo: `import { useState } from 'react';
import { View, Text, Pressable, Switch, FlatList, StyleSheet } from 'react-native';

// O "servidor": guarda o que já recebeu, pelo id, e demora um pouco.
const servidor = new Map();
async function enviar(captura, online) {
  await new Promise((r) => setTimeout(r, 500));
  if (!online) throw new Error('sem sinal');
  servidor.set(captura.id, captura);        // gravar pelo id torna o reenvio inofensivo
}

let contador = 0;

export default function App() {
  const [online, setOnline] = useState(false);
  const [capturas, setCapturas] = useState([]);
  const [sincronizando, setSincronizando] = useState(false);

  function registrar() {
    contador += 1;
    // o id nasce NO APARELHO: o registro existe antes de o servidor saber dele
    const nova = { id: 'cel-' + contador, armadilha: 'A-0' + ((contador % 5) + 1), insetos: (contador * 7) % 30, situacao: 'pendente' };
    setCapturas((atual) => [nova, ...atual]);      // 1. grava local, a tela responde já
  }

  async function sincronizar() {
    setSincronizando(true);
    for (const c of capturas.filter((x) => x.situacao !== 'enviada').reverse()) {
      try {
        await enviar(c, online);
        setCapturas((atual) => atual.map((x) => (x.id === c.id ? { ...x, situacao: 'enviada' } : x)));
      } catch {
        setCapturas((atual) => atual.map((x) => (x.id === c.id ? { ...x, situacao: 'erro' } : x)));
        break;                                      // sem sinal: para, e tenta depois
      }
    }
    setSincronizando(false);
  }

  const pendentes = capturas.filter((c) => c.situacao !== 'enviada').length;
  const COR = { pendente: '#c98a12', enviada: '#1fa971', erro: '#d64545' };

  return (
    <View style={estilos.tela}>
      <View style={estilos.barra}>
        <Text style={estilos.titulo}>{online ? 'Com sinal' : 'Sem sinal'}</Text>
        <Switch value={online} onValueChange={setOnline} />
      </View>
      <View style={{ padding: 12, gap: 8 }}>
        <Pressable style={estilos.botao} onPress={registrar}>
          <Text style={estilos.textoDoBotao}>Registrar captura</Text>
        </Pressable>
        <Pressable style={[estilos.botao, { backgroundColor: '#1fa971' }, (pendentes === 0 || sincronizando) && { opacity: 0.4 }]}
                   disabled={pendentes === 0 || sincronizando} onPress={sincronizar}>
          <Text style={estilos.textoDoBotao}>{sincronizando ? 'Enviando…' : 'Sincronizar (' + pendentes + ')'}</Text>
        </Pressable>
        <Text style={estilos.detalhe}>No servidor: {servidor.size} capturas</Text>
      </View>
      <FlatList
        data={capturas}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 6 }}
        renderItem={({ item }) => (
          <View style={estilos.linha}>
            <Text style={[estilos.titulo, { flex: 1 }]}>{item.armadilha} · {item.insetos}</Text>
            <Text style={{ color: COR[item.situacao], fontSize: 13, fontWeight: '600' }}>{item.situacao}</Text>
          </View>
        )}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#f4f6fa' },
  barra: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#ffffff' },
  botao: { backgroundColor: '#2f6fed', padding: 12, borderRadius: 10, alignItems: 'center' },
  textoDoBotao: { color: '#ffffff', fontWeight: '600', fontSize: 15 },
  linha: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', padding: 12, borderRadius: 10 },
  titulo: { fontSize: 15, fontWeight: '600', color: '#1a1f2e' },
  detalhe: { fontSize: 13, color: '#5b657d' },
});`,
        },
        {
          t: 'texto',
          md: `Tente sincronizar sem sinal: a primeira captura fica com **erro** e a fila para. Ligue o sinal e sincronize de novo: tudo sobe, na ordem em que foi registrado.

### As decisões que fazem o offline funcionar

| Decisão | Por quê |
|---|---|
| **O id nasce no aparelho** (UUID) | o registro existe e pode ser referenciado antes de chegar ao servidor |
| **Envio idempotente** | a resposta pode se perder depois de o servidor gravar; reenviar o mesmo id não pode duplicar. Na API: \`PUT /capturas/{id}\`, ou \`POST\` com cabeçalho de idempotência |
| **Data do aparelho e data do servidor**, as duas | a do aparelho diz quando aconteceu; a do servidor, quando chegou. Relógio de celular erra |
| **Foto em arquivo, envio separado** | a foto é grande e falha mais; o registro sobe primeiro, a foto depois, com retomada |
| **Tentativas com espera crescente** | 1 s, 2 s, 4 s...: não martelar uma rede ruim nem a bateria |
| **Conflito tem regra escrita** | dois aparelhos editaram o mesmo registro: "o último vence"? Por campo? Avisa o usuário? Decidir antes, não depois |
| **A situação aparece na tela** | o técnico precisa saber, antes de sair da área, o que ainda não subiu |

Para saber se há rede, \`@react-native-community/netinfo\`. Mas "conectado" não significa "a API responde": o teste real é a requisição dar certo. Para sincronizar com o app fechado, \`expo-background-task\`, sabendo que o sistema decide quando rodar.

Quando a sincronização fica complexa (muitas tabelas, conflitos, dados que descem do servidor), existem bancos locais com sincronização embutida: **WatermelonDB**, **PowerSync**, **ElectricSQL**. Vale conhecer antes de escrever um motor de sincronização próprio.`,
        },
        {
          t: 'nota',
          estilo: 'campo',
          md: `**Teste com o modo avião.** O roteiro de teste de um app de campo começa por: registrar dez capturas em modo avião, fechar o app à força, abrir, conferir que as dez estão lá, religar a rede no meio do envio de uma foto, e conferir no servidor que chegaram dez, sem duplicata. Quase todo defeito de sincronização aparece nesse roteiro.`,
        },
        {
          t: 'quiz',
          pergunta: 'Por que o identificador de uma captura deve ser gerado no aparelho, e não pelo banco do servidor?',
          opcoes: [
            'Porque o servidor não sabe gerar identificadores.',
            'Porque o registro precisa existir, ser exibido e ser referenciado antes de haver rede; e reenviar com o mesmo id permite ao servidor reconhecer uma duplicata.',
            'Porque UUID ocupa menos espaço.',
            'Porque o SQLite exige.',
          ],
          correta: 1,
          explicacao: 'Com id do servidor, um registro offline não teria identidade até sincronizar, e uma resposta perdida geraria duplicata no reenvio.',
        },
        {
          t: 'quiz',
          pergunta: 'Onde guardar o token de acesso do usuário num app React Native?',
          opcoes: [
            'No AsyncStorage.',
            'No armazenamento seguro do sistema (`expo-secure-store`), que usa o Keychain do iOS e o Keystore do Android.',
            'Numa variável global.',
            'No código-fonte.',
          ],
          correta: 1,
          explicacao: 'O AsyncStorage é texto puro em disco. Credenciais vão para o cofre do sistema operacional, que as cifra e as protege por aplicativo.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'camera-e-captura',
      titulo: 'Câmera e captura padronizada',
      minutos: 13,
      resumo: 'Permissão, foto e envio. E o que o app pode fazer para que a imagem chegue boa ao modelo.',
      blocos: [
        {
          t: 'texto',
          md: `É aqui que esta trilha encontra a de visão computacional. O módulo de dados de lá defendeu que **a qualidade do modelo se decide na captura**. O app é onde o protocolo de captura vira código.

Câmera depende do aparelho: o código desta lição é para ler, e o roteiro para rodá-lo está no final.

### Permissão

O sistema só mostra o pedido de permissão **uma vez**. Se o usuário negar, o app não pode perguntar de novo: só resta mandá-lo às configurações. Por isso:

1. Explique **antes**, numa tela sua, para que a câmera será usada.
2. Peça só no momento em que for usar.
3. Trate a negativa com uma tela que leva às configurações.`,
        },
        {
          t: 'codigo',
          titulo: 'Tela de captura com expo-camera (para ler)',
          lang: 'tsx',
          codigo: `import { useRef, useState } from 'react';
import { View, Text, Pressable, Linking, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function TelaDeCaptura({ aoCapturar }: { aoCapturar: (uri: string) => void }) {
  const [permissao, pedirPermissao] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [pronta, setPronta] = useState(false);

  if (!permissao) return <View />;                       // ainda carregando o estado da permissão

  if (!permissao.granted) {
    return (
      <View style={estilos.centro}>
        <Text>A câmera é usada para fotografar a armadilha.</Text>
        {permissao.canAskAgain
          ? <Pressable onPress={pedirPermissao}><Text>Permitir câmera</Text></Pressable>
          : <Pressable onPress={() => Linking.openSettings()}><Text>Abrir configurações</Text></Pressable>}
      </View>
    );
  }

  async function fotografar() {
    // quality: compressão JPEG. skipProcessing evita correções automáticas que mudam a imagem.
    const foto = await camera.current?.takePictureAsync({ quality: 0.9, exif: true });
    if (foto) aoCapturar(foto.uri);                      // um arquivo local; o envio é outra etapa
  }

  return (
    <View style={{ flex: 1 }}>
      <CameraView ref={camera} style={{ flex: 1 }} facing="back" onCameraReady={() => setPronta(true)} />
      {/* a moldura-guia fica POR CIMA da câmera, com posição absoluta */}
      <View pointerEvents="none" style={estilos.guia} />
      <Pressable style={estilos.disparo} disabled={!pronta} onPress={fotografar} />
    </View>
  );
}`,
        },
        {
          t: 'texto',
          md: `### O protocolo de captura, dentro do app

Cada item abaixo é uma fonte de variação que o modelo teria de aprender a tolerar. Resolvido no app, deixa de ser problema do modelo.

| Problema na imagem | O que o app faz |
|---|---|
| Enquadramento e distância variam | **moldura-guia** sobre a câmera, no formato do cartão; o disparo só libera com o cartão dentro dela |
| Foto tremida ou fora de foco | medir a nitidez (variância do laplaciano) logo após a foto e **pedir outra** se estiver baixa |
| Estourada ou escura | medir a fração de pixels saturados pelo canal máximo, como na lição de histograma |
| Reflexo da cola | orientar o ângulo; detectar a mancha saturada |
| Compressão forte | **qualidade do JPEG fixa e versionada**: a lição de paridade mediu até vinte pontos de perda |
| Resolução diferente por aparelho | redimensionar para um tamanho-alvo no app, com o mesmo método do treino |
| Foto da armadilha errada | ler um **código QR** colado na armadilha: identifica, e de quebra dá a escala em pixels |
| Sem metadados | gravar junto: aparelho, versão do app, data, coordenadas, usina, e as medidas de qualidade |

A moldura-guia e o código QR resolvem mais do que qualquer aumentação de dados.

### Onde roda a checagem de qualidade

A lição "onde rodar" da trilha de visão defendeu o desenho híbrido: **checagem de qualidade no aparelho, na hora; contagem oficial no servidor**. No React Native há três caminhos para a parte do aparelho:

- **Depois da foto, em JavaScript**: redimensionar com \`expo-image-manipulator\` e calcular medidas simples. Suficiente para nitidez e exposição numa imagem reduzida.
- **Em tempo real, sobre os quadros da câmera**: \`react-native-vision-camera\` com *frame processors*, que rodam fora da thread de JavaScript. É o caminho para a moldura-guia que "acende" quando o cartão está enquadrado.
- **Um modelo no aparelho**: \`react-native-executorch\` ou \`react-native-fast-tflite\`, com um detector pequeno, para uma contagem provisória.`,
        },
        {
          t: 'codigo',
          titulo: 'Enviar a foto: multipart, com retomada (para ler)',
          lang: 'tsx',
          codigo: `import * as FileSystem from 'expo-file-system';

// 1. Mover a foto do cache (que o sistema pode apagar) para a pasta de documentos do app.
const destino = FileSystem.documentDirectory + 'capturas/' + captura.id + '.jpg';
await FileSystem.moveAsync({ from: fotoUri, to: destino });

// 2. Enviar. O FormData do React Native aceita um "arquivo" descrito por uri, nome e tipo.
async function enviarFoto(captura: Captura, token: string) {
  const corpo = new FormData();
  corpo.append('foto', { uri: captura.foto, name: captura.id + '.jpg', type: 'image/jpeg' } as any);
  corpo.append('metadados', JSON.stringify({
    armadilha: captura.armadilha,
    capturadaEm: captura.capturadaEm,
    aparelho: Device.modelName,
    versaoDoApp: Application.nativeApplicationVersion,
    nitidez: captura.nitidez,
  }));

  const resposta = await fetch(API + '/capturas/' + captura.id + '/foto', {
    method: 'PUT',                                   // PUT pelo id: reenviar não duplica
    headers: { Authorization: 'Bearer ' + token },   // NÃO defina Content-Type: o fetch põe o boundary
    body: corpo,
  });
  if (!resposta.ok) throw new Error('HTTP ' + resposta.status);
}

// Para arquivos grandes e rede ruim: FileSystem.createUploadTask, que continua em
// segundo plano e reporta progresso; ou envio direto ao armazenamento (Azure Blob)
// com uma URL assinada que a API entrega, sem a foto passar pelo servidor da API.`,
        },
        {
          t: 'nota',
          estilo: 'campo',
          md: `**Roteiro para rodar no seu celular.** \`npx create-expo-app@latest captura\`, depois \`npx expo install expo-camera\`. Cole a tela de captura em \`app/index.tsx\`, rode \`npx expo start\` e leia o código QR com o Expo Go. Experimente negar a permissão e veja o que o app faz. Depois acrescente a moldura-guia: uma \`View\` com \`position: 'absolute'\` e borda, na proporção do cartão.`,
        },
        {
          t: 'quiz',
          pergunta: 'O usuário negou a permissão da câmera. O que o app pode fazer?',
          opcoes: [
            'Pedir de novo até ele aceitar.',
            'Explicar por que precisa e oferecer um atalho para as configurações do sistema; o diálogo de permissão não volta a aparecer.',
            'Usar a câmera mesmo assim.',
            'Fechar.',
          ],
          correta: 1,
          explicacao: 'O sistema mostra o pedido uma vez. Por isso se explica antes de pedir, e se trata a negativa como um estado normal da tela.',
        },
        {
          t: 'quiz',
          pergunta: 'Por que uma moldura-guia e um código QR na armadilha valem mais que aumentação de dados?',
          opcoes: [
            'Porque deixam o app mais bonito.',
            'Porque eliminam a variação na origem: enquadramento, distância e identificação ficam padronizados, e o modelo deixa de precisar tolerar o que não acontece mais.',
            'Porque dispensam o treino.',
            'Porque aumentam a resolução.',
          ],
          correta: 1,
          explicacao: 'Aumentação ensina o modelo a suportar variação. Padronizar a captura remove a variação. O segundo caminho é mais barato e mais confiável.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'publicar',
      titulo: 'Do projeto à loja: builds, atualizações e versões',
      minutos: 10,
      resumo: 'Expo Go, build de desenvolvimento, EAS Build e EAS Update. E a parte que não é código.',
      blocos: [
        {
          t: 'texto',
          md: `Publicar um app é diferente de publicar um site, e a diferença maior não é técnica: existe uma **loja**, com revisão, e **o usuário decide quando atualiza**.

### As quatro formas de rodar o seu código

| | O que é | Quando |
|---|---|---|
| **Expo Go** | app pronto que carrega o seu JavaScript | estudo e protótipo |
| **Build de desenvolvimento** | o seu app, com o seu código nativo, e as ferramentas de desenvolvimento embutidas | o dia a dia de um projeto real |
| **Build de prévia** | o app como será publicado, distribuído por link para a equipe e testadores | homologação |
| **Build de produção** | o arquivo assinado que vai para a loja | publicação |

### EAS: o serviço de build e entrega

\`\`\`bash
npm install -g eas-cli
eas build:configure                      # cria o eas.json com os perfis
eas build --profile development --platform android
eas build --profile production --platform all
eas submit --platform android            # envia para a loja
eas update --channel production          # atualização só do JavaScript
\`\`\`

- **EAS Build** compila na nuvem. Dá para gerar o app de iOS **sem ter um Mac**.
- **EAS Submit** envia o arquivo para a Play Store e a App Store.
- **EAS Update** publica uma nova versão **do JavaScript e dos recursos**, que os apps instalados baixam ao abrir. Corrige um erro em minutos, sem passar pela revisão da loja.`,
        },
        {
          t: 'tabela',
          prosa: true,
          colunas: ['Mudança', 'Atualização pelo ar (EAS Update)', 'Nova versão na loja'],
          linhas: [
            ['Corrigir um texto, uma regra de validação, um erro de tela', 'sim', ''],
            ['Tela nova, só em JavaScript', 'sim', ''],
            ['Acrescentar uma biblioteca com código nativo', '', 'sim'],
            ['Nova permissão (câmera, localização)', '', 'sim'],
            ['Atualizar o Expo SDK ou o React Native', '', 'sim'],
            ['Trocar ícone, nome ou tela de abertura', '', 'sim'],
          ],
        },
        {
          t: 'texto',
          md: `A regra: uma atualização pelo ar só pode ser aplicada a um build cujo **código nativo é compatível**. O campo \`runtimeVersion\` do \`app.json\` faz esse controle. Mandar JavaScript que chama um módulo nativo inexistente naquele build derruba o app na abertura.

### O que não é código

- **Contas de desenvolvedor.** Google Play: taxa única. Apple: anuidade. Em empresa, a conta é da organização, e não de uma pessoa.
- **Revisão.** A Apple revisa cada versão, e pode recusar. Tela de permissão sem explicação é motivo comum.
- **Versões antigas ficam em uso.** Não dá para forçar a atualização. A API precisa **continuar atendendo** a versão publicada há seis meses. Daí: versionar a API, nunca remover campo de resposta, e ter no app uma checagem de "versão mínima suportada" que pede a atualização quando necessário.
- **Privacidade.** As lojas exigem declarar quais dados o app coleta. Localização e fotos entram.
- **Distribuição interna.** App só para funcionários não precisa ir à loja pública: teste interno da Play Store, TestFlight, ou distribuição corporativa.

### Monitorar o que está em campo

Um site quebrado você vê. Um app quebrado no celular de um técnico, no talhão, você só sabe se ele ligar. Desde a primeira versão:

- **Relato de falhas**: Sentry ou o Crashlytics do Firebase. Mostra a pilha de erro, o aparelho e a versão.
- **Versão do app em toda requisição**, num cabeçalho. É o que permite ao servidor explicar um comportamento estranho, e é o mesmo princípio da versão do modelo em cada resposta de inferência.
- **Registro da fila de sincronização**: quantos pendentes, há quanto tempo, por aparelho.`,
        },
        {
          t: 'nota',
          estilo: 'entrevista',
          md: `**"Flutter ou React Native?"** A resposta honesta parte da equipe e do produto. React Native com Expo ganha quando a equipe já escreve React e TypeScript, quando há um front web para compartilhar tipos e lógica, e quando atualização pelo ar importa. Flutter ganha em interface muito customizada e animada, idêntica nas duas plataformas, e em equipes sem vínculo com a web. Ter trabalhado com os dois, e saber dizer por que cada escolha foi feita, vale mais que defender um deles.`,
        },
        {
          t: 'texto',
          md: `### Fontes

- [EAS Build](https://docs.expo.dev/build/introduction/) e [EAS Update](https://docs.expo.dev/eas-update/introduction/)
- [Builds de desenvolvimento](https://docs.expo.dev/develop/development-builds/introduction/)

Conferido em novembro de 2026.`,
        },
        {
          t: 'quiz',
          pergunta: 'O que uma atualização pelo ar (EAS Update) consegue entregar?',
          opcoes: [
            'Qualquer mudança, inclusive novas permissões.',
            'Mudanças em JavaScript e recursos, para builds com código nativo compatível. Biblioteca nativa nova, permissão ou versão do SDK exigem novo build e nova publicação na loja.',
            'Só mudanças de texto.',
            'Só no Android.',
          ],
          correta: 1,
          explicacao: 'O pacote nativo instalado não muda pelo ar. O `runtimeVersion` garante que uma atualização só chegue a builds capazes de executá-la.',
        },
        {
          t: 'quiz',
          pergunta: 'Por que a API de um aplicativo móvel precisa de mais cuidado com compatibilidade do que a de um site?',
          opcoes: [
            'Porque celulares são mais lentos.',
            'Porque versões antigas do app continuam instaladas e em uso por meses: o servidor não pode remover ou mudar o que elas esperam.',
            'Porque o app não usa HTTP.',
            'Porque a loja proíbe mudanças.',
          ],
          correta: 1,
          explicacao: 'O site é atualizado para todos de uma vez. O app, só quando cada usuário atualiza. A API precisa conviver com várias versões do cliente ao mesmo tempo.',
        },
      ],
    },

    // ------------------------------------------------------------------
    {
      id: 'projeto',
      titulo: 'Projeto: registro de capturas sem sinal',
      minutos: 30,
      resumo: 'Formulário, lista e fila de sincronização. O núcleo do app de campo.',
      blocos: [
        {
          t: 'texto',
          md: `O projeto junta a trilha num app pequeno: o técnico registra capturas **sem sinal**, vê o que está pendente e sincroniza quando a rede volta. É o coração do aplicativo do projeto integrador.

A interface, os campos e a "API" que falha sem sinal já estão prontos. Falta a lógica.`,
        },
        {
          t: 'previa',
          plataforma: 'nativo',
          titulo: 'Registro de capturas',
          enunciado: `1. **Registrar.** O botão "Registrar" cria uma captura com \`situacao: 'pendente'\`, a partir dos dois campos, e limpa os campos. Não registra se a armadilha estiver vazia ou se os insetos não forem um inteiro maior ou igual a zero.
2. **Pendentes.** Um \`Text\` com \`testID="pendentes"\` mostra **"N pendentes"**, calculado da lista.
3. **Sincronizar.** Um botão "Sincronizar", **desabilitado** sem sinal ou sem pendentes. Ao tocar, envia cada pendente com \`enviarAoServidor(captura, online)\` e marca como \`'enviada'\`.

Cada linha já mostra a situação da captura.`,
          codigo: PROJETO_INICIO,
          solucao: PROJETO_SOLUCAO,
          dica: 'Guarde um contador para o `id`. `pendentes` é um `.filter()`, e não um estado. Em `sincronizar`, um `for...of` com `await` e, a cada sucesso, `setCapturas(atual => atual.map(...))`. O `Pressable` aceita `disabled`.',
          testes: [
            { nome: 'começa com "0 pendentes" e a lista vazia', codigo: `afirmar(tela.achar('[data-testid="pendentes"]').innerText.trim() === '0 pendentes', 'esperava "0 pendentes"'); afirmar(tela.texto().includes('Nenhuma captura registrada.'), 'a lista deveria começar vazia');` },
            { nome: 'não registra com os campos vazios', codigo: `await tela.clicar('Registrar'); afirmar(tela.achar('[data-testid="pendentes"]').innerText.trim() === '0 pendentes', 'registrou uma captura sem dados');` },
            { nome: 'registra A-01 com 12 insetos, como pendente', codigo: `await tela.digitar('[data-testid="armadilha"]', 'A-01'); await tela.digitar('[data-testid="insetos"]', '12'); await tela.clicar('Registrar'); afirmar(tela.texto().includes('A-01: 12 insetos'), 'a captura não apareceu na lista'); afirmar(tela.texto().includes('pendente'), 'a captura deveria estar como pendente'); afirmar(tela.achar('[data-testid="pendentes"]').innerText.trim() === '1 pendentes', 'esperava "1 pendentes"');` },
            { nome: 'limpa os campos depois de registrar', codigo: `afirmar(tela.achar('[data-testid="armadilha"]').value === '' && tela.achar('[data-testid="insetos"]').value === '', 'os campos deveriam ficar vazios');` },
            { nome: 'recusa número de insetos inválido', codigo: `await tela.digitar('[data-testid="armadilha"]', 'A-02'); await tela.digitar('[data-testid="insetos"]', 'abc'); await tela.clicar('Registrar'); afirmar(!tela.texto().includes('A-02:'), 'registrou com insetos = "abc"');` },
            { nome: 'registra a segunda captura', codigo: `await tela.digitar('[data-testid="insetos"]', '7'); await tela.clicar('Registrar'); afirmar(tela.texto().includes('A-02: 7 insetos'), 'a segunda captura não apareceu'); afirmar(tela.achar('[data-testid="pendentes"]').innerText.trim() === '2 pendentes', 'esperava "2 pendentes"');` },
            { nome: 'sem sinal, Sincronizar está desabilitado', codigo: `const b = tela.botao('Sincronizar'); afirmar(b.getAttribute('aria-disabled') === 'true' || b.disabled, 'sem sinal o botão deveria estar desabilitado');` },
            { nome: 'com sinal, sincroniza tudo', codigo: `const chave = tela.achar('[data-testid="sinal"]'); await tela.clicar(chave.querySelector('input') ?? chave); await tela.clicar('Sincronizar'); await tela.esperar(() => tela.achar('[data-testid="pendentes"]').innerText.trim() === '0 pendentes', 4000); afirmar(tela.texto().split('enviada').length - 1 === 2, 'esperava as 2 capturas como "enviada"');` },
          ],
        },
        {
          t: 'texto',
          md: `### Para levar ao aparelho

O mesmo componente roda num projeto Expo sem mudar uma linha. A partir dele, o caminho até o app de verdade é substituir cada simulação pela peça real, uma por vez:

| Aqui | No app |
|---|---|
| \`useState\` para a lista | tabela no \`expo-sqlite\`, para sobreviver ao fechamento do app |
| chave "sinal" | \`@react-native-community/netinfo\`, mais o resultado real da requisição |
| \`enviarAoServidor\` simulado | \`PUT /capturas/{id}\` na API em .NET, idempotente |
| contador como id | \`crypto.randomUUID()\` |
| só os dois campos | foto da câmera, com moldura-guia e checagem de nitidez |
| botão de sincronizar | o botão, mais sincronização automática ao abrir e ao voltar o sinal |
| uma tela | Expo Router: lista de usinas → armadilhas → captura |

### O que você já sabe fazer

- Montar telas com componentes nativos e posicioná-las com Flexbox.
- Listas eficientes, toque, formulários e teclado.
- Estruturar a navegação em pilha, abas e modal.
- Escolher onde guardar cada dado no aparelho.
- Desenhar um fluxo que funciona sem rede, com fila, identificador local e envio idempotente.
- Levar o protocolo de captura da visão computacional para dentro do app.
- Gerar builds, publicar e atualizar pelo ar.

O servidor que recebe essas capturas é o assunto das trilhas de **PostgreSQL** e **C# .NET**.`,
        },
        {
          t: 'quiz',
          pergunta: 'No projeto, a contagem de pendentes deve ser um estado separado?',
          opcoes: [
            'Sim, atualizado a cada registro e a cada envio.',
            'Não: é derivada da lista de capturas. Calculada na renderização, nunca diverge da lista.',
            'Sim, guardado no AsyncStorage.',
            'Depende da plataforma.',
          ],
          correta: 1,
          explicacao: 'A mesma regra da trilha de React. Duas operações mudam a lista; uma contagem em estado teria de ser lembrada nas duas.',
        },
        {
          t: 'quiz',
          pergunta: 'Durante a sincronização, o envio da terceira captura falha por falta de sinal. O que o laço deve fazer?',
          opcoes: [
            'Marcar todas como enviadas.',
            'Parar: a terceira e as seguintes continuam pendentes, para a próxima tentativa. As duas primeiras ficam como enviadas.',
            'Apagar as capturas restantes.',
            'Tentar de novo sem parar até conseguir.',
          ],
          correta: 1,
          explicacao: 'Cada captura tem a própria situação. Interromper na falha preserva a ordem e evita gastar bateria numa rede que não responde. A repetição vem depois, com espera crescente.',
        },
      ],
    },
  ],
};
