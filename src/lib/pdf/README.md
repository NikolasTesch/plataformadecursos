# src/lib/pdf — Geração de PDF

## Função

Infraestrutura de geração de PDF server-side para dois usos: certificado de conclusão de curso (US-29, SPEC-aluno.md:61) e impressão em PDF de material `texto`/`resumo` (US-41, SPEC-conteudo.md:62). Nota: o download em lote "Baixar curso (ZIP)" (US-43) usa arquivamento ZIP, não esta pasta — PDF só entra ali como conteúdo convertido (D-A2).

## Arquitetura

- Consumido por `src/services/aluno/` (certificado) e por `src/services/conteudo/` (impressão de material).
- PDFs gerados sob demanda no servidor, sempre com gating avaliado (R12); certificado também passa pela verificação de elegibilidade (100% dos materiais concluídos).
- Certificado: nome do aluno, nome do curso, data de conclusão e código de verificação (UUID curto); regenerável com o mesmo código.
- Impressão (US-41): PDF descartável após o download, sem cache persistente (D-C6); não entra no fluxo de `arquivo_key` (não vira material PDF).
- Download em lote (US-43): geração assíncrona de ZIP com URL assinada de 24h, gating reavaliado no download.

```
services (aluno, conteudo)
        │
        ▼
src/lib/pdf ──► documento PDF sob demanda (com gating)
```

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-13 | Certificado (US-29) gera PDF com código de verificação público e regenerável (SPEC-aluno.md:59-63) |
| 2026-08-13 | D-C6: PDF de impressão (US-41) descartável, sem cache persistente, com gating R12 (SPEC-conteudo.md:62-63) |
| 2026-08-13 | Download em lote (US-43) é ZIP, não PDF — textos/resumos convertidos para PDF/markdown dentro do ZIP (D-A2, SPEC-aluno.md:74) |
| 2026-08-14 | Criação desta pasta `src/lib/pdf/` com README |
| 2026-08-17 | Impressão de materiais `texto`/`resumo` implementada para US-41; certificado permanece no escopo de S3 |

## Informações úteis

- Certificado (US-29): elegibilidade e conteúdo do PDF — [docs/specs/SPEC-aluno.md](docs/specs/SPEC-aluno.md):59-63.
- Impressão em PDF de material (US-41): [docs/specs/SPEC-conteudo.md](docs/specs/SPEC-conteudo.md):61-64.
- Download em lote ZIP (US-43) — arquivamento, não PDF: [docs/specs/SPEC-aluno.md](docs/specs/SPEC-aluno.md):72-77.
- Verificação pública do certificado em `/verificar/{codigo}`: [docs/specs/SPEC-aluno.md](docs/specs/SPEC-aluno.md):62.
- Convenção de `src/lib/` como infra consumida por services: AGENTS.md §4.
