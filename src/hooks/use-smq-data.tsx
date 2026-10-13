"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSmqLocale } from "@/hooks/use-smq-locale";
import type { SmqData } from "@/lib/types";

type SmqContextValue = {
  data: SmqData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const SmqContext = createContext<SmqContextValue | null>(null);

async function fetchSmqData(
  locale: string,
): Promise<{ data: SmqData | null; error: string | null }> {
  try {
    const qs = new URLSearchParams({ locale });
    const res = await fetch(`/api/services?${qs.toString()}`);
    if (!res.ok) {
      return {
        data: null,
        error: `Impossible de charger les données (erreur ${res.status}).`,
      };
    }
    const json = (await res.json()) as SmqData;
    return { data: json, error: null };
  } catch {
    return {
      data: null,
      error: "Connexion à l'API impossible. Vérifiez que le serveur tourne.",
    };
  }
}

export function SmqProvider({ children }: { children: React.ReactNode }) {
  const { locale } = useSmqLocale();
  const [data, setData] = useState<SmqData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await fetchSmqData(locale);
    setData(result.data);
    setError(result.error);
    setLoading(false);
  }, [locale]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      const result = await fetchSmqData(locale);
      if (cancelled) return;
      setData(result.data);
      setError(result.error);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [locale]);

  const value = useMemo(
    () => ({ data, loading, error, refresh }),
    [data, loading, error, refresh],
  );

  return <SmqContext.Provider value={value}>{children}</SmqContext.Provider>;
}

export function useSmqData() {
  const ctx = useContext(SmqContext);
  if (!ctx) {
    throw new Error("useSmqData must be used within SmqProvider");
  }
  return ctx;
}
