import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Agenda</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="vagas">
        <NativeTabs.Trigger.Label>Vagas</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar.badge.plus" md="event_available" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="painel">
        <NativeTabs.Trigger.Label>Painel</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.bar.fill" md="dashboard" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
