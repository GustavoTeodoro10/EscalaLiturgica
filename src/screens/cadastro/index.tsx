import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Aviso } from '@/components/aviso';
import { Button } from '@/components/button';
import { Card, Divisor } from '@/components/card';
import { Chip } from '@/components/chip';
import { ESCOLHA_VAZIA, EscolhaFuncao } from '@/components/escolha-funcao';
import { FormScreen } from '@/components/form-screen';
import { PlusIcon, XIcon } from '@/components/icones';
import { TextField } from '@/components/text-field';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { Spacing, TouchTarget } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { api, mensagemDeErro } from '@/services/api';
import type { Escolha, PastoralPublica, Sessao } from '@/types';
import { emailValido, SENHA_MAXIMA, SENHA_MINIMA } from '@/utils/validacao';

type Filho = { nome: string; pastoralId: string; funcaoId: string; rotulo: string };
type Erros = Partial<Record<'nome' | 'email' | 'senha' | 'pessoas' | 'eu' | 'filho' | 'geral', string>>;

function rotuloDaEscolha(pastorais: PastoralPublica[], e: Escolha): string {
  const p = pastorais.find((x) => x.id === e.pastoralId);
  const f = p?.funcoes.find((x) => x.id === e.funcaoId);
  if (!p || !f) return '';
  return pastorais.length > 1 ? `${f.nome} · ${p.nome}` : f.nome;
}

export function Cadastro() {
  const router = useRouter();
  const theme = useTheme();
  const { iniciarSessao } = useSession();

  const [pastorais, setPastorais] = useState<PastoralPublica[] | null>(null);
  const [erroPastorais, setErroPastorais] = useState<string | null>(null);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [celular, setCelular] = useState('');
  const [senha, setSenha] = useState('');
  const [euSirvo, setEuSirvo] = useState(false);
  const [euEscolha, setEuEscolha] = useState<Escolha>(ESCOLHA_VAZIA);
  const [filhos, setFilhos] = useState<Filho[]>([]);
  const [filhoNome, setFilhoNome] = useState('');
  const [filhoEscolha, setFilhoEscolha] = useState<Escolha>(ESCOLHA_VAZIA);
  const [erros, setErros] = useState<Erros>({});
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState<{ sessao: Sessao; usuario: string } | null>(null);

  useEffect(() => {
    let ativo = true;
    api
      .listarPastorais()
      .then((lista) => {
        if (ativo) setPastorais(lista);
      })
      .catch((e: unknown) => {
        if (ativo) setErroPastorais(mensagemDeErro(e));
      });
    return () => {
      ativo = false;
    };
  }, []);

  // com uma só pastoral, a escolha dela é automática
  const unica = pastorais && pastorais.length === 1 ? pastorais[0].id : null;
  const euCompleta: Escolha = { pastoralId: unica ?? euEscolha.pastoralId, funcaoId: euEscolha.funcaoId };
  const filhoCompleta: Escolha = { pastoralId: unica ?? filhoEscolha.pastoralId, funcaoId: filhoEscolha.funcaoId };

  function adicionarFilho() {
    if (!pastorais) return;
    const limpo = filhoNome.trim();
    if (limpo.length < 2) {
      setErros((e) => ({ ...e, filho: 'Digite o nome do filho(a).' }));
      return;
    }
    if (!filhoCompleta.funcaoId) {
      setErros((e) => ({ ...e, filho: 'Escolha a função do filho(a).' }));
      return;
    }
    setErros((e) => ({ ...e, filho: undefined, pessoas: undefined }));
    setFilhos((atual) => [
      ...atual,
      { nome: limpo, pastoralId: filhoCompleta.pastoralId, funcaoId: filhoCompleta.funcaoId, rotulo: rotuloDaEscolha(pastorais, filhoCompleta) },
    ]);
    setFilhoNome('');
    setFilhoEscolha(ESCOLHA_VAZIA);
  }

  async function enviar() {
    if (enviando || !pastorais) return;
    const nomeLimpo = nome.trim();
    const novos: Erros = {};

    if (nomeLimpo.split(/\s+/).length < 2) novos.nome = 'Informe seu nome e sobrenome.';
    if (!emailValido(email)) novos.email = 'Informe um e-mail válido.';
    if (senha.length < SENHA_MINIMA) novos.senha = `A senha deve ter ao menos ${SENHA_MINIMA} caracteres.`;
    else if (senha.length > SENHA_MAXIMA) novos.senha = `A senha deve ter no máximo ${SENHA_MAXIMA} caracteres.`;
    if (euSirvo && !euCompleta.funcaoId) novos.eu = 'Escolha a função em que você vai servir.';
    if (!euSirvo && filhos.length === 0) novos.pessoas = 'Informe quem vai servir: você, um filho(a) ou os dois.';

    setErros(novos);
    if (Object.keys(novos).length > 0) return;

    setEnviando(true);
    try {
      const resultado = await api.cadastrar({
        nome: nomeLimpo,
        email: email.trim(),
        celular: celular.trim(),
        senha,
        euSirvo: euSirvo ? euCompleta : null,
        filhos: filhos.map((f) => ({ nome: f.nome, pastoralId: f.pastoralId, funcaoId: f.funcaoId })),
      });
      if (!resultado.sucesso) setErros({ geral: resultado.mensagem });
      else setConcluido({ sessao: resultado.sessao, usuario: resultado.usuario });
    } catch (e) {
      setErros({ geral: mensagemDeErro(e) });
    } finally {
      setEnviando(false);
    }
  }

  // Cadastro feito: mostra o usuário gerado ANTES de entrar, para a pessoa anotar.
  if (concluido) {
    return (
      <FormScreen title="Cadastro concluído" subtitle="Guarde o seu usuário: você vai usá-lo para entrar.">
        <Card style={styles.destaque}>
          <ThemedText type="small" themeColor="textSecondary">
            Seu usuário
          </ThemedText>
          <ThemedText type="title" selectable accessibilityLabel={`Seu usuário é ${concluido.usuario}`}>
            {concluido.usuario}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Também enviamos esse usuário para o e-mail cadastrado.
          </ThemedText>
        </Card>
        <Aviso tipo="info">
          A participação de cada pessoa precisa ser aprovada pelo coordenador da pastoral. Você acompanha pelo app.
        </Aviso>
        <Button title="Entrar no app" onPress={() => iniciarSessao(concluido.sessao)} />
      </FormScreen>
    );
  }

  return (
    <FormScreen
      title="Criar cadastro"
      subtitle="Cadastre-se e escolha em qual pastoral você ou seus filhos vão servir nas missas.">
      <View style={styles.grupo}>
        <TextField
          label="Seu nome completo"
          value={nome}
          onChangeText={setNome}
          erro={erros.nome}
          placeholder="Nome e sobrenome"
          autoComplete="name"
          textContentType="name"
          autoCapitalize="words"
        />
        <TextField
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          erro={erros.email}
          placeholder="seu@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
        />
        <TextField
          label="Celular / WhatsApp"
          value={celular}
          onChangeText={setCelular}
          ajuda="Opcional. A coordenação usa para chamar quando faltar gente."
          placeholder="(11) 90000-0000"
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
        />
        <TextField
          label="Crie uma senha"
          value={senha}
          onChangeText={setSenha}
          erro={erros.senha}
          ajuda={`Mínimo de ${SENHA_MINIMA} caracteres.`}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
        />
      </View>

      {pastorais === null && !erroPastorais ? (
        <ThemedText themeColor="textSecondary">Carregando as pastorais...</ThemedText>
      ) : null}
      {erroPastorais ? <Aviso tipo="erro">{erroPastorais}</Aviso> : null}
      {pastorais !== null && pastorais.length === 0 ? (
        <Aviso tipo="info">Ainda não há pastorais abertas para cadastro. Procure a secretaria da paróquia.</Aviso>
      ) : null}

      {pastorais !== null && pastorais.length > 0 ? (
        <>
          <View style={styles.grupo}>
            <ThemedText type="heading" accessibilityRole="header">
              Você serve nas missas?
            </ThemedText>
            <View style={styles.chips} accessibilityRole="radiogroup">
              <Chip rotulo="Não" ativo={!euSirvo} onPress={() => setEuSirvo(false)} />
              <Chip rotulo="Sim, eu sirvo" ativo={euSirvo} onPress={() => setEuSirvo(true)} />
            </View>
            {euSirvo ? (
              <EscolhaFuncao pastorais={pastorais} valor={euCompleta} onChange={setEuEscolha} />
            ) : null}
            {erros.eu ? <Aviso tipo="erro">{erros.eu}</Aviso> : null}
          </View>

          <View style={styles.grupo}>
            <ThemedText type="heading" accessibilityRole="header">
              Filhos
            </ThemedText>

            {filhos.length > 0 ? (
              <Card style={styles.listaFilhos}>
                {filhos.map((f, i) => (
                  <View key={`${f.nome}-${i}`}>
                    {i > 0 ? <Divisor /> : null}
                    <View style={styles.filho}>
                      <View style={styles.filhoTexto}>
                        <ThemedText type="strong">{f.nome}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {f.rotulo}
                        </ThemedText>
                      </View>
                      <Pressable
                        onPress={() => setFilhos((atual) => atual.filter((_, j) => j !== i))}
                        accessibilityRole="button"
                        accessibilityLabel={`Remover ${f.nome}`}
                        style={styles.remover}>
                        <XIcon size={20} color={theme.textSecondary} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </Card>
            ) : null}

            <TextField
              label="Nome do filho(a)"
              value={filhoNome}
              onChangeText={setFilhoNome}
              erro={erros.filho}
              placeholder="Nome"
              autoCapitalize="words"
              onSubmitEditing={adicionarFilho}
            />
            <EscolhaFuncao pastorais={pastorais} valor={filhoCompleta} onChange={setFilhoEscolha} />
            <Button title="Adicionar filho(a)" variant="secondary" icone={PlusIcon} onPress={adicionarFilho} />
            {erros.pessoas ? <Aviso tipo="erro">{erros.pessoas}</Aviso> : null}
          </View>
        </>
      ) : null}

      {erros.geral ? <Aviso tipo="erro">{erros.geral}</Aviso> : null}

      <Button title="Criar cadastro" onPress={enviar} loading={enviando} disabled={!pastorais || pastorais.length === 0} />
      <TextLink rotulo="Já tenho cadastro" onPress={() => router.replace('/login')} />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  grupo: {
    gap: Spacing.three,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  listaFilhos: {
    gap: 0,
    paddingVertical: 0,
  },
  filho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  filhoTexto: {
    flex: 1,
  },
  remover: {
    width: TouchTarget,
    height: TouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destaque: {
    gap: Spacing.one,
    padding: Spacing.four,
  },
});
