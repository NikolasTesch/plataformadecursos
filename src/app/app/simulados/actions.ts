"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { iniciarTentativa, responderNaTentativa, entregarTentativa, obterTentativaParaResponder, type TentativaLeitura } from "@/services/simulados";
import { ErroSimulado } from "@/services/simulados";
const v=(f:FormData,k:string)=>String(f.get(k)??"").trim();
export async function iniciarSimuladoAction(f:FormData){const u=await requireRole("aluno");return iniciarTentativa(u.id,v(f,"simulado_id"));}
export async function iniciarSimuladoForm(f:FormData):Promise<void>{const tentativa=await iniciarSimuladoAction(f);redirect(`/app/simulados/${v(f,"simulado_id")}?tentativa=${tentativa.id}`);}
export async function responderSimuladoAction(f:FormData){const u=await requireRole("aluno");return responderNaTentativa(u.id,v(f,"tentativa_id"),v(f,"questao_id"),v(f,"alternativa"));}
export async function entregarSimuladoAction(f:FormData){const u=await requireRole("aluno");const r=await entregarTentativa(u.id,v(f,"tentativa_id"));revalidatePath("/app/simulados");return r;}
export type EstadoSimulado={ok:boolean;mensagem?:string;dados?:unknown};
function mensagem(e:unknown){if(!(e instanceof ErroSimulado))return "Não foi possível concluir a ação.";return ({prazo_encerrado:"O prazo terminou.",tentativa_entregue:"Esta tentativa já foi entregue.",acesso_negado:"Você não tem acesso a este simulado.",alternativa_invalida:"Alternativa inválida."} as Record<string,string>)[e.code]??"Não foi possível concluir a ação.";}
export async function iniciarSimuladoEstado(_:EstadoSimulado,f:FormData):Promise<EstadoSimulado>{try{return{ok:true,dados:await iniciarSimuladoAction(f)}}catch(e){return{ok:false,mensagem:mensagem(e)}}}
export async function lerTentativaAction(attemptId:string):Promise<TentativaLeitura>{const u=await requireRole("aluno");return obterTentativaParaResponder(u.id,attemptId);}
export async function responderEstado(_:EstadoSimulado,f:FormData):Promise<EstadoSimulado>{try{return{ok:true,dados:await responderSimuladoAction(f)}}catch(e){return{ok:false,mensagem:mensagem(e)}}}
export async function entregarEstado(_:EstadoSimulado,f:FormData):Promise<EstadoSimulado>{try{return{ok:true,dados:await entregarSimuladoAction(f)}}catch(e){return{ok:false,mensagem:mensagem(e)}}}
