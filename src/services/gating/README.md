# src/services/gating — Motor de Acesso (Regras R1–R12)

## Função

Motor de acesso a conteúdo do ConcursFoco. Decide, a cada requisição de conteúdo, se um aluno pode ver um material (R7) e, em caso de bloqueio, **nunca** envia o conteúdo ao cliente (R12). É a autorização de conteúdo avaliada **no servidor**, transversal a todos os domínios (conteudo, video, questoes, aluno, trilhas).

Fonte de verdade: tabela de regras R1–R12 em [docs/SPEC.md](docs/SPEC.md):387-400 e fluxo de gating em [docs/specs/SPEC-aluno.md](docs/specs/SPEC-aluno.md):38-45.

## Arquitetura

- **Entrada**: usuário + material (ou curso). Saída: `liberado` ou `bloqueado`, com o motivo.
- **Cadeia de decisão** (SPEC-aluno.md:38-45):
  1. Material `amostra` → liberado (R4).
  2. Curso `incluido_assinatura` + assinatura ativa (`acesso_ate >= now`, R2) → liberado.
  3. `venda_unica` do curso (permanente, R3) → liberado.
  4. Caso contrário → bloqueio.
- **Entitlements**: consulta a tabela `entitlements` (modelo-de-dados.md §2.6) — origem `pagamento`/`trial`/`admin`, `acesso_ate` null = permanente (R3).
- **Bloqueio sem conteúdo**: resposta com status de bloqueio e CTA, sem PDF, texto, link de vídeo ou gabarito (R12).
- **Cache de autorização**: curto (máx. 5 min) permitido; invalidado em despublicação (R5) ou bloqueio de conta.
- **Regras consolidadas** (SPEC.md:387-400):

| # | Regra |
|---|---|
| R1 | Acesso ao material: `assinatura ativa` (curso incluído) **OU** `venda_unica` (curso) **OU** `amostra`. |
| R2 | Assinatura ativa = `acesso_ate >= now` e produto ativo. |
| R3 | Venda única é permanente (sem expiração). |
| R4 | `amostra`: máx. 1 por curso, definida pelo admin, visível sem entitlement. |
| R5 | Rascunho nunca é visível/entregue a alunos. |
| R6 | Ordem de exibição: módulos e materiais por `ordem` crescente. |
| R7 | Gating é avaliado no servidor a cada requisição de conteúdo. |
| R8 | Renovação soma 30 dias ao `acesso_ate` atual (não ao presente). |
| R9 | Compra avulsa duplicada de curso já possuído é bloqueada (US-16). |
| R10 | Exclusão de conta: remove dados pessoais; registros de compra são anonimizados (obrigação fiscal). |
| R11 | Material `video` com status `erro` não pode ser publicado. |
| R12 | Material bloqueado nunca envia conteúdo (nem PDF, nem vídeo, nem texto) ao cliente. |

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | **gating é pasta própria**, mesmo não sendo um domínio da SPEC §4.1 — é transversal a todo conteúdo; não viver dentro de `aluno/` |
| 2026-08-12 | Gating avaliado a cada requisição (R7); cache curto de autorização (máx. 5 min) com invalidação em despublicação/bloqueio (SPEC-aluno.md:45) |
| 2026-08-12 | Entitlement concedido somente via webhook validado (P1) — gating nunca confia no estado do checkout na UI |

## Informações úteis

- Regras globais R1–R12 (tabela exata): [docs/SPEC.md](docs/SPEC.md):387-400.
- Fluxo de gating e cache: [docs/specs/SPEC-aluno.md](docs/specs/SPEC-aluno.md):38-45.
- Entitlements: [docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.6 (`entitlements`: origem, `acesso_ate`).
- Slice: [docs/plano-de-implementacao.md](docs/plano-de-implementacao.md):45-52 (S3 — motor de gating com testes).
- Testes: **unitários Vitest obrigatórios** (AGENTS.md §6) — tabela de casos cobrindo R1–R12 (amostra, assinatura ativa/expirada, venda única, rascunho, bloqueio sem conteúdo). E2E: E2E-1..4, E2E-7.
- Anti-padrão: nunca confiar no cliente para decidir acesso; todo conteúdo passa pelo gating no servidor.
