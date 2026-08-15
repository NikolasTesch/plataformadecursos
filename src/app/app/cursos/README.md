# src/app/app/cursos — Lista de Cursos do Aluno

## Função

Rota `/app/cursos`: listagem dos cursos disponíveis para o aluno, com percentual de progresso por curso (SPEC-frontend.md:84, SPEC-aluno.md:33). Cursos sem material publicado ficam ocultos (R5, SPEC-aluno.md:33).

## Arquitetura

```
src/app/app/cursos/
├── README.md          # Este arquivo
├── page.tsx           # Lista de cursos (a criar no S2)
└── [slug]/            # Página do curso (ver README em [slug])
```

Fluxo: a página chama o service de cursos/aluno em `src/services/` para obter a lista de cursos publicados e acessíveis, com o progresso calculado (concluídos ÷ publicados acessíveis, SPEC-aluno.md:50). O gating R5 oculta cursos sem material publicado. Cada card navega para `/app/cursos/{slug}`.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Lista de cursos com % de progresso exibido (SPEC-aluno.md:33,:51) — o aluno vê onde parou em cada curso |
| 2026-08-14 | Cursos sem material publicado ficam ocultos (R5) — não aparecem como "vazios" na lista |

## Informações úteis

- Lista de cursos e progresso: [docs/specs/SPEC-aluno.md](docs/specs/SPEC-aluno.md):32-33,:47-52.
- Rotas de cursos no app-shell: [docs/specs/SPEC-frontend.md](docs/specs/SPEC-frontend.md):84.
- A subrota `[slug]` é a página do curso — ver `[slug]/README.md`.
