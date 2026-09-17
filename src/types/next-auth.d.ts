import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: string;
      nom?: string | null;
      prenom?: string | null;
    };
  }

  interface User {
    id: string;
    role: string;
    nom?: string | null;
    prenom?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    nom?: string | null;
    prenom?: string | null;
    email?: string | null;
  }
}
