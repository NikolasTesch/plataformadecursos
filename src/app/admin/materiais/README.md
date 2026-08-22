# src/app/admin/materiais — Gestão de materiais

## Função

CRUD de materiais de estudo (URL `/admin/materiais`), de uso exclusivo do admin. Suporta os tipos `pdf | texto | video | questoes | resumo` (US-05, US-06, US-07, US-08, US-40). A edição de material `questoes` incorpora o CRUD administrativo de questões do S4; vídeo é criado como rascunho e seu upload é iniciado por action separada. Estrutura comum: título (obrigatório), `tipo`, `ordem`, `status` (`rascunho | publicado`), `publicado_em` e `amostra` (boolean, default false).

## Arquitetura

- Página sob o layout **admin-shell** (versão mínima do S2 — ver `src/app/admin/README.md`).
- Rotas finas: `page.tsx` server carrega o material (`obterMaterial`) e o breadcrumb via serviços (`cursos/_dados.ts`); `actions.ts` contém as server actions (requireRole + parse + service + respond) — CRUD genérico não recebe `video_provider_id`/`video_status`; `iniciarUploadVideoAction` delega o upload a `src/services/video`.
- Upload de PDF: **presigned direct** — a action `criarPresignUploadAction` pede a URL pré-assinada ao storage (`getStorage().createPresignedUpload`, fluxo documentado no README de `src/lib/storage`), o client faz PUT direto na URL (bytes nunca passam pelo servidor) e guarda a `arquivo_key` no material. Em dev sem credenciais R2, o stub responde em `http://127.0.0.1:3000/stub-storage/{key}` — o PUT é recebido pela rota `src/app/api/stub-storage/[...key]` (somente modo stub, admin-gated) e persistido localmente via `StubStorageDriver.salvarArquivo` (fluxo completo documentado no notepad s2-conteudo).
- Formulário client `material-form.tsx` adaptado por tipo; para `questoes`, `questoes-manager.tsx` gerencia o CRUD após o material existir. Publicar/despublicar são ações explícitas (`publicarMaterialAction`/`despublicarMaterialAction` — R5 imediato); o status do select só é enviado quando muda.
- Após criar/atualizar um PDF, a server action dispara a indexação de texto no serviço de conteúdo. A indexação usa a leitura server-side do storage e falha de parser é degradada para busca por título, sem bloquear o restante da action.

```
src/app/admin/materiais/
├── README.md            # este arquivo
├── actions.ts           # server actions (criar/atualizar/publicar/despublicar/presign)
├── material-form.tsx    # client: form por tipo
├── novo/
│   └── page.tsx         # /admin/materiais/novo?module_id=&curso_id=&tipo=
└── [id]/
    └── page.tsx         # /admin/materiais/[id] — edição + publicação
```

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Rota criada antes do código (estrutura + README), seguindo o contrato do plano de implementação |
| 2026-08-14 | PDF: MIME verificado por magic bytes (não só extensão), máx. 100MB; acesso por URL assinada de 10 min, download direto não exposto (SPEC-conteudo.md:47-50) |
| 2026-08-15 | S2 todo 12: formulário por tipo (texto/resumo = textarea HTML simples; editor rich-text completo é slice de frontend), pdf com presigned upload end-to-end no stub, video estrutural (S5), questoes aviso (S4); C2 exibido como alerta vindo do `ErroConteudo` |
| 2026-08-15 | Chave do PDF: `materials/{cursoId}/{id}.pdf` — na criação usa uuid provisório gerado no client (o material ainda não existe); na edição usa o id real (fluxo documentado no notepad) |
| 2026-08-15 | Magic bytes + limite 100MB validados no CLIENTE antes do PUT (espelho UX de C3) e novamente no servidor: limite no presign (driver) e magic bytes na rota stub (dev) |
| 2026-08-17 | S2 todo 11: indexação pós-upload via `pdf-parse`; falha registrada e não bloqueante; `conteudo_busca` mantém título como fallback |
| 2026-08-18 | S4.1: CRUD administrativo de questões dentro da edição do material `questoes`; autorização nas actions e comentário sanitizado |
| 2026-08-19 | S4 concluído e aprovado após gate técnico e QA manual integrado F1–F4 |
| 2026-08-19 | S5: CRUD genérico não manipula credenciais/status de vídeo; `VideoUploadPanel` valida metadados e usa TUS direto |
| 2026-08-19 | Upload em processamento renova o mesmo GUID TUS; novos GUIDs só são criados para erro/ausência e material rascunho |
| 2026-08-19 | S5 UI: `video_erro` é passado à tela sem regra nova; erro permite reenviar pelo fluxo TUS existente |

## Informações úteis

- Tipos e estrutura comum de materiais: [docs/specs/SPEC-conteudo.md](docs/specs/SPEC-conteudo.md) §3.3-3.7 (US-05..08, US-40; US-07/08 detalhadas em SPEC-video.md e SPEC-questoes.md).
- Regra de amostra (R4): max. 1 amostra por curso — SPEC-conteudo.md:68 e [docs/SPEC.md](docs/SPEC.md) (regras R1-R12). Erro C2: "já existe 1 material de amostra neste curso" (`regra_negocio`, campo `amostra`).
- Rascunho/publicado: só materiais `publicado` entram em gating de acesso (R1-R12).
- Seletores estáveis para E2E: `#material-titulo`, `#material-tipo`, `#material-conteudo`, `#material-amostra`, `#material-ordem`, `#material-status`, `#material-pdf`.
- Slice de implementação: S2 — ver [docs/plano-de-implementacao.md](docs/plano-de-implementacao.md).
