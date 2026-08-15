# src/app/admin/materiais — Gestão de materiais

## Função

CRUD de materiais de estudo (URL `/admin/materiais`), de uso exclusivo do admin. Suporta os tipos `pdf | texto | video | questoes | resumo` (US-05, US-06, US-07, US-08, US-40). Estrutura comum: título (obrigatório), `tipo`, `ordem`, `status` (`rascunho | publicado`), `publicado_em` e `amostra` (boolean, default false).

## Arquitetura

- Página sob o layout **admin-shell** (SPEC-frontend.md:102).
- Rota fina: `page.tsx` futuro chama o service `src/services/conteudo`; upload e geração de URLs assinadas passam por `src/lib/storage` (nunca por handler).
- Validações de negócio ficam no service, incluindo a regra de amostra (R4): **máx. 1 material `amostra` por curso** — criar/alterar uma 2ª amostra retorna erro no servidor.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Rota criada antes do código (estrutura + README), seguindo o contrato do plano de implementação |
| 2026-08-14 | PDF: MIME verificado por magic bytes (não só extensão), máx. 100MB; acesso por URL assinada de 10 min, download direto não exposto (SPEC-conteudo.md:47-50) |

## Informações úteis

- Tipos e estrutura comum de materiais: [docs/specs/SPEC-conteudo.md](docs/specs/SPEC-conteudo.md) §3.3-3.7 (US-05..08, US-40; US-07/08 detalhadas em SPEC-video.md e SPEC-questoes.md).
- Regra de amostra (R4): max. 1 amostra por curso — SPEC-conteudo.md:68 e [docs/SPEC.md](docs/SPEC.md) (regras R1-R12).
- Rascunho/publicado: só materiais `publicado` entram em gating de acesso (R1-R12).
- Slice de implementação: S2 — ver [docs/plano-de-implementacao.md](docs/plano-de-implementacao.md).
