import AppTabs from '@/components/app-tabs';
import { EventosProvider } from '@/hooks/use-eventos';

export default function AppLayout() {
  return (
    <EventosProvider>
      <AppTabs />
    </EventosProvider>
  );
}
