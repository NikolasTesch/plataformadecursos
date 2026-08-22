# src/app/verificar — Verificação Pública de Certificados

## Função

Área pública de verificação de certificados de conclusão (US-29). Qualquer pessoa com um código de verificação acessa a rota `/verificar/{codigo}` e confere a autenticidade do certificado: nome do aluno, nome do curso e data de conclusão. Não exige login e não expõe dados sensíveis além do que o próprio certificado declara (SPEC-aluno.md:62).

## Arquitetura

- Segmento dinâmico `[codigo]/` contém um Server Component que valida o código e renderiza o certificado público (ver `src/app/verificar/[codigo]/README.md`).
- Rota pública registrada na tabela de rotas de SPEC-frontend.md:82 (layout minimal, sem app-shell nem admin-shell).
- Não passa pelo proxy de proteção de rotas por role (SPEC-frontend.md:89): o gating aqui é apenas a existência do código e a elegibilidade do certificado.
- Fluxo: `parse (código da URL) → service (busca certificado) → respond (render minimal sem JS)` — rotas finas, AGENTS.md §6.

```
src/app/verificar/
├── README.md          # Este arquivo
└── [codigo]/          # Página pública do certificado (Server Component)
```

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Pasta criada antes do código (estrutura + READMEs); `page.tsx` será criado no slice de certificados |
| 2026-08-14 | Área separada do route group `(auth)`: verificação de certificado é pública e de propósito único, não é fluxo de autenticação |
| 2026-08-18 | S3.4: verificação implementada sem login; PDF ficou fora do slice bounded para priorizar o registro verificável |

## Informações úteis

- Certificados (elegibilidade, código UUID curto, regeneração): [SPEC-aluno.md](docs/specs/SPEC-aluno.md):59-63.
- Rota pública `/verificar/[codigo]` com layout minimal: [SPEC-frontend.md](docs/specs/SPEC-frontend.md):82.
- Acessibilidade: página legível sem JavaScript (Server Component): [SPEC-frontend.md](docs/specs/SPEC-frontend.md):168.
- User story de origem: US-29 (certificados) — [SPEC.md](docs/SPEC.md).
- NÃO confundir com `verificar-email/[token]` (confirmação de e-mail, US-22, área `(auth)`) — ver [SPEC-auth.md](docs/specs/SPEC-auth.md):48-52.
