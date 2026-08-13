# SPEC — Plataforma de Estudos para Concursos

- **Versão**: 2.4
- **Data**: 2026-08-13
- **Status**: [APROVADA — contrato de implementação ativo]
- **Formato**: Spec-Driven Development — declarativa, descreve **o que** o sistema deve fazer, nunca **como**. Cada comportamento é verificável e testável.

---

## 1. Objetivo

Definir o comportamento contratual da plataforma: ambiente de estudo para concursos com painel administrativo (publicação de conteúdo) e área do aluno (consumo com progresso), monetizada por assinatura mensal e venda única via Mercado Pago.

Esta spec é o contrato de implementação. **Nenhuma feature fora desta spec será implementada no MVP.** Mudanças entram por revisão de spec.

---

## 2. Glossário

| Termo | Definição |
|---|---|
| **Aluno** | Usuário autenticado com role `aluno`, consumidor de conteúdo. |
| **Admin** | Usuário autenticado com role `admin`, gestor de conteúdo/produtos/usuários. |
| **Curso** | Agrupamento top-level de conteúdo (ex.: "Concurso TRT — Técnico"). |
| **Módulo** | Seção dentro de um curso (ex.: "Direito Constitucional"). |
| **Material** | Unidade de conteúdo dentro de um módulo. Tipos: `pdf`, `texto`, `video`, `questoes`. |
| **Produto** | Item comercial. Tipos: `assinatura` (recorrência mensal) e `venda_unica` (curso específico). |
| **Entitlement** | Direito de acesso de um aluno a um produto (com ou sem data de expiração). |
| **Amostra** | Material marcado como gratuito para demonstração (máx. 1 por curso). |
| **Rascunho** | Estado de material não visível para alunos. |

---

## 3. Papéis e Permissões

| Ação | Visitante | Aluno | Admin |
|---|---|---|---|
| Ver landing e página de preços | ✅ | ✅ | ✅ |
| Cadastrar / logar | ✅ | — | — |
| Ver navegação e materiais com entitlement | — | ✅ | ✅ |
| Ver materiais bloqueados (título + CTA) | — | ✅ | ✅ |
| Comprar/assinar | — | ✅ | ✅ |
| Concluir materiais, fazer anotações, responder questões | — | ✅ | ✅ |
| CRUD de cursos, módulos, materiais, produtos | — | — | ✅ |
| Ver dashboard de estatísticas | — | — | ✅ |
| Gerenciar usuários (listar, bloquear) | — | — | ✅ |

Autorização é validada **sempre no servidor**. Regras de UI são apenas apresentação.

---

## 4. Comportamento do Sistema (User Stories + Critérios de Aceitação)

### 4.1 Índice de Specs por Domínio

O detalhamento de cada domínio vive em `docs/specs/SPEC-<dominio>.md`. A spec master define o contrato global (US abaixo + regras R1–R12); as specs de domínio detalham comportamento específico e entram no fluxo SDD individualmente.

| Domínio | Arquivo | Status |
|---|---|---|
| Autenticação, sessão, usuários | `SPEC-auth.md` | ✅ [APROVADO] |
| Conteúdo: cursos, módulos, materiais, publicação, busca | `SPEC-conteudo.md` | ✅ [APROVADO] |
| Vídeo (Bunny Stream, player, posição) | `SPEC-video.md` | ✅ [APROVADO] |
| Questões e simulados cronometrados | `SPEC-questoes.md` | ✅ [APROVADO] |
| Área do aluno: navegação, gating, progresso, anotações, certificados, PWA | `SPEC-aluno.md` | ✅ [APROVADO] |
| Produtos, checkout, webhooks Mercado Pago | `SPEC-pagamentos.md` | ✅ [APROVADO] |
| Dashboard e relatórios admin | `SPEC-admin.md` | ✅ [APROVADO] |
| Trilhas de estudo por edital | `SPEC-trilhas.md` | ✅ [APROVADO] |
| Flashcards e revisão espaçada | `SPEC-flashcards.md` | ✅ [APROVADO] |
| Comentários e dúvidas | `SPEC-comunidade.md` | ✅ [APROVADO] |
| Notificações (email + in-app) | `SPEC-notificacoes.md` | ✅ [APROVADO] |
| Streak e meta diária de estudo | `SPEC-engajamento.md` | ✅ [APROVADO] |
| Rastreamento de editais e concursos | `SPEC-editais.md` | ✅ [APROVADO] |
| Design system e experiência de interface | `SPEC-frontend.md` | ✅ [APROVADO — 2026-08-13] |
| Landing de alta conversão (rota `/`) | `SPEC-landing.md` | [PENDENTE] — proposta 2026-08-13 |
| Mobile (app nativo) | `SPEC-mobile.md` | [IDEALIZAÇÃO] — não implementar |

### US-01 — Registro de aluno
**Como** visitante, **quero** criar uma conta **para** acessar a plataforma.

- Deve coletar nome, email e senha (mín. 8 caracteres).
- Email deve ser único; erro amigável se já cadastrado.
- Senha armazenada com hash forte (argon2/bcrypt).
- Após o registro, o usuário é autenticado e redirecionado à área do aluno.
- Aceite do termo de consentimento (LGPD) é obrigatório para concluir.
- Verificação de email: **fora do escopo do MVP** (decisão 3 do PRD).

### US-02 — Login e sessão
**Como** aluno/admin, **quero** entrar na plataforma **para** acessar meu conteúdo.

- Credenciais válidas criam sessão; inválidas retornam erro genérico ("email ou senha incorretos").
- Sessão persiste por 30 dias; logout encerra a sessão.
- Rate limiting: máx. 5 tentativas/min por IP/email.
- Usuários bloqueados pelo admin não conseguem logar (mensagem "conta suspensa").

### US-03 — Admin gerencia cursos
**Como** admin, **quero** criar/editar/excluir cursos **para** organizar o conteúdo.

- Campos: nome, descrição, imagem (opcional), slug único, flag `incluido_assinatura`.
- Excluir curso exige confirmação; ao excluir, módulos e materiais são removidos em cascata (com aviso de irreversibilidade).
- Curso publicado não é um conceito separado: o curso existe e seus materiais controlam visibilidade.

### US-04 — Admin gerencia módulos
**Como** admin, **quero** criar/editar/excluir módulos dentro de um curso **para** estruturar disciplinas.

- Campos: nome, ordem (inteiro).
- Módulos de um curso são exibidos ao aluno ordenados por `ordem`.

### US-05 — Admin cria material do tipo PDF
**Como** admin, **quero** publicar PDFs **para** fornecer apostilas.

- Upload com validação: MIME `application/pdf`, máx. 100MB.
- Arquivo armazenado em storage privado (R2); acesso ao aluno via **URL assinada com validade de 10 min**, gerada no momento do acesso.
- PDFs são exibidos em viewer embutido (não download direto).

### US-06 — Admin cria material do tipo Texto
**Como** admin, **quero** escrever materiais em texto formatado **para** publicar conteúdo direto.

- Editor rich text (títulos, listas, negrito, imagens inline, links).
- Conteúdo persistido como HTML sanitizado na renderização.

### US-07 — Admin cria material do tipo Vídeo
**Como** admin, **quero** publicar videoaulas **para** ensinar em vídeo.

- Upload de vídeo (máx. 2GB) enviado ao provedor externo (decisão aberta; Bunny Stream recomendado).
- Transcodificação assíncrona: status `processando` → `pronto` | `erro`.
- Material com status `erro` não pode ser publicado; exibe mensagem ao admin.
- Aluno assiste via player HLS embutido, streaming via CDN.
- O player **lembra a posição** do aluno (retomar de onde parou).

### US-08 — Admin cria material do tipo Questões
**Como** admin, **quero** criar blocos de questões **para** treinar o aluno.

- Cada questão: enunciado, 4-5 alternativas, gabarito (1 correta), comentário opcional.
- Admin define quantas questões o bloco contém; não há limite fixo.

### US-09 — Admin publica/despublica materiais
**Como** admin, **quero** controlar a visibilidade dos materiais **para** preparar conteúdo com calma.

- Material nasce como `rascunho`; admin o move para `publicado` (registra `publicado_em`).
- Rascunho: invisível para alunos, visível no admin com badge.
- Despublicar torna o material inacessível **imediatamente** para alunos.

### US-10 — Admin gerencia produtos
**Como** admin, **quero** configurar preços **para** vender acesso.

- Criar `assinatura`: nome, preço mensal, status ativo/inativo.
- Criar `venda_unica`: nome, preço, curso vinculado (1 produto avulso por curso), status.
- Produtos inativos não aparecem na página de preços.

### US-11 — Aluno navega pela estrutura
**Como** aluno, **quero** navegar cursos → módulos → materiais **para** estudar de forma organizada.

- Home do aluno: lista de cursos com progresso (% concluído).
- Página do curso: módulos em ordem, materiais em ordem com status:
  - `disponivel` (tem acesso, não concluído)
  - `concluido` (marcado)
  - `bloqueado` (sem entitlement — título + cadeado)
  - `amostra` (gratuito, badge "Amostra")
- Curso sem nenhum material publicado não aparece na home do aluno.

### US-12 — Aluno acessa material (Gating)
**Como** aluno, **quero** abrir um material **para** estudar.

- Acesso permitido se: curso do material está `incluido_assinatura` E assinatura do aluno está ativa, OU aluno tem `venda_unica` do curso, OU material é `amostra`.
- Regra de acesso avaliada no servidor a cada abertura — **nunca** baseada em estado do cliente.
- Sem entitlement: mostra título, tipo e CTA ("Assinar" ou "Comprar curso") conforme produto existente; conteúdo nunca é enviado ao cliente.

### US-13 — Aluno responde questões
**Como** aluno, **quero** responder questões e ver o resultado **para** treinar.

- Aluno seleciona alternativa e recebe feedback imediato: correta/errada + gabarito + comentário (se houver).
- Tentativa é salva (questão, alternativa escolhida, acerto/erro).
- O material é exibido com taxa de acerto do aluno no bloco (ex.: "7/10 acertos").
- Não há limite de tentativas.

### US-14 — Aluno controla progresso
**Como** aluno, **quero** ver meu progresso **para** saber o que já estudei.

- Aluno marca material como concluído manualmente (toggle).
- Vídeo: conclui automaticamente ao chegar aos últimos 10 segundos (ou manual).
- Progresso do curso = materiais concluídos ÷ materiais publicados acessíveis, mostrado como %.
- Excluir conta apaga progresso e anotações (LGPD).

### US-15 — Aluno faz anotações
**Como** aluno, **quero** anotar nos materiais **para** revisar depois.

- Criar/editar/excluir anotação vinculada a um material (texto livre).
- Anotações são privadas e visíveis apenas na área do aluno.

### US-16 — Aluno compra (Checkout Mercado Pago)
**Como** aluno, **quero** assinar ou comprar um curso **para** liberar acesso.

- Página de preços lista produtos ativos: assinatura + cursos avulsos.
- Fluxo: escolher produto → checkout Mercado Pago (Checkout Pro) → retorno à plataforma com estado `pendente` ("aguardando confirmação").
- Aluno não pode comprar venda única de um curso que já possui entitlement permanente.

### US-17 — Webhook processa pagamento
**Como** sistema, **quero** processar notificações do Mercado Pago **para** conceder/revogar acesso.

- Pagamento aprovado (assinatura): criar/renovar entitlement com `acesso_ate = now + 30 dias`.
- Pagamento aprovado (venda única): criar entitlement **permanente** (`acesso_ate = null`).
- Pagamento recusado/cancelado: nenhum acesso concedido.
- Processamento idempotente: o mesmo webhook entregue 2x não duplica ou quebra o estado.
- Webhook é validado (assinatura HMAC) — chamadas não autenticadas são rejeitadas.

### US-18 — Renovação e expiração de assinatura
**Como** sistema, **quero** manter assinaturas em dia **para** garantir acesso correto.

- Renovação aprovada pelo MP: estende `acesso_ate` +30 dias a partir do fim atual (nunca do presente).
- Assinatura vencida: acesso revogado automaticamente; materiais voltam a `bloqueado`.
- Sem notificação por email no MVP (Fase 2).

### US-19 — Admin acompanha estatísticas
**Como** admin, **quero** ver números da plataforma **para** tomar decisões.

- Dashboard com: total de alunos (ativos/mês), receita (assinatura e avulsa), materiais mais acessados, % médio de conclusão por curso.
- Dados de receita vêm dos registros internos de compra.

### US-20 — Gestão de usuários pelo admin
**Como** admin, **quero** listar e bloquear usuários **para** moderar a plataforma.

- Lista de alunos com nome, email, produtos, data de cadastro.
- Bloquear/desbloquear aluno (bloqueado não loga — US-02).

### US-21 — Busca de materiais
**Como** aluno, **quero** buscar materiais **para** encontrar conteúdo rapidamente.

- Busca por título e conteúdo (texto/PDF indexado); filtros por tipo e curso.
- Resultados limitados a materiais acessíveis + amostras (R1–R12 aplicadas).

### US-22 — Verificação de email
**Como** aluno, **quero** verificar meu email **para** receber notificações e recuperar conta.

- Após cadastro, email de verificação com token (validade 24h, reenvio com rate limit).
- Conta não verificada: acesso ao conteúdo permitido, badge "não verificado"; notificações transacionais dependem de verificação.

### US-23 — Notificações (email + in-app)
**Como** aluno, **quero** ser notificado **para** não perder conteúdo novo e vencimentos.

- Eventos: novo material publicado em curso acessível, expiração de assinatura (3 dias antes), resposta a comentário.
- In-app: central de notificações com não-lidas; email: transacional (verificação, expiração) e digest opcional.

### US-24 — Exportação de dados (LGPD)
**Como** aluno, **quero** exportar meus dados **para** portabilidade.

- Gera pacote (JSON/ZIP) com dados pessoais, progresso, anotações e histórico — via UI, sem depender de suporte.

### US-25 — Trilhas de estudo por edital
**Como** aluno, **quero** seguir uma trilha baseada no edital **para** estudar na ordem certa.

- Admin cria edital (nome, banca, disciplinas com peso) e vincula materiais/módulos a disciplinas.
- Aluno ativa trilha; vê plano ordenado por peso, progresso por disciplina e conclusão da trilha.

### US-26 — Flashcards e revisão espaçada
**Como** aluno, **quero** revisar flashcards **para** memorizar conteúdo.

- Cartões pergunta/resposta criados pelo aluno ou sugeridos de questões erradas.
- Revisão espaçada (SM-2 simplificado): intervalos crescentes por nível; fila diária de revisões.

### US-27 — Simulados cronometrados
**Como** aluno, **quero** fazer simulados **para** treinar no formato da prova.

- Admin monta simulado (questões existentes + duração + instruções); aluno responde com cronômetro.
- Entrega automática ao estourar o tempo; correção ao final com nota, desempenho por disciplina e histórico de tentativas.

### US-28 — Comentários e dúvidas
**Como** aluno, **quero** comentar em materiais **para** tirar dúvidas.

- Comentário por material (autenticado, com acesso ao material); admin responde e marca como "respondido".
- Ordenação por data; notificação de resposta (US-23).

### US-29 — Certificados de conclusão
**Como** aluno, **quero** obter certificado ao concluir curso **para** comprovar estudos.

- 100% dos materiais acessíveis concluídos → certificado PDF disponível (nome, curso, data, código de verificação público).

### US-30 — Acesso offline (PWA)
**Como** aluno, **quero** estudar offline **para** aproveitar deslocamentos.

- Instalação PWA; download gerenciado de materiais (PDF/texto, vídeo via Bunny, flashcards, simulados baixados).
- Operações offline (progresso, anotações, tentativas) enfileiradas e sincronizadas ao reconectar; gating aplicado no momento do download e da sincronização.

### US-31 — Admin avançado: relatórios
**Como** admin, **quero** relatórios detalhados **para** entender uso e conversão.

- Views/tempo por material, funil visitante→cadastro→compra, retenção por coorte, receita por produto, exportação CSV.

### US-32 — Trial gratuito
**Como** visitante/aluno, **quero** experimentar a assinatura **para** decidir antes de pagar.

- 7 dias, sem cartão, 1 trial por usuário (P0-1); concede acesso equivalente à assinatura; não renovável nem conversível automaticamente. Detalhe: `SPEC-pagamentos.md` §3.1b.

### US-33 — Assinatura anual
**Como** aluno, **quero** pagar anualmente **para** economizar e garantir acesso.

- Assinatura com 2 períodos (mensal e anual); preço anual configurável, default 2 meses grátis (P0-2); renovação soma +365 dias. Detalhe: `SPEC-pagamentos.md`.

### US-34 — Pagamento via Pix
**Como** aluno, **quero** pagar com Pix **para** usar o meio mais comum no Brasil.

- Pix disponível no Checkout Pro; fluxo de webhook idêntico ao cartão. Detalhe: `SPEC-pagamentos.md`.

### US-35 — Streak e meta diária
**Como** aluno, **quero** ver meus dias seguidos e bater minha meta **para** manter constância.

- Streak de dias consecutivos de estudo; meta diária padrão 30 min configurável (15–90). Detalhe: `SPEC-engajamento.md`.

> **US-36 (relatório semanal) — REMOVIDA do escopo em 2026-08-12** (decisão do usuário na revisão de pendências).

### US-37 — Banco de erros
**Como** aluno, **quero** revisar questões erradas **para** corrigir lacunas.

- Área "Meus erros" com questões de última tentativa errada; sai após 2 acertos seguidos; integra flashcards. Detalhe: `SPEC-questoes.md`.

### US-38 — Questões favoritas
**Como** aluno, **quero** marcar questões **para** revisar as mais importantes.

- Favoritar/desfavoritar em blocos e simulados; área dedicada; independente de tentativas. Detalhe: `SPEC-questoes.md`.

### US-39 — Modo prova vs. modo estudo
**Como** aluno, **quero** treinar sem gabarito **para** simular a prova em blocos.

- Blocos de questões com modo prova (correção em lote no fim) e modo estudo (feedback imediato). Detalhe: `SPEC-questoes.md`.

### US-40 — Material do tipo Resumo
**Como** admin, **quero** publicar resumos/mapas mentais **para** oferecer revisão rápida.

- 5º tipo de material (`resumo`), editor de tópicos + quadro sinóptico, mesmo gating. Detalhe: `SPEC-conteudo.md`.

### US-41 — Impressão de material texto
**Como** aluno, **quero** imprimir/baixar material texto em PDF **para** estudar em papel.

- PDF gerado sob demanda com gating; sem cache persistente. Detalhe: `SPEC-conteudo.md`.

### US-42 — Rastreamento de editais
**Como** aluno, **quero** acompanhar concursos e prazos **para** não perder inscrições.

- Concursos de fonte manual + scraping (aprovação do admin); seguir concurso; alertas de inscrição/prova. Detalhe: `SPEC-editais.md`.

### US-43 — Download em lote de curso
**Como** aluno, **quero** baixar o curso inteiro em ZIP **para** estudar offline sem baixar item por item.

- ZIP assíncrono: PDFs, textos, questões (sem gabarito); vídeos fora; URL assinada 24h; gating duplo. Detalhe: `SPEC-aluno.md` §3.7.

---

## 5. Regras de Negócio (Consolidadas)

| # | Regra |
|---|---|
| R1 | Acesso ao material: `assinatura ativa` (curso incluído) **OU** `venda_unica` (curso) **OU** `amostra`. |
| R2 | Assinatura ativa = `acesso_ate >= now` e produto ativo. |
| R3 | Venda única é permanente (sem expiração). |
| R4 | `amostra`: máx. 1 por curso, definida pelo admin, visível sem entitlement. |
| R5 | Rascunho nunca é visível/entregue a alunos. |
| R6 | Ordem de exibição: módulos e materiais por `ordem` crescente. |
| R7 | Gating é avaliado no servidor a cada requisição de conteúdo. |
| R8 | Renovação soma 30 dias ao `acesso_ate` atual (não ao presente). |
| R9 | Compra avulsa duplicada de curso já possuído é bloqueada (US-16). |
| R10 | Exclusão de conta: remove dados pessoais; registros de compra são anonimizados (obrigação fiscal). |
| R11 | Material `video` com status `erro` não pode ser publicado. |
| R12 | Material bloqueado nunca envia conteúdo (nem PDF, nem vídeo, nem texto) ao cliente. |

---

## 6. Exemplos End-to-End (Given / When / Then)

### E2E-1 — Assinatura concede acesso total
**Given** curso "TRT" marcado como incluído na assinatura e aluno com assinatura ativa
**When** o aluno abre um material publicado do curso
**Then** o conteúdo é entregue e o material fica `disponivel`

### E2E-2 — Venda única concede acesso permanente
**Given** aluno comprou venda única do curso "INSS" (pagamento aprovado)
**When** a assinatura do aluno expira 3 meses depois
**Then** o acesso ao curso "INSS" permanece ativo, e materiais de outros cursos voltam a `bloqueado`

### E2E-3 — Rascunho invisível
**Given** material em estado `rascunho` no curso "TRT"
**When** o aluno navega pelo curso "TRT"
**Then** o material não aparece em lugar nenhum da área do aluno

### E2E-4 — Sem entitlement, conteúdo protegido
**Given** aluno sem assinatura e sem compra do curso "TRT"
**When** o aluno tenta abrir material não-amostra do curso
**Then** a resposta do servidor é bloqueio (não 404, nem conteúdo), e a UI mostra título + CTA

### E2E-5 — Renovação estende a partir do fim
**Given** assinatura com `acesso_ate = 15/09`
**When** renovação é aprovada em 10/09
**Then** `acesso_ate` passa a 15/10 (não 10/10)

### E2E-6 — Webhook idempotente
**Given** webhook de pagamento aprovado entregue 2 vezes pelo MP
**When** o sistema processa as duas chamadas
**Then** o entitlement é criado/renovado uma única vez, sem corromper `acesso_ate`

### E2E-7 — Progresso recalcula
**Given** curso com 4 materiais publicados acessíveis
**When** o aluno conclui 1 e o vídeo de outro termina sozinho
**Then** o progresso do curso exibe 50%

---

## 7. Não-Objetivos (MVP + Fase 2)

- Aulas ao vivo, marketplace multi-instrutor, fórum social amplo, gameficação completa, app nativo (mobile é idealização — `SPEC-mobile.md`).

---

## 8. Critérios de Aceitação Globais (Definição de Pronto)

1. Todas as US ativas (01–35, 37–43 — US-36 removida) implementadas e verificáveis conforme seus critérios (US 21–43 conforme specs de domínio aprovadas).
2. Testes E2E (Playwright) cobrindo: registro/login, fluxo completo admin (criar curso → módulo → material → publicar), gating (E2E-1 a E2E-7), webhook.
3. Testes unitários obrigatórios para o motor de gating (R1–R12) e cálculo de progresso.
4. Seed de dados de exemplo (1 curso, 2 módulos, materiais dos 4 tipos, 1 produto de cada tipo).
5. Deploy funcional em ambiente de staging com banco e storage reais.
6. Sem regressão nas regras de negócio — o código existente (se houver) permanece compatível.
7. Cada spec de domínio `[PENDENTE]` é aprovada antes de seu slice ser implementado.

---

## 9. Decisões Abertas

1. Confirmação da R4: 1 material de amostra por curso (já previsto; ativo por padrão).
2. Framework do app mobile — somente quando os gatilhos da `SPEC-mobile.md` forem atingidos.

> Resolvida em 2026-08-13: nome do produto → **ConcursFoco** (PRD v2.3, DESIGN.md §8).

---

## 10. Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-12 | Versão inicial para aprovação |
| 1.0 | 2026-08-12 | **Aprovada** — contrato de implementação ativo. Provedor de vídeo: Bunny Stream (comportamento inalterado) |
| 2.0 | 2026-08-12 | Escopo expandido: US-21 a US-31 (busca, verificação de email, notificações, exportação LGPD, trilhas, flashcards, simulados, comentários, certificados, PWA, admin avançado). Índice de specs por domínio (§4.1). Mobile = idealização futura |
| 2.1 | 2026-08-12 | Features de retenção/conversão: US-32 a US-43 (trial 7d, plano anual, Pix, streak/meta, relatório semanal, banco de erros, favoritas, modo prova, resumos, impressão PDF, rastreamento de editais, download ZIP). Novos domínios: engajamento, editais |
| 2.2 | 2026-08-12 | Revisão de pendências: US-36 (relatório semanal) **removida**; T4 múltiplas trilhas ativas; busca indexa conteúdo de PDFs |
| 2.3 | 2026-08-13 | Índice de specs (§4.1) sincronizado com o estado real (14 domínios [APROVADO], frontend aprovado em 2026-08-13); decisão aberta "nome do produto" resolvida → ConcursFoco |
| 2.4 | 2026-08-13 | Novo domínio proposto: landing de alta conversão (`SPEC-landing.md` v0.1 [PENDENTE]) — índice §4.1 atualizado |
