import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps, TabListProps } from 'expo-router/ui';
import { StyleSheet, View, useWindowDimensions, type PressableProps } from 'react-native';

import { Brasao } from '@/components/brasao';
import { CalendarBlankIcon, CalendarPlusIcon, ChurchIcon, ClipboardTextIcon, type Icon } from '@/components/icones';
import { ALTURA_BARRA_WEB } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Toque } from '@/components/toque';
import { ContentWidth, Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';

export default function AppTabs() {
  const { sessao } = useSession();

  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="index" href="/" asChild>
            <TabButton icone={CalendarBlankIcon}>Agenda</TabButton>
          </TabTrigger>
          <TabTrigger name="vagas" href="/vagas" asChild>
            <TabButton icone={CalendarPlusIcon}>Vagas</TabButton>
          </TabTrigger>
          {(sessao?.pastoraisCoordenadas.length ?? 0) > 0 ? (
            <TabTrigger name="painel" href="/painel" asChild>
              <TabButton icone={ClipboardTextIcon}>Painel</TabButton>
            </TabTrigger>
          ) : null}
          {sessao?.administrador ? (
            <TabTrigger name="admin" href="/admin" asChild>
              <TabButton icone={ChurchIcon}>Admin</TabButton>
            </TabTrigger>
          ) : null}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

type TabButtonProps = TabTriggerSlotProps & { icone: Icon };

export function TabButton({ children, isFocused, icone: Icone, ...props }: TabButtonProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  // com 4 abas em celular estreito, só a aba aberta mostra o nome (as outras seguem com nome para leitores de tela)
  const compacto = width < 460 && !isFocused;

  return (
    <Toque
      {...(props as PressableProps)}
      accessibilityRole="tab"
      accessibilityLabel={typeof children === 'string' ? children : undefined}
      accessibilityState={{ selected: !!isFocused }}
      estiloInterno={({ hovered }) => [
        styles.aba,
        { backgroundColor: isFocused ? theme.accentSoft : hovered ? theme.hover : 'transparent' },
      ]}>
      <Icone size={20} color={isFocused ? theme.accent : theme.textSecondary} weight={isFocused ? 'fill' : 'regular'} />
      {compacto ? null : (
        <ThemedText type="smallBold" style={{ color: isFocused ? theme.accent : theme.textSecondary }}>
          {children}
        </ThemedText>
      )}
    </Toque>
  );
}

export function CustomTabList(props: TabListProps) {
  const { width } = useWindowDimensions();
  const theme = useTheme();
  const estreito = width < 520; // em celular, só o brasão: o nome não cabe ao lado de 3 abas

  return (
    <View {...props} style={[styles.barra, { backgroundColor: theme.surface, borderBottomColor: theme.line }]}>
      <View style={styles.interno}>
        <View style={styles.marca}>
          <Brasao tamanho={40} />
          {estreito ? null : (
            <ThemedText type="heading" numberOfLines={1}>
              Escala Litúrgica
            </ThemedText>
          )}
        </View>
        <View style={styles.abas}>{props.children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barra: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: ALTURA_BARRA_WEB,
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  interno: {
    width: '100%',
    maxWidth: ContentWidth,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  marca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
  },
  abas: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  aba: {
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
});
