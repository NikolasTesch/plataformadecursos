// Singleton PrismaClient (evita vazamentos de conexão no hot-reload do Next.js).
// Prisma 7 (gerador `prisma-client`) exige driver adapter — ver DECISÃO em
// .omo/notepads/s1-fundacao/decisions.md (todo 4, D11).
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
