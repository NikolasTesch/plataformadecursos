# src/app/admin/cursos — Gestão de cursos

## Função

CRUD de cursos do ConcursFoco (URL `/admin/cursos`), de uso exclusivo do admin. Um curso é a unidade de ensino: nome (obrigatório), descrição, imagem (máx. 2MB), slug único (gerado do nome, editável) e `incluido_assinatura` (boolean, default false). A rota também gerencia **módulos** (US-04), que organizam os materiais com campo `ordem` reordenável — **implementado no S2 (todo 12)**.

## Arquitetura

- Página sob o layout **admin-shell** (versão mínima do S2 — ver `src/app/admin/README.md`).
- Rotas finas: `parse → service → respond` (AGENTS.md §6) — páginas server montam os dados via serviços (`_dados.ts` compõe `listarCursos` + `listarModulos` + `listarMateriais`); `actions.ts` contém as server actions (requireRole + parse + service + respond) e NENHUMA regra de negócio (C1/C6/ordens vivem em `src/services/conteudo`).
- Fluxo de UI: componentes client finos (`curso-form`, `curso-delete-dialog`, `modules-section`) chamam as server actions; erros `ErroConteudo` viram estado serializável `{ code, mensagem, campo? }` renderizado como alerta.

```
src/app/admin/cursos/
├── README.md                # este arquivo
├── actions.ts               # server actions (curso + módulos) — thin
├── _dados.ts                # montagem de dados server-only (serviços)
├── page.tsx                 # /admin/cursos — listagem + exclusão (C6)
├── curso-delete-dialog.tsx  # client: diálogo digitar-nome (C6)
├── novo/
│   ├── page.tsx             # /admin/cursos/novo
│   └── curso-form.tsx       # client: form criar/editar curso (slug auto+editável)
├── [id]/
│   └── page.tsx             # /admin/cursos/[id] — edição (C1) + módulos
└── modules-section.tsx      # client: módulos (criar/renomear/reordenar/excluir + materiais)
```

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Rota criada antes do código (estrutura + README), seguindo o contrato do plano de implementação |
| 2026-08-14 | Exclusão de curso exige confirmação com digitação do nome; cascata (módulos + materiais) e irreversível (SPEC-conteudo.md:39) |
| 2026-08-15 | S2 todo 12: listagem, form criar/editar (slug bloqueado quando C1 — material publicado), exclusão com diálogo digitar-nome, módulos aninhados com reordenação ↑/↓ (lista completa de ids → `reordenarModulos`), lista rápida de materiais com links para `/admin/materiais` |
| 2026-08-15 | Slug auto no client (`slugificar` em `curso-form.tsx`) é ESPELHO de UX do `gerarSlug` do serviço — o servidor é autoritativo (regex/unicidade/C1) |

## Informações úteis

- Comportamento de cursos e módulos: [docs/specs/SPEC-conteudo.md](docs/specs/SPEC-conteudo.md) §3.1-3.2 (US-03, US-04).
- Slugs: duplicado é erro; imutável após o 1º material publicado (SPEC-conteudo.md:38).
- Reordenação de módulos exige a lista COMPLETA de ids (sem duplicados/estranhos) — validado no serviço antes da transação (decisão D-S2-3b, notepad).
- Seletores estáveis para E2E: `#curso-nome`, `#curso-slug`, `#curso-descricao`, `#curso-assinatura`, `#excluir-curso-nome`, `#modulo-nome`.
- Slice de implementação: S2 — ver [docs/plano-de-implementacao.md](docs/plano-de-implementacao.md).
