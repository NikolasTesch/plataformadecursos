# src/app/admin/relatorios — Relatórios administrativos

## Função

Relatórios avançados do ConcursFoco (URL `/admin/relatorios`), de uso exclusivo do admin (US-31, sobre o dashboard da US-19). Entrega: views/tempo por material (acessos únicos, tempo médio, conclusão), **funil de conversão** (visitantes → cadastros → 1º material → compra), **retenção por coorte** (alunos ativos em D7/D30 por coorte mensal), **receita por produto** (MRR, receita avulsa, churn de assinaturas) e **exportação CSV** de todos os relatórios.

## Arquitetura

- Página sob o layout **admin-shell** (SPEC-frontend.md:102).
- Rota fina: `page.tsx` futuro chama o service `src/services/admin`; dados vêm de fonte interna (purchases/entitlements), nunca do Mercado Pago em tempo real.
- Restrições AD1-AD4: dados em memória/agregação com **cache ≤ 1h**; sem exposição de PII de alunos nos relatórios.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Rota criada antes do código (estrutura + README), seguindo o contrato do plano de implementação |
| 2026-08-14 | Agregação em cache (AD1-AD4) evita consultas pesadas por requisição; relatórios nunca expõem PII (SPEC-admin.md:39) |

## Informações úteis

- Relatórios avançados: [docs/specs/SPEC-admin.md](docs/specs/SPEC-admin.md):33-39 (US-31 — views/tempo, funil, coorte, MRR/churn, CSV).
- Dashboard básico (US-19): SPEC-admin.md:27-32.
- Acesso exclusivo role `admin`; autorização no servidor (R7).
- Slice de implementação: S8 — ver [docs/plano-de-implementacao.md](docs/plano-de-implementacao.md).
