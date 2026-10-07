"use client";

import { useEffect } from "react";
import { useSmqLocale } from "@/hooks/use-smq-locale";

export function SmqHtmlLang() {
  const { locale } = useSmqLocale();

  useEffect(() => {
    document.documentElement.lang = locale === "en" ? "en" : "fr";
  }, [locale]);

  return null;
}
