# SPEC-MOBILE — Idealização: Plataforma Mobile (app nativo)

- **Versão**: 0.1
- **Data**: 2026-08-12
- **Status**: [IDEALIZAÇÃO] — documento de visão. **Não implementar agora.** Não define escopo ativo.
- **Relação**: complementa a SPEC master (`docs/SPEC.md`) e o PRD (`docs/PRD.md`). Nenhuma regra daqui altera contratos vigentes.

---

## 1. Propósito deste documento

Registrar a visão de **ampliar a plataforma para mobile (app nativo)** como evolução futura do produto. Serve para:

1. Manter a decisão registrada (ADR) — o tema não se perde e não vira escopo por acidente.
2. Orientar escolhas de arquitetura **hoje** que facilitem o mobile amanhã (API limpa, gating server-side, URLs assinadas).
3. Definir gatilhos objetivos para quando a implementação for iniciada.

**Isso NÃO é uma spec de implementação.** Não possui user stories ativas nem critérios de aceitação vinculantes.

---

## 2. Contexto e Motivação

- O público-alvo (concurseiro) estuda **predominantemente pelo celular** (PRD §3.1).
- O MVP/expandido entrega web responsiva + PWA offline. Um app nativo traria: notificações push confiáveis, download offline robusto, player em segundo plano, desempenho e presença nas lojas.
- O produto web ainda será construído — **não há app sem plataforma web estável**.

---

## 3. Visão do produto mobile

Aplicativo nativo (Android + iOS) espelhando a área do aluno: estudar PDF/texto/vídeo, responder questões e simulados, revisar flashcards, seguir trilhas, receber notificações e estudar offline. Admin permanece web-only.

### 3.1 Diferenciais mobile vs. web
- Notificações push (novo material, revisões pendentes, expiração de assinatura).
- Download para estudo offline (PDF, vídeo via Bunny, flashcards, simulados).
- Player de vídeo em segundo plano / picture-in-picture.
- Desbloqueio por biometria.
- Widget de progresso diário na tela inicial.
- Compra via lojas (assinatura) ou webview do Mercado Pago.

---

## 4. Escopo funcional futuro (alto nível)

| Área | App mobile |
|---|---|
| Auth | Login/cadastro, biometria, sessão compartilhada com web |
| Conteúdo | Leitura de PDF, texto, player HLS, questões, simulados |
| Estudo | Progresso, anotações, flashcards, trilhas, revisão espaçada |
| Comunidade | Comentários/dúvidas |
| Offline | Download gerenciado, sincronização de progresso/anotações/tentativas |
| Pagamento | Assinatura via loja (IAP) e/ou Mercado Pago; sincronização de entitlements |
| Notificações | Push: novos materiais, revisões, expiração de assinatura |

Fora do app: painel admin, certificados (gerados na web), relatórios.

---

## 5. Arquitetura prevista (a confirmar na época)

```
[App nativo — React Native/Expo ou Flutter]
        │  HTTPS + JWT (API REST)
        ▼
[API da plataforma — mesma base Next.js/PostgreSQL]
        │
        ├── Gating server-side (regras R1–R12 da SPEC master — reaproveitadas)
        ├── URLs assinadas (PDF/vídeo)
        └── Webhooks Mercado Pago + notificações push
```

Princípios que **já valem desde o início do projeto web** (não custam nada agora e habilitam o app depois):

| Decisão web (vigente) | Por que ajuda o mobile |
|---|---|
| Gating avaliado no servidor (R7) | App nunca carrega conteúdo sem autorização — segurança idêntica |
| API em rotas finas + services (`src/services/`) | Contratos claros reutilizáveis pelo app |
| URLs assinadas com expiração | App não precisa de credenciais de storage |
| Sessão via Auth.js | Padrão de token/refresh compatível com clientes nativos |
| PWA com fila de sincronização | A lógica offline testada na web migra para o app |

---

## 6. Gatilhos para iniciar a implementação (todos devem ocorrer)

1. **Plataforma web estável em produção** com Fase 2 entregue e operando há ≥ 3 meses.
2. **Demanda validada**: sinal de uso mobile real alto (ex.: > 40% dos acessos em dispositivos móveis, solicitações de alunos).
3. **Capacidade**: time/recursos para manter 2 superfícies (web + app) sem degradar a web.
4. **API versionada** e documentada (contratos estáveis para o app).

---

## 7. Riscos e Considerações

- **Custo duplo de manutenção**: app nativo exige ciclo de release, revisão de loja e suporte de plataforma (Google/Apple).
- **PWA pode adiar o app**: se o PWA (escopo Fase 2) cobrir 80% da necessidade offline, o app nativo pode ser adiado — decisão reavaliada nos gatilhos.
- **Monetização nas lojas**: IAP (assinatura via loja) implica comissão de 15–30% — avaliar manter checkout via Mercado Pago dentro do app (políticas da loja permitem compra de conteúdo digital fora do IAP com restrições — validar na época).
- **Sincronização**: conflitos de progresso/anotações offline vs. online exigem estratégia (last-write-wins + carimbo de tempo, no mínimo).

---

## 8. Não-objetivos (deste documento e da fase atual)

- ❌ Definir user stories implementáveis agora.
- ❌ Escolher framework do app (React Native vs. Flutter vs. outro) — decisão na época dos gatilhos.
- ❌ Criar qualquer estrutura de código.
- ❌ Alterar contratos já aprovados (SPEC master/PRD).

---

## 9. Decisões e Registro

| Data | Decisão |
|---|---|
| 2026-08-12 | Mobile registrado como idealização futura; arquitetura web deve manter API limpa e gating server-side para não inviabilizar o app |

---

## 10. Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-12 | Criação — idealização de expansão mobile |
