# src/lib/mail — Envio de Email Transacional

## Função

Infraestrutura de envio de email transacional da plataforma. Cobre os emails obrigatórios do domínio de notificações: verificação de email (US-22), expiração de assinatura (T-3 dias e expirada) e digest diário agrupado de "novos materiais". A regra N1 define o que é transacional (verificação e expiração, sempre enviados) e o que é informativo (novo material, depende de opt-in e de email verificado).

## Arquitetura

- Consumido por `src/services/notificacoes/` (disparos por evento) e por `src/services/auth/` (verificação de email no registro e reenvio).
- Client singleton do provider (Resend/SES, decisão D-N1) instanciado uma vez e compartilhado pelos services.
- Templates por evento (verificação, expiração, digest), com placeholder de conteúdo por template.
- Idempotência de envio por `notification_key` (evento + usuário, regra N2) para evitar spam em reexecução de jobs.
- Falha de envio: retry com backoff (3 tentativas); falha final logada sem bloquear o fluxo.

```
services (auth, notificacoes)
        │
        ▼
src/lib/mail ──► provider transacional (Resend/SES)
```

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-12 | D-N1: provider de email transacional Resend/SES — escolha final em implementação (SPEC-notificacoes.md:86) |
| 2026-08-12 | D-N2: digest diário agrupado de "novos materiais" (1 email "3 novos materiais em 2 cursos" em vez de 3) |
| 2026-08-14 | Criação desta pasta `src/lib/mail/` com README (estrutura de pastas) — nenhum código ainda |

## Informações úteis

- Regras do domínio: **N1 a N4** em [docs/specs/SPEC-notificacoes.md](docs/specs/SPEC-notificacoes.md):54-59 — **não existe regra "N5"** (correção da revisão dupla).
- Decisões do domínio (D-N1, D-N2): [docs/specs/SPEC-notificacoes.md](docs/specs/SPEC-notificacoes.md):82-87.
- Regras de envio e lista de eventos (email transacional vs. digest): [docs/specs/SPEC-notificacoes.md](docs/specs/SPEC-notificacoes.md):30-44.
- Preferências de email do aluno: [docs/specs/SPEC-notificacoes.md](docs/specs/SPEC-notificacoes.md):46-48.
- Convenção de `src/lib/` como infra consumida por services: AGENTS.md §4.
