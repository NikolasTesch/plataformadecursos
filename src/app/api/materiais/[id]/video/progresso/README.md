# `/api/materiais/[id]/video/progresso`

## Função

Expõe a rota POST que salva a posição do vídeo para o aluno autenticado.

## Arquitetura

A rota é fina: valida sessão Node e JSON, chama `salvarPosicaoVideo` e
normaliza erros de domínio em respostas HTTP. A leitura do estado do player
fica em `obterDadosPlayer`; o streaming continua no Bunny.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-19 | Posição em segundos e duração opcional usam nomes camelCase no contrato HTTP |

## Informações úteis

- POST: `{ "posicaoSegundos": number, "duracaoSegundos"?: number }`.
- Resposta: `DadosPlayer`, sem URL HLS.
