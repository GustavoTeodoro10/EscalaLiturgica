import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { api, ApiError, mensagemDeErro } from '@/services/api';
import type { Crianca, Missa } from '@/types';
import { capitalizar, diaDaSemana } from '@/utils/format-date';

type Compromisso = { missa: Missa; crianca: Crianca };

export function Agenda() {
  const { sessao, sair } = useSession();
  const token = sessao?.token;

  const [missas, setMissas] = useState<Missa[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    if (!token) return;
    let ativo = true;

    api
      .listarMissas(token)
      .then((lista) => {
        if (!ativo) return;
        setMissas(lista);
        setErro(null);
      })
      .catch((e: unknown) => {
        if (!ativo) return;
        if (e instanceof ApiError && e.codigo === 'SESSAO_INVALIDA') sair();
        else setErro(mensagemDeErro(e));
      })
      .finally(() => {
        if (ativo) setAtualizando(false);
      });

    return () => {
      ativo = false;
    };
  }, [token, tentativa, sair]);

  function recarregar() {
    setAtualizando(true);
    setTentativa((n) => n + 1);
  }

  if (!sessao) return null;

  const compromissos: Compromisso[] = (missas ?? []).flatMap((missa) =>
    sessao.criancas
      .filter((c) => (c.funcao === 'Coroinha' ? missa.coroinhas : missa.cerimoniarios).includes(c.id))
      .map((crianca) => ({ missa, crianca })),
  );

  const primeiroNome = sessao.responsavel.split(' ')[0];

  return (
    <Screen
      title="Agenda da família"
      subtitle={`Olá, ${primeiroNome}. Estas são as missas em que sua família está escalada.`}
      onRefresh={recarregar}
      refreshing={atualizando}>
      {missas === null && !erro ? <ActivityIndicator style={styles.espaco} /> : null}

      {erro ? (
        <View style={styles.bloco}>
          <ThemedText accessibilityRole="alert">{erro}</ThemedText>
          <Button title="Tentar de novo" variant="secondary" onPress={recarregar} />
        </View>
      ) : null}

      {missas !== null && compromissos.length === 0 ? (
        <ThemedText themeColor="textSecondary">
          Nenhum compromisso agendado ainda. Veja as missas com vagas na aba Vagas.
        </ThemedText>
      ) : null}

      {compromissos.map(({ missa, crianca }) => (
        <ThemedView
          key={`${missa.linha}-${crianca.id}`}
          type="backgroundElement"
          style={styles.cartao}>
          <ThemedText type="smallBold">{crianca.nome}</ThemedText>
          <ThemedText>
            {capitalizar(diaDaSemana(missa.data))}, {missa.data} às {missa.horario}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {crianca.funcao}
            {missa.descricao ? ` · ${missa.descricao}` : ''}
          </ThemedText>
        </ThemedView>
      ))}

      <View style={styles.sair}>
        <Button title="Sair" variant="secondary" onPress={sair} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  espaco: {
    marginVertical: Spacing.four,
  },
  bloco: {
    gap: Spacing.three,
  },
  cartao: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  sair: {
    marginTop: Spacing.four,
  },
});
