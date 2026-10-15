// Só a SemiBold: o índice do pacote traz as 14 variações (3,6 MB) para dentro do build.
import { Spectral_600SemiBold } from '@expo-google-fonts/spectral/600SemiBold';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, SplashScreen, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { ReduceMotion, ReducedMotionConfig } from 'react-native-reanimated';

import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { SessionProvider, useSession } from '@/hooks/use-session';

SplashScreen.preventAutoHideAsync();

// Tema de navegação com a paleta da paróquia, para o fundo não "piscar" em branco entre telas.
function temaDeNavegacao(base: typeof DefaultTheme, cores: (typeof Colors)['light' | 'dark']): typeof DefaultTheme {
  return {
    ...base,
    colors: {
      ...base.colors,
      background: cores.background,
      card: cores.surface,
      text: cores.text,
      border: cores.line,
      primary: cores.accent,
    },
  };
}

const TEMA_CLARO = temaDeNavegacao(DefaultTheme, Colors.light);
const TEMA_ESCURO = temaDeNavegacao(DarkTheme, Colors.dark);

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // Se a fonte falhar, o app segue com a fonte do sistema em vez de ficar preso na splash.
  const [fontesProntas, erroDeFonte] = useFonts({ Spectral_600SemiBold });

  return (
    <ThemeProvider value={colorScheme === 'dark' ? TEMA_ESCURO : TEMA_CLARO}>
      {/* "Reduzir movimento" do sistema desliga transições, entradas e o pulso do esqueleto. */}
      <ReducedMotionConfig mode={ReduceMotion.System} />
      <SessionProvider>
        <Navegador fontesProntas={fontesProntas || !!erroDeFonte} />
      </SessionProvider>
    </ThemeProvider>
  );
}

function Navegador({ fontesProntas }: { fontesProntas: boolean }) {
  const { carregando, sessao } = useSession();
  const pronto = fontesProntas && !carregando;

  useEffect(() => {
    if (pronto) SplashScreen.hide();
  }, [pronto]);

  // Só monta as rotas depois de saber se há sessão. Com o navegador montado antes, a rota
  // protegida descarta o endereço pedido (ex.: /vagas) e a pessoa cai sempre na Agenda.
  // Também esperamos a fonte: assim o título nunca aparece na fonte errada e "pula".
  if (!pronto) return <ThemedView style={styles.carregando} />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!sessao}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!sessao}>
        <Stack.Screen name="login" />
        <Stack.Screen name="cadastro" />
        <Stack.Screen name="esqueci-senha" />
      </Stack.Protected>
      {/* O link do e-mail precisa abrir mesmo com a pessoa já logada. */}
      <Stack.Screen name="redefinir-senha" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  carregando: {
    flex: 1,
  },
});
