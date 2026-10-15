import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Aviso } from '@/components/aviso';
import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAdmin } from '@/hooks/use-admin';
import type { DiaSemana } from '@/types';
import { DIAS_DA_SEMANA } from '@/utils/rotulos';
import { inteiroLimitado, normalizarHorario, somenteDigitos } from '@/utils/validacao';

/** Cria uma missa por semana. As que já existem (mesma data e horário) são puladas. */
export function Gerar() {
  const { gerarMissas } = useAdmin();
  const [dia, setDia] = useState<DiaSemana>('domingo');
  const [horario, setHorario] = useState('10:00');
  const [semanas, setSemanas] = useState('4');
  const [descricao, setDescricao] = useState('Missa dominical');
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);

  async function enviar() {
    if (gerando) return;
    setResultado(null);

    const h = normalizarHorario(horario);
    if (!h) return setErro('Informe um horário válido, como 19:00.');
    const n = inteiroLimitado(semanas, 52);
    if (n === null || n < 1) return setErro('Informe de 1 a 52 semanas.');

    setErro(null);
    setGerando(true);
    const r = await gerarMissas({ diaSemana: dia, horario: h, semanas: n, descricao: descricao.trim() });
    setGerando(false);

    if (r.erro) return setErro(r.erro);
    const pulo = r.ignoradas > 0 ? ` ${r.ignoradas} já existia(m) e foi(ram) mantida(s).` : '';
    setResultado(`${r.criadas} missa(s) criada(s).${pulo} Veja na aba Missas.`);
  }

  return (
    <View style={styles.coluna}>
      <ThemedText themeColor="textSecondary">
        Cria uma missa por semana, a partir de hoje, no dia da semana escolhido. As vagas de cada pastoral vêm do
        padrão das funções; o coordenador ajusta em cada missa.
      </ThemedText>

      <View style={styles.coluna}>
        <ThemedText type="smallBold">Dia da semana</ThemedText>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {DIAS_DA_SEMANA.map((d) => (
            <Chip key={d.valor} rotulo={d.rotulo} ativo={dia === d.valor} onPress={() => setDia(d.valor)} />
          ))}
        </View>
      </View>

      <View style={styles.linha}>
        <View style={styles.metade}>
          <TextField
            label="Horário"
            value={horario}
            onChangeText={setHorario}
            placeholder="19:00"
            keyboardType="numbers-and-punctuation"
            maxLength={5}
          />
        </View>
        <View style={styles.metade}>
          <TextField
            label="Semanas"
            value={semanas}
            onChangeText={(t) => setSemanas(somenteDigitos(t).slice(0, 2))}
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>
      </View>

      <TextField label="Descrição" value={descricao} onChangeText={setDescricao} maxLength={100} />

      {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
      {resultado ? <Aviso tipo="ok">{resultado}</Aviso> : null}

      <Button title="Gerar missas" onPress={enviar} loading={gerando} />
    </View>
  );
}

const styles = StyleSheet.create({
  coluna: {
    gap: Spacing.three,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  linha: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  metade: {
    flex: 1,
  },
});
