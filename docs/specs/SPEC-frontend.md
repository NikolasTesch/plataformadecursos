# SPEC-FRONTEND — Design System e Experiência de Interface

- **Versão**: 0.2
- **Data**: 2026-08-13
- **Status**: [APROVADO — 2026-08-13]
- **Domínio master**: transversal — aplica-se a todas as US (01–43). Define **como a UI se apresenta**, não o comportamento funcional (que permanece nas specs de domínio).

---

## 1. Objetivo

Definir o design system e a estrutura de interface da plataforma: tokens visuais, estrutura de rotas e layouts, componentes base, estados de UI, responsividade e acessibilidade. Serve de contrato visual para toda a implementação frontend (Next.js App Router + Tailwind v4 + shadcn/ui).

---

## 2. Princípios de Design

| # | Princípio |
|---|---|
| F1 | **Mobile-first**: o concurseiro estuda pelo celular (PRD §3.1). Todo layout nasce para mobile e evolui para desktop. |
| F2 | **Conteúdo em primeiro plano**: UI discreta; material de estudo é o protagonista. |
| F3 | **Clareza de acesso**: aluno sempre sabe o que está disponível, concluído ou bloqueado (sem ambiguidade). |
| F4 | **Consistência**: componentes do design system, nunca estilos ad-hoc. |
| F5 | **Acessibilidade por padrão** (WCAG 2.1 AA): contraste, foco, labels, teclado. |

---

## 3. Design Tokens

### 3.1 Cores (CSS variables — padrão shadcn/ui, com modo dark)

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `background` | #FFFFFF | #0B1220 | fundo de página |
| `foreground` | #0F172A | #E2E8F0 | texto principal |
| `card` / `card-foreground` | #FFFFFF / #0F172A | #111A2E / #E2E8F0 | cartões |
| `primary` / `primary-foreground` | #2563EB / #FFFFFF | #3B82F6 / #0B1220 | ações principais, links, CTAs |
| `secondary` / `secondary-foreground` | #F1F5F9 / #0F172A | #1E293B / #E2E8F0 | ações secundárias |
| `muted` / `muted-foreground` | #F1F5F9 / #64748B | #1E293B / #94A3B8 | texto secundário, placeholders |
| `accent` / `accent-foreground` | #FEF3C7 / #92400E | #451A03 / #FDE68A | streak, destaques de recompensa |
| `destructive` | #DC2626 | #EF4444 | erros, exclusão |
| `success` | #16A34A | #22C55E | acertos, concluído |
| `warning` | #D97706 | #F59E0B | expiração de assinatura, avisos |
| `border` | #E2E8F0 | #1E293B | bordas, divisórias |
| `input` | #E2E8F0 | #1E293B | bordas de inputs |
| `ring` | #2563EB | #3B82F6 | foco visível |

Paleta neutra: **slate** (cinza-azulado — leitura prolongada). Primária: **azul edtech** (#2563EB). Contraste AA garantido nos pares acima.

### 3.2 Tipografia — **Inter** (via `next/font`)

| Nível | Tamanho | Peso | Uso |
|---|---|---|---|
| display | 36px / 2.25rem | 700 | landing hero |
| h1 | 30px / 1.875rem | 700 | cabeçalho de página |
| h2 | 24px / 1.5rem | 600 | seções |
| h3 | 20px / 1.25rem | 600 | blocos |
| body | 16px / 1rem | 400 | texto padrão |
| body-sm | 14px / 0.875rem | 400 | texto auxiliar |
| caption | 12px / 0.75rem | 500 | labels, badges, metadados |

Leitura de material (texto/resumo): 17px, line-height 1.7, largura máxima de leitura ~72ch.

### 3.3 Espaçamento, raio, sombra

- **Espaçamento**: escala 4px — `1(4) 2(8) 3(12) 4(16) 6(24) 8(32) 12(48) 16(64)`.
- **Raio**: `sm 6px` (inputs, badges) · `md 8px` (botões, cards) · `lg 12px` (cards principais, players) · `xl 16px` (modais, sheets) · `full` (pills, avatares).
- **Sombra**: `sm` (cards estáticos) / `md` (elevados, menus) / `lg` (modais) — suaves, sem sombras fortes.
- **Dark mode**: classe `.dark` no `<html>`; alternância persistida (localStorage) e respeitando `prefers-color-scheme`.

---

## 4. Estrutura de Rotas e Layouts

### 4.1 Rotas (App Router)

| Rota | Acesso | Layout |
|---|---|---|
| `/` | público | landing |
| `/precos`, `/sobre` | público | landing |
| `/login`, `/cadastro` | público | auth (centrado) |
| `/verificar/[codigo]` | público | minimal (certificado) |
| `/app` | aluno | app-shell |
| `/app/cursos` · `/app/cursos/[slug]` · `/app/cursos/[slug]/materiais/[id]` | aluno | app-shell |
| `/app/questoes` (erros/favoritas) · `/app/simulados` · `/app/flashcards` · `/app/trilhas` · `/app/concursos` · `/app/anotacoes` · `/app/configuracoes` | aluno | app-shell |
| `/admin` | admin | admin-shell |
| `/admin/cursos` · `/admin/materiais` · `/admin/produtos` · `/admin/usuarios` · `/admin/relatorios` · `/admin/editais` · `/admin/comentarios` | admin | admin-shell |

Rotas protegidas por middleware (roles) — autorização no servidor (R7), a UI apenas esconde o que o servidor já nega.

### 4.2 Layouts

**Landing** — header fixo (logo, nav, CTA "Entrar"/"Assinar") + hero + seções + footer. Conversão: 1 CTA primário por viewport.

**Auth** — centralizado, card único (login/cadastro), logo, link de volta à landing. Cadastro com consentimento LGPD em destaque.

**App-shell (aluno)**:
- Desktop: sidebar fixa (260px) — navegação principal (Início, Cursos, Questões, Simulados, Flashcards, Trilhas, Concursos, Anotações) + meta de estudo no rodapé da sidebar + streak no topo.
- Mobile: topbar (logo, streak, avatar) + **bottom navigation** (5 itens principais: Início, Cursos, Questões, Mais) + menu "Mais" (sheet) com o restante.
- Topbar: breadcrumb, busca, notificações (badge de não lidas), avatar/menu.

**Admin-shell** — sidebar densa (280px, desktop) / sheet (mobile): Dashboard, Cursos, Materiais, Produtos, Usuários, Relatórios, Editais, Comentários. Topbar com busca de conteúdo e avatar. Admin **não** é mobile-first (uso desktop), mas deve funcionar em mobile (D-F1).

**Player/leitura** — layout imersivo: conteúdo central (72ch), barra lateral contextual (módulos/materiais do curso) em ≥lg, sem sidebar de app.

---

## 5. Componentes Base (shadcn/ui)

| Grupo | Componentes |
|---|---|
| Ação | `Button` (variants: default/secondary/outline/ghost/destructive; sizes sm/default/lg/icon), `DropdownMenu` |
| Formulário | `Input`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`, `Switch`, `Label`, `Form` (react-hook-form + zod) |
| Dados | `Table`, `Badge`, `Progress`, `Avatar`, `Tooltip`, `Pagination` |
| Feedback | `Toast`/`Sonner`, `Skeleton`, `Alert` (error/success/warning), `EmptyState` (custom) |
| Navegação | `Tabs`, `Accordion`, `Sheet` (mobile menu), `Breadcrumb`, `Sidebar` (custom, app/admin) |
| Sobreposição | `Dialog`, `AlertDialog` (confirmações destrutivas — exclusões, US-03) |

**Componentes custom do produto** (construídos sobre shadcn):
- `MaterialCard` — card de material com status (disponivel/concluido/bloqueado/amostra) e tipo (ícone).
- `BloqueadoCard` — material sem acesso: cadeado + título + CTA "Assinar"/"Comprar" (R12 — sem conteúdo).
- `PlayerVideo` — player HLS (Bunny) com controle de velocidade e posição (SPEC-video).
- `PdfViewer` — viewer embutido com URL assinada (SPEC-conteudo).
- `QuestaoCard` — questão com alternativas, feedback, favoritar (SPEC-questoes).
- `StreakBadge` — 🔥 N dias + barra de meta diária (SPEC-engajamento).
- `TrilhaCard` — progresso por disciplina (SPEC-trilhas).
- `FlashcardCard` — frente/verso com autoavaliação (SPEC-flashcards).
- `NotificacaoItem` — item da central de notificações (SPEC-notificacoes).
- `ConcursoCard` — concurso rastreado com datas e "seguir" (SPEC-editais).

---

## 6. Estados de UI (obrigatórios em todas as telas de dados)

| Estado | Padrão |
|---|---|
| Carregando | `Skeleton` (nunca spinner solto; esqueletos com formato do conteúdo) |
| Erro | `Alert` destrutivo + botão "Tentar novamente" (retry idempotente) |
| Vazio | `EmptyState` com ícone, mensagem e CTA (ex.: "Nenhum curso ainda — assine para começar") |
| Bloqueado | `BloqueadoCard` (conteúdo nunca é renderizado — R12) |
| Sucesso | feedback breve (`Toast`), sem páginas de sucesso intermediárias |

Transições: 150–200ms ease-out (hover/focus); respeitar `prefers-reduced-motion`.

---

## 7. Responsividade (mobile-first)

- Breakpoints Tailwind: `sm 640 · md 768 · lg 1024 · xl 1280`.
- Grid de conteúdo: 1 coluna (mobile) → 2 (md) → 3 (lg) para cards de curso/trilha.
- Botões de ação primária: altura mínima 44px em touch.
- Texto: nunca < 12px em produção; inputs com `font-size ≥ 16px` (evita zoom no iOS).
- Player de vídeo: full-width com aspect-ratio 16:9; controles ≥ 32px.

---

## 8. Acessibilidade (WCAG 2.1 AA — padrão mínimo)

| Critério | Padrão |
|---|---|
| Contraste | Pares de tokens validados AA (3:1 UI / 4.5:1 texto) |
| Foco | `ring` visível em todos os interativos; `:focus-visible` |
| Teclado | Navegação completa (menus, dialogs, tabs, player) |
| Formulários | `Label` vinculado a todo input; erro inline com `aria-describedby` |
| Semântica | Landmarks (`header/nav/main/footer`), heading hierarchy, `alt` em imagens |
| Componentes | shadcn/ui (Radix) já entrega ARIA correto — não sobrescrever |
| Motion | `prefers-reduced-motion` desativa animações |
| Certificado | página `/verificar/[codigo]` legível sem JS (Server Component) |

---

## 9. Não-Objetivos (desta spec)

- ❌ Definir comportamento funcional (regras das specs de domínio).
- ❌ Escolher animações complexas, micro-interações ou gameficação visual além do streak.
- ❌ Definir identidade de marca final (logo, nome) — tokens são customizáveis.
- ❌ Componentes para mobile nativo (`SPEC-mobile.md` é idealização).

---

## 10. Decisões do Domínio

| Data | Decisão |
|---|---|
| 2026-08-12 | Tailwind CSS v4 + shadcn/ui (Radix) — stack de UI |
| 2026-08-12 | Tema claro + escuro com persistência e `prefers-color-scheme` |
| 2026-08-12 | Fonte Inter; primária azul #2563EB; neutros slate |
| 2026-08-12 | D-F1: admin-shell responsivo, mas otimizado para desktop |

---

## 11. Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-12 | Versão inicial para aprovação |
| 0.2 | 2026-08-13 | **APROVADO** pelo usuário — alinhado ao `DESIGN.md` v0.7 (tokens duais light/dark, dark mode) |
