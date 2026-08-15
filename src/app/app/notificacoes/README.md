# src/app/app/notificacoes — Central de Notificações

## Função

Rota `/app/notificacoes`: **central de notificações in-app** do aluno (US-23, SPEC-notificacoes.md:41):
- Lista de notificações com **não-lidas destacadas por badge**.
- Ações: **marcar como lida**, **"marcar todas"**.
- Ordenadas por **data desc**.
- Persistidas no banco.

Recebe eventos transacionais (assinatura expirando, edital seguido: abertura/fim de inscrições e prova próxima, resposta de admin a comentário, verificação de email, revisões pendentes de trilha/flashcards) — SPEC-notificacoes.md:35-37.

## Arquitetura

```
src/app/app/notificacoes/
├── README.md          # Este arquivo
└── page.tsx           # Lista + badge de não lidas + marcar lida/todas (a criar no S2)
```

Fluxo: a página consulta `src/services/notificacoes` pela lista do aluno, ordenada por data desc (SPEC-notificacoes.md:41). O badge de não lidas também alimenta a topbar do app-shell (SPEC-frontend.md:100). Marcar como lida (individual ou "todas") persiste no banco. Desativar email de novo material não desativa o in-app (SPEC-notificacoes.md:48). A origem dos eventos é o motor de notificações dos domínios (editais, pagamentos, comunidade, trilhas).

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Rota própria de central de notificações adicionada pela revisão — não estava na SPEC-frontend desatualizada; referência vigente: SPEC-notificacoes.md:41 (US-23) |
| 2026-08-14 | Ordenação por data desc + badge de não lidas + "marcar todas" (SPEC-notificacoes.md:41) |
| 2026-08-14 | Persistência no banco — notificações in-app são registros, não apenas push momentâneo (SPEC-notificacoes.md:41) |
| 2026-08-14 | Badge de não lidas aparece na topbar do app-shell (SPEC-frontend.md:100), com a central como destino do clique |

## Informações úteis

- Central de notificações (US-23): [docs/specs/SPEC-notificacoes.md](docs/specs/SPEC-notificacoes.md):41.
- Regras de envio, expiração e idempotência: SPEC-notificacoes.md:39-44.
- Preferências de notificação em configurações: ver `src/app/app/configuracoes/README.md`.
- Alertas de concursos seguidos (origem do evento): SPEC-editais.md:46-51.
- Badge de não lidas na topbar: [docs/specs/SPEC-frontend.md](docs/specs/SPEC-frontend.md):100.
