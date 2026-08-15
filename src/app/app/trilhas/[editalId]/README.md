# src/app/app/trilhas/[editalId] — Plano da Trilha

## Função

Rota `/app/trilhas/{editalId}`: plano de estudos de uma trilha ativada (US-25, SPEC-trilhas.md:33-35):
- **Plano da trilha**: materiais ordenados por (peso da disciplina desc, ordem dentro da disciplina).
- **Progresso por disciplina** (% concluído) e **progresso geral** da trilha.
- **Conclusão**: 100% dos materiais acessíveis concluídos → selo "trilha concluída" (sem certificado — certificado é por curso, US-29).
- Materiais bloqueados (sem entitlement) aparecem no plano com estado bloqueado e **não contam no denominador de progresso** (regra AL1, SPEC-trilhas.md:36).

## Arquitetura

```
src/app/app/trilhas/[editalId]/
├── README.md          # Este arquivo
└── page.tsx           # Plano da trilha: disciplinas, pesos, progresso (a criar no S2)
```

Fluxo: o parâmetro `editalId` identifica o edital cuja trilha o aluno ativou. A página consulta `src/services/trilhas` pelo plano (disciplinas com peso, materiais ordenados) e pelo progresso calculado por disciplina e geral. Aluno sem acesso aos materiais vê o plano com CTAs de compra/assinatura (SPEC-trilhas.md:37). O selo de conclusão aparece quando o progresso atinge 100% dos materiais acessíveis.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Ordenação do plano por (peso da disciplina desc, ordem interna) — matérias de maior peso aparecem primeiro (SPEC-trilhas.md:34) |
| 2026-08-14 | Materiais bloqueados não contam no denominador de progresso (AL1) — o aluno não é penalizado por conteúdo sem entitlement (SPEC-trilhas.md:36) |
| 2026-08-14 | Selo "trilha concluída" ao atingir 100%; sem certificado (certificado é por curso, US-29 — SPEC-trilhas.md:35) |
| 2026-08-14 | Versões do edital (D-T1): edital republicado cria nova versão; quem ativou antes mantém a versão antiga (SPEC-trilhas.md:30) |

## Informações úteis

- Uso da trilha pelo aluno (US-25): [docs/specs/SPEC-trilhas.md](docs/specs/SPEC-trilhas.md):32-37.
- Estrutura do edital e regras de peso: SPEC-trilhas.md:28-30.
- A lista de trilhas vive em `../README.md` (pasta `trilhas/`).
- Alertas de edital seguido (abertura/fim de inscrições, prova próxima) chegam via central de notificações — ver `src/app/app/notificacoes/README.md`.
