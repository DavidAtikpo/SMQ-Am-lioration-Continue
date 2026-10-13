import type { SmqLocale } from "@/lib/smq-i18n";

export function isLikelyFrenchQmsDocument(text: string): boolean {
  return /COMPTE-RENDU|CONSTATS ET|CONTEXTE ET|P[ÉE]RIM[ÈE]TRE|Réalisé|Realisé|Realise|ordre du jour|AXE \d|Axes d'amélioration|Constat\s*:/i.test(
    text,
  );
}

export function isLikelyEnglishQmsDocument(text: string): boolean {
  return /INTERNAL QMS AUDIT REPORT|FINDINGS AND DECISIONS|CONTEXT AND SCOPE|Axis \d/i.test(
    text,
  );
}

/** Heuristique : texte probablement en français. */
export function looksFrench(text: string): boolean {
  if (/[àâäéèêëïîôùûüç]/i.test(text)) return true;

  const samples = [text.slice(0, 600), text.slice(600, 1200), text.slice(-400)].join(" ");
  const sample = samples.toLowerCase();
  return /\b(le|la|les|des|une|pour|avec|dans|réunion|compte|rendu|interne|formation|champ|détail|statut|périmètre|contexte|constat|non-conformit|stagiaire|qualité|échéance|responsable|amélioration|visibilité|publication|structure|victime|élingues|béton)\b/.test(
    sample,
  );
}

function looksEnglish(text: string): boolean {
  if (isLikelyFrenchQmsDocument(text)) return false;
  const sample = text.slice(0, 800).toLowerCase();
  if (/[àâäéèêëïîôùûüç]/.test(sample)) return false;
  const enHits =
    sample.match(
      /\b(the|and|for|with|internal|meeting|summary|minutes|agenda|scope|context|reference|status|field|detail|findings|trainee|management)\b/g,
    )?.length ?? 0;
  const frHits =
    sample.match(/\b(les|des|pour|avec|dans|compte|rendu|interne|formation|champ|statut|constat)\b/g)
      ?.length ?? 0;
  return enHits >= 3 && enHits > frHits;
}

/** Faut-il traduire ce texte pour affichage / PDF en anglais ? */
export function needsEnglishTranslation(text: string, locale: SmqLocale): boolean {
  if (locale !== "en") return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (isLikelyEnglishQmsDocument(trimmed)) return false;
  if (isLikelyFrenchQmsDocument(trimmed)) return true;
  if (looksEnglish(trimmed)) return false;
  if (looksFrench(trimmed)) return true;
  if (
    /compte-rendu|ordre du jour|audit interne|non-conformit|revue de direction|smq|qhse/i.test(
      trimmed,
    )
  ) {
    return true;
  }
  return trimmed.length > 40;
}

/** Traduction IA clairement réussie (évite de mettre en cache un échec). */
export function translationLooksSuccessful(source: string, result: string): boolean {
  const a = source.trim();
  const b = result.trim();
  if (!b || a === b) return false;
  if (isLikelyFrenchQmsDocument(b) && !isLikelyFrenchQmsDocument(a)) return false;
  if (isLikelyFrenchQmsDocument(a) && isLikelyEnglishQmsDocument(b)) return true;
  if (isLikelyFrenchQmsDocument(b)) return false;
  return looksFrench(a) && !looksFrench(b);
}
