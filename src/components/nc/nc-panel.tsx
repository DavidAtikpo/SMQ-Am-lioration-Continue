"use client";

import { useState } from "react";
import { AlertTriangle, Check, Loader2, Plus, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { CordisteRichText } from "@/components/ui/cordiste-rich-text";
import {
  Btn,
  EmptyState,
  Field,
  LoadingState,
  SelectInput,
  StatusStamp,
  TextArea,
  TextInput,
} from "@/components/ui";
import { AiContent } from "@/components/ui/ai-content";
import { SmqPageHeader } from "@/components/layout/smq-page-header";
import { NC_GRAVITES, NC_SOURCES, NC_STATUTS } from "@/lib/constants";
import { useSmqFilteredData } from "@/hooks/use-smq-filtered-data";
import type { NonConformite } from "@/lib/types";
import { fmtDate, todayISO } from "@/lib/utils";

type NcForm = {
  id?: string;
  date: string;
  serviceId: string;
  source: string;
  gravite: string;
  statut: string;
  description: string;
  causeRacine: string;
  responsable: string;
};

function emptyNC(serviceId: string): NcForm {
  return {
    date: todayISO(),
    serviceId,
    source: NC_SOURCES[0],
    gravite: NC_GRAVITES[0],
    statut: NC_STATUTS[0],
    description: "",
    causeRacine: "",
    responsable: "",
  };
}

export function NcPanel() {
  const router = useRouter();
  const { data, loading, error, refresh } = useSmqFilteredData();
  const [form, setForm] = useState<NcForm | null>(null);
  const [filterStatut, setFilterStatut] = useState("Toutes");
  const [filterService, setFilterService] = useState("Tous");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState("");

  if (loading || !data) return <LoadingState error={error} onRetry={() => void refresh()} />;

  const { services, nonConformites: nc, actions } = data;

  const filtered = nc.filter(
    (n) =>
      (filterStatut === "Toutes" || n.statut === filterStatut) &&
      (filterService === "Tous" || n.service.name === filterService),
  );

  async function save() {
    if (!form?.description.trim()) return;
    await fetch("/api/nc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    await refresh();
    setForm(null);
  }

  async function remove(id: string) {
    await fetch(`/api/nc/${id}`, { method: "DELETE" });
    await refresh();
  }

  async function askAI(payload: NonConformite) {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "nc-suggest",
          payload: {
            id: payload.id,
            service: payload.service.name,
            source: payload.source,
            gravite: payload.gravite,
            description: payload.description,
            causeRacine: payload.causeRacine,
          },
        }),
      });
      const json = (await res.json()) as { text?: string };
      setAiText(json.text ?? "Pas de réponse.");
    } catch {
      setAiText("Erreur lors de la génération. Réessayez.");
    } finally {
      setAiLoading(false);
    }
  }

  function onCreateAction(item: NonConformite) {
    const params = new URLSearchParams({
      ncId: item.id,
      origine: item.id,
      serviceId: item.serviceId,
      description: `Traiter : ${item.description}`,
    });
    router.push(`/actions?${params.toString()}`);
  }

  return (
    <div>
      <SmqPageHeader
        title="Non-conformités"
        sub="Recueil et suivi des NC"
        code="SMQ-NC"
      />

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <SelectInput
          value={filterStatut}
          onChange={setFilterStatut}
          options={["Toutes", ...NC_STATUTS]}
          className="w-full sm:w-auto sm:min-w-[140px]"
        />
        <SelectInput
          value={filterService}
          onChange={setFilterService}
          options={["Tous", ...services.map((s) => s.name)]}
          className="w-full sm:w-auto sm:min-w-[160px]"
        />
        <div className="flex-1" />
        <Btn onClick={() => setForm(emptyNC(services[0]?.id ?? ""))}>
          <Plus size={14} /> Nouvelle non-conformité
        </Btn>
      </div>

      {form && (
        <div className="mb-4 rounded-[10px] border-[1.5px] border-ink bg-surface p-4.5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display font-bold">
              {form.id ? `Modifier ${form.id}` : "Nouvelle non-conformité"}
            </h2>
            <button type="button" onClick={() => setForm(null)} className="cursor-pointer">
              <X size={16} />
            </button>
          </div>

          <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Date de constat">
              <TextInput
                type="date"
                value={form.date}
                onChange={(date) => setForm({ ...form, date })}
              />
            </Field>
            <Field label="Service concerné">
              <select
                value={form.serviceId}
                onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
                className="input-base"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Source">
              <SelectInput
                value={form.source}
                onChange={(source) => setForm({ ...form, source })}
                options={NC_SOURCES}
              />
            </Field>
            <Field label="Gravité">
              <SelectInput
                value={form.gravite}
                onChange={(gravite) => setForm({ ...form, gravite })}
                options={NC_GRAVITES}
              />
            </Field>
            <Field label="Statut">
              <SelectInput
                value={form.statut}
                onChange={(statut) => setForm({ ...form, statut })}
                options={NC_STATUTS}
              />
            </Field>
            <Field label="Responsable du traitement">
              <TextInput
                value={form.responsable}
                onChange={(responsable) => setForm({ ...form, responsable })}
                placeholder="Nom / fonction"
              />
            </Field>
          </div>

          <Field label="Description de la non-conformité">
            <TextArea
              value={form.description}
              onChange={(description) => setForm({ ...form, description })}
              placeholder="Que s'est-il passé, où, comment détecté ?"
            />
          </Field>

          <div className="h-2.5" />

          <Field label="Analyse de la cause racine">
            <TextArea
              value={form.causeRacine}
              onChange={(causeRacine) => setForm({ ...form, causeRacine })}
              placeholder="Pourquoi cela s'est produit (5 pourquoi, Ishikawa...)"
            />
          </Field>

          <div className="mt-3.5 flex flex-wrap gap-2">
            <Btn onClick={() => void save()}>
              <Check size={14} /> Enregistrer
            </Btn>
            {form.description && (
              <Btn kind="ghost" onClick={() => void askAI(form as NonConformite)} disabled={aiLoading}>
                {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Suggestion IA d&apos;action corrective
              </Btn>
            )}
          </div>

          {aiText && (
            <div className="mt-3 rounded-lg bg-paper-alt p-3">
              <AiContent content={aiText} className="text-[13px]" />
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon={AlertTriangle} text="Aucune non-conformité ne correspond aux filtres." />
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((n) => {
            const linked = actions.filter((a) => a.origine === n.id || a.ncId === n.id);
            return (
              <div key={n.id} className="card">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="break-words font-mono text-[11px] text-muted-light sm:text-[11.5px]">
                      {n.id} · {fmtDate(n.date)} · {n.service.name}
                    </div>
                    <CordisteRichText id={n.id} text={n.description} className="my-1" />
                    <div className="text-xs text-muted">
                      Source : {n.source} · Gravité : {n.gravite}
                      {n.responsable && ` · Resp. ${n.responsable}`}
                    </div>
                  </div>
                  <StatusStamp label={n.statut} />
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <Btn
                    kind="ghost"
                    className="px-2.5 py-1.5 text-xs"
                    onClick={() =>
                      setForm({
                        id: n.id,
                        date: n.date,
                        serviceId: n.serviceId,
                        source: n.source,
                        gravite: n.gravite,
                        statut: n.statut,
                        description: n.description,
                        causeRacine: n.causeRacine,
                        responsable: n.responsable,
                      })
                    }
                  >
                    Modifier
                  </Btn>
                  <Btn
                    kind="danger"
                    className="px-2.5 py-1.5 text-xs"
                    onClick={() => void remove(n.id)}
                  >
                    Supprimer
                  </Btn>
                  {linked.length === 0 && n.statut !== "Clôturée" && (
                    <Btn
                      kind="ghost"
                      className="px-2.5 py-1.5 text-xs"
                      onClick={() => onCreateAction(n)}
                    >
                      <Plus size={12} /> Créer l&apos;action corrective
                    </Btn>
                  )}
                  {linked.length > 0 && (
                    <span className="text-xs text-steel">{linked.length} action(s) liée(s)</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
