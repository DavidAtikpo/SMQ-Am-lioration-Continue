"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { SMQ_ZONES, type SmqZone } from "@/lib/smq-zone";

type SmqZoneContextValue = {
  zone: SmqZone;
  setZone: (zone: SmqZone) => void;
};

const STORAGE_KEY = "smq-zone-filter";

const SmqZoneContext = createContext<SmqZoneContextValue | null>(null);

function readStoredZone(): SmqZone {
  if (typeof window === "undefined") return "Monde";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && SMQ_ZONES.includes(stored as SmqZone)) {
    return stored as SmqZone;
  }
  return "Monde";
}

export function SmqZoneProvider({ children }: { children: React.ReactNode }) {
  const [zone, setZoneState] = useState<SmqZone>(() =>
    typeof window === "undefined" ? "Monde" : readStoredZone(),
  );

  const setZone = (next: SmqZone) => {
    setZoneState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  };

  const value = useMemo(() => ({ zone, setZone }), [zone]);

  return <SmqZoneContext.Provider value={value}>{children}</SmqZoneContext.Provider>;
}

export function useSmqZone() {
  const ctx = useContext(SmqZoneContext);
  if (!ctx) {
    throw new Error("useSmqZone must be used within SmqZoneProvider");
  }
  return ctx;
}
