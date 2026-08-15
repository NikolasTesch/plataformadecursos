// Erros tipados do domínio de conteúdo — US-03 (SPEC-conteudo).
//
// Convenção COMPARTILHADA pelos serviços de conteúdo (cursos, módulos,
// materiais, busca): UM único erro com código discriminante, campo afetado
// (validação de input) e mensagem pt-BR amigável. Espelha a convenção do
// domínio de auth (src/services/auth/erros.ts, decisão D27) para manter os
// domínios consistentes — rotas/UI renderizam o erro pelo `code`/`campo` sem
// lógica de negócio.
//
// Códigos cobertos por este todo (todo 2 — cursos, US-03): validacao,
// nao_encontrado, slug_duplicado, slug_imutavel (C1), confirmacao_necessaria
// (C6). Todos paralelos (3: módulos, 4: materiais) podem ADICIONAR códigos ao
// union de forma aditiva, sem alterar os existentes. Todo 4 (materiais, US-05/06/
// 09/40) adiciona `regra_negocio` (C2 amostra única por curso e R11 vídeo erro).
export type CodigoErroConteudo =
  | "validacao"
  | "nao_encontrado"
  | "slug_duplicado"
  | "slug_imutavel"
  | "confirmacao_necessaria"
  | "regra_negocio";

export interface ParamsErroConteudo {
  code: CodigoErroConteudo;
  mensagem: string;
  campo?: string;
}

export class ErroConteudo extends Error {
  readonly code: CodigoErroConteudo;
  readonly mensagem: string;
  readonly campo?: string;

  constructor({ code, mensagem, campo }: ParamsErroConteudo) {
    super(mensagem);
    this.name = "ErroConteudo";
    this.code = code;
    this.mensagem = mensagem;
    if (campo !== undefined) this.campo = campo;
  }
}

export function erroValidacao(campo: string, mensagem: string): ErroConteudo {
  return new ErroConteudo({ code: "validacao", campo, mensagem });
}
