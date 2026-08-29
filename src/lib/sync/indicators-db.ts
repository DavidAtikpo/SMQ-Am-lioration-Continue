import { prisma } from "@/lib/db";
import type { IndicatorUpsert, SyncResult } from "@/lib/sync/types";

export async function upsertIndicators(rows: IndicatorUpsert[]): Promise<SyncResult> {
  const result: SyncResult = { imported: 0, updated: 0, skipped: 0, errors: [] };
  for (const row of rows) {
    try {
      const existing = await prisma.indicator.findUnique({ where: { id: row.id } });
      await prisma.indicator.upsert({
        where: { id: row.id },
        update: {
          source: row.source,
          category: row.category,
          label: row.label,
          value: row.value,
          numeric: row.numeric ?? null,
          period: row.period ?? "",
          detail: row.detail ?? "",
          syncedAt: new Date(),
        },
        create: {
          id: row.id,
          source: row.source,
          category: row.category,
          label: row.label,
          value: row.value,
          numeric: row.numeric ?? null,
          period: row.period ?? "",
          detail: row.detail ?? "",
        },
      });
      if (existing) result.updated += 1;
      else result.imported += 1;
    } catch (error) {
      result.errors.push(`${row.id}: ${error instanceof Error ? error.message : "erreur"}`);
    }
  }
  return result;
}
