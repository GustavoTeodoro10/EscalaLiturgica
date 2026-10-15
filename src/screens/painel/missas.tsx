import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { EntradaLista } from '@/components/entrada-lista';
import { EstadoVazio } from '@/components/estado-vazio';
import { EsqueletoLista } from '@/components/esqueleto';
import { CalendarBlankIcon } from '@/components/icones';
import { Spacing } from '@/constants/theme';
import { usePainel } from '@/hooks/use-painel';

import type { PedidoChamada } from './chamar';
import { MissaCard } from './missa-card';

type MissasProps = {
  onChamar: (pedido: PedidoChamada) => void;
};

export function Missas({ onChamar }: MissasProps) {
  const { eventos } = usePainel();

  if (eventos === null) return <EsqueletoLista linhas={2} />;

  if (eventos.length === 0) {
    return (
      <Card>
        <EstadoVazio
          icone={CalendarBlankIcon}
          titulo="Nenhuma missa futura"
          texto="As missas são criadas pela administração da paróquia. Elas aparecem aqui assim que existirem."

        />
      </Card>
    );
  }

  return (
    <View style={styles.coluna}>
      {eventos.map((evento, i) => (
        <EntradaLista key={evento.id} indice={i}>
          <MissaCard evento={evento} onChamar={onChamar} />
        </EntradaLista>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  coluna: {
    gap: Spacing.three,
  },
});
