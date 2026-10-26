# Melhoria Contínua

> Objetivo: manter o app sempre melhorando, com um ciclo curto e registrado.
> Contexto do projeto em [BRIEFING.md](BRIEFING.md).

---

## 1. Como funciona o ciclo

```
 Coletar  →  Priorizar  →  Fazer  →  Publicar  →  Medir  →  (volta a Coletar)
```

| Etapa | O que fazer | Quem |
|---|---|---|
| **Coletar** | Anotar na seção 4 tudo que aparecer: pedido da coordenação, reclamação de pai, erro visto, ideia | Qualquer pessoa |
| **Priorizar** | Uma vez por mês (ou a cada entrega), ordenar o backlog por impacto × esforço | Gustavo + coordenação |
| **Fazer** | Uma melhoria por vez, pequena, com teste quando for lógica de servidor | Gustavo / Claude |
| **Publicar** | Seguir o checklist da seção 6 | Gustavo |
| **Medir** | Conferir os indicadores da seção 3 e perguntar às famílias | Gustavo |

**Regra de ouro:** nenhuma melhoria entra sem uma linha explicando *qual problema real ela resolve*.

---

## 2. Canais de feedback

| Canal | Para quê | Situação |
|---|---|---|
| Coordenação da paróquia | Visão de quem opera a escala | **[A DEFINIR]** reunião mensal de 15 min |
| Grupo de WhatsApp dos pais | Dúvidas e relatos de erro | **[A DEFINIR]** |
| Link/botão "Enviar sugestão" no app | Feedback no momento de uso | Ideia (ver backlog) |
| Execuções do Apps Script | Erros reais no servidor | ✅ Disponível: Apps Script → Execuções |
| Console do navegador | Erros no app web | ✅ Disponível |

---

## 3. Indicadores acompanhados

Conferir no início de cada mês e registrar na tabela.

| Mês | Missas abaixo do mínimo | Taxa de ocupação | Famílias cadastradas | Erros no servidor (Execuções) | Observações |
|---|---|---|---|---|---|
| out/2026 | — | — | — | — | Início do acompanhamento |

Fontes: painel do coordenador (resumo), aba `Responsaveis` e tela de Execuções do Apps Script.

---

## 4. Backlog

**Prioridade:** 🔴 alta · 🟡 média · 🟢 baixa.
**Esforço:** P (horas) · M (1 a 2 dias) · G (mais de 2 dias).
**Status:** ⏳ aberto · 🔧 em andamento · ✅ feito · ❌ descartado.

### 4.1 Produto (o que o usuário vê)

| ID | Melhoria | Problema que resolve | Prior. | Esforço | Status |
|---|---|---|---|---|---|
| P-01 | Tela **Vagas**: calendário e inscrição | Pais não conseguem se inscrever no app novo | 🔴 | G | ✅ |
| P-02 | Cancelar inscrição pelo app | Sem isso o app novo não substitui o antigo | 🔴 | P | ✅ |
| P-03 | Cadastro de responsável e filhos | Novas famílias não entram | 🔴 | M | ✅ |
| P-04 | Recuperação de senha | Quem esquece a senha fica de fora | 🔴 | M | ✅ |
| P-05 | **Painel** do coordenador completo | Coordenação ainda depende do app antigo | 🔴 | G | ✅ |
| P-06 | Chamar famílias por WhatsApp (mensagem pronta) | Preencher missas urgentes | 🟡 | M | ✅ |
| P-07 | Aplicar paleta da paróquia (vinho, dourado, pergaminho) e brasão | Identidade visual | 🟡 | M | ✅ Paleta; brasão só no login |
| P-08 | Mensagem clara quando não há missas cadastradas | Hoje a Agenda vazia confunde (*"não apareceu nada"*) | 🟡 | P | 🔧 Agenda já orienta para a aba Vagas; falta tela vazia do Painel |
| P-09 | Botão "Enviar sugestão" | Canal direto de feedback | 🟢 | M | ⏳ |
| P-10 | Notificação push | Lembrete fora do e-mail | 🟢 | G | ⏳ |
| P-11 | Histórico de participação por criança | Reconhecer quem serve mais | 🟢 | M | ⏳ |
| P-16 | Adicionar outra pessoa ao cadastro depois (novo filho, ou o responsável passar a servir) | Hoje só no cadastro inicial | 🟡 | M | ⏳ |
| P-17 | Avisar por e-mail quando o coordenador aprova ou recusa um pedido | A família só vê ao abrir o app | 🟡 | P | ⏳ |
| P-18 | Definir quem é administrador pelo app (hoje é a coluna `Administrador` na planilha) | Fora das "duas funções" do perfil; decidir se entra | 🟢 | P | ⏳ |
| P-19 | Aviso de privacidade (LGPD) na divulgação e no cadastro | Há dados de crianças | 🟡 | P | ⏳ |
| P-12 | Criar missa **avulsa** (data específica) | Só existe geração recorrente: sempre começa no próximo dia da semana a partir de hoje | 🟡 | P | ⏳ |
| P-13 | Evitar duplicar missas ao gerar recorrentes | Gerar duas vezes cria missas repetidas | 🟡 | P | ⏳ |
| P-14 | Coordenação cadastrar/vincular criança a um responsável | Hoje só pela planilha | 🟡 | M | ⏳ |
| P-15 | Mostrar "Chamar famílias" também para quem tem criança em outra missa, com aviso | Hoje só lista quem não tem nenhuma missa futura | 🟢 | P | ⏳ |

### 4.2 Segurança e dados

| ID | Melhoria | Problema que resolve | Prior. | Esforço | Status |
|---|---|---|---|---|---|
| S-01 | Publicar as correções de segurança no link dos pais (`…f4Ng` → versão 7) | O link em uso ainda roda o código antigo | 🔴 | P | ⏳ |
| S-02 | Intermediário na Vercel com limite de tentativas **por IP** | O bloqueio atual é só por usuário; alguém pode travar a conta de outro | 🟡 | M | ⏳ |
| S-03 | Trocar o hash por algo mais lento (várias rodadas) | Hoje é HMAC-SHA256 com sal, de uma rodada: suficiente para o porte, mas fraco contra ataque offline se a planilha vazar | 🟡 | M | ⏳ |
| S-04 | Restringir o compartilhamento da planilha a quem precisa | Planilha tem dados de menores | 🔴 | P | ⏳ |
| S-05 | Backup periódico da planilha | Perda por exclusão acidental | 🟡 | P | ⏳ |
| S-06 | Registro de quem alterou a escala (auditoria) | Saber quem tirou ou colocou uma criança | 🟢 | M | ⏳ |
| S-07 | Política de privacidade e aviso aos pais (LGPD) | Dados de crianças. **Agora inclui data de nascimento**: avisar no cadastro o que se coleta, para quê e quem vê (coordenação da pastoral vê só a idade; administração não vê pessoas) | 🔴 | P | ⏳ |

### 4.3 Qualidade técnica

| ID | Melhoria | Problema que resolve | Prior. | Esforço | Status |
|---|---|---|---|---|---|
| T-01 | Testes automatizados do app (lógica de datas, sessão) | Evitar regressões | 🟡 | M | ⏳ |
| T-02 | Deploy do app na Vercel com `EXPO_PUBLIC_API_URL` | Colocar no ar | 🔴 | P | ⏳ |
| T-03 | Arquivar implantações antigas do Apps Script (8 acumuladas) | Risco de usar a URL errada (já aconteceu) | 🟡 | P | ⏳ |
| T-04 | Aposentar o `Index.html` quando o app novo assumir | Duas interfaces para manter | 🟡 | P | ⏳ |
| T-05 | Cache local das missas no app | Primeira chamada do Apps Script é lenta | 🟢 | M | ⏳ |
| T-06 | Monitoramento de erros (ex.: Sentry) | Saber de falhas antes do usuário | 🟢 | M | ⏳ |
| T-07 | Script `check-api` que testa o `doPost` | Diagnosticar "sem conexão" em segundos | 🟢 | P | ⏳ |
| T-09 | API local de desenvolvimento (`npm run mock-api`) rodando o servidor real com dados fictícios | Testar telas sem tocar na planilha | 🟡 | P | ✅ |
| T-10 | Testes do app no CI (GitHub Actions) | Rodar `npm test`, `tsc` e lint a cada push | 🟢 | P | ⏳ |
| V-01 | Conferir "reduzir movimento" em aparelho real (iOS e Android) | Só foi possível verificar transições e pulso na web; o desligamento global ainda não foi exercitado | 🟡 | P | ⏳ |
| V-02 | Ícone do iOS (`assets/expo.icon`, formato Icon Composer) ainda é o do template | Android, web e splash já usam o brasão; falta o pacote do iOS | 🟡 | P | ⏳ |
| V-03 | Retorno tátil (háptico) ao escalar e cancelar no celular | Confirma a ação sem olhar; exige `expo-haptics` | 🟢 | P | ⏳ |
| V-04 | Peso do JS na web: 510 KB com gzip, a maior parte de Reanimated e roteador | Revisar se o app pesar em rede ruim; hoje é aceitável | 🟢 | M | ⏳ |
| V-05 | Conferir o rosa-vinho do modo escuro com os pais | Passa em contraste, mas "lê" mais rosa que vinho | 🟢 | P | ⏳ |
| T-08 | Migrar de Planilhas para banco de dados | Só se o volume crescer muito | 🟢 | G | ⏳ |

### 4.4 Multi-pastoral (preparação)

Contexto e modelo completo em [MULTI-PASTORAL.md](MULTI-PASTORAL.md). **Nada aqui precisa ser feito antes do lançamento dos Coroinhas**, exceto M-01 a M-03, que custam quase nada se feitos junto com a tela Vagas.

| ID | Melhoria | Problema que resolve | Prior. | Esforço | Status |
|---|---|---|---|---|---|
| M-01 | Tipos genéricos no app: `Evento` com `Vaga` por função | Evita espalhar "coroinhas/cerimoniarios" pelo código | 🔴 | P | ✅ |
| M-02 | Adaptador único (`src/services/adapters.ts`) | Quando o servidor mudar, só um arquivo muda | 🔴 | P | ✅ |
| M-03 | Pastoral como configuração (`PASTORAL_ATUAL`), sem "Coroinha" fixo em componentes e rotas | Reaproveitar telas em outra pastoral | 🟡 | P | 🔧 Rotas e componentes já neutros; falta a constante de configuração |
| M-04 | Responder as perguntas em aberto com o cliente (seção 8 do MULTI-PASTORAL) | Definir piloto e permissões | 🟡 | P | ⏳ |
| M-05 | Novo modelo de dados: abas `Pastorais`, `Funcoes`, `Pessoas`, `Membros`, `Papeis`, `Eventos`, `Vagas`, `Escalados` | Suportar várias pastorais | 🟢 | G | ⏳ (só com 2ª pastoral aprovada) |
| M-06 | Função de migração do formato atual para o novo, testada em cópia da planilha | Não perder dados | 🟢 | M | ⏳ |
| M-07 | Permissão de coordenador **por pastoral** no servidor | Coordenador só vê a própria pastoral | 🟢 | M | ⏳ |
| M-08 | Papel de administrador paroquial e tela de gestão | Criar missas, pastorais e atribuir coordenadores | 🟢 | G | ⏳ |
| M-09 | Seletor de pastoral e agenda única da família | Pais com filhos em várias pastorais | 🟢 | M | ⏳ |
| M-10 | Regra de conflito de escala (mesma pessoa, mesmo horário) | Evitar escalar duas vezes | 🟢 | M | ⏳ |

---

## 5. Registro de mudanças

Mais recente primeiro.

| Data | O que mudou | Observação |
|---|---|---|
| 26/10/2026 | **Cadastro por pastoral e com data de nascimento**: dados pessoais primeiro, depois as pastorais (várias); em cada uma se escolhe quem serve (eu, filho(a) ou os dois). Pastoral que "exige responsável" (coroinhas) começa sem ninguém marcado. Data de nascimento do responsável (18 anos ou mais) e de cada filho. Coordenação vê a **idade**, não a data | Coluna `Nascimento` em `Responsaveis` e `Criancas`, `ExigeResponsavel` em `Pastorais` (interruptor no Admin); `migrarParaMultiPastoral()` cria as colunas e marca a pastoral de coroinhas. **Exige colar o `Código.js`, criar nova versão e rodar a migração**; chips marcáveis agora têm `aria-checked` na web. 80 testes |
| 26/10/2026 | Contas anteriores a esta mudança não têm data de nascimento | A idade aparece em branco para elas; coletar depois (ideia: pedir no primeiro acesso) |
| 13/10/2026 | **Multi-pastoral**: qualquer pastoral que serve nas missas; perfil **administrador** (cria missas e pastorais) e **coordenador por pastoral**; entrada em pastoral com aprovação; adultos servem por conta própria | `docs/MULTI-PASTORAL-CONTRATO.md`; servidor com abas novas e `migrarParaMultiPastoral()`; 70 testes unitários e 22 verificações no navegador |
| 13/10/2026 | Gerar missas agora pula as que já existem (mesma data e horário) | Atende P-13 |
| 13/10/2026 | Corrigido: aviso de confirmação entrava por cima do botão durante a animação | Aviso só com fade (`entradas.ts`) |
| 13/10/2026 | Rodapé "App desenvolvido por TeoCode · © 2026 TeoCode" em todas as telas, com link para o site | Endereço em `EXPO_PUBLIC_TEOCODE_URL`; sem ele aparece sem link |
| 13/10/2026 | Corrigido: nome do dia da semana saía em inglês na mensagem do WhatsApp e nos e-mails ("Thursday") | `nomeDiaSemana_` no `Código.js`; teste novo. **Exige colar o `Código.js` de novo e criar nova versão** |
| 13/10/2026 | Corrigido: entrada animada da lista deixava os cartões sobrepostos no navegador (Editar e Excluir ficavam cobertos) | `EntradaLista` (CSS puro na web); regra registrada em `entradas.ts` |
| 13/10/2026 | Corrigido: aviso "está escalado(a)" ficava na tela depois de cancelar a inscrição na Agenda | Avisos somem ao sair da aba |
| 13/10/2026 | Roteiro de testes executado de ponta a ponta com navegador automatizado: 66 verificações, 0 falhas | Seções 1 a 7 do `ROTEIRO-DE-TESTES.md`, API local |
| 13/10/2026 | Movimento: toque com escala, transições de tom, entradas, esqueleto com pulso, "reduzir movimento" global | Orçamento em `src/constants/movimento.ts`; verificado no DOM (durações, curva, pulso) |
| 13/10/2026 | Corrigido: animação de layout (`layout=`) tirava cartões do fluxo e a lista deixava de rolar na web | Removida; documentado em `DESIGN.md` e `entradas.ts` |
| 13/10/2026 | Redesign visual ("A Folha do Missal"): tokens, Spectral, Phosphor, brasão transparente, ícone e splash | `DESIGN.md`, `docs/DIRECAO-VISUAL.md`, `npm run contraste` |
| 13/10/2026 | Telas **Cadastro**, **Esqueci a senha**, **Redefinir senha** e **Painel completo** (Resumo, Missas, Gerar, Lembretes, Chamar famílias) | Verificadas no navegador contra a API local; servidor ganhou `APP_URL` |
| 13/10/2026 | Identidade visual da paróquia aplicada ao tema | Reversível em `src/constants/theme.ts`; modo escuro com dourado |
| 13/10/2026 | Telas **Vagas** (calendário e inscrição) e **cancelamento** na Agenda | Verificadas em celular contra a API local; 18 testes novos da lógica |
| 13/10/2026 | Corrigido: abrir `/vagas` direto caía na Agenda | Rotas só montam depois de restaurar a sessão |
| 13/10/2026 | Tipos genéricos (`Evento`, `Vaga`) e adaptador do servidor | Primeiro passo do multi-pastoral |
| 13/10/2026 | `npm run mock-api` e `npm test` | API local com o `Código.js` real |
| 12/10/2026 | Decisão: lançar só Coroinhas, com visão de todas as pastorais | Mapeado em `docs/MULTI-PASTORAL.md`; nenhum código alterado |
| 12/10/2026 | Documentação do projeto criada (`docs/`) | Briefing e este arquivo |
| 12/10/2026 | App novo: login real funcionando e Agenda carregando | Testado com o usuário do coordenador |
| 12/10/2026 | API JSON (`doPost`) com lista fechada de ações | CORS validado do navegador |
| 12/10/2026 | Rotas protegidas por sessão; aba Painel só para coordenador | `Stack.Protected` |
| 12/10/2026 | Correções de segurança no Apps Script | Token assinado, hash de senha, permissões por papel, escape de HTML, limites de tentativa, 19 testes |
| 12/10/2026 | Repositório criado no GitHub | `GustavoTeodoro10/EscalaLiturgica` |

---

## 6. Checklist de publicação

Antes de publicar qualquer mudança no servidor:

- [ ] `node --test tests/apps-script/security.test.js` passando.
- [ ] `npx tsc --noEmit` e `npx expo lint` sem erros.
- [ ] Mudou o servidor? Colar/enviar `apps-script/` e **Implantar → Gerenciar implantações → editar a implantação em uso → Nova versão** (nunca "Nova implantação": gera outra URL).
- [ ] Testar no navegador: login, Agenda e uma ação de escrita.
- [ ] Confirmar que `EXPO_PUBLIC_API_URL` (local e Vercel) é a URL da implantação em uso.
- [ ] Registrar na seção 5.
- [ ] `git commit` e `git push`.

---

## 7. Decisões já tomadas

Para não rediscutir à toa. Para mudar uma decisão, registre o motivo.

| Decisão | Motivo |
|---|---|
| Manter Google Apps Script + Planilhas como servidor | A paróquia já usa; custo zero; a coordenação edita a planilha diretamente |
| Autorização dentro de cada função do servidor | Qualquer pessoa com a URL consegue chamar o `doPost`; esconder botão não protege |
| Chamadas com `Content-Type: text/plain` | Evita o *preflight* de CORS, que o Apps Script não responde |
| Token de sessão guardado em `expo-secure-store` (web: `localStorage`) | Nunca guardar a senha no aparelho |
| Lista fechada de ações no `doPost` | Funções administrativas (`gerarDadosTeste` etc.) nunca ficam acessíveis pela web |
| Funções administrativas exigem `PERMITIR_ADMIN = sim` | `gerarDadosTeste` apaga missas e vínculos |
| Lançar só Coroinhas; modelar para várias pastorais | Entrega rápida sem trancar o crescimento. Detalhes em [MULTI-PASTORAL.md](MULTI-PASTORAL.md) |
| Não alterar a planilha em produção até haver uma 2ª pastoral aprovada | Evita migrar dados por antecipação e arriscar o que já funciona |
| Uma paróquia só (sem multi-paróquia) | Evita complexidade que ninguém pediu |

---

## 8. Como pedir uma melhoria

Escreva na seção 4 (ou diga ao Claude) no formato:

> **O que acontece hoje:** …
> **O que deveria acontecer:** …
> **Quem é afetado e com que frequência:** …

Com isso a melhoria entra no backlog já com problema, impacto e critério de pronto.
