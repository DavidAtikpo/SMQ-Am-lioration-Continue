"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  parseSmqLocale,
  SMQ_LOCALE_STORAGE_KEY,
  type SmqLocale,
} from "@/lib/smq-i18n";
import {
  formatRelativeDeadline,
  getSmqUi,
  navLabel,
  translateSmqStoredLabel,
  type SmqNavKey,
  type SmqUiKey,
} from "@/lib/smq-i18n-ui";

type SmqLocaleContextValue = {
  locale: SmqLocale;
  setLocale: (locale: SmqLocale) => void;
  t: (key: SmqUiKey) => string;
  tr: (storedFrenchLabel: string) => string;
  nav: (key: SmqNavKey) => string;
  relativeDays: (days: number | null | undefined) => string;
};

const SmqLocaleContext = createContext<SmqLocaleContextValue | null>(null);

export function SmqLocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SmqLocale>("fr");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SMQ_LOCALE_STORAGE_KEY);
      if (stored) setLocaleState(parseSmqLocale(stored));
    } catch {
      /* ignore */
    }
  }, []);

  const setLocale = useCallback((next: SmqLocale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(SMQ_LOCALE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const ui = useMemo(() => getSmqUi(locale), [locale]);

  const t = useCallback((key: SmqUiKey) => ui[key], [ui]);
  const tr = useCallback(
    (storedFrenchLabel: string) => translateSmqStoredLabel(storedFrenchLabel, locale),
    [locale],
  );
  const nav = useCallback((key: SmqNavKey) => navLabel(key, locale), [locale]);
  const relativeDays = useCallback(
    (days: number | null | undefined) => formatRelativeDeadline(days, locale, ui),
    [locale, ui],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, tr, nav, relativeDays }),
    [locale, setLocale, t, tr, nav, relativeDays],
  );

  return (
    <SmqLocaleContext.Provider value={value}>{children}</SmqLocaleContext.Provider>
  );
}

export function useSmqLocale() {
  const ctx = useContext(SmqLocaleContext);
  if (!ctx) {
    throw new Error("useSmqLocale must be used within SmqLocaleProvider");
  }
  return ctx;
}
