import fs from "fs";
import path from "path";

function parseKeyFromEnvFile(filePath: string): string | null {
  try {
    if (!fs.existsSync(/* turbopackIgnore: true */ filePath)) return null;
    const raw = fs.readFileSync(/* turbopackIgnore: true */ filePath, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^ANTHROPIC_API_KEY\s*=\s*(.+)$/);
      if (!match) continue;
      const value = match[1].trim().replace(/^["']|["']$/g, "");
      return value || null;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Clé Anthropic : SMQ .env puis (dev) irata/.env.local et irata/.env à côté du monorepo. */
export function getAnthropicApiKey(): string | null {
  const fromEnv = process.env.ANTHROPIC_API_KEY?.trim().replace(/^["']|["']$/g, "");
  if (fromEnv) return fromEnv;

  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "..", "irata", ".env.local"),
    path.join(cwd, "..", "irata", ".env"),
    path.join(cwd, "irata", ".env.local"),
    path.join(cwd, "irata", ".env"),
  ];

  for (const file of candidates) {
    const key = parseKeyFromEnvFile(file);
    if (key) return key;
  }

  return null;
}
