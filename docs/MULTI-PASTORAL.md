# Visão multi-pastoral

> Documento de planejamento. Última atualização: 13/10/2026.
> **Status: Fase 2 implementada** (modelo de dados, perfis administrador e coordenador por pastoral). O contrato do que foi construído está em [`MULTI-PASTORAL-CONTRATO.md`](MULTI-PASTORAL-CONTRATO.md), que prevalece sobre este documento. As seções abaixo ficam como registro das decisões e dos riscos.
> Itens **[A CONFIRMAR]** dependem do cliente.

---

## 1. Decisão

| | |
|---|---|
| **Implantação inicial** | Somente **Coroinhas e Cerimoniários**. É o que o app resolve e o que será lançado. |
| **Visão de futuro** | Atender **todas as pastorais** da Paróquia São Vicente de Paulo, no mesmo app. |
| **Fora do escopo** | Várias paróquias no mesmo sistema. Uma paróquia só. |

Coroinhas e Cerimoniários passam a ser tratados como **uma pastoral com duas funções**, e não como "o app inteiro".

---

## 2. Por que mapear agora

Hoje a palavra "Coroinha" está escrita na estrutura do sistema:

- A aba `Missas` tem colunas fixas: `MinCoroinha`, `MaxCoroinha`, `CoroinhasEscalados`, `MinCerimoniario`, `MaxCerimoniario`, `CerimoniariosEscalados`.
- O código do servidor compara `funcao === 'Coroinha'` em vários pontos.
- O papel de coordenador é uma coluna única e **global**: quem é coordenador enxerga tudo.
- A aba `Criancas` assume que quem serve é filho de alguém.

Para uma segunda pastoral isso não serve: leitores e ministros da comunhão são **adultos** (eles mesmos são o responsável), têm **outras funções** e são coordenados por **outras pessoas**, que não devem ver os dados da pastoral dos outros.

Quanto mais telas construirmos em cima do formato atual, mais caro fica mudar. Mapear agora custa um documento.

---

## 3. Modelo de dados alvo

Conceitual. Serve para Planilhas hoje e para um banco de dados depois.

```
Pastorais ──< Funcoes
    │
    └──< Membros >── Pessoas ──< Vinculos >── Usuarios
                                                  │
Eventos ──< Vagas >── Funcoes                     └──< Papeis >── Pastorais
    │
    └──< Escalados >── Pessoas
```

| Entidade | Campos principais | Observação |
|---|---|---|
| **Pastorais** | ID, Nome, Ativa | Coroinhas, Liturgia, etc. |
| **Funcoes** | ID, PastoralID, Nome | Coroinha, Cerimoniário, Leitor… |
| **Pessoas** | ID, Nome, Tipo (criança ou adulto) | Quem serve. Só dados necessários (LGPD). |
| **Usuarios** | ID, Nome, Usuario, SenhaHash, Email, Celular | Quem faz login. Hoje é a aba `Responsaveis`. |
| **Vinculos** | UsuarioID, PessoaID | Pai → filho. Para adultos, o usuário é a própria pessoa. |
| **Membros** | PessoaID, PastoralID, FuncaoID, Situação | Quem participa de qual pastoral e em qual função. Uma pessoa pode ter várias linhas. |
| **Papeis** | UsuarioID, PastoralID, Papel | `coordenador` por pastoral. Mais um papel global `administrador`. |
| **Eventos** | ID, Data, Horário, Descrição, Tipo | A missa existe **uma vez**, não uma por pastoral. |
| **Vagas** | EventoID, FuncaoID, Mínimo, Máximo | Cada pastoral define as suas vagas no mesmo evento. |
| **Escalados** | EventoID, FuncaoID, PessoaID | Substitui as listas separadas por vírgula. |

### Por que "evento" separado de "vagas"

A missa das 19h é uma só. Hoje só os coroinhas aparecem nela; amanhã o leitor e o ministro da comunhão também. Com `Eventos` + `Vagas`, cada coordenador mexe só nas vagas da própria pastoral e todos veem a mesma missa.

---

## 4. Papéis e permissões

| Papel | Pode |
|---|---|
| **Responsável / membro** | Ver a agenda, inscrever e cancelar **a si ou aos filhos vinculados**, nas funções em que são membros |
| **Coordenador de pastoral** | Tudo do painel, mas **apenas na própria pastoral**: vagas, escala, chamar membros, lembretes |
| **Administrador paroquial** | Criar eventos (missas), cadastrar pastorais e funções, atribuir coordenadores, ver tudo |

Regras que **não** podem falhar (conferidas no servidor, como já é feito hoje):

1. Coordenador de uma pastoral não lê nem altera dados de outra.
2. Ninguém vê telefone ou e-mail de pessoas fora da sua pastoral.
3. Responsável só altera pessoas vinculadas a ele.
4. A função da pessoa precisa existir em `Membros` para ela ser escalada.

> Hoje o servidor já tem o padrão certo: cada função chama `autenticar_` ou `exigirCoordenador_` antes de qualquer coisa. Na evolução, `exigirCoordenador_(sessao)` vira `exigirCoordenador_(sessao, pastoralId)`.

---

## 5. Como o modelo atual se encaixa

Nada precisa ser descartado. Cada aba de hoje vira linhas do modelo alvo:

| Hoje | Vira |
|---|---|
| `Responsaveis` | `Usuarios` (+ `Papeis`: `Coordenador = TRUE` → coordenador da pastoral Coroinhas) |
| `Criancas` (`Funcao`) | `Pessoas` + `Membros` (pastoral Coroinhas, função = a coluna `Funcao`) |
| `Vinculos` | `Vinculos` (igual) |
| `Missas` (uma linha) | `Eventos` (1 linha) + `Vagas` (2 linhas: Coroinha e Cerimoniário) + `Escalados` (uma linha por criança) |
| `ResetSenha` | igual |

A migração é mecânica e pode ser testada com uma cópia da planilha.

---

## 6. Plano em fases

| Fase | O que acontece | O usuário percebe? | Gatilho |
|---|---|---|---|
| **0 — Agora** | Lançar só Coroinhas, com a planilha atual | — | Em andamento |
| **1 — Camada genérica no app** | Ao construir Vagas e Painel, o app trabalha com `Evento` e `Vaga` por função, e um adaptador converte o formato atual | Não | Junto com a tela Vagas |
| **2 — Novo modelo de dados** | Abas novas, função de migração, servidor com checagem por pastoral | Não (Coroinhas segue igual) | Segunda pastoral aprovada |
| **3 — Piloto** | Uma segunda pastoral, a mais parecida com a atual (liturgia, que serve nas missas) | Sim, para esse grupo | Fase 2 estável |
| **4 — Expansão** | Demais pastorais, seletor de pastoral, painel do administrador | Sim | Piloto aprovado |

### O que fazer **já**, sem custo

Quando formos construir Vagas e Painel:

1. **Tipos genéricos no app.** `Evento { vagas: Vaga[] }` e `Vaga { funcao, minimo, maximo, escalados[] }`, e não campos `coroinhas` e `cerimoniarios` espalhados pelo código.
2. **Um adaptador único** (`fromLegacyMissa`) que converte a resposta atual do servidor. Quando o servidor mudar, só ele muda.
3. **Pastoral como configuração**, não como texto fixo: um valor `PASTORAL_ATUAL` em vez de a palavra "Coroinha" nos componentes.
4. **Textos de interface sem "Coroinhas" no nome de componentes e rotas**, por exemplo `vagas`, e não `vagas-coroinhas`.
5. **Não mexer na planilha em produção** até a Fase 2.

### O que **não** fazer agora

- Criar abas novas ou migrar dados antes de existir uma segunda pastoral confirmada.
- Construir seletor de pastoral, painel de administrador ou cadastro de pastorais.
- Trocar de banco de dados "por precaução".

---

## 7. Riscos de crescer

| Risco | Detalhe | Mitigação |
|---|---|---|
| **Desempenho das Planilhas** | O servidor lê abas inteiras a cada chamada. Com muitas pessoas e eventos fica lento. | Cache; ou banco de dados (ver gatilhos) |
| **Cotas do Apps Script** | Envio de e-mail e tempo de execução por dia são limitados (conferir os valores atuais na documentação do Google). | Concentrar lembretes em um resumo diário; avaliar serviço de e-mail próprio |
| **Privacidade (LGPD)** | Mais pessoas e mais dados; hoje há dados de menores. | Permissão por pastoral no servidor; coletar só o necessário; aviso de privacidade |
| **Quem administra** | Hoje uma pessoa mexe na planilha. Com várias pastorais, vira gargalo. | Papel de administrador paroquial e tela de gestão |
| **Conflito de escala** | A mesma pessoa em duas funções no mesmo horário. | Regra de conflito no servidor (fase posterior) |
| **Complexidade para o usuário** | Pais com filhos em várias pastorais. | Agenda única da família; Vagas filtradas por pessoa e função |

### Gatilhos para sair das Planilhas

Reavaliar o banco de dados se **qualquer** um acontecer:

- Mais de **3 pastorais** ativas.
- Chamadas levando regularmente mais de **5 segundos**.
- Cotas de e-mail ou execução estourando.
- Necessidade de relatórios, histórico ou auditoria que a planilha não sustenta.

---

## 8. Perguntas em aberto

Para responder com o cliente antes da Fase 2.

| # | Pergunta | Por que importa |
|---|---|---|
| 1 | Quais pastorais existem hoje e quais entram primeiro? **[A CONFIRMAR]** | Define o piloto |
| 2 | As outras pastorais servem **nas missas** ou têm outros tipos de compromisso (reunião, catequese, escala por turno)? | Se forem outros tipos, `Eventos` precisa de `Tipo` e talvez de "confirmar presença" em vez de vagas |
| 3 | Uma mesma pessoa participa de **mais de uma** pastoral? | Define `Membros` (várias linhas) e a regra de conflito |
| 4 | Quem coordena cada pastoral? É uma pessoa ou mais de uma? | Define `Papeis` |
| 5 | Quem seria o **administrador paroquial** (secretaria, pároco)? | Define quem cria missas e atribui coordenadores |
| 6 | Quem cria as missas hoje e continuaria criando? | Evita duas pessoas editando o mesmo evento |
| 7 | O app mantém o nome atual ou ganha um nome paroquial? | Identidade e textos |
| 8 | Adultos precisam de cadastro próprio ou continuam sendo "responsável" de si mesmos? | Define `Vinculos` para adultos |

---

## 9. Resumo em uma frase

> Lançamos só Coroinhas com o que existe; construímos as próximas telas pensando em **eventos com vagas por função**; e só mexemos na planilha quando a segunda pastoral for aprovada.
