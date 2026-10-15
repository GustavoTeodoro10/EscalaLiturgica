# Cronograma das telas

> Última atualização: 13/10/2026 (todas as telas construídas; falta testar e publicar).
> **Sem datas de calendário:** o prazo do cliente ainda é **[A CONFIRMAR]** (ver [BRIEFING.md](BRIEFING.md), seção 7).
> A ordem abaixo é a recomendada; o tamanho é uma estimativa de esforço, não um compromisso de data.

Tamanho: **P** meio dia · **M** 1 a 2 dias · **G** 3 dias ou mais.

---

## Visão geral

| # | Tela | Quem usa | Tamanho | Depende de | Status |
|---|---|---|---|---|---|
| 1 | Login | Todos | M | — | ✅ Pronto |
| 2 | **Agenda** (compromissos da família + cancelar) | Responsáveis | M | 1 | ✅ Pronto |
| 3 | **Vagas** (calendário + inscrição) | Responsáveis | G | 1 | ✅ Pronto |
| 4 | Cadastro de responsável e filhos | Novos usuários | M | 1 | ✅ Pronto |
| 5 | Esqueci a senha / Redefinir senha | Todos | M | 1; ajuste no servidor (link do e-mail) | ✅ Pronto (servidor precisa ser atualizado) |
| 6 | **Painel · Resumo** (indicadores, alertas, próxima missa) | Coordenação | M | 1 | ✅ Pronto |
| 7 | **Painel · Missas** (lista, editar, excluir, escalar e remover) | Coordenação | G | 6 | ✅ Pronto |
| 8 | **Painel · Gerar missas** (recorrentes) | Coordenação | P | 7 | ✅ Pronto |
| 9 | **Painel · Chamar famílias** (WhatsApp) | Coordenação | M | 7 | ✅ Pronto |
| 10 | Painel · Lembretes (envio manual) | Coordenação | P | 6 | ✅ Pronto |
| 11 | Aplicar identidade visual (paleta, brasão, tipografia) | Todos | M | 2 a 10 | ✅ Paleta aplicada (reversível em `theme.ts`); tipografia segue a padrão |
| 12 | Publicação na Vercel + migração do link dos pais | Todos | P | 2 a 5 | ⏳ Depende de você: teste → Vercel → `APP_URL` |

---

## Etapas e marcos

### Etapa 1 — Responsáveis usam o app ✅ concluída

Login, Agenda, Vagas e cancelamento. É o ciclo completo do dia a dia dos pais.

**Critério de pronto:** um responsável entra, vê as vagas, escala o filho e cancela, tudo pelo celular.
**Verificado:** fluxo completo no navegador, em largura de celular, contra a API local com o código real do servidor; testes automatizados da lógica.
**Ainda não verificado:** uso com a planilha real e em aparelho físico.

### Etapa 2 — Novos usuários entram sozinhos (telas 4 e 5)

Cadastro e recuperação de senha. Sem isso, o app novo só atende quem já tem conta.

- **Atenção:** o e-mail de redefinição hoje aponta para o app antigo (`ScriptApp.getService().getUrl()`). Para abrir no app novo, o servidor precisa de uma propriedade `APP_URL`. Isso exige **uma nova colagem do `Código.js` no Apps Script** e uma nova versão da implantação.

### Etapa 3 — Coordenação migra (telas 6 a 10)

O Painel inteiro. Só depois dela a coordenação deixa de depender do app antigo. É a etapa mais longa, e vale entregar em partes: Resumo → Missas → Gerar → Chamar → Lembretes.

### Etapa 4 — Identidade e lançamento (telas 11 e 12)

Paleta da paróquia, brasão e textos revisados. Depois, publicar na Vercel e trocar o link divulgado aos pais.

### Etapa 5 — Piloto e ajustes

Um grupo pequeno de famílias usa por algumas semanas. O feedback entra no backlog de [MELHORIA-CONTINUA.md](MELHORIA-CONTINUA.md).

---

## Ordem recomendada e por quê

1. **Vagas antes do Painel:** os pais são a maioria dos usuários e o ciclo deles já fecha sozinho.
2. **Cadastro e recuperação antes do Painel:** sem eles ninguém novo entra e quem esquece a senha fica de fora.
3. **Painel em partes:** o Resumo já dá valor à coordenação sem esperar a edição de missas.
4. **Identidade visual por último:** aplicar tema a telas prontas é rápido e evita refazer.

## O que depende de você

| Decisão | Necessária antes de |
|---|---|
| Prazo e data de lançamento desejada | Transformar este cronograma em datas |
| Aprovar a paleta (pergaminho, vinho, dourado) | Tela 11 |
| Nova colagem do `Código.js` no Apps Script | Telas 4 e 5 em produção |
| Quem na coordenação testa o Painel | Etapa 3 |

## Como testar sem tocar na planilha

```powershell
npm run mock-api
```

Sobe uma API local que roda o `Código.js` real com dados fictícios (usuários `Mae.Dois`/`senha22`, `Pai.Tres`/`senha33`, `Coord.Um`/`coord123`). Em outro terminal, aponte o app para ela:

```powershell
$env:EXPO_PUBLIC_API_URL = "http://localhost:4000"; npm run web
```
