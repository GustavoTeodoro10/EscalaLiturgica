import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Aviso } from '@/components/aviso';
import { Button } from '@/components/button';
import { Card, Divisor } from '@/components/card';
import { Chip } from '@/components/chip';
import { EntradaLista } from '@/components/entrada-lista';
import { EstadoVazio } from '@/components/estado-vazio';
import { CheckIcon, ChurchIcon, PencilSimpleIcon, PlusIcon } from '@/components/icones';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Toque } from '@/components/toque';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useAdmin } from '@/hooks/use-admin';
import { useTheme } from '@/hooks/use-theme';
import type { PastoralAdmin } from '@/types';
import { inteiroLimitado, somenteDigitos } from '@/utils/validacao';

type FuncaoTexto = { id?: string; nome: string; minimo: string; maximo: string };

export function PastoraisAdmin() {
  const { dados } = useAdmin();
  const [formulario, setFormulario] = useState<'nova' | string | null>(null); // id da pastoral em edição
  const pastorais = dados?.pastorais ?? [];

  return (
    <View style={styles.coluna}>
      {formulario === 'nova' ? (
        <FormPastoral onFechar={() => setFormulario(null)} />
      ) : (
        <Button title="Nova pastoral" icone={PlusIcon} onPress={() => setFormulario('nova')} />
      )}

      <ThemedText type="heading" accessibilityRole="header">
        Pastorais
      </ThemedText>

      {pastorais.length === 0 ? (
        <Card>
          <EstadoVazio
            icone={ChurchIcon}
            titulo="Nenhuma pastoral"
            texto="Crie a primeira pastoral e escolha quem vai coordená-la."
          />
        </Card>
      ) : (
        <View style={styles.coluna}>
          {pastorais.map((p, i) => (
            <EntradaLista key={p.id} indice={i}>
              {formulario === p.id ? (
                <FormPastoral pastoral={p} onFechar={() => setFormulario(null)} />
              ) : (
                <CartaoPastoral pastoral={p} onEditar={() => setFormulario(p.id)} />
              )}
            </EntradaLista>
          ))}
        </View>
      )}
    </View>
  );
}

function CartaoPastoral({ pastoral, onEditar }: { pastoral: PastoralAdmin; onEditar: () => void }) {
  return (
    <Card>
      <View style={styles.topo}>
        <View style={styles.texto}>
          <ThemedText type="heading">{pastoral.nome}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Coordenação: {pastoral.coordenador || 'não definida'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {pastoral.exigeResponsavel ? 'Crianças e adultos' : 'Só adultos'}
          </ThemedText>
        </View>
        {pastoral.ativa ? null : (
          <ThemedText type="caption" themeColor="attentionText">
            Inativa
          </ThemedText>
        )}
      </View>
      <Divisor />
      <View style={styles.coluna}>
        {pastoral.funcoes.map((f) => (
          <ThemedText key={f.id} type="small" themeColor="textSecondary">
            {f.nome}: padrão de {f.minimo} a {f.maximo} por missa
          </ThemedText>
        ))}
      </View>
      <Button title="Editar" variant="secondary" icone={PencilSimpleIcon} onPress={onEditar} />
    </Card>
  );
}

function FormPastoral({ pastoral, onFechar }: { pastoral?: PastoralAdmin; onFechar: () => void }) {
  const { dados, criarPastoral, editarPastoral } = useAdmin();
  const [nome, setNome] = useState(pastoral?.nome ?? '');
  const [coordenadorId, setCoordenadorId] = useState(pastoral?.coordenadorId ?? '');
  const [ativa, setAtiva] = useState(pastoral?.ativa ?? true);
  const [exigeResponsavel, setExigeResponsavel] = useState(pastoral?.exigeResponsavel ?? false);
  const [funcoes, setFuncoes] = useState<FuncaoTexto[]>(() =>
    pastoral
      ? pastoral.funcoes.map((f) => ({ id: f.id, nome: f.nome, minimo: String(f.minimo), maximo: String(f.maximo) }))
      : [{ nome: '', minimo: '1', maximo: '2' }],
  );
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  function alterarFuncao(i: number, parte: Partial<FuncaoTexto>) {
    setFuncoes((atual) => atual.map((f, j) => (j === i ? { ...f, ...parte } : f)));
  }

  async function salvar() {
    if (salvando) return;
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) return setErro('Informe o nome da pastoral.');
    if (!coordenadorId) return setErro('Escolha quem coordena a pastoral.');

    const lista: { id?: string; nome: string; minimo: number; maximo: number }[] = [];
    for (const f of funcoes) {
      const n = f.nome.trim();
      if (!n && !f.id) continue; // linha nova em branco
      if (!n) return setErro('Toda função precisa de um nome.');
      const minimo = inteiroLimitado(f.minimo);
      const maximo = inteiroLimitado(f.maximo);
      if (minimo === null || maximo === null) return setErro(`Informe números de 0 a 50 para ${n}.`);
      if (minimo > maximo) return setErro(`Em ${n}, o mínimo não pode ser maior que o máximo.`);
      lista.push({ ...(f.id ? { id: f.id } : {}), nome: n, minimo, maximo });
    }
    if (lista.length === 0) return setErro('Informe ao menos uma função (ex.: Leitor).');

    setErro(null);
    setSalvando(true);
    const falha = pastoral
      ? await editarPastoral(pastoral.id, { nome: nomeLimpo, coordenadorId, ativa, exigeResponsavel, funcoes: lista })
      : await criarPastoral({
          nome: nomeLimpo,
          coordenadorId,
          exigeResponsavel,
          funcoes: lista.map((f) => ({ nome: f.nome, minimo: f.minimo, maximo: f.maximo })),
        });
    setSalvando(false);
    if (falha) setErro(falha);
    else onFechar();
  }

  return (
    <Card>
      <ThemedText type="heading" accessibilityRole="header">
        {pastoral ? 'Editar pastoral' : 'Nova pastoral'}
      </ThemedText>

      <TextField label="Nome da pastoral" value={nome} onChangeText={setNome} maxLength={60} placeholder="Ex.: Leitores" />

      <SeletorPessoa
        usuarios={dados?.usuarios ?? []}
        valorId={coordenadorId}
        onChange={setCoordenadorId}
      />

      <View style={styles.coluna}>
        <ThemedText type="smallBold">Quem serve nesta pastoral</ThemedText>
        <View style={styles.chips} accessibilityRole="radiogroup">
          <Chip rotulo="Só adultos" ativo={!exigeResponsavel} onPress={() => setExigeResponsavel(false)} />
          <Chip rotulo="Crianças e adultos" ativo={exigeResponsavel} onPress={() => setExigeResponsavel(true)} />
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {exigeResponsavel
            ? 'O cadastro pede o nome e a data de nascimento de cada criança, vinculada a um responsável.'
            : 'O cadastro não pergunta por filhos para entrar nesta pastoral.'}
        </ThemedText>
      </View>

      <View style={styles.coluna}>
        <ThemedText type="smallBold">Funções e vagas padrão por missa</ThemedText>
        {funcoes.map((f, i) => (
          <View key={f.id ?? `nova-${i}`} style={styles.coluna}>
            <TextField
              label={`Função ${i + 1}`}
              value={f.nome}
              onChangeText={(t) => alterarFuncao(i, { nome: t })}
              maxLength={60}
              placeholder="Ex.: Leitor"
            />
            <View style={styles.linha}>
              <View style={styles.metade}>
                <TextField
                  label="Mínimo"
                  value={f.minimo}
                  onChangeText={(t) => alterarFuncao(i, { minimo: somenteDigitos(t).slice(0, 2) })}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              <View style={styles.metade}>
                <TextField
                  label="Máximo"
                  value={f.maximo}
                  onChangeText={(t) => alterarFuncao(i, { maximo: somenteDigitos(t).slice(0, 2) })}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
            </View>
            {i < funcoes.length - 1 ? <Divisor /> : null}
          </View>
        ))}
        {funcoes.length < 12 ? (
          <Button
            title="Adicionar função"
            variant="secondary"
            icone={PlusIcon}
            onPress={() => setFuncoes((atual) => [...atual, { nome: '', minimo: '1', maximo: '2' }])}
          />
        ) : null}
      </View>

      {pastoral ? (
        <View style={styles.coluna}>
          <ThemedText type="smallBold">Situação</ThemedText>
          <View style={styles.chips} accessibilityRole="radiogroup">
            <Chip rotulo="Ativa" ativo={ativa} onPress={() => setAtiva(true)} />
            <Chip rotulo="Inativa" ativo={!ativa} onPress={() => setAtiva(false)} />
          </View>
          {!ativa ? (
            <ThemedText type="small" themeColor="textSecondary">
              Pastoral inativa some do cadastro e das missas. As escalas já feitas ficam guardadas.
            </ThemedText>
          ) : null}
        </View>
      ) : null}

      {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}

      <View style={styles.acoes}>
        <View style={styles.acao}>
          <Button title="Salvar" onPress={salvar} loading={salvando} />
        </View>
        <View style={styles.acao}>
          <Button title="Cancelar" variant="secondary" onPress={onFechar} disabled={salvando} />
        </View>
      </View>
    </Card>
  );
}

/** Escolhe uma pessoa cadastrada pelo nome (a lista pode ser grande, então filtra enquanto digita). */
function SeletorPessoa({
  usuarios,
  valorId,
  onChange,
}: {
  usuarios: { id: string; nome: string }[];
  valorId: string;
  onChange: (id: string) => void;
}) {
  const theme = useTheme();
  const [busca, setBusca] = useState('');
  const escolhida = usuarios.find((u) => u.id === valorId);

  const resultados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return [];
    return usuarios.filter((u) => u.nome.toLowerCase().includes(termo)).slice(0, 5);
  }, [busca, usuarios]);

  return (
    <View style={styles.coluna}>
      <ThemedText type="smallBold">Coordenador(a)</ThemedText>
      {escolhida ? (
        <View style={styles.escolhida}>
          <CheckIcon size={18} color={theme.success} />
          <ThemedText type="strong">{escolhida.nome}</ThemedText>
        </View>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          Nenhuma pessoa escolhida.
        </ThemedText>
      )}
      <TextField
        label={escolhida ? 'Trocar por' : 'Buscar pessoa cadastrada'}
        value={busca}
        onChangeText={setBusca}
        placeholder="Digite o nome"
        autoCapitalize="words"
      />
      {resultados.map((u) => (
        <Toque
          key={u.id}
          onPress={() => {
            onChange(u.id);
            setBusca('');
          }}
          accessibilityRole="button"
          accessibilityLabel={`Escolher ${u.nome} como coordenador`}
          estiloInterno={({ hovered }) => [
            styles.opcao,
            { backgroundColor: hovered ? theme.hover : theme.surface, borderColor: theme.border },
          ]}>
          <ThemedText>{u.nome}</ThemedText>
        </Toque>
      ))}
      {busca.trim() && resultados.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Ninguém com esse nome. A pessoa precisa estar cadastrada no app.
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  coluna: {
    gap: Spacing.three,
  },
  topo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  texto: {
    flex: 1,
    gap: Spacing.half,
  },
  linha: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  metade: {
    flex: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  acoes: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  acao: {
    flex: 1,
  },
  escolhida: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  opcao: {
    minHeight: TouchTarget,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.field,
    borderWidth: 1,
  },
});
