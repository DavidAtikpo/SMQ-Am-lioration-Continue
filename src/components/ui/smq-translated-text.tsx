"use client";

import { useEffect, useState } from "react";
import { useSmqLocale } from "@/hooks/use-smq-locale";

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
    if (!trimmed || locale === "fr") {
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
      .then((res) => res.json())
      .then((json: { texts?: string[] }) => {
        if (cancelled) return;
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
