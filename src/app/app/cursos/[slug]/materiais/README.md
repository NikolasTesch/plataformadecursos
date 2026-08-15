# src/app/app/cursos/[slug]/materiais — Lista de Materiais do Módulo

## Função

Rota `/app/cursos/{slug}/materiais`: lista os materiais de um módulo do curso. O breadcrumb segue curso → módulo → material, e a URL limpa aponta para `/app/cursos/{slug}/materiais/{id}` (SPEC-aluno.md:36).

## Arquitetura

```
src/app/app/cursos/[slug]/materiais/
├── README.md          # Este arquivo
├── page.tsx           # Lista de materiais do módulo (a criar no S2)
└── [id]/              # Material individual (leitura imersiva — ver README em [id])
```

Fluxo: a rota recebe `slug` (curso) e um identificador de módulo (query ou segmento); consulta `src/services/` pelos materiais publicados do módulo, já com o status de gating aplicado. Cada material navega para o player de leitura em `[id]`. O tipo de material (pdf/texto/video/questoes) determina como o card se comporta e como o progresso é registrado (conclusão manual ou automática para vídeo ≥95%, SPEC-aluno.md:48-49).

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Segmento intermediário `materiais` entre o curso e o material — mantém a URL limpa e hierárquica (`/app/cursos/{slug}/materiais/{id}`, SPEC-aluno.md:36) |
| 2026-08-14 | Breadcrumb curso → módulo → material guia a navegação nesta rota (SPEC-aluno.md:36) |
| 2026-08-14 | O progresso é calculado por material (concluído/pendente) e agregado no curso — ver SPEC-aluno.md:47-52 |

## Informações úteis

- Navegação e breadcrumb: [docs/specs/SPEC-aluno.md](docs/specs/SPEC-aluno.md):36.
- Regras de progresso (conclusão manual, vídeo ≥95%, denominador só de acessíveis): SPEC-aluno.md:47-52.
- O segmento `[id]` abriga o layout de leitura imersiva — ver `[id]/README.md` e SPEC-frontend.md:104.
