import fs from "fs";
import path from "path";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { barGeometry, ganttRangeMs } from "@/lib/agenda/gantt-rows";
import type { GanttRow } from "@/lib/agenda/types";
import { fmtDate } from "@/lib/utils";

const MARGIN = 10;
const DOC_CODE = "SMQ-PLAN-GANTT";

function loadLogoAsset(): { dataUrl: string; format: "PNG" | "JPEG" } | null {
  const logoPath = path.join(process.cwd(), "public", "logo-cides.png");
  if (!fs.existsSync(/* turbopackIgnore: true */ logoPath)) return null;
  const buffer = fs.readFileSync(/* turbopackIgnore: true */ logoPath);
  return {
    dataUrl: `data:image/png;base64,${buffer.toString("base64")}`,
    format: "PNG",
  };
}

function durationDays(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00`).getTime();
  const end = new Date(`${endDate}T00:00:00`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
}

function kindLabel(kind: GanttRow["kind"]): string {
  return kind === "task" ? "Tâche" : "Session";
}

function drawGanttBars(doc: jsPDF, rows: GanttRow[], startY: number): number {
  if (rows.length === 0) return startY;

  const pageWidth = doc.internal.pageSize.getWidth();
  const chartLeft = MARGIN;
  const chartWidth = pageWidth - MARGIN * 2;
  const labelWidth = 52;
  const barAreaWidth = chartWidth - labelWidth;
  const rowHeight = 7;
  const { min, max } = ganttRangeMs(rows);

  let y = startY + 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Frise Gantt", MARGIN, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  const minIso = new Date(min).toISOString().slice(0, 10);
  const maxIso = new Date(max).toISOString().slice(0, 10);
  doc.text(`Période : ${fmtDate(minIso)} → ${fmtDate(maxIso)}`, MARGIN, y);
  y += 5;

  for (const row of rows) {
    if (y > doc.internal.pageSize.getHeight() - 15) {
      doc.addPage("landscape");
      y = MARGIN + 8;
    }

    const title = row.title.length > 28 ? `${row.title.slice(0, 27)}…` : row.title;
    doc.setFontSize(7);
    doc.setTextColor(30, 30, 30);
    doc.text(title, chartLeft, y + 4);

    const { leftPct, widthPct } = barGeometry(row.startDate, row.endDate, min, max);
    const barX = chartLeft + labelWidth + (leftPct / 100) * barAreaWidth;
    const barW = Math.max(2, (widthPct / 100) * barAreaWidth);
    const barY = y;
    const barH = rowHeight - 1;

    if (row.kind === "task") {
      doc.setFillColor(46, 107, 94);
    } else {
      doc.setFillColor(51, 86, 108);
    }
    doc.roundedRect(barX, barY, barW, barH, 1, 1, "F");

    if (row.progressPct != null && row.progressPct > 0 && row.progressPct < 100) {
      doc.setFillColor(255, 255, 255);
      const progressW = (barW * row.progressPct) / 100;
      doc.rect(barX, barY, progressW, barH, "F");
    }

    y += rowHeight;
  }

  return y + 4;
}

export function buildAgendaGanttPdf(rows: GanttRow[]): Uint8Array {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const logo = loadLogoAsset();
  const generatedAt = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  if (logo) {
    doc.addImage(logo.dataUrl, logo.format, MARGIN, MARGIN, 22, 22);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Diagramme de Gantt — Neurix Agenda", MARGIN + (logo ? 26 : 0), MARGIN + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(`Planification CI.DES — généré le ${generatedAt}`, MARGIN + (logo ? 26 : 0), MARGIN + 14);
  doc.text(`DOC N° ${DOC_CODE}`, doc.internal.pageSize.getWidth() - MARGIN - 40, MARGIN + 8);

  const tableStartY = MARGIN + 26;
  const pageWidth = doc.internal.pageSize.getWidth();
  const tableWidth = pageWidth - MARGIN * 2;

  /** Répartition proportionnelle sur toute la largeur utile (A4 paysage ≈ 277 mm). */
  const colRatios = [0.07, 0.31, 0.1, 0.1, 0.06, 0.11, 0.08, 0.17] as const;

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: MARGIN, right: MARGIN },
    tableWidth,
    head: [["Type", "Libellé", "Début", "Fin", "Durée (j)", "Statut", "Priorité", "Responsables"]],
    body: rows.map((row) => [
      kindLabel(row.kind),
      row.title,
      fmtDate(row.startDate),
      fmtDate(row.endDate),
      String(durationDays(row.startDate, row.endDate)),
      row.statusLabel,
      row.priorityLabel ?? "—",
      row.assignees ?? "—",
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
      colRatios.map((ratio, index) => [
        index,
        {
          cellWidth: tableWidth * ratio,
          ...(index === 4 ? { halign: "center" as const } : {}),
        },
      ]),
    ),
  });

  const tableMeta = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable;
  const afterTableY = (tableMeta?.finalY ?? tableStartY) + 6;

  drawGanttBars(doc, rows, afterTableY);

  return new Uint8Array(doc.output("arraybuffer"));
}
