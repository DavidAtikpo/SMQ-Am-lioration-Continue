import { Pool, type PoolClient } from "pg";

const globalPools = globalThis as unknown as {
  cordistePool?: Pool;
  agendaPool?: Pool;
};

function parseConnection(url: string): { connectionString: string; schema: string } {
  const trimmed = url.trim().replace(/^["']|["']$/g, "");
  const schemaMatch = trimmed.match(/[?&]schema=([^&]+)/i);
  const schema = schemaMatch ? decodeURIComponent(schemaMatch[1]) : "public";

  let connectionString = trimmed;
  if (schemaMatch) {
    connectionString = connectionString
      .replace(/([?&])schema=[^&]*(?=&|$)/i, (_, sep: string) => (sep === "?" ? "?" : ""))
      .replace(/\?&/, "?")
      .replace(/\?$/, "");
  }

  // Les tables sont toujours référencées en qualifié ("schema"."Table") — pas de search_path
  // dans l'URL (incompatible avec le pooler Neon).
  return { connectionString, schema };
}

async function setSearchPath(client: PoolClient, schema: string): Promise<void> {
  const safeSchema = schema.replace(/"/g, '""');
  await client.query(`SET search_path TO "${safeSchema}"`);
}

function createPool(url: string | undefined, label: string, fallbackSchema: string): Pool | null {
  if (!url?.trim()) {
    console.warn(`${label} non configuré`);
    return null;
  }

  const { connectionString, schema } = parseConnection(url);
  const pool = new Pool({
    connectionString,
    max: 3,
    ssl: connectionString.includes("neon.tech") ? { rejectUnauthorized: false } : undefined,
  });

  // SET search_path peut échouer sur pooler Neon — les requêtes utilisent table() qualifié.
  if (!connectionString.includes("-pooler")) {
    pool.on("connect", (client) => {
      void setSearchPath(client, schema || fallbackSchema);
    });
  }

  return pool;
}

export function getCordisteDatabaseUrl(): string | undefined {
  return process.env.CORDISTE_DATABASE_URL ?? process.env.CATALOG_DATABASE_URL;
}

export function getCordistePool(): Pool | null {
  if (!globalPools.cordistePool) {
    globalPools.cordistePool =
      createPool(getCordisteDatabaseUrl(), "CORDISTE_DATABASE_URL", "webirata") ?? undefined;
  }
  return globalPools.cordistePool ?? null;
}

export function getAgendaPool(): Pool | null {
  if (!globalPools.agendaPool) {
    globalPools.agendaPool =
      createPool(process.env.AGENDA_DATABASE_URL, "AGENDA_DATABASE_URL", "agenda") ?? undefined;
  }
  return globalPools.agendaPool ?? null;
}

export function schemaFromEnv(url: string | undefined, fallback: string): string {
  if (!url) {
    if (fallback === "webirata") {
      const cordisteUrl = getCordisteDatabaseUrl();
      if (cordisteUrl) {
        const match = cordisteUrl.match(/[?&]schema=([^&]+)/i);
        return match ? decodeURIComponent(match[1]) : fallback;
      }
    }
    return fallback;
  }
  const match = url.match(/[?&]schema=([^&]+)/i);
  return match ? decodeURIComponent(match[1]) : fallback;
}

export function table(schema: string, name: string): string {
  const safeSchema = schema.replace(/"/g, '""');
  const safeName = name.replace(/"/g, '""');
  return `"${safeSchema}"."${safeName}"`;
}

export function toIsoDate(value: Date | string | null | undefined): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export function fullName(
  nom?: string | null,
  prenom?: string | null,
  fallback?: string | null,
): string {
  const parts = [prenom, nom].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return fallback ?? "";
}
