import type { ReactNode } from 'react';
import { Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Rodape } from '@/components/rodape';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, ContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Altura da barra superior de abas na web (ver app-tabs.web.tsx). */
export const ALTURA_BARRA_WEB = 64;

type ScreenProps = {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  /** se informado, habilita "puxar para atualizar" */
  onRefresh?: () => void;
  refreshing?: boolean;
};

export function Screen({ title, subtitle, children, onRefresh, refreshing = false }: ScreenProps) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.accent}
                colors={[theme.accent]}
              />
            ) : undefined
          }>
          <View style={styles.cabecalho}>
            <ThemedText type="subtitle" accessibilityRole="header">
              {title}
            </ThemedText>
            {subtitle ? <ThemedText themeColor="textSecondary">{subtitle}</ThemedText> : null}
          </View>
          {children}
          <Rodape />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: ContentWidth,
  },
  content: {
    gap: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingTop: Platform.select({ web: ALTURA_BARRA_WEB + Spacing.four, default: Spacing.four }),
    paddingBottom: BottomTabInset + Spacing.five,
  },
  cabecalho: {
    gap: Spacing.one,
  },
});
