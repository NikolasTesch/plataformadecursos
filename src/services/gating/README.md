# `src/services/gating` — motor de acesso

## Função
Decide, no servidor e sem emitir conteúdo, se um usuário pode acessar material
publicado. Bloqueios retornam somente `{ permitido: false, motivo: "bloqueado" }`.

## Arquitetura
`engine.ts` é a decisão pura (falha fechada); `index.ts` mantém o contrato S2 e
acrescenta `avaliarAcesso`; `cache.ts` fornece cache local por usuário/curso/material,
TTL de 5 minutos e invalidação por usuário, curso ou global.

## Decisões tomadas
- 2026-08-18: cache in-memory sem dependência externa, com versão de invalidação.
- 2026-08-18: produto ausente/inativo, conta bloqueada, rascunho e vídeo em erro
  nunca liberam acesso; regras de questões/vídeo ficam para seus slices.
- 2026-08-18: R6 pertence às consultas de ordenação e está coberta por unit/E2E;
  R8/R9 ficam no S6 (pagamentos) e R10 no S8 (LGPD), conforme o plano. Não são
  responsabilidades deste motor.
- 2026-08-18: `podeAcessarMaterial` preserva o retorno S2; `avaliarAcesso` expõe
  também `regraId` para consumidores novos.
- 2026-08-18: leitura e busca propagam o estado da conta; bloqueio e
  despublicação invalidam o cache após a mutação confirmada.

## Informações úteis
Use `invalidarPorUsuario`, `invalidarPorCurso` ou `invalidarGlobal` após bloqueio,
revogação ou despublicação. O cache é por processo (`ponytail: trocar por cache
compartilhado/pub-sub quando houver escala horizontal`).
