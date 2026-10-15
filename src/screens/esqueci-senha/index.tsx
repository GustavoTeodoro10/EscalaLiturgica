import { useRouter } from 'expo-router';
import { useState } from 'react';

import { Aviso } from '@/components/aviso';
import { Button } from '@/components/button';
import { FormScreen } from '@/components/form-screen';
import { TextField } from '@/components/text-field';
import { TextLink } from '@/components/text-link';
import { api, mensagemDeErro } from '@/services/api';

export function EsqueciSenha() {
  const router = useRouter();
  const [usuario, setUsuario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar() {
    if (enviando) return;
    if (!usuario.trim()) {
      setErro('Informe o seu usuário.');
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      await api.solicitarRecuperacao(usuario.trim());
      setEnviado(true);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <FormScreen
      title="Esqueci minha senha"
      subtitle="Informe o seu usuário e enviaremos um link para redefinir a senha no e-mail cadastrado.">
      <TextField
        label="Usuário"
        value={usuario}
        onChangeText={setUsuario}
        erro={erro}
        placeholder="ex: Nome.Sobrenome"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        textContentType="username"
        returnKeyType="send"
        onSubmitEditing={enviar}
        editable={!enviado}
      />

      {enviado ? (
        <Aviso tipo="ok">Se o usuário existir, enviamos um link para o e-mail cadastrado. Ele vale por 1 hora.</Aviso>
      ) : (
        <Button title="Enviar link" onPress={enviar} loading={enviando} />
      )}

      <TextLink rotulo="Voltar para o login" onPress={() => router.replace('/login')} />
    </FormScreen>
  );
}
