# src/app/app/trilhas — Trilhas por Edital

## Função

Rota `/app/trilhas`: lista das trilhas de estudo do aluno, organizadas por edital (SPEC-frontend.md:85). Cada edital publicado gera uma trilha; o aluno pode **ativar múltiplas trilhas simultaneamente** (D-T2) — útil para quem estuda para mais de um concurso, com progresso independente por trilha (SPEC-trilhas.md:33).

## Arquitetura

```
src/app/app/trilhas/
├── README.md          # Este arquivo
├── page.tsx           # Lista de trilhas por edital (a criar no S2)
└── [editalId]/        # Plano da trilha (ver README em [editalId])
```

Fluxo: a página consulta `src/services/trilhas` pelas trilhas do aluno (ativas e disponíveis). Cada item indica o edital, o progresso geral e o estado (ativa/disponível para ativação). A ativação acontece a partir da página do edital (SPEC-trilhas.md:33); o detalhe do plano vive em `[editalId]`.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Múltiplas trilhas ativas simultaneamente (D-T2) — progresso independente por trilha (SPEC-trilhas.md:33) |
| 2026-08-14 | A ativação da trilha parte da página do edital publicado; a lista em `/app/trilhas` reflete o estado (SPEC-trilhas.md:33) |
| 2026-08-14 | O segmento dinâmico é por **edital** (`[editalId]`) — a trilha é a materialização do edital no plano de estudos |

## Informações úteis

- Ativação e múltiplas trilhas: [docs/specs/SPEC-trilhas.md](docs/specs/SPEC-trilhas.md):33-37.
- Estrutura do edital (disciplinas, pesos, versões D-T1): SPEC-trilhas.md:28-30.
- Rotas de trilhas no app-shell: [docs/specs/SPEC-frontend.md](docs/specs/SPEC-frontend.md):85.
