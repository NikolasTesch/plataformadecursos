# SPEC-ADMIN — Dashboard e Relatórios Administrativos

- **Versão**: 0.1
- **Data**: 2026-08-12
- **Status**: [APROVADO — 2026-08-12]
- **Domínio master**: US-19, US-31 (SPEC master v2.0 §4)

---

## 1. Objetivo

Definir o comportamento do painel administrativo de métricas: dashboard básico (MVP) e relatórios avançados (Fase 2).

---

## 2. User Stories Cobertas

| US | Título | Origem |
|---|---|---|
| US-19 | Admin acompanha estatísticas | Master v1.0 |
| US-31 | Admin avançado: relatórios | Master v2.0 |

---

## 3. Comportamento Detalhado

### 3.1 Dashboard básico (US-19)
- Cards: total de alunos (e ativos no mês), receita total (assinatura + avulsa), materiais publicados, alunos novos (7/30 dias).
- Ranking de materiais mais acessados (top 10, últimos 30 dias).
- Receita: fonte interna (purchases/entitlements), não consulta o MP em tempo real.
- Período selecionável: 7/30/90 dias.

### 3.2 Relatórios avançados (US-31)
- **Views/tempo por material**: acessos únicos, tempo médio, conclusão por material (gráfico).
- **Funil de conversão**: visitantes → cadastros → 1º material → compra (venda única ou assinatura), por período.
- **Retenção por coorte**: % de alunos ativos em D7/D30 por coorte mensal de cadastro.
- **Receita por produto**: MRR (receita recorrente mensal), receita avulsa, churn de assinaturas (% que não renovou).
- **Exportação CSV**: todos os relatórios exportáveis.
- Acesso: somente role `admin`; dados em memória/agregação (não expõem PII de alunos).

---

## 4. Regras Específicas do Domínio

| # | Regra |
|---|---|
| AD1 | Métricas de receita vêm de registros internos (nunca de consulta síncrona ao MP). |
| AD2 | Relatórios não expõem dados pessoais de alunos (apenas agregações). |
| AD3 | Exportação CSV disponível em todos os relatórios avançados. |
| AD4 | Cálculos permitem atraso de até 1h (cache/agregação) — não precisam ser tempo real. |

---

## 5. Exemplos End-to-End

### E2E-AD1 — Funil de conversão
**Given** 1.000 visitantes, 200 cadastros, 80 com 1º material, 20 compras no período
**When** admin abre o relatório de funil
**Then** visualiza 200/1.000 → 80/200 → 20/80 com % em cada etapa

### E2E-AD2 — Churn de assinaturas
**Given** 100 assinantes ativos em 01/07; 12 não renovaram em 01/08
**When** admin abre receita
**Then** churn mensal = 12%

---

## 6. Decisões do Domínio

| Data | Decisão |
|---|---|
| 2026-08-12 | Relatórios com agregação em cache (atraso ≤1h), sem consulta ao MP em tempo real |

---

## 7. Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-12 | Versão inicial para aprovação |
| 0.1 | 2026-08-12 | **APROVADA** — revisão de aplicabilidade concluída |
