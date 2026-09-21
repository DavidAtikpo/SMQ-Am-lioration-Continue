"use client";

import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  Clock,
  Download,
  GanttChart,
  GraduationCap,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Btn,
  DocHeader,
  EmptyState,
  LoadingState,
} from "@/components/ui";
import { AiContent } from "@/components/ui/ai-content";
import { COLORS } from "@/lib/constants";
import { useSmqFilteredData } from "@/hooks/use-smq-filtered-data";
import { SMQ_ZONE_LABELS } from "@/lib/smq-zone";
import { daysUntil, fmtDate } from "@/lib/utils";
import { useState } from "react";

export function DashboardPanel() {
  const router = useRouter();
  const { data, loading, error, refresh, zone } = useSmqFilteredData();
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState("");
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [downloadingGanttPdf, setDownloadingGanttPdf] = useState(false);
  const [downloadingActionsPdf, setDownloadingActionsPdf] = useState(false);

  if (loading || !data) return <LoadingState error={error} onRetry={() => void refresh()} />;

  const { nonConformites: nc, actions, events, services, indicators } = data;
  const ncOuvertes = nc.filter((n) => n.statut !== "Clôturée");
  const actionsRetard = actions.filter(
    (a) =>
      a.statut !== "Réalisée" &&
      a.statut !== "Vérifiée efficace" &&
      a.echeance &&
      (daysUntil(a.echeance) ?? 0) < 0,
  );
  const prochains = [...events]
    .filter((e) => e.statut === "Planifié" && e.date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);
  const tauxCloture = nc.length
    ? Math.round((nc.filter((n) => n.statut === "Clôturée").length / nc.length) * 100)
    : 0;

  const year = new Date().getFullYear();
  const formation = indicators.filter((i) => i.category === "formation");
  const satisfaction = indicators.filter((i) => i.category === "satisfaction");
  const commercial = indicators.filter((i) => i.category === "commercial");
  const pick = (rows: typeof indicators, labelPart: string) =>
    rows.find((i) => i.label.includes(labelPart) && i.period.startsWith(String(year)));

  const kpiFormation = [
    {
      label: "Examens réussis",
      value: pick(formation, "Examens réussis")?.value ?? "—",
      icon: GraduationCap,
    },
    {
      label: "Recommandation (chaud)",
      value: pick(satisfaction, "Recommanderaient (chaud)")?.value ?? "—",
      icon: ThumbsUp,
    },
    {
      label: "Demandes en retard",
      value: pick(commercial, "sans traitement")?.value ?? "—",
      icon: TrendingUp,
    },
  ];

  const parService = services
    .map((s) => ({
      service: s.name.length > 14 ? `${s.name.slice(0, 13)}…` : s.name,
      NC: nc.filter((n) => n.serviceId === s.id).length,
    }))
    .filter((d) => d.NC > 0);

  const stats = [
    { label: "NC ouvertes", value: ncOuvertes.length, icon: AlertTriangle, color: COLORS.rust },
    { label: "Actions en retard", value: actionsRetard.length, icon: Clock, color: COLORS.amber },
    { label: "Taux de clôture NC", value: `${tauxCloture}%`, icon: ShieldCheck, color: COLORS.teal },
    { label: "Échéances à venir", value: prochains.length, icon: CalendarClock, color: COLORS.steel },
  ];

  async function runSync() {
    setSyncLoading(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const json = (await res.json()) as {
        error?: string;
        errors?: Record<string, string>;
        cordiste?: {
          nonConformites: { imported: number; updated: number };
          actions: { imported: number; updated: number };
        };
        agenda?: {
          tasks: { imported: number; updated: number };
          sessions: { imported: number; updated: number };
          removed?: { tasks: number; sessions: number };
        };
        stagiaires?: { imported: number; updated: number };
        satisfaction?: { imported: number; updated: number };
        processus?: {
          indicators: { imported: number; updated: number };
          actions: { imported: number; updated: number };
        };
        qhse?: { created: number; existing: number };
      };
      if (!res.ok && res.status !== 207) {
        setSyncMessage(json.error ?? "Synchronisation échouée.");
        return;
      }
      const nc = json.cordiste?.nonConformites;
      const ca = json.cordiste?.actions;
      const tasks = json.agenda?.tasks;
      const sessions = json.agenda?.sessions;
      const removedTasks = json.agenda?.removed?.tasks ?? 0;
      const removedSessions = json.agenda?.removed?.sessions ?? 0;
      const errorParts = Object.entries(json.errors ?? {}).map(([key, message]) => `${key}: ${message}`);
      setSyncMessage(
        [
          `Cordiste : ${nc?.imported ?? 0} NC + ${ca?.imported ?? 0} actions`,
          `Agenda : ${tasks?.imported ?? 0} tâches + ${sessions?.imported ?? 0} sessions (${removedTasks + removedSessions} retirée(s))`,
          `Stagiaires : ${json.stagiaires?.imported ?? 0} indicateur(s) · Satisfaction : ${json.satisfaction?.imported ?? 0}`,
          `Processus : ${json.processus?.indicators?.imported ?? 0} KPI + ${json.processus?.actions?.imported ?? 0} action(s) délai`,
          `Calendrier QHSE : ${json.qhse?.created ?? 0} événement(s) créé(s)`,
          ...errorParts,
        ].join(" · "),
      );
      await refresh();
    } catch {
      setSyncMessage("Impossible de synchroniser les sources externes.");
    } finally {
      setSyncLoading(false);
    }
  }

  async function downloadPdf(path: string, fallbackName: string) {
    const response = await fetch(path);
    if (!response.ok) throw new Error("PDF indisponible");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fallbackName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function downloadGanttPdf() {
    setDownloadingGanttPdf(true);
    try {
      await downloadPdf(
        "/api/agenda/gantt/pdf",
        `gantt-agenda-${new Date().toISOString().slice(0, 10)}.pdf`,
      );
    } catch {
      window.alert("Impossible de télécharger le PDF Gantt.");
    } finally {
      setDownloadingGanttPdf(false);
    }
  }

  async function downloadActionsPdf() {
    setDownloadingActionsPdf(true);
    try {
      await downloadPdf(
        "/api/actions/pdf",
        `audit-action-monitoring-${new Date().toISOString().slice(0, 10)}.pdf`,
      );
    } catch {
      window.alert("Impossible de télécharger le PDF Actions.");
    } finally {
      setDownloadingActionsPdf(false);
    }
  }

  async function askAI() {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "synthese" }),
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
        title="SMQ C.IDES"
        sub={`Vue d'ensemble du SMQ — périmètre ${SMQ_ZONE_LABELS[zone]}`}
        code="SMQ-DB"
        actions={
          <>
            <Btn
              kind="ghost"
              className="px-2.5 py-1.5 text-xs"
              onClick={() => router.push("/planification?view=gantt")}
            >
              <GanttChart size={14} /> Gantt Agenda
            </Btn>
            <Btn
              kind="ghost"
              className="px-2.5 py-1.5 text-xs"
              onClick={() => router.push("/planification?view=tasks")}
            >
              <ClipboardList size={14} /> Tâches Agenda
            </Btn>
            <Btn
              kind="ghost"
              className="px-2.5 py-1.5 text-xs"
              disabled={downloadingGanttPdf}
              onClick={() => void downloadGanttPdf()}
            >
              <Download size={14} />
              {downloadingGanttPdf ? "PDF Gantt…" : "PDF Gantt"}
            </Btn>
            <Btn
              kind="ghost"
              className="px-2.5 py-1.5 text-xs"
              disabled={downloadingActionsPdf}
              onClick={() => void downloadActionsPdf()}
            >
              <Download size={14} />
              {downloadingActionsPdf ? "PDF Actions…" : "PDF Actions"}
            </Btn>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-sm font-bold">Sources externes</h2>
          <p className="text-xs text-muted">
            Cordiste · Agenda · Stagiaires · Satisfaction · Délais devis/inscription · Calendrier QHSE
          </p>
        </div>
        <Btn onClick={() => void runSync()} disabled={syncLoading}>
          {syncLoading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} />
          )}
          Synchroniser
        </Btn>
      </div>
      {syncMessage && (
        <div className="mb-5 break-words rounded-[10px] border border-line bg-surface px-4 py-3 text-sm text-muted">
          {syncMessage}
        </div>
      )}

      <div className="mb-5 grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <s.icon size={18} style={{ color: s.color }} />
            <div className="mt-2 font-display text-[28px] font-bold">{s.value}</div>
            <div className="mt-0.5 text-[12.5px] text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3.5 md:grid-cols-3">
        {kpiFormation.map((k) => (
          <div key={k.label} className="card">
            <k.icon size={18} style={{ color: COLORS.teal }} />
            <div className="mt-2 font-display text-[24px] font-bold">{k.value}</div>
            <div className="mt-0.5 text-[12.5px] text-muted">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_1fr]">
        <div className="card">
          <h2 className="mb-3 font-display text-sm font-bold">Non-conformités par service</h2>
          {parService.length === 0 ? (
            <EmptyState icon={AlertTriangle} text="Aucune non-conformité enregistrée pour l'instant." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={parService}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.line} />
                <XAxis dataKey="service" tick={{ fontSize: 11, fill: "#5B5648" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#5B5648" }} />
                <Tooltip />
                <Bar dataKey="NC" radius={[4, 4, 0, 0]}>
                  {parService.map((_, i) => (
                    <Cell key={i} fill={COLORS.rust} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h2 className="mb-3 font-display text-sm font-bold">Prochaines échéances</h2>
          {prochains.length === 0 ? (
            <EmptyState icon={CalendarClock} text="Aucune réunion, audit ou revue planifiée." />
          ) : (
            <div className="flex flex-col gap-2.5">
              {prochains.map((e) => {
                const d = daysUntil(e.date);
                return (
                  <div
                    key={e.id}
                    className="flex flex-col gap-1 border-b border-line pb-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="text-[13px] font-semibold">{e.type}</div>
                      <div className="font-mono text-[11.5px] text-muted-light">
                        {fmtDate(e.date)}
                      </div>
                    </div>
                    <span
                      className="text-[11.5px] font-semibold"
                      style={{ color: (d ?? 0) < 0 ? COLORS.rust : COLORS.steel }}
                    >
                      {(d ?? 0) < 0
                        ? `${-(d ?? 0)} j de retard`
                        : d === 0
                          ? "aujourd'hui"
                          : `dans ${d} j`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[10px] bg-ink p-4.5 text-paper">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-display text-sm font-bold">
            <Sparkles size={16} /> Synthèse IA du jour
          </div>
          <Btn
            kind="ghost"
            className="border-white/25 text-paper"
            onClick={() => void askAI()}
            disabled={aiLoading}
          >
            {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Générer
          </Btn>
        </div>
        {aiText ? (
          <AiContent content={aiText} variant="dark" />
        ) : (
          <p className="text-[13.5px] leading-relaxed text-[#E7E2D2]">
            Cliquez sur « Générer » pour obtenir une lecture par l&apos;IA de l&apos;état actuel du SMQ : priorités, risques et actions à planifier.
          </p>
        )}
      </div>
    </div>
  );
}
