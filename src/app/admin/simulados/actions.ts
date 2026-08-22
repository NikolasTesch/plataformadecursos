"use server";
import {revalidatePath} from "next/cache";import {requireRole} from "@/lib/auth";import {criarSimulado,publicarSimulado,adicionarQuestoes} from "@/services/simulados";const v=(f:FormData,k:string)=>String(f.get(k)??"").trim();
export async function criarSimuladoAction(f:FormData):Promise<void>{await requireRole("admin");await criarSimulado(v(f,"curso_id"),{titulo:v(f,"titulo"),instrucoes:v(f,"instrucoes")||null,duracao_minutos:Number(v(f,"duracao_minutos"))});revalidatePath("/admin/simulados")}
export async function publicarSimuladoAction(f:FormData){await requireRole("admin");const r=await publicarSimulado(v(f,"simulado_id"));revalidatePath("/admin/simulados");return r}
export async function adicionarQuestoesAction(f:FormData){await requireRole("admin");return adicionarQuestoes(v(f,"simulado_id"),v(f,"question_ids").split(",").map(x=>x.trim()).filter(Boolean))}
