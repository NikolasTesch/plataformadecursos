# components/player — Player de Vídeo, PDF e Leitura

## Função

Componentes de reprodução e leitura de materiais: `PlayerVideo` (videoaulas HLS via Bunny Stream), `PdfViewer` (visualização de PDF com URL assinada) e o layout imersivo de player/leitura. Atendem ao comportamento contratado em [docs/specs/SPEC-frontend.md](docs/specs/SPEC-frontend.md):104 (layout) e :122-123 (componentes), com regras de domínio em [docs/specs/SPEC-video.md](docs/specs/SPEC-video.md) e [docs/specs/SPEC-conteudo.md](docs/specs/SPEC-conteudo.md).

## Arquitetura

**PlayerVideo** (SPEC-frontend.md:122, SPEC-video.md §3.2):
- Player HLS embutido (URL de streaming fornecida pelo Bunny após gating aprovado — R7/R12).
- Controle de velocidade (0.5x–2x), fullscreen e qualidade automática (HLS).
- Posição: salva a cada 5s de reprodução (debounce) e ao pausar/sair; ao reabrir, inicia na posição salva (se ≥ 5s e < 95% da duração).
- Conclusão automática: ao atingir os últimos 10s (ou 95% da duração), o material é marcado concluído (US-14).

**PdfViewer** (SPEC-frontend.md:123, SPEC-conteudo.md §3.3):
- Renderiza PDF em viewer embutido; download direto não é exposto.
- URL assinada (validade 10 min) gerada no servidor a cada abertura autorizada (R7, R12).

**Layout de leitura** (SPEC-frontend.md:104): conteúdo central com largura de 72ch, barra lateral contextual (módulos/materiais do curso) em telas grandes (lg), sem a sidebar do app.

**Fluxo de dados**: o servidor emite o link de reprodução/assinatura somente após validar o entitlement; a aplicação nunca serve bytes de vídeo (sempre Bunny/CDN) e o gating é reavaliado a cada requisição de conteúdo.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Pasta criada; player e leitura separados de `app/` — o layout imersivo não usa app-shell |
| 2026-08-14 | URLs de reprodução e PDF sempre emitidas pelo servidor com gating — o cliente nunca decide acesso (R7/R12) |
| 2026-08-14 | Leitura em 72ch com sidebar contextual em lg, herdado do layout de player de SPEC-frontend.md:104 |

## Informações úteis

- Layout imersivo: [docs/specs/SPEC-frontend.md](docs/specs/SPEC-frontend.md):104.
- Comportamento do player (posição, velocidade, conclusão automática): [docs/specs/SPEC-video.md](docs/specs/SPEC-video.md) §3.2 (US-10).
- PDF: URL assinada de 10 min e viewer embutido: [docs/specs/SPEC-conteudo.md](docs/specs/SPEC-conteudo.md) §3.3 (US-05).
- Gating de conteúdo (regras R1–R12): [docs/SPEC.md](docs/SPEC.md).
- Armadilhas: o player não pode aceitar URLs vindas do cliente (o link deve ser emitido pelo servidor com token curto); o PdfViewer nunca oferece download direto; posição só é retomada se ≥ 5s e < 95% da duração.
