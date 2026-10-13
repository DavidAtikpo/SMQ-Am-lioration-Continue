"use client";

import { useState } from "react";
import { Building2, Plus, X } from "lucide-react";
import { Btn, LoadingState, TextInput } from "@/components/ui";
import { SmqPageHeader } from "@/components/layout/smq-page-header";
import { useSmqFilteredData } from "@/hooks/use-smq-filtered-data";
import { useSmqLocale } from "@/hooks/use-smq-locale";

export function ServicesPanel() {
  const { t, tr } = useSmqLocale();
  const { data, loading, error, refresh } = useSmqFilteredData();
  const [newService, setNewService] = useState("");

  if (loading || !data) return <LoadingState error={error} onRetry={() => void refresh()} />;

  const { services, nonConformites: nc, actions } = data;

  async function add() {
    const name = newService.trim();
    if (!name) return;
    await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setNewService("");
    await refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/services/${id}`, { method: "DELETE" });
    await refresh();
  }

  return (
    <div>
      <SmqPageHeader title={t("servicesTitle")} sub={t("servicesSub")} code="SMQ-SVC" />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <TextInput
          value={newService}
          onChange={setNewService}
          placeholder={t("phNewService")}
          className="flex-1"
        />
        <Btn onClick={() => void add()} className="w-full sm:w-auto">
          <Plus size={14} /> {t("add")}
        </Btn>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {services.map((s) => {
          const ncCount = nc.filter((n) => n.serviceId === s.id).length;
          const ncOuvertes = nc.filter(
            (n) => n.serviceId === s.id && n.statut !== "Clôturée",
          ).length;
          const actCount = actions.filter((a) => a.serviceId === s.id).length;

          return (
            <div key={s.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 font-display text-sm font-bold">
                  <Building2 size={16} className="text-muted" />
                  {tr(s.name)}
                </div>
                <button
                  type="button"
                  onClick={() => void remove(s.id)}
                  className="cursor-pointer text-muted-light"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="mt-2 text-xs leading-relaxed text-muted">
                {t("servicesNcTotal")} : <strong>{ncCount}</strong> ({ncOuvertes}{" "}
                {t("servicesNcOpen")})
                <br />
                {t("servicesActions")} : <strong>{actCount}</strong>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
