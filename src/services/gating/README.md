# src/services/gating — Motor de Acesso (SUBSET R1-R4)

> **⚠️ SUBSET R1-R4 — motor completo R1-R12 chega no S3 e substitui este arquivo.**
> Este serviço implementa apenas o subconjunto de leitura (amostra/assinatura/
> venda_unica/bloqueado) necessário para o S2 — Conteúdo. O S3 implementa o
> motor completo R1-R12 (cache ≤5min, revogação, progresso, janelas de datas,
> cotas, produto ativo) sobre o MESMO contrato de `podeAcessarMaterial`, sem
> mudar a assinatura para os callers.

## Função

Autorização de leitura de materiais (R7): decide, no servidor, se um aluno pode
ver um material — e o **motivo** do resultado (contrato tipado usado pelo
`BloqueadoCard`/badges de status). Em bloqueio, o caller **nunca** envia
conteúdo ao cliente (R12).

Fonte de verdade: fluxo de gating em [docs/specs/SPEC-aluno.md](docs/specs/SPEC-aluno.md):38-45
e regras R1-R4 em [docs/SPEC.md](docs/SPEC.md):387-392. Regras R5-R12 (completas)
no S3.

## Arquitetura

- **Função pura**: `podeAcessarMaterial({ userId, material, curso, entitlements }, deps?) → { permitido, motivo }`.
  Recebe entitlements como DADO (shape mínimo, sem acesso a banco) → testável
  sem mock de db. `deps.agora` injeta o relógio (testes determinísticos);
  o S3 estende `deps` com cache/revogação/consulta de produto ativo.
- **Ordem de decisão** (subset, guarda de publicação ANTES de tudo):
  1. `material.status !== 'publicado'` → bloqueado (o gating assume materiais
     publicados; rascunho nunca é entregue — R5, avaliada pelo caller).
  2. R4 — `material.amostra === true` → permitido (`amostra`), sem entitlement.
  3. R2 — curso `incluido_assinatura` + entitlement `assinatura` com
     `acesso_ate >= agora` → permitido (`assinatura`).
  4. R3 — entitlement `venda_unica` com `product.curso_id === curso.id` →
     permitido (`venda_unica`), **permanente** (acesso_ate ignorado, inclusive
     passado — SPEC.md:391).
  5. Caso contrário → bloqueado (`bloqueado`, R12).
- **Entitlements (shape mínimo)**: `{ id, origem, acesso_ate, product_id, product?: { tipo, curso_id } }`.
  `origem` = `pagamento|trial|admin` (todas contam); `acesso_ate` null =
  permanente SÓ para `venda_unica` (R3) — assinatura com null NÃO é ativa
  (assinatura sempre tem prazo). `product` ausente = entitlement não avaliável
  (ignorado). Callers devem filtrar `products.status === 'ativo'` ao montar o
  shape (a checagem de produto ativo — R2 — entra no motor completo do S3).
- **`userId` não é usado no subset**: checagens por usuário (R5+) são do S3;
  o campo existe no contrato por estabilidade de API.
- **Bloqueio sem conteúdo**: resultado `{ permitido: false, motivo: 'bloqueado' }`
  orienta o caller a renderizar apenas o `BloqueadoCard` (título + cadeado + CTA),
  sem PDF, texto, link de vídeo ou gabarito (R12).

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-15 | **S2 implementa SUBSET R1-R4 (leitura)** em `index.ts`; motor completo R1-R12 chega no S3 e substitui este arquivo (plano s2 todo 7) |
| 2026-08-15 | Função **pura** (entitlements como dado, shape mínimo tipado, sem db) — testável sem mock; contrato `{ permitido, motivo }` com motivo pt-BR para UI |
| 2026-08-15 | **venda_unica é permanente**: `acesso_ate` ignorado (inclusive passado) — SPEC.md R3:391; `acesso_ate` null NÃO torna assinatura permanente (R2 exige prazo) |
| 2026-08-15 | Guarda de publicação: `status !== 'publicado'` → bloqueado ANTES de R4 (o subset assume materiais publicados; rascunho invisível — R5) |
| 2026-08-14 | **gating é pasta própria**, mesmo não sendo um domínio da SPEC §4.1 — é transversal a todo conteúdo; não viver dentro de `aluno/` |
| 2026-08-12 | Gating avaliado a cada requisição (R7); cache curto de autorização (máx. 5 min) com invalidação em despublicação/bloqueio (SPEC-aluno.md:45) — **no S3** |
| 2026-08-12 | Entitlement concedido somente via webhook validado (P1) — gating nunca confia no estado do checkout na UI |

## Informações úteis

- Regras globais R1-R12 (tabela exata): [docs/SPEC.md](docs/SPEC.md):387-400.
- Fluxo de gating e cache: [docs/specs/SPEC-aluno.md](docs/specs/SPEC-aluno.md):38-45.
- Entitlements/products: [prisma/schema.prisma](prisma/schema.prisma) (`entitlements` §2.6, `products` §2.6).
- Testes: `tests/unit/gating-min.test.ts` (17 casos — 4 branches + edges; Vitest).
- Slice: [docs/plano-de-implementacao.md](docs/plano-de-implementacao.md):45-52 (S3 — motor completo).
- Anti-padrão: nunca confiar no cliente para decidir acesso; todo conteúdo passa pelo gating no servidor.
