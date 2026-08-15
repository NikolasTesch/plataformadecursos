// Montagem de dados das páginas admin de conteúdo — SERVER-ONLY.
//
// Rotas finas usam APENAS serviços (AGENTS.md §6); como services/conteudo não
// expõe "curso com estrutura" nem "contagem de publicados", este módulo
// compõe as chamadas de serviço existentes (listarCursos + listarModulos +
// listarMateriais) para montar as visões das páginas. Nenhuma regra de
// negócio aqui — apenas agregação de leitura.
//
// Uso de curso: o serviço oferece `obterCursoPorSlug`, mas as rotas admin
// identificam o curso por ID — a busca linear sobre `listarCursos()` é o
// caminho sem novas queries de serviço.
import { listarCursos } from "@/services/conteudo/cursos";
import { listarMateriais } from "@/services/conteudo/materiais";
import { listarModulos } from "@/services/conteudo/modulos";
import type {
  courses,
  materials,
  modules,
  MaterialStatus,
} from "@/generated/prisma/client";

export interface ModuloComMateriais {
  modulo: modules;
  materiais: materials[];
}

export interface CursoComEstrutura {
  curso: courses;
  modulos: ModuloComMateriais[];
  /** nº de materiais publicados do curso (usado para C1 e para a listagem). */
  publicados: number;
}

function contarPublicados(materiais: materials[]): number {
  return materiais.filter((m) => m.status === ("publicado" as MaterialStatus))
    .length;
}

/** Estrutura completa de um curso (módulos ordenados + materiais por módulo). */
export async function carregarCursoComEstrutura(
  cursoId: string,
): Promise<CursoComEstrutura | null> {
  const cursos = await listarCursos();
  const curso = cursos.find((c) => c.id === cursoId);
  if (!curso) return null;

  const listaModulos = await listarModulos(cursoId);
  const modulos: ModuloComMateriais[] = [];
  let publicados = 0;
  for (const modulo of listaModulos) {
    const materiais = await listarMateriais(modulo.id);
    publicados += contarPublicados(materiais);
    modulos.push({ modulo, materiais });
  }
  return { curso, modulos, publicados };
}

/** Lista de cursos com nº de materiais publicados (página /admin/cursos). */
export async function listarCursosComPublicados(): Promise<
  { curso: courses; publicados: number }[]
> {
  const cursos = await listarCursos();
  const resultado: { curso: courses; publicados: number }[] = [];
  for (const curso of cursos) {
    const estrutura = await carregarCursoComEstrutura(curso.id);
    resultado.push({ curso, publicados: estrutura?.publicados ?? 0 });
  }
  return resultado;
}

/** Resolve módulo → curso (nome/ids) para breadcrumbs das páginas de material. */
export async function encontrarCursoDoModulo(
  moduleId: string,
): Promise<{ cursoId: string; cursoNome: string; moduloNome: string } | null> {
  const cursos = await listarCursos();
  for (const curso of cursos) {
    const estrutura = await carregarCursoComEstrutura(curso.id);
    const modulo = estrutura?.modulos.find((m) => m.modulo.id === moduleId);
    if (modulo) {
      return {
        cursoId: curso.id,
        cursoNome: curso.nome,
        moduloNome: modulo.modulo.nome,
      };
    }
  }
  return null;
}
