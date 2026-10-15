# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Existing codebase: Expo (React Native + Expo Router) with `react-native-web`, TypeScript, tokens in `src/constants/theme.ts`, server on Google Apps Script. Web is published first (Vercel); iOS and Android come later from the same code with the same identity.

## Users

- **Responsáveis** (pais e mães de coroinhas e cerimoniários): use no celular, em tarefas curtas e frequentes: ver as missas com vaga, escalar o filho, cancelar. Parte tem pouca familiaridade com apps; a faixa etária é ampla.
- **Coordenação** (voluntários da pastoral): montam a escala, muitas vezes de pé e com pressa, no celular. Precisam ver o que está abaixo do mínimo, escalar manualmente e chamar famílias por WhatsApp.

## Product Purpose

Substituir a montagem manual da escala (planilha e mensagens de WhatsApp) por inscrição direta dos pais e por um painel de pendências para a coordenação. Sucesso: menos missas abaixo do mínimo, menos trabalho manual para a coordenação, menos esquecimentos.

## Positioning

Feito para uma paróquia e para a rotina real dela: o responsável se inscreve sozinho, e a coordenação chama as famílias livres com a mensagem pronta no WhatsApp.

## Operating Context

- A escala existe como planilha do Google; o app lê e grava nela por meio do Apps Script.
- As missas são geradas por recorrência semanal e ajustadas à mão.
- Lembretes por e-mail saem 3 dias antes.
- Uso em ambiente de igreja e em deslocamento: pressa, brilho de tela, uma mão.

## Capabilities and Constraints

- Hoje: **somente Coroinhas e Cerimoniários** (duas funções). Visão futura: todas as pastorais (ver `docs/MULTI-PASTORAL.md`).
- Dados sensíveis: nomes de crianças e telefones de responsáveis (LGPD).
- Papel de coordenador conferido no servidor; a interface apenas reflete.
- Funcionalidades: login, cadastro, recuperação de senha, agenda, vagas com calendário, painel (resumo, missas, gerar, lembretes, chamar famílias).
- Dados de teste na planilha são fictícios.

## Brand Commitments

- Paróquia São Vicente de Paulo, Mauá-SP (Diocese de Santo André).
- Brasão da paróquia, paleta pergaminho, tinta, vinho `#7A2331` e dourado `#B9862E`, tipografia Spectral nos títulos (identidade já usada na versão em produção).
- Tom sóbrio, acolhedor, litúrgico; fora de qualquer clima de "startup".

## Evidence on Hand

- `assets/images/logo-paroquia.jpg` (brasão, JPG com fundo branco).
- Versão em produção em Apps Script (`apps-script/Index.html`) com a identidade original.
- Não há depoimentos, números de uso ou fotos de pessoas; nada disso deve ser inventado.

## Product Principles

1. **A tarefa primeiro:** cada tela tem uma ação principal clara; a marca aparece nos detalhes, não em enfeite.
2. **Quem lê devagar também usa:** texto grande, contraste alto, alvos de toque generosos, linguagem simples.
3. **Confiança antes de tudo:** é uma comunidade de fé com dados de crianças; nada de truque, nada de pressão.
4. **Pensado para crescer:** a estrutura visual não pode prender o app a "Coroinhas" quando outras pastorais chegarem.
5. **Funciona na pressa:** estados de carregamento, vazio e erro sempre explicam o que fazer.

## Accessibility & Inclusion

Alvo de toque mínimo de 44 px, contraste WCAG AA, corpo de texto mínimo de 16 px, foco visível por teclado na web, respeito a "reduzir movimento" e a modo escuro do sistema. Público de todas as idades.
