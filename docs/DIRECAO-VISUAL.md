# Direção visual

> Definida com a skill `taste-skill`. É o contrato para a construção (`impeccable`) e o polimento (`emil-design-eng`).
> Última atualização: 13/10/2026.
>
> **Status: implementada.** O que foi de fato construído está em [`DESIGN.md`](../DESIGN.md) (raiz do projeto), que prevalece sobre este documento quando houver diferença. A paleta é validada por `npm run contraste`.

---

## 1. Leitura de design

**App utilitário mobile-first (web + iOS + Android) para famílias da paróquia e uma coordenação voluntária. Redesign preservando a identidade existente, com linguagem litúrgica sóbria e calorosa, sobre tokens próprios em React Native.**

| | |
|---|---|
| **Modo** | Redesign, **preservar**. A marca já existe (brasão, vinho, pergaminho, Spectral) e está em produção. |
| **Público** | Pais e mães (de todas as idades, muitos com pouca familiaridade com apps) e uma coordenação que usa o painel com pressa, muitas vezes de pé, no celular. |
| **Restrições silenciosas** | Dados de crianças, uso ao ar livre e em ambiente de igreja (brilho de tela, pressa), leitura por pessoas mais velhas. **Legibilidade e confiança vencem estética.** |
| **Design system externo** | Nenhum se aplica (não é Microsoft, Google, IBM nem setor público). Tokens próprios em `src/constants/theme.ts`. |

### Dials

| Dial | Valor | Por quê |
|---|---|---|
| `DESIGN_VARIANCE` | **3** | Preservar a marca e priorizar clareza: colunas simples, alinhamento à esquerda, uma ação principal por tela. A personalidade vem de **um** gesto tipográfico (seção 4), não de assimetria. |
| `MOTION_INTENSITY` | **5** | Você pediu microinterações, hover e animações. Faixa "fluida": transições curtas de `transform` e `opacity`, nada contínuo, tudo com motivo e com `reduce motion` respeitado. |
| `VISUAL_DENSITY` | **4** | Mais respiro que painel de dados, porque o público inclui quem lê devagar. O Painel da coordenação fica no limite superior (5). |

---

## 2. O que da skill se aplica (e o que não)

A `taste-skill` é escrita para páginas web (landing, portfólio). Este projeto é um app React Native, que a própria skill lista como fora de escopo para regras de página (seção 13). Aplico **os princípios**, não a receita web.

| Aplica | Não se aplica (e por quê) |
|---|---|
| Tokens e disciplina de paleta | Tailwind, Next, `motion/react`, GSAP, ScrollTrigger (stack web) |
| Trava de consistência de cor e de forma | Regras de hero, eyebrow, bento, marquee, logo wall (não há página de marketing) |
| Estados: carregando, vazio, erro, sucesso | Fontes via `next/font` (aqui é `expo-font`) |
| Contraste AA, alvo de toque, foco visível | `h-[100dvh]`, breakpoints Tailwind |
| `prefers-reduced-motion` e modo escuro desde o início | |
| Sem os "tells" de IA: emoji, hífen longo, pontos decorativos, texto-ícone | |
| Auditoria de copy | |

---

## 3. Cor

### Decisão: manter a paleta da marca (exceção justificada)

A skill proíbe, **como reflexo automático**, o conjunto bege + latão + espresso em briefs "premium". Aqui ele não é reflexo: **é a identidade real da paróquia**, extraída do app em produção e do brasão (cruz vinho, fundo pergaminho, tinta escura). A regra de redesign (seção 11) manda extrair a marca antes de aplicar o gosto. O risco real é o app virar "bege genérico", então:

1. **Um único acento: o vinho.** O dourado **não** é acento de interface. Ele vira cor de **atenção** (aviso de "faltam vagas"), com significado semântico.
2. **Camadas por tom, não por bloco bege escuro.** Superfícies mais claras que o fundo, com linha fina, em vez de caixas bege mais escuras (o tom "barro" que o tema anterior tinha).
3. **Contraste alto.** Texto em tinta quase preta, vinho profundo.

### Tokens (a validar por script de contraste na construção)

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `background` | `#F4EEE0` pergaminho | `#1B1612` | Fundo da tela |
| `surface` | `#FBF8F0` | `#26201A` | Cartões e linhas, **mais claros** que o fundo |
| `line` | `#DCD0B4` | `#3A3128` | Filetes de 1 px entre itens |
| `text` | `#2A241E` | `#F1EADB` | Texto principal |
| `textSecondary` | `#6B6154` | `#B7AD9A` | Apoio |
| `accent` | `#7A2331` vinho | vinho clareado (a definir com contraste) | Botão principal, seleção, link |
| `onAccent` | `#FFFFFF` | a definir | Texto sobre o acento |
| `accentSoft` | tinta do vinho a ~10% | idem | Fundo de item selecionado |
| `attention` | âmbar escuro (texto) / `#B9862E` (marca) | idem | "Faltam vagas", abaixo do mínimo |
| `danger` | vermelho distinto do vinho | idem | Erros que bloqueiam |
| `success` | `#3F5D48` verde da marca | idem | Confirmações |

**Regras:** sem preto puro e sem branco puro como fundo; vermelho de erro **diferente** do vinho do acento, e erro **nunca** só por cor (sempre ícone + texto); mesmo acento em todas as telas (Color Consistency Lock).

---

## 4. Tipografia

| Papel | Fonte | Tamanho / peso |
|---|---|---|
| **Títulos e numerais de destaque** | **Spectral** SemiBold (fonte da marca, já usada na versão em produção) | 28/34 título de tela, 20/26 seção, 36 números do resumo |
| **Interface e texto** | **Fonte do sistema** (SF Pro, Roboto, Segoe) | 16/24 corpo, 14/20 apoio, mínimo 12 |
| **Botões, campos, rótulos** | Sistema, peso 600 | 16 |

**Justificativa do serif** (a skill o desencoraja por padrão): é uma paróquia, a identidade é litúrgica e heráldica, e Spectral **já é** a fonte do app em produção. Não é Fraunces nem Instrument Serif.

**Disciplina:**
- Serif só em títulos e numerais. **Nunca** em botões, campos ou texto corrido.
- Sem mistura de famílias dentro de uma mesma frase.
- Números alinhados (`tabular-nums`) em contadores e horários.
- Corpo mínimo de **16 px** (evita zoom no iOS e ajuda quem enxerga mal).

### O gesto de assinatura

**O bloco de data.** Cada missa é anunciada por um numeral grande em Spectral (o dia), com mês e dia da semana em pequeno. É a "folha do missal": reconhecível, útil (a pessoa procura a data) e **o único elemento decorativo** do app. Aparece na Agenda, nas Vagas e nas Missas do Painel. Nada de filetes dourados, ornamentos ou texturas.

---

## 5. Forma, superfície e espaço

### Trava de forma (uma regra, sem exceção)

| Elemento | Raio |
|---|---|
| Contêineres (cartões, avisos) | **16** |
| Campos de texto | **12** |
| Interativos pequenos (botões, chips, dia do calendário) | **pill / círculo** |

Escala de espaço mantida (4, 8, 16, 24, 32). Margem lateral 20; largura máxima de leitura **560** em telas grandes.

### Cartões só quando elevam hierarquia

Itens de lista são **linhas separadas por filete**, não caixas dentro de caixas. Cartão apenas para o que tem ações próprias (uma missa no Painel) ou precisa se destacar (resumo). Sombra: nenhuma no claro; no escuro, só diferença de tom.

---

## 6. Ícones

- **Biblioteca única:** Phosphor (primeira da lista permitida pela skill), peso `regular`, 20 ou 24 px.
- **Nada de glifos de texto como ícone.** Hoje o app usa `✓`, `!`, `‹`, `›`, `✕`: todos saem.
- Ícone **sempre com rótulo** quando a ação não for óbvia; alvo de toque 44 px.

---

## 7. Estados (obrigatórios em toda tela)

| Estado | Regra |
|---|---|
| **Carregando** | **Esqueleto** com a forma do conteúdo final (linhas de data + texto), com brilho suave. Sem spinner solto. |
| **Vazio** | Frase útil + **próxima ação** (ex.: "Nenhuma missa agendada" + botão "Ver vagas"). |
| **Erro** | Inline, com ícone, causa em português claro e botão "Tentar de novo". Sem alerta técnico. |
| **Sucesso** | Confirmação curta que some sozinha, anunciada a leitores de tela. |
| **Desabilitado** | Opacidade e cursor; nunca só mudar a cor. |

---

## 8. Movimento (para o polimento)

**Regra da skill:** todo movimento precisa de um motivo em uma frase (hierarquia, narrativa, feedback ou mudança de estado). "Ficou bonito" não vale.

| Momento | Motivo | Direção |
|---|---|---|
| Pressionar botão, chip, linha | Feedback: "recebi o toque" | Escala ~0,97 + leve escurecer, resposta imediata |
| Passar o mouse (web) | Affordance | Mudança de tom em 120 ms, só na web |
| Trocar aba do Painel, filho, mês | Mudança de estado | Transição curta de opacidade/deslocamento |
| Selecionar dia no calendário | Feedback | Preenchimento do acento com mola curta |
| Entrada da primeira lista | Hierarquia | Entrada escalonada **uma vez**, curta, sem repetir ao voltar |
| Esqueleto | Estado de carga | Brilho lento |
| Aviso de sucesso/erro | Feedback | Entra e sai suave |
| Editar missa no Painel | Mudança de estado | Expansão com layout animado |

**Limites:** nada em loop infinito exceto esqueleto; animar só `transform` e `opacity`; **respeitar "reduzir movimento"** do sistema (tudo vira troca instantânea); nada de cursor customizado, parallax ou rolagem sequestrada.

**Sobre "scroll-reveal":** em um app de listas curtas, o equivalente honesto é a **entrada escalonada na primeira exibição**, não revelar item a item enquanto rola (isso é efeito de landing page e atrapalha quem quer achar a missa rápido).

---

## 9. Voz e copy

- Frases curtas, calorosas, em português claro. Trata a pessoa por "você".
- **Zero hífen longo** (`—`) em qualquer texto visível; hoje há um em `missa-card.tsx`.
- Sem "Eleve", "Perfeito", "Sem esforço". Verbo concreto: "Escalar Ana", "Cancelar inscrição".
- Rótulos de botão em até 3 palavras, sem quebrar linha.
- Um rótulo por intenção (não ter "Entrar" e "Acessar" na mesma tela).

---

## 10. Marca e ativos

- **Brasão com fundo transparente.** O arquivo atual é JPG com fundo branco e aparece como uma caixa branca sobre o pergaminho. Gerar PNG transparente.
- **Ícone do app e splash** ainda estão com o azul padrão do template (`#E6F4FE`, `#208AEF`). Trocar por pergaminho e vinho, com o brasão.
- Brasão pequeno na barra superior da web, no lugar do texto "Escala".

---

## 11. Anti-padrões deste projeto

- Voltar ao "bege barro": caixas mais escuras que o fundo.
- Dourado como segundo acento.
- Spinner no lugar de esqueleto.
- Texto ou emoji como ícone.
- Cartão dentro de cartão; sombras pesadas.
- Animação "de vitrine" sem motivo; qualquer coisa sem tratamento de movimento reduzido.
- Alvo de toque menor que 44 px; contraste abaixo de AA; erro só em vermelho.
- Serif em controles.

---

## 12. Lista de verificação final (da skill, adaptada)

- [ ] Um acento (vinho) usado igual em todas as telas; erro distinto do acento
- [ ] Uma escala de raios aplicada em todo lugar (16 / 12 / pill)
- [ ] Contraste AA medido por script nos dois temas, texto e controles
- [ ] Botões legíveis, sem quebra de linha; um rótulo por intenção
- [ ] Zero `—` e zero emoji ou glifo-ícone na interface
- [ ] Carregando, vazio, erro e sucesso presentes em Agenda, Vagas e cada aba do Painel
- [ ] Todo movimento com motivo e com versão para "reduzir movimento"
- [ ] Alvos de toque de 44 px; foco visível por teclado na web
- [ ] Claro e escuro conferidos
- [ ] Copy relida: nada quebrado, nada de frase "bonita" sem sentido
