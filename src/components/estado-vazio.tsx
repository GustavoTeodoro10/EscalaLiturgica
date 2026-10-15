import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button } from '@/components/button';
import type { Icon } from '@/components/icones';
import { ThemedText } from '@/components/themed-text';
import { ENTRA_FADE } from '@/constants/entradas';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type EstadoVazioProps = {
  icone: Icon;
  titulo: string;
  texto?: string;
  /** Próxima ação: um estado vazio sempre diz o que fazer. */
  acao?: { rotulo: string; onPress: () => void };
};

export function EstadoVazio({ icone: Icone, titulo, texto, acao }: EstadoVazioProps) {
  const theme = useTheme();

  return (
    <Animated.View style={styles.caixa} entering={ENTRA_FADE}>
      <Icone size={32} color={theme.textSecondary} />
      <View style={styles.textos}>
        <ThemedText type="heading" style={styles.centro}>
          {titulo}
        </ThemedText>
        {texto ? (
          <ThemedText themeColor="textSecondary" style={styles.centro}>
            {texto}
          </ThemedText>
        ) : null}
      </View>
      {acao ? <Button title={acao.rotulo} variant="secondary" onPress={acao.onPress} /> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  caixa: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.three,
  },
  textos: {
    gap: Spacing.one,
    alignItems: 'center',
  },
  centro: {
    textAlign: 'center',
  },
});
