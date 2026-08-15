# src/app/(auth)/verificar-email — Verificação de Email por Token

## Função

Container da verificação de email por token (US-22, SPEC-auth.md §3.4): a rota dinâmica `/verificar-email/[token]` confirma o email do aluno, remove o badge "não verificado" e habilita as notificações transacionais. A UI oferece o botão "reenviar" (máx. 3 reenvios/dia por conta, regra A4).

## Arquitetura

- Diretório intermediário do segmento dinâmico `[token]`: a rota real é `/verificar-email/[token]` (sem página própria em `verificar-email/`).
- Faz parte do route group `(auth)`: usa o layout auth centralizado (card único, logo, link de volta à landing).
- A página é fina: valida e consome o token via `src/services/auth` (que usa `src/lib/db` para o hash armazenado e `src/lib/rate-limit` para controlar reenvios).

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Diretório intermediário criado implicitamente pelas rotas dinâmicas; README adicionado no ajuste de verificação (todo 19) — AGENTS.md §3 exige README em todo diretório |
| 2026-08-14 | Rota distinta de `/verificar/[codigo]` (certificado público, US-29) — verificação de email não é certificado |

## Informações úteis

- Verificação de email (token 24h 1 uso, reenvio 3/dia, badge e aviso de 90 dias; regras A2 e A4): [SPEC-auth.md](docs/specs/SPEC-auth.md):48-52.
- US-22 na spec master: [SPEC.md](docs/SPEC.md):231-235.
- Documentação detalhada da rota dinâmica: `src/app/(auth)/verificar-email/[token]/README.md`.
- Group de rotas auth e layout auth: [SPEC-frontend.md](docs/specs/SPEC-frontend.md):81.
