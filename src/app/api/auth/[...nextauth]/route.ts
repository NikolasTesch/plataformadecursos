// Route handler do Auth.js v5 — expõe o endpoint /api/auth/*.
// Os handlers (Node) vêm de src/lib/auth/auth.ts (config com adapter Prisma).
import { handlers } from "@/lib/auth/auth";

export const { GET, POST } = handlers;
