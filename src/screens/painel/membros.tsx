import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Aviso } from '@/components/aviso';
import { Button } from '@/components/button';
import { Card, Divisor } from '@/components/card';
import { EstadoVazio } from '@/components/estado-vazio';
import { EsqueletoLista } from '@/components/esqueleto';
import { CheckIcon, UsersIcon, XIcon } from '@/components/icones';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { usePainel } from '@/hooks/use-painel';
import type { MembroDaPastoral } from '@/types';
import { plural } from '@/utils/rotulos';

function descricao(m: MembroDaPastoral): string {
  const quem = m.tipo === 'adulto' ? 'Adulto' : 'Criança';
  const comIdade = m.idade === null ? quem : `${quem} · ${m.idade} ${m.idade === 1 ? 'ano' : 'anos'}`;
  return m.responsavel && m.tipo === 'crianca' ? `${comIdade} · responsável: ${m.responsavel}` : comIdade;
}

/** Pedidos de entrada para aprovar e lista de quem já participa da pastoral. */
export function Membros() {
  const { membros, eventos, resumo, decidirEntrada, removerMembro } = usePainel();
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  if (resumo === null && eventos === null) return <EsqueletoLista linhas={2} />;

  const pendentes = membros.filter((m) => m.situacao === 'pendente');
  const ativos = membros.filter((m) => m.situacao === 'ativo');
  const funcoes = [...new Set(ativos.map((m) => m.funcao))];

  async function agir(chave: string, acao: () => Promise<string | null>) {
    if (ocupado) return;
    setOcupado(chave);
    setMensagem(null);
    const falha = await acao();
    setOcupado(null);
    setConfirmando(null);
    if (falha) setMensagem(falha);
  }

  return (
    <View style={styles.coluna}>
      {mensagem ? <Aviso tipo="erro">{mensagem}</Aviso> : null}

      <View style={styles.coluna}>
        <ThemedText type="heading" accessibilityRole="header">
          Pedidos de entrada
        </ThemedText>
        {pendentes.length === 0 ? (
          <Aviso tipo="ok">Nenhum pedido esperando aprovação.</Aviso>
        ) : (
          <Card style={styles.lista}>
            {pendentes.map((m, i) => {
              const chave = `${m.pessoaId}:${m.funcaoId}`;
              return (
                <View key={chave}>
                  {i > 0 ? <Divisor /> : null}
                  <View style={styles.linha}>
                    <View style={styles.texto}>
                      <ThemedText type="strong">{m.nome}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        Quer servir como {m.funcao}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {descricao(m)}
                      </ThemedText>
                    </View>
                    <View style={styles.acoes}>
                      <View style={styles.acao}>
                        <Button
                          title="Aprovar"
                          icone={CheckIcon}
                          accessibilityLabel={`Aprovar ${m.nome} como ${m.funcao}`}
                          onPress={() => agir(chave, () => decidirEntrada(m.pessoaId, m.funcaoId, true))}
                          loading={ocupado === chave}
                          disabled={ocupado !== null}
                        />
                      </View>
                      <View style={styles.acao}>
                        <Button
                          title="Recusar"
                          variant="secondary"
                          icone={XIcon}
                          accessibilityLabel={`Recusar ${m.nome} como ${m.funcao}`}
                          onPress={() => agir(chave, () => decidirEntrada(m.pessoaId, m.funcaoId, false))}
                          disabled={ocupado !== null}
                        />
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </Card>
        )}
      </View>

      <View style={styles.coluna}>
        <ThemedText type="heading" accessibilityRole="header">
          Membros
        </ThemedText>
        {ativos.length === 0 ? (
          <Card>
            <EstadoVazio
              icone={UsersIcon}
              titulo="Ninguém na pastoral ainda"
              texto="Quando as pessoas pedirem para participar, você aprova aqui."
            />
          </Card>
        ) : (
          funcoes.map((funcao) => (
            <View key={funcao} style={styles.coluna}>
              <ThemedText type="smallBold">{plural(funcao)}</ThemedText>
              <Card style={styles.lista}>
                {ativos
                  .filter((m) => m.funcao === funcao)
                  .map((m, i) => {
                    const chave = `${m.pessoaId}:${m.funcaoId}`;
                    return (
                      <View key={chave}>
                        {i > 0 ? <Divisor /> : null}
                        <View style={styles.linha}>
                          <View style={styles.texto}>
                            <ThemedText type="strong">{m.nome}</ThemedText>
                            <ThemedText type="small" themeColor="textSecondary">
                              {descricao(m)}
                            </ThemedText>
                          </View>
                          {confirmando === chave ? (
                            <View style={styles.acoes}>
                              <View style={styles.acao}>
                                <Button
                                  title="Sim, remover"
                                  variant="danger"
                                  onPress={() => agir(chave, () => removerMembro(m.pessoaId, m.funcaoId))}
                                  loading={ocupado === chave}
                                />
                              </View>
                              <View style={styles.acao}>
                                <Button title="Voltar" variant="secondary" onPress={() => setConfirmando(null)} />
                              </View>
                            </View>
                          ) : (
                            <Button
                              title="Remover"
                              variant="ghost"
                              bloco={false}
                              alinhado
                              icone={XIcon}
                              accessibilityLabel={`Remover ${m.nome} da pastoral`}
                              onPress={() => setConfirmando(chave)}
                            />
                          )}
                        </View>
                      </View>
                    );
                  })}
              </Card>
            </View>
          ))
        )}
      </View>
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
  linha: {
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  texto: {
    gap: Spacing.half,
  },
  acoes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  acao: {
    flexGrow: 1,
    flexBasis: 140,
  },
});
