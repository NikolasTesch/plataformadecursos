# src/lib/db — Banco de Dados (Prisma)

## Função

Acesso ao PostgreSQL via Prisma. Expõe o **Prisma Client singleton** (uma única instância reutilizada em toda a aplicação, evitando múltiplas conexões em desenvolvimento) e a configuração de conexão usada por `src/services/`. O schema e as migrations vivem na pasta `prisma/` na raiz do projeto.

## Arquitetura

- `src/lib/db` é a única porta de acesso ao banco; `src/services/*` importam o client daqui e nunca criam conexões próprias.
- Schema definido em `prisma/schema.prisma`, baseado em [docs/modelo-de-dados.md](docs/modelo-de-dados.md) (schema consolidado, fonte do Prisma no S1 — decisão D2).
- Migrations versionadas via `npx prisma migrate dev`; produção aplica migrations de forma automatizada no deploy.
- Nomes de tabelas em inglês, `snake_case` (AGENTS.md §6); IDs UUID v7, timestamps UTC.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-12 | PostgreSQL local via Docker para desenvolvimento |
| 2026-08-12 | [docs/modelo-de-dados.md](docs/modelo-de-dados.md) como fonte única do schema Prisma (decisão D2) |
| 2026-08-14 | Criação da estrutura `src/lib/db/` + README |

## Informações úteis

- Modelo de dados completo e decisões de banco: [docs/modelo-de-dados.md](docs/modelo-de-dados.md).
- Convenções (tabelas em inglês `snake_case`, UUID v7, timestamps UTC): AGENTS.md §6 e [docs/modelo-de-dados.md](docs/modelo-de-dados.md):8.
- Comandos: `npx prisma migrate dev` (desenvolvimento), `npx prisma studio` (inspeção).
- Armadilha: nunca importar Prisma direto nas rotas — passar por `src/services/` (rotas finas, AGENTS.md §6).
