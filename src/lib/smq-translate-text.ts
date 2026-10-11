import { aiLocaleInstruction, type SmqLocale } from "@/lib/smq-i18n";
import type { SmqEvent } from "@/lib/types";

const DEFAULT_MODEL = "claude-sonnet-4-6";
const MAX_CHUNK_ITEMS = 12;
const MAX_CHUNK_CHARS = 14_000;

const translationCache = new Map<string, string>();

function getApiKey(): string | null {
  const key = process.env.ANTHROPIC_API_KEY?.trim().replace(/^["']|["']$/g, "");
  return key || null;
}

function looksFrench(text: string): boolean {
  const sample = text.slice(0, 400).toLowerCase();
  return /[àâäéèêëïîôùûüç]|(\b(le|la|les|des|une|pour|avec|dans|audit|réunion)\b)/.test(
    sample,
  );
}

async function callTranslateBatch(texts: string[], locale: SmqLocale): Promise<string[]> {
  const apiKey = getApiKey();
  if (!apiKey || texts.length === 0) return texts;

  const localeLine = aiLocaleInstruction(locale);
  const payload = JSON.stringify(texts);
  const body = {
    max_tokens: 8192,
    messages: [
      {
        role: "user" as const,
        content: `${localeLine}

Translate each string in the following JSON array to English. Keep line breaks, numbering, and structure. Do not add commentary.

Return ONLY a valid JSON array of strings with the same length and order as the input.

Input:
${payload}`,
      },
    ],
  };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: DEFAULT_MODEL, ...body }),
  });

  if (!res.ok) return texts;

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const raw =
    data.content
      ?.filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("\n")
      .trim() ?? "";

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

/** Traduit les textes libres (ODJ, CR, descriptions…) pour locale EN. */
export async function translateSmqPlainTexts(
  texts: readonly string[],
  locale: SmqLocale,
): Promise<string[]> {
  if (locale === "fr") return [...texts];

  const result = [...texts];
  const pending: { index: number; text: string }[] = [];

  texts.forEach((text, index) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!looksFrench(trimmed)) return;

    const cacheKey = `en:${trimmed}`;
    const cached = translationCache.get(cacheKey);
    if (cached) {
      result[index] = cached;
      return;
    }
    pending.push({ index, text: trimmed });
  });

  if (pending.length === 0) return result;

  const translated = await translateChunk(
    pending.map((p) => p.text),
    locale,
  );

  pending.forEach((p, i) => {
    const next = translated[i] ?? p.text;
    result[p.index] = next;
    translationCache.set(`en:${p.text}`, next);
  });

  return result;
}

export async function translateSmqPlainText(text: string, locale: SmqLocale): Promise<string> {
  const [out] = await translateSmqPlainTexts([text], locale);
  return out;
}

export async function localizeSmqEventsForLocale(
  events: SmqEvent[],
  locale: SmqLocale,
): Promise<SmqEvent[]> {
  if (locale === "fr" || events.length === 0) return events;

  const flat = events.flatMap((e) => [e.ordreDuJour, e.compteRendu, e.participants]);
  const translated = await translateSmqPlainTexts(flat, locale);
  let i = 0;

  return events.map((e) => ({
    ...e,
    ordreDuJour: translated[i++] ?? e.ordreDuJour,
    compteRendu: translated[i++] ?? e.compteRendu,
    participants: translated[i++] ?? e.participants,
  }));
}
