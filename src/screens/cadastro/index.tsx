import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Aviso } from '@/components/aviso';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { FormScreen } from '@/components/form-screen';
import { TextField } from '@/components/text-field';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { api, mensagemDeErro } from '@/services/api';
import type { NovoCadastro, PastoralPublica, Sessao } from '@/types';
import { emailValido, mascaraData, nascimentoParaIso, SENHA_MAXIMA, SENHA_MINIMA } from '@/utils/validacao';

import { type Bloco, BlocoPastoral, blocoInicial } from './bloco-pastoral';

type Erros = Partial<Record<'nome' | 'email' | 'senha' | 'nascimento' | 'pastorais' | 'geral', string>>;

export function Cadastro() {
  const router = useRouter();
  const { iniciarSessao } = useSession();

  const [pastorais, setPastorais] = useState<PastoralPublica[] | null>(null);
  const [erroPastorais, setErroPastorais] = useState<string | null>(null);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [celular, setCelular] = useState('');
  const [nascimento, setNascimento] = useState('');
  const [senha, setSenha] = useState('');
  /** pastorais marcadas, com o que a família escolheu em cada uma */
  const [blocos, setBlocos] = useState<Record<string, Bloco>>({});
  const [errosBloco, setErrosBloco] = useState<Record<string, string>>({});
  const [erros, setErros] = useState<Erros>({});
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState<{ sessao: Sessao; usuario: string } | null>(null);

  useEffect(() => {
    let ativo = true;
    api
      .listarPastorais()
      .then((lista) => {
        if (!ativo) return;
        setPastorais(lista);
        // com uma só pastoral aberta, ela já vem marcada
        if (lista.length === 1) setBlocos({ [lista[0].id]: blocoInicial(lista[0]) });
      })
      .catch((e: unknown) => {
        if (ativo) setErroPastorais(mensagemDeErro(e));
      });
    return () => {
      ativo = false;
    };
  }, []);

  function alternarPastoral(p: PastoralPublica) {
    setBlocos((atual) => {
      const { [p.id]: removida, ...resto } = atual;
      return removida ? resto : { ...atual, [p.id]: blocoInicial(p) };
    });
    setErrosBloco((atual) => ({ ...atual, [p.id]: '' }));
    setErros((e) => ({ ...e, pastorais: undefined }));
  }

  async function enviar() {
    if (enviando || !pastorais) return;
    const nomeLimpo = nome.trim();
    const novos: Erros = {};
    const novosBloco: Record<string, string> = {};

    if (nomeLimpo.split(/\s+/).length < 2) novos.nome = 'Informe seu nome e sobrenome.';
    if (!emailValido(email)) novos.email = 'Informe um e-mail válido.';
    if (senha.length < SENHA_MINIMA) novos.senha = `A senha deve ter ao menos ${SENHA_MINIMA} caracteres.`;
    else if (senha.length > SENHA_MAXIMA) novos.senha = `A senha deve ter no máximo ${SENHA_MAXIMA} caracteres.`;
    const nasc = nascimentoParaIso(nascimento, 18);
    if ('erro' in nasc) novos.nascimento = nasc.erro;

    const marcadas = pastorais.filter((p) => blocos[p.id]);
    if (marcadas.length === 0) novos.pastorais = 'Marque ao menos uma pastoral em que você ou seus filhos vão servir.';
    for (const p of marcadas) {
      const b = blocos[p.id];
      if (b.rascunho.nome.trim()) {
        novosBloco[p.id] = `Toque em "Adicionar filho(a)" para incluir ${b.rascunho.nome.trim()}.`;
      } else if (!b.eu && b.filhos.length === 0) {
        novosBloco[p.id] = 'Diga quem vai servir: você, seu filho(a) ou os dois.';
      } else if (b.eu && !b.funcaoEu) {
        novosBloco[p.id] = 'Escolha a sua função.';
      }
    }

    setErros(novos);
    setErrosBloco(novosBloco);
    if ('erro' in nasc || Object.keys(novos).length > 0 || Object.keys(novosBloco).length > 0) return;

    const dados: NovoCadastro = {
      nome: nomeLimpo,
      email: email.trim(),
      celular: celular.trim(),
      senha,
      nascimento: nasc.iso,
      euSirvo: marcadas
        .filter((p) => blocos[p.id].eu)
        .map((p) => ({ pastoralId: p.id, funcaoId: blocos[p.id].funcaoEu })),
      filhos: marcadas.flatMap((p) =>
        blocos[p.id].filhos.map((f) => ({
          nome: f.nome,
          // a data do filho já foi conferida ao adicioná-lo
          nascimento: (nascimentoParaIso(f.nascimento) as { iso: string }).iso,
          pastoralId: p.id,
          funcaoId: f.funcaoId,
        })),
      ),
    };

    setEnviando(true);
    try {
      const resultado = await api.cadastrar(dados);
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
      subtitle="Cadastre-se e escolha em quais pastorais você ou seus filhos vão servir nas missas.">
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
          label="Sua data de nascimento"
          value={nascimento}
          onChangeText={(t) => setNascimento(mascaraData(t))}
          erro={erros.nascimento}
          placeholder="dd/mm/aaaa"
          keyboardType="number-pad"
          maxLength={10}
          autoComplete="birthdate-full"
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
              Em quais pastorais vocês vão servir?
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Marque uma ou mais e, em cada uma, diga quem serve: você, seu filho(a) ou os dois.
            </ThemedText>
            <View style={styles.chips}>
              {pastorais.map((p) => (
                <Chip
                  key={p.id}
                  papel="checkbox"
                  rotulo={p.nome}
                  ativo={!!blocos[p.id]}
                  onPress={() => alternarPastoral(p)}
                />
              ))}
            </View>
            {erros.pastorais ? <Aviso tipo="erro">{erros.pastorais}</Aviso> : null}
          </View>

          {pastorais
            .filter((p) => blocos[p.id])
            .map((p) => (
              <BlocoPastoral
                key={p.id}
                pastoral={p}
                bloco={blocos[p.id]}
                onChange={(proximo) => {
                  setBlocos((atual) => ({ ...atual, [p.id]: proximo }));
                  setErrosBloco((atual) => ({ ...atual, [p.id]: '' }));
                }}
                erro={errosBloco[p.id] || undefined}
              />
            ))}
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
  destaque: {
    gap: Spacing.one,
    padding: Spacing.four,
  },
});
