# src/services — Lógica de Negócio por Domínio

## Função

Lógica de negócio da plataforma ConcursFoco, organizada em uma pasta por domínio. Todo comportamento que decide o que o sistema faz vive aqui, **nunca dentro de rotas** (AGENTS.md §6): route handlers e Server Components são finos (`parse → service → respond`).

São 13 domínios das specs de domínio (SPEC.md §4.1, linhas 58-75, excluindo `frontend`, `landing` e `mobile`) mais **gating** (motor de regras R1-R12) como pasta própria, totalizando 14 pastas de serviço:

```
src/services/
├── auth/          # Autenticação, sessão, usuários (SPEC-auth.md)
├── conteudo/      # Cursos, módulos, materiais, publicação, busca (SPEC-conteudo.md)
├── video/         # Vídeo, Bunny Stream, posição (SPEC-video.md)
├── questoes/      # Questões e simulados cronometrados (SPEC-questoes.md)
├── aluno/         # Área do aluno, progresso, anotações, PWA (SPEC-aluno.md)
├── gating/        # Motor de gating R1-R12, entitlements (SPEC-aluno.md, SPEC.md)
├── pagamentos/    # Produtos, checkout, webhooks Mercado Pago (SPEC-pagamentos.md)
├── trilhas/       # Trilhas de estudo por edital (SPEC-trilhas.md)
├── flashcards/    # Flashcards e revisão espaçada (SPEC-flashcards.md)
├── comunidade/    # Comentários e avaliações (SPEC-comunidade.md)
├── notificacoes/  # Notificações email + in-app (SPEC-notificacoes.md)
├── engajamento/   # Streak e meta diária (SPEC-engajamento.md)
├── editais/       # Rastreamento de editais e concursos (SPEC-editais.md)
└── admin/         # Dashboard e relatórios (SPEC-admin.md)
```

## Arquitetura

- **Rotas chamam services; services chamam lib**: a rota parseia a requisição e chama o service; o service aplica as regras de negócio e usa `src/lib/` (banco, auth, storage, pagamento, rate-limit) como infraestrutura. Rotas nunca chamam `src/lib/` diretamente.
- **Autorização no servidor**: RBAC e gating (R1-R12) são validados dentro dos services a cada requisição de conteúdo, nunca confiando no cliente.
- **Dependência única de documentos**: cada service implementa as US e regras da sua spec de domínio; as pastas aqui espelham os domínios da SPEC master §4.1.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Uma pasta de serviço por domínio da spec, nome em pt-BR (auth, conteudo, video...) — espelha o domínio da spec |
| 2026-08-14 | **gating** é pasta própria (motor R1-R12) mesmo não sendo um domínio da SPEC §4.1 — é transversal a todos os conteúdos |
| 2026-08-14 | **Busca (US-21) vive em `conteudo/`**, não em pasta própria — decisão da revisão de pendências |
| 2026-08-14 | Nomes de pastas, arquivos e funções em pt-BR (serviço); nomes de tabelas em inglês `snake_case` (AGENTS.md §6) |

## Informações úteis

- Regras de código: AGENTS.md §6 (TypeScript estrito, sem `any`; lógica em `services/`; RBAC no servidor; testes Vitest obrigatórios para gating e progresso).
- Índice de domínios e US: [docs/SPEC.md](docs/SPEC.md):58-75.
- Modelo de dados por domínio: [docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.
- Slices de implementação: [docs/plano-de-implementacao.md](docs/plano-de-implementacao.md) (S1-S8).
- Specs por domínio: [docs/specs/](docs/specs/) (SPEC-`<dominio>`.md).
- Antipadrões a evitar: lógica de negócio em route handlers, autorização confiada ao cliente, qualquer `@ts-ignore`/`@ts-expect-error`.
