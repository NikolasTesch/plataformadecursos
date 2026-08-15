# src/lib/rate-limit — Limitação de Taxa

## Função

Infraestrutura de rate limiting para endpoints sensíveis de autenticação, aplicando a regra A4 da spec de auth: login 5 tentativas/min por IP+email, reenvio de verificação 3/dia por conta e registro 10/hora por IP. Protege contra força bruta e abuso de reenvio sem adicionar lógica de negócio às rotas.

## Arquitetura

Implementado no S1 (todo 9) como **`SlidingWindowLimiter` em memória** (Map com janela deslizante) com clock injetável (`options.now`) — testes determinísticos sem fake timers globais.

- Consumido por `src/services/auth/` (login e registro implementados; reenvio de verificação preparado para S8).
- API mínima por regra: `check(chave)` / `record(chave)` — a chave combina IP e, quando aplicável, email/conta.
- **Semântica record-on-failure (MAJOR-3)**: `check()` priva a janela mas NÃO registra; `record()` só é chamado na falha real (senha errada / usuário inexistente). Login legítimo nunca é penalizado e o `argon2` não roda para tentativas já bloqueadas (check antes do hash).
- Instâncias pré-configuradas exportadas (D24): `loginLimiter` (5/min, chave `${ip}:${email}`) e `registroLimiter` (10/hora, chave ip).
- Quando bloqueado: `retryAfterSeconds = ceil((oldest + windowMs - now) / 1000)`, mínimo 1 — devolvido via `ErroAuth` code `rate_limit` (SPEC-auth.md:38).

```
routes (login, cadastro, verificar-email)
        │
        ▼
services/auth ──► src/lib/rate-limit (SlidingWindowLimiter em memória)
```

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-13 | Limites definidos pela regra A4 da `SPEC-auth.md` (aprovada): login 5/min, reenvio 3/dia, registro 10/hora por IP |
| 2026-08-13 | Login conta tentativas por IP+email; bloqueio temporário de 15 min acima de 5 falhas |
| 2026-08-14 | Criação desta pasta `src/lib/rate-limit/` com README (estrutura de pastas) — nenhum código ainda |
| 2026-08-15 | `SlidingWindowLimiter` em memória (Map) com clock injetável — D21 (todo 9) |
| 2026-08-15 | Semântica record-on-failure: `check()` não consome, `record()` só na falha real — D22 (MAJOR-3) |
| 2026-08-15 | `loginLimiter` 5/min (`${ip}:${email}`) e `registroLimiter` 10/h (ip) pré-configurados — D24 |
| 2026-08-15 | **Limitação conhecida**: armazenamento em memória (Map) — contadores resetam a cada reinício do servidor e não escalam multi-instância; Redis fora do escopo do S1 (plano) |

## Informações úteis

- Regra A4 (rate limits): [docs/specs/SPEC-auth.md](docs/specs/SPEC-auth.md):67.
- Comportamento do login (5/min, bloqueio 15 min): [docs/specs/SPEC-auth.md](docs/specs/SPEC-auth.md):38.
- Reenvio de verificação (máx. 3/dia por conta): [docs/specs/SPEC-auth.md](docs/specs/SPEC-auth.md):50.
- Convenção de `src/lib/` como infra consumida por services: AGENTS.md §4.
- Testes: `tests/unit/rate-limit.test.ts` (10 testes, relógio fake via `options.now`).
- Reenvio de verificação (3/dia): constante preparada, **não exportada** ainda — não há consumo até S8 (D24).
