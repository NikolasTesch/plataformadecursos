# components/app — Componentes da Área do Aluno

## Função

Componentes custom da área do aluno (`/app/*`): o **app-shell** (layout de navegação) e os **cards de dados do produto** — MaterialCard, BloqueadoCard, QuestaoCard, StreakBadge, TrilhaCard, FlashcardCard, NotificacaoItem e ConcursoCard. Todos são construídos sobre a base de `ui/` (shadcn) e refletem o comportamento contratado em [docs/specs/SPEC-frontend.md](docs/specs/SPEC-frontend.md):97-100 e :119-129.

## Arquitetura

**App-shell** (SPEC-frontend.md:97-100), responsivo:
- Desktop: sidebar fixa de 260px com navegação principal (Início, Cursos, Questões, Simulados, Flashcards, Trilhas, Concursos, Anotações), meta de estudo no rodapé da sidebar e streak no topo.
- Mobile: topbar (logo, streak, avatar) + bottom navigation com 5 itens principais e menu "Mais" em sheet.
- Topbar: breadcrumb, busca, notificações com badge de não lidas, avatar/menu.

**Cards de dados** (SPEC-frontend.md:119-129), cada um servindo seu domínio:

| Componente | Função | Domínio |
|---|---|---|
| `MaterialCard` | Card de material com status (disponivel/concluido/bloqueado/amostra) e tipo com ícone | conteúdo |
| `ProgressoToggle` | Toggle manual de conclusão em material já autorizado | progresso (S3.2) |
| `BloqueadoCard` | Material sem acesso: cadeado + título + CTA "Assinar"/"Comprar" — **nunca expõe conteúdo** | gating (R12) |
| `QuestaoCard`/`QuestaoBloco` | Questão com alternativas, feedback, modos e favoritar | questões |
| `StreakBadge` | N dias de sequência + barra de meta diária | engajamento |
| `TrilhaCard` | Progresso por disciplina | trilhas |
| `FlashcardCard` | Frente/verso com autoavaliação | flashcards |
| `NotificacaoItem` | Item da central de notificações | notificações |
| `ConcursoCard` | Concurso rastreado com datas e ação "seguir" | editais |

Os cards renderizam apenas o que o gating autorizou: `BloqueadoCard` substitui qualquer conteúdo não liberado (R12), e os demais podem variar de estado conforme o entitlement do aluno.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Pasta criada; componentes de aluno separados de `ui/` (base) e de `player/` (reprodução de conteúdo) |
| 2026-08-14 | Estados de UI obrigatórios (SPEC-frontend §6 — loading, empty, erro) valem para todos os cards de listagem |
| 2026-08-14 | `BloqueadoCard` é o único ponto de venda dentro do app — decisão de gating R12 da master |

## Informações úteis

- App-shell e cards: [docs/specs/SPEC-frontend.md](docs/specs/SPEC-frontend.md):97-100 e :119-129.
- Gating de conteúdo (regras R1–R12): [docs/SPEC.md](docs/SPEC.md) — o frontend só recebe o que o servidor autoriza.
- Regras de progresso (conclusão, streak, meta diária): [docs/specs/SPEC-engajamento.md](docs/specs/SPEC-engajamento.md) e SPEC-aluno.md.
- Domínios de dados dos cards: SPEC-questoes.md, SPEC-trilhas.md, SPEC-flashcards.md, SPEC-notificacoes.md, SPEC-editais.md.
- Armadilha: nunca renderizar conteúdo de material não liberado dentro de um card (R12) — a ausência de acesso é sempre representada por `BloqueadoCard`.
- O streak usa o componente base `Progress` de `ui/` para a barra de meta diária.
