# DESIGN.md — Direção Visual e Arte da Plataforma

- **Versão**: 0.7
- **Data**: 2026-08-13
- **Status**: [APROVADO — 2026-08-13]
- **Base técnica**: `docs/specs/SPEC-frontend.md` (tokens, componentes, responsividade — contrato)
- **Relação**: este documento define **o quê visualmente** (estilo, arte, tom); a SPEC-frontend define **o como tecnicamente** (tokens, componentes).

---

## 1. Conceito Visual

**"Estudo com clareza."** — A plataforma deve transmitir:

| Atributo | Como aparece |
|---|---|
| **Confiável** | Azul sóbrio (#2563EB), composição ordenada, grid rígido |
| **Foco** | Hierarquia forte, respiro generoso, zero ruído decorativo |
| **Progresso** | Elementos de conquista discretos (streak, % de conclusão) com âmbar quente |
| **Acolhedor** | Cantos arredondados (8–12px), tons neutros quentes (slate), microinterações suaves |

**Anti-estilo**: nada de neon, gradientes chamativos, glassmorphism pesado, ilustrações infantis, cards empilhados sem hierarquia.

---

## 2. Moodboard (referências de direção)

| Referência | O que pegar |
|---|---|
| **Khan Academy** | Clareza de progressão, foco no conteúdo, simplicidade de navegação |
| **Duolingo (modo sóbrio)** | Motivação por streak sem poluição visual |
| **Notion** | Sidebar informativa, densidade controlada, dark mode bem resolvido |
| **Linear** | Micro-interações, focos de destaque, qualidade de estados vazios |
| **UOL/Estadão concursos (anti-ref)** | O que NÃO fazer: excesso de anúncios, cores gritantes |

---

## 3. Paleta (extensão da SPEC-frontend)

### 3.1 Semântica e uso
| Token | Valor | Uso obrigatório |
|---|---|---|
| `primary` #2563EB | ação, links, foco ativo, CTA "Assinar" | 1 dominância por tela |
| `accent` âmbar #F59E0B | streak 🔥, meta diária, badges de conquista | nunca para CTAs |
| `success` #16A34A | concluído, acertos, assinatura ativa | |
| `warning` #D97706 | expiração de assinatura (T-3d) | |
| `destructive` #DC2626 | erros, exclusão, respostas erradas | |
| neutros slate | todo o resto | 90% da superfície |

### 3.2 Regras de uso de cor
- **Nunca** cor pura em texto sobre cor pura sem contraste AA.
- Azul primário cobre no máx. 25% da superfície de uma viewport.
- Estado de bloqueio (sem acesso): cinza + cadeado — **nunca** vermelho (não é erro, é oportunidade de venda).
- Dark mode: azul mais claro (#3B82F6) para manter contraste em fundo escuro.

---

## 4. Tipografia

- **Inter** (variáveis): display 700 · h1 700 · h2/h3 600 · body 400/500 · caption 500.
- Ritmo vertical: 1.5–1.7 line-height em corpo; leitura 17px/1.7.
- Números em destaques (streak, %, notas): `tabular-nums` (alinhamento em painéis).
- Nunca mais de 2 pesos na mesma viewport (padrão: 700 p/ título + 400 p/ corpo).

---

## 5. Iconografia e Ilustração

- **Ícones**: Lucide (stroke 2px, 24px padrão, 20px em densidade alta). Nunca ícones preenchidos misturados com outline.
- **Tipo de material** (ícones de identificação):
  - PDF → `FileText` · Texto → `BookOpen` · Vídeo → `PlayCircle` · Questões → `HelpCircle` · Resumo → `ListChecks` · Simulado → `Timer`
- **Ilustrações** (estado vazio/erro/hero): estilo **flat + duotone** (2 tons: azul primário + slate), traços arredondados, sem rostos detalhados — conjunto único e próprio (evita banco de imagens genérico).
- **Arte hero da landing**: composição de estudo (caderno, cronômetro, checklist) no estilo duotone, com fundo slate claro.

---

## 6. Hierarquia e Composição

- **Grid**: 12 colunas (≥lg), 4 (md), 2 (mobile) — margens 24/16px.
- **Cards**: raio 12px, sombra `sm`, borda 1px `border`; hover → sombra `md` (elevação 1 nível, sem movimento).
- **Seções**: espaçamento vertical 64px (landing) / 32px (app).
- **Header de página (app)**: título h1 + subtítulo muted + ação primária à direita.
- **Caminho do olhar**: CTA primário SEMPRE acima da dobra em landing; 1 CTA por viewport.

---

## 7. Micro-interações (tom)

| Elemento | Comportamento |
|---|---|
| Botão | hover 150ms ease-out; active scale 0.98 |
| Concluir material | check com bounce leve (300ms), barra de progresso anima |
| Acerto/erro em questão | feedback de cor no card + toast sutil; sem confete (exceto bater meta diária) |
| Dark mode | transição de cor 200ms (sem flash) |
| Streak | 🔥 com pequeno "pulse" ao atualizar |
| Respeitar `prefers-reduced-motion` | todas as animações viram instantâneas |

---

## 8. Arte de Marca (a desenvolver na prototipagem)

- **Marca**: **ConcursFoco** (nome definido em 2026-08-13).
- **Logo**: wordmark "ConcursFoco" + símbolo mínimo (opções a explorar: livro aberto estilizado / check / seta de progresso).
- **Favicon**: símbolo em 32px, azul primário.
- **Aplicações**: header da landing, app-shell, email, certificado (marca d'água leve).
- Certificado: identidade sóbria — borda dupla fina, nome em serif? **Decisão a tomar na prototipagem** (explorar Inter vs. serif clássica).

---

## 9. Design de Conteúdo (UX Writing)

- **Tom**: direto, motivador sem exagero, PT-BR.
- **Padrões**:
  - CTA: "Assinar agora" · "Continuar estudando" · "Começar trial grátis"
  - Bloqueado: "Este material faz parte do plano Assinatura" + CTA
  - Erro: "Algo deu errado. Tente novamente." (nunca códigos de erro para o usuário)
  - Vazio: "Nada por aqui ainda" + instrução de próximo passo
- **Números**: porcentagem sem decimal (50%), tempo em "30 min", streak "12 dias".

---

## 10. Arte nos Estados do Produto

| Estado | Direção visual |
|---|---|
| Empty state | Ilustração duotone + título + CTA |
| Erro | Ícone círculo destrutivo + retry (sem ilustração) |
| Loading | Skeleton com leve shimmer (600ms) |
| Bloqueado | Cadeado + card cinza, CTA azul |
| Conclusão de curso | Selo/certificado com celebração leve (âmbar) |

---

## 11. Entrega da Prototipagem (ferramentas)

A prototipagem será feita com ferramenta a definir (Pencil / Figma / Stitch — MCP disponíveis), produzindo:

1. **Tela de referência por macro-área** (8 telas): Landing · Login/Cadastro · App-shell aluno (mobile) · Curso+materiais · Player de vídeo · Questão (modo estudo/prova) · Dashboard admin · Preços/paywall.
2. Validação visual (screenshot + revisão contra este DESIGN.md).
3. Exportação de tokens e componentes → aplicação no Next.js/Tailwind (SPEC-frontend).

### 11.1 Status da prototipagem (Stitch)

**Projeto**: "Plataforma de Estudos para Concursos" (`projects/1642508203900510249`) · **DS**: "Estudos Concursos — DS Base" (`assets/14068491294185094508`) · **Marca**: ConcursFoco.

#### Fase A — Telas de referência (8)

| # | Tela | Device | Status | Screen ID |
|---|---|---|---|---|
| 1 | Landing (logo + ilustração duotone) | Desktop | ✅ Corrigida (marca/textos) | `097a…` → `9e0f…` |
| 2 | Login/Cadastro | Desktop | ✅ | `af299cc345f244869a2f2feb83191c19` |
| 3 | App-shell aluno | Mobile | ✅ | `f21ea7204c9e41ccb4b8602721e7e3c3` |
| 4 | Curso + materiais | Desktop | ✅ | `e494091f82b2482282e003fff49c2135` |
| 5 | Player de vídeo | Desktop | ✅ | `cd3d7e6cf53d4934a00df8ec74042e8e` |
| 6 | Questão modo estudo | Desktop | ✅ | `88763c138868449d9f9e353d126dced0` |
| 7 | Dashboard admin | Desktop | ✅ | `28ab3a7a09384b7481e8f6c59c0de19e` |
| 8 | Preços/paywall | Desktop | ✅ | `d75ac2a699824fa1b2d543064a9050a4` |

#### Fase B — Fluxo completo do aluno (14)

| # | Tela | Status |
|---|---|---|
| 9 | Meus cursos (trial banner, sem acesso) | ✅ `14c4fce2c23a475db319f66502fdaf3a` |
| 10 | Trilhas por edital (múltiplas ativas) | ✅ `f91f75daa3e849a599442efd5ddaa121` |
| 11 | Simulados (lista + histórico) | ✅ `92bf54acca6b4d15987cd10ec58c0d56` |
| 12 | Simulado em execução (cronômetro, mapa) | ✅ `1e16694838b045e6ba500e781c16a174` |
| 13 | Resultado do simulado (nota, disciplinas) | ✅ `7292bc1cc7284bb9a9b5965ed3a5a382` |
| 14 | Banco de erros (2 acertos seguidos) | ✅ `b3e47fb655ca40c083795b8b3068e6b2` |
| 15 | Flashcards (SM-2, sugestões) | ✅ `0bc35b8237ef4f2aaa703855205acc96` |
| 16 | Concursos (rastreamento) | ✅ `d4c5a83eed4249c9b1fce9747ec8e969` |
| 17 | Anotações (lista + editor) | ✅ `dfbbf04f0f6c4d91ae85f10248f580c4` |
| 18 | Central de notificações | ✅ `77bf620fada442f992af7cee9909a85a` |
| 19 | Certificado (código de verificação) | ✅ `1cdb20dea16c4008956e51628f703ad9` |
| 20 | Paywall material bloqueado | ✅ `2ee01699eec6402797c24195f323ece9` |
| 21 | Checkout (Pix/cartão, LGPD) | ✅ `d2d054e1dd094e939ec1d2daaf0e5226` |
| 22 | Configurações (meta, notif., LGPD) | ✅ `ec95ae7020c244518c61c191d14afab2` |
| 23 | Busca (indexação PDF, bloqueados) | ✅ `0a58b79441fa4db39a6e36fa5afee706` |

#### Fase C — Painel administrativo (7)

| # | Tela | Status |
|---|---|---|
| 24 | Cursos (tabela, assinatura) | ✅ `98f57cc1b4884daca12a31bf4401e1e4` |
| 25 | Editor de material (upload Bunny) | ✅ `e8d31452f1704b98a94d02f5503b1f4b` |
| 26 | Produtos (mensal/anual, avulsos) | ✅ `6582ab5b1ec048d4961f849907150173` |
| 27 | Usuários (status, bloqueio) | ✅ `94a423f63e64467d9689a53ab76c0b92` |
| 28 | Relatórios (funil, coorte, MRR) | ✅ `b7c3e8f4437d4c7893eb80e1e37755f4` |
| 29 | Editais + aprovação scraping | ✅ `540b798e4fc045cd84eda32acea0e091` |
| 30 | Comentários (moderação) | ✅ `8ec9eb940b2e4016a3f8bdb23c389e83` |

#### Fase D — Fluxo público (2)

| # | Tela | Status |
|---|---|---|
| 31 | Recuperar senha | ✅ `58811f0c174e405ab811daae70e800b5` |
| 32 | Cadastro completo (LGPD) | ✅ `ee57e910d4d84de7aa875668525671cd` |

**Pendências de prototipagem** (iterações futuras): versões mobile das telas desktop · dark mode visual · modais (novo curso, responder comentário) · exportação de tokens → Tailwind.

---

## 12. Modo Escuro (Dark Mode)

- **Status**: [APROVADO] — implementado no Pencil (2026-08-13)
- **Mecanismo**: tokens duais com `theme:{mode:"light"|"dark"}` (definidos nas variáveis do `.pen`) + `theme:{mode:"dark"}` no root de cada tela/componente dark. A alternância é automática: os mesmos `$tokens` resolvem para a paleta correta por herança de theme.

### 12.1 Paleta dark (tokens)

| Token | Light | **Dark** | Notas |
|---|---|---|---|
| `bg` | #F6F8FB | **#0B1220** | fundo de página — azul quase preto, menos cansativo que #000 |
| `surface` | #FFFFFF | **#111A2E** | cards, topbar, sidebar |
| `surface-2` | #EEF2F7 | **#1A2440** | tracks, hover, inputs disabled |
| `text-primary` | #0F172A | **#E2E8F0** | texto principal |
| `text-secondary` | #5B6B83 | **#94A3B8** | texto auxiliar |
| `text-tertiary` | #8A99B0 | **#64748B** | captions, placeholders |
| `primary` | #2563EB | **#3B82F6** | mais claro p/ contraste em fundo escuro |
| `primary-deep` | #1D4ED8 | **#2563EB** | heroes, painéis |
| `primary-soft` | #E8F0FE | **#16284F** | badges azuis, seleções |
| `success` | #16A34A | **#22C55E** | conclusões, acertos |
| `success-soft` | #E9F9EF | **#0F2A1A** | feedback verde |
| `amber` | #D97706 | **#F59E0B** | streak, economia, alertas |
| `amber-soft` | #FEF3C7 | **#3A2A05** | pills âmbar |
| `border` | #E3E8EF | **#1E293B** | bordas, divisórias |
| `danger` | #DC2626 | **#EF4444** | erros, exclusão |

### 12.2 Componentes dark (Pencil)

Biblioteca **"Dark Component Library"** + **"Dark Components 2"** (reutilizáveis, `theme:{mode:"dark"}` no root):

| Componente | ID | Uso |
|---|---|---|
| Button Primary Dark | `xakmv` | CTAs primários dark |
| Button Outline Dark | `zrItb` | ações secundárias |
| Button Ghost Dark | `t5PuEz` | links/ações sutis |
| Button Success/Danger Dark | `T0vxOo` / `TFkSD` | aprovar / excluir |
| Badges Dark (4) | `DjmT7` `vOYSo` `cY1Mq` `TP3gB` | status dark |
| Progress Bar Dark | `MvPyL` | barras de progresso |
| Input Dark | `EtAFf` | campos de formulário |
| Topbar Dark | `geFvn` | topbar desktop |
| Sidebar Aluno Dark | `Axxfb` | sidebar aluno |
| Sidebar Admin Dark | `tCOij` | sidebar admin |
| BottomNav Dark | `kONz2` | bottom-nav mobile |
| Topbar Mobile Dark | `pClkv` | topbar mobile |

### 12.3 Telas dark (63)

Todas as 32 telas desktop e 31 telas mobile têm versão dark (prefixo `D `):

```
D <nome da tela>          → versão dark desktop
D M <nome da tela>        → versão dark mobile
```

Regras aplicadas:
- Fills com cores fixas de marca (gradientes azuis dos heroes) mantêm-se nos dois temas.
- Texto branco sobre botões primários permanece (contraste AA nos dois temas).
- Sidebar admin dark usa tokens (`$surface` #111A2E) em vez do #0F172A fixo do light — mais consistente.
- Streak/âmbar: `$amber-soft` #3A2A05 (fundo escuro quente) + `$amber` #F59E0B (texto).
- Alternância de tema: trocar `theme:{mode}` no root de uma tela light→dark (ou usar os componentes dark) — sem alterar nenhum token manualmente.

### 12.4 Acessibilidade (dark)

- Contraste AA verificado nos pares principais: texto #E2E8F0 sobre #0B1220 (16.3:1) · texto secundário #94A3B8 sobre #111A2E (7:1) · primary #3B82F6 sobre #0B1220 (5.6:1).
- `prefers-color-scheme: dark` no código seguirá a mesma paleta (implementação web).

### 12.5 Alternador de tema (toggle — Configurações)

**Decisão (2026-08-13)**: o alternador de tema existe **apenas na página de Configurações → seção "Aparência"**. Não há toggle global espalhado pelas telas (topbar/sidebar/landing) — o tema é definido uma vez e aplicado em toda a plataforma.

**UI (Pencil)** — seção "Aparência" em `Configurações` (light) e `D Configurações` (dark):

| Opção | Ícone | Comportamento |
|---|---|---|
| **Claro** | `sun` | Tema light padrão (radio ativo na tela light) |
| **Escuro** | `moon` | Tema dark (radio ativo na tela dark) |
| **Seguir sistema** | `monitor` | Usa `prefers-color-scheme` do dispositivo |

- Hint exibido: *"O tema escolhido aqui se aplica a toda a plataforma — disponível só nas Configurações."*
- Estados visuais: radio preenchido + borda primária + fundo `$primary-soft` na opção ativa.

**Comportamento no produto (implementação web)**:
1. `users.preferences.theme` = `light | dark | system` (default `system`).
2. Persistência: salvo no banco (perfil) + cookie/localStorage para aplicar antes do first paint (evita flash).
3. Aplicação: classe `dark` no `<html>` quando `theme=dark` ou (`system` + `prefers-color-scheme: dark`).
4. `prefers-color-scheme` dinâmico: listener de mudança quando `theme=system`.
5. Sem controle em outras telas — o aluno muda o tema só em Configurações.

---

## 13. Linguagem Visual Refinada (revisão 2026-08-13)

O primeiro protótipo revelou uma aparência excessivamente próxima de um dashboard SaaS genérico. A direção refinada passa a usar uma linguagem editorial de preparação: o aluno deve enxergar primeiro o próximo passo, depois o contexto e só então os recursos secundários.

### 13.1 Regras de composição

- **Próximo estudo domina a Home**: um único bloco hero mostra aula, progresso, posição de retomada e CTA. Nenhum outro cartão compete visualmente com ele.
- **Cursos são continuidade, não catálogo**: thumbnails com identidade cromática por curso, percentual em destaque e ação "Continuar". Evitar três cartões brancos idênticos lado a lado.
- **Menos caixa sobre caixa**: usar divisórias, linhas de atividade, barras e agrupamento por ritmo; reservar contêineres para ações ou contextos realmente distintos.
- **Azul profundo como base**: azul estrutural para marca e navegação; azul claro apenas para ação ativa. Hero e marca usam profundidade, não blocos azuis repetidos.
- **Âmbar comunica progresso/aprovação**: streak, meta batida, economia e estados de atenção. Não usar âmbar como decoração genérica.
- **Semântica visual separada**: progresso = azul/verde; conteúdo = neutros e ícones; alerta = âmbar; ação = azul profundo; erro destrutivo = vermelho. Cada cor tem função única.

### 13.2 Malha e ritmo

- Desktop: content frame de 1200px, margem externa de 32px, espaçamento base de 8px e gaps principais de 16/24px.
- Mobile: frame de 375px, padding lateral de 16px, gaps de 12/14px, bottom navigation de 64px.
- Grids de 3 itens devem respeitar a equação `3 × largura + 2 × gap <= largura do container`; nenhuma coluna pode depender de overflow.
- Cabeçalhos seguem: eyebrow contextual → título → orientação curta → ação. Não iniciar telas operacionais apenas com um H1 solto.

### 13.3 Padrões compartilhados

| Padrão | Função |
|---|---|
| `Page Header Pattern` | Contextualiza a tela e aponta o próximo passo |
| `Alert Strip Pattern` | Mensagens de trial, scraping, expiração e contexto sem virar modal |
| `Activity Row Pattern` | Atividade recente e ações rápidas em uma linha escaneável |
| `Study Pulse` | Meta diária e ritmo de estudo na navegação lateral |
| `Material Row` | Tipo, título, estado e ação sem empilhar cartões desnecessários |
| `Progress Bar` | Progresso contínuo; o valor percentual sempre acompanha a barra |

### 13.4 Hierarquia por domínio

- **Home**: próximo estudo → meta/streak → cursos → revisão/concursos.
- **Cursos**: continuidade do curso → módulo atual → materiais; bloqueios aparecem como oportunidade, não erro.
- **Simulados**: cronômetro/estado → questão → navegação; no resultado, nota → disciplina → revisão.
- **Banco de erros/Flashcards**: revisão é a ação principal; quantidade pendente e próxima revisão ficam acima da lista.
- **Admin**: pendências operacionais → KPI → ação rápida → análise; não começar por gráficos decorativos.

### 13.5 Propagação

As regras devem existir em tokens e componentes reutilizáveis antes de serem copiadas para telas. Toda alteração de paleta, espaçamento ou hierarquia deve ser validada em pelo menos: Home desktop, Home mobile, Cursos, Simulados e Dashboard admin, nos temas claro e escuro.

---

## 14. Não-objetivos

- ❌ Definir logo/marca final (explorar na prototipagem).
- ❌ Gameficação visual além de streak/meta.
- ❌ Design para mobile nativo (idealização).

---

## 15. Decisões

| Data | Decisão |
|---|---|
| 2026-08-12 | Estilo: sóbrio, confiável, foco no estudo; azul + slate + âmbar |
| 2026-08-12 | Ilustrações flat duotone próprias (sem banco de imagens) |
| 2026-08-12 | Micro-interações discretas; reduced-motion obrigatório |

---

## 16. Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-12 | Versão inicial para aprovação |
| 0.2 | 2026-08-13 | Marca definida: ConcursFoco; prototipagem Stitch: 8 telas de referência geradas (status em §11.1) |
| 0.3 | 2026-08-13 | Prototipagem migrada para Pencil: 63 telas (32 desktop + 31 mobile) + 3 libraries de componentes |
| 0.4 | 2026-08-13 | **Dark mode completo**: 63 telas dark (prefixo `D `) + 15 componentes dark + tokens duais documentados (§12) |
| 0.5 | 2026-08-13 | **Alternador de tema em Configurações** (§12.5): seção Aparência com Claro/Escuro/Seguir sistema — único ponto de controle do tema |
| 0.6 | 2026-08-13 | **Refino visual**: azul profundo, âmbar semântico, malha 8px, padrões compartilhados, Home com próximo estudo dominante e hierarquia operacional por domínio (§13) |
| 0.7 | 2026-08-13 | **APROVADO** pelo usuário (estado atual: prototipagem Pencil completa, dark mode, alternador de tema, refino visual) |
