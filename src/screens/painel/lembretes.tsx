import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Aviso } from '@/components/aviso';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EnvelopeSimpleIcon } from '@/components/icones';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { usePainel } from '@/hooks/use-painel';

export function Lembretes() {
  const { enviarLembretes, pastoral } = usePainel();
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  async function enviar() {
    if (enviando) return;
    setEnviando(true);
    const r = await enviarLembretes();
    setEnviando(false);
    setConfirmando(false);
    setResultado(
      r.erro
        ? { tipo: 'erro', texto: r.erro }
        : { tipo: 'ok', texto: `Lembretes enviados para ${r.avisados} responsável(is).` },
    );
  }

  return (
    <View style={styles.coluna}>
      <Card>
        <ThemedText type="heading" accessibilityRole="header">
          Lembretes por e-mail
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Todos os dias, às 9h, as famílias com missa daqui a 3 dias recebem um lembrete. A coordenação de {pastoral.nome}{' '}
          recebe a escala completa.
        </ThemedText>
        <ThemedText themeColor="textSecondary">Use o botão abaixo só se precisar enviar agora.</ThemedText>
      </Card>

      {resultado ? <Aviso tipo={resultado.tipo}>{resultado.texto}</Aviso> : null}

      {confirmando ? (
        <Card>
          <ThemedText accessibilityRole="alert">
            Enviar e-mails agora para as famílias de {pastoral.nome} com missa daqui a 3 dias?
          </ThemedText>
          <Button title="Sim, enviar agora" icone={EnvelopeSimpleIcon} onPress={enviar} loading={enviando} />
          <Button title="Voltar" variant="secondary" onPress={() => setConfirmando(false)} disabled={enviando} />
        </Card>
      ) : (
        <Button
          title="Enviar lembretes agora"
          variant="secondary"
          icone={EnvelopeSimpleIcon}
          onPress={() => {
            setResultado(null);
            setConfirmando(true);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  coluna: {
    gap: Spacing.three,
  },
});
