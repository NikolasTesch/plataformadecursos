# src/app/admin/editais — Gestão de editais

## Função

Gestão de editais de concursos (URL `/admin/editais`), de uso exclusivo do admin (US-42). O admin cria e publica editais que estruturam as **trilhas** de estudo (domínio `trilhas`, US-25) e a área pública de concursos. Inclui os marcos de datas previstos no edital, como abertura e fim de inscrições (referenciados como T-3 dias).

## Arquitetura

- Página sob o layout **admin-shell** (SPEC-frontend.md:102).
- Rota fina: `page.tsx` futuro chama o service `src/services/editais` (domínio `editais`, US-42); o mesmo domínio alimenta trilhas em `src/services/trilhas`.
- Edital publicado vira a base da trilha por edital (`app/trilhas/[editalId]`) e da página pública de concurso (`app/concursos/[id]`).

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Rota criada antes do código (estrutura + README), seguindo o contrato do plano de implementação |
| 2026-08-14 | Marcos de datas (ex.: inscrições T-3 dias) são dados do edital geridos aqui, sem hardcode no cliente (SPEC-editais.md:47-48) |

## Informações úteis

- Gestão de editais (US-42): [docs/specs/SPEC-editais.md](docs/specs/SPEC-editais.md):44-45.
- Marcos de datas (abertura/fim de inscrições, T-3 dias): SPEC-editais.md:47-48.
- Trilhas derivadas de edital (US-25): [docs/specs/SPEC-trilhas.md](docs/specs/SPEC-trilhas.md):33-35.
- Slice de implementação: S7/S8 — ver [docs/plano-de-implementacao.md](docs/plano-de-implementacao.md).
