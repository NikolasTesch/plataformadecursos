# src/app/app/simulados/[id] — Execução de Simulado

## Função

Rota `/app/simulados/{id}`: execução de um simulado pelo aluno (SPEC-questoes.md:45-49):
- Cronômetro regressivo visível; **entrega automática** ao estourar o tempo (respostas salvas até o momento).
- Navegação entre questões e marcação de "revisar" (flag local); **sem gabarito durante a prova**.
- **Correção ao final**: nota (acertos/total), desempenho por disciplina (via vínculo questão → módulo → curso), comentários visíveis após a entrega.
- **Histórico**: tentativas salvas (data, nota, respostas); o aluno vê tentativas anteriores e pode refazer (nova tentativa, não sobrescreve a anterior).

## Arquitetura

```
src/app/app/simulados/[id]/
├── README.md          # Este arquivo
└── page.tsx           # Execução: cronômetro + navegação + correção (a criar no S2)
```

Fluxo: o parâmetro `id` identifica o simulado; o estado da execução (respostas, flags de revisar, tempo restante) é gerenciado no cliente, com persistência das respostas para garantir a entrega automática. Ao finalizar (entrega manual ou estouro de tempo), `src/services/questoes` registra a tentativa e devolve a correção com nota e desempenho por disciplina.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Entrega automática no estouro do tempo salva as respostas até aquele momento (SPEC-questoes.md:46) — nada de perda de progresso por tempo esgotado |
| 2026-08-14 | Sem gabarito durante a prova; correção com comentários apenas após a entrega (SPEC-questoes.md:47-48) |
| 2026-08-14 | Refazer o simulado cria nova tentativa, sem sobrescrever as anteriores (SPEC-questoes.md:49) |
| 2026-08-14 | Desempenho por disciplina deriva do vínculo questão → módulo → curso (SPEC-questoes.md:48) |

## Informações úteis

- Execução, correção e histórico: [docs/specs/SPEC-questoes.md](docs/specs/SPEC-questoes.md):45-49.
- Admin monta o simulado com título, instruções, duração e conjunto manual de questões (sem sorteio no MVP, D-Q2): SPEC-questoes.md:43-44.
- A lista de simulados vive em `../README.md` (pasta `simulados/`).
