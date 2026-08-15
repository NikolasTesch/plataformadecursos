# src/app/admin/cursos — Gestão de cursos

## Função

CRUD de cursos do ConcursFoco (URL `/admin/cursos`), de uso exclusivo do admin. Um curso é a unidade de ensino: nome (obrigatório), descrição, imagem (máx. 2MB), slug único (gerado do nome, editável) e `incluido_assinatura` (boolean, default false). A rota também gerencia **módulos** (US-04), que organizam os materiais com campo `ordem` reordenável.

## Arquitetura

- Página sob o layout **admin-shell** (sidebar densa / sheet mobile — SPEC-frontend.md:102).
- Rota fina: `page.tsx` futuro chama o service `src/services/conteudo` (domínio `conteudo` — US-03..06,09); a lógica de negócio nunca vive no handler.
- Sub-rotas dinâmicas planejadas dentro deste segmento: edição de curso (`/[id]`) e módulos. `page.tsx` não criado nesta fase — apenas estrutura.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Rota criada antes do código (estrutura + README), seguindo o contrato do plano de implementação |
| 2026-08-14 | Exclusão de curso exige confirmação com digitação do nome; cascata (módulos + materiais) e irreversível (SPEC-conteudo.md:39) |

## Informações úteis

- Comportamento de cursos e módulos: [docs/specs/SPEC-conteudo.md](docs/specs/SPEC-conteudo.md) §3.1-3.2 (US-03, US-04).
- Slugs: duplicado é erro; imutável após o 1º material publicado (SPEC-conteudo.md:38).
- Slice de implementação: S2 — ver [docs/plano-de-implementacao.md](docs/plano-de-implementacao.md).
