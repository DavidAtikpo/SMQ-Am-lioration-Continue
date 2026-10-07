import fs from "fs";
import path from "path";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getSmqPdfLabels, type SmqLocale } from "@/lib/smq-i18n";
import { translateSmqStoredLabel } from "@/lib/smq-i18n-ui";
import { SMQ_RHYTHME } from "@/lib/smq-rhythm";
import type { SmqEvent } from "@/lib/types";
import { fmtDate } from "@/lib/utils";

const MARGIN = 10;
const DOC_CODE = "SMQ-PLAN";

function loadLogoAsset(): { dataUrl: string; format: "PNG" | "JPEG" } | null {
  const logoPath = path.join(process.cwd(), "public", "logo-cides.png");
  if (!fs.existsSync(/* turbopackIgnore: true */ logoPath)) return null;
  const buffer = fs.readFileSync(/* turbopackIgnore: true */ logoPath);
  return {
    dataUrl: `data:image/png;base64,${buffer.toString("base64")}`,
    format: "PNG",
  };
}

function clipText(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function rhythmLine(label: string, fait: number, cible: number): string {
  return `${label} : ${fait} / ${cible}`;
}

export function buildSmqPlanningPdf(
  events: SmqEvent[],
  options: { year: number; allYears?: boolean; locale?: SmqLocale },
): Uint8Array {
  const L = getSmqPdfLabels(options.locale ?? "fr");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const logo = loadLogoAsset();
  const generatedAt = new Date().toLocaleDateString(options.locale === "en" ? "en-GB" : "fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const { year, allYears } = options;
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  const yearEvents = allYears ? sorted : sorted.filter((e) => e.date.startsWith(String(year)));
  const reunions = yearEvents.filter((e) => e.type === "Réunion interne").length;
  const audits = yearEvents.filter((e) => e.type === "Audit interne").length;
  const revues = yearEvents.filter((e) => e.type === "Revue de Direction").length;

  const titleX = MARGIN + (logo ? 26 : 0);
  if (logo) {
    doc.addImage(logo.dataUrl, logo.format, MARGIN, MARGIN, 22, 22);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(L.planningTitle, titleX, MARGIN + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  const periodLabel = allYears ? L.allPeriods : `${L.year} ${year}`;
  doc.text(`CI.DES — ${periodLabel} — ${L.generatedOn} ${generatedAt}`, titleX, MARGIN + 14);
  doc.text(`DOC N° ${L.docCodePlan}`, doc.internal.pageSize.getWidth() - MARGIN - 36, MARGIN + 8);

  doc.setFontSize(8);
  doc.setTextColor(50, 50, 50);
  const rhythmY = MARGIN + 20;
  doc.text(
    [
      rhythmLine(L.internalMeetings, reunions, SMQ_RHYTHME.reunionInterne.cibleParAn),
      rhythmLine(L.internalAudits, audits, SMQ_RHYTHME.auditInterne.cibleParAn),
      rhythmLine(L.managementReview, revues, SMQ_RHYTHME.revueDirection.cibleParAn),
    ].join("   ·   "),
    titleX,
    rhythmY,
  );

  const tableStartY = MARGIN + 26;
  const pageWidth = doc.internal.pageSize.getWidth();
  const tableWidth = pageWidth - MARGIN * 2;
  const colRatios = [0.14, 0.12, 0.09, 0.1, 0.18, 0.15, 0.22] as const;

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: MARGIN, right: MARGIN },
    tableWidth,
    head: [
      [
        L.tableReference,
        L.tableType,
        L.tableDate,
        L.tableStatus,
        L.tableServices,
        L.tableParticipants,
        L.tableAgenda,
      ],
    ],
    body:
      yearEvents.length === 0
        ? [["—", "—", "—", "—", "—", "—", L.noEventsPeriod]]
        : yearEvents.map((e) => [
            e.id,
            translateSmqStoredLabel(e.type, options.locale ?? "fr"),
            fmtDate(e.date),
            translateSmqStoredLabel(e.statut, options.locale ?? "fr"),
            e.servicesConcernes.map((s) => translateSmqStoredLabel(s, options.locale ?? "fr")).join(", ") ||
              L.none,
            clipText(e.participants || L.none, 48),
            clipText(e.ordreDuJour || L.none, 120),
          ]),
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 2,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [32, 38, 46],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [244, 241, 232] },
    columnStyles: Object.fromEntries(
      colRatios.map((ratio, index) => [index, { cellWidth: tableWidth * ratio }]),
    ),
  });

  const tableMeta = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable;
  let detailY = (tableMeta?.finalY ?? tableStartY) + 8;

  const withDetails = yearEvents.filter(
    (e) => (e.ordreDuJour && e.ordreDuJour.length > 80) || (e.compteRendu && e.compteRendu.trim()),
  );

  if (withDetails.length > 0) {
    if (detailY > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage("landscape");
      detailY = MARGIN + 8;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("Détails — ordre du jour et comptes-rendus", MARGIN, detailY);
    detailY += 6;

    for (const e of withDetails) {
      if (detailY > doc.internal.pageSize.getHeight() - 25) {
        doc.addPage("landscape");
        detailY = MARGIN + 8;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(`${e.id} · ${e.type} · ${fmtDate(e.date)}`, MARGIN, detailY);
      detailY += 4;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      const blocks: string[] = [];
      if (e.ordreDuJour?.trim()) {
        blocks.push(`Ordre du jour :\n${e.ordreDuJour.trim()}`);
      }
      if (e.compteRendu?.trim()) {
        blocks.push(`Compte-rendu :\n${e.compteRendu.trim()}`);
      }
      const body = blocks.join("\n\n");
      const lines = doc.splitTextToSize(body, pageWidth - MARGIN * 2);
      doc.text(lines, MARGIN, detailY);
      detailY += lines.length * 3.2 + 5;
    }
  }

  return new Uint8Array(doc.output("arraybuffer"));
}
