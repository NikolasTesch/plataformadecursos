# src/app/app/simulados — Lista de Simulados

## Função

Rota `/app/simulados`: lista os simulados disponíveis para o aluno (SPEC-frontend.md:85). Um simulado é uma coleção independente de questões montada pelo admin (não atrelada a módulo, SPEC-questoes.md:44). Cada card navega para a execução em `/app/simulados/{id}`.

## Arquitetura

```
src/app/app/simulados/
├── README.md          # Este arquivo
├── page.tsx           # Lista de simulados disponíveis (a criar no S2)
└── [id]/              # Execução do simulado (ver README em [id])
```

Fluxo: a página consulta `src/services/questoes` (domínio simulados) pela lista de simulados publicados. Cada simulado exibe título, duração e instruções; o aluno inicia a execução que ocorre em `[id]`. O histórico de tentativas anteriores também é acessível a partir daqui (SPEC-questoes.md:49).

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Simulados são coleções independentes de questões, sem vínculo obrigatório com módulo/curso (D-Q2, SPEC-questoes.md:43-44) |
| 2026-08-14 | A execução vive no segmento dinâmico `[id]` — a lista fica enxuta e a rota de execução tem controle de cronômetro próprio |

## Informações úteis

- Execução e correção de simulados: [docs/specs/SPEC-questoes.md](docs/specs/SPEC-questoes.md):45-49.
- Histórico de tentativas: SPEC-questoes.md:49 (nova tentativa não sobrescreve a anterior).
- Rotas de simulados no app-shell: [docs/specs/SPEC-frontend.md](docs/specs/SPEC-frontend.md):85.
