# src/services/aluno — Área do Aluno (Progresso, Anotações, Certificados, PWA)

## Função

Regras de negócio da área do aluno, implementando as user stories US-11, US-12, US-14, US-15, US-29, US-30 e US-43 de `docs/specs/SPEC-aluno.md`:

| US | Título |
|---|---|
| US-11 | Aluno navega pela estrutura (home, página do curso, status dos materiais) |
| US-12 | Aluno acessa material (o motor de decisão vive em `gating/`; aqui ficam os fluxos que o chamam) |
| US-14 | Aluno controla progresso (conclusão manual, vídeo ≥95%, recálculo) |
| US-15 | Aluno faz anotações (por material, privadas, exportação LGPD) |
| US-29 | Certificados de conclusão (código de verificação único) |
| US-30 | Acesso offline (PWA) — agendado no S7 |
| US-43 | Download em lote (ZIP) de curso — agendado no S7 |

A pasta atua como a interface entre as rotas de `/app/*` e as regras de progresso, anotações, certificados e PWA. O **gating em si não vive aqui** — é pasta própria (`gating/`), avaliada a cada requisição de conteúdo (R7).

## Arquitetura

- **Serviço único de progresso**: registra conclusão manual (`pdf|texto|questoes`) e automática de vídeo (≥95%, V5); recalcula imediatamente ao desmarcar. Progresso do curso = concluídos ÷ publicados acessíveis — bloqueados fora do denominador (AL1).
- **S3.2 (2026-08-18)**: `progresso.ts` grava `user_progress` com upsert idempotente, permite desmarcar sem criar linha e reavalia gating no servidor.
- **S5 (2026-08-19)**: `salvarPosicaoVideo` saneia e persiste posição em cada chamada, limita pela duração informada, chama `concluir` nos limiares de 95%/10s e `obterDadosPlayer` calcula a retomada. O endpoint headless valida sessão e role; nenhum HLS passa pela aplicação.
- **Anotações**: CRUD por material com texto livre (máx. 10.000 caracteres), listagem "Minhas anotações" e busca por texto; privadas, incluídas na exportação LGPD (US-24).
- **S3.3 (2026-08-18)**: `anotacoes.ts` valida o limite no servidor e aplica `user_id` em toda operação; a rota e a página do material usam apenas `requireRole("aluno")`.
- **Certificados**: elegível com 100% dos materiais publicados acessíveis concluídos (AL2); código de verificação único e sem PII (AL3); regenerável com o mesmo código.
- **S3.4 (2026-08-18)**: `certificados.ts` aplica AL1/AL2, emite via `upsert` idempotente e expõe verificação pública mínima. A emissão prioriza a verificabilidade; PDF ainda não foi adicionado nesta implementação bounded.
- **S3.5 (2026-08-18)**: `navegacao.ts` lista somente cursos com material publicado e delega o percentual a `progressoCurso(userId, courseId)`, preservando gating e isolamento server-side. A visão da página de curso também é montada aqui: entitlements, materiais publicados e status de gating não são consultados nem transformados pela rota.
- **PWA/offline (S7)**: fila persistente (IndexedDB) com sincronização last-write-wins (AL5); download offline exige gating aprovado no momento do download (AL4); revogação não apaga downloads existentes, cache limitado a 30 dias (D-A1).
- **Download em lote ZIP (S7)**: sem vídeos (D-A4), questões sem gabarito (D-A3), URL assinada 24h, gating na solicitação e novamente no download (AL6).
- **Tabelas** (modelo-de-dados.md §2.5): `user_progress` (pk user_id+material_id, `concluido`, `posicao_segundos`), `notes`, `certificates` (código único).

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | `aluno/` cobre progresso, anotações, certificados e PWA; **gating é pasta própria** (`gating/`), não subpasta de aluno — decisão da revisão de pendências |
| 2026-08-12 | D-A1: revogação de acesso não apaga downloads existentes; cache offline limitado a 30 dias |
| 2026-08-12 | D-A4: vídeos fora do ZIP (download individual via PWA) |

## Informações úteis

- Spec de domínio: [docs/specs/SPEC-aluno.md](docs/specs/SPEC-aluno.md) (US-11 a US-15 §3.1–3.4, certificados §3.5, PWA §3.6, ZIP §3.7).
- Motor de gating e regras R1–R12: [docs/specs/SPEC-aluno.md](docs/specs/SPEC-aluno.md):38-45 e [docs/SPEC.md](docs/SPEC.md):387-400 — veja `gating/`.
- Modelo de dados: [docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.5 (`user_progress`, `notes`, `certificates`).
- Slices: [docs/plano-de-implementacao.md](docs/plano-de-implementacao.md) — S3 (:45-52) núcleo da área do aluno; S7 (:81-88) PWA offline (AL4/AL5) e download em lote (US-43).
- Testes: **Vitest obrigatórios para o progresso** (AGENTS.md §6) — recálculo, denominador sem bloqueados (AL1), conclusão de vídeo. E2E: E2E-AL1..AL3 (S3/S7).
- Regra de ouro: progresso nunca conta material bloqueado; certificado só com 100% dos acessíveis.
