export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function yearOf(iso?: string): string {
  return (iso || todayISO()).slice(0, 4);
}

export function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const diff =
    (new Date(`${iso}T00:00:00`).getTime() -
      new Date(`${todayISO()}T00:00:00`).getTime()) /
    86400000;
  return Math.round(diff);
}

export function nextCode(prefix: string, existingIds: string[]): string {
  const y = yearOf(todayISO());
  const count = existingIds.filter((id) => id.startsWith(`${prefix}-${y}-`)).length;
  return `${prefix}-${y}-${String(count + 1).padStart(3, "0")}`;
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
