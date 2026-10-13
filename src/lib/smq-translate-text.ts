import { aiLocaleInstruction, type SmqLocale } from "@/lib/smq-i18n";
import {
  looksFrench,
  needsEnglishTranslation,
  translationLooksSuccessful,
} from "@/lib/smq-looks-french";
import { getAnthropicApiKey } from "@/lib/anthropic-api-key";
import { applyStaticTranslations, staticEnForFrenchText } from "@/lib/smq-static-en";
import type { SmqData, SmqEvent } from "@/lib/types";

const DEFAULT_MODEL = "claude-sonnet-4-6";
const MAX_CHUNK_ITEMS = 8;
const MAX_CHUNK_CHARS = 4_000;
const MAX_LINE_GROUP_CHARS = 2_000;

const translationCache = new Map<string, string>();

function getApiKey(): string | null {
  return getAnthropicApiKey();
}

function extractAssistantText(data: {
  content?: Array<{ type: string; text?: string }>;
}): string {
  return (
    data.content
      ?.filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("\n")
      .trim() ?? ""
  );
}

/** Traduction directe d'un bloc Markdown (comptes-rendus d'audit). */
async function callTranslateDocument(text: string, locale: SmqLocale): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey || locale !== "en") return null;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      max_tokens: 16_384,
      messages: [
        {
          role: "user",
          content: `${aiLocaleInstruction(locale)}

Translate the following French QMS document to English.
Preserve Markdown exactly (# and ## headings, **bold**, bullet lists, markdown tables with | pipes).
Keep names (people, companies), reference codes (EVT-…, QHSE-…), and dates unchanged.
Output ONLY the translated document — no introduction or commentary.

---BEGIN---
${text}
---END---`,
        },
      ],
    }),
  });

  if (!res.ok) {
    console.error("SMQ translate document HTTP", res.status);
    return null;
  }

  const raw = extractAssistantText((await res.json()) as { content?: Array<{ type: string; text?: string }> });
  if (!raw) return null;
  return raw.replace(/^---BEGIN---\s*/i, "").replace(/\s*---END---\s*$/i, "").trim();
}

async function callTranslateBatch(texts: string[], locale: SmqLocale): Promise<string[]> {
  const apiKey = getApiKey();
  if (!apiKey || texts.length === 0) return texts;

  const localeLine = aiLocaleInstruction(locale);
  const payload = JSON.stringify(texts);
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      max_tokens: 16_384,
      messages: [
        {
          role: "user",
          content: `${localeLine}

Translate each string in the following JSON array to English.
Preserve Markdown if present (# headings, **bold**, bullet lists, tables with | pipes).
Keep line breaks, numbering, and structure. Do not add commentary.

Return ONLY a valid JSON array of strings with the same length and order as the input.

Input:
${payload}`,
        },
      ],
    }),
  });

  if (!res.ok) return texts;

  const raw = extractAssistantText((await res.json()) as { content?: Array<{ type: string; text?: string }> });
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return texts;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as unknown;
    if (!Array.isArray(parsed) || parsed.length !== texts.length) return texts;
    return parsed.map((item, i) => (typeof item === "string" ? item : texts[i]));
  } catch {
    return texts;
  }
}

async function translateChunk(texts: string[], locale: SmqLocale): Promise<string[]> {
  let size = 0;
  const chunks: string[][] = [];
  let current: string[] = [];

  for (const text of texts) {
    const nextSize = size + text.length;
    if (current.length >= MAX_CHUNK_ITEMS || nextSize > MAX_CHUNK_CHARS) {
      if (current.length) chunks.push(current);
      current = [text];
      size = text.length;
    } else {
      current.push(text);
      size = nextSize;
    }
  }
  if (current.length) chunks.push(current);

  const out: string[] = [];
  for (const chunk of chunks) {
    const translated = await callTranslateBatch(chunk, locale);
    out.push(...translated);
  }
  return out;
}

function splitTextForTranslation(text: string): string[] {
  const lines = text.split("\n");
  const chunks: string[] = [];
  let buf = "";

  const flush = () => {
    const t = buf.trim();
    if (t) chunks.push(t);
    buf = "";
  };

  for (const line of lines) {
    const candidate = buf ? `${buf}\n${line}` : line;
    if (candidate.length > MAX_LINE_GROUP_CHARS && buf) {
      flush();
      buf = line;
    } else {
      buf = candidate;
    }
  }
  flush();

  return chunks.length > 0 ? chunks : [text];
}

async function translatePart(part: string, locale: SmqLocale): Promise<string> {
  if (part.length >= 80) {
    const doc = await callTranslateDocument(part, locale);
    if (doc && doc.trim() !== part.trim()) return doc;
  }

  const [batch] = await translateChunk([part], locale);
  const out = batch ?? part;
  if (out.trim() !== part.trim()) return out;

  if (part.length >= 80) {
    const doc = await callTranslateDocument(part, locale);
    if (doc && doc.trim() !== part.trim()) return doc;
  }

  return out;
}

async function translateByLines(text: string, locale: SmqLocale): Promise<string> {
  if (!getApiKey()) return text;

  const lines = text.split("\n");
  const out: string[] = [];

  for (const line of lines) {
    const core = line.trim();
    if (!core || !needsEnglishTranslation(core, locale)) {
      out.push(line);
      continue;
    }

    let translated = core;
    const doc = await callTranslateDocument(core, locale);
    if (doc?.trim() && doc.trim() !== core) {
      translated = doc.trim();
    } else {
      const [one] = await translateChunk([core], locale);
      if (one?.trim() && one.trim() !== core) translated = one.trim();
    }

    out.push(line.includes(core) ? line.replace(core, translated) : translated);
  }

  return out.join("\n");
}

async function translateOneLongText(text: string, locale: SmqLocale): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed || locale === "fr") return text;
  if (!needsEnglishTranslation(trimmed, locale)) return text;

  const cacheKey = `en:${trimmed}`;
  const cached = translationCache.get(cacheKey);
  if (cached) return cached;

  const afterStatic = locale === "en" ? applyStaticTranslations(trimmed) : trimmed;
  const staticFull = locale === "en" ? staticEnForFrenchText(afterStatic) : null;
  const baseline = staticFull ?? afterStatic;

  if (!needsEnglishTranslation(baseline, locale)) {
    if (baseline !== trimmed) translationCache.set(cacheKey, baseline);
    return baseline;
  }

  const parts = splitTextForTranslation(baseline);
  const translatedParts: string[] = [];
  for (const part of parts) {
    translatedParts.push(await translatePart(part, locale));
  }

  let result = translatedParts.join("\n").trim() ? translatedParts.join("\n") : baseline;

  if (looksFrench(result) && needsEnglishTranslation(result, locale)) {
    result = await translateByLines(result, locale);
  }

  if (
    !looksFrench(result) ||
    translationLooksSuccessful(baseline, result) ||
    translationLooksSuccessful(trimmed, result)
  ) {
    translationCache.set(cacheKey, result);
  }

  return result;
}

/** Traduit les textes libres (ODJ, CR, descriptions…) pour locale EN. */
export async function translateSmqPlainTexts(
  texts: readonly string[],
  locale: SmqLocale,
): Promise<string[]> {
  if (locale === "fr") return [...texts];

  return Promise.all(texts.map((text) => translateOneLongText(text, locale)));
}

export async function translateSmqPlainText(text: string, locale: SmqLocale): Promise<string> {
  return translateOneLongText(text, locale);
}

export async function localizeSmqEventsForLocale(
  events: SmqEvent[],
  locale: SmqLocale,
): Promise<SmqEvent[]> {
  if (locale === "fr" || events.length === 0) return events;

  return Promise.all(
    events.map(async (e) => ({
      ...e,
      ordreDuJour: await translateOneLongText(e.ordreDuJour, locale),
      compteRendu: await translateOneLongText(e.compteRendu, locale),
      participants: await translateOneLongText(e.participants, locale),
    })),
  );
}

/** Données SMQ affichées (événements, NC, actions) — ne modifie pas la base. */
export async function localizeSmqDataForLocale(
  data: SmqData,
  locale: SmqLocale,
): Promise<SmqData> {
  if (locale === "fr") return data;

  const events = await localizeSmqEventsForLocale(data.events, locale);

  const flat: string[] = [];
  for (const n of data.nonConformites) {
    flat.push(n.description, n.causeRacine);
  }
  for (const a of data.actions) {
    flat.push(a.description);
  }

  const translatedFlat = await translateSmqPlainTexts(flat, locale);
  let j = 0;

  const nonConformites = data.nonConformites.map((n) => ({
    ...n,
    description: translatedFlat[j++] ?? n.description,
    causeRacine: translatedFlat[j++] ?? n.causeRacine,
  }));

  const actions = data.actions.map((a) => ({
    ...a,
    description: translatedFlat[j++] ?? a.description,
  }));

  return { ...data, events, nonConformites, actions };
}
