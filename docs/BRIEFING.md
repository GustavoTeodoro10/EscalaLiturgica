# Briefing — Escala de Coroinhas e Cerimoniários

> Documento vivo. Última atualização: 12/10/2026.
> Itens marcados com **[A CONFIRMAR]** não constam no projeto e precisam ser respondidos com o cliente.

---

## 1. Visão geral do projeto

| | |
|---|---|
| **Cliente** | Paróquia São Vicente de Paulo — Mauá/SP (Diocese de Santo André) |
| **Endereço** | R. Vice-Presidente Francisco Silviano Alves Brandão, 88 — Parque São Vicente, Mauá — SP, 09371-160 |
| **Telefone** | (11) 4555-4205 |
| **Desenvolvido por** | TeoCode |
| **Responsável técnico** | Gustavo Teodoro |
| **Contato do cliente (coordenação)** | **[A CONFIRMAR]** nome e função |

### Contexto

A paróquia tem um grupo de coroinhas e cerimoniários (crianças e jovens que servem nas missas). Os responsáveis são os pais, e uma pessoa da coordenação monta a escala de cada missa.

### O grande problema

Montar e manter a escala dá trabalho e falha com facilidade:

- A coordenação precisa descobrir, missa a missa, quem pode servir e quantos faltam.
- Os pais não têm um lugar único para ver as missas com vaga e se inscrever.
- Quando uma missa está com poucas pessoas, a coordenação chama as famílias uma a uma, de forma manual.
- Esquecimentos: sem lembrete, a criança não aparece e a missa fica sem servidor.

### Solução

Um aplicativo onde os pais se inscrevem nas missas com vagas e a coordenação enxerga, em um painel, quais missas estão abaixo do mínimo e chama as famílias livres por WhatsApp com a mensagem pronta. Lembretes por e-mail são enviados 3 dias antes.

### Escopo da implantação e visão de futuro

| | |
|---|---|
| **Implantação inicial** | Somente **Coroinhas e Cerimoniários** |
| **Visão de futuro** | **Todas as pastorais** da paróquia no mesmo app |

O lançamento atende só os Coroinhas, mas as decisões de arquitetura já consideram as demais pastorais. O mapeamento está em [MULTI-PASTORAL.md](MULTI-PASTORAL.md).

### Estado atual

- Existe uma **versão em produção** feita em Google Apps Script + Google Planilhas (`apps-script/`), usada hoje pelos pais.
- Estamos construindo a **versão nova** em Expo (iOS, Android e Web) em `src/`, falando com o mesmo servidor por uma API JSON.

---

## 2. Objetivos principais

1. **Reduzir o trabalho manual da coordenação** na montagem da escala.
2. **Aumentar a ocupação das missas**: menos missas abaixo do número mínimo de servidores.
3. **Facilitar a vida dos pais**: inscrever e cancelar em poucos toques, pelo celular.
4. **Diminuir faltas e esquecimentos** com lembretes automáticos.
5. **Proteger os dados de crianças e responsáveis** (nomes, telefones, e-mails), em linha com a LGPD.

### Como saber se deu certo (indicadores)

| Indicador | Como medir | Meta |
|---|---|---|
| Missas abaixo do mínimo | Painel do coordenador (`totalMissasAbaixoMin`) | **[A CONFIRMAR]** |
| Taxa de ocupação | Painel do coordenador (`taxaOcupacao`) | **[A CONFIRMAR]** |
| Famílias cadastradas e ativas | Aba `Responsaveis` da planilha | **[A CONFIRMAR]** |
| Tempo da coordenação para fechar a escala do mês | Pergunta direta à coordenação | **[A CONFIRMAR]** |

---

## 3. Público-alvo

| Perfil | Quem é | O que precisa |
|---|---|---|
| **Responsáveis** (principal) | Pais e mães de coroinhas e cerimoniários | Ver as missas com vaga, inscrever e cancelar filhos, receber lembrete |
| **Coordenação** | Quem monta a escala da paróquia | Ver pendências, escalar manualmente, chamar famílias, gerar missas recorrentes |
| **Crianças e jovens** | Coroinhas e cerimoniários | Não usam o app diretamente; são cadastrados pelos responsáveis |

### Hábitos digitais (a validar com o cliente)

- **Celular como principal dispositivo** e uso intenso de WhatsApp. Por isso o app foi pensado mobile-first e o contato com famílias sai por WhatsApp.
- Parte dos usuários provavelmente tem pouca familiaridade com apps: telas simples, textos claros, poucos toques.
- Faixa etária dos responsáveis, perfil de renda e quantidade de famílias: **[A CONFIRMAR]**.

### Dores

- Esquecer a data da missa.
- Não saber quantas vagas há antes de ligar para a coordenação.
- Esquecer o usuário ou a senha (por isso existe a recuperação por e-mail).

---

## 4. Funcionalidades essenciais (escopo)

### MVP — precisa existir no lançamento

| # | Funcionalidade | Quem usa | Status |
|---|---|---|---|
| 1 | Login com usuário e senha, sessão que se renova | Todos | ✅ Pronto |
| 2 | Agenda: missas em que a família está escalada | Responsáveis | ✅ Pronto |
| 3 | Vagas: calendário e inscrição de cada filho | Responsáveis | ✅ Pronto |
| 4 | Cancelar inscrição | Responsáveis | ✅ Pronto |
| 5 | Cadastro de responsável com filhos (usuário gerado automaticamente) | Novos usuários | ✅ Pronto |
| 6 | Recuperar senha por e-mail (link válido por 1 hora) | Todos | ✅ Pronto |
| 7 | Painel: resumo, alertas de missas urgentes, próxima missa | Coordenação | ✅ Pronto |
| 8 | Painel: escalar e remover crianças manualmente | Coordenação | ✅ Pronto |
| 9 | Painel: gerar missas recorrentes, editar e excluir missa | Coordenação | ✅ Pronto |
| 10 | Chamar responsáveis livres por WhatsApp (mensagem pronta) | Coordenação | ✅ Pronto |
| 11 | Lembrete por e-mail 3 dias antes da missa (já automático no servidor) | Responsáveis e coordenação | ✅ Servidor pronto |

### Segurança (parte do MVP)

- ✅ Token de sessão assinado, validado no servidor em toda chamada.
- ✅ Senhas guardadas com hash e sal.
- ✅ Papel de coordenador conferido no servidor, não só escondido na tela.
- ✅ Responsável só mexe nos próprios filhos.
- ✅ Bloqueio por tentativas de login e limite de cadastros.

### Fica para versões futuras

Ideias ainda **não aprovadas**; entram em [MELHORIA-CONTINUA.md](MELHORIA-CONTINUA.md) para priorização:

- **Outras pastorais** (liturgia, leitores, ministros e demais), com coordenação e permissões por pastoral. Planejamento em [MULTI-PASTORAL.md](MULTI-PASTORAL.md).
- Notificação push no celular (hoje só e-mail).
- Confirmação de presença no dia da missa.
- Histórico de participação por criança.
- Relatórios mensais para a coordenação.
- Troca de função e de funcionário entre famílias (substituições).
- Modo escuro com a paleta da paróquia.

---

## 5. Referências e estilo visual

### Identidade atual (versão Apps Script)

| Papel | Cor |
|---|---|
| Fundo (pergaminho) | `#F4EEE0` |
| Texto (tinta) | `#2A241E` |
| Destaque (vinho) | `#7A2331` |
| Detalhe (dourado) | `#B9862E` |
| Confirmação (verde) | `#3F5D48` |
| Linhas e bordas | `#DCD0B4` |

- **Tipografia:** Spectral (títulos) e Inter (texto).
- **Logo:** brasão da Paróquia São Vicente de Paulo (`src/assets/images/logo-paroquia.jpg`).
- **Tom:** sóbrio, acolhedor e litúrgico; nada de visual "de startup".

### Decisão pendente

A versão nova ainda usa as cores neutras do template. **[A CONFIRMAR]** se levamos a paleta acima (pergaminho, vinho e dourado) para o app novo.

### Referências do cliente

- Apps concorrentes ou de escala que o cliente admira: **[A CONFIRMAR]**.
- O que o cliente **não** quer no visual: **[A CONFIRMAR]**.

### Princípios de interface

- Mobile-first, botões com alvo de toque confortável (mínimo 48 px).
- Poucas telas, uma ação principal por tela.
- Mensagens de erro em português claro, sem termos técnicos.
- Acessível: contraste suficiente, rótulos para leitores de tela.

---

## 6. Plataformas

| Plataforma | Situação |
|---|---|
| **Web** | Ativa. Publicação prevista na Vercel (`vercel.json` já configurado). |
| **Android** | Prevista, via Expo/EAS. Publicação na Play Store **[A CONFIRMAR]**. |
| **iOS** | Prevista, via Expo/EAS. Exige conta Apple Developer, **[A CONFIRMAR]** se o cliente fará. |

**Tecnologia**

- App: Expo (React Native) + Expo Router, TypeScript.
- Servidor: Google Apps Script (web app), com API JSON em `doPost`.
- Dados: Google Planilhas, abas `Responsaveis`, `Criancas`, `Vinculos`, `Missas` e `ResetSenha`.
- E-mail: `MailApp` do Apps Script.
- Hospedagem web: Vercel. Código: GitHub (`GustavoTeodoro10/EscalaLiturgica`, privado).

**Limitações conhecidas do Apps Script**

- Cotas diárias de e-mail e de execução.
- Primeira chamada pode levar alguns segundos.
- Sem limite de tentativas por IP (só por usuário); para isso seria preciso um intermediário na Vercel.

---

## 7. Prazo e orçamento

| Item | Situação |
|---|---|
| Orçamento | **[A CONFIRMAR]** |
| Data desejada de lançamento | **[A CONFIRMAR]** |
| Quem aprova cada entrega | **[A CONFIRMAR]** |

### Marcos propostos

Sem datas ainda; definir com o cliente. O detalhamento tela a tela, com ordem, tamanho e dependências, está em [CRONOGRAMA-TELAS.md](CRONOGRAMA-TELAS.md).

| # | Marco | Entrega |
|---|---|---|
| 1 | Fundação | Login, sessão, Agenda, API segura, testes do servidor — ✅ concluído |
| 2 | Responsáveis | Vagas, inscrição/cancelamento, cadastro e recuperação de senha ✅ |
| 3 | Coordenação | Painel completo e chamada por WhatsApp ✅ (falta testar) |
| 4 | Identidade visual | Paleta e brasão aplicados ✅, revisão de textos ⏳ |
| 5 | Piloto | Grupo pequeno de famílias usando, coleta de feedback |
| 6 | Lançamento web | Publicação na Vercel e migração do link dos pais |
| 7 | Lojas (opcional) | Build Android/iOS e publicação |

---

## 8. Riscos e dependências

- **Dados de menores:** nomes de crianças e telefones de responsáveis exigem cuidado (LGPD); manter repositório privado e planilha com acesso restrito.
- **Dependência do Google:** cotas e mudanças no Apps Script podem afetar o app.
- **Adoção:** a mudança só vale se os pais migrarem; combinar divulgação com a coordenação.
- **Migração de senhas:** após o login na versão nova, a senha vira hash; voltar para a versão antiga exige "Esqueci minha senha".
- **Muitas implantações no Apps Script** (8 acumuladas): risco de confundir qual URL está em uso.
- **Crescimento para outras pastorais:** o formato atual da planilha tem "Coroinha" e "Cerimoniário" em colunas fixas e o papel de coordenador é global. Isso precisa mudar antes da segunda pastoral (ver [MULTI-PASTORAL.md](MULTI-PASTORAL.md)).
