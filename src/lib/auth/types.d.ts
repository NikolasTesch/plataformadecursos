// Augmentação de tipos do Auth.js v5 (Session/User/JWT) — ConcursFoco.
//
// Adiciona os campos customizados do domínio: role e tokenVersion (revogação
// A3). Segue o padrão oficial de module augmentation do Auth.js v5
// (authjs.dev/getting-started/typescript). `Role` vem do client Prisma 7
// gerado (src/generated/prisma) — fonte única de verdade para o enum.
import type { DefaultSession } from "next-auth";
import type { Role } from "@/generated/prisma/client";

declare module "next-auth" {
  interface User {
    role: Role;
    tokenVersion: number;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      tokenVersion: number;
    } & DefaultSession["user"];
  }
}

// NOTA (next-auth@beta.32): `next-auth/jwt` apenas re-exporta de
// `@auth/core/jwt` (`export * from "@auth/core/jwt"`); augmentar o módulo de
// re-exportação não funde a interface. O alvo de augmentation correto é o
// módulo que DECLARA a interface JWT: `@auth/core/jwt`.
declare module "@auth/core/jwt" {
  interface JWT {
    role?: Role;
    tokenVersion?: number;
  }
}
