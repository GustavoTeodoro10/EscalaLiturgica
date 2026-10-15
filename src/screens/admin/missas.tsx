import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Aviso } from '@/components/aviso';
import { BlocoData } from '@/components/bloco-data';
import { Button } from '@/components/button';
import { Card, Divisor } from '@/components/card';
import { EntradaLista } from '@/components/entrada-lista';
import { EstadoVazio } from '@/components/estado-vazio';
import { CalendarBlankIcon, PencilSimpleIcon, PlusIcon, TrashIcon } from '@/components/icones';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAdmin } from '@/hooks/use-admin';
import type { MissaAdmin } from '@/types';
import { dataBrParaIso, normalizarHorario } from '@/utils/validacao';

export function MissasAdmin() {
  const { dados } = useAdmin();
  const missas = dados?.missas ?? [];

  return (
    <View style={styles.coluna}>
      <NovaMissa />

      <ThemedText type="heading" accessibilityRole="header">
        Próximas missas
      </ThemedText>

      {missas.length === 0 ? (
        <Card>
          <EstadoVazio
            icone={CalendarBlankIcon}
            titulo="Nenhuma missa futura"
            texto="Crie uma missa acima ou gere as missas das próximas semanas na aba Gerar."
          />
        </Card>
      ) : (
        <View style={styles.coluna}>
          {missas.map((m, i) => (
            <EntradaLista key={m.id} indice={i}>
              <CartaoMissa missa={m} />
            </EntradaLista>
          ))}
        </View>
      )}
    </View>
  );
}

function NovaMissa() {
  const { criarMissa } = useAdmin();
  const [aberto, setAberto] = useState(false);
  const [data, setData] = useState('');
  const [horario, setHorario] = useState('19:00');
  const [descricao, setDescricao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (salvando) return;
    const iso = dataBrParaIso(data);
    if (!iso) return setErro('Informe a data como dd/mm/aaaa.');
    const h = normalizarHorario(horario);
    if (!h) return setErro('Informe um horário válido, como 19:00.');

    setErro(null);
    setSalvando(true);
    const falha = await criarMissa({ data: iso, horario: h, descricao: descricao.trim() });
    setSalvando(false);
    if (falha) return setErro(falha);
    setOk(`Missa de ${data.trim()} às ${h} criada.`);
    setData('');
    setDescricao('');
    setAberto(false);
  }

  if (!aberto) {
    return (
      <View style={styles.coluna}>
        {ok ? <Aviso tipo="ok">{ok}</Aviso> : null}
        <Button
          title="Nova missa"
          icone={PlusIcon}
          onPress={() => {
            setOk(null);
            setAberto(true);
          }}
        />
      </View>
    );
  }

  return (
    <Card>
      <ThemedText type="heading" accessibilityRole="header">
        Nova missa
      </ThemedText>
      <TextField
        label="Data"
        value={data}
        onChangeText={setData}
        placeholder="dd/mm/aaaa"
        keyboardType="numbers-and-punctuation"
        maxLength={10}
        ajuda="Ex.: 25/12/2026"
      />
      <TextField
        label="Horário"
        value={horario}
        onChangeText={setHorario}
        placeholder="19:00"
        keyboardType="numbers-and-punctuation"
        maxLength={5}
      />
      <TextField label="Descrição" value={descricao} onChangeText={setDescricao} maxLength={100} />
      {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
      <View style={styles.acoes}>
        <View style={styles.acao}>
          <Button title="Criar missa" onPress={salvar} loading={salvando} />
        </View>
        <View style={styles.acao}>
          <Button title="Cancelar" variant="secondary" onPress={() => setAberto(false)} disabled={salvando} />
        </View>
      </View>
    </Card>
  );
}

function CartaoMissa({ missa }: { missa: MissaAdmin }) {
  const { editarMissa, excluirMissa } = useAdmin();
  const [editando, setEditando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [horario, setHorario] = useState(missa.horario);
  const [descricao, setDescricao] = useState(missa.descricao);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function salvar() {
    if (ocupado) return;
    const h = normalizarHorario(horario);
    if (!h) return setErro('Informe um horário válido, como 19:00.');
    setErro(null);
    setOcupado(true);
    const falha = await editarMissa(missa.id, { horario: h, descricao: descricao.trim() });
    setOcupado(false);
    if (falha) setErro(falha);
    else setEditando(false);
  }

  async function excluir() {
    if (ocupado) return;
    setOcupado(true);
    const falha = await excluirMissa(missa.id, missa.data);
    setOcupado(false);
    setConfirmando(false);
    if (falha) setErro(falha);
  }

  return (
    <Card style={styles.cartao}>
      <View style={styles.topo}>
        <BlocoData data={missa.data} />
        <View style={styles.texto}>
          <ThemedText type="strong">Às {missa.horario}</ThemedText>
          {missa.descricao ? (
            <ThemedText type="small" themeColor="textSecondary">
              {missa.descricao}
            </ThemedText>
          ) : null}
        </View>
      </View>

      {missa.pastorais.length > 0 ? (
        <View style={styles.pastorais}>
          {missa.pastorais.map((p) => (
            <ThemedText key={p.pastoralId} type="small" themeColor="textSecondary">
              {p.pastoral}: {p.escalados} de {p.maximo} vagas
            </ThemedText>
          ))}
        </View>
      ) : null}

      {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}

      {editando ? (
        <View style={styles.coluna}>
          <TextField
            label="Horário"
            value={horario}
            onChangeText={setHorario}
            placeholder="19:00"
            keyboardType="numbers-and-punctuation"
            maxLength={5}
          />
          <TextField label="Descrição" value={descricao} onChangeText={setDescricao} maxLength={100} />
          <View style={styles.acoes}>
            <View style={styles.acao}>
              <Button title="Salvar" onPress={salvar} loading={ocupado} />
            </View>
            <View style={styles.acao}>
              <Button title="Cancelar" variant="secondary" onPress={() => setEditando(false)} disabled={ocupado} />
            </View>
          </View>
        </View>
      ) : confirmando ? (
        <View style={styles.coluna}>
          <ThemedText type="small" accessibilityRole="alert">
            Excluir a missa de {missa.data}? As inscrições dela também somem. Essa ação não pode ser desfeita.
          </ThemedText>
          <View style={styles.acoes}>
            <View style={styles.acao}>
              <Button title="Confirmar exclusão" variant="danger" onPress={excluir} loading={ocupado} />
            </View>
            <View style={styles.acao}>
              <Button title="Voltar" variant="secondary" onPress={() => setConfirmando(false)} disabled={ocupado} />
            </View>
          </View>
        </View>
      ) : (
        <>
          <Divisor />
          <View style={styles.acoes}>
            <View style={styles.acao}>
              <Button title="Editar" variant="secondary" icone={PencilSimpleIcon} onPress={() => setEditando(true)} />
            </View>
            <View style={styles.acao}>
              <Button title="Excluir" variant="ghost" icone={TrashIcon} onPress={() => setConfirmando(true)} />
            </View>
          </View>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  coluna: {
    gap: Spacing.three,
  },
  cartao: {
    gap: Spacing.three,
  },
  topo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  texto: {
    flex: 1,
    gap: Spacing.half,
  },
  pastorais: {
    gap: Spacing.half,
  },
  acoes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  acao: {
    flexGrow: 1,
    flexBasis: 140,
  },
});
