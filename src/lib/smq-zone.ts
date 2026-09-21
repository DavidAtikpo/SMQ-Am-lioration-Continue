export type SmqZone = "Monde" | "France" | "Togo";

export const SMQ_ZONES: SmqZone[] = ["Monde", "France", "Togo"];

export const SMQ_ZONE_LABELS: Record<SmqZone, string> = {
  Monde: "Monde",
  France: "France",
  Togo: "Togo",
};

/** Normalise un pays d'inscription webirata (Demande.pays) en zone SMQ. */
export function normalizeCordisteZone(
  pays: string | null | undefined,
  ...hints: Array<string | null | undefined>
): string {
  const hay = [pays, ...hints].filter(Boolean).join(" ").toLowerCase();
  if (/\btogo\b/.test(hay)) return "Togo";
  if (/\bfrance\b/.test(hay)) return "France";
  return "";
}

/**
 * Zone dérivée de l'inscription stagiaire (Demande.pays — formation France ou Togo).
 * Ne pas deviner via le libellé NC : la source de vérité est la demande d'inscription.
 */
export function zoneFromStagiaireInscription(pays: string | null | undefined): string {
  return normalizeCordisteZone(pays);
}

export function matchesZone(recordZone: string | null | undefined, filter: SmqZone): boolean {
  if (filter === "Monde") return true;
  return (recordZone ?? "") === filter;
}

export function filterByZone<T extends { zone?: string | null }>(
  items: T[],
  filter: SmqZone,
): T[] {
  if (filter === "Monde") return items;
  return items.filter((item) => matchesZone(item.zone, filter));
}

export function resolveActionZone(
  action: { zone?: string | null; ncId?: string | null },
  ncZoneById: Map<string, string | null | undefined>,
): string {
  if (action.zone) return action.zone;
  if (action.ncId) return ncZoneById.get(action.ncId) ?? "";
  return "";
}

export function filterActionsByZone<
  T extends { zone?: string | null; ncId?: string | null },
>(actions: T[], filter: SmqZone, ncZoneById: Map<string, string | null | undefined>): T[] {
  if (filter === "Monde") return actions;
  return actions.filter((action) =>
    matchesZone(resolveActionZone(action, ncZoneById), filter),
  );
}

export function indicatorMatchesZone(
  indicator: { period?: string; label?: string; detail?: string },
  filter: SmqZone,
): boolean {
  if (filter === "Monde") return true;
  const hay = `${indicator.period ?? ""} ${indicator.label ?? ""} ${indicator.detail ?? ""}`;
  if (filter === "France") return /\bfrance\b/i.test(hay);
  if (filter === "Togo") return /\btogo\b/i.test(hay);
  return true;
}

export function filterIndicatorsByZone<T extends { period?: string; label?: string; detail?: string }>(
  indicators: T[],
  filter: SmqZone,
): T[] {
  if (filter === "Monde") return indicators;
  return indicators.filter((indicator) => indicatorMatchesZone(indicator, filter));
}
