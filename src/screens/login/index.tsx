import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Aviso } from '@/components/aviso';
import { Button } from '@/components/button';
import { FormScreen } from '@/components/form-screen';
import { TextField } from '@/components/text-field';
import { TextLink } from '@/components/text-link';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';

export function Login() {
  const router = useRouter();
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
    <FormScreen
      tamanhoBrasao={96}
      title="Escala Litúrgica"
      subtitle="Paróquia São Vicente de Paulo, Mauá">
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

        {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}

        <Button title="Entrar" onPress={enviar} loading={enviando} />
      </View>

      <View style={styles.links}>
        <TextLink rotulo="Esqueci minha senha" onPress={() => router.push('/esqueci-senha')} />
        <TextLink rotulo="Criar cadastro" onPress={() => router.push('/cadastro')} />
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  formulario: {
    gap: Spacing.three,
  },
  links: {
    alignItems: 'center',
    gap: Spacing.one,
  },
});
