// Gating MÍNIMO de leitura — subset R1-R4 (todo 7 do plano s2-conteudo).
//
// ⚠️ ARQUIVO TEMPORÁRIO: implementa apenas o subconjunto R1-R4 necessário
// para a leitura de materiais no S2. O motor COMPLETO R1-R12 (cache,
// revogação, progresso, janelas de datas, cotas, produto ativo, etc.) chega
// no S3 e SUBSTITUI este arquivo sem mudar o contrato da função
// `podeAcessarMaterial` (ver README desta pasta).
//
// A função é PURA: recebe entitlements como DADO (shape mínimo abaixo), sem
// acesso a banco. Callers (rotas de leitura/busca no S2) montam o shape a
// partir de Prisma; o S3 evoluirá o shape mantendo o contrato.
//
// Referências: SPEC-aluno.md:38-45 (fluxo de gating), SPEC.md:387-392 (R1-R4).

export type OrigemEntitlement = "pagamento" | "trial" | "admin";

export type TipoProduto = "assinatura" | "venda_unica";

export type StatusMaterial = "rascunho" | "publicado";

// Shape mínimo do produto vinculado ao entitlement (products).
// NOTA: `status` do produto (R2 "produto ativo") NÃO está neste subset —
// callers devem filtrar products.status === 'ativo' ao montar o shape; o S3
// incorpora a checagem no motor.
export interface ProdutoGating {
  tipo: TipoProduto;
  /** venda_unica é 1:1 com curso (products.curso_id); assinatura → null. */
  curso_id: string | null;
}

// Shape mínimo do entitlement (entitlements). Espelha os campos do Prisma:
// origem (pagamento|trial|admin), acesso_ate (null = permanente só para
// venda_unica — R3), product_id e o produto opcional com tipo/curso.
// `product` ausente = entitlement não avaliável (ignorado).
export interface EntitlementGating {
  id: string;
  origem: OrigemEntitlement;
  acesso_ate: Date | null;
  product_id: string;
  product?: ProdutoGating | null;
}

// Shape mínimo do material avaliado (materials).
export interface MaterialGating {
  id: string;
  status: StatusMaterial;
  amostra: boolean;
}

// Shape mínimo do curso avaliado (courses).
export interface CursoGating {
  id: string;
  incluido_assinatura: boolean;
}

export type MotivoGating = "amostra" | "assinatura" | "venda_unica" | "bloqueado";

// Resultado TIPADO — callers usam `motivo` para a mensagem do BloqueadoCard
// (R12) e para badge de status (`amostra`/`disponivel`/`bloqueado`).
export interface ResultadoGating {
  permitido: boolean;
  motivo: MotivoGating;
}

export interface ParamsPodeAcessarMaterial {
  /** Reservado: checagens por usuário (R5+) são do S3 — não usado no subset. */
  userId: string;
  material: MaterialGating;
  curso: CursoGating;
  entitlements: EntitlementGating[];
}

export interface DepsGating {
  /**
   * Relógio injetável p/ testes determinísticos (default: new Date()).
   * O S3 adiciona aqui cache/revogação/consulta de produto ativo.
   */
  agora?: Date;
}

/**
 * Decide se um aluno pode ler um material (subset R1-R4).
 *
 * Ordem de avaliação (guarda de publicação ANTES de tudo — o gating assume
 * materiais publicados; rascunho nunca é entregue, R5):
 *   1. material.status !== 'publicado' → bloqueado.
 *   2. R4: material.amostra === true → permitido (sem entitlement).
 *   3. R2: curso.incluido_assinatura && entitlement assinatura com
 *      acesso_ate >= agora → permitido. `acesso_ate` null em assinatura NÃO
 *      é permanente (assinatura sempre tem prazo; só venda_unica é
 *      permanente — R3).
 *   4. R3: entitlement venda_unica com product.curso_id === curso.id →
 *      permitido, PERMANENTE: acesso_ate é ignorado (inclusive se passado).
 *   5. Caso contrário → bloqueado (R12 — caller nunca envia conteúdo).
 */
export function podeAcessarMaterial(
  params: ParamsPodeAcessarMaterial,
  deps?: DepsGating,
): ResultadoGating {
  const { material, curso, entitlements } = params;
  const agora = deps?.agora ?? new Date();

  // Guarda de publicação (R5): o subset assume material publicado.
  if (material.status !== "publicado") {
    return { permitido: false, motivo: "bloqueado" };
  }

  // R4 — amostra é visível sem entitlement.
  if (material.amostra === true) {
    return { permitido: true, motivo: "amostra" };
  }

  // R2 — assinatura ativa (acesso_ate >= now) cobre curso incluído.
  if (curso.incluido_assinatura === true) {
    const assinaturaAtiva = entitlements.some(
      (e) =>
        e.product?.tipo === "assinatura" &&
        e.acesso_ate !== null &&
        e.acesso_ate.getTime() >= agora.getTime(),
    );
    if (assinaturaAtiva) {
      return { permitido: true, motivo: "assinatura" };
    }
  }

  // R3 — venda_unica do curso é permanente (acesso_ate ignorado).
  const vendaUnicaDoCurso = entitlements.some(
    (e) =>
      e.product?.tipo === "venda_unica" &&
      e.product.curso_id === curso.id,
  );
  if (vendaUnicaDoCurso) {
    return { permitido: true, motivo: "venda_unica" };
  }

  // R12 — bloqueado; o caller não envia conteúdo algum.
  return { permitido: false, motivo: "bloqueado" };
}
