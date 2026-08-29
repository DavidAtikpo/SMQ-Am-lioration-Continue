const BASE64_IMAGE =
  /data:image\/[a-z0-9+.-]+;base64,[A-Za-z0-9+/=\s]+/gi;

function pick(match: RegExpMatchArray | null, index = 1): string {
  const value = match?.[index]?.trim();
  if (!value || value === "—" || value === "-") return "";
  return value.replace(/\s+/g, " ");
}

/** Extrait les signatures avant nettoyage (affichage en miniature). */
export function extractCordisteSignatures(raw: string): string[] {
  const found = raw.match(BASE64_IMAGE) ?? [];
  return [...new Set(found.map((s) => s.replace(/\s+/g, "")))];
}

/** Retire signatures images et bruit des exports Cordiste. */
export function sanitizeCordisteText(raw: string): string {
  return raw
    .replace(BASE64_IMAGE, "")
    .replace(/— PART RESERVED FOR THE ISSUER —/gi, "")
    .replace(/— PART RESERVED TO QUALITY MANAGER \/ Technical Authority \/ CEO —/gi, "")
    .replace(/Signature\s*\/?\s*Reception?:\s*/gi, "")
    .replace(/Signature:\s*/gi, "")
    .replace(/[A-Za-z0-9+/=]{200,}/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractCordisteFields(text: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];

  const push = (label: string, value: string) => {
    if (!value || value.toLowerCase() === "no" || value === "—") return;
    if (/^data:image\//i.test(value) || value.length > 400) return;
    out.push([label, value]);
  };

  push("Émetteur", pick(text.match(/Issuer:\s*([^|—\n]+)/i)));
  push("Destinataire", pick(text.match(/Recipient:\s*([^|—\n]+)/i)));
  push("Service", pick(text.match(/Dept:\s*([^|—\n]+)/i)));
  push("Date", pick(text.match(/Date:\s*(\d{4}-\d{2}-\d{2})/i)));
  push("Origine", pick(text.match(/Origin:\s*([^|—\n]+)/i)));
  push("Catégorie", pick(text.match(/Category of anomaly:\s*([^|—\n]+)/i)));
  push(
    "Description",
    pick(
      text.match(
        /Description:\s*([\s\S]*?)(?=Immediate curative action:|Action planned\?|— PART|$)/i,
      ),
    ),
  );
  push(
    "Action immédiate",
    pick(text.match(/Immediate curative action:\s*([^|—\n]+)/i)),
  );
  push(
    "Action corrective",
    pick(text.match(/Corrective \(described\):\s*([^|—\n]+)/i)),
  );
  push(
    "Action préventive",
    pick(text.match(/Preventive \(described\):\s*([^|—\n]+)/i)),
  );
  push(
    "Pilote",
    pick(text.match(/Collaborator in charge:\s*([^|—\n]+)/i)),
  );
  push("Analyse", pick(text.match(/Analysis:\s*([^|—\n]+)/i)));
  push("Échéance", pick(text.match(/Limit Time:\s*([^|—\n]+)/i)));
  push(
    "Responsable",
    pick(text.match(/Collaborator appointed:\s*([^|—\n]+)/i)),
  );
  push(
    "Clôture",
    pick(text.match(/Closure of actions:\s*([^|—\n]+)/i)),
  );
  push("Efficacité", pick(text.match(/Effectiveness:\s*([^|—\n]+)/i)));
  push("Observation", pick(text.match(/Observation:\s*([^|—\n]+)/i)));
  push("Conclusion", pick(text.match(/Conclusion:\s*([^|—\n]+)/i)));

  return out;
}

/** Résumé lisible pour le SMQ (sans signatures ni export brut). */
export function formatCordisteDescription(titre: string, description: string): string {
  const combined = sanitizeCordisteText([titre, description].filter(Boolean).join("\n"));
  if (!combined) return "";

  const isExport =
    /Corrective Action #/i.test(combined) ||
    /Issuer:/i.test(combined) ||
    /Category of anomaly:/i.test(combined);

  if (!isExport) {
    return combined.length > 1200 ? `${combined.slice(0, 1200)}…` : combined;
  }

  const ncRef =
    pick(combined.match(/#?(NC-\d{4}-\d+)/i)) ||
    pick(combined.match(/N°:\s*(NC-[^\s|—]+)/i));

  const lines: string[] = [];
  if (ncRef) lines.push(`Réf. ${ncRef}`);

  for (const [label, value] of extractCordisteFields(combined)) {
    lines.push(`${label} : ${value}`);
  }

  if (lines.length === 0) {
    const fallback = combined.replace(/Corrective Action #[^\n]+/i, "").trim();
    return fallback.length > 800 ? `${fallback.slice(0, 800)}…` : fallback;
  }

  return lines.join("\n");
}

export function formatCordisteTitle(titre: string, description: string): string {
  const cleanTitle = sanitizeCordisteText(titre);
  const ncRef =
    cleanTitle.match(/#?(NC-\d{4}-\d+)/i)?.[0]?.replace(/^#/, "") ??
    description.match(/#?(NC-\d{4}-\d+)/i)?.[0]?.replace(/^#/, "");

  if (ncRef && /Corrective Action/i.test(cleanTitle)) {
    return `Action corrective ${ncRef}`;
  }

  if (cleanTitle && !BASE64_IMAGE.test(cleanTitle) && cleanTitle.length < 200) {
    return cleanTitle;
  }

  const descField = extractCordisteFields(sanitizeCordisteText(description)).find(
    ([label]) => label === "Description",
  )?.[1];

  if (descField) {
    return descField.length > 120 ? `${descField.slice(0, 120)}…` : descField;
  }

  return ncRef ? `Non-conformité ${ncRef}` : "Import Cordiste";
}

/** Formatage à l'affichage (données déjà en base ou fraîchement importées). */
export function formatCordisteDescriptionForDisplay(text: string): {
  summary: string;
  signatures: string[];
} {
  const signatures = extractCordisteSignatures(text);

  if (/^Réf\.\s*NC-/m.test(text) && !BASE64_IMAGE.test(text)) {
    return { summary: text.trim(), signatures };
  }

  const firstLineBreak = text.indexOf("\n");
  const titre = firstLineBreak === -1 ? text : text.slice(0, firstLineBreak);
  const body = firstLineBreak === -1 ? "" : text.slice(firstLineBreak + 1);

  const summary = formatCordisteDescription(titre, body || text);
  return { summary: summary || sanitizeCordisteText(text), signatures };
}

export function isCordisteRecord(id: string): boolean {
  return id.startsWith("CORD-");
}
