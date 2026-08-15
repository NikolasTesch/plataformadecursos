# src/app/app/anotacoes — Anotações do Aluno

## Função

Rota `/app/anotacoes`: listagem "Minhas anotações" do aluno (US-15, SPEC-aluno.md:54-57):
- Anotações por material: texto livre com máximo de **10.000 caracteres**.
- Criadas, atualizadas e excluídas pelo próprio aluno.
- Listagem com busca por texto.
- **Privadas**: nunca expostas a admin/outros alunos; incluídas na exportação LGPD (US-24).

## Arquitetura

```
src/app/app/anotacoes/
├── README.md          # Este arquivo
└── page.tsx           # Listagem + busca + CRUD de anotações (a criar no S2)
```

Fluxo: a página consulta `src/services/aluno` (domínio anotações) pelas anotações do aluno autenticado, com busca por texto. A edição/inserção também acontece no contexto de leitura do material (`cursos/[slug]/materiais/[id]`); esta rota agrega tudo em um só lugar. O limite de 10.000 caracteres é validado no servidor. Inclusão na exportação LGPD é garantida pelo service de exportação (SPEC-auth.md:55).

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Rota agregadora "Minhas anotações" com busca por texto (SPEC-aluno.md:56) — a criação por material vive no player, mas a gestão centralizada fica aqui |
| 2026-08-14 | Anotações privadas por padrão: nunca expostas a admin/outros alunos (SPEC-aluno.md:57) |
| 2026-08-14 | Limite de 10.000 caracteres por anotação (SPEC-aluno.md:55), validado no servidor |
| 2026-08-14 | Anotações entram na exportação LGPD (US-24, SPEC-auth.md:55) |

## Informações úteis

- Anotações (US-15): [docs/specs/SPEC-aluno.md](docs/specs/SPEC-aluno.md):54-57.
- Exportação LGPD (US-24): [docs/specs/SPEC-auth.md](docs/specs/SPEC-auth.md):54-56.
- Criação/edição de anotação no contexto de leitura: ver `cursos/[slug]/materiais/[id]/README.md`.
