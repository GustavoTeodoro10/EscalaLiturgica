# Roteiro de testes

> Para testar o app inteiro de uma vez. Marque cada item. Anote o que falhar com **a tela, o que você fez e o que apareceu**.
> Última atualização: 13/10/2026 (multi-pastoral).

---

## 0. Antes de testar: colocar o servidor novo no ar

O app agora é **multi-pastoral** e só funciona com o servidor novo (`apps-script/Código.js`). A ordem importa:

1. Abra `apps-script/Código.js` no VS Code, selecione tudo (Ctrl+A) e copie.
2. No editor do Apps Script, abra o arquivo `Código`, selecione tudo e cole. Salve (Ctrl+S).
3. **Configurações do projeto → Propriedades do script:** adicione `PERMITIR_ADMIN` = `sim`.
4. No editor, escolha a função **`migrarParaMultiPastoral`** e clique em **Executar**. Autorize se pedir.
   Ela cria as abas novas (`Pastorais`, `Funcoes`, `Membros`, `Eventos`, `Vagas`), cria a pastoral
   **Coroinhas e Cerimoniários** e converte as missas e inscrições. Rodar de novo é seguro.
5. **Remova** a propriedade `PERMITIR_ADMIN`.
6. **Implantar → Gerenciar implantações**, lápis na implantação em uso → **Versão: Nova versão** → **Implantar**. Mantém a URL.
7. Propriedade `APP_URL` = endereço do app, **sem barra no fim** (`http://localhost:3000` para testar; depois o da Vercel).
8. Na planilha, aba **Responsaveis**, coluna **Administrador**: marque `TRUE` só em quem deve criar missas e pastorais.
   A migração marca quem era coordenador.
9. No terminal: `npm run web`.

> **Importante:** quem logar na versão nova terá a senha convertida para hash (mão única). Se precisar voltar à versão antiga, a pessoa usa "Esqueci minha senha".
> O link antigo dos pais (versão V4) não conhece o modelo novo: use só o link do app novo.

### Alternativa: testar com dados fictícios, sem tocar na planilha

```bash
npm run mock-api
```

Em outro terminal:

```powershell
$env:EXPO_PUBLIC_API_URL = "http://localhost:4000"; npm run web
```

| Usuário | Senha | Papel |
|---|---|---|
| `Coord.Um` | `coord123` | Administrador **e** coordenador de "Coroinhas e Cerimoniários" |
| `Admin.Quatro` | `admin44` | Só administrador |
| `Leitor.Cinco` | `leitor55` | Coordenador de "Leitores" e leitor (adulto) |
| `Mae.Dois` | `senha22` | Filha Ana (Coroinha) e Duda (pedido pendente) |
| `Pai.Tres` | `senha33` | Beto (Cerimoniário) e Caio (Coroinha) |

Os e-mails "enviados" aparecem em http://localhost:4000/emails.

---

## 1. Acesso

| # | Teste | Resultado esperado | ✔ |
|---|---|---|---|
| 1.1 | Abrir o app sem estar logado | Cai na tela de login, com brasão e "Escala Litúrgica" | ☐ |
| 1.2 | Entrar com usuário e senha **errados** | Mensagem "Usuário ou senha incorretos." | ☐ |
| 1.3 | Errar a senha 5 vezes seguidas | "Muitas tentativas. Aguarde 15 minutos…" | ☐ |
| 1.4 | Entrar com usuário e senha corretos | Abre a Agenda | ☐ |
| 1.5 | Recarregar a página (F5) | Continua logado | ☐ |
| 1.6 | Com a página aberta em **Vagas**, recarregar | Continua em Vagas | ☐ |
| 1.7 | Tocar em **Sair** (no fim da Agenda) | Volta ao login; F5 não entra sozinho | ☐ |

## 2. Cadastro

| # | Teste | Resultado esperado | ✔ |
|---|---|---|---|
| 2.1 | Login → **Criar cadastro** → enviar vazio | Pede nome e sobrenome, e-mail, data de nascimento e ao menos uma pastoral | ☐ |
| 2.2 | Senha com menos de 6 caracteres | Recusa com mensagem | ☐ |
| 2.3 | Data de nascimento: digitar só números (`15031985`) | Vira `15/03/1985`; menor de 18 anos e data futura são recusados | ☐ |
| 2.4 | Marcar uma pastoral só de adultos (ex.: Leitores) | Aparece o bloco da pastoral com "Eu" já marcado; pede a função | ☐ |
| 2.5 | Marcar **Coroinhas** | Bloco com "Quem vai servir aqui?" sem ninguém marcado; enviar assim recusa | ☐ |
| 2.6 | Coroinhas → "Meu filho(a)" → nome, data de nascimento e função → **Adicionar filho(a)** | O filho entra na lista com função e data; sem data ou com data futura recusa | ☐ |
| 2.7 | Digitar um filho e enviar sem tocar em **Adicionar filho(a)** | Aviso "Toque em Adicionar filho(a) para incluir …" | ☐ |
| 2.8 | Pai em Leitores e filho em Coroinhas, no mesmo cadastro | Duas pessoas, cada pedido para o coordenador da própria pastoral | ☐ |
| 2.9 | Concluir | Mostra **"Seu usuário"** e o aviso de que o coordenador vai aprovar | ☐ |
| 2.10 | **Entrar no app** | Abre a Agenda, já logado | ☐ |
| 2.11 | E-mails | Usuário e link do app novo para a pessoa; aviso de pedido para cada coordenador envolvido | ☐ |
| 2.12 | Planilha | Linhas novas em `Responsaveis` (senha `h1$…`, `Nascimento`), `Criancas` (`Tipo` e `Nascimento`), `Vinculos` e `Membros` com `pendente` | ☐ |
| 2.13 | Coordenador → Painel → Membros | A criança aparece como "Criança · N anos · responsável: …"; a data de nascimento não aparece | ☐ |

## 3. Recuperar senha

| # | Teste | Resultado esperado | ✔ |
|---|---|---|---|
| 3.1 | Login → **Esqueci minha senha** → usuário existente | "Se o usuário existir, enviamos um link…" | ☐ |
| 3.2 | Repetir com usuário que **não** existe | A **mesma** mensagem | ☐ |
| 3.3 | Abrir o link do e-mail | Abre **o app novo** em "Nova senha" | ☐ |
| 3.4 | Senhas diferentes nos dois campos | "As senhas não conferem." | ☐ |
| 3.5 | Salvar nova senha válida | "Sua senha foi redefinida." | ☐ |
| 3.6 | Entrar com a senha antiga / nova | Recusada / entra | ☐ |
| 3.7 | Abrir o **mesmo link** de novo | Mensagem de link já utilizado | ☐ |

## 4. Responsável ou membro: Agenda, Vagas e participação

| # | Teste | Resultado esperado | ✔ |
|---|---|---|---|
| 4.1 | Aba **Vagas** | Calendário com dias marcados e o primeiro dia já selecionado | ☐ |
| 4.2 | Com mais de uma pessoa: trocar | O calendário e as vagas mudam para as funções dela | ☐ |
| 4.3 | Avançar e voltar o mês | Dias sem vaga ficam apagados e sem toque | ☐ |
| 4.4 | **Escalar [nome]** | Aviso "… está escalado(a) como [função] em …" | ☐ |
| 4.5 | Aba **Agenda** | O compromisso aparece com a função | ☐ |
| 4.6 | **Cancelar inscrição** → **Voltar** / **Sim, cancelar** | Nada muda / some e a vaga volta | ☐ |
| 4.7 | Pessoa com pedido **pendente** | Aparece "(aguardando aprovação)" e não há vagas para ela | ☐ |
| 4.8 | Em **Vagas → Participação nas pastorais**: pedir outra função | "Pedido enviado" e a função aparece como aguardando aprovação | ☐ |
| 4.9 | Abas **Painel** e **Admin** | **Não aparecem** para quem não tem o papel | ☐ |

## 5. Coordenador: Painel da própria pastoral

Use uma conta que coordena uma pastoral. Quem coordena mais de uma escolhe a pastoral no topo.

| # | Teste | Resultado esperado | ✔ |
|---|---|---|---|
| 5.1 | Aba **Painel** | O título é o nome da pastoral; abas Resumo, Missas, Membros, Lembretes | ☐ |
| 5.2 | **Resumo** | Pendências, próxima missa, membros ativos e pedidos de entrada | ☐ |
| 5.3 | **Membros** com pedidos | Aba mostra "Membros (n)"; **Aprovar** move a pessoa para a lista; **Recusar** apaga o pedido | ☐ |
| 5.4 | **Remover** → **Sim, remover** | A pessoa sai da pastoral e das escalas futuras | ☐ |
| 5.5 | **Missas**: só as vagas da pastoral aparecem | Nada de funções de outra pastoral | ☐ |
| 5.6 | **Adicionar** → tocar em um nome | A pessoa entra; contador sobe. Só aparecem membros **aprovados** | ☐ |
| 5.7 | Tocar em um nome escalado → **Sim, remover** | Sai da escala | ☐ |
| 5.8 | Vaga cheia | Mostra "Limite de vagas atingido" | ☐ |
| 5.9 | **Ajustar vagas** com mínimo maior que máximo | Recusa com mensagem | ☐ |
| 5.10 | **Ajustar vagas** válido | Salva; vale só para aquela missa | ☐ |
| 5.11 | **Chamar famílias** | Lista quem está livre; **WhatsApp** abre a conversa com a mensagem pronta (cita a pastoral) | ☐ |
| 5.12 | Pessoa sem celular | "Sem celular cadastrado" | ☐ |
| 5.13 | **Lembretes → Sim, enviar agora** | "Lembretes enviados para N responsável(is)" (só da pastoral) | ☐ |
| 5.14 | Escalar pelo Painel e conferir na Agenda da família | Aparece lá também | ☐ |

## 6. Administrador: missas e pastorais

Use uma conta com `Administrador = TRUE`. O administrador **não** vê pessoas, telefones nem escalas.

| # | Teste | Resultado esperado | ✔ |
|---|---|---|---|
| 6.1 | Aba **Admin** | Abas Missas, Gerar, Pastorais; sem nomes de pessoas | ☐ |
| 6.2 | **Nova missa** com data inválida / horário inválido | Recusa com mensagem | ☐ |
| 6.3 | **Nova missa** válida | Aparece na lista com "pastoral: x de y vagas" | ☐ |
| 6.4 | Criar duas missas no mesmo dia e horário | Recusa ("Já existe uma missa…") | ☐ |
| 6.5 | **Editar** horário e descrição | Salva; horário `7:30` é recusado, `07:30` salva | ☐ |
| 6.6 | **Excluir** → **Confirmar exclusão** | A missa e as inscrições dela somem | ☐ |
| 6.7 | **Gerar**: domingo, 10:00, 4 semanas | "4 missa(s) criada(s)"; repetir mantém as existentes | ☐ |
| 6.8 | **Pastorais → Nova pastoral**: nome, buscar o coordenador, **Quem serve nesta pastoral** (Só adultos / Crianças e adultos), funções com mínimo e máximo | Aparece na lista com a coordenação e o tipo de público | ☐ |
| 6.9 | A pessoa escolhida como coordenador entra de novo | Ganha a aba **Painel** da pastoral nova (sem virar administradora) | ☐ |
| 6.10 | A pastoral nova no **Criar cadastro** | Aparece para marcar, com as funções; se for "Crianças e adultos", pergunta quem serve | ☐ |
| 6.11 | **Editar** pastoral: trocar coordenador, mudar vagas padrão, **Inativa** | A coordenação antiga perde o Painel; inativa some do cadastro | ☐ |

## 7. Segurança (rápido)

| # | Teste | Resultado esperado | ✔ |
|---|---|---|---|
| 7.1 | Responsável digita `/painel` ou `/admin` no endereço | Volta para a Agenda; nada aparece | ☐ |
| 7.2 | Logado, abrir `/login` | Redireciona para a Agenda | ☐ |
| 7.3 | Cadastrar nome com `<b>` ou começando com `=` | Salvo limpo, sem executar nada | ☐ |
| 7.4 | Coordenador de uma pastoral olhar membros da outra | Não consegue (nem pela tela, nem pelo servidor) | ☐ |
| 7.5 | Administrador tentar escalar alguém | Não consegue | ☐ |

## 8. Aparência

| # | Teste | Resultado esperado | ✔ |
|---|---|---|---|
| 8.1 | Cores | Fundo pergaminho, botões em vinho | ☐ |
| 8.2 | Celular real: abas, calendário e botões | Cabem na tela; botões fáceis de tocar | ☐ |
| 8.3 | Modo escuro do aparelho | Fundo escuro, texto legível | ☐ |
| 8.4 | Quatro abas (Agenda, Vagas, Painel, Admin) em tela estreita | Só a aba aberta mostra o nome; cabem sem cortar | ☐ |
| 8.5 | Rodapé "App desenvolvido por TeoCode · © 2026 TeoCode" | Aparece no fim das telas e abre o site | ☐ |

---

## O que anotar quando algo falhar

1. **Qual item** do roteiro (ex.: 5.10).
2. **O que apareceu** (copie a mensagem ou tire um print).
3. **Console do navegador** (F12 → Console), se houver erro em vermelho.
4. Se foi na **planilha real** ou na API de teste.
