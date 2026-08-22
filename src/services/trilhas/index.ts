// Serviço de trilhas por edital (US-25 / SPEC-trilhas §3.2, REVISAO-S7-NUCLEO §10 v0.3).
//
// Escopo S7.1: listar editais publicados, montar o plano ordenado por
// disciplina/peso e materiais, ativar múltiplas trilhas (T4), congelar a versão
// e o PLANO na ativação via `plano_snapshot` JsonB (T3/E2E-T2) e calcular
// progresso por disciplina REUTILIZANDO o motor de gating existente (AL1) sem
// duplicar suas regras.
//
// CORREÇÃO v0.3: `obterPlanoTrilha` lê a composição/ordem EXCLUSIVAMENTE do
// `plano_snapshot` (fonte da verdade do plano do aluno), e NÃO do grafo mutável
// do edital (`edital_disciplines`/`material_edital`). Novos alunos ativam com o
// snapshot da versão corrente; quem ativou v1 mantém o snapshot v1 congelado.
// O snapshot preserva composição e ordem, não o conteúdo dos materiais (o
// conteúdo é lido de `materials` no momento da leitura — SPEC-trilhas §3.2).
//
// RBAC (aluno autenticado) é do futuro chamador (rota/Server Action); o serviço
// valida invariantes (edital publicado para ativar, trilha ativa para plano).
//
// Dependência de banco INJETÁVEL: produção usa o singleton @/lib/db via cast
// (padrão D29); testes injetam fake tipado via `deps.db`.
import { db as dbPadrao } from "@/lib/db";
import type {
  editals,
  MaterialTipo,
  user_trilhas,
} from "@/generated/prisma/client";
import { podeAcessarMaterial, type EntitlementGating } from "@/services/gating";

import { ErroTrilha } from "./erros";

/** Snapshot imutável congelado na ativação (REVISAO-S7-NUCLEO §10 v0.3). */
export interface SnapshotDisciplina {
  id: string;
  nome: string;
  peso: number;
}
export interface SnapshotMaterial {
  id: string;
  ordem: number; // cópia de materials.ordem no instante da ativação
  disciplina_id: string | null;
}
export interface PlanoSnapshot {
  disciplinas: SnapshotDisciplina[];
  materiais: SnapshotMaterial[];
}

/** Material do plano: conteúdo atual (de `materials`) + ordem/disciplina do snapshot. */
export interface MaterialPlano {
  id: string;
  titulo: string;
  tipo: MaterialTipo;
  ordem: number; // do snapshot (materials.ordem congelada)
  status: "rascunho" | "publicado";
  amostra: boolean;
  module_id: string;
  course_id: string;
  incluido_assinatura: boolean;
  disciplina_id: string; // do snapshot
}

export interface DisciplinaPlano {
  id: string;
  nome: string;
  peso: number;
  materiais: MaterialPlano[];
  progresso: number; // 0..100 (AL1: só publicados/acessíveis contam)
}

export interface PlanoTrilha {
  editalId: string;
  editalNome: string;
  versaoAtivacao: number;
  disciplinas: DisciplinaPlano[];
  progressoGeral: number; // 0..100
}

export interface DbTrilhas {
  editals: {
    findUnique(args: { where: { id: string } }): Promise<editals | null>;
    findMany(args: {
      where: { status: "publicado" };
      orderBy?: { publicada_em: "desc" };
    }): Promise<editals[]>;
  };
  edital_disciplines: {
    findMany(args: {
      where: { edital_id: string };
      orderBy?: { peso: "desc" };
    }): Promise<Array<{ id: string; nome: string; peso: number }>>;
  };
  material_edital: {
    findMany(args: { where: { edital_id: string } }): Promise<
      Array<{ material_id: string; edital_id: string; disciplina_id: string | null }>
    >;
  };
  materials: {
    findMany(args: {
      where: { id: { in: string[] } };
      include: { modulo: { include: { course: true } } };
    }): Promise<
      Array<{
        id: string;
        titulo: string;
        tipo: MaterialTipo;
        ordem: number;
        status: "rascunho" | "publicado";
        amostra: boolean;
        module_id: string;
        modulo: { id: string; course_id: string; course: { id: string; incluido_assinatura: boolean } };
      }>
    >;
  };
  user_trilhas: {
    findUnique(args: {
      where: { user_id_edital_id: { user_id: string; edital_id: string } };
    }): Promise<user_trilhas | null>;
    findMany(args: {
      where: { user_id: string; ativo?: boolean };
    }): Promise<user_trilhas[]>;
    upsert(args: {
      where: { user_id_edital_id: { user_id: string; edital_id: string } };
      update: { ativo: boolean; versao_ativacao: number; plano_snapshot: unknown };
      create: {
        user_id: string;
        edital_id: string;
        ativo: boolean;
        versao_ativacao: number;
        plano_snapshot: unknown;
      };
    }): Promise<user_trilhas>;
    update(args: {
      where: { id: string };
      data: { ativo?: boolean; versao_ativacao?: number; plano_snapshot?: unknown };
    }): Promise<user_trilhas>;
  };
  entitlements: {
    findMany(args: {
      where: { user_id: string };
      include: { product: true };
    }): Promise<Array<EntitlementGating & { product: NonNullable<EntitlementGating["product"]> }>>;
  };
  user_progress: {
    findMany(args: {
      where: { user_id: string; material_id: { in: string[] } };
      select: { material_id: boolean; concluido: boolean };
    }): Promise<Array<{ material_id: string; concluido: boolean }>>;
  };
}

export interface DepsTrilhas {
  db?: DbTrilhas;
}

const CHAVE_SEM_DISCIPLINA = "__sem_disciplina__";

function erroEditalNaoEncontrado(): ErroTrilha {
  return new ErroTrilha({ code: "nao_encontrado", mensagem: "edital não encontrado" });
}

function erroTrilhaNaoEncontrada(): ErroTrilha {
  return new ErroTrilha({ code: "nao_encontrado", mensagem: "trilha não encontrada ou inativa" });
}

/**
 * Função PURA que monta o plano a partir do snapshot (disciplinas + materiais já
 * com `ordem`/`disciplina_id` congelados). Ordenação (T2): disciplinas por peso
 * desc, nome asc; materiais por `ordem` asc. Materiais sem disciplina (T1: 0..1)
 * caem no grupo "Sem disciplina" (peso 0). O progresso é preenchido por
 * `obterPlanoTrilha` (AL1) — aqui fica 0.
 */
export function montarPlano(
  disciplinas: SnapshotDisciplina[],
  materiais: MaterialPlano[],
): DisciplinaPlano[] {
  const porDisciplina = new Map<string, MaterialPlano[]>();
  for (const d of disciplinas) porDisciplina.set(d.id, []);
  const semDisciplina: MaterialPlano[] = [];

  for (const m of materiais) {
    const alvo = m.disciplina_id && porDisciplina.has(m.disciplina_id)
      ? porDisciplina.get(m.disciplina_id)!
      : semDisciplina;
    alvo.push(m);
  }

  const ordenadas = [...disciplinas].sort(
    (a, b) => b.peso - a.peso || a.nome.localeCompare(b.nome),
  );

  const resultado: DisciplinaPlano[] = ordenadas.map((d) => ({
    id: d.id,
    nome: d.nome,
    peso: d.peso,
    materiais: porDisciplina.get(d.id)!.sort((a, b) => a.ordem - b.ordem),
    progresso: 0,
  }));

  if (semDisciplina.length > 0) {
    resultado.push({
      id: "",
      nome: "Sem disciplina",
      peso: 0,
      materiais: semDisciplina.sort((a, b) => a.ordem - b.ordem),
      progresso: 0,
    });
  }
  return resultado;
}

/**
 * Calcula progresso por disciplina e geral REUTILIZANDO o motor de gating
 * (`podeAcessarMaterial` — AL1): só materiais publicados e acessíveis entram no
 * denominador; bloqueados ficam fora (T5). Não duplica regras de AL1 — apenas
 * lê a conclusão em `user_progress` e delega o gating ao serviço existente.
 */
async function calcularProgresso(
  userId: string,
  materiais: MaterialPlano[],
  db: DbTrilhas,
): Promise<{ porDisciplina: Map<string, number>; geral: number }> {
  if (materiais.length === 0) return { porDisciplina: new Map(), geral: 0 };

  const ids = materiais.map((m) => m.id);
  const concluidos = new Set(
    (
      await db.user_progress.findMany({
        where: { user_id: userId, material_id: { in: ids } },
        select: { material_id: true, concluido: true },
      })
    )
      .filter((c) => c.concluido)
      .map((c) => c.material_id),
  );

  const linhas = await db.entitlements.findMany({
    where: { user_id: userId },
    include: { product: true },
  });

  const acumulado = new Map<string, { acess: number; feitos: number }>();
  let totalAcess = 0;
  let totalFeitos = 0;

  for (const m of materiais) {
    const permitido = podeAcessarMaterial(
      {
        userId,
        material: {
          id: m.id,
          status: m.status,
          amostra: m.amostra,
          tipo: m.tipo,
          video_status: undefined,
        },
        curso: { id: m.course_id, incluido_assinatura: m.incluido_assinatura },
        entitlements: linhas,
      },
      { usarCache: false },
    ).permitido;

    const chave = m.disciplina_id || CHAVE_SEM_DISCIPLINA;
    const acc = acumulado.get(chave) ?? { acess: 0, feitos: 0 };
    if (permitido) {
      acc.acess += 1;
      totalAcess += 1;
      if (concluidos.has(m.id)) {
        acc.feitos += 1;
        totalFeitos += 1;
      }
    }
    acumulado.set(chave, acc);
  }

  const porDisciplina = new Map<string, number>();
  for (const [chave, v] of acumulado) {
    porDisciplina.set(chave, v.acess === 0 ? 0 : Math.round((v.feitos / v.acess) * 100));
  }
  const geral = totalAcess === 0 ? 0 : Math.round((totalFeitos / totalAcess) * 100);
  return { porDisciplina, geral };
}

export async function listarEditaisPublicados(
  deps: DepsTrilhas = {},
): Promise<editals[]> {
  const db: DbTrilhas = deps.db ?? (dbPadrao as unknown as DbTrilhas);
  return db.editals.findMany({
    where: { status: "publicado" },
    orderBy: { publicada_em: "desc" },
  });
}

/**
 * Ativa (ou reativa) a trilha de um edital publicado para o aluno. Congela, em
 * UMA única escrita atômica (upsert), `versao_ativacao = editals.versao` e o
 * `plano_snapshot` (composição/ordem congeladas do edital no instante da
 * ativação — T3/E2E-T2). Múltiplas trilhas ativas são permitidas (T4).
 *
 * O snapshot é construído a partir da leitura do edital feita nesta chamada;
 * `versao_ativacao` e `plano_snapshot` derivam da MESMA leitura, de modo que
 * ativação concorrente não mistura versão e snapshot.
 */
export async function ativarTrilha(
  userId: string,
  editalId: string,
  deps: DepsTrilhas = {},
): Promise<user_trilhas> {
  const db: DbTrilhas = deps.db ?? (dbPadrao as unknown as DbTrilhas);
  const edital = await db.editals.findUnique({ where: { id: editalId } });
  if (!edital) throw erroEditalNaoEncontrado();
  if (edital.status !== "publicado") {
    throw new ErroTrilha({
      code: "edital_nao_publicado",
      mensagem: "o edital precisa estar publicado para ativar a trilha",
    });
  }

  // Snapshot da composição/ordem atual do edital (congelado na ativação).
  const disciplinas = await db.edital_disciplines.findMany({
    where: { edital_id: editalId },
    orderBy: { peso: "desc" },
  });
  const vinculos = await db.material_edital.findMany({ where: { edital_id: editalId } });
  const materiaisBrutos =
    vinculos.length > 0
      ? await db.materials.findMany({
          where: { id: { in: vinculos.map((v) => v.material_id) } },
          include: { modulo: { include: { course: true } } },
        })
      : [];
  const ordemPorId = new Map(materiaisBrutos.map((m) => [m.id, m.ordem]));
  // Peso de cada disciplina para ordenar os materiais do snapshot (T2).
  const pesoPorDisciplina = new Map(disciplinas.map((d) => [d.id, d.peso]));

  // Snapshot ordenado por (peso da disciplina desc, materials.ordem asc);
  // materiais sem disciplina (T1: 0..1) vão ao final.
  const snapshotMateriais = [...vinculos]
    .sort((a, b) => {
      const pa = a.disciplina_id ? (pesoPorDisciplina.get(a.disciplina_id) ?? 0) : -1;
      const pb = b.disciplina_id ? (pesoPorDisciplina.get(b.disciplina_id) ?? 0) : -1;
      if (pb !== pa) return pb - pa; // peso desc
      return (ordemPorId.get(a.material_id) ?? 0) - (ordemPorId.get(b.material_id) ?? 0); // ordem asc
    })
    .map((v) => ({
      id: v.material_id,
      ordem: ordemPorId.get(v.material_id) ?? 0,
      disciplina_id: v.disciplina_id,
    }));

  const snapshot: PlanoSnapshot = {
    disciplinas: disciplinas.map((d) => ({ id: d.id, nome: d.nome, peso: d.peso })),
    materiais: snapshotMateriais,
  };

  // Escrita atômica: versao_ativacao e plano_snapshot criados juntos.
  return db.user_trilhas.upsert({
    where: { user_id_edital_id: { user_id: userId, edital_id: editalId } },
    update: { ativo: true, versao_ativacao: edital.versao, plano_snapshot: snapshot },
    create: {
      user_id: userId,
      edital_id: editalId,
      ativo: true,
      versao_ativacao: edital.versao,
      plano_snapshot: snapshot,
    },
  });
}

export async function desativarTrilha(
  userId: string,
  editalId: string,
  deps: DepsTrilhas = {},
): Promise<user_trilhas> {
  const db: DbTrilhas = deps.db ?? (dbPadrao as unknown as DbTrilhas);
  const existente = await db.user_trilhas.findUnique({
    where: { user_id_edital_id: { user_id: userId, edital_id: editalId } },
  });
  if (!existente) throw erroTrilhaNaoEncontrada();
  return db.user_trilhas.update({
    where: { id: existente.id },
    data: { ativo: false },
  });
}

/** Trilhas ativas do aluno (T4) — progresso é obtido via `obterPlanoTrilha`. */
export async function listarTrilhasAtivas(
  userId: string,
  deps: DepsTrilhas = {},
): Promise<user_trilhas[]> {
  const db: DbTrilhas = deps.db ?? (dbPadrao as unknown as DbTrilhas);
  return db.user_trilhas.findMany({ where: { user_id: userId, ativo: true } });
}

/**
 * Plano da trilha do aluno. Lê a composição/ordem EXCLUSIVAMENTE do
 * `plano_snapshot` congelado na ativação (REVISAO-S7-NUCLEO §10 v0.3) — NÃO
 * recalcula a partir do grafo mutável do edital. O conteúdo dos materiais (título,
 * tipo, status, curso para gating) é lido de `materials` no momento da leitura,
 * pois o snapshot preserva composição/ordem, não o conteúdo (SPEC-trilhas §3.2).
 */
export async function obterPlanoTrilha(
  userId: string,
  editalId: string,
  deps: DepsTrilhas = {},
): Promise<PlanoTrilha> {
  const db: DbTrilhas = deps.db ?? (dbPadrao as unknown as DbTrilhas);
  const trilha = await db.user_trilhas.findUnique({
    where: { user_id_edital_id: { user_id: userId, edital_id: editalId } },
  });
  if (!trilha || !trilha.ativo) throw erroTrilhaNaoEncontrada();

  const snapshot = trilha.plano_snapshot as unknown as PlanoSnapshot;
  const edital = await db.editals.findUnique({ where: { id: editalId } });
  if (!edital) throw erroEditalNaoEncontrado();

  // Conteúdo atual dos materiais do snapshot (não a composição/ordem).
  const ids = snapshot.materiais.map((m) => m.id);
  const conteudoPorId = new Map(
    ids.length > 0
      ? (
          await db.materials.findMany({
            where: { id: { in: ids } },
            include: { modulo: { include: { course: true } } },
          })
        ).map((m) => [m.id, m])
      : [],
  );

  const materiaisPlano: MaterialPlano[] = snapshot.materiais.map((sm) => {
    const c = conteudoPorId.get(sm.id);
    return {
      id: sm.id,
      titulo: c?.titulo ?? "Material indisponível",
      tipo: (c?.tipo ?? "texto") as MaterialTipo,
      ordem: sm.ordem,
      status: (c?.status ?? "rascunho") as "rascunho" | "publicado",
      amostra: c?.amostra ?? false,
      module_id: c?.module_id ?? "",
      course_id: c?.modulo.course_id ?? "",
      incluido_assinatura: c?.modulo.course.incluido_assinatura ?? false,
      disciplina_id: sm.disciplina_id ?? "",
    };
  });

  const plano = montarPlano(snapshot.disciplinas, materiaisPlano);

  const { porDisciplina, geral } = await calcularProgresso(userId, materiaisPlano, db);
  for (const disc of plano) {
    const chave = disc.id === "" ? CHAVE_SEM_DISCIPLINA : disc.id;
    disc.progresso = porDisciplina.get(chave) ?? 0;
  }

  return {
    editalId,
    editalNome: edital.nome,
    versaoAtivacao: trilha.versao_ativacao,
    disciplinas: plano,
    progressoGeral: geral,
  };
}
