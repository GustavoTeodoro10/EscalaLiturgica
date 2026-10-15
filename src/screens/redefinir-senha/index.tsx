import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { Aviso } from '@/components/aviso';
import { Button } from '@/components/button';
import { FormScreen } from '@/components/form-screen';
import { TextField } from '@/components/text-field';
import { TextLink } from '@/components/text-link';
import { useSession } from '@/hooks/use-session';
import { api, mensagemDeErro } from '@/services/api';
import { SENHA_MAXIMA, SENHA_MINIMA, tokenRedefinicaoValido } from '@/utils/validacao';

export function RedefinirSenha() {
  const router = useRouter();
  const { sessao } = useSession();
  const { token: tokenParam } = useLocalSearchParams<{ token?: string | string[] }>();
  const token = Array.isArray(tokenParam) ? tokenParam[0] : (tokenParam ?? '');

  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [erroConfirmacao, setErroConfirmacao] = useState<string | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [feito, setFeito] = useState(false);

  const irParaInicio = () => router.replace(sessao ? '/' : '/login');

  async function salvar() {
    if (enviando) return;
    setErroGeral(null);

    const tamanho =
      senha.length < SENHA_MINIMA
        ? `A senha deve ter ao menos ${SENHA_MINIMA} caracteres.`
        : senha.length > SENHA_MAXIMA
          ? `A senha deve ter no máximo ${SENHA_MAXIMA} caracteres.`
          : null;
    const igual = senha !== confirmacao ? 'As senhas não conferem.' : null;
    setErroSenha(tamanho);
    setErroConfirmacao(tamanho ? null : igual);
    if (tamanho || igual) return;

    setEnviando(true);
    try {
      const resultado = await api.redefinirSenha(token, senha);
      if (resultado.sucesso) setFeito(true);
      else setErroGeral(resultado.mensagem ?? 'Não foi possível redefinir a senha.');
    } catch (e) {
      setErroGeral(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  if (!tokenRedefinicaoValido(token)) {
    return (
      <FormScreen title="Link inválido" subtitle="Este link de redefinição não está completo ou já foi alterado.">
        <Button title="Pedir um novo link" onPress={() => router.replace('/esqueci-senha')} />
        <TextLink rotulo="Voltar" onPress={irParaInicio} />
      </FormScreen>
    );
  }

  if (feito) {
    return (
      <FormScreen title="Senha alterada" subtitle="Tudo certo. Use a nova senha para entrar.">
        <Aviso tipo="ok">Sua senha foi redefinida.</Aviso>
        <Button title={sessao ? 'Continuar' : 'Ir para o login'} onPress={irParaInicio} />
      </FormScreen>
    );
  }

  return (
    <FormScreen title="Nova senha" subtitle="Escolha uma senha nova para o seu acesso.">
      <TextField
        label="Nova senha"
        value={senha}
        onChangeText={setSenha}
        erro={erroSenha}
        ajuda={`Mínimo de ${SENHA_MINIMA} caracteres.`}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <TextField
        label="Repita a senha"
        value={confirmacao}
        onChangeText={setConfirmacao}
        erro={erroConfirmacao}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={salvar}
      />

      {erroGeral ? <Aviso tipo="erro">{erroGeral}</Aviso> : null}

      <Button title="Salvar nova senha" onPress={salvar} loading={enviando} />
      <TextLink rotulo="Cancelar" onPress={irParaInicio} />
    </FormScreen>
  );
}
