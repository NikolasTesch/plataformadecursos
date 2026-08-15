# src/lib — Infraestrutura (Adapters)

## Função

Camada de infraestrutura e integração do ConcursFoco (AGENTS.md §4): banco de dados, autenticação, storage, vídeo, pagamento, e-mail, rate limit, sanitização e geração de PDF. Aqui vivem os **clientes singleton** e os adapters de serviços externos, sem regra de negócio. Regras de negócio (gating, progresso, cupons, trilhas etc.) vivem em `src/services/`.

```
src/lib/
├── db/          # Prisma client singleton + conexão
├── auth/        # Configuração Auth.js/NextAuth + helpers de sessão/role
├── storage/     # Cloudflare R2 (arquivos de material PDF)
├── video/       # Cliente Bunny Stream (transcodificação HLS)
├── pagamento/   # Cliente Mercado Pago (Checkout Pro, webhooks)
├── mail/        # Provider transacional (notificações por e-mail)
├── rate-limit/  # Limites de requisição (login, registro, reenvio)
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
| 2026-08-14 | Criação da estrutura `src/lib/` + README (separação rigorosa infra × negócio) |

## Informações úteis

- Separação infra × negócio: AGENTS.md §4 e §6 (lógica de negócio nunca em rotas).
- Clientes singleton: `src/lib/db` (Prisma), `src/lib/auth`, `src/lib/storage` (R2), `src/lib/video` (Bunny), `src/lib/pagamento` (Mercado Pago).
- Decisões técnicas vigentes: AGENTS.md §10.
- Convenção de tabelas: inglês, `snake_case` (AGENTS.md §6), schema em [docs/modelo-de-dados.md](docs/modelo-de-dados.md).
- Cada subpasta tem seu próprio `README.md` detalhando função, arquitetura e armadilhas.
