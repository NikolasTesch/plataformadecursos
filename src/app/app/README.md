# src/app/app — Área do Aluno (pasta literal, URL /app)

## Função

Rotas da área do aluno do ConcursFoco. Esta é uma **pasta literal** (não é route group): o prefixo `/app` faz parte da URL, gerando rotas como `/app/cursos`, `/app/questoes` e `/app/simulados` (SPEC-frontend.md:83-85). É aqui que vive o **app-shell** do aluno (SPEC-frontend.md:97-100) e a home do aluno (US-11, SPEC-frontend.md:83).

## Arquitetura

```
src/app/app/
├── README.md                    # Este arquivo
├── layout.tsx                   # app-shell do aluno (a criar no S2)
├── page.tsx                     # STUB no S1 (todo 13): autentica (auth()) + verificarSessaoValida → placeholder
├── cursos/                      # Lista de cursos do aluno + página do curso + materiais
├── questoes/                    # Blocos de questões (modo estudo/prova), erros, favoritas
├── simulados/                   # Lista + execução de simulados
├── flashcards/                  # Revisão espaçada SM-2
├── trilhas/                     # Trilhas por edital
├── concursos/                   # Concursos rastreados
├── anotacoes/                   # Anotações do aluno (US-15)
├── configuracoes/               # Conta, assinatura, LGPD
└── notificacoes/                # Central de notificações (US-23)
```

Fluxo de dados: as rotas são finas (`parse → service → respond`, AGENTS.md §6); cada página chama o service correspondente em `src/services/` e devolve a UI. A autorização (role aluno) e o gating de conteúdo (regras R1–R12) são avaliados no servidor a cada requisição (SPEC-frontend.md:89, SPEC-aluno.md:38-44).

O **app-shell** (SPEC-frontend.md:97-100):
- Desktop: sidebar fixa de 260px com a navegação principal (Início, Cursos, Questões, Simulados, Flashcards, Trilhas, Concursos, Anotações) + meta de estudo no rodapé da sidebar + streak no topo.
- Mobile: topbar (logo, streak, avatar) + bottom navigation (5 itens principais: Início, Cursos, Questões, Mais) + menu "Mais" (sheet) com o restante.
- Topbar: breadcrumb, busca, notificações (badge de não lidas), avatar/menu.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | `app/` é **pasta literal** (não route group) para gerar URLs `/app/...` — correção de blocker da revisão; o route group não adicionaria o prefixo à URL |
| 2026-08-14 | `layout.tsx` do app-shell vive neste segmento (SPEC-frontend.md:97-100) — todas as rotas do aluno herdam sidebar/topbar/bottom-nav |
| 2026-08-14 | Home do aluno (US-11) mostra cursos com % de progresso; cursos sem material publicado ficam ocultos (R5, SPEC-aluno.md:33) |
| 2026-08-14 | O segmento `materiais/[id]` tem layout próprio de leitura imersiva (player), sem sidebar de app — ver `cursos/[slug]/materiais/[id]/README.md` |
| 2026-08-15 | `page.tsx` stub do S1: `auth()` + `verificarSessaoValida()` (enforcement A3 em Node) antes do placeholder — valida o fluxo protegido E2E-A1; a home real (US-11) e o app-shell (`layout.tsx`) entram no S2 |

## Informações úteis

- Rotas e layouts do app-shell: [docs/specs/SPEC-frontend.md](docs/specs/SPEC-frontend.md):83-85,:97-100,:104.
- Navegação e gating da área do aluno: [docs/specs/SPEC-aluno.md](docs/specs/SPEC-aluno.md):32-44.
- Regras de conteúdo (R1–R12) e US de aluno na spec master: [docs/SPEC.md](docs/SPEC.md).
- Proteção de rota por role (aluno) em `src/middleware.ts`: SPEC-frontend.md:89.
- Armadilha: nomes de rotas em pt-BR (ex.: `/app/questoes`), mas segmentos dinâmicos de dados em inglês no banco (`[slug]`, `[id]`, `[editalId]`).
