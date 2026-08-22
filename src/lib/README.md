# src/lib — Infraestrutura (Adapters)

- **Versão**: 0.2
- **Data**: 2026-08-19

## Função

Camada de infraestrutura e integração do ConcursFoco (AGENTS.md §4): banco de dados, autenticação, storage, vídeo, pagamento, e-mail, rate limit, sanitização e geração de PDF. Aqui vivem os **clientes singleton** e os adapters de serviços externos, sem regra de negócio. Regras de negócio (gating, progresso, cupons, trilhas etc.) vivem em `src/services/`.

```
src/lib/
├── db.ts        # Prisma Client singleton + adapter-pg (Prisma 7) — IMPLEMENTADO (S1)
├── db/          # README do acesso ao banco
├── auth/        # Config Auth.js/NextAuth v5 split (Edge-safe) + helpers sessão/role — IMPLEMENTADO (S1)
├── rate-limit/  # SlidingWindowLimiter em memória (record-on-failure) — IMPLEMENTADO (S1)
├── utils.ts     # Utilidades (ex.: cn()) — IMPLEMENTADO (S1)
├── storage/     # Cloudflare R2 (arquivos de material PDF)
├── video/       # Cliente Bunny Stream (transcodificação HLS)
├── pagamento/   # Cliente Mercado Pago (Checkout Pro, webhooks)
├── mail/        # Resend — provider transacional (notificações por e-mail)
├── sanitize/    # Sanitização de HTML (whitelist XSS)
└── pdf/         # Geração de PDF (certificados, impressão)
```

## Arquitetura

- **Direção do fluxo**: `src/app` (rotas finas, `parse → service → respond`) → `src/services` (lógica de negócio) → `src/lib` (infra). **Rotas NUNCA chamam `src/lib` diretamente** — toda integração passa por um service.
- Cada subpasta expõe um adapter (ex.: cliente de banco, cliente de storage) com interface mínima; o service é o único que conhece o contrato do domínio.
- Segredos e credenciais nunca são embarcados: leitura via variáveis de ambiente no momento da inicialização.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-12 | Banco de desenvolvimento PostgreSQL local via Docker |
| 2026-08-12 | Vídeo via Bunny Stream (transcodificação HLS, player embutido) |
| 2026-08-12 | Pagamento via Mercado Pago (Checkout Pro + webhooks idempotentes, cartão e Pix) |
| 2026-08-19 | Email transacional via Resend, decisão do usuário; configuração operacional permanece pendente |
| 2026-08-14 | Criação da estrutura `src/lib/` + README (separação rigorosa infra × negócio) |
| 2026-08-15 | `db.ts` singleton com `@prisma/adapter-pg` (`PrismaPg`) — driver adapter obrigatório no Prisma 7 (todo 4) |
| 2026-08-15 | `auth/` split config implementado: `auth.config.ts` Edge-safe + `auth.ts` Node (PrismaAdapter) + helpers de sessão (todos 7/9, BLOCKER-1) |
| 2026-08-15 | `rate-limit/` implementado: `SlidingWindowLimiter` em memória com clock injetável, semântica record-on-failure (todo 9, MAJOR-3) |
| 2026-08-19 | Resend consolidado como provider de email transacional; staging, Sentry + Vercel e demais gates operacionais permanecem documentados fora do código |

## Informações úteis

- Separação infra × negócio: AGENTS.md §4 e §6 (lógica de negócio nunca em rotas).
- Clientes singleton: `src/lib/db.ts` (Prisma), `src/lib/auth` (Auth.js v5), `src/lib/storage` (R2), `src/lib/video` (Bunny), `src/lib/pagamento` (Mercado Pago).
- Email transacional: `src/lib/mail/README.md` e gates operacionais em
  `docs/operacoes/`.
- Decisões técnicas vigentes: AGENTS.md §10.
- Convenção de tabelas: inglês, `snake_case` (AGENTS.md §6), schema em [docs/modelo-de-dados.md](docs/modelo-de-dados.md).
- Cada subpasta tem seu próprio `README.md` detalhando função, arquitetura e armadilhas.
- Armadilha: `auth/` e `rate-limit/` são consumidos por `src/services/` e pelas rotas finas; o proxy só importa `auth.config.ts` (Edge) — nunca `auth.ts` (Prisma não roda no Edge, BLOCKER-1).
