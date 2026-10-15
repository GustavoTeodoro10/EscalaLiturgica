import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TEOCODE } from '@/constants/marca';
import { Spacing, TouchTarget } from '@/constants/theme';

const TEXTO = `App desenvolvido por ${TEOCODE.nome} · © ${TEOCODE.ano} ${TEOCODE.nome}`;
const COM_LINK = /^https?:\/\/\S+$/i.test(TEOCODE.site);

/** Crédito do desenvolvedor no fim de cada tela. Vira link para o site quando o endereço está definido. */
export function Rodape() {
  if (!COM_LINK) {
    return (
      <View style={styles.caixa}>
        <ThemedText type="caption" themeColor="textSecondary" style={styles.texto}>
          {TEXTO}
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.caixa}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${TEXTO}. Abre o site da ${TEOCODE.nome}.`}
        onPress={() => void Linking.openURL(TEOCODE.site)}
        hitSlop={8}
        style={styles.area}>
        <ThemedText type="caption" themeColor="textSecondary" style={styles.texto}>
          {TEXTO}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: {
    alignItems: 'center',
    paddingTop: Spacing.three,
  },
  area: {
    minHeight: TouchTarget,
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  texto: {
    textAlign: 'center',
  },
});
