# src/services/editais — Rastreamento de Editais e Concursos

## Função

Regras de negócio do domínio de editais e concursos (US-42): rastreamento de editais publicados, concursos acompanhados pelo aluno e cadastro de concursos por origem manual ou scraping (P0-3). Implementa as regras da SPEC-editais.md, incluindo a decisão ED1: concursos vindos de scraping ficam `proposto` e dependem de aprovação do admin antes de aparecerem publicamente.

## Arquitetura

- Serviços aqui consomem `src/lib/db` (Prisma); as rotas `app/concursos/[id]` (detalhe do concurso), `app/trilhas/[editalId]` (trilhas por edital) e `admin/editais` (gestão de editais/concursos) chamam estes serviços.
- Dados em `editals`, `edital_disciplines`, `material_edital` e `concursos`/`user_concursos` (modelo-de-dados.md §2.7): `concursos` tem `origem` enum `manual`/`scraping`, `fonte_url`, datas de inscrição/prova e `status` derivado das datas (`aberto`/`inscricoes`/`em_breve`/`encerrado`), além de `ultimo_sync_em` para scraping.
- Concurso de scraping entra como `proposto`; a aprovação do admin (ED1) é o que o torna visível publicamente.
- `editals` tem versionamento (T3) para trilhas: `versao` int e `publicada_em`; o vínculo de material com edital/disciplina vive em `material_edital` (0..1 disciplina por material — T1). **Republicar** (alteração de plano em edital já `publicado`: adicionar/atualizar/remover disciplina ou vincular/desvincular material) incrementa `editals.versao` **uma vez por mutação** via `increment: 1` atômico (`republicarSePublicado`), sobrescrevendo o estado corrente — **não** modifica `user_trilhas` nem seus `plano_snapshot` (a preservação da v1 do aluno é responsabilidade do serviço de trilhas, via snapshot). Em rascunho, alterações de plano **não** incrementam a versão.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-12 | Concursos com origem manual + scraping automático (P0-3) |
| 2026-08-12 | Scraping de concursos fica `proposto` e depende de **aprovação do admin** (ED1; STATUS-APROVACAO.md:32) |
| 2026-08-14 | Pasta `editais` em pt-BR espelha o domínio `SPEC-editais.md`; dados em `editals`/`concursos` (inglês snake_case) |

## Informações úteis

- Spec de referência: [docs/specs/SPEC-editais.md](docs/specs/SPEC-editais.md) (US-42).
- Modelo de dados: [docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.7.
- Slices: S7 — Expansão ([docs/plano-de-implementacao.md](docs/plano-de-implementacao.md):81-88) para rastreamento manual + scraping (P0-3), e S8 (:90-97) para alertas de editais.
- Armadilha: `concursos.status` é derivado das datas (não um campo editado à mão); concursos de scraping só entram no ar após aprovação do admin.
- O domínio `trilhas` (US-25) é um serviço separado em `src/services/trilhas`; aqui ficam os dados de edital/concurso que ele consome.
