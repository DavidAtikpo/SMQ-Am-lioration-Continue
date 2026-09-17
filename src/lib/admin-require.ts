import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { findUserRoleByEmail } from "@/lib/auth-user";

export async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { error: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };
  }

  const sessionRole = session.user.role;
  if (sessionRole === "ADMIN") {
    return { ok: true as const, session };
  }

  if (sessionRole && sessionRole !== "ADMIN") {
    return {
      error: NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 }),
    };
  }

  const role = await findUserRoleByEmail(session.user.email);
  if (role !== "ADMIN") {
    return {
      error: NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 }),
    };
  }

  return { ok: true as const, session };
}

export async function assertAdminApi(): Promise<NextResponse | null> {
  const result = await requireAdminSession();
  if ("error" in result) {
    return result.error ?? NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  return null;
}
