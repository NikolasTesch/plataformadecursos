# src/app/app/concursos — Concursos Rastreados

## Função

Rota `/app/concursos`: lista de concursos públicos rastreados pelo aluno, com filtros e ordenação (SPEC-frontend.md:85, SPEC-editais.md:44):
- Filtros: **status**, **banca** e **busca** por texto.
- Ordenação por data de inscrição/prova.

## Arquitetura

```
src/app/app/concursos/
├── README.md          # Este arquivo
├── page.tsx           # Lista de concursos + filtros (status/banca/busca) (a criar no S2)
└── [id]/              # Detalhe do concurso (ver README em [id])
```

Fluxo: a página consulta `src/services/editais` pela lista de concursos aprovados (pipeline de scraping → aprovação do admin → visível ao aluno, SPEC-editais.md:39-40). Filtros e busca são aplicados no service; a ordenação segue data de inscrição/prova. Cada concurso navega para o detalhe em `[id]`, onde o aluno pode seguir/deixar de seguir.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Filtros de status, banca e busca na lista (SPEC-editais.md:44) — o aluno encontra o concurso relevante rapidamente |
| 2026-08-14 | Apenas concursos aprovados pelo admin são visíveis aos alunos (controle editorial do pipeline — SPEC-editais.md:38-40) |
| 2026-08-14 | Seguir/deixar de seguir acontece no detalhe (`[id]`), não na lista — a lista foca em filtragem e descoberta |

## Informações úteis

- Lista de concursos do aluno (filtros e ordenação): [docs/specs/SPEC-editais.md](docs/specs/SPEC-editais.md):44.
- Pipeline de captura → deduplicação → aprovação: SPEC-editais.md:38-40.
- Rotas de concursos no app-shell: [docs/specs/SPEC-frontend.md](docs/specs/SPEC-frontend.md):85.
- Alertas de concursos seguidos (inscrições, prova) chegam via notificações — ver `src/app/app/notificacoes/README.md`.
