# SPEC-LANDING — Landing Page de Alta Conversão

- **Versão**: 0.2
- **Data**: 2026-08-13
- **Status**: [APROVADO — 2026-08-13]
- **Domínio master**: transversal — aplica-se à rota `/` (e `#precos`, `/sobre`). Define a **experiência pública de conversão** (visitante → cadastro → trial → assinatura/venda única), complementando `SPEC-frontend.md` (tokens/componentes), `DESIGN.md` (§13 linguagem editorial) e `SPEC-pagamentos.md` (planos).

---

## 1. Objetivo

Transformar visitantes (orgânicos, ads, redes sociais, indicação) em **cadastros → trial → assinantes/compradores**, seguindo as métricas do PRD §8 (ativação, conversão visitante→checkout→pagamento). A landing é a vitrine do produto: mostra valor, prova social, planos e remove objeções em uma única página, mobile-first.

Princípio de design (DESIGN.md §13): **próximo passo dominante** — o visitante deve saber em < 3s o que fazer e por quê. 1 CTA primário por viewport.

---

## 2. Público e Contexto

- Visitante do celular (predominante — PRD §3.1), chegando de busca Google, Instagram/YouTube ou indicação.
- Dois perfis de intenção: **quente** (já decide comprar — quer preço/trial) e **frio** (descobriu agora — precisa de valor antes de qualquer CTA).
- A landing deve atender aos dois: hero focado em valor (frio) + seção de planos acessível por âncora no header (quente).

---

## 3. Estrutura da Página (funil de conversão)

| # | Seção | Conteúdo | Objetivo |
|---|---|---|---|
| 0 | **Topbar fixa** | Logo ConcursFoco · nav (Cursos, Planos, FAQ) · "Entrar" (ghost) · CTA "Começar trial grátis" | Navegação + CTA sempre visível |
| 1 | **Hero** | Eyebrow ("Conteúdo para concursos") · H1 de valor · subheadline · CTA primário (trial 7 dias, sem cartão) · microcopy de confiança ("Cancele quando quiser") · visual: app em destaque (ilustração duotone — DESIGN §5) | Capturar atenção em < 3s |
| 2 | **Barra de prova social** | Números (alunos ativos, materiais publicados, questões resolvidas) — **somente com dados reais** (ver R-L3) · logos/marcas de bancas cobertas | Credibilidade |
| 3 | **Problema** | Dor do concurseiro (materiais espalhados, sem progresso, desistência) em contraste com a solução | Empatia → desejo |
| 4 | **Como funciona** | 3 passos: Cadastre → Estude com plano → Acompanhe seu progresso · ou grid de features (5 tipos de material, trilhas por edital, simulados, flashcards, streak) | Entendimento do produto |
| 5 | **Cursos em destaque** | Cards públicos de cursos (nome, descrição, badge "Incluído na assinatura" ou preço da venda única) · link para a página pública do curso (R-L2) | Demonstração + caminho de compra por curso |
| 6 | **Depoimentos** | 3 depoimentos (nome, cargo/curso alvo, texto) + nota média de avaliação dos cursos (quando houver — R-L3) | Prova social qualitativa |
| 7 | **Planos e preços** | Tabela: Mensal · Anual (2 meses grátis — P0-2) · Venda única (por curso) · **trial 7 dias sem cartão em destaque** (P0-1) · formas de pagamento: Pix e cartão (Mercado Pago) | Fechamento |
| 8 | **FAQ** | 5–8 perguntas (trial, cancelamento, acesso, certificado, LGPD, dispositivos, suporte) — ver R-L5 | Remover objeções finais |
| 9 | **CTA final** | Repetição do CTA primário ("Começar trial grátis") + reforço de redução de risco (sem cartão, sem fidelidade) | Última captura |
| 10 | **Rodapé** | Termos de uso, Política de Privacidade (LGPD), contato, redes sociais, selo Mercado Pago | Conformidade + confiança |

Regras de composição (DESIGN.md §13.1/13.2): seções com 64px de espaçamento; sem cards empilhados sem hierarquia; CTA sempre acima da dobra no hero.

---

## 4. Estratégia de Conversão (CRO)

### R-L1 — CTA único por viewport
- 1 botão primário visível por dobra; demais ações são secundárias (ghost/outline).
- Labels consistentes: **"Começar trial grátis"** (primário, sempre) · "Ver planos" (secundário, âncora `#precos`) · "Entrar" (ghost).

### R-L2 — Página pública de curso (sales page)
Cada curso publicado gera uma página pública `/cursos/[slug]` (público):
- Conteúdo: nome, descrição, grade resumida (módulos/materiais **como lista de títulos — sem conteúdo**), preço (venda única) ou badge "Incluído na assinatura", amostra gratuita (R4 — máx. 1 por curso).
- CTAs: "Assinar e acessar" / "Comprar curso" → checkout (SPEC-pagamentos) · "Começar trial grátis".
- SEO próprio (R-L6) — é a página que converte busca por "curso de X para concurso Y".
- **Bloqueia o S2?** Não — a sales page pode entrar no S2/S3 como complemento do CRUD de cursos (exige decisão do usuário — ver §10).

### R-L3 — Prova social honesta
- **Proibido inventar métricas/depoimentos.** Antes do produto ter dados reais: omitir números (barra de prova social vira marcas/bancas) e usar depoimentos reais de early users com consentimento.
- Quando existirem: alunos ativos, materiais publicados, questões resolvidas, nota média de cursos — atualizados via admin (R-L7) ou agregações (SPEC-admin AD4, cache ≤ 1h).

### R-L4 — Redução de risco explícita
Microcopy obrigatório nos pontos de decisão (hero, planos, CTA final):
- "Sem cartão para começar" (trial) · "Cancele quando quiser" · "Pagamento seguro via Mercado Pago (Pix e cartão)" · "Seus dados protegidos (LGPD)".

### R-L5 — FAQ estruturado
- Perguntas mínimas obrigatórias: (1) Como funciona o trial? (2) Posso cancelar a assinatura? (3) O que está incluído na assinatura? (4) Como recebo o certificado? (5) Posso acessar pelo celular? (6) Posso baixar os materiais?
- Conteúdo editável pelo admin (R-L7) e publicado com dados estruturados (R-L6).

### R-L6 — SEO e compartilhamento
- Meta tags únicas por rota (`title`, `description`), Open Graph (imagem de marca, nome ConcursFoco).
- Dados estruturados: `Product`/`Offer` (planos) + `FAQPage` (FAQ) + `Course` (cursos públicos).
- `sitemap.xml` + robots; landing e sales pages **SSG/ISR** (performance — PRD: navegação P95 < 2s; LCP alvo < 2.5s).
- Rotas canônicas; URLs amigáveis (`/cursos/[slug]`).

### R-L7 — Gestão de conteúdo pela admin
- Depoimentos, números de prova social e FAQ geridos pelo admin (CRUD simples — mesmo padrão de US-19/US-31) OU conteúdo versionado no repo para MVP (decisão §10).
- Cursos em destaque: derivados automaticamente dos cursos publicados (sem manutenção manual).

### R-L8 — Analytics de funil (desde o S1)
Eventos rastreados (decisão de ferramenta: Vercel Analytics / GA4 — ver §10):
- `view_landing` · `click_cta_hero` · `view_precos` · `start_signup` · `signup_complete` · `start_trial` · `checkout_view` · `purchase_approved` (webhook MP).
- Alimentam as métricas do PRD §8 (conversão visitante→compra, ativação) e o funil do admin (US-19).

---

## 5. Testes A/B sugeridos (após v1 em produção)

1. Headline: benefício direto ("Passe no concurso com plano de estudos") vs. dor ("Cansou de estudar sem rumo?").
2. Label do CTA: "Começar trial grátis" vs. "Começar grátis" vs. "Quero estudar agora".
3. Posição dos preços: antes vs. depois dos depoimentos.
4. Hero: screenshot do app vs. ilustração duotone (DESIGN §13).
5. Formulário de cadastro: 3 campos (nome/email/senha) vs. 2 (email/senha — nome coletado depois).

---

## 6. Requisitos Não-Funcionais (herdados + específicos)

- Performance: LCP < 2.5s em 4G; landing inteira < 100KB JS (zero dependências pesadas — sem libs de animação).
- Acessibilidade WCAG 2.1 AA (SPEC-frontend §8): contraste, foco, alt, headings; FAQ em `<details>` nativo.
- Mobile-first: hero legível em 375px; CTA full-width no mobile; seções com 32px de espaçamento no app-frame mobile.
- LGPD: formulários com consentimento (reuso do fluxo de cadastro US-01); scripts de analytics com aviso/cookie consent (decisão §10).
- Dark mode: aplicado automaticamente (DESIGN §12) — sem toggle na landing.

---

## 7. Relação com Outras Specs

| Dependência | Uso |
|---|---|
| `SPEC-frontend.md` | Tokens, componentes base (Button, Accordion, Toast), breakpoints |
| `DESIGN.md` | Linguagem visual (§13), ilustrações duotone (§5), micro-interações (§7) |
| `SPEC-auth.md` | Fluxo de cadastro/login (US-01, US-02) — CTA leva a `/cadastro` |
| `SPEC-pagamentos.md` | Planos, trial (P0-1/P0-2), checkout (US-16/17/18/32/33/34) |
| `SPEC-conteudo.md` | Amostra (R4), cursos públicos (R-L2) |
| `SPEC-admin.md` | Gestão de depoimentos/FAQ/relatórios (R-L7) |
| `SPEC-mobile.md` | Fora de escopo (PWA cobre) |

---

## 8. Critérios de Aceitação (Definição de Pronto)

1. Todas as seções §3 renderizam em mobile (375px) e desktop (≥1024px), sem overflow.
2. 1 CTA primário por viewport (R-L1); todos os CTAs apontam para o fluxo correto (cadastro/checkout/ânsulas).
3. Prova social exibe somente dados reais ou placeholders neutralizados (R-L3).
4. FAQ com dados estruturados válidos (validação schema.org) e editável (R-L5/R-L7).
5. Eventos de funil disparando (R-L8) e visíveis no dashboard admin.
6. LCP < 2.5s em 4G (tanto em staging quanto produção).
7. Sales page de curso público (R-L2) atende ao paywall (nunca expõe conteúdo — R12 da master).
8. LGPD: consentimento no cadastro e aviso de cookies/analytics.

---

## 9. Métricas de Sucesso (da Landing)

1. **Taxa de conversão visitante → cadastro** (meta inicial: ≥ 5%).
2. **Cadastro → trial iniciado** (meta: ≥ 60%).
3. **Trial → assinatura paga** (meta: ≥ 20%).
4. CTR do CTA hero ≥ 8% (benchmark de referência, validar com dados reais).
5. Bounce rate da landing < 60%.

> Metas são pontos de partida — revisar 30 dias após o primeiro deploy com dados reais.

---

## 10. Decisões (2026-08-13 — aprovadas pelo usuário)

| # | Decisão | Resolução |
|---|---|---|
| L-A1 | Sales page por curso entra no escopo? | **Sim** — nova US-44, entra no S2 (SPEC-conteudo §3.8) |
| L-A2 | Prova social/depoimentos: admin gerencia (CRUD) ou conteúdo versionado no repo? | **Admin CRUD** — mesmo padrão da gestão de conteúdo (S8) |
| L-A3 | Ferramenta de analytics | **Vercel Analytics** (simples, sem consentimento extra) |
| L-A4 | Gestão de consentimento de cookies | **Banner simples** com opt-out de analytics (S1/S2) |
| L-A5 | FAQ: conteúdo da landing ou domínio próprio (suporte)? | **Conteúdo da landing** — reavaliar quando existir volume de suporte |

---

## 11. Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-13 | Versão inicial para aprovação — planejamento de alta conversão (funil §3, CRO §4, SEO/analytics §6/§7, A/B §5) |
| 0.2 | 2026-08-13 | **APROVADO** pelo usuário; decisões §10 resolvidas (sales page S2, admin CRUD S8, Vercel Analytics, banner de consentimento, FAQ na landing) |
