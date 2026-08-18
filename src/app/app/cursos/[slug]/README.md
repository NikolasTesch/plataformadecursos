# src/app/app/cursos/[slug] — Página do Curso

## Função

Rota `/app/cursos/{slug}`: página do curso, listando seus módulos ordenados (R6) com os materiais em cada módulo. Cada material aparece com status visual `disponivel` / `concluido` / `bloqueado` / `amostra` (badge, SPEC-aluno.md:34). Material bloqueado exibe apenas título + cadeado + CTA de aquisição, **sem conteúdo** (R12, SPEC-aluno.md:35,:44).

## Arquitetura

```
src/app/app/cursos/[slug]/
├── README.md          # Este arquivo
├── page.tsx           # Página do curso: módulos + materiais (a criar no S2)
└── materiais/         # Lista de materiais de um módulo (ver README em materiais/)
```

Fluxo: o parâmetro `slug` identifica o curso; a página consulta `src/services/` para obter módulos e materiais publicados. O status de cada material vem do motor de gating (SPEC-aluno.md:38-44): `amostra` liberado (R4), assinatura ativa (R2), venda única (R3) ou bloqueado. O bloqueio é decidido no servidor; a UI apenas exibe o card correspondente (MaterialCard) e o BloqueadoCard sem conteúdo.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | MaterialCard com status `disponivel`/`concluido`/`bloqueado`/`amostra` (SPEC-aluno.md:34) — badge é a fonte de verdade visual do acesso |
| 2026-08-14 | BloqueadoCard exibido **sem conteúdo** (nem PDF, texto, vídeo ou gabarito) — R12; o CTA "Assinar"/"Comprar" aponta para o produto existente (SPEC-aluno.md:35) |
| 2026-08-14 | Módulos ordenados conforme R6 (SPEC-aluno.md:34) |
| 2026-08-18 | S3.4: quando AL1 chega a 100%, ação mínima emite certificado idempotente e redireciona para a verificação pública; PDF ficou fora do bounded slice |
| 2026-08-18 | S3.5: consultas de entitlements e transformação de status/gating movidas para `services/aluno/navegacao`; a rota permanece parse → service → render |

## Informações úteis

- Navegação curso → módulo → material e status dos materiais: [docs/specs/SPEC-aluno.md](docs/specs/SPEC-aluno.md):33-36.
- Motor de gating (amostra/assinatura/venda única/bloqueado): SPEC-aluno.md:38-44; regras R1–R12 em [docs/SPEC.md](docs/SPEC.md).
- Rotas de cursos no app-shell: [docs/specs/SPEC-frontend.md](docs/specs/SPEC-frontend.md):84.
- O `slug` vem do banco (tabela de cursos, inglês snake_case) e é o mesmo usado na URL limpa dos materiais.
