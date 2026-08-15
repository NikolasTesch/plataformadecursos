# src/services/admin — Dashboard e Relatórios Administrativos

## Função

Regras de negócio do painel administrativo: dashboard (US-19) e relatórios avançados (US-31) — funil de conversão, retenção por coorte, receita por produto (MRR, receita avulsa, churn de assinaturas) e exportação CSV. Implementa as regras AD1-AD4 da SPEC-admin.md.

## Arquitetura

- Serviços aqui consomem `src/lib/db` (Prisma); as rotas `admin/` (dashboard) e `admin/relatorios` chamam estes serviços; nenhuma métrica é calculada dentro da rota.
- Métricas de receita vêm de registros internos (`purchases`, `entitlements`), nunca de consulta síncrona ao Mercado Pago (AD1).
- Relatórios produzem apenas agregações, sem expor dados pessoais de alunos (AD2); todos os relatórios avançados são exportáveis em CSV (AD3).
- Cálculos são assíncronos com cache/agregação: atraso de até 1h é aceitável, não precisam ser tempo real (AD4).
- Fontes de dados relacionadas: `users`/`purchases`/`coupons` (modelo §2.1/§2.6) e `study_activity` (§2.10) para retenção e coorte.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-12 | Métricas de receita dos registros internos, nunca consulta síncrona ao MP (AD1) |
| 2026-08-12 | Relatórios expõem apenas agregações, sem dados pessoais (AD2) |
| 2026-08-12 | Exportação CSV disponível em todos os relatórios avançados (AD3) |
| 2026-08-12 | Cache/agregação permitem atraso de até 1h nos cálculos (AD4; STATUS-APROVACAO.md:34) |
| 2026-08-14 | Pasta `admin` em pt-BR espelha o domínio `SPEC-admin.md`; leituras sobre tabelas em inglês snake_case |

## Informações úteis

- Spec de referência: [docs/specs/SPEC-admin.md](docs/specs/SPEC-admin.md) (US-19, US-31; regras AD1-AD4).
- Slices: S8 — Engajamento & dados ([docs/plano-de-implementacao.md](docs/plano-de-implementacao.md):90-97), incluindo admin avançado (relatórios/funil/coorte/MRR/CSV) e teste unitário de agregações admin + E2E-AD1/AD2.
- Rota de dashboard e relatórios: `admin/` e `admin/relatorios` (SPEC-frontend.md:86-87).
- MRR = receita recorrente mensal; churn = % de assinaturas que não renovou; coorte = % de alunos ativos em D7/D30 por coorte mensal de cadastro (SPEC-admin.md:36-38).
