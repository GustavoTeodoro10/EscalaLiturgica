import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { CaretLeftIcon, CaretRightIcon } from '@/components/icones';
import { ThemedText } from '@/components/themed-text';
import { Toque } from '@/components/toque';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { celulasDoMes, chaveData, LETRAS_SEMANA, NOMES_MESES } from '@/utils/calendario';

type CalendarioProps = {
  ano: number;
  /** 0 (janeiro) a 11 */
  mes: number;
  /** datas (dd/MM/yyyy) que têm vaga: ficam marcadas e tocáveis */
  diasMarcados: Set<string>;
  selecionado: string | null;
  onSelecionar: (data: string) => void;
  onMudarMes: (delta: number) => void;
};

export function Calendario({ ano, mes, diasMarcados, selecionado, onSelecionar, onMudarMes }: CalendarioProps) {
  const theme = useTheme();
  const hoje = chaveData(new Date());
  const celulas = celulasDoMes(ano, mes);

  return (
    <Card style={styles.cartao}>
      <View style={styles.cabecalho}>
        <Toque
          accessibilityRole="button"
          accessibilityLabel="Mês anterior"
          onPress={() => onMudarMes(-1)}
          estiloInterno={({ hovered }) => [styles.seta, { backgroundColor: hovered ? theme.hover : 'transparent' }]}>
          <CaretLeftIcon size={22} color={theme.text} />
        </Toque>

        <ThemedText type="heading" accessibilityRole="header">
          {NOMES_MESES[mes]} de {ano}
        </ThemedText>

        <Toque
          accessibilityRole="button"
          accessibilityLabel="Próximo mês"
          onPress={() => onMudarMes(1)}
          estiloInterno={({ hovered }) => [styles.seta, { backgroundColor: hovered ? theme.hover : 'transparent' }]}>
          <CaretRightIcon size={22} color={theme.text} />
        </Toque>
      </View>

      <View style={styles.linha}>
        {LETRAS_SEMANA.map((letra, i) => (
          <View key={i} style={styles.celula} accessible={false}>
            <ThemedText type="caption" themeColor="textSecondary">
              {letra}
            </ThemedText>
          </View>
        ))}
      </View>

      <View style={styles.linha}>
        {celulas.map((dia, i) => {
          if (dia === null) return <View key={i} style={styles.celula} />;

          const chave = chaveData(new Date(ano, mes, dia));
          const comVaga = diasMarcados.has(chave);
          const escolhido = chave === selecionado;
          const ehHoje = chave === hoje;

          return (
            <View key={i} style={styles.celula}>
              <Toque
                disabled={!comVaga}
                onPress={() => onSelecionar(chave)}
                escala={0.94}
                accessibilityRole="button"
                accessibilityLabel={`${dia} de ${NOMES_MESES[mes]}${comVaga ? ', com vagas' : ', sem vagas'}${ehHoje ? ', hoje' : ''}`}
                accessibilityState={{ selected: escolhido, disabled: !comVaga }}
                estiloInterno={({ hovered }) => [
                  styles.dia,
                  {
                    backgroundColor: escolhido ? theme.accent : comVaga ? theme.accentSoft : 'transparent',
                    // hoje: anel neutro; dia com vaga sob o mouse: anel no acento
                    borderColor:
                      hovered && comVaga && !escolhido ? theme.accent : ehHoje && !escolhido ? theme.border : 'transparent',
                  },
                ]}>
                <ThemedText
                  type={comVaga ? 'smallBold' : 'small'}
                  style={{
                    color: escolhido ? theme.onAccent : comVaga ? theme.accent : theme.textSecondary,
                    opacity: comVaga || escolhido ? 1 : 0.55,
                  }}>
                  {dia}
                </ThemedText>
              </Toque>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  cartao: {
    gap: Spacing.two,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  seta: {
    width: TouchTarget,
    height: TouchTarget,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linha: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  celula: {
    width: `${100 / 7}%`,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dia: {
    width: 42,
    height: 42,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
