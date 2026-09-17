"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, ClipboardCheck, Download, Plus, X } from "lucide-react";
import { CordisteRichText } from "@/components/ui/cordiste-rich-text";
import {
  Btn,
  DocHeader,
  EmptyState,
  Field,
  LoadingState,
  SelectInput,
  StatusStamp,
  TextArea,
  TextInput,
} from "@/components/ui";
import {
  ACTION_PRIORITES,
  ACTION_STATUTS,
  ACTION_TYPES,
  COLORS,
} from "@/lib/constants";
import { useSmqData } from "@/hooks/use-smq-data";
import { daysUntil, fmtDate, todayISO } from "@/lib/utils";

type ActionForm = {
  id?: string;
  type: string;
  origine: string;
  description: string;
  serviceId: string;
  responsable: string;
  dateCreation: string;
  echeance: string;
  statut: string;
  priorite: string;
  efficacite: string;
  ncId?: string | null;
};

function emptyAction(serviceId: string): ActionForm {
  return {
    type: ACTION_TYPES[0],
    origine: "",
    description: "",
    serviceId,
    responsable: "",
    dateCreation: todayISO(),
    echeance: "",
    statut: ACTION_STATUTS[0],
    priorite: ACTION_PRIORITES[1],
    efficacite: "",
    ncId: null,
  };
}

export function ActionsPanel() {
  const searchParams = useSearchParams();
  const { data, loading, error, refresh } = useSmqData();
  const [form, setForm] = useState<ActionForm | null>(null);
  const [filterStatut, setFilterStatut] = useState("Toutes");
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    if (!data) return;
    const ncId = searchParams.get("ncId");
    if (!ncId) return;

    setForm({
      ...emptyAction(searchParams.get("serviceId") ?? data.services[0]?.id ?? ""),
      ncId,
      origine: searchParams.get("origine") ?? ncId,
      description: searchParams.get("description") ?? "",
      serviceId: searchParams.get("serviceId") ?? data.services[0]?.id ?? "",
    });
  }, [searchParams, data]);

  if (loading || !data) return <LoadingState error={error} onRetry={() => void refresh()} />;

  const { services, actions } = data;
  const filtered = actions.filter(
    (a) => filterStatut === "Toutes" || a.statut === filterStatut,
  );

  async function save() {
    if (!form?.description.trim()) return;
    await fetch("/api/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    await refresh();
    setForm(null);
  }

  async function remove(id: string) {
    await fetch(`/api/actions/${id}`, { method: "DELETE" });
    await refresh();
  }

  async function downloadPdf() {
    setDownloadingPdf(true);
    try {
      const response = await fetch("/api/actions/pdf");
      if (!response.ok) {
        throw new Error("PDF indisponible");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `audit-action-monitoring-${new Date().toISOString().slice(0, 10)}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      window.alert("Impossible de télécharger le PDF. Vérifiez votre connexion administrateur.");
    } finally {
      setDownloadingPdf(false);
    }
  }

  return (
    <div>
      <DocHeader
        title="Actions correctives, préventives et d'amélioration"
        sub="Plan d'actions du SMQ — tous services"
        code="ENR-CIFRA-QHSE 005"
      />

      <div className="mb-4 flex items-center gap-2.5">
        <SelectInput
          value={filterStatut}
          onChange={setFilterStatut}
          options={["Toutes", ...ACTION_STATUTS]}
        />
        <div className="flex-1" />
        <Btn kind="ghost" disabled={downloadingPdf} onClick={() => void downloadPdf()}>
          <Download size={14} />
          {downloadingPdf ? "PDF…" : "Télécharger PDF"}
        </Btn>
        <Btn onClick={() => setForm(emptyAction(services[0]?.id ?? ""))}>
          <Plus size={14} /> Nouvelle action
        </Btn>
      </div>

      {form && (
        <div className="mb-4 rounded-[10px] border-[1.5px] border-ink bg-surface p-4.5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display font-bold">
              {form.id ? `Modifier ${form.id}` : "Nouvelle action"}
            </h2>
            <button type="button" onClick={() => setForm(null)} className="cursor-pointer">
              <X size={16} />
            </button>
          </div>

          <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Type">
              <SelectInput
                value={form.type}
                onChange={(type) => setForm({ ...form, type })}
                options={ACTION_TYPES}
              />
            </Field>
            <Field label="Service">
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
            <Field label="Priorité">
              <SelectInput
                value={form.priorite}
                onChange={(priorite) => setForm({ ...form, priorite })}
                options={ACTION_PRIORITES}
              />
            </Field>
            <Field label="Origine (n° NC, audit, réunion...)">
              <TextInput
                value={form.origine}
                onChange={(origine) => setForm({ ...form, origine })}
              />
            </Field>
            <Field label="Responsable">
              <TextInput
                value={form.responsable}
                onChange={(responsable) => setForm({ ...form, responsable })}
              />
            </Field>
            <Field label="Échéance">
              <TextInput
                type="date"
                value={form.echeance}
                onChange={(echeance) => setForm({ ...form, echeance })}
              />
            </Field>
            <Field label="Statut">
              <SelectInput
                value={form.statut}
                onChange={(statut) => setForm({ ...form, statut })}
                options={ACTION_STATUTS}
              />
            </Field>
            <Field label="Date de création">
              <TextInput
                type="date"
                value={form.dateCreation}
                onChange={(dateCreation) => setForm({ ...form, dateCreation })}
              />
            </Field>
          </div>

          <Field label="Description de l'action">
            <TextArea
              value={form.description}
              onChange={(description) => setForm({ ...form, description })}
            />
          </Field>

          <div className="h-2.5" />

          <Field label="Vérification de l'efficacité (si réalisée)">
            <TextArea
              value={form.efficacite}
              onChange={(efficacite) => setForm({ ...form, efficacite })}
              placeholder="Preuve que l'action a résolu le problème durablement"
            />
          </Field>

          <div className="mt-3.5">
            <Btn onClick={() => void save()}>
              <Check size={14} /> Enregistrer
            </Btn>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon={ClipboardCheck} text="Aucune action ne correspond au filtre." />
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((a) => {
            const d = a.echeance ? daysUntil(a.echeance) : null;
            const late =
              d !== null &&
              d < 0 &&
              a.statut !== "Réalisée" &&
              a.statut !== "Vérifiée efficace";

            return (
              <div
                key={a.id}
                className="card"
                style={{ borderColor: late ? COLORS.rust : undefined }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-mono text-[11.5px] text-muted-light">
                      {a.id} · {a.type} · {a.service.name}
                      {a.origine && ` · origine ${a.origine}`}
                    </div>
                    <CordisteRichText id={a.id} text={a.description} className="my-1" />
                    <div className="text-xs text-muted">
                      {a.responsable && `Resp. ${a.responsable} · `}
                      Priorité {a.priorite} · Échéance {fmtDate(a.echeance)}
                      {late && (
                        <span className="font-bold text-rust"> · EN RETARD</span>
                      )}
                    </div>
                  </div>
                  <StatusStamp label={a.statut} />
                </div>
                <div className="mt-2.5 flex gap-2">
                  <Btn
                    kind="ghost"
                    className="px-2.5 py-1.5 text-xs"
                    onClick={() =>
                      setForm({
                        id: a.id,
                        type: a.type,
                        origine: a.origine,
                        description: a.description,
                        serviceId: a.serviceId,
                        responsable: a.responsable,
                        dateCreation: a.dateCreation,
                        echeance: a.echeance,
                        statut: a.statut,
                        priorite: a.priorite,
                        efficacite: a.efficacite,
                        ncId: a.ncId,
                      })
                    }
                  >
                    Modifier
                  </Btn>
                  <Btn
                    kind="danger"
                    className="px-2.5 py-1.5 text-xs"
                    onClick={() => void remove(a.id)}
                  >
                    Supprimer
                  </Btn>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
