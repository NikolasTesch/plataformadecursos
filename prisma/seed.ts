// Seed de desenvolvimento (S1 — Fundação). Idempotente: pode rodar N vezes;
// re-executar RESETA usuários (bloqueado=false, tokenVersion=0) e senhas.
// Senhas são valores DEV documentados (NUNCA usar em produção).
import "dotenv/config";
import argon2 from "argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const DEV = {
  admin: { email: "admin@concursfoco.dev", nome: "Administrador", senha: "Admin@1234" },
  aluno: { email: "aluno@concursfoco.dev", nome: "Aluno Demo", senha: "Aluno@1234" },
} as const;

function logHash(quem: string, hash: string): void {
  console.log(`  ${quem} senha_hash: ${hash.slice(0, 14)}… (${hash.length} chars)`);
}

async function main(): Promise<void> {
  console.log("=== ConcursFoco seed (dev) ===");
  console.log("⚠️  ATENÇÃO: senhas de DESENVOLVIMENTO — TROCAR EM PRODUÇÃO!");
  console.log(`  admin: ${DEV.admin.email} / ${DEV.admin.senha}`);
  console.log(`  aluno: ${DEV.aluno.email} / ${DEV.aluno.senha}`);

  const adminHash = await argon2.hash(DEV.admin.senha);
  const alunoHash = await argon2.hash(DEV.aluno.senha);

  const admin = await prisma.users.upsert({
    where: { email: DEV.admin.email },
    update: {
      nome: DEV.admin.nome,
      role: "admin",
      senha_hash: adminHash,
      bloqueado: false,
      tokenVersion: 0,
      consentimento_lgpd_em: new Date(),
    },
    create: {
      email: DEV.admin.email,
      nome: DEV.admin.nome,
      role: "admin",
      senha_hash: adminHash,
      consentimento_lgpd_em: new Date(),
    },
  });

  const aluno = await prisma.users.upsert({
    where: { email: DEV.aluno.email },
    update: {
      nome: DEV.aluno.nome,
      role: "aluno",
      senha_hash: alunoHash,
      bloqueado: false,
      tokenVersion: 0,
      consentimento_lgpd_em: new Date(),
    },
    create: {
      email: DEV.aluno.email,
      nome: DEV.aluno.nome,
      role: "aluno",
      senha_hash: alunoHash,
      consentimento_lgpd_em: new Date(),
    },
  });

  logHash("admin", admin.senha_hash);
  logHash("aluno", aluno.senha_hash);

  // Round-trip: confirma que o hash gravado é argon2id e bate com a senha dev
  const adminOk = await argon2.verify(admin.senha_hash, DEV.admin.senha);
  const alunoOk = await argon2.verify(aluno.senha_hash, DEV.aluno.senha);
  if (!adminOk || !alunoOk) throw new Error("Falha no round-trip argon2 (hash não confere com senha)");
  console.log("  argon2 round-trip: OK (hash confere com senha dev)");

  const curso = await prisma.courses.upsert({
    where: { slug: "curso-demo" },
    update: { nome: "Curso Demo", incluido_assinatura: false },
    create: { nome: "Curso Demo", slug: "curso-demo", incluido_assinatura: false },
  });

  const modulo = await prisma.modules.upsert({
    where: { course_id_ordem: { course_id: curso.id, ordem: 1 } },
    update: { nome: "Introdução" },
    create: { course_id: curso.id, nome: "Introdução", ordem: 1 },
  });

  // materials NÃO tem unique natural (só @@index([module_id, ordem]) — D5):
  // findFirst + create-if-missing em vez de upsert
  const material = await prisma.materials.findFirst({
    where: { module_id: modulo.id, ordem: 1 },
  });
  if (material) {
    await prisma.materials.update({
      where: { id: material.id },
      data: {
        titulo: "Bem-vindo",
        tipo: "texto",
        status: "publicado",
        publicado_em: new Date(),
        conteudo_html: "<h1>Bem-vindo ao ConcursFoco</h1><p>Material de exemplo.</p>",
      },
    });
  } else {
    await prisma.materials.create({
      data: {
        module_id: modulo.id,
        titulo: "Bem-vindo",
        tipo: "texto",
        ordem: 1,
        status: "publicado",
        publicado_em: new Date(),
        conteudo_html: "<h1>Bem-vindo ao ConcursFoco</h1><p>Material de exemplo.</p>",
      },
    });
  }

  console.log(`  users: ${await prisma.users.count()}`);
  console.log(`  courses: ${await prisma.courses.count()}`);
  console.log(`  modules: ${await prisma.modules.count()}`);
  console.log(`  materials: ${await prisma.materials.count()}`);
  console.log("=== seed concluído ===");
}

main()
  .catch((err) => {
    console.error("Seed falhou:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
