# src/app/(auth) — Route Group de Autenticação

## Função

Route group que agrupa as rotas públicas de autenticação do ConcursFoco: `/login`, `/cadastro` e `/verificar-email/[token]`. Todas compartilham o layout **auth** (SPEC-frontend.md:95): centralizado, card único, logo, link de volta à landing. A área de autenticação é a porta de entrada para a área do aluno (`/app`) e para o painel administrativo (`/admin`).

## Arquitetura

O group não adiciona segmento à URL: `(auth)` existe apenas para organização e compartilhamento de layout. As rotas reais são `/login`, `/cadastro` e `/verificar-email/[token]`.

```
src/app/
└── (auth)/
    ├── README.md                # este arquivo
    ├── layout.tsx               # layout auth centralizado (a criar no S1)
    ├── login/                   # página /login
    ├── cadastro/                # página /cadastro
    └── verificar-email/[token]/ # página /verificar-email/[token]
```

As páginas aqui são finas: parse da entrada → service de autenticação (`src/services/auth`) → resposta. A autorização é validada no servidor (R7) — a UI apenas esconde o que o servidor já nega. Rotas protegidas são interceptadas por middleware em `src/middleware.ts`.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Group criado para layout compartilhado sem prefixo na URL (convenção do App Router, AGENTS.md §4) |
| 2026-08-14 | Rotas de autenticação documentadas antes do código, conforme fluxo SDD (AGENTS.md §2) |
| 2026-08-14 | `verificar-email/[token]` como rota própria, separada do certificado público (`/verificar/[codigo]`) — US-22 não é US-29 |

## Informações úteis

- [docs/specs/SPEC-frontend.md](docs/specs/SPEC-frontend.md) §4.2 — layout auth (centralizado, card único) e tabela de rotas (§4.1, linha 81)
- [docs/specs/SPEC-auth.md](docs/specs/SPEC-auth.md) — registro (US-01, §3.1), login e sessão (US-02, §3.2), verificação de email (US-22, §3.4), regras A1–A5
- [docs/SPEC.md](docs/SPEC.md) — US-22 (verificação de email) na spec master
- [docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.1 — tabelas do domínio de autenticação
- [docs/plano-de-implementacao.md](docs/plano-de-implementacao.md) — auth implementada nos slices S1 e S8
- [AGENTS.md](AGENTS.md) §6 — rotas finas, lógica de negócio em `src/services/`, autorização no servidor
