// Erros tipados do domínio de autenticação — US-01/02/20 (SPEC-auth).
//
// Convenção COMPARTILHADA pelos serviços de auth (registrar, login, bloqueio):
// UM único erro com código discriminante, campo afetado (validação de input) e
// mensagem pt-BR amigável. Decisão D27 — registrar em .omo/notepads.
//
// `retryAfter` (segundos) só é preenchido por rate_limit (login, US-02 A4).
export type CodigoErroAuth =
  | "validacao"
  | "credenciais_invalidas"
  | "conta_suspensa"
  | "rate_limit"
  | "self_block";

export interface ParamsErroAuth {
  code: CodigoErroAuth;
  mensagem: string;
  campo?: string;
  retryAfter?: number;
}

export class ErroAuth extends Error {
  readonly code: CodigoErroAuth;
  readonly mensagem: string;
  readonly campo?: string;
  readonly retryAfter?: number;

  constructor({ code, mensagem, campo, retryAfter }: ParamsErroAuth) {
    super(mensagem);
    this.name = "ErroAuth";
    this.code = code;
    this.mensagem = mensagem;
    if (campo !== undefined) this.campo = campo;
    if (retryAfter !== undefined) this.retryAfter = retryAfter;
  }
}

export function erroValidacao(campo: string, mensagem: string): ErroAuth {
  return new ErroAuth({ code: "validacao", campo, mensagem });
}

// Alias usado pelo serviço de login (todo 11) — mesmo construtor, ambos os
// nomes apontam para a MESMA classe (instanceof compatível nos dois sentidos).
export { ErroAuth as AuthErro };
