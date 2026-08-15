# src/app/admin/produtos — Produtos comerciais

## Função

Gestão dos produtos comerciais do ConcursFoco (URL `/admin/produtos`), de uso exclusivo do admin. Dois modelos de oferta, conforme a monetização mista do PRD: **assinatura** (mensal e anual, com trial) e **venda única** de curso. Aqui o admin define planos/preços e cursos vendidos avulsamente, base para o checkout e para o gating de conteúdo.

## Arquitetura

- Página sob o layout **admin-shell** (SPEC-frontend.md:102).
- Rota fina: `page.tsx` futuro chama o service `src/services/pagamentos`; o catálogo comercial alimenta tanto o checkout (venda única e assinatura) quanto as regras de entitlement em `src/services/gating`.
- Preços e planos refletem na página pública de preços (`/precos`) e na sales page do curso (`/cursos/[slug]`, US-44).

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Rota criada antes do código (estrutura + README), seguindo o contrato do plano de implementação |
| 2026-08-14 | Produtos não consultam o Mercado Pago em tempo real para a UI; o MP é acionado no checkout e por webhooks (SPEC-pagamentos.md:70-73) |

## Informações úteis

- Produtos, assinatura, trial e reembolso: [docs/specs/SPEC-pagamentos.md](docs/specs/SPEC-pagamentos.md):72-75.
- Status de assinatura na UI do aluno (ativa / expirando ≤3 dias / expirada): SPEC-pagamentos.md:72.
- Cupons aplicáveis a produtos (US-46): SPEC-pagamentos.md:75-81.
- Slice de implementação: S6 — ver [docs/plano-de-implementacao.md](docs/plano-de-implementacao.md).
