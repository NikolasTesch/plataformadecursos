# src/app/admin — Painel administrativo

## Função

Raiz da área administrativa do ConcursFoco (URL `/admin`), acessível apenas por usuários com role `admin` (autorização no servidor, R7). Contém o **dashboard básico** (US-19): cards com total de alunos e ativos no mês, receita total (assinatura + avulsa), materiais publicados e alunos novos em 7/30 dias, ranking de materiais mais acessados (top 10, últimos 30 dias) e período selecionável de 7/30/90 dias. Receita vem de fonte interna (`purchases`/`entitlements`), nunca consulta o Mercado Pago em tempo real. As subpastas abrigam cada módulo de gestão: cursos, materiais, produtos, cupons, usuários, relatórios, editais, comentários e landing.

## Arquitetura

- A área usa o layout **admin-shell** (SPEC-frontend.md:102): sidebar densa de 280px em desktop / sheet no mobile, topbar com busca de conteúdo e avatar.
- Rotas são finas (`parse → service → respond`, AGENTS.md §6): cada página futura (`page.tsx`) chamará o service do domínio correspondente em `src/services/`.
- O `layout.tsx` desta pasta (futuro, no S1) aplica o admin-shell a todas as rotas `/admin/*` e valida a role `admin`.
- Admin é otimizado para desktop, mas deve funcionar em mobile (decisão D-F1 da SPEC-frontend).

```
src/app/admin/
├── README.md          # Este arquivo
├── cursos/            # CRUD de cursos
├── materiais/         # CRUD de materiais
├── produtos/          # Produtos comerciais
├── cupons/            # CRUD de cupons (US-45)
├── usuarios/          # Gestão de usuários (US-20)
├── relatorios/        # Relatórios (US-19/31)
├── editais/           # Gestão de editais (US-42)
├── comentarios/       # Moderação de comentários e avaliações (US-48)
└── landing/           # Conteúdo da landing (R-L7)
```

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Rotas dinâmicas da área admin criadas antes do código (estrutura + README por pasta), seguindo o contrato do plano de implementação |
| 2026-08-14 | Avaliações de curso (US-47/48) não têm pasta própria: a moderação vive em `comentarios/` (SPEC-comunidade.md:52) |
| 2026-08-14 | Cupons e conteúdo de landing são rotas desta área adicionadas pela revisão — não constam na tabela de rotas de SPEC-frontend.md:87 (débito de docs, revisão de spec futura) |

## Informações úteis

- Dashboard básico: [docs/specs/SPEC-admin.md](docs/specs/SPEC-admin.md):27-32 (US-19).
- Layout admin-shell: [docs/specs/SPEC-frontend.md](docs/specs/SPEC-frontend.md):86-87 e :102 (sidebar densa 280px desktop / sheet mobile; não mobile-first, mas funcional).
- Slice de implementação: S8 (relatórios) — ver [docs/plano-de-implementacao.md](docs/plano-de-implementacao.md).
- Proteção de rotas por role via middleware: SPEC-frontend.md:89.
