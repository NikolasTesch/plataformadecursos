# tests/integration — Testes de Integração PostgreSQL Real (S6.1)

## Função

Abriga testes de integração que exercitam o domínio de pagamentos
(`src/services/pagamentos`) **contra um PostgreSQL real**, sem nenhum mock de
banco. O objetivo é provar propriedades de concorrência e invariantes de
persistência que testes unitários com mocks não conseguem cobrir:

- **Retry concorrente limitado a 4** (1 inicial + 3 retries) — o lock `FOR
  UPDATE` no `webhook_events` serializa os incrementos de `tentativas` e o
  `where` condicional (`tentativas < 4`) impede a 5ª tentativa.
- **Renovações simultâneas não perdem período** — o lock `FOR UPDATE` em
  `subscriptions`/`entitlements` força a re-leitura de `acesso_ate` após a
  concessão da primeira, somando 30/365 dias corretamente.
- **Primeira concessão concorrente mantém um único entitlement** — idempotência
  via estado da `purchase` (`pendente` → `aprovado`) sob lock.
- **Registro + aprovação na sequência** concede exatamente 30/365 dias a partir
  de `now` (sem data arbitrária no DTO).
- **Refund recorrente com `subscription_id` divergente** lança `DomainError` e
  não cancela/reembolsa nada.
- **Invariantes de schema**: índice parcial único de venda única aprovada,
  CHECKs (`subscription_periodicidade`, `aprovado_entitlement`,
  `subscription_acesso`) e cascade de `user` para `purchases`/`subscriptions`.

## Arquitetura

```
tests/integration/
├── README.md              # Este arquivo
├── global-setup.ts        # Provisiona o banco de teste (cria + aplica migrations)
└── pagamentos.test.ts     # Suíte S6.1 em PostgreSQL real
```

- Executado por `vitest.integration.config.mts` (raiz), que aponta `include`
  para `tests/integration/**` e NÃO carrega os mocks unitários.
- **Segurança (não toca o banco de aplicação/produção)**: a suíte exige um banco
  de **TESTE isolado**. `vitest.integration.config.mts` exige
  `TEST_DATABASE_URL` e valida que o nome do banco corresponde a
  `^[A-Za-z0-9_]+_test$` **antes de qualquer SQL**; caso contrário falha com
  mensagem clara. O client do serviço (`@/lib/db`, que lê
  `DATABASE_URL`) é redirecionado para esse banco de teste. O próprio arquivo de
  teste também aborta se `DATABASE_URL` não contiver `_test`.
- `global-setup.ts` provisiona o banco de teste: conecta ao catálogo `postgres`
  (nunca ao banco de aplicação), cria o banco `_test` se faltar e roda
  `prisma migrate deploy` **somente nele**. Não há `reset` no banco de aplicação.
- O serviço e os fixtures usam o mesmo `db` (`src/lib/db`), apontado para o banco
  de teste. Sem `vi.mock`.
- **Limpeza total**: cada teste rastreia seus fixtures (usuários, produtos e os
  `recurso_id` dos `webhook_events`) e o `afterEach` os remove — `webhook_events`
  por `recurso_id`, `purchases`/`entitlements` por `user_id` (ordem que respeita
  as FKs/CHECKs), `users` em cascade para `subscriptions`, e `products` por `id`.
  Nada de dados estranhos é apagado e nenhum evento residual permanece.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-19 | Criada pasta de integração separada de `tests/unit` para não poluir a suíte unitária (que usa mocks) e para exigir PostgreSQL real de forma explícita (`npm run test:pg`). |
| 2026-08-19 | `fileParallelism: false` no config de integração: os testes mutam o banco real e cada um limpa seus próprios fixtures; serializar arquivos evita contenção cross-arquivo. |

## Informações úteis

- **Pré-requisito**: `TEST_DATABASE_URL` obrigatória, apontando a um banco de
  teste com nome `^[A-Za-z0-9_]+_test$` (ex.: `concursfoco_test`). O
  `global-setup.ts` cria/aplica migrations somente nesse banco, sem nunca tocar
  o banco de aplicação `concursfoco`. Nunca aponte `TEST_DATABASE_URL` para o
  banco de aplicação/produção.
- **Comando**: `npm run test:pg` (equivalente a
  `vitest run --config vitest.integration.config.mts`).
- Estes testes SÃO mutação real de dados — mas isolada, em banco de teste dedicado
  e revertida por `afterEach`. Não rodar em paralelo com outras suítes que esperem
  o banco limpo sem coordenação.
- Não confundir com `tests/unit/services-pagamentos.test.ts`: aquele valida a
  lógica de domínio com transação fake; este prova locks/constraints no banco
  de verdade.
