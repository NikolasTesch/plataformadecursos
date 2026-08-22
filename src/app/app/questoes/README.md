# src/app/app/questoes — Blocos de Questões

## Função

Rota `/app/questoes`: prática de questões em blocos, com dois modos de execução (SPEC-frontend.md:85):
- **Modo estudo** (padrão): feedback imediato após responder (SPEC-questoes.md:63).
- **Modo prova**: sessão sem gabarito, navegação entre questões e marcação de "revisar"; correção em lote ao finalizar (SPEC-questoes.md:64-65).

A rota abriga também as subáreas **"Meus erros"** (banco de erros, US-37) e **"Favoritas"** (US-38) — SPEC-frontend.md:85, SPEC-questoes.md:52,:58. Elas são subáreas (abas/filtros) desta rota, **não pastas separadas**.

## Arquitetura

```
src/app/app/questoes/
├── README.md          # Este arquivo
├── page.tsx           # Blocos + subáreas "Meus erros" e "Favoritas"
├── [id]/page.tsx      # Bloco autorizado ou BloqueadoCard
├── QuestaoBloco.tsx   # Interação estudo/prova no cliente
└── actions.ts         # Actions finas, com autorização server-side
```

Fluxo: a página lista blocos de questões e oferece as subáreas:
- **Meus erros** (US-37): questões com última tentativa errada, agrupáveis por disciplina/curso; ações: responder de novo, marcar como favorita, transformar em flashcard; questão sai quando o aluno acerta 2x seguidas (D-Q3, SPEC-questoes.md:52-55).
- **Favoritas** (US-38): questões marcadas pelo aluno, listadas por disciplina, com opção de re-responder; favoritar não altera banco de erros nem tentativas (SPEC-questoes.md:58-60).

Cada bloco responde via `src/services/questoes`; tentativas são registradas em `attempts` mesmo no modo prova ad-hoc (SPEC-questoes.md:65). O gating é decidido em `services/questoes/navegacao.ts` antes da consulta das questões. A entrega ad-hoc não cria simulado persistente nem cronômetro; simulados/flashcards persistentes ficam no S7.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | "Meus erros" e "Favoritas" são **subáreas da rota `/app/questoes`** (SPEC-frontend.md:85), não rotas próprias — evita fragmentação e mantém o agrupamento "erros/favoritas" da tabela de rotas |
| 2026-08-14 | Modo prova ad-hoc não cria simulado persistente — não entra no histórico de simulados; tentativas individuais ainda registradas (SPEC-questoes.md:65) |
| 2026-08-14 | Erros resolvidos ao acertar 2x seguidas (D-Q3); integração flashcard disponível nas ações do banco de erros (SPEC-questoes.md:53-54) |
| 2026-08-19 | Rotas S4 implementadas e E2E-Q1..Q5 + gating disponíveis; Q2 validado como entrega ad-hoc; gate técnico e QA manual integrados concluídos |

## Informações úteis

- Banco de erros (US-37): [docs/specs/SPEC-questoes.md](docs/specs/SPEC-questoes.md):51-55.
- Favoritas (US-38): SPEC-questoes.md:57-60.
- Modo prova vs. modo estudo (US-39): SPEC-questoes.md:62-66.
- Rotas de questões no app-shell: [docs/specs/SPEC-frontend.md](docs/specs/SPEC-frontend.md):85.
- Integração com flashcards (questão → flashcard): [docs/specs/SPEC-flashcards.md](docs/specs/SPEC-flashcards.md).
