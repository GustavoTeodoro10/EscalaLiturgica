import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { CheckCircleIcon, InfoIcon, WarningCircleIcon } from '@/components/icones';
import { ThemedText } from '@/components/themed-text';
import { ENTRA_FADE, SAI } from '@/constants/entradas';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type AvisoProps = {
  tipo: 'ok' | 'erro' | 'info' | 'atencao';
  children: string;
};

/**
 * Mensagem curta de resultado. Nunca só por cor: sempre ícone e texto.
 * Leitores de tela anunciam quando ela aparece.
 */
export function Aviso({ tipo, children }: AvisoProps) {
  const theme = useTheme();

  const { Icone, cor } = {
    ok: { Icone: CheckCircleIcon, cor: theme.success },
    erro: { Icone: WarningCircleIcon, cor: theme.danger },
    atencao: { Icone: WarningCircleIcon, cor: theme.attentionText },
    info: { Icone: InfoIcon, cor: theme.textSecondary },
  }[tipo];

  return (
    <Animated.View
      entering={ENTRA_FADE}
      exiting={SAI}
      accessibilityRole={tipo === 'erro' ? 'alert' : undefined}
      accessibilityLiveRegion="polite"
      style={[
        styles.caixa,
        {
          backgroundColor: tipo === 'atencao' ? theme.attentionSoft : theme.surface,
          borderColor: tipo === 'atencao' ? theme.attentionSoft : theme.line,
        },
      ]}>
      <Icone size={22} color={cor} weight="fill" />
      <ThemedText type="smallBold" style={styles.texto}>
        {children}
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  caixa: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.container,
    borderWidth: 1,
  },
  texto: {
    flex: 1,
  },
});
