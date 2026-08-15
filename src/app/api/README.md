# src/app/api — Route Handlers (API)

## Função

Raiz dos route handlers da aplicação (App Router). Nenhuma rota desta pasta renderiza UI: todas respondem JSON para chamadas de API, seguindo o padrão de rota fina `parse → service → respond` (AGENTS.md §6). A pasta fica **flat até o S1** — as sub-rotas planejadas são documentadas abaixo e criadas como subpastas nos slices correspondentes.

## Arquitetura

- **Rotas finas**: cada handler parseia a requisição (params, body, headers, query), chama o service correspondente em `src/services/` e devolve a resposta. Lógica de negócio NUNCA mora aqui (AGENTS.md §6).
- **Autorização no servidor**: handlers validam sessão/roles e regras de gating (R1-R12) a cada requisição; nunca confiam no cliente (AGENTS.md §6).
- **Webhooks**: validação de autenticidade (HMAC para Mercado Pago; assinatura/callback para Bunny) e idempotência antes de qualquer efeito colateral.

```
src/app/api/            # Flat até o S1; subpastas criadas nos slices
├── README.md           # Este arquivo
├── auth/[...nextauth]/ # S1 — rota padrão do Auth.js/NextAuth
├── webhooks/           # S6 (pagamentos) e S5 (vídeo)
├── downloads/          # S3/S7 — download em lote (ZIP)
├── lgpd/               # S8 — exportação/exclusão de dados
└── sync-offline/       # S3/S7 — sincronização de fila offline
```

### Sub-rotas planejadas (enumeradas, NÃO criadas ainda)

| Sub-rota | Finalidade | Slice | Fonte |
|---|---|---|---|
| `auth/[...nextauth]` | Handlers de autenticação (OAuth/session) — convenção padrão do Auth.js/NextAuth v5 | S1 | AGENTS.md §10 |
| `webhooks/pagamentos` | Callbacks do Mercado Pago: validação HMAC, eventos de pagamento/assinatura, idempotência por `payment_id`/`subscription_id` | S6 | SPEC-pagamentos.md:59-67 |
| `webhooks/video` | Callback de transcodificação do Bunny: atualiza estado do material (`processando` → `pronto`/`erro`) | S5 | SPEC-video.md:34 |
| `downloads` | Download em lote de curso (ZIP), URL assinada com validade de 24h, gating na solicitação e no download | S3/S7 | SPEC-aluno.md:76-77 |
| `lgpd` | Exportação (ZIP de dados pessoais, download único em até 24h) e exclusão de conta | S8 | SPEC-auth.md:55-56 |
| `sync-offline` | Sincronização de operações offline enfileiradas (conclusão, anotações, respostas), retry e conflito last-write-wins | S3/S7 | SPEC-aluno.md:68 |

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Pasta `api/` fica **flat até o S1**: as sub-rotas são documentadas no README, mas as subpastas só serão criadas no slice de cada domínio (evita árvore vazia e estrutura morta) |
| 2026-08-14 | Todas as rotas seguem `parse → service → respond`; webhooks validam HMAC/assinatura e idempotência antes de processar |

## Informações úteis

- Padrão de rota fina e autorização no servidor: [AGENTS.md](AGENTS.md) §6.
- Auth.js/NextAuth v5 na fundação (S1): [AGENTS.md](AGENTS.md) §10; rota `[...nextauth]` é convenção do framework, não citação de spec.
- Webhook de pagamentos (HMAC, idempotência P1-P6, retry): [SPEC-pagamentos.md](docs/specs/SPEC-pagamentos.md):59-67.
- Callback de vídeo (transição de estado do material): [SPEC-video.md](docs/specs/SPEC-video.md):30-34.
- Download em lote (ZIP, URL assinada 24h, vídeos fora do ZIP): [SPEC-aluno.md](docs/specs/SPEC-aluno.md):72-77.
- LGPD (exportação e exclusão US-24): [SPEC-auth.md](docs/specs/SPEC-auth.md):54-56.
- Fila offline (retry e last-write-wins): [SPEC-aluno.md](docs/specs/SPEC-aluno.md):65-70.
