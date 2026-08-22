// Erros tipados do domínio de editais (administração manual — US-25 / SPEC-trilhas §3.1).
//
// Convenção COMPARTILHADA com os demais serviços (conteudo/erros.ts, auth/erros.ts):
// UM único erro com código discriminante, campo afetado (validação de input) e
// mensagem pt-BR amigável. Rotas/UI renderizam pelo `code`/`campo` sem lógica de
// negócio. Códigos aditivos — não alteram os existentes em outros domínios.
export type CodigoErroEdital =
  | "validacao"
  | "nao_encontrado"
  | "editado_publicado"
  | "regra_negocio";

export interface ParamsErroEdital {
  code: CodigoErroEdital;
  mensagem: string;
  campo?: string;
}

export class ErroEdital extends Error {
  readonly code: CodigoErroEdital;
  readonly mensagem: string;
  readonly campo?: string;

  constructor({ code, mensagem, campo }: ParamsErroEdital) {
    super(mensagem);
    this.name = "ErroEdital";
    this.code = code;
    this.mensagem = mensagem;
    if (campo !== undefined) this.campo = campo;
  }
}

export function erroValidacaoEdital(campo: string, mensagem: string): ErroEdital {
  return new ErroEdital({ code: "validacao", campo, mensagem });
}
