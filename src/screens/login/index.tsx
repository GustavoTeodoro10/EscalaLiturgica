import { Image } from 'expo-image';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';

export function Login() {
  const { entrar } = useSession();
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    if (enviando) return;
    if (!usuario.trim() || !senha) {
      setErro('Preencha usuário e senha.');
      return;
    }
    setErro(null);
    setEnviando(true);
    const mensagem = await entrar(usuario, senha);
    // se entrou, esta tela é desmontada pela rota protegida; só falha precisa de estado
    if (mensagem) {
      setErro(mensagem);
      setEnviando(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled">
            <View style={styles.cabecalho}>
              <Image
                source={require('@/assets/images/logo-paroquia.jpg')}
                style={styles.logo}
                contentFit="contain"
                accessibilityLabel="Brasão da Paróquia São Vicente de Paulo"
              />
              <ThemedText type="subtitle" style={styles.centro}>
                Escala de Coroinhas e Cerimoniários
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.centro}>
                Paróquia São Vicente de Paulo · Mauá-SP
              </ThemedText>
            </View>

            <View style={styles.formulario}>
              <TextField
                label="Usuário"
                value={usuario}
                onChangeText={setUsuario}
                placeholder="ex: Nome.Sobrenome"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                textContentType="username"
                returnKeyType="next"
              />
              <TextField
                label="Senha"
                value={senha}
                onChangeText={setSenha}
                placeholder="Sua senha"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={enviar}
              />

              {erro ? (
                <ThemedText type="small" accessibilityRole="alert" style={styles.erro}>
                  {erro}
                </ThemedText>
              ) : null}

              <Button title="Entrar" onPress={enviar} loading={enviando} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: 480,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: Spacing.five,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
  },
  cabecalho: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: Spacing.two,
  },
  centro: {
    textAlign: 'center',
  },
  formulario: {
    gap: Spacing.three,
  },
  erro: {
    color: '#B3261E',
  },
});
