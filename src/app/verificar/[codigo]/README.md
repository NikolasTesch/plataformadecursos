# src/app/verificar/[codigo] — Certificado Público

## Função

Página pública que exibe um certificado de conclusão a partir do código na URL (`/verificar/{codigo}`, US-29). Renderiza apenas os dados declarados no certificado: nome do aluno, nome do curso e data de conclusão. Legível sem JavaScript (Server Component), pois é um documento público de conferência, não uma tela interativa (SPEC-frontend.md:168).

## Arquitetura

- Segmento dinâmico `[codigo]` captura o UUID curto do certificado (SPEC-aluno.md:61).
- Implementado como Server Component: o `page.tsx` deste segmento busca o certificado no servidor e renderiza o conteúdo sem hidratação dependente de JS.
- Layout minimal no segmento (SPEC-frontend.md:82): sem app-shell nem admin-shell; apenas o conteúdo do certificado com visual sóbrio.
- Rotas finas: `parse (código) → service (validação) → respond (render)` — AGENTS.md §6. Lógica de validação e consulta vive em `src/services/`.
- Sem dados sensíveis: a página expõe só nome, curso e data (SPEC-aluno.md:62), nunca e-mail, dados pessoais completos ou compras.

```
src/app/verificar/[codigo]/
├── README.md          # Este arquivo
└── page.tsx           # Server Component (criado no slice de certificados)
```

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Segmento criado antes do código (estrutura + READMEs); `page.tsx` será criado no slice de certificados |
| 2026-08-14 | Server Component obrigatório (sem JS): certificado é documento público de conferência e deve funcionar com JavaScript desabilitado (SPEC-frontend.md:168) |
| 2026-08-18 | S3.4: página consulta somente nome, curso e data; geração/download de PDF ficou explicitamente fora do slice mínimo |

## Informações úteis

- Certificados: elegibilidade em 100% do curso, código UUID curto, dados exibidos (nome+curso+data), regenerável — [SPEC-aluno.md](docs/specs/SPEC-aluno.md):59-63.
- Rota pública `/verificar/[codigo]` com layout minimal: [SPEC-frontend.md](docs/specs/SPEC-frontend.md):82.
- Legibilidade sem JS (Server Component): [SPEC-frontend.md](docs/specs/SPEC-frontend.md):168.
- User story de origem: US-29 (certificados).
- NÃO confundir com `(auth)/verificar-email/[token]` (confirmação de e-mail, US-22) — ver [SPEC-auth.md](docs/specs/SPEC-auth.md):48-52.
- Geração do PDF do certificado (com o código de verificação): [SPEC-aluno.md](docs/specs/SPEC-aluno.md):61; serviço de PDF planejado em `src/lib/pdf`.
