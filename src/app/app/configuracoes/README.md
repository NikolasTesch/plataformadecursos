# src/app/app/configuracoes — Configurações do Aluno

## Função

Rota `/app/configuracoes`: configurações de conta e preferências do aluno (SPEC-frontend.md:85):
- **Status da assinatura** (SPEC-pagamentos.md:72): ativa (com data fim), expirando (≤3 dias — gera notificação US-23) ou expirada (CTA renovar).
- **Meta diária de estudo** (esforço diário do aluno, refletida na sidebar e no streak).
- **LGPD (US-24)**: exportação de dados (pacote ZIP JSON com dados pessoais, progresso, anotações, tentativas e compras anonimizadas — disponível em até 24h) e **exclusão de conta** (confirmação digitando "EXCLUIR"; irreversível; compras anonimizadas) — SPEC-auth.md:54-56.
- Preferências de notificação (novo material: email on/off; demais transacionais sempre ligadas) — SPEC-notificacoes.md:47-48.

## Arquitetura

```
src/app/app/configuracoes/
├── README.md          # Este arquivo
└── page.tsx           # Conta, assinatura, meta diária, LGPD, preferências (a criar no S2)
```

Fluxo: a página consome `src/services/` em várias frentes: `auth` (dados de conta, exportação/exclusão LGPD), `pagamentos` (status do entitlement de assinatura), `aluno` (meta diária) e `notificacoes` (preferências). Exportação é processamento assíncrono com download único em até 24h (SPEC-auth.md:55). Exclusão exige confirmação explícita e remove dados pessoais, anotações, progresso e sessões, com compras anonimizadas.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Status da assinatura visível na UI com estados ativa/expirando/expirada (SPEC-pagamentos.md:72) — expirando (≤3 dias) dispara notificação US-23 |
| 2026-08-14 | Exportação LGPD assíncrona: pacote ZIP em até 24h, download único; inclusão de anotações, tentativas e compras (SPEC-auth.md:55) |
| 2026-08-14 | Exclusão de conta exige digitar "EXCLUIR" — confirmação explícita, irreversível (SPEC-auth.md:56) |
| 2026-08-14 | Desativar email de novo material não desativa notificações in-app (SPEC-notificacoes.md:48) |

## Informações úteis

- Exportação e exclusão LGPD (US-24): [docs/specs/SPEC-auth.md](docs/specs/SPEC-auth.md):54-56.
- Ciclo de vida do entitlement e status na UI: [docs/specs/SPEC-pagamentos.md](docs/specs/SPEC-pagamentos.md):69-73.
- Preferências de notificação: [docs/specs/SPEC-notificacoes.md](docs/specs/SPEC-notificacoes.md):47-48.
- Rotas de configurações no app-shell: [docs/specs/SPEC-frontend.md](docs/specs/SPEC-frontend.md):85.
