import { prisma } from "@/lib/db";
import { SMQ_CALENDRIER_SUGGERE } from "@/lib/smq-rhythm";
import { SYNC_SERVICES } from "@/lib/sync/mappers";

function dateForMonth(year: number, month: number, day = 15): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

type PlanEntry = {
  id: string;
  type: string;
  date: string;
  label: string;
};

function buildPlan(year: number): PlanEntry[] {
  const entries: PlanEntry[] = [];

  SMQ_CALENDRIER_SUGGERE.reunionInterne.forEach((month, i) => {
    entries.push({
      id: `QHSE-RI-${year}-T${i + 1}`,
      type: "Réunion interne",
      date: dateForMonth(year, month),
      label: `Réunion interne T${i + 1} ${year}`,
    });
  });

  SMQ_CALENDRIER_SUGGERE.auditInterne.forEach((month, i) => {
    entries.push({
      id: `QHSE-AI-${year}-S${i + 1}`,
      type: "Audit interne",
      date: dateForMonth(year, month, 20),
      label: `Audit interne S${i + 1} ${year}`,
    });
  });

  SMQ_CALENDRIER_SUGGERE.revueDirection.forEach((month) => {
    entries.push({
      id: `QHSE-RD-${year}`,
      type: "Revue de Direction",
      date: dateForMonth(year, month, 28),
      label: `Revue de direction ${year}`,
    });
  });

  return entries;
}

export async function ensureQhseCalendar(year = new Date().getFullYear()): Promise<{
  created: number;
  existing: number;
  entries: PlanEntry[];
}> {
  const plan = buildPlan(year);
  let created = 0;
  let existing = 0;
  const services = [SYNC_SERVICES.planification, "Qualité", "Direction"];

  for (const entry of plan) {
    const found = await prisma.event.findUnique({ where: { id: entry.id } });
    if (found) {
      existing += 1;
      continue;
    }

    await prisma.event.create({
      data: {
        id: entry.id,
        type: entry.type,
        date: entry.date,
        statut: "Planifié",
        servicesConcernes: services,
        participants: "Direction · Qualité",
        ordreDuJour: [
          entry.label,
          entry.type === "Audit interne"
            ? "Points à auditer : NC, actions, indicateurs stagiaires, satisfaction, délais processus."
            : entry.type === "Revue de Direction"
              ? "Synthèse des 2 audits internes, NC, actions, KPI formation et satisfaction."
              : "Suivi trimestriel des actions SMQ et indicateurs.",
          "Contenu détaillé à générer via l'assistant IA.",
        ].join("\n"),
        compteRendu: "",
      },
    });
    created += 1;
  }

  return { created, existing, entries: plan };
}
