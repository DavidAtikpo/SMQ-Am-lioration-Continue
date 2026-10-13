"use client";

import { useEffect, useState } from "react";
import { useSmqLocale } from "@/hooks/use-smq-locale";
import { needsEnglishTranslation } from "@/lib/smq-looks-french";

const clientCache = new Map<string, string>();

type SmqTranslatedTextProps = {
  text: string;
  className?: string;
  as?: "div" | "p" | "span";
};

export function SmqTranslatedText({
  text,
  className = "",
  as: Tag = "div",
}: SmqTranslatedTextProps) {
  const { locale } = useSmqLocale();
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    const trimmed = text.trim();
    if (!trimmed || !needsEnglishTranslation(trimmed, locale)) {
      setDisplay(text);
      return;
    }

    const cacheKey = `en:${trimmed}`;
    const cached = clientCache.get(cacheKey);
    if (cached) {
      setDisplay(cached);
      return;
    }

    let cancelled = false;
    void fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale, texts: [trimmed] }),
    })
      .then(async (res) => {
        const json = (await res.json()) as { texts?: string[]; error?: string };
        if (cancelled || !res.ok) return;
        const next = json.texts?.[0]?.trim() || trimmed;
        clientCache.set(cacheKey, next);
        setDisplay(next);
      })
      .catch(() => {
        if (!cancelled) setDisplay(text);
      });

    return () => {
      cancelled = true;
    };
  }, [text, locale]);

  return (
    <Tag className={`whitespace-pre-wrap ${className}`.trim()}>{display}</Tag>
  );
}
