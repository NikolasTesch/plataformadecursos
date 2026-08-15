# sobre — Página Sobre

## Função

Página pública `/sobre` com conteúdo institucional da plataforma (quem somos e proposta de valor para concurseiros). Rota pública com layout landing (SPEC-frontend.md:80).

## Arquitetura

- Rota fina: conteúdo estático renderizado no servidor, sem lógica de negócio.
- Compõe a área pública `(landing)` junto de `precos/`, `cursos/[slug]/` e `checkout/`.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Rota pública criada antes do código (estrutura + README) |

## Informações úteis

- Rotas públicas `/precos` e `/sobre` (layout landing): [SPEC-frontend.md](docs/specs/SPEC-frontend.md):80.
