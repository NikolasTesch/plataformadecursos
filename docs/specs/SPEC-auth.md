# SPEC-AUTH — Autenticação, Sessão e Usuários

- **Versão**: 0.1
- **Data**: 2026-08-12
- **Status**: [APROVADO — 2026-08-12]
- **Domínio master**: US-01, US-02, US-20, US-22, US-24 (SPEC master v2.0 §4)

---

## 1. Objetivo

Definir o comportamento de registro, login, sessão, gestão de usuários pelo admin, verificação de email e exclusão/exportação de dados (LGPD).

---

## 2. User Stories Cobertas

| US | Título | Origem |
|---|---|---|
| US-01 | Registro de aluno | Master v1.0 |
| US-02 | Login e sessão | Master v1.0 |
| US-20 | Gestão de usuários pelo admin | Master v1.0 |
| US-22 | Verificação de email | Master v2.0 |
| US-24 | Exportação de dados (LGPD) | Master v2.0 |

---

## 3. Comportamento Detalhado

### 3.1 Registro (US-01)
- Campos: nome (obrigatório, 2–120 caracteres), email (obrigatório, formato válido, único), senha (obrigatória, mín. 8, máx. 72), aceite LGPD (obrigatório).
- Erros: email duplicado → mensagem amigável, sem revelar existência em fluxos de recuperação.
- Após registro: sessão criada e redirecionamento para `/app`.
- Email de verificação disparado automaticamente (US-22) — não bloqueia o uso.

### 3.2 Login e Sessão (US-02)
- Login com email+senha; erro genérico para credenciais inválidas.
- Rate limit: 5 tentativas falhas/min por IP+email; acima disso, bloqueio temporário de 15 min (mensagem "muitas tentativas, tente novamente em 15 minutos").
- Sessão: cookie httpOnly + SameSite=Lax, duração 30 dias com renovação deslizante (atividade estende em até 30 dias; inatividade encerra).
- Logout: revoga sessão no servidor e limpa cookie.
- Conta bloqueada: login negado com "conta suspensa" (sem detalhar motivo).

### 3.3 Gestão de Usuários (US-20)
- Admin lista alunos: nome, email, produtos, data de cadastro, status (ativo/bloqueado), paginação (50/página), busca por nome/email.
- Bloquear/desbloquear: bloqueio revoga sessões ativas imediatamente; desbloqueio não exige nova senha.
- Admin não pode bloquear a si mesmo.

### 3.4 Verificação de Email (US-22)
- Token único com validade 24h, armazenado com hash; link de verificação com 1 uso.
- Reenvio: máx. 3 por dia por conta (rate limit); botão "reenviar" na UI.
- Conta verificada: badge removido; notificações transacionais habilitadas.
- Conta não verificada após 90 dias: aviso no login (não bloqueia).

### 3.5 Exportação e Exclusão (US-24, R10)
- Exportação: gera pacote ZIP (JSON) com dados pessoais, progresso, anotações, tentativas e compras (anonimizadas conforme R10), disponível por download único em até 24h após solicitação (processamento assíncrono).
- Exclusão: confirmação explícita (digitar "EXCLUIR"); remove dados pessoais, anotações, progresso, sessões; registros de compra anonimizados; exclusão irreversível.

---

## 4. Regras Específicas do Domínio

| # | Regra |
|---|---|
| A1 | Senhas: mín. 8 caracteres; hash argon2id; nunca logadas ou retornadas. |
| A2 | Tokens de verificação: 1 uso, expiram em 24h, armazenados com hash. |
| A3 | Sessões são revogáveis (bloqueio de conta revoga todas). |
| A4 | Rate limits: login 5/min; reenvio de verificação 3/dia; registro 10/hora por IP. |
| A5 | LGPD: consentimento explícito no cadastro; exportação em 24h; exclusão irreversível com anonimização de compras. |

---

## 5. Exemplos End-to-End

### E2E-A1 — Bloqueio revoga sessão
**Given** aluno autenticado em 2 dispositivos
**When** o admin bloqueia o aluno
**Then** ambas as sessões são encerradas e o próximo login é negado com "conta suspensa"

### E2E-A2 — Token de verificação com 1 uso
**Given** token de verificação gerado
**When** o aluno clica no link duas vezes
**Then** a primeira valida o email; a segunda retorna erro "link expirado ou já utilizado"

### E2E-A3 — Exclusão anonimiza compra
**Given** aluno com 1 compra registrada
**When** o aluno exclui a conta
**Then** dados pessoais são removidos, mas o registro de compra permanece sem PII (email hashado + data + valor)

---

## 6. Decisões do Domínio

- Sessão via cookie httpOnly (não JWT em localStorage) — decisão de segurança.
- Verificação de email não bloqueia uso (reduz atrito de ativação).

---

## 7. Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-12 | Versão inicial para aprovação |
| 0.1 | 2026-08-12 | **APROVADA** — revisão de aplicabilidade concluída |
