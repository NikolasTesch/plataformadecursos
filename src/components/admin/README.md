# components/admin — Componentes do Painel Administrativo

## Função

Componentes do painel administrativo (`/admin/*`): o **admin-shell** (layout de navegação densa) e os componentes de tabela e formulário usados nas telas de gestão (cursos, materiais, produtos, cupons, usuários, relatórios, editais, comentários, landing). Compõem sobre a base de `ui/` (Table, Dialog, AlertDialog, Pagination, Form, Badge) e seguem o layout definido em [docs/specs/SPEC-frontend.md](docs/specs/SPEC-frontend.md):102.

## Arquitetura

**Admin-shell** (SPEC-frontend.md:102):
- Desktop: sidebar densa de 280px com navegação (Dashboard, Cursos, Materiais, Produtos, Usuários, Relatórios, Editais, Comentários) + topbar com busca de conteúdo e avatar.
- Mobile: a mesma navegação em **sheet** — o admin não é mobile-first (uso desktop), mas deve funcionar em mobile (D-F1).

**Telas de dados**: padrão tabela (listagem com filtros e paginação) + formulário de criação/edição em Dialog/Sheet + confirmações destrutivas em AlertDialog. Componentes genéricos de tabela e formulário são compartilhados entre as seções do painel para manter o mesmo padrão de CRUD (mesmo padrão de US-19/US-31, incluindo a gestão de depoimentos e FAQ da landing — R-L7).

Autorização é sempre validada no servidor (RBAC): os componentes apenas exibem as ações que o role do usuário tem permissão de executar, e nenhuma rota de `(auth)`/admin confia no cliente.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Pasta criada; componentes de admin separados de `app/` (aluno) — áreas distintas de produto |
| 2026-08-14 | Admin desktop-first com fallback mobile em sheet (SPEC-frontend.md:102, D-F1) |
| 2026-08-14 | Confirmações destrutivas (exclusões) usam `AlertDialog` (SPEC-frontend.md:117, US-03) |
| 2026-08-19 | S5 UI: erro persistido de transcodificação é exibido no painel de vídeo e o mesmo seletor permite reenviar |

## Informações úteis

- Layout e regras do painel: [docs/specs/SPEC-frontend.md](docs/specs/SPEC-frontend.md):102.
- Regras de negócio administrativas (US-19, US-31, gestão de conteúdo): [docs/specs/SPEC-admin.md](docs/specs/SPEC-admin.md).
- Gestão de conteúdo da landing (depoimentos, FAQ, prova social): [docs/specs/SPEC-landing.md](docs/specs/SPEC-landing.md) R-L7.
- Componentes base usados: [src/components/ui/README.md](src/components/ui/README.md) e SPEC-frontend.md §5.
- Armadilha: nunca habilitar ações no frontend sem a correspondente autorização RBAC no servidor — o cliente não é fonte de verdade para permissões.
