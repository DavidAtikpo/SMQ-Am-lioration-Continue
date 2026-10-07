import type { SmqEvent } from "@/lib/types";

/** Audit interne le plus pertinent pour préparation / synthèse (notes déjà saisies). */
export function pickAuditEventForPrep(
  events: SmqEvent[],
  preferredId?: string | null,
): SmqEvent | null {
  const audits = events.filter((e) => e.type === "Audit interne");
  if (preferredId) {
    const found = audits.find((e) => e.id === preferredId);
    if (found) return found;
  }

  const byDateDesc = [...audits].sort((a, b) => b.date.localeCompare(a.date));
  const realized = byDateDesc.filter((e) => e.statut === "Réalisé");
  if (realized.length > 0) return realized[0];

  const withNotes = byDateDesc.filter(
    (e) => e.ordreDuJour.trim().length > 0 || e.compteRendu.trim().length > 0,
  );
  if (withNotes.length > 0) return withNotes[0];

  return byDateDesc[0] ?? null;
}
