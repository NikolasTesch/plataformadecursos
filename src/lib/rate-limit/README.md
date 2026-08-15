# src/lib/rate-limit — Limitação de Taxa

## Função

Infraestrutura de rate limiting para endpoints sensíveis de autenticação, aplicando a regra A4 da spec de auth: login 5 tentativas/min por IP+email, reenvio de verificação 3/dia por conta e registro 10/hora por IP. Protege contra força bruta e abuso de reenvio sem adicionar lógica de negócio às rotas.

## Arquitetura

- Consumido por `src/services/auth/` (login, registro, reenvio de verificação) e por route handlers da área `(auth)`.
- API mínima por regra: `check(chave)` e `record(chave)` — a chave combina IP e, quando aplicável, email/conta.
- Janelas por regra: 1 minuto (login), dia (reenvio de verificação), 1 hora (registro).
- Acima do limite de login: bloqueio temporário de 15 minutos com mensagem "muitas tentativas, tente novamente em 15 minutos" (SPEC-auth.md:38).

```
routes (login, cadastro, verificar-email)
        │
        ▼
services/auth ──► src/lib/rate-limit ──► armazenamento de contadores
```

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-13 | Limites definidos pela regra A4 da `SPEC-auth.md` (aprovada): login 5/min, reenvio 3/dia, registro 10/hora por IP |
| 2026-08-13 | Login conta tentativas por IP+email; bloqueio temporário de 15 min acima de 5 falhas |
| 2026-08-14 | Criação desta pasta `src/lib/rate-limit/` com README (estrutura de pastas) — nenhum código ainda |

## Informações úteis

- Regra A4 (rate limits): [docs/specs/SPEC-auth.md](docs/specs/SPEC-auth.md):67.
- Comportamento do login (5/min, bloqueio 15 min): [docs/specs/SPEC-auth.md](docs/specs/SPEC-auth.md):38.
- Reenvio de verificação (máx. 3/dia por conta): [docs/specs/SPEC-auth.md](docs/specs/SPEC-auth.md):50.
- Convenção de `src/lib/` como infra consumida por services: AGENTS.md §4.
