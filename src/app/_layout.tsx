import { DarkTheme, DefaultTheme, SplashScreen, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, useColorScheme } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { SessionProvider, useSession } from '@/hooks/use-session';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SessionProvider>
        <Navegador />
      </SessionProvider>
    </ThemeProvider>
  );
}

function Navegador() {
  const { carregando, sessao } = useSession();

  useEffect(() => {
    if (!carregando) SplashScreen.hide();
  }, [carregando]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!!sessao}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!sessao}>
          <Stack.Screen name="login" />
        </Stack.Protected>
      </Stack>

      {/* Cobre a tela enquanto a sessão é reaberta, para o login não "piscar" na web */}
      {carregando ? (
        <ThemedView style={[StyleSheet.absoluteFill, styles.carregando]}>
          <ActivityIndicator />
        </ThemedView>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  carregando: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
