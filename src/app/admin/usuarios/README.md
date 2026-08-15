# src/app/admin/usuarios — Gestão de usuários

## Função

Gestão de usuários da plataforma (URL `/admin/usuarios`), de uso exclusivo do admin (US-20). O admin lista alunos e pode **bloquear/desbloquear contas**: o bloqueio revoga todas as sessões ativas imediatamente (A3); o desbloqueio não exige nova senha. Também cobre concessão de acesso por admin (entitlement por concessão, que conta como acesso real no gating — D-R1).

## Arquitetura

- Página sob o layout **admin-shell** (SPEC-frontend.md:102).
- Rota fina: `page.tsx` futuro chama o service `src/services/auth` (domínio que inclui US-20); revogação de sessões passa por `src/lib/auth`.
- Bloqueio aplica-se imediatamente: middleware valida a role/status a cada requisição, e sessões ativas são invalidadas no servidor — a UI nunca é a única barreira.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Rota criada antes do código (estrutura + README), seguindo o contrato do plano de implementação |
| 2026-08-14 | Dados de usuário tratados como PII: listagens administrativas não expõem dados sensíveis além do necessário (LGPD — SPEC-auth.md:55) |

## Informações úteis

- Gestão de usuários (US-20): [docs/specs/SPEC-auth.md](docs/specs/SPEC-auth.md):43-45 (bloqueio revoga sessões; desbloqueio sem nova senha).
- Regra A3 (sessões revogáveis): SPEC-auth.md:66.
- Concessão de acesso por admin conta como entitlement (D-R1) — [docs/specs/SPEC-comunidade.md](docs/specs/SPEC-comunidade.md):49 e SPEC.md (R1-R12).
- Slice de implementação: S1 (auth) / S8 (admin) — ver [docs/plano-de-implementacao.md](docs/plano-de-implementacao.md).
