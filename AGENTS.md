# AGENTS.md — ConcursFoco (Plataforma de Estudos para Concursos)

> **Princípio principal de trabalho: DOCUMENTAÇÃO.**
> Nenhuma linha de código existe sem documentação que a anteceda.

---

## 1. MISSÃO DO PROJETO

**ConcursFoco** — plataforma web de ambiente de estudo para concursos públicos:
- **Painel administrativo**: publicação de conteúdo (PDF, texto, vídeo, questões, resumos) e gestão de produtos/usuários.
- **Área do aluno**: acesso a materiais, progresso, anotações, questões, trilhas, simulados, flashcards e notificações.
- **Monetização mista**: assinatura (mensal/anual, com trial) + venda única via Mercado Pago (cartão e Pix).

Stack: Next.js (App Router) + TypeScript · PostgreSQL · Prisma · Cloudflare R2 · Bunny Stream · Mercado Pago · Vercel · Vitest · Playwright.

---

## 2. FLUXO DE TRABALHO (SDD — Spec Driven Development)

O ciclo é **obrigatório e sequencial**. Nenhuma fase é pulada:

```
① ESPECIFICAR → ② APROVAR → ③ IMPLEMENTAR → ④ REVISAR
```

1. **ESPECIFICAR**: toda mudança/feature começa como documento (PRD para produto, SPEC para comportamento). A spec descreve **o que** o sistema faz — nunca **como**.
2. **APROVAR**: a spec só vira código após aprovação explícita do usuário. Nenhuma feature fora da spec vigente é implementada.
3. **IMPLEMENTAR**: código + testes (unitários e E2E) por slice, verificando cada slice contra a spec.
4. **REVISAR**: revisão contra a spec; mudanças de escopo entram como **revisão de spec** (volta ao passo ①), nunca como atalho no código.

Regras do fluxo:
- Mudança de escopo = alterar a spec primeiro, depois aprovar, só então codar.
- Cada slice de implementação termina funcional e verificável.
- Documentos são versionados e têm histórico (tabela Versão/Data/Mudança).

---

## 3. REGRA OBRIGATÓRIA: README.md EM TODA PASTA

**Toda pasta criada no projeto DEVE conter um `README.md`** descrevendo:

| Seção | Conteúdo |
|---|---|
| **Função** | Para que serve esta pasta / o que vive aqui |
| **Arquitetura** | Como os arquivos se relacionam, dependências, fluxo de dados |
| **Decisões tomadas** | Escolhas técnicas e o porquê (com data) |
| **Informações úteis** | Armadilhas, convenções locais, comandos, links para specs relacionadas |

Orientação:
- O README da pasta raiz (`docs/`, `src/`, etc.) explica o propósito do conjunto; pastas filhas detalham o específico.
- README desatualizado é débito técnico — atualize junto com o código.
- Ao implementar uma feature, verifique se os READMEs das pastas tocadas precisam de atualização.

---

## 4. ESTRUTURA DO REPOSITÓRIO

```
plataformadecursos/
├── AGENTS.md          # Este arquivo — regras de trabalho
├── README.md          # Visão geral do projeto (função, stack, como rodar)
├── docs/              # TODA a documentação (PRD, SPECs, decisões)
│   ├── PRD.md         # Visão de produto (v2.3 [APROVADO])
│   ├── SPEC.md        # Spec master — contrato global (US-01 a US-48, regras R1–R12)
│   ├── DESIGN.md      # Direção visual e arte (v0.7 [APROVADO])
│   ├── modelo-de-dados.md   # Schema consolidado (base do Prisma no S1)
│   ├── plano-de-implementacao.md  # Slices S1–S8 e ordem de entrega
│   └── specs/         # Specs por domínio + STATUS-APROVACAO.md (checklist SDD)
│       ├── SPEC-<dominio>.md   # 15 specs [APROVADO] + mobile [IDEALIZAÇÃO]
│       └── STATUS-APROVACAO.md # Matriz de aprovação e decisões da revisão de pendências
├── src/               # Código Next.js (App Router) — criado em 2026-08-14 (estrutura + READMEs)
│   ├── app/           # Rotas: / (landing), /admin/*, /app/* (aluno)
│   ├── services/      # Lógica de negócio (NUNCA dentro de rotas)
│   ├── lib/           # Infra: db, auth, storage, vídeo, pagamento
│   └── components/    # UI
└── prisma/            # Schema e migrations — criado em 2026-08-14 (estrutura + READMEs)
```

Cada pasta acima terá seu `README.md` ao ser criada.

---

## 5. CONVENÇÕES DE DOCUMENTAÇÃO

- Documentos em **pt-BR** (público do projeto).
- **PRD** = visão de produto (problema, personas, escopo, RNF, métricas).
- **SPEC** = comportamento contratual (user stories, critérios de aceitação, regras de negócio R1–Rn, exemplos Given/When/Then).
- Toda decisão técnica relevante fica registrada (PRD §9/§10, ADR na pasta, ou README da pasta).
- Status dos documentos: `[PENDENTE]` → `[APROVADO]` — nunca implementar documento `[PENDENTE]`.

---

## 6. CONVENÇÕES DE CÓDIGO

- TypeScript estrito; sem `any`, `@ts-ignore` ou `@ts-expect-error`.
- Lógica de negócio em `src/services/` — rotas são finas (parse → service → respond).
- Autorização sempre validada no servidor (RBAC) — nunca confiar no cliente.
- Gating de conteúdo (regras R1–R12 da SPEC) avaliado a cada requisição de conteúdo.
- Testes: Vitest (unitário, obrigatório p/ motor de gating e progresso), Playwright (E2E).
- Prisma para schema/migrations; nomes de tabelas em inglês, snake_case.

---

## 7. ANTI-PATTERNS (PROIBIDO NESTE PROJETO)

- ❌ Implementar sem spec aprovada.
- ❌ Criar pasta sem `README.md`.
- ❌ Mudar escopo direto no código (sempre via revisão de spec).
- ❌ Lógica de negócio dentro de route handlers.
- ❌ Decisão técnica sem registro (data + motivo).
- ❌ Docs desatualizados em relação ao código.

---

## 8. AGENTES DO FLUXO (opcionais, conforme o usuário acionar)

| Fase | Agente |
|---|---|
| Planejamento (spec → plano) | `arquiteto` — lê PRD/SPEC e produz plano de implementação + ADR |
| Implementação | `implementador` — escreve código conforme o plano |
| Testes | `testador` — escreve/roda testes, cobre edge cases |
| Revisão | `revisor` — revisa diff contra spec, segurança e padrões |

---

## 9. COMANDOS (a definir no S1)

- `npm run dev` — ambiente de desenvolvimento
- `npx prisma migrate dev` — migrations
- `npm run test` — testes unitários (Vitest)
- `npm run test:e2e` — testes E2E (Playwright)

---

## 10. NOTAS

### Estado atual do projeto (2026-08-13)

- **Fase**: especificação **concluída** — implementação **NÃO iniciada** (não há `src/`, `prisma/` nem `package.json`).
- **Documentação aprovada**: PRD v2.3 · SPEC master v2.5 · modelo-de-dados v0.1 · plano de implementação v0.2 (S1–S8) · **15 specs de domínio aprovadas** (`docs/specs/STATUS-APROVACAO.md`).
- **Documentação**: **15 specs de domínio aprovadas** (inclui `SPEC-frontend.md` v0.2 e `SPEC-landing.md` v0.2, aprovados em 2026-08-13). **Master v2.5**: novas US aprovadas em 2026-08-13 — US-44 (sales page), US-45/46 (cupons), US-47/48 (avaliações). Fora do escopo: `SPEC-mobile.md` ([IDEALIZAÇÃO]).
- **Prototipagem**: concluída no **Pencil** (2026-08-13) — 63 telas (32 desktop + 31 mobile), versões dark (`D `), 3 bibliotecas de componentes, tokens duais light/dark documentados em `DESIGN.md` §12–13. Exportação de tokens → Tailwind ainda pendente.
- **Marca**: **ConcursFoco** (nome decidido em 2026-08-13, PRD v2.3). Logo final ainda a explorar.
- **Próximo slice**: estrutura de pastas + READMEs concluídos (2026-08-14); próximo: **S1 — Fundação** (scaffold Next.js+TS, Prisma+Postgres via Docker, schema completo, Auth.js com roles, seed, lint/test) — já desbloqueado por `SPEC-auth.md` + `modelo-de-dados.md` + plano aprovados.
- **Versionamento**: repositório git **inicializado** (3 commits em `main`, 2026-08-13/14).

### Decisões técnicas vigentes

- Banco de desenvolvimento: PostgreSQL local via Docker (decisão 2026-08-12).
- Vídeo: Bunny Stream (transcodificação HLS, player embutido).
- Pagamento: Mercado Pago (Checkout Pro + webhooks idempotentes, cartão e Pix).
- Decisões da revisão de pendências (21 itens) registradas em `docs/specs/STATUS-APROVACAO.md` §1.
