# src/components — Componentes de UI

## Função

Toda a camada de interface do ConcursFoco. A pasta `ui/` guarda a base de componentes **shadcn/ui** (Radix UI); as pastas de área (`landing`, `auth`, `app`, `admin`, `player`) guardam os componentes custom do produto construídos sobre essa base. As pastas de área espelham os layouts definidos em `docs/specs/SPEC-frontend.md` (landing de alta conversão, auth, app-shell, admin-shell, player/leitura).

## Arquitetura

```
src/components/
├── ui/         # Base shadcn/ui (Radix), gerada via shadcn CLI no S1 — sem código agora
├── landing/    # Seções da landing de alta conversão (SPEC-landing.md)
├── auth/       # Forms de login/cadastro (SPEC-frontend.md)
├── app/        # Componentes custom da área do aluno (MaterialCard, BloqueadoCard, QuestaoCard...)
├── admin/      # Admin-shell, sidebar densa e tabelas do painel (SPEC-frontend.md)
└── player/     # PlayerVideo (HLS Bunny), PdfViewer (URL assinada) (SPEC-video, SPEC-conteudo)
```

Fluxo de dependência: componentes de área **compõem** a base `ui/` — nunca o contrário, e nunca estilos ad-hoc fora do design system (princípio F4). Lógica de negócio não vive aqui: componentes chamam rotas finas (`src/app/`) que delegam a `src/services/` (AGENTS.md §6).

Toda a interface segue os princípios F1–F5 de `docs/specs/SPEC-frontend.md`:

| Princípio | Regra |
|---|---|
| F1 | **Mobile-first**: todo layout nasce para mobile e evolui para desktop |
| F2 | **Conteúdo em primeiro plano**: UI discreta; o material de estudo é o protagonista |
| F3 | **Clareza de acesso**: o aluno sempre sabe o que está disponível, concluído ou bloqueado |
| F4 | **Consistência**: componentes do design system, nunca estilos ad-hoc |
| F5 | **Acessibilidade por padrão** (WCAG 2.1 AA): contraste, foco, labels, teclado |

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | UI construída sobre shadcn/ui (Radix) — decisão da spec de frontend aprovada em 2026-08-13 (SPEC-frontend.md §5) |
| 2026-08-14 | Pastas de área espelham os layouts do produto (landing, auth, app, admin, player); `ui/` é a base compartilhada |
| 2026-08-14 | Componentes custom do produto (MaterialCard, BloqueadoCard, etc.) vivem nas pastas de área, **nunca** em `ui/` |

## Informações úteis

- Base de componentes e regras de UI: [docs/specs/SPEC-frontend.md](docs/specs/SPEC-frontend.md):108
- Componentes custom do produto: [docs/specs/SPEC-frontend.md](docs/specs/SPEC-frontend.md):119
- Princípios F1–F5: [docs/specs/SPEC-frontend.md](docs/specs/SPEC-frontend.md):20
- Seções da landing: [docs/specs/SPEC-landing.md](docs/specs/SPEC-landing.md)
- Detalhe da base: [src/components/ui/README.md](src/components/ui/README.md)
- Convenções de código e estrutura: AGENTS.md §4 e §6.
- Armadilha: não rodar `shadcn init` nem criar componentes antes do S1 — esta camada é criada no slice S1 com código de verdade.
