# src/app/admin — Painel administrativo

## Função

Raiz da área administrativa do ConcursFoco (URL `/admin`), acessível apenas por usuários com role `admin` (autorização no servidor, R7). Contém o **dashboard básico** (US-19): cards com total de alunos e ativos no mês, receita total (assinatura + avulsa), materiais publicados e alunos novos em 7/30 dias, ranking de materiais mais acessados (top 10, últimos 30 dias) e período selecionável de 7/30/90 dias. Receita vem de fonte interna (`purchases`/`entitlements`), nunca consulta o Mercado Pago em tempo real. As subpastas abrigam cada módulo de gestão: cursos, materiais, produtos, cupons, usuários, relatórios, editais, comentários e landing.

## Arquitetura

- A área usa o layout **admin-shell** (SPEC-frontend.md:102). **S2 (todo 12)**: `layout.tsx` implementado na versão mínima — valida `requireRole('admin')` no servidor (defesa em profundidade além do proxy) e navegação top-level para `/admin/cursos`; a sidebar densa de 280px/sheet mobile (SPEC-frontend.md:102) fica para o slice de frontend.
- Rotas são finas (`parse → service → respond`, AGENTS.md §6): cada página (`page.tsx`) chama o service do domínio correspondente em `src/services/`; `actions.ts` por sub-área contém as server actions (requireRole + parse + service + respond).
- **S2 (todo 12) implementado**: `cursos/` (listagem + CRUD + exclusão com digitação do nome C6 + módulos aninhados com reordenação) e `materiais/` (formulário por tipo, publicar/despublicar, presigned upload de PDF com stub funcional em dev). Demais subpastas seguem planejadas.

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
| 2026-08-15 | S2 todo 12: `layout.tsx` (admin-shell mínimo + requireRole) e rotas `cursos/` + `materiais/` implementadas — ver READMEs das subpastas |

## Informações úteis

- Dashboard básico: [docs/specs/SPEC-admin.md](docs/specs/SPEC-admin.md):27-32 (US-19).
- Layout admin-shell: [docs/specs/SPEC-frontend.md](docs/specs/SPEC-frontend.md):86-87 e :102 (sidebar densa 280px desktop / sheet mobile; não mobile-first, mas funcional).
- Slice de implementação: S8 (relatórios) — ver [docs/plano-de-implementacao.md](docs/plano-de-implementacao.md).
- Proteção de rotas por role via proxy: SPEC-frontend.md:89.
