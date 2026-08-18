// Cache local de decisões de autorização. A decisão continua sendo calculada
// por uma função pura; este módulo só controla o ciclo de vida do resultado.

import type { ResultadoGating } from "./engine";

export const GATING_CACHE_TTL_MS = 5 * 60 * 1000;

type Entrada = { resultado: ResultadoGating; expiraEm: number; versao: number };
const entradas = new Map<string, Entrada>();
let versaoGlobal = 0;
const versoesUsuario = new Map<string, number>();
const versoesCurso = new Map<string, number>();

function versao(chave: string, mapa: Map<string, number>): number {
  return mapa.get(chave) ?? 0;
}

export function chaveCache(userId: string, materialId: string, cursoId: string, contexto = ""): string {
  return `${userId}:${cursoId}:${materialId}:${contexto}`;
}

export function obterCache(
  chave: string,
  userId: string,
  cursoId: string,
  agora: number,
): ResultadoGating | undefined {
  const entrada = entradas.get(chave);
  if (!entrada || entrada.expiraEm <= agora || entrada.versao !== versaoGlobal + versao(userId, versoesUsuario) + versao(cursoId, versoesCurso)) {
    if (entrada) entradas.delete(chave);
    return undefined;
  }
  return entrada.resultado;
}

export function guardarCache(
  chave: string,
  userId: string,
  cursoId: string,
  resultado: ResultadoGating,
  agora: number,
): void {
  entradas.set(chave, {
    resultado,
    expiraEm: agora + GATING_CACHE_TTL_MS,
    versao: versaoGlobal + versao(userId, versoesUsuario) + versao(cursoId, versoesCurso),
  });
}

export function invalidarGatingCache(alvo?: { userId?: string; cursoId?: string }): void {
  if (!alvo || (!alvo.userId && !alvo.cursoId)) {
    versaoGlobal += 1;
    return;
  }
  if (alvo.userId) versoesUsuario.set(alvo.userId, versao(alvo.userId, versoesUsuario) + 1);
  if (alvo.cursoId) versoesCurso.set(alvo.cursoId, versao(alvo.cursoId, versoesCurso) + 1);
}

export function limparCacheGating(): void {
  entradas.clear();
  versoesUsuario.clear();
  versoesCurso.clear();
  versaoGlobal = 0;
}

export const invalidarPorUsuario = (userId: string) => invalidarGatingCache({ userId });
export const invalidarPorCurso = (cursoId: string) => invalidarGatingCache({ cursoId });
export const invalidarGlobal = () => invalidarGatingCache();
