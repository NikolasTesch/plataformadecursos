# src/app/admin/cupons — Cupons de desconto

## Função

CRUD de cupons de desconto (URL `/admin/cupons`), de uso exclusivo do admin (US-45), para promover assinaturas e cursos. Campos: código único (case-insensitive), tipo `percentual` (1-100) ou `fixo` (R$), valor, escopo (`assinatura` | `venda_unica` | produto específico), validade (`valido_de`/`valido_ate`), limite de uso (opcional) e status ativo/inativo.

## Arquitetura

- Página sob o layout **admin-shell** (SPEC-frontend.md:102).
- Rota fina: `page.tsx` futuro chama o service `src/services/pagamentos`; a validação no checkout (US-46) é sempre no servidor: cupom ativo, dentro da validade, com uso disponível e escopo compatível com o produto.
- Aplicação do cupom não acumula com trial (D-K2) e o desconto incide sobre a 1ª cobrança apenas (renovações a preço cheio, D-K1).

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Rota criada antes do código (estrutura + README), seguindo o contrato do plano de implementação |
| 2026-08-14 | Rota adicionada pela revisão de pendências (US-45/46, master v2.5) — não consta na tabela de rotas de SPEC-frontend.md:87 (débito de docs, revisão de spec futura) |

## Informações úteis

- Regras do cupom no checkout: [docs/specs/SPEC-pagamentos.md](docs/specs/SPEC-pagamentos.md):76-81.
- User story US-45: [docs/SPEC.md](docs/SPEC.md):354-359 (cupom inativo/expirado/esgotado não aplicável; desconto na 1ª cobrança).
- 1 cupom por compra; erros amigáveis "cupom expirado" / "cupom esgotado" / "cupom inválido" (SPEC-pagamentos.md:79).
- Slice de implementação: S6 — ver [docs/plano-de-implementacao.md](docs/plano-de-implementacao.md).
