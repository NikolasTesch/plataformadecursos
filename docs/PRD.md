# PRD — ConcursFoco (Plataforma de Estudos para Concursos)

- **Versão**: 2.3
- **Data**: 2026-08-12
- **Status**: [APROVADO]
- **Método**: Spec-Driven Development (PRD → SPEC master → SPECs por domínio → Implementação → Revisão)

---

## 1. Resumo Executivo

Plataforma web de ambiente de estudo para concursos públicos, composta por dois lados:

- **Painel Administrativo**: equipe publica e organiza materiais de estudo (PDF, texto, vídeo, questões), gerencia produtos e usuários.
- **Área do Aluno**: concurseiro acessa o conteúdo, acompanha progresso, faz anotações e responde questões.

Monetização mista: **assinatura mensal** (acesso total enquanto ativa) e **venda única** (acesso permanente a um curso específico), processadas via **Mercado Pago**.

---

## 2. Problema

Estudar para concursos exige organização: o concurseiro precisa de conteúdo centralizado, organizado por disciplina e com acompanhamento de progresso. Materiais espalhados (PDFs soltos, links, apostilas) geram desistência. A plataforma resolve isso com um ambiente único, estruturado e com monitoramento de evolução.

---

## 3. Público-alvo e Personas

### 3.1 Aluno (concurseiro)
- Estudante que trabalha e estuda em horários livres, **predominantemente pelo celular**.
- Precisa: conteúdo organizado, saber o que já estudou, respostas imediatas (gabarito comentado).
- Frustrações atuais: desorganização, não saber o progresso, conteúdo caro e desestruturado.

### 3.2 Administrador / Editor
- Dona(o) da plataforma ou equipe, **sem obrigação de saber programar**.
- Precisa: publicar conteúdo rapidamente, organizar por curso/disciplina, controlar o que está pago ou gratuito.

---

## 4. Objetivos do Produto

1. Centralizar materiais de estudo em estrutura hierárquica: **Curso → Módulos → Materiais**.
2. Dar ao aluno visibilidade clara de progresso por curso e disciplina.
3. Monetizar de duas formas: assinatura mensal e venda única (sem atrito no checkout).
4. Permitir conteúdo em 4 formatos: **PDF, texto formatado, vídeo, questões com gabarito**.
5. Operação simples para o admin: publicação em poucos cliques, com rascunho antes de publicar.

---

## 5. Escopo

### 5.1 MVP (Fase 1)
- Autenticação com roles (aluno/admin), sessão persistente.
- Painel admin: CRUD de cursos, módulos, materiais (4 tipos), rascunho/publicado, gestão de usuários, dashboard com estatísticas básicas.
- Área do aluno: navegação por curso/módulo/material, leitura de PDF, texto, player de vídeo, questões com gabarito, progresso, anotações.
- Pagamentos: assinatura mensal e venda única via Mercado Pago (Checkout Pro + webhooks), gating automático de acesso.
- Responsivo (mobile-first).

### 5.2 Fase 2 — Expansão de escopo (aprovada em 2026-08-12)

O projeto foi expandido para um produto completo. Além do MVP, inclui:

- **Busca de materiais** · **Verificação de email** · **Notificações** (email + in-app) · **Exportação de dados (LGPD)**
- **Trilhas de estudo por edital** (plano ordenado por peso das disciplinas)
- **Flashcards com revisão espaçada** (SM-2 simplificado)
- **Simulados cronometrados** (prova real com correção ao final)
- **Comentários e dúvidas por material** (com resposta do admin)
- **Certificados de conclusão** (PDF com código de verificação)
- **Acesso offline (PWA)** (cache de materiais + sincronização)
- **Admin avançado** (relatórios por material, funil de conversão, retenção por coorte)

Cada domínio tem spec própria em `docs/specs/` (ver SPEC master §4.1).

### 5.2b Features de retenção e conversão (aprovadas em 2026-08-12)

- **Trial gratuito**: 7 dias sem cartão, 1 por usuário (P0-1).
- **Assinatura anual**: período anual configurável, default 2 meses grátis (P0-2).
- **Pix** como meio de pagamento no checkout.
- **Streak diário + meta de estudo** (padrão 30 min/dia) — hábito e retenção.
- **Banco de erros** e **questões favoritas**.
- **Modo prova vs. modo estudo** em blocos de questões.
- **Resumos/mapas mentais** como 5º tipo de material; **impressão de materiais texto em PDF**.
- **Download em lote (ZIP)** de cursos.
- **Rastreamento de editais/concursos**: cadastro manual + scraping com aprovação do admin (P0-3).
- **Busca com indexação do conteúdo de PDFs** (decisão 2026-08-12).

### 5.3 Fora de escopo
- App nativo (mobile) — PWA cobre o requisito de offline.
- Aulas ao vivo, marketplace multi-instrutor, fórum social amplo (comunidade é por material), gameficação completa.

---

## 6. Funcionalidades por Módulo

### 6.1 Autenticação e Usuários
- Cadastro com nome, email e senha (mínimo 8 caracteres).
- Login/logout, sessão persistente (30 dias).
- Roles: `aluno` e `admin` (definidos no banco; primeiro admin via seed).
- Exclusão de conta pelo próprio usuário (LGPD).

### 6.2 Painel Administrativo
- Dashboard: total de alunos, receita, materiais publicados, mais acessados.
- CRUD de **cursos** (nome, descrição, imagem, flag "incluído na assinatura").
- CRUD de **módulos** (nome, ordem dentro do curso).
- CRUD de **materiais** por tipo:
  - `pdf`: upload de arquivo (validado, servido com URL assinada).
  - `texto`: editor rich text.
  - `video`: upload via provedor externo, com transcodificação assíncrona (status: processando → pronto/erro).
  - `questoes`: enunciado, alternativas, gabarito, comentário opcional.
- Estado **rascunho/publicado** + data de publicação.
- Ordenação explícita de materiais dentro do módulo.
- Gestão de produtos: criar/editar/ativar **assinatura** (valor, recorrência mensal) e **venda única** (valor, curso vinculado).

### 6.3 Área do Aluno
- Home: meus cursos (acessíveis), progresso geral.
- Página do curso: módulos e materiais com status (disponível / concluído / bloqueado).
- Visualização de material: PDF em player embutido, texto renderizado, vídeo com HLS, questões interativas com feedback imediato.
- Progresso: concluir material manualmente; vídeo conclui ao terminar; % por curso recalculado.
- Anotações privadas por material.
- Compra/assinatura: página de preços e checkout via Mercado Pago.

### 6.4 Compras e Acesso (Gating)
- **Assinatura ativa** → acesso a todos os cursos marcados como "incluído na assinatura".
- **Venda única** → acesso permanente ao curso comprado.
- Material bloqueado → mostra título e CTA de compra/assinatura, nunca o conteúdo.
- Renovação e expiração automáticas via webhooks do Mercado Pago.

### 6.5 Features expandidas (Fase 2)
- **Trilhas por edital**: admin monta edital (banca, disciplinas com peso), vincula módulos/materiais às disciplinas; aluno ativa trilha e segue plano com progresso por disciplina.
- **Flashcards**: cartões pergunta/resposta criados pelo aluno ou sugeridos a partir de questões erradas; revisão espaçada (SM-2 simplificado).
- **Simulados cronometrados**: admin monta prova a partir de questões existentes com duração; aluno responde com cronômetro, correção ao final, nota e desempenho por disciplina, histórico de tentativas.
- **Comentários/dúvidas**: por material, visíveis a alunos com acesso; admin responde e marca como respondido.
- **Certificados**: PDF gerado ao concluir 100% do curso, com código de verificação pública.
- **PWA/offline**: instalação, cache de PDFs/textos/vídeos baixados, fila de sincronização de progresso, anotações e tentativas.
- **Notificações**: email (novo material, expiração de assinatura, resposta a comentário) + in-app.
- **Admin avançado**: relatórios (views/tempo por material), funil visitante→compra, retenção por coorte, receita por produto, exportação CSV.

---

## 7. Requisitos Não-Funcionais

| Categoria | Requisito |
|---|---|
| **Escala** | Suportar ~500 alunos ativos, pico de ~50 acessos simultâneos. |
| **Desempenho** | Navegação P95 < 2s; início do vídeo < 3s (via CDN); PDF via CDN. |
| **Segurança** | Senhas com hash forte (argon2/bcrypt); autorização SEMPRE no servidor (RBAC); rate limiting em login/checkout; upload validado (tipo MIME e tamanho máx.: 100MB PDF, 2GB vídeo); URLs assinadas para arquivos privados. |
| **LGPD** | Consentimento no cadastro; exclusão de conta com remoção de dados pessoais (registros de compra anonimizados, por obrigação fiscal); dados em trânsito criptografados (HTTPS). |
| **Disponibilidade** | Alvo 99%; backup diário do banco. |
| **Mobile** | Layout responsivo, mobile-first. |
| **Acessibilidade** | Contraste AA, textos com `alt`, navegação por teclado no player. |

---

## 8. Métricas de Sucesso

1. **Ativação**: % de cadastros que acessam o primeiro material em 7 dias.
2. **Retenção**: alunos ativos D7 e D30.
3. **Engajamento**: % médio de materiais concluídos por curso.
4. **Conversão**: visitantes → checkout → pagamento aprovado.
5. **Receita recorrente vs. avulsa**: proporção entre os dois modelos.

---

## 9. Stack e Decisões Técnicas

| Tema | Decisão |
|---|---|
| **Framework** | Next.js (App Router) + TypeScript — fullstack em um projeto |
| **Banco** | PostgreSQL (hosted: Neon/Supabase/Railway) — **dev local via Docker** (decisão 2026-08-12) |
| **ORM** | Prisma |
| **Auth** | Auth.js (NextAuth v5) com credenciais + roles |
| **Storage PDFs** | Cloudflare R2 + URLs assinadas |
| **Vídeo** | Bunny Stream (transcodificação automática HLS, player embutido) |
| **Pagamento** | Mercado Pago — Checkout Pro (assinatura + venda única) + webhooks |
| **Deploy** | Vercel |
| **Testes** | Vitest (unitário), Playwright (E2E) |
| **Estrutura** | Lógica de negócio em `src/services/`, nunca em rotas |

---

## 10. Decisões Resolvidas e Abertas

**Resolvidas:**
1. ~~Provedor de vídeo~~ → **Bunny Stream** (aprovado em 2026-08-12).
2. ~~Especificação~~ → **SPEC v1.0 aprovada** em 2026-08-12.
3. ~~Nome do produto~~ → **ConcursFoco** (decisão do usuário em 2026-08-13 durante prototipagem).

**Abertas (não bloqueiam implementação):**
4. Verificação de email no MVP (recomendação: adiar para Fase 2 — já prevista como US-22).
5. Material de amostra gratuita (recomendação: sim, máx. 1 por curso — já previsto na SPEC como R4).

---

## 11. Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-12 | Versão inicial para aprovação |
| 1.0 | 2026-08-12 | Aprovada. Decisão de vídeo: Bunny Stream |
| 2.0 | 2026-08-12 | Escopo expandido (Fase 2 completa). Specs por domínio em `docs/specs/` |
| 2.1 | 2026-08-12 | Features de retenção/conversão (trial, anual, Pix, streak, relatório semanal, banco de erros, favoritas, modo prova, resumos, impressão, ZIP, rastreamento de editais) |
| 2.2 | 2026-08-12 | Revisão de pendências: relatório semanal removido; múltiplas trilhas ativas; busca indexa PDFs |
| 2.3 | 2026-08-13 | Nome do produto definido: **ConcursFoco** |
