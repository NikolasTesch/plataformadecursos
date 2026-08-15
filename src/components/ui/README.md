# src/components/ui — Base de Componentes (shadcn/ui)

## Função

Base de componentes **shadcn/ui** (Radix UI) sobre a qual todos os componentes do produto são construídos. Definida em `docs/specs/SPEC-frontend.md` §5 e gerada via **shadcn CLI no S1** — esta pasta ainda não contém código. Os componentes aqui são a única fonte permitida de primitivas de UI (princípio F4: consistência, sem estilos ad-hoc).

## Arquitetura

Catálogo de componentes base por grupo (SPEC-frontend.md:108-117):

| Grupo | Componentes |
|---|---|
| Ação | `Button` (variants: default/secondary/outline/ghost/destructive; sizes sm/default/lg/icon), `DropdownMenu` |
| Formulário | `Input`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`, `Switch`, `Label`, `Form` (react-hook-form + zod) |
| Dados | `Table`, `Badge`, `Progress`, `Avatar`, `Tooltip`, `Pagination` |
| Feedback | `Toast`/`Sonner`, `Skeleton`, `Alert` (error/success/warning), `EmptyState` (custom) |
| Navegação | `Tabs`, `Accordion`, `Sheet` (menu mobile), `Breadcrumb`, `Sidebar` (custom, app/admin) |
| Sobreposição | `Dialog`, `AlertDialog` (confirmações destrutivas — exclusões, US-03) |

Fluxo de dados: nenhum — são primitivas visuais e de interação. Comportamento (estados, gating, autorização) vive em `src/services/`; rotas finas em `src/app/` (AGENTS.md §6).

**Estados de UI obrigatórios** (qualquer tela que carregue conteúdo deve cobrir os cinco):

| Estado | Componente |
|---|---|
| Carregando | `Skeleton` |
| Erro | `Alert` (error) + retry |
| Vazio | `EmptyState` (custom) |
| Bloqueado | `BloqueadoCard` (regra R12 — sem conteúdo) |
| Sucesso | `Toast`/`Sonner` |

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Base shadcn/ui (Radix) adotada como camada de primitivas — decisão aprovada na spec de frontend (SPEC-frontend.md §5) |
| 2026-08-14 | Componentes gerados via shadcn CLI no S1; nenhum código criado nesta fase (estrutura documentada antes do código) |
| 2026-08-14 | `EmptyState` e `Sidebar` são custom (não existem no shadcn padrão); criados no S1 sobre a mesma base |
| 2026-08-14 | Componentes custom do produto (MaterialCard etc.) vivem nas pastas de área (`landing`, `auth`, `app`, `admin`, `player`), nunca aqui |

## Informações úteis

- Referência completa do catálogo: [docs/specs/SPEC-frontend.md](docs/specs/SPEC-frontend.md):108
- Componentes custom do produto (construídos sobre esta base): [docs/specs/SPEC-frontend.md](docs/specs/SPEC-frontend.md):119
- Regras de gating de conteúdo (R1–R12, base do estado "bloqueado"): [docs/SPEC.md](docs/SPEC.md)
- Design system e tokens light/dark: [docs/DESIGN.md](docs/DESIGN.md):12
- Armadilha: não editar componentes de `ui/` com estilos ad-hoc — mudanças de design system passam por tokens (DESIGN.md) e pela base.
