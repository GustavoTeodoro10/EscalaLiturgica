# Publicação: commit e Vercel

> Última atualização: 14/10/2026. O servidor (Apps Script) já está na versão 9, com a migração feita.
> Este guia cobre o que falta: **commit**, **Vercel**, **APP_URL** e a **virada** para as famílias.

---

## 1. Antes do commit (2 minutos)

```bash
npm test                 # 70 testes
npx tsc --noEmit         # tipos
npx expo lint            # lint
npx expo export -p web   # o mesmo build que a Vercel roda (cria dist/, que é ignorado)
```

Tudo precisa passar. `.env`, `dist/`, `node_modules/` e `.expo/` já estão no `.gitignore`: nenhum segredo entra.

**Decisão pendente (recomendado):** `apps-script/Index.html` é a tela antiga do Apps Script. O servidor novo não a usa
(o `doGet` só mostra um aviso com o link do app). Pode sair do repositório: `git rm apps-script/Index.html`.

## 2. Commits sugeridos

Três commits, do mais interno ao mais externo. No PowerShell, na raiz do projeto:

### Commit 1: servidor e testes

```powershell
git add -- "apps-script/Código.js" tests/apps-script/harness.js tests/apps-script/mock-server.js tests/apps-script/security.test.js tests/apps-script/multipastoral.test.js
git rm apps-script/Index.html   # opcional, ver acima
git commit -m @'
Servidor multi-pastoral: administrador, coordenador por pastoral e migração

- Modelo novo: Pastorais, Funcoes, Membros, Eventos e Vagas (as abas antigas ficam intactas).
- Perfis conferidos no servidor: administrador (missas e pastorais), coordenador
  (só a própria pastoral) e responsável/membro.
- Entrada em pastoral com aprovação do coordenador; adultos servem por conta própria.
- migrarParaMultiPastoral(): idempotente, só com PERMITIR_ADMIN = sim.
- Gerar missas pula as que já existem; dia da semana em português nos e-mails e no WhatsApp.
- 37 testes do servidor (isolamento entre pastorais, migração, lembretes, administração).

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
'@
```

### Commit 2: app

```powershell
git add -- src assets app.json package.json package-lock.json .env.example
git commit -m @'
App multi-pastoral: layout "Folha do Missal", cadastro por pastoral, painel e administração

- Visual novo (tokens, Spectral, Phosphor, brasão) e movimento com orçamento e "reduzir movimento".
- Cadastro com escolha de pastoral e função; Vagas e Agenda por participação;
  pedidos de entrada e "Participação nas pastorais".
- Painel por pastoral (resumo, missas, membros, lembretes) e área Admin (missas, gerar, pastorais).
- Lista de itens em CSS puro na web (Reanimated deixava os cartões sobrepostos).
- Rodapé "App desenvolvido por TeoCode" com link.
- 33 testes de domínio (adaptadores, vagas por participação, datas, plural).

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
'@
```

### Commit 3: documentação e registros de design

```powershell
git add -- docs DESIGN.md PRODUCT.md .impeccable scripts
git commit -m @'
Docs: briefing, roteiro de testes, contrato multi-pastoral e direção visual

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
'@
```

### Enviar

```powershell
git status          # deve estar limpo
git push origin main
```

> Se o `git status` ainda mostrar arquivos soltos, confira com `git status --short` antes do push.

---

## 3. Vercel, passo a passo

Pré-requisito: o código está no GitHub (`GustavoTeodoro10/EscalaLiturgica`, branch `main`).

1. Entre em **vercel.com** com a conta do GitHub.
2. **Add New → Project → Import Git Repository** e escolha `EscalaLiturgica`. Se não aparecer, **Adjust GitHub App Permissions** e libere o repositório.
3. Em **Configure Project**:

   | Campo | Valor |
   |---|---|
   | Framework Preset | **Other** |
   | Root Directory | `./` (raiz) |
   | Build Command | já vem do `vercel.json`: `npx expo export -p web` |
   | Output Directory | `dist` |
   | Install Command | padrão (`npm install`) |
   | Node.js Version | 20.x ou 22.x (em *Settings → General*, se a Vercel perguntar) |

4. Abra **Environment Variables** e cadastre as duas (marque *Production* e *Preview*):

   | Nome | Valor |
   |---|---|
   | `EXPO_PUBLIC_API_URL` | a URL `https://script.google.com/macros/s/AKfycbxgF3.../exec` (a mesma do seu `.env`) |
   | `EXPO_PUBLIC_TEOCODE_URL` | `https://teocode.com.br/` |

   > Variáveis `EXPO_PUBLIC_*` entram **no momento do build**. Se mudar uma depois, faça **Redeploy**.

5. Clique em **Deploy**. Leva 2 a 4 minutos. Anote o endereço, algo como `https://escala-liturgica.vercel.app`.

### Depois do primeiro deploy

6. **Troque o `APP_URL` no Apps Script** pelo endereço da Vercel, **sem barra no fim**:
   Configurações do projeto → Propriedades do script → `APP_URL`.
   Não precisa criar nova versão. Sem isso, os e-mails de cadastro e de redefinição saem com link para `localhost`.
7. **Teste no endereço da Vercel** (item 8 do roteiro, e os itens 1, 2 e 3):
   - login com a sua conta e abrir `/vagas` direto, dar F5 (a regra de reescrita do `vercel.json` precisa responder);
   - cadastrar uma família de teste com o seu e-mail e conferir o e-mail e o link;
   - abrir o link de redefinição de senha e concluir.
8. **Domínio próprio (opcional):** *Settings → Domains*. Se o endereço mudar, atualize o `APP_URL` de novo.

### Se algo der errado

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| "O app ainda não está configurado com o endereço do servidor" | `EXPO_PUBLIC_API_URL` não chegou no build | Conferir a variável e fazer **Redeploy** |
| "Sem conexão com o servidor" | URL errada, ou a URL é a `/dev` em vez da `/exec` | Usar a URL de **App da Web** terminada em `/exec` |
| 404 ao dar F5 em `/vagas` | `vercel.json` não foi lido | Conferir se o arquivo está na raiz e foi commitado |
| E-mail com link para `localhost` | `APP_URL` ainda não foi trocado | Passo 6 |
| Build falha em `npm install` | Versão do Node | Definir Node 20.x ou 22.x e refazer |
| Algo quebrou depois de publicar | | **Deployments** → deploy anterior → **Promote to Production** (volta em segundos) |

---

## 4. A virada para as famílias

Só depois de tudo acima funcionar com a **sua** conta:

1. **Limpar os dados de teste** nas abas (`Responsaveis`, `Criancas`, `Vinculos`, `Membros`, `Eventos`, `Vagas`), mantendo o cabeçalho
   e a linha dos coordenadores. Conferir as abas `Pastorais` e `Funcoes`.
2. Cadastrar as **pastorais reais** e os **coordenadores** pela área Admin.
3. Criar ou gerar as **missas** (Admin → Gerar).
4. Avisar as famílias com **um único link**, o da Vercel. O link antigo (V4) continua com o código antigo: não divulgue.
5. Primeira semana: acompanhar os **pedidos de entrada** (os coordenadores recebem por e-mail e na aba Membros).

> **Privacidade (LGPD):** o app guarda nome de crianças e dados dos responsáveis. Vale um parágrafo curto na divulgação:
> quais dados são coletados, para quê, e quem tem acesso (coordenação da pastoral e administração).
