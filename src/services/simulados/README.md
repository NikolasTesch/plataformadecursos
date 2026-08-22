# src/services/simulados — Simulados Cronometrados (S7.1)

## Função

Regras de negócio do domínio de simulados cronometrados (US-27): montagem e
publicação pelo admin, início de tentativa persistente pelo aluno, persistência
de respostas, entrega idempotente com nota e histórico cumulativo imutável
(Q2–Q4), e gating por curso reutilizando o motor de gating existente (Q4).
Questões elegíveis são apenas de materiais publicados (Q5). Sem scheduler: o
cronômetro é responsabilidade da UI e chama `entregarTentativa` (server-side)
ao estourar.

## Arquitetura

- `index.ts`: implementa `criarSimulado`, `adicionarQuestoes`, `publicarSimulado`,
  `listarSimulados` (admin) e `iniciarTentativa`, `responderNaTentativa`,
  `entregarTentativa`, `listarTentativas` (aluno). Consome `src/lib/db` (Prisma)
  via interface `DbSimulados` injetável para testes.
- Dados: `simulados` (entidade própria, Q4), `simulado_questions` (vínculo
  questão→simulado, sem sorteio — D-Q2), `simulado_attempts` (tentativa
  persistente: `respostas` Json, `nota`, `status`). Modelo em
  `docs/modelo-de-dados.md`.
- Gating (Q4/B2): `verificarAcessoSimulado` (usuário bloqueado + `podeAcessarCurso`
  do `src/services/gating`) é reavaliado em `iniciarTentativa`,
  `responderNaTentativa`, `entregarTentativa` e `listarTentativas`; a correção
  só é exposta após esse cheque.
- Prazo autoritativo no servidor (B3): `responderNaTentativa` bloqueia resposta
  após `iniciado_em + duracao_minutos`; `entregarTentativa` é sempre segura
  (entrega automática ao estourar — UI apenas chama o server, sem scheduler).
- Atualizações atômicas (B4): `responderNaTentativa` usa lock otimista
  (`update` com `WHERE status='em_andamento' AND respostas=<snapshot>`);
  `entregarTentativa` usa `WHERE status='em_andamento'` para virar `entregue`
  uma única vez — entregas concorrentes são idempotentes e o estado entregue
  não volta.
- Entrega idempotente (Q2/B6): `entregarTentativa` recalcula do conjunto
  imutável de respostas se já entregue; `nota` retornada vem do valor estável
  gravado; omissas contam como erradas (itera sobre `simulado_questions`).
- Erros alimentam o banco de erros (B8): na 1ª entrega, `alimentarBancoDeErros`
  grava em `attempts` (tabela compartilhada com o banco de erros/F3) — idempotente.
- Desempenho por disciplina (B10): `calcularResultado` agrega acertos/total por
  `material_edital.disciplina_id` (sem alteração de schema).

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-19 | Q4/B2: gating por `curso_id` + usuário bloqueado reavaliado em toda operação, reutilizando `podeAcessarCurso`/`avaliarAcessoCurso` (sem material sintético) |
| 2026-08-19 | Q5/B5: `adicionarQuestoes` valida coleção inteira (mesmo curso via módulo e material publicado) ANTES de gravar; ordem global a partir do maior `ordem` existente |
| 2026-08-19 | B6: simulado publicado ou com tentativas é imutável (`adicionarQuestoes` nega); `nota` de tentativa entregue é estável |
| 2026-08-19 | B3: prazo de resposta é do servidor (`iniciado_em + duracao_minutos`); UI não é autoridade |
| 2026-08-19 | B4: atualizações atômicas com lock otimista; entrega concorrente idempotente |
| 2026-08-19 | B8: erros de simulado gravam em `attempts` (banco de erros/F3) na 1ª entrega, idempotente |
| 2026-08-19 | B10: `criarSimulado` valida título/duração; `publicarSimulado` exige ≥1 questão; desempenho por disciplina via `material_edital` |

## Informações úteis

- Spec de referência: [docs/specs/SPEC-questoes.md](docs/specs/SPEC-questoes.md) §3.3 e regras Q2–Q5.
- Slice: S7.1 — Núcleo ([docs/specs/REVISAO-S7-NUCLEO.md](docs/specs/REVISAO-S7-NUCLEO.md)); testes unitários Q2/Q3 + ora-1 (B1–B10).
- Autorização admin (CRUD/montagem/publicação) é feita na rota (RBAC), não no serviço — consistente com `src/services/questoes`.
- `nota` é `Decimal` no schema; o serviço grava/converte `number` (Prisma aceita number para Decimal; leitura usa `Number(nota)`).
- Limitação conhecida (B6): o retorno idempotente usa a `nota` gravada (imutável); os `resultados` por questão são recomputados das `respostas` congeladas. Imutabilidade total dos resultados por questão exigiria coluna `resultado Json` em `simulado_attempts` (snapshot no momento da entrega) — contrato adicional mínimo, fora deste lane.
