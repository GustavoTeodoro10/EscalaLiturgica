import { StyleSheet, View } from 'react-native';

import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { LimitesVaga } from '@/types';
import { plural } from '@/utils/rotulos';
import { inteiroLimitado, somenteDigitos } from '@/utils/validacao';

type FuncaoRef = { funcaoId: string; funcao: string };

/** Textos digitados, por id de função. */
export type TextoLimites = Record<string, { minimo: string; maximo: string }>;

export function limitesIniciais(vagas: LimitesVaga[]): TextoLimites {
  const resultado: TextoLimites = {};
  for (const v of vagas) resultado[v.funcaoId] = { minimo: String(v.minimo), maximo: String(v.maximo) };
  return resultado;
}

/** Converte os textos digitados em números, validando cada campo e a relação mínimo ≤ máximo. */
export function lerLimites(texto: TextoLimites, funcoes: FuncaoRef[]): { erro: string | null; limites: LimitesVaga[] } {
  const limites: LimitesVaga[] = [];
  for (const f of funcoes) {
    const t = texto[f.funcaoId] ?? { minimo: '', maximo: '' };
    const minimo = inteiroLimitado(t.minimo);
    const maximo = inteiroLimitado(t.maximo);
    const nome = plural(f.funcao).toLowerCase();
    if (minimo === null || maximo === null) {
      return { erro: `Informe números de 0 a 50 para ${nome}.`, limites };
    }
    if (minimo > maximo) {
      return { erro: `Em ${nome}, o mínimo não pode ser maior que o máximo.`, limites };
    }
    limites.push({ funcaoId: f.funcaoId, funcao: f.funcao, minimo, maximo });
  }
  return { erro: null, limites };
}

type CamposLimitesProps = {
  funcoes: FuncaoRef[];
  valores: TextoLimites;
  onChange: (proximo: TextoLimites) => void;
};

export function CamposLimites({ funcoes, valores, onChange }: CamposLimitesProps) {
  function alterar(funcaoId: string, campo: 'minimo' | 'maximo', texto: string) {
    const atual = valores[funcaoId] ?? { minimo: '', maximo: '' };
    onChange({ ...valores, [funcaoId]: { ...atual, [campo]: somenteDigitos(texto).slice(0, 2) } });
  }

  return (
    <View style={styles.coluna}>
      {funcoes.map((f) => (
        <View key={f.funcaoId} style={styles.coluna}>
          <ThemedText type="smallBold">{plural(f.funcao)}</ThemedText>
          <View style={styles.linha}>
            <View style={styles.metade}>
              <TextField
                label="Mínimo"
                value={valores[f.funcaoId]?.minimo ?? ''}
                onChangeText={(t) => alterar(f.funcaoId, 'minimo', t)}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
            <View style={styles.metade}>
              <TextField
                label="Máximo"
                value={valores[f.funcaoId]?.maximo ?? ''}
                onChangeText={(t) => alterar(f.funcaoId, 'maximo', t)}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  coluna: {
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
