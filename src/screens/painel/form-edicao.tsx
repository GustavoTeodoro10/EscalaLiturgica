import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Aviso } from '@/components/aviso';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { usePainel } from '@/hooks/use-painel';
import type { Evento } from '@/types';

import { CamposLimites, lerLimites, limitesIniciais, type TextoLimites } from './campos-limites';

type FormEdicaoProps = {
  evento: Evento;
  onFechar: () => void;
};

/** O coordenador ajusta só as vagas da própria pastoral nesta missa. Horário e descrição são da administração. */
export function FormEdicao({ evento, onFechar }: FormEdicaoProps) {
  const { ajustarVagas } = usePainel();
  const [limites, setLimites] = useState<TextoLimites>(() => limitesIniciais(evento.vagas));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (salvando) return;
    const l = lerLimites(limites, evento.vagas);
    if (l.erro) return setErro(l.erro);

    setErro(null);
    setSalvando(true);
    const falha = await ajustarVagas(evento.id, l.limites);
    setSalvando(false);
    if (falha) setErro(falha);
    else onFechar();
  }

  return (
    <View style={styles.coluna}>
      <ThemedText themeColor="textSecondary">Vagas desta missa. Valem só para ela.</ThemedText>
      <CamposLimites funcoes={evento.vagas} valores={limites} onChange={setLimites} />

      {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}

      <View style={styles.acoes}>
        <View style={styles.acao}>
          <Button title="Salvar" onPress={salvar} loading={salvando} />
        </View>
        <View style={styles.acao}>
          <Button title="Cancelar" variant="secondary" onPress={onFechar} disabled={salvando} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  coluna: {
    gap: Spacing.three,
  },
  acoes: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  acao: {
    flex: 1,
  },
});
