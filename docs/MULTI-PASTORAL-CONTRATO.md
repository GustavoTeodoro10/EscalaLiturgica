# Multi-pastoral: contrato do servidor e regras

> Implementa a "Fase 2" de [`MULTI-PASTORAL.md`](MULTI-PASTORAL.md). Última atualização: 13/10/2026.

## Decisões

| Tema | Decisão |
|---|---|
| Perfil administrativo | Só duas funções: **criar/gerir missas** e **criar/gerir pastorais** (inclui indicar o coordenador). Não vê pessoas, telefones nem escalas. |
| Coordenador | Um por pastoral. Gerencia **só a própria pastoral**: membros, vagas das missas, escala, chamar famílias, lembretes. |
| Entrada em pastoral | A pessoa escolhe pastoral e função (no cadastro ou depois). Fica **pendente** até o coordenador aprovar. |
| Vagas | Cada função tem mínimo e máximo **padrão**. A missa nasce com o padrão; o coordenador ajusta as vagas da própria pastoral em cada missa. |
| Quem serve | Crianças (vinculadas ao responsável) e adultos (o próprio responsável). Uma pessoa pode estar em várias pastorais. |
| Dados antigos | As abas antigas (`Missas` e a coluna `Funcao` de `Criancas`) ficam intactas. `migrarParaMultiPastoral()` copia para o modelo novo. |

## Abas

| Aba | Colunas | Observação |
|---|---|---|
| `Responsaveis` | ID, Nome, Usuario, Senha, Email, Celular, Coordenador (antigo), **Administrador** | `Coordenador` só é lido na migração. |
| `Criancas` | ID, Nome, Funcao (antigo), **Tipo** (`crianca` ou `adulto`) | Funciona como cadastro de pessoas. |
| `Vinculos` | ResponsavelID, CriancaID | Para adultos, o responsável é a própria pessoa. |
| **`Pastorais`** | ID, Nome, CoordenadorID, Ativa | |
| **`Funcoes`** | ID, PastoralID, Nome, MinPadrao, MaxPadrao | |
| **`Membros`** | PessoaID, PastoralID, FuncaoID, Situacao (`ativo` ou `pendente`) | |
| **`Eventos`** | ID, Data, Horario, Descricao | A missa existe uma vez. |
| **`Vagas`** | EventoID, FuncaoID, Minimo, Maximo, Escalados | Linha criada só quando alguém ajusta ou é escalado; sem linha vale o padrão da função. |
| `ResetSenha` | Token, ResponsavelID, ExpiraEm, Usado | Igual. |

## Quem pode o quê

| Ação | Responsável | Coordenador da pastoral | Administrador |
|---|---|---|---|
| Ver missas e vagas das pastorais em que suas pessoas participam | sim | sim | só o calendário |
| Escalar / cancelar suas próprias pessoas | sim | sim | não |
| Escalar / cancelar qualquer membro **da própria pastoral** | não | sim | não |
| Pedir entrada em pastoral | sim | sim | não |
| Aprovar, recusar ou remover membros | não | sim (própria pastoral) | não |
| Ajustar mínimo e máximo de uma missa | não | sim (própria pastoral) | não |
| Chamar famílias, lembretes | não | sim (própria pastoral) | não |
| Criar, editar, excluir, gerar missas | não | não | **sim** |
| Criar e editar pastorais, funções e coordenador | não | não | **sim** |

O servidor confere tudo isso em cada chamada (`autenticar_`, `exigirCoordenadorDe_`, `exigirAdministrador_`).

## Ações da API

Sem sessão: `validarLogin`, `validarSessao`, `cadastrarResponsavel`, `listarPastoraisPublico`, `solicitarRecuperacaoSenha`, `redefinirSenha`.

| Perfil | Ações |
|---|---|
| Responsável | `listarMissas`, `inscrever`, `cancelar`, `solicitarEntrada` |
| Coordenador | `listarMissasParaCoordenador`, `obterResumoCoordenador`, `listarMembros`, `decidirEntrada`, `removerMembro`, `ajustarVagas`, `obterResponsaveisParaChamar`, `enviarLembretesCoordenador` |
| Administrador | `obterAdministracao`, `criarPastoral`, `editarPastoral`, `criarMissa`, `gerarMissasRecorrentes`, `editarMissa`, `excluirMissa` |

## Migração (uma vez, pelo editor do Apps Script)

1. Propriedades do script: `PERMITIR_ADMIN = sim`.
2. Rodar `migrarParaMultiPastoral`.
3. Remover `PERMITIR_ADMIN`.

A função é idempotente. Cria a pastoral **Coroinhas e Cerimoniários** (funções Coroinha e Cerimoniário), faz de cada coordenador antigo o **coordenador** dela e também **administrador**, e converte as missas e as inscrições. Depois disso, ajuste a coluna `Administrador` e a aba `Pastorais` na planilha como quiser.
