# prisma — Schema e Migrations

## Função

Mantém o schema do banco de dados (Prisma) e as migrations que versionam sua evolução. O schema declarativo é a fonte das tabelas PostgreSQL; as migrations aplicam cada mudança de forma incremental nos ambientes de desenvolvimento e produção.

## Arquitetura

```
prisma/
├── README.md        # Este arquivo
├── schema.prisma    # Declaração completa do banco (a criar no S1)
└── migrations/      # Migrations geradas pela tooling do Prisma (a criar no S1)
```

- `schema.prisma` vive na raiz da pasta.
- `migrations/` é **auto-gerada pela tooling do Prisma** (`prisma migrate dev`) — nunca criar arquivos de migration à mão.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Pasta flat: `schema.prisma` na raiz, sem subpastas por domínio |
| 2026-08-14 | Nomes de tabelas em inglês, snake_case ([docs/modelo-de-dados.md](docs/modelo-de-dados.md):8, AGENTS.md §6) |

## Informações úteis

- [docs/modelo-de-dados.md](docs/modelo-de-dados.md) é a fonte do schema — o `schema.prisma` do S1 deve espelhar o modelo consolidado (IDs UUID v7, timestamps UTC).
- Convenções de código e banco: AGENTS.md §6.
- Migrations são criadas **por slice**, nunca acumuladas em uma mega-migration (docs/plano-de-implementacao.md:105).
- Banco de desenvolvimento: PostgreSQL via Docker, configurado no S1 — Fundação (docs/plano-de-implementacao.md:30).
- Comando de referência (a definir no S1): `npx prisma migrate dev`.
