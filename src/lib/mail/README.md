# src/lib/mail — Envio de Email Transacional

- **Versão**: 0.3
- **Data**: 2026-08-19

## Função

Infraestrutura de envio de email transacional da plataforma. Cobre os emails obrigatórios do domínio de notificações: verificação de email (US-22), expiração de assinatura (T-3 dias e expirada) e digest diário agrupado de "novos materiais". A regra N1 define o que é transacional (verificação e expiração, sempre enviados) e o que é informativo (novo material, depende de opt-in e de email verificado).

## Arquitetura

- Consumido por `src/services/notificacoes/` (disparos por evento) e por `src/services/auth/` (verificação de email no registro e reenvio).
- Client singleton do provider **Resend** instanciado uma vez e compartilhado
  pelos services; a conta, o domínio e as credenciais ainda precisam ser
  configurados operacionalmente.
- Templates por evento (verificação, expiração, digest), com placeholder de conteúdo por template.
- Idempotência de envio por `notification_key` (evento + usuário, regra N2) para evitar spam em reexecução de jobs.
- Falha de envio: retry com backoff (3 tentativas); falha final logada sem bloquear o fluxo.

```
services (auth, notificacoes)
        │
        ▼
src/lib/mail ──► Resend (provider transacional)
```

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-12 | D-N1: provider transacional ainda pendente naquele momento (SPEC-notificacoes.md:86) |
| 2026-08-12 | D-N2: digest diário agrupado de "novos materiais" (1 email "3 novos materiais em 2 cursos" em vez de 3) |
| 2026-08-14 | Criação desta pasta `src/lib/mail/` com README (estrutura de pastas) — nenhum código ainda |
| 2026-08-19 | Resend escolhido pelo usuário; domínio/remetente, SPF/DKIM/DMARC, ambientes de teste/produção e credenciais permanecem gates operacionais |
| 2026-08-19 | Links relativos para `docs/` corrigidos para partir da raiz do repositório |

## Informações úteis

- Regras do domínio: **N1 a N4** em [docs/specs/SPEC-notificacoes.md](../../../docs/specs/SPEC-notificacoes.md):54-59 — **não existe regra "N5"** (correção da revisão dupla).
- Decisões do domínio (D-N1, D-N2): [docs/specs/SPEC-notificacoes.md](../../../docs/specs/SPEC-notificacoes.md):82-87.
- Regras de envio e lista de eventos (email transacional vs. digest): [docs/specs/SPEC-notificacoes.md](../../../docs/specs/SPEC-notificacoes.md):30-44.
- Preferências de email do aluno: [docs/specs/SPEC-notificacoes.md](../../../docs/specs/SPEC-notificacoes.md):46-48.
- Operação de domínio, remetente e ambientes Resend: [docs/operacoes/README.md](../../../docs/operacoes/README.md).
- Convenção de `src/lib/` como infra consumida por services: AGENTS.md §4.

## Gate operacional antes do uso

- [ ] Confirmar domínio e remetente autorizados no Resend.
- [ ] Validar SPF, DKIM e DMARC do domínio.
- [ ] Separar ambiente/conta de teste do ambiente/conta de produção no Resend.
- [ ] Confirmar que credenciais ficam fora do repositório e que testes não
      enviam mensagens reais indevidamente.
- [ ] Registrar evidência no runbook de operações; este README não contém
      domínios, tokens ou outros segredos.
