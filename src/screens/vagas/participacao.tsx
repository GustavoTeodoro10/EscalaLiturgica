import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Aviso } from '@/components/aviso';
import { Button } from '@/components/button';
import { Card, Divisor } from '@/components/card';
import { Chip } from '@/components/chip';
import { ESCOLHA_VAZIA, EscolhaFuncao } from '@/components/escolha-funcao';
import { UserPlusIcon } from '@/components/icones';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useEventos } from '@/hooks/use-eventos';
import { useSession } from '@/hooks/use-session';
import { api, mensagemDeErro } from '@/services/api';
import type { Escolha, PastoralPublica, Pessoa } from '@/types';

/** Em quais pastorais cada pessoa participa, o que está aguardando aprovação, e pedido de novas funções. */
export function Participacao({ pessoas }: { pessoas: Pessoa[] }) {
  const { sessao, recarregarSessao } = useSession();
  const { recarregar } = useEventos();

  const [pastorais, setPastorais] = useState<PastoralPublica[] | null>(null);
  const [pessoaId, setPessoaId] = useState<string>(pessoas[0]?.id ?? '');
  const [escolha, setEscolha] = useState<Escolha>(ESCOLHA_VAZIA);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  useEffect(() => {
    let ativo = true;
    api
      .listarPastorais()
      .then((lista) => {
        if (ativo) setPastorais(lista);
      })
      .catch(() => {
        if (ativo) setPastorais([]);
      });
    return () => {
      ativo = false;
    };
  }, []);

  const pessoa = pessoas.find((p) => p.id === pessoaId) ?? pessoas[0] ?? null;
  const jaTem = useMemo(() => new Set((pessoa?.membros ?? []).map((m) => m.funcaoId)), [pessoa]);
  const unica = pastorais && pastorais.length === 1 ? pastorais[0].id : null;
  const completa: Escolha = { pastoralId: unica ?? escolha.pastoralId, funcaoId: escolha.funcaoId };

  async function pedir() {
    const token = sessao?.token;
    if (!pessoa || !token || enviando) return;
    if (!completa.funcaoId) return setAviso({ tipo: 'erro', texto: 'Escolha a função em que quer participar.' });

    setEnviando(true);
    setAviso(null);
    try {
      const r = await api.solicitarEntrada(token, pessoa.id, completa.funcaoId);
      if (r.sucesso) {
        setAviso({ tipo: 'ok', texto: 'Pedido enviado. O coordenador da pastoral vai analisar.' });
        setEscolha(ESCOLHA_VAZIA);
        await Promise.all([recarregarSessao(), recarregar()]);
      } else {
        setAviso({ tipo: 'erro', texto: r.mensagem ?? 'Não foi possível enviar o pedido.' });
      }
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e) });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View style={styles.coluna}>
      <ThemedText type="heading" accessibilityRole="header">
        Participação nas pastorais
      </ThemedText>

      <Card style={styles.lista}>
        {pessoas.map((p, i) => (
          <View key={p.id}>
            {i > 0 ? <Divisor /> : null}
            <View style={styles.pessoa}>
              <ThemedText type="strong">{p.nome}</ThemedText>
              {p.membros.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Ainda não participa de nenhuma pastoral.
                </ThemedText>
              ) : (
                p.membros.map((m) => (
                  <ThemedText
                    key={m.funcaoId}
                    type="small"
                    themeColor={m.situacao === 'pendente' ? 'attentionText' : 'textSecondary'}>
                    {m.funcao} · {m.pastoral}
                    {m.situacao === 'pendente' ? ' (aguardando aprovação)' : ''}
                  </ThemedText>
                ))
              )}
            </View>
          </View>
        ))}
      </Card>

      {pastorais !== null && pastorais.length > 0 && pessoa ? (
        <Card>
          <ThemedText type="smallBold">Pedir para participar de uma função</ThemedText>

          {pessoas.length > 1 ? (
            <View style={styles.chips} accessibilityRole="radiogroup">
              {pessoas.map((p) => (
                <Chip
                  key={p.id}
                  rotulo={p.nome}
                  ativo={p.id === pessoa.id}
                  onPress={() => {
                    setPessoaId(p.id);
                    setEscolha(ESCOLHA_VAZIA);
                    setAviso(null);
                  }}
                />
              ))}
            </View>
          ) : null}

          <EscolhaFuncao pastorais={pastorais} valor={completa} onChange={setEscolha} jaTem={jaTem} />

          {aviso ? <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso> : null}

          <Button
            title="Pedir participação"
            variant="secondary"
            icone={UserPlusIcon}
            onPress={pedir}
            loading={enviando}
            disabled={!completa.funcaoId}
          />
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  coluna: {
    gap: Spacing.three,
  },
  lista: {
    gap: 0,
    paddingVertical: 0,
  },
  pessoa: {
    paddingVertical: Spacing.three,
    gap: Spacing.half,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
