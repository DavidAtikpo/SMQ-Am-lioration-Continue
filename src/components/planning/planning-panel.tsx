"use client";

import { useState } from "react";
import { CalendarClock, Check, Loader2, Plus, Sparkles, X } from "lucide-react";
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
import { AiContent } from "@/components/ui/ai-content";
import { COLORS, EVENT_STATUTS, EVENT_TYPES } from "@/lib/constants";
import { useSmqData } from "@/hooks/use-smq-data";
import { fmtDate } from "@/lib/utils";

type EventForm = {
  id?: string;
  type: string;
  date: string;
  statut: string;
  servicesConcernes: string[];
  participants: string;
  ordreDuJour: string;
  compteRendu: string;
};

function emptyEvent(): EventForm {
  return {
    type: EVENT_TYPES[0],
    date: "",
    statut: EVENT_STATUTS[0],
    servicesConcernes: [],
    participants: "",
    ordreDuJour: "",
    compteRendu: "",
  };
}

export function PlanningPanel() {
  const { data, loading, error, refresh } = useSmqData();
  const [form, setForm] = useState<EventForm | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [genMessage, setGenMessage] = useState<string | null>(null);

  if (loading || !data) return <LoadingState error={error} onRetry={() => void refresh()} />;

  const { services, events } = data;
  const year = new Date().getFullYear();
  const thisYear = events.filter((e) => e.date.startsWith(String(year)));
  const reunions = thisYear.filter((e) => e.type === "Réunion interne").length;
  const audits = thisYear.filter((e) => e.type === "Audit interne").length;
  const revues = thisYear.filter((e) => e.type === "Revue de Direction").length;

  const rythme = [
    { label: "Réunions internes", cible: 4, fait: reunions },
    { label: "Audits internes", cible: 2, fait: audits },
    { label: "Revue de Direction", cible: 1, fait: revues },
  ];

  async function save() {
    if (!form?.date) return;
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    await refresh();
    setForm(null);
  }

  async function remove(id: string) {
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    await refresh();
  }

  function toggleService(name: string) {
    if (!form) return;
    const has = form.servicesConcernes.includes(name);
    setForm({
      ...form,
      servicesConcernes: has
        ? form.servicesConcernes.filter((x) => x !== name)
        : [...form.servicesConcernes, name],
    });
  }

  async function askAI() {
    if (!form) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "agenda", payload: form }),
      });
      const json = (await res.json()) as { text?: string };
      setAiText(json.text ?? "Pas de réponse.");
    } catch {
      setAiText("Erreur lors de la génération. Réessayez.");
    } finally {
      setAiLoading(false);
    }
  }

  async function generateQhseCalendar() {
    setGenLoading(true);
    setGenMessage(null);
    try {
      const res = await fetch("/api/planning/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year }),
      });
      const json = (await res.json()) as {
        error?: string;
        created?: number;
        existing?: number;
      };
      if (!res.ok) {
        setGenMessage(json.error ?? "Génération échouée.");
        return;
      }
      setGenMessage(
        `${json.created ?? 0} événement(s) QHSE créé(s) · ${json.existing ?? 0} déjà planifié(s).`,
      );
      await refresh();
    } catch {
      setGenMessage("Impossible de générer le calendrier QHSE.");
    } finally {
      setGenLoading(false);
    }
  }

  async function askPrep(kind: "audit-prep" | "revue-prep") {
    setAiLoading(true);
    setAiText("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const json = (await res.json()) as { text?: string };
      setAiText(json.text ?? "Pas de réponse.");
    } catch {
      setAiText("Erreur lors de la génération. Réessayez.");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div>
      <DocHeader
        title="Planification SMQ"
        sub={`Réunions, audits internes et revue de direction — année ${year}`}
        code="SMQ-PLAN"
      />

      <div className="mb-5 grid grid-cols-1 gap-3.5 md:grid-cols-3">
        {rythme.map((r) => (
          <div key={r.label} className="card">
            <div className="text-[12.5px] font-semibold text-muted">{r.label}</div>
            <div className="mt-1 font-display text-2xl font-bold">
              {r.fait}{" "}
              <span className="text-sm font-medium text-muted-light">
                / {r.cible} cible {year}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded bg-paper-alt">
              <div
                className="h-full"
                style={{
                  width: `${Math.min(100, (r.fait / r.cible) * 100)}%`,
                  background: r.fait >= r.cible ? COLORS.teal : COLORS.amber,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mb-3.5 flex flex-wrap justify-end gap-2">
        <Btn onClick={() => void generateQhseCalendar()} disabled={genLoading}>
          {genLoading ? <Loader2 size={14} className="animate-spin" /> : <CalendarClock size={14} />}
          Générer calendrier QHSE {year}
        </Btn>
        <Btn kind="ghost" onClick={() => void askPrep("audit-prep")} disabled={aiLoading}>
          <Sparkles size={14} /> Préparer audit interne
        </Btn>
        <Btn kind="ghost" onClick={() => void askPrep("revue-prep")} disabled={aiLoading}>
          <Sparkles size={14} /> Préparer revue de direction
        </Btn>
        <Btn onClick={() => setForm(emptyEvent())}>
          <Plus size={14} /> Planifier un événement
        </Btn>
      </div>
      {genMessage && (
        <div className="mb-4 rounded-[10px] border border-line bg-surface px-4 py-3 text-sm text-muted">
          {genMessage}
        </div>
      )}
      {aiText && !form && (
        <div className="mb-4 rounded-[10px] border border-line bg-paper-alt p-4">
          <AiContent content={aiText} className="text-[13px]" />
        </div>
      )}

      {form && (
        <div className="mb-4 rounded-[10px] border-[1.5px] border-ink bg-surface p-4.5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display font-bold">
              {form.id ? `Modifier ${form.id}` : "Nouvel événement"}
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
                options={EVENT_TYPES}
              />
            </Field>
            <Field label="Date">
              <TextInput
                type="date"
                value={form.date}
                onChange={(date) => setForm({ ...form, date })}
              />
            </Field>
            <Field label="Statut">
              <SelectInput
                value={form.statut}
                onChange={(statut) => setForm({ ...form, statut })}
                options={EVENT_STATUTS}
              />
            </Field>
          </div>

          <Field label="Services concernés">
            <div className="mt-0.5 flex flex-wrap gap-1.5">
              {services.map((s) => {
                const selected = form.servicesConcernes.includes(s.name);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleService(s.name)}
                    className="cursor-pointer rounded-full border-[1.5px] px-2.5 py-1 text-[11.5px] font-semibold"
                    style={{
                      borderColor: selected ? COLORS.ink : COLORS.line,
                      background: selected ? COLORS.ink : "transparent",
                      color: selected ? COLORS.paper : "#5B5648",
                    }}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="h-3" />

          <Field label="Participants">
            <TextInput
              value={form.participants}
              onChange={(participants) => setForm({ ...form, participants })}
              placeholder="Noms / fonctions"
            />
          </Field>

          <div className="h-3" />

          <Field label="Ordre du jour">
            <TextArea
              value={form.ordreDuJour}
              onChange={(ordreDuJour) => setForm({ ...form, ordreDuJour })}
            />
          </Field>

          <div className="h-3" />

          <Field label="Compte-rendu / constats">
            <TextArea
              value={form.compteRendu}
              onChange={(compteRendu) => setForm({ ...form, compteRendu })}
              placeholder="À compléter après l'événement"
            />
          </Field>

          <div className="mt-3.5 flex flex-wrap gap-2">
            <Btn onClick={() => void save()}>
              <Check size={14} /> Enregistrer
            </Btn>
            <Btn kind="ghost" onClick={() => void askAI()} disabled={aiLoading}>
              {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Générer l&apos;ordre du jour avec l&apos;IA
            </Btn>
          </div>

          {aiText && (
            <div className="mt-3 rounded-lg bg-paper-alt p-3">
              <AiContent content={aiText} className="text-[13px]" />
            </div>
          )}
        </div>
      )}

      {events.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          text="Aucun événement planifié. La règle QHSE : 4 réunions internes, 2 audits internes et 1 revue de direction par an."
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {events.map((e) => (
            <div key={e.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-[11.5px] text-muted-light">
                    {e.id} · {fmtDate(e.date)}
                  </div>
                  <div className="my-1 text-sm font-semibold">{e.type}</div>
                  {e.servicesConcernes.length > 0 && (
                    <div className="text-xs text-muted">
                      Services : {e.servicesConcernes.join(", ")}
                    </div>
                  )}
                </div>
                <StatusStamp label={e.statut} />
              </div>
              <div className="mt-2.5 flex gap-2">
                <Btn
                  kind="ghost"
                  className="px-2.5 py-1.5 text-xs"
                  onClick={() => setForm({ ...emptyEvent(), ...e })}
                >
                  Modifier
                </Btn>
                <Btn
                  kind="danger"
                  className="px-2.5 py-1.5 text-xs"
                  onClick={() => void remove(e.id)}
                >
                  Supprimer
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
