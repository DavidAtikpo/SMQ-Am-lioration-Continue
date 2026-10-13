"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarClock, Check, Download, Loader2, Plus, Sparkles, X } from "lucide-react";
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
import { COLORS, EVENT_STATUTS, EVENT_TYPES } from "@/lib/constants";
import { useSmqData } from "@/hooks/use-smq-data";
import { useSmqLocale } from "@/hooks/use-smq-locale";
import { useSmqZone } from "@/hooks/use-smq-zone";
import { pickAuditEventForPrep } from "@/lib/smq-audit-helpers";
import {
  defaultEventZoneForFilter,
  filterEventsByZone,
  type SmqEventZone,
} from "@/lib/smq-zone";
import type { SmqEvent } from "@/lib/types";
import { fmtDate } from "@/lib/utils";

type EventForm = {
  id?: string;
  type: string;
  date: string;
  statut: string;
  zone: string;
  servicesConcernes: string[];
  participants: string;
  ordreDuJour: string;
  compteRendu: string;
};

function emptyEvent(zoneDefault: SmqEventZone = "Togo"): EventForm {
  return {
    type: EVENT_TYPES[0],
    date: "",
    statut: EVENT_STATUTS[0],
    zone: zoneDefault,
    servicesConcernes: [],
    participants: "",
    ordreDuJour: "",
    compteRendu: "",
  };
}

function eventZoneBadgeLabel(zone: string, t: (k: "eventZoneGroup") => string, tr: (s: string) => string) {
  const z = zone.trim();
  if (!z) return t("eventZoneGroup");
  return tr(z);
}

export function PlanningPanel() {
  const { data, loading, error, refresh } = useSmqData();
  const { locale, t, tr } = useSmqLocale();
  const { zone: zoneFilter } = useSmqZone();
  const [form, setForm] = useState<EventForm | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [genMessage, setGenMessage] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [formScrollToken, setFormScrollToken] = useState(0);
  const formPanelRef = useRef<HTMLDivElement>(null);

  function showEventForm(next: EventForm) {
    setForm(next);
    setFormScrollToken((n) => n + 1);
  }

  /** Scroll à chaque ouverture / changement d’événement édité (pas à chaque frappe). */
  useEffect(() => {
    if (!form || formScrollToken === 0) return;
    const frame = window.requestAnimationFrame(() => {
      formPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [formScrollToken, form]);

  if (loading || !data) return <LoadingState error={error} onRetry={() => void refresh()} />;

  const { services, events: allEvents } = data;
  const events = filterEventsByZone(allEvents, zoneFilter);
  const year = new Date().getFullYear();
  const thisYear = events.filter((e) => e.date.startsWith(String(year)));
  const defaultZone = defaultEventZoneForFilter(zoneFilter);
  const reunions = thisYear.filter((e) => e.type === "Réunion interne").length;
  const audits = thisYear.filter((e) => e.type === "Audit interne").length;
  const revues = thisYear.filter((e) => e.type === "Revue de Direction").length;

  const rythme = [
    { label: t("rhythmMeetings"), cible: 4, fait: reunions },
    { label: t("rhythmAudits"), cible: 2, fait: audits },
    { label: t("rhythmReview"), cible: 1, fait: revues },
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

  async function improveOrdreDuJour() {
    if (!form) return;
    setAiLoading(true);
    setAiText("");
    try {
      const mode = form.ordreDuJour.trim() ? "improve" : "create";
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "agenda", payload: { ...form, mode }, locale }),
      });
      const json = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) {
        setAiText(json.error ?? t("aiErrorShort"));
        return;
      }
      const text = (json.text ?? "").trim();
      if (text) setForm({ ...form, ordreDuJour: text });
      setAiText(text || t("aiNoResponse"));
    } catch {
      setAiText(t("aiError"));
    } finally {
      setAiLoading(false);
    }
  }

  async function improveCompteRendu() {
    if (!form) return;
    if (!form.compteRendu.trim()) {
      setAiText(t("draftMinutesFirst"));
      return;
    }
    setAiLoading(true);
    setAiText("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "compte-rendu-improve", payload: form, locale }),
      });
      const json = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) {
        setAiText(json.error ?? t("aiErrorShort"));
        return;
      }
      const text = (json.text ?? "").trim();
      if (text) setForm({ ...form, compteRendu: text });
      setAiText(text || t("aiNoResponse"));
    } catch {
      setAiText(t("aiError"));
    } finally {
      setAiLoading(false);
    }
  }

  async function downloadPlanningPdf() {
    setDownloadingPdf(true);
    try {
      const response = await fetch(
        `/api/planning/pdf?year=${year}&lang=${locale}&zone=${encodeURIComponent(zoneFilter)}`,
      );
      if (!response.ok) throw new Error(t("pdfUnavailable"));
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `planification-smq-${year}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      window.alert(t("pdfPlanningFail"));
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function generateQhseCalendar() {
    setGenLoading(true);
    setGenMessage(null);
    try {
      const res = await fetch("/api/planning/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, zone: defaultZone }),
      });
      const json = (await res.json()) as {
        error?: string;
        created?: number;
        existing?: number;
      };
      if (!res.ok) {
        setGenMessage(json.error ?? t("genFailed"));
        return;
      }
      setGenMessage(
        `${json.created ?? 0} ${t("genCalendarOk")} ${json.existing ?? 0} ${t("genCalendarExisting")}`,
      );
      await refresh();
    } catch {
      setGenMessage(t("genCalendarFail"));
    } finally {
      setGenLoading(false);
    }
  }

  function openEventForm(event: SmqEvent) {
    setAiText("");
    showEventForm({ ...emptyEvent(), ...event });
  }

  async function downloadEventPdf(eventId: string) {
    try {
      const response = await fetch(`/api/events/${eventId}/pdf?lang=${locale}`);
      if (!response.ok) throw new Error(t("pdfUnavailable"));
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${eventId}-${locale}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      window.alert(t("pdfEventFail"));
    }
  }

  async function askPrep(kind: "audit-prep" | "revue-prep", eventHint?: SmqEvent) {
    setAiLoading(true);
    setAiText("");

    let payload: Record<string, unknown> | undefined;
    if (kind === "audit-prep") {
      const audit =
        eventHint ??
        (form?.type === "Audit interne" ? ({ ...form } as SmqEvent) : null) ??
        pickAuditEventForPrep(events, form?.id);
      if (!audit) {
        setAiText(t("noAuditFound"));
        setAiLoading(false);
        return;
      }
      openEventForm(audit);
      payload = { event: audit };
    }

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, payload, locale }),
      });
      const json = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) {
        setAiText(json.error ?? t("aiErrorShort"));
        return;
      }
      setAiText(json.text ?? t("aiNoResponse"));
    } catch {
      setAiText(t("aiError"));
    } finally {
      setAiLoading(false);
    }
  }

  function applyAiToCompteRendu() {
    if (!form || !aiText.trim()) return;
    setForm({ ...form, compteRendu: aiText.trim() });
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-3.5 md:grid-cols-3">
        {rythme.map((r) => (
          <div key={r.label} className="card">
            <div className="text-[12.5px] font-semibold text-muted">{r.label}</div>
            <div className="mt-1 font-display text-2xl font-bold">
              {r.fait}{" "}
              <span className="text-sm font-medium text-muted-light">
                / {r.cible} {t("rhythmTarget")} {year}
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
        <Btn
          kind="ghost"
          disabled={downloadingPdf}
          onClick={() => void downloadPlanningPdf()}
        >
          {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {downloadingPdf ? t("pdfLoading") : t("exportPdf")}
        </Btn>
        <Btn onClick={() => void generateQhseCalendar()} disabled={genLoading}>
          {genLoading ? <Loader2 size={14} className="animate-spin" /> : <CalendarClock size={14} />}
          {t("genQhseCalendar")} {year}
        </Btn>
        <Btn kind="ghost" onClick={() => void askPrep("audit-prep")} disabled={aiLoading}>
          <Sparkles size={14} /> {t("auditSynthNotes")}
        </Btn>
        <Btn kind="ghost" onClick={() => void askPrep("revue-prep")} disabled={aiLoading}>
          <Sparkles size={14} /> {t("prepManagementReview")}
        </Btn>
        <Btn onClick={() => showEventForm(emptyEvent(defaultZone))}>
          <Plus size={14} /> {t("scheduleEvent")}
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
          <p className="mt-2 text-[11px] text-muted">
            {t("aiSynthHint")}
          </p>
        </div>
      )}

      {form && (
        <div
          ref={formPanelRef}
          className="mb-4 scroll-mt-6 rounded-[10px] border-[1.5px] border-ink bg-surface p-4.5 shadow-md ring-2 ring-ink/10"
          role="dialog"
          aria-labelledby="smq-event-form-title"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 id="smq-event-form-title" className="font-display font-bold">
              {form.id ? `${t("edit")} ${form.id}` : t("newEvent")}
            </h2>
            <button type="button" onClick={() => setForm(null)} className="cursor-pointer">
              <X size={16} />
            </button>
          </div>

          <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label={t("fieldType")}>
              <SelectInput
                value={form.type}
                onChange={(type) => setForm({ ...form, type })}
                options={EVENT_TYPES}
              />
            </Field>
            <Field label={t("fieldDate")}>
              <TextInput
                type="date"
                value={form.date}
                onChange={(date) => setForm({ ...form, date })}
              />
            </Field>
            <Field label={t("fieldStatus")}>
              <SelectInput
                value={form.statut}
                onChange={(statut) => setForm({ ...form, statut })}
                options={EVENT_STATUTS}
              />
            </Field>
          </div>

          <Field label={t("fieldEventZone")}>
            <select
              value={form.zone}
              onChange={(e) => setForm({ ...form, zone: e.target.value })}
              className="mt-0.5 w-full rounded-[7px] border-[1.5px] border-line bg-paper px-3 py-2 text-[13px]"
            >
              <option value="">{t("eventZoneGroup")}</option>
              <option value="France">{tr("France")}</option>
              <option value="Togo">{tr("Togo")}</option>
            </select>
          </Field>

          <div className="h-3" />

          <Field label={t("fieldServices")}>
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
                    {tr(s.name)}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="h-3" />

          <Field label={t("fieldParticipants")}>
            <TextInput
              value={form.participants}
              onChange={(participants) => setForm({ ...form, participants })}
              placeholder={t("phParticipants")}
            />
          </Field>

          <div className="h-3" />

          <Field label={t("fieldAgenda")}>
            <TextArea
              value={form.ordreDuJour}
              onChange={(ordreDuJour) => setForm({ ...form, ordreDuJour })}
            />
          </Field>

          <div className="h-3" />

          <Field label={t("fieldMinutes")}>
            <TextArea
              value={form.compteRendu}
              onChange={(compteRendu) => setForm({ ...form, compteRendu })}
              placeholder={t("phMinutes")}
            />
          </Field>

          <div className="mt-3.5 flex flex-wrap gap-2">
            <Btn onClick={() => void save()}>
              <Check size={14} /> {t("save")}
            </Btn>
            <Btn kind="ghost" onClick={() => void improveOrdreDuJour()} disabled={aiLoading}>
              {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {form.ordreDuJour.trim() ? t("improveAgenda") : t("generateAgenda")}
            </Btn>
            <Btn kind="ghost" onClick={() => void improveCompteRendu()} disabled={aiLoading}>
              {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {t("improveMinutes")}
            </Btn>
            {form.type === "Audit interne" && (
              <Btn kind="ghost" onClick={() => void askPrep("audit-prep")} disabled={aiLoading}>
                <Sparkles size={14} /> {t("auditorSheetAi")}
              </Btn>
            )}
          </div>

          {aiText && (
            <div className="mt-3 rounded-lg bg-paper-alt p-3">
              <AiContent content={aiText} className="text-[13px]" />
              <div className="mt-2 flex flex-wrap gap-2">
                <Btn kind="ghost" className="px-2.5 py-1.5 text-xs" onClick={applyAiToCompteRendu}>
                  {t("copyToMinutes")}
                </Btn>
              </div>
            </div>
          )}
        </div>
      )}

      {events.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          text={t("noEvents")}
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {events.map((e) => (
            <div key={e.id} className="card">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                <div className="min-w-0 flex-1">
                  <div className="break-words font-mono text-[11px] text-muted-light sm:text-[11.5px]">
                    {e.id} · {fmtDate(e.date, locale)}
                  </div>
                  <div className="my-1 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{tr(e.type)}</span>
                    <span className="rounded-full border border-line bg-paper-alt px-2 py-0.5 font-mono text-[10px] text-muted">
                      {eventZoneBadgeLabel(e.zone, t, tr)}
                    </span>
                  </div>
                  {e.servicesConcernes.length > 0 && (
                    <div className="text-xs text-muted">
                      {t("servicesLabel")} : {e.servicesConcernes.map(tr).join(", ")}
                    </div>
                  )}
                </div>
                <StatusStamp label={e.statut} />
              </div>
              {(e.ordreDuJour || e.compteRendu) && (
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs text-muted">
                  {[e.ordreDuJour, e.compteRendu].filter((s) => s?.trim()).join("\n\n")}
                </p>
              )}
              <div className="mt-2.5 flex flex-wrap gap-2">
                <Btn
                  kind="ghost"
                  className="px-2.5 py-1.5 text-xs"
                  onClick={() => openEventForm(e)}
                >
                  {t("edit")}
                </Btn>
                <Btn
                  kind="ghost"
                  className="px-2.5 py-1.5 text-xs"
                  onClick={() => void downloadEventPdf(e.id)}
                >
                  <Download size={12} /> PDF {locale.toUpperCase()}
                </Btn>
                {e.type === "Audit interne" && (
                  <Btn
                    kind="ghost"
                    className="px-2.5 py-1.5 text-xs"
                    onClick={() => void askPrep("audit-prep", e)}
                  >
                    <Sparkles size={12} /> {t("aiSynthShort")}
                  </Btn>
                )}
                <Btn
                  kind="danger"
                  className="px-2.5 py-1.5 text-xs"
                  onClick={() => void remove(e.id)}
                >
                  {t("delete")}
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
