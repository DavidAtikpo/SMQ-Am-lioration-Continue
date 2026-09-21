"use client";

import { useMemo } from "react";
import { useSmqData } from "@/hooks/use-smq-data";
import { useSmqZone } from "@/hooks/use-smq-zone";
import {
  filterActionsByZone,
  filterByZone,
  filterIndicatorsByZone,
} from "@/lib/smq-zone";

export function useSmqFilteredData() {
  const { data, loading, error, refresh } = useSmqData();
  const { zone, setZone } = useSmqZone();

  const filteredData = useMemo(() => {
    if (!data) return null;
    const nonConformites = filterByZone(data.nonConformites, zone);
    const ncZoneById = new Map(data.nonConformites.map((nc) => [nc.id, nc.zone]));
    const actions = filterActionsByZone(data.actions, zone, ncZoneById);
    const indicators = filterIndicatorsByZone(data.indicators, zone);
    return { ...data, nonConformites, actions, indicators };
  }, [data, zone]);

  return { data: filteredData, loading, error, refresh, zone, setZone };
}
