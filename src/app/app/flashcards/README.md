# src/app/app/flashcards — Flashcards (Revisão Espaçada SM-2)

## Função

Rota `/app/flashcards`: revisão de flashcards do aluno (SPEC-frontend.md:85, US-26). Utiliza o algoritmo de repetição espaçada **SM-2**: cada card é apresentado conforme sua próxima data de revisão; o aluno avalia a resposta e o algoritmo recalcula o intervalo (SPEC-flashcards.md). Cards podem nascer de questões do banco de erros (integração com `src/app/app/questoes`, SPEC-questoes.md:53).

## Arquitetura

```
src/app/app/flashcards/
├── README.md          # Este arquivo
└── page.tsx           # Fila de revisão + criação/edição de cards (a criar no S2)
```

Fluxo: a página consulta `src/services/flashcards` pela fila de revisões pendentes do dia (SM-2). A revisão do dia apresenta o card, coleta a autoavaliação do aluno (ex.: esqueci/difícil/ok/fácil) e grava a nova programação (próxima revisão + fator de facilidade + repetições). A criação manual de flashcards e a transformação de questões em cards também passam por este service.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Algoritmo SM-2 definido pela spec de flashcards (US-26) — revisões espaçadas por intervalo crescente |
| 2026-08-14 | Flashcards não são criados só manualmente: questão do banco de erros pode ser transformada em flashcard (SPEC-questoes.md:53, integração com `questoes/`) |
| 2026-08-14 | Revisões pendentes de flashcards alimentam notificações/trilhas (badge) — ver SPEC-notificacoes.md:37 |

## Informações úteis

- Domínio de flashcards e US-26: [docs/specs/SPEC-flashcards.md](docs/specs/SPEC-flashcards.md).
- Integração com banco de erros (questão → flashcard): [docs/specs/SPEC-questoes.md](docs/specs/SPEC-questoes.md):53.
- Revisões pendentes como notificação in-app (badge): [docs/specs/SPEC-notificacoes.md](docs/specs/SPEC-notificacoes.md):37.
- Rotas de flashcards no app-shell: [docs/specs/SPEC-frontend.md](docs/specs/SPEC-frontend.md):85.
