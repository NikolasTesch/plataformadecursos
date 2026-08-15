# src/lib/sanitize — Sanitização de HTML

## Função

Infraestrutura de sanitização de HTML para renderização segura de conteúdo gerado por usuários e por admin, protegendo contra XSS. Aplica whitelist de tags e atributos ao material texto (SPEC-conteudo.md:54) e ao texto de comentários e avaliações da comunidade (CO5).

## Arquitetura

- Consumido por `src/services/conteudo/` (renderização de material `texto` e `resumo`) e por `src/services/comunidade/` (renderização de comentários e avaliações).
- Sanitização aplicada sempre na renderização (nunca confiar no HTML armazenado).
- Whitelist de tags e atributos permitidos (headings, listas, negrito/itálico, links, imagens, código — alinhado ao editor rich text da US-06); links recebem `rel="noopener"`.
- Tamanho máximo de texto por origem: 2.000 caracteres para comentário (CO5) e 500 para avaliação (CO8).

```
services (conteudo, comunidade)
        │
        ▼
src/lib/sanitize ──► HTML limpo (whitelist) para renderização
```

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-13 | Conteúdo armazenado como HTML; renderização sanitizada com whitelist de tags/atributos (SPEC-conteudo.md:54) |
| 2026-08-13 | CO5: texto de comentário sanitizado na renderização (SPEC-comunidade.md:66) |
| 2026-08-14 | Criação desta pasta `src/lib/sanitize/` com README (estrutura de pastas) — nenhum código ainda |

## Informações úteis

- Material texto (US-06) e renderização sanitizada: [docs/specs/SPEC-conteudo.md](docs/specs/SPEC-conteudo.md):52-54.
- CO5 (comentários sanitizados): [docs/specs/SPEC-comunidade.md](docs/specs/SPEC-comunidade.md):66.
- CO8 (avaliação: máx. 500 caracteres, sanitizada): [docs/specs/SPEC-comunidade.md](docs/specs/SPEC-comunidade.md):69.
- Convenção de `src/lib/` como infra consumida por services: AGENTS.md §4.
