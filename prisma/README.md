# prisma — Schema e Migrations

## Função

Mantém o schema do banco de dados (Prisma) e as migrations que versionam sua evolução. O schema declarativo é a fonte das tabelas PostgreSQL; as migrations aplicam cada mudança de forma incremental nos ambientes de desenvolvimento e produção.

## Arquitetura

```
prisma/
├── README.md            # Este arquivo
├── schema.prisma        # Declaração completa do banco — 30 models, 18 enums (S1)
├── prisma.config.ts     # Config do Prisma 7: datasource + migrations.seed ("tsx prisma/seed.ts")
├── seed.ts              # Seed idempotente: admin + aluno demo (argon2id), upsert com reset
└── migrations/          # Migrations geradas pela tooling do Prisma (20260815133031_init)
```

- `schema.prisma` vive na raiz da pasta; é a fonte declarativa das tabelas PostgreSQL.
- `migrations/` é **auto-gerada pela tooling do Prisma** (`prisma migrate dev`) — nunca criar arquivos de migration à mão.
- No Prisma 7, o seed **não** fica mais no `package.json`: a configuração vive em `prisma.config.ts` (`migrations.seed`), executada por `npm run db:seed`.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Pasta flat: `schema.prisma` na raiz, sem subpastas por domínio |
| 2026-08-14 | Nomes de tabelas em inglês, snake_case ([docs/modelo-de-dados.md](docs/modelo-de-dados.md):8, AGENTS.md §6) |
| 2026-08-15 | Generator Prisma 7 `prisma-client` com output `../src/generated/prisma` + `prisma.config.ts` (D8) — `prisma-client-js` não existe mais no v7 |
| 2026-08-15 | Migration `20260815133031_init` aplicada: 30 tabelas + 18 enums + 22 índices (D8/D9, todo 4) |
| 2026-08-15 | Driver adapter OBRIGATÓRIO no Prisma 7: `@prisma/adapter-pg` + `PrismaPg` no singleton `src/lib/db.ts` (todo 4) |
| 2026-08-15 | Seed config em `prisma.config.ts` (`migrations.seed: "tsx prisma/seed.ts"`), não no package.json (D13, Prisma 7) |
| 2026-08-15 | Seed idempotente (upsert com reset de `bloqueado`/`tokenVersion`) + argon2 nativo; senhas dev `Admin@1234`/`Aluno@1234` (D12–D15) |

## Informações úteis

- [docs/modelo-de-dados.md](docs/modelo-de-dados.md) é a fonte do schema — o `schema.prisma` espelha o modelo consolidado (IDs UUID v4 no S1; UUID v7 registrado como enhancement futuro, D1).
- Convenções de código e banco: AGENTS.md §6.
- Migrations são criadas **por slice**, nunca acumuladas em uma mega-migration (docs/plano-de-implementacao.md:105).
- Banco de desenvolvimento: PostgreSQL 16 via Docker, porta **host 5433** (5432 ocupada por outro projeto) — ver `docker-compose.yml`.
- Comandos: `npx prisma migrate dev` (migrations), `npx prisma generate` (client gerado em `src/generated/prisma`), `npm run db:seed` (seed idempotente).
- Prisma 7: `prisma migrate dev` **não** roda `generate` sozinho — rodar explicitamente após migrar (todo 4).
