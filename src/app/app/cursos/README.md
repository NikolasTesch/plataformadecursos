# src/app/app/cursos — Lista de Cursos do Aluno

## Função

Rota `/app/cursos`: listagem dos cursos disponíveis para o aluno, com percentual de progresso por curso (SPEC-frontend.md:84, SPEC-aluno.md:33). Cursos sem material publicado ficam ocultos (R5, SPEC-aluno.md:33).

## Arquitetura

```
src/app/app/cursos/
├── README.md          # Este arquivo
├── page.tsx           # Lista de cursos (S2)
└── [slug]/            # Página do curso (ver README em [slug])
```

Fluxo: a página chama o service de cursos/aluno em `src/services/` para obter a lista de cursos publicados. O gating R5 oculta cursos sem material publicado; progresso fica para S3. Cada card navega para `/app/cursos/{slug}`.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Lista de cursos com % de progresso exibido (SPEC-aluno.md:33,:51) — o aluno vê onde parou em cada curso |
| 2026-08-14 | Cursos sem material publicado ficam ocultos (R5) — não aparecem como "vazios" na lista |
| 2026-08-17 | S2 entrega a árvore e os estados de acesso; percentual de progresso será implementado no S3 |

## Informações úteis

- Lista de cursos e progresso: [docs/specs/SPEC-aluno.md](docs/specs/SPEC-aluno.md):32-33,:47-52.
- Rotas de cursos no app-shell: [docs/specs/SPEC-frontend.md](docs/specs/SPEC-frontend.md):84.
- A subrota `[slug]` é a página do curso — ver `[slug]/README.md`.
