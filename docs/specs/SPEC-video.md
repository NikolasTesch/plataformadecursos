# SPEC-VIDEO — Vídeo (Bunny Stream, Player e Posição)

- **Versão**: 0.1
- **Data**: 2026-08-12
- **Status**: [APROVADO — 2026-08-12]
- **Domínio master**: US-07, US-10 (SPEC master v2.0 §4)

---

## 1. Objetivo

Definir o comportamento de publicação e reprodução de videoaulas: upload para Bunny Stream, transcodificação assíncrona, player HLS e retomada de posição.

---

## 2. User Stories Cobertas

| US | Título | Origem |
|---|---|---|
| US-07 | Admin cria material do tipo Vídeo | Master v1.0 |
| US-10 | Aluno assiste vídeo e retoma posição | Master v1.0 (US-07) / v2.0 |

---

## 3. Comportamento Detalhado

### 3.1 Upload e processamento (US-07)
- Upload: arquivo de vídeo máx. 2GB; formatos aceitos pelo Bunny (mp4, mov, mkv, avi — validados por extensão + MIME).
- Upload enviado diretamente ao Bunny Stream (presigned/API), sem passar pelo servidor da aplicação (evita limite de corpo de request e consumo de banda).
- Estados do material: `processando` → `pronto` | `erro`.
  - `processando`: visível no admin com badge; **não publicável**.
  - `pronto`: libera publicação.
  - `erro`: não publicável (R11); admin vê mensagem de erro e pode reenviar.
- Transição de estado via callback/webhook do Bunny → atualiza o banco.

### 3.2 Player (US-10)
- Reprodução via player HLS embutido (URL de streaming fornecida pelo Bunny após gating aprovado — R7/R12).
- **Gating**: o servidor emite o link de reprodução (com token de curta duração quando aplicável) somente se o aluno tem entitlement.
- Posição: salva a cada 5s de reprodução (debounce) e ao pausar/sair; campo `posicao_segundos` por aluno+material.
- Retomada: ao reabrir, player inicia na posição salva (se ≥ 5s e < 95% da duração).
- Conclusão automática: ao atingir os últimos 10s (ou 95% da duração), material marcado concluído (US-14).
- Controle de velocidade (0.5x–2x), fullscreen, qualidade automática (HLS).

### 3.3 Armazenamento e custo
- Vídeo armazenado e servido pelo Bunny (CDN); a aplicação nunca serve bytes de vídeo.
- Thumbnail gerada pelo Bunny; exibida na listagem de materiais.

---

## 4. Regras Específicas do Domínio

| # | Regra |
|---|---|
| V1 | Vídeo nunca trafega pelo servidor da aplicação (upload e streaming via Bunny). |
| V2 | Material `video` só é publicável com status `pronto` (R11). |
| V3 | Link de reprodução emitido só após gating aprovado; token de curta duração quando suportado (R7/R12). |
| V4 | Posição salva por aluno+material a cada 5s (debounce) e na saída. |
| V5 | Conclusão automática: posição ≥ 95% da duração. |

---

## 5. Exemplos End-to-End

### E2E-V1 — Erro de transcodificação bloqueia publicação
**Given** vídeo com status `erro`
**When** admin tenta publicar o material
**Then** publicação é recusada com mensagem de erro; admin pode reenviar o vídeo

### E2E-V2 — Retomada de posição
**Given** aluno assistiu 12min de um vídeo de 30min
**When** o aluno reabre o material
**Then** o player inicia em 12min (posição salva)

### E2E-V3 — Conclusão automática
**Given** vídeo de 30min, aluno na posição 28min30s
**When** a reprodução avança
**Then** o material é marcado como concluído (95% da duração)

### E2E-V4 — Sem entitlement, sem link de streaming
**Given** aluno sem acesso ao curso
**When** o aluno requisita o vídeo
**Then** nenhum link de reprodução é emitido (R12)

---

## 6. Decisões do Domínio

| Data | Decisão |
|---|---|
| 2026-08-12 | Bunny Stream como provedor (PRD v1.0) — upload direto, streaming CDN, HLS |

---

## 7. Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-12 | Versão inicial para aprovação |
| 0.1 | 2026-08-12 | **APROVADA** — revisão de aplicabilidade concluída |
