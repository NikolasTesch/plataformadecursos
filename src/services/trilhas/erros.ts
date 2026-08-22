// Erros tipados do domínio de trilhas (US-25 / SPEC-trilhas §3.2).
//
// Mesma convenção dos demais domínios: erro único com código discriminante,
// campo e mensagem pt-BR. Códigos aditivos.
export type CodigoErroTrilha =
  | "validacao"
  | "nao_encontrado"
  | "edital_nao_publicado"
  | "regra_negocio";

export interface ParamsErroTrilha {
  code: CodigoErroTrilha;
  mensagem: string;
  campo?: string;
}

export class ErroTrilha extends Error {
  readonly code: CodigoErroTrilha;
  readonly mensagem: string;
  readonly campo?: string;

  constructor({ code, mensagem, campo }: ParamsErroTrilha) {
    super(mensagem);
    this.name = "ErroTrilha";
    this.code = code;
    this.mensagem = mensagem;
    if (campo !== undefined) this.campo = campo;
  }
}

export function erroValidacaoTrilha(campo: string, mensagem: string): ErroTrilha {
  return new ErroTrilha({ code: "validacao", campo, mensagem });
}
