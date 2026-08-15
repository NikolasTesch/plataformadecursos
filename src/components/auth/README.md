# components/auth — Componentes de Autenticação

## Função

Componentes dos fluxos públicos de autenticação: login, cadastro e verificação de email (rotas em `src/app/(auth)/`). Seguem o layout de auth definido em [docs/specs/SPEC-frontend.md](docs/specs/SPEC-frontend.md):95 — centralizado, card único, logo, link de volta à landing e consentimento LGPD em destaque no cadastro.

## Arquitetura

Componentes de formulário da área `(auth)` compõem o `Form` (react-hook-form + zod) e os campos base de `ui/` (Input, Label, Checkbox, Button, Alert/Toast). O fluxo é:

- **Login**: card único com email/senha, link "esqueci a senha" e link de cadastro.
- **Cadastro**: formulário com consentimento LGPD em destaque (reuso do fluxo da US-01), enviando para o fluxo de verificação de email.
- **Verificação de email**: estado de verificação via token (`/verificar-email/[token]`).

Validação em camadas: zod valida no cliente (mesma schema servida pelo service de auth) e o servidor revalida sempre — nenhuma regra de negócio depende do cliente. Erros de servidor (email duplicado, credenciais inválidas) aparecem via Alert/Toast, e o formulário respeita os limites de rate-limit do domínio de auth.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Pasta criada; formulários de auth separados de `app/` (aluno autenticado) — a área `(auth)` é pública e não usa app-shell |
| 2026-08-14 | Validação compartilhada (react-hook-form + zod) tanto no cliente quanto no servidor — mesma fonte de verdade da schema |

## Informações úteis

- Layout de auth e especificação de formulários: [docs/specs/SPEC-frontend.md](docs/specs/SPEC-frontend.md):95 e §5 (Form, Input, Label, Checkbox).
- Fluxo de cadastro/login e regras de rate-limit (login 5/min, reenvio de email 3/dia, registro 10/hora): [docs/specs/SPEC-auth.md](docs/specs/SPEC-auth.md) (US-01, US-02, regra A4).
- Os CTA da landing apontam para estas rotas (SPEC-landing R-L1): "Começar trial grátis" e "Entrar" levam a `/cadastro` e `/login`.
- Armadilha: consentimento LGPD é obrigatório no cadastro (SPEC-landing RNF §6) e nunca deve ser pré-marcado.
- Rate-limit é aplicado no servidor (lib/rate-limit) — o componente apenas apresenta o erro retornado.
