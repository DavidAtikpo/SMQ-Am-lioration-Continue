import { getCordistePool, schemaFromEnv, table } from "@/lib/sync/external-db";

function getCordisteDatabaseUrl(): string | undefined {
  return process.env.CORDISTE_DATABASE_URL ?? process.env.CATALOG_DATABASE_URL;
}

export type AuthUser = {
  id: string;
  email: string;
  password: string;
  nom: string | null;
  prenom: string | null;
  role: string;
  isActive: boolean;
};

export async function findUserByEmail(email: string): Promise<AuthUser | null> {
  const pool = getCordistePool();
  if (!pool) {
    throw new Error("CORDISTE_DATABASE_URL non configuré pour l'authentification");
  }

  const schema = schemaFromEnv(getCordisteDatabaseUrl(), "webirata");
  const result = await pool.query<AuthUser>(
    `SELECT id, email, password, nom, prenom, role::text AS role, "isActive"
     FROM ${table(schema, "User")}
     WHERE LOWER(email) = LOWER($1)
     LIMIT 1`,
    [email.trim()],
  );

  return result.rows[0] ?? null;
}

export async function findUserRoleByEmail(email: string): Promise<string | null> {
  const user = await findUserByEmail(email);
  return user?.role ?? null;
}
