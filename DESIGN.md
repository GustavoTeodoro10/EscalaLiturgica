---
name: Escala de Coroinhas e Cerimoniários
description: Escala da Paróquia São Vicente de Paulo, em pergaminho, tinta e vinho, com a data em numeral serifado como único ornamento.
colors:
  parchment: "#F4EEE0"
  paper: "#FBF8F0"
  ink: "#2A241E"
  ink-soft: "#6B6154"
  wine: "#7A2331"
  on-wine: "#FFFFFF"
  wine-soft: "#EFDCD8"
  rule: "#DCD0B4"
  control-edge: "#8C8068"
  hover-wash: "#EFE8D5"
  attention: "#7A4F00"
  attention-soft: "#F3E3B5"
  danger: "#B5380A"
  success: "#2F5D3A"
  night: "#1B1612"
  night-paper: "#26201A"
  night-ink: "#F1EADB"
  night-ink-soft: "#B7AD9A"
  rose-wine: "#D9788A"
  rose-wine-soft: "#3E2229"
  night-rule: "#3A3128"
  night-control-edge: "#847762"
  night-hover-wash: "#2F2820"
  night-attention: "#E8C26B"
  night-attention-soft: "#3D3016"
  night-danger: "#FF9A6B"
  night-success: "#7DBE8C"
typography:
  title:
    fontFamily: "Spectral_600SemiBold, Georgia, serif"
    fontSize: "32px"
    lineHeight: "38px"
  subtitle:
    fontFamily: "Spectral_600SemiBold, Georgia, serif"
    fontSize: "26px"
    lineHeight: "32px"
  heading:
    fontFamily: "Spectral_600SemiBold, Georgia, serif"
    fontSize: "20px"
    lineHeight: "26px"
  numeral:
    fontFamily: "Spectral_600SemiBold, Georgia, serif"
    fontSize: "32px"
    lineHeight: "36px"
    fontFeature: "tabular-nums"
  body:
    fontFamily: "system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
  strong:
    fontFamily: "system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: "24px"
  small:
    fontFamily: "system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  caption:
    fontFamily: "system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: "18px"
    letterSpacing: "0.6px"
rounded:
  field: "12px"
  container: "16px"
  pill: "999px"
spacing:
  half: "2px"
  one: "4px"
  two: "8px"
  three: "16px"
  four: "24px"
  five: "32px"
  six: "64px"
components:
  button-primary:
    backgroundColor: "{colors.wine}"
    textColor: "{colors.on-wine}"
    rounded: "{rounded.pill}"
    height: "48px"
    padding: "0 24px"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "48px"
    padding: "0 24px"
  button-secondary-hover:
    backgroundColor: "{colors.hover-wash}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.wine}"
    rounded: "{rounded.pill}"
    height: "48px"
    padding: "0 8px"
  button-ghost-hover:
    backgroundColor: "{colors.wine-soft}"
  chip:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "44px"
    padding: "0 16px"
  chip-active:
    backgroundColor: "{colors.wine}"
    textColor: "{colors.on-wine}"
  card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.container}"
    padding: "16px"
  field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    height: "48px"
    padding: "0 16px"
  calendar-day-open:
    backgroundColor: "{colors.wine-soft}"
    textColor: "{colors.wine}"
    rounded: "{rounded.pill}"
    size: "42px"
  calendar-day-selected:
    backgroundColor: "{colors.wine}"
    textColor: "{colors.on-wine}"
    rounded: "{rounded.pill}"
    size: "42px"
---

# Design System: Escala de Coroinhas e Cerimoniários

## Overview

**Creative North Star: "A Folha do Missal"**

O app é uma folha de missal posta no celular: pergaminho claro, tinta escura, um único vinho para o que é ação, e a data de cada missa em numeral serifado, como o dia anunciado no alto da página. Não há enfeite além disso. A confiança vem de contraste alto, texto grande e de tudo ter lugar e nome.

A interface é de **operar**, não de contemplar. Pais usam em tarefas curtas, com uma mão, muitas vezes na pressa; a coordenação usa de pé. Por isso a personalidade mora em poucos detalhes (o numeral, o brasão, a cor do vinho) e o resto é familiar: botões que parecem botões, listas separadas por filete, calendário que se lê de relance.

**Key Characteristics:**
- Um único acento (vinho). O dourado existe só como cor de **atenção**, nunca como segundo acento.
- Superfícies mais claras que o fundo, separadas por filete de 1 px. Sem sombras, sem blocos escuros "de barro".
- Títulos e numerais em Spectral; todo o resto na fonte do sistema.
- O bloco de data é o único gesto decorativo, e também a informação que a pessoa procura primeiro.
- Claro e escuro desde o início, mesma marca em ambos.

## Colors

Paleta de pergaminho e tinta com um vinho profundo. Neutros levemente quentes, nunca cinza frio.

### Primary
- **Vinho da Paróquia** (#7A2331): botão principal, item selecionado (aba, chip, dia do calendário), link e ícone ativo. No escuro vira **Rosa-vinho** (#D9788A), com texto sobre ele em #1B1612.
- **Vinho Diluído** (#EFDCD8): fundo de item selecionado e de dia com vaga. No escuro, #3E2229.

### Neutral
- **Pergaminho** (#F4EEE0): fundo da página. No escuro, **Noite** (#1B1612).
- **Papel** (#FBF8F0): cartões, campos e linhas de lista; sempre mais claro que o fundo. No escuro, #26201A.
- **Tinta** (#2A241E): texto principal. No escuro, #F1EADB.
- **Tinta Suave** (#6B6154): texto de apoio. No escuro, #B7AD9A.
- **Filete** (#DCD0B4): separadores decorativos de 1 px. No escuro, #3A3128.
- **Borda de Controle** (#8C8068): contorno de campos, chips e botões secundários; contraste mínimo de 3:1 contra o fundo. No escuro, #847762.
- **Lavagem de Hover** (#EFE8D5): fundo de controle sob o mouse (só na web). No escuro, #2F2820.

### Semantic
- **Âmbar de Atenção** (#7A4F00 sobre #F3E3B5): "faltam vagas", "abaixo do mínimo". No escuro, #E8C26B sobre #3D3016.
- **Vermelho de Erro** (#B5380A): erro que bloqueia. Escolhido **distinto do vinho**: o erro nunca pode ser confundido com o acento. No escuro, #FF9A6B.
- **Verde de Confirmação** (#2F5D3A): sucesso. No escuro, #7DBE8C.

### Named Rules
**The One Voice Rule.** O vinho é a única cor de ação. Se uma tela tem dois destaques coloridos concorrendo, um deles está errado.

**The Never Color Alone Rule.** Estado nunca é só cor: erro, aviso e sucesso sempre levam ícone e texto.

**The Lifted Surface Rule.** Camadas se distinguem por ficarem mais claras que o fundo e por um filete, nunca por um bege mais escuro.

## Typography

**Display Font:** Spectral SemiBold (com Georgia, serif)
**Body Font:** fonte do sistema (SF Pro, Roboto, Segoe UI)

**Character:** uma serifa de leitura (a mesma da marca em produção) para anunciar, e uma sans neutra para operar. A serifa diz "paróquia"; a sans diz "toque aqui".

### Hierarchy
- **Title** (600, 32/38): nome do app no login e destaque do usuário gerado.
- **Subtitle** (600, 26/32): título de cada tela.
- **Heading** (600, 20/26): seções dentro da tela e mês do calendário.
- **Numeral** (600, 32/36, algarismos tabulares): o dia no bloco de data e o horário nas Vagas.
- **Body** (400, 16/24): texto corrido; largura de leitura da coluna limita a linha.
- **Strong** (600, 16/24): nome da pessoa, rótulos de botão.
- **Small** (400, 14/20): apoio e metadados.
- **Caption** (500, 13/18, 0,6 px, caixa alta): dia da semana e mês dentro do bloco de data.

### Named Rules
**The Serif Stays Home Rule.** A serifa aparece só em título, seção e numeral. Nunca em botão, campo, rótulo ou dado de lista.

**The 16 Floor Rule.** Texto de leitura e de campo nunca abaixo de 16 px (o iOS dá zoom em campos menores e o público lê devagar).

## Layout

Coluna única de leitura, **560 px** no máximo, centrada em telas grandes, com margem lateral de 16 px. Escala de espaço de 2, 4, 8, 16, 24, 32 e 64. Entre grupos: 24; dentro de um grupo: 8 a 16. Em celular, ações ocupam a largura toda do contêiner; em duas ações lado a lado, cada uma tem 140 px de base e quebra para linhas se não couber.

Na web, uma barra superior fixa de 64 px traz o brasão e as abas (Agenda, Vagas e, para a coordenação, Painel). Em tela abaixo de 520 px o nome some e fica só o brasão. No celular nativo, abas inferiores do sistema.

## Elevation & Depth

Plano, sem sombras. A profundidade é **tonal**: o cartão (Papel) é mais claro que a página (Pergaminho) e é delimitado por filete de 1 px. No escuro, a diferença de tom faz o mesmo papel. Estados de foco usam contorno de 2 px no vinho, nunca sombra.

### Named Rules
**The Flat-By-Default Rule.** Superfícies não têm sombra em repouso nem em hover; hover é troca de tom.

## Shapes

Três formas, sem exceção: **contêineres** (cartões, avisos) com **16 px**; **campos de texto** com **12 px**; **controles pequenos** (botões, chips, abas, dia do calendário) em **pílula ou círculo**. O brasão fica sempre dentro de um selo circular de pergaminho, porque é preto sobre transparente e sumiria no escuro.

## Components

### Buttons
- **Shape:** pílula (999 px), altura mínima de 48 px, largura toda por padrão.
- **Primary:** fundo vinho, texto branco (no escuro, rosa-vinho com texto #1B1612), rótulo em 16/600.
- **Secondary:** fundo Papel, contorno de 1 px na Borda de Controle, texto Tinta.
- **Ghost:** sem fundo, texto vinho, preenchimento lateral de 8 px; com `alinhado`, o texto fica na mesma linha do texto ao redor.
- **Danger:** fundo Vermelho de Erro, só para confirmar ação destrutiva.
- **Hover / Pressed:** hover troca para a Lavagem de Hover (primário reduz para 92% de opacidade); pressionado reduz a escala para 0,98. Desabilitado: 50% de opacidade e sem resposta.

### Chips
- **Style:** pílula de 44 px, Papel com contorno; ativo preenche com vinho e texto branco.
- **State:** `radio` para escolha única (filho, função, dia da semana) e `tab` para as abas do Painel.

### Cards / Containers
- **Corner Style:** 16 px. **Background:** Papel. **Border:** 1 px Filete. **Shadow:** nenhuma.
- **Internal Padding:** 16 px. Listas são **um** cartão com linhas separadas por Filete, nunca um cartão por item.

### Inputs / Fields
- **Style:** Papel, contorno de 1 px na Borda de Controle, raio 12, altura mínima 48, texto de 16.
- **Focus:** contorno de 2 px no vinho e borda no vinho. **Error:** borda no Vermelho de Erro, ícone e mensagem abaixo do campo. Rótulo sempre acima; nunca placeholder como rótulo.

### Navigation
- **Web:** barra superior de 64 px em Papel com filete inferior; aba ativa em Vinho Diluído com ícone preenchido e texto vinho; inativa em Tinta Suave.
- **Nativo:** abas do sistema com indicador em Vinho Diluído e rótulo ativo em vinho.

### Date Block (assinatura)
O dia em Numeral (Spectral, 32) sobre "DIA MÊS" em Caption caixa alta e Tinta Suave, em coluna de 64 px. Aparece na Agenda, no Resumo e nas Missas do Painel. Um dia, um bloco: vários filhos na mesma data compartilham o bloco. Acessível: lido como "quinta-feira, 15 de outubro".

### Motion
Movimento só para estado, curto e com ease-out forte (`cubic-bezier(0.23, 1, 0.32, 1)`). Tudo vive em `src/constants/movimento.ts` e `src/constants/entradas.ts`.
- **Toque:** escala 0,97 em 120 ms ao pressionar (botão, chip, dia, aba, nome); a área de toque não muda de tamanho.
- **Tom:** troca de fundo, borda e contorno em 140 ms (hover só com mouse, seleção, foco, erro).
- **Aparecer:** aviso sobe 6 px e surge em 180 ms; estado vazio e mensagem de campo surgem em fade; sair é sempre mais rápido (120 ms).
- **Primeira lista:** entra escalonada em 40 ms por item, no máximo 6 itens, uma vez por abertura.
- **Troca:** conteúdo de aba do Painel e resultados de um dia entram com fade de 150 ms.
- **Esqueleto:** pulso de opacidade de 1,2 s, o único movimento contínuo.
- **Reduzir movimento** do sistema desliga tudo (`ReducedMotionConfig`).
- **Não anima:** troca de mês, qualquer ação por teclado, e nada de animação de layout (`LinearTransition`) em listas na web, que tira os itens do fluxo e quebra a rolagem.

### Calendar
Cartão com mês em Heading e setas de 44 px. Dia com vaga: círculo de 42 px em Vinho Diluído com texto vinho em negrito; selecionado: vinho cheio; hoje: anel na Borda de Controle; sem vaga: texto a 55% e sem toque.

### Notice
Filete e Papel com ícone preenchido (sucesso, erro, informação) e texto em 14/600. Atenção usa fundo Âmbar. Erro é anunciado como alerta.

### Skeleton
Barras na cor do Filete com a forma do conteúdo (bloco de data e duas linhas). Sem spinner solto.

## Do's and Don'ts

### Do:
- **Do** usar o vinho só para a ação principal, a seleção atual e o link.
- **Do** manter ao menos 4,5:1 de contraste em texto e 3:1 em contornos de controle; validar com `npm run contraste`.
- **Do** dar a todo alvo de toque 44 px no mínimo.
- **Do** acompanhar toda cor de estado de ícone e texto.
- **Do** terminar todo estado vazio com a próxima ação ("Ver vagas", "Gerar missas").
- **Do** mostrar esqueleto no formato do conteúdo enquanto carrega.

### Don't:
- **Don't** usar o dourado como segundo acento ou em botões; ele é só atenção.
- **Don't** usar serifa em botão, campo ou rótulo.
- **Don't** pôr sombra, gradiente ou desfoque de fundo em superfícies.
- **Don't** aninhar cartões, nem pôr um cartão por item de lista.
- **Don't** usar glifos de texto ou emoji como ícone; os ícones vêm do Phosphor (regular), importados por arquivo em `src/components/icones.ts`.
- **Don't** repetir o mesmo vermelho do acento para erro.
- **Don't** reintroduzir o painel de "números grandes": estatística entra como linha de conferência (rótulo à esquerda, valor à direita).
