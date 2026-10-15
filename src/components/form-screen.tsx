import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brasao } from '@/components/brasao';
import { Rodape } from '@/components/rodape';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type FormScreenProps = {
  title: string;
  subtitle?: string;
  /** Mostra o brasão acima do título (telas de entrada). */
  comBrasao?: boolean;
  tamanhoBrasao?: number;
  children: ReactNode;
};

/** Moldura das telas de acesso (cadastro, recuperar senha…): sem abas, em coluna, com teclado. */
export function FormScreen({ title, subtitle, comBrasao = true, tamanhoBrasao = 64, children }: FormScreenProps) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.cabecalho}>
              {comBrasao ? <Brasao tamanho={tamanhoBrasao} /> : null}
              <ThemedText type="subtitle" accessibilityRole="header">
                {title}
              </ThemedText>
              {subtitle ? <ThemedText themeColor="textSecondary">{subtitle}</ThemedText> : null}
            </View>
            {children}
            <Rodape />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: 480,
  },
  content: {
    flexGrow: 1,
    gap: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.five,
  },
  cabecalho: {
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
});
