# tests/unit — Testes Unitários (Vitest)

## Função

Testes unitários da lógica de negócio com **Vitest**. Cobrem regras e cálculos isolados — em especial o motor de gating (R1–R12) e o progresso do aluno, que são obrigatórios por convenção do projeto.

## Arquitetura

- Os testes importam **`src/services/` diretamente**, sem passar por rotas ou camada HTTP.
- A organização dos arquivos espelha a dos serviços testados (`tests/unit/<dominio>.test.ts`).
- Rodam sem banco real; dependências externas são substituídas por mocks (`vi.mock` de `@/lib/db`, argon2, next-auth).
- Config em `vitest.config.ts` na **raiz** do repositório (node, globals, include `tests/unit`, alias `@` → `./src`).

Suítes existentes (S1, todo 14 — **71 testes verdes**):

```
tests/unit/
├── rate-limit.test.ts              # SlidingWindowLimiter (10) — clock injetável, record-on-failure
├── middleware.test.ts              # proteção de rotas por role, Edge-safe (15)
├── services-auth-registrar.test.ts # US-01 (12) — db mockado, duplicata não hasheia
├── services-auth-login.test.ts     # US-02 (7) — rate-limit first, erro genérico
├── services-auth-bloqueio.test.ts  # US-20/A3 (11) — tokenVersion, self-block, verifica Node
└── auth-config.test.ts             # split-config + authorize + verificar-sessao (16)
```

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Vitest escolhido como runner de testes unitários, com os testes na raiz (`tests/unit/`) |
| 2026-08-15 | Vitest 4.1.10 (devDep) + `vitest.config.ts` na raiz com alias `@`; sem `"type": "module"` no package.json (scaffold CJS, aviso do configLoader é cosmético) — D26 |
| 2026-08-15 | TDD: suites de auth (registrar/login/bloqueio) e auth-config escritas com fase RED real (todo 10-14) |
| 2026-08-19 | S5 adiciona cobertura unitária mínima para callbacks Bunny, HMAC e R11 |
| 2026-08-19 | Revisão S5: cobertura de gating vídeo, upload, assinatura/library e state machine monotônica |
| 2026-08-19 | Cobertura de CAS: precondições de `updateMany`, disputa perdida e publicação concorrente |

## Informações úteis

- Comando: `npm run test` (AGENTS.md §9).
- Testes unitários obrigatórios para o motor de gating e progresso (AGENTS.md §6) — suítes dos domínios entram nos slices correspondentes.
- Cada slice entrega seus testes unitários junto com o código do motor de regra ([docs/plano-de-implementacao.md](docs/plano-de-implementacao.md):104).
- Armadilha: `vi.mock` intercepta `dynamic import()` também (authorize lazy) — não precisa de fallback por fs; `vi.fn<T>` preserva `.mock` (tipar via forma genérica).
- A fatia inicial S5 não inclui E2E nem player/posição; esses comportamentos seguem a SPEC-video.md para slices posteriores.
