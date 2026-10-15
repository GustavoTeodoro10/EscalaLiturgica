import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { sessao } = useSession();

  return (
    <NativeTabs
      backgroundColor={colors.surface}
      indicatorColor={colors.accentSoft}
      iconColor={{ default: colors.textSecondary, selected: colors.accent }}
      labelStyle={{
        default: { color: colors.textSecondary },
        selected: { color: colors.accent },
      }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Agenda</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="vagas">
        <NativeTabs.Trigger.Label>Vagas</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar.badge.plus" md="event_available" />
      </NativeTabs.Trigger>

      {/* As abas somem para quem não tem o papel. O servidor também recusa as chamadas. */}
      <NativeTabs.Trigger name="painel" hidden={(sessao?.pastoraisCoordenadas.length ?? 0) === 0}>
        <NativeTabs.Trigger.Label>Painel</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.bar.fill" md="dashboard" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="admin" hidden={!sessao?.administrador}>
        <NativeTabs.Trigger.Label>Admin</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="building.columns" md="church" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
