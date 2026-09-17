import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { findUserByEmail } from "@/lib/auth-user";
import { getAuthSecret, getAuthUrl } from "@/lib/auth-secret";

const nextAuthUrl = getAuthUrl();
const useSecureCookies = nextAuthUrl.startsWith("https://");

export const authOptions: NextAuthOptions = {
  useSecureCookies,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await findUserByEmail(credentials.email);
        if (!user || !user.isActive) {
          return null;
        }

        if (user.role !== "ADMIN") {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: [user.prenom, user.nom].filter(Boolean).join(" ") || user.email,
          role: user.role,
          nom: user.nom,
          prenom: user.prenom,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
        token.email = user.email ?? token.email ?? null;
        token.nom = (user as { nom?: string | null }).nom ?? null;
        token.prenom = (user as { prenom?: string | null }).prenom ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.email = (token.email as string) ?? session.user.email;
        session.user.nom = (token.nom as string | null) ?? null;
        session.user.prenom = (token.prenom as string | null) ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: getAuthSecret(),
};
