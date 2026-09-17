import fs from "fs";
import path from "path";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  formatCordisteDescriptionForDisplay,
  isCordisteRecord,
  sanitizeCordisteText,
} from "@/lib/cordiste-text";
import type { NonConformite, SmqAction } from "@/lib/types";

const HEADER_TABLE_GAP = 6;
const MAX_CELL_CHARS = 420;

const DOC_CODE = "ENR-CIFRA-QHSE 005";
const DOC_REVISION = "00";
const DOC_CREATION_DATE = "09/10/2023";
const MIN_ROWS = 12;
const MARGIN = 7;
const GREY: [number, number, number] = [191, 191, 191];

type PdfRow = [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];

function loadLogoAsset(): { dataUrl: string; format: "PNG" | "JPEG" } | null {
  const logoPath = path.join(process.cwd(), "public", "logo-cides.png");
  if (!fs.existsSync(/* turbopackIgnore: true */ logoPath)) return null;

  const buffer = fs.readFileSync(/* turbopackIgnore: true */ logoPath);
  return {
    dataUrl: `data:image/png;base64,${buffer.toString("base64")}`,
    format: "PNG",
  };
}

function formatRegistrationDate(iso?: string): string {
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  const monthNum = Number(month);
  const dayNum = Number(day);
  return `${dayNum}-${monthNum}-${year.slice(2)}`;
}

function formatCompletionDate(iso?: string): string {
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
}

function stripHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatTextForPdf(recordId: string, text: string): string {
  const raw = stripHtml(text);
  if (!raw) return "";

  let cleaned = raw;
  if (isCordisteRecord(recordId) || /data:image\/|Issuer:|Corrective Action #/i.test(raw)) {
    cleaned = formatCordisteDescriptionForDisplay(raw).summary;
  } else {
    cleaned = sanitizeCordisteText(raw);
  }

  cleaned = cleaned.replace(/\s+/g, " ").trim();
  if (cleaned.length > MAX_CELL_CHARS) {
    return `${cleaned.slice(0, MAX_CELL_CHARS)}…`;
  }
  return cleaned;
}

function advancementForStatut(statut: string): string {
  if (statut === "Vérifiée efficace" || statut === "Réalisée") return "100%";
  if (statut === "En cours") return "50%";
  return "0%";
}

function rowLabel(index: number): string {
  if (index === 0) return "Example";
  return String(index + 1);
}

function findLinkedNc(
  action: SmqAction,
  nonConformites: NonConformite[],
): NonConformite | undefined {
  if (action.ncId) {
    return nonConformites.find((nc) => nc.id === action.ncId);
  }
  if (action.origine) {
    return nonConformites.find((nc) => nc.id === action.origine);
  }
  return undefined;
}

function buildSourceLabel(action: SmqAction, nc?: NonConformite): string {
  if (nc?.source) return nc.source;
  const parts = [action.type, action.origine].filter(Boolean);
  return parts.join(" — ");
}

function toPdfRow(cells: string[]): PdfRow {
  return [
    cells[0] ?? "",
    cells[1] ?? "",
    cells[2] ?? "",
    cells[3] ?? "",
    cells[4] ?? "",
    cells[5] ?? "",
    cells[6] ?? "",
    cells[7] ?? "",
    cells[8] ?? "",
    cells[9] ?? "",
    cells[10] ?? "",
  ];
}

function buildRows(actions: SmqAction[], nonConformites: NonConformite[]): PdfRow[] {
  const rows: PdfRow[] = [];

  for (let index = 0; index < MIN_ROWS; index++) {
    const action = actions[index];
    if (!action) {
      rows.push(toPdfRow([rowLabel(index), "", "", "", "", "", "", "", "", "", ""]));
      continue;
    }

    const nc = findLinkedNc(action, nonConformites);
    const completed =
      action.statut === "Réalisée" || action.statut === "Vérifiée efficace";

    const ncId = nc?.id ?? "";
    rows.push(
      toPdfRow([
        rowLabel(index),
        buildSourceLabel(action, nc),
        formatRegistrationDate(action.dateCreation || nc?.date),
        action.origine || action.id,
        formatTextForPdf(ncId, nc?.description ?? action.description),
        formatTextForPdf(ncId, nc?.causeRacine ?? ""),
        formatTextForPdf(action.id, action.description),
        action.responsable,
        formatRegistrationDate(action.echeance),
        advancementForStatut(action.statut),
        completed ? formatCompletionDate(action.echeance || action.dateCreation) : "",
      ]),
    );
  }

  return rows;
}

function getLastTableY(doc: jsPDF, fallback: number): number {
  const tableMeta = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable;
  return tableMeta?.finalY ?? fallback;
}

function drawHeaderTable(
  doc: jsPDF,
  logo: { dataUrl: string; format: "PNG" | "JPEG" } | null,
  startY: number,
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const tableWidth = pageWidth - MARGIN * 2;
  const logoWidth = 28;
  const labelWidth = 30;
  const metaLabelWidth = 32;
  const metaValueWidth = 24;
  const titleValueWidth =
    tableWidth - logoWidth - labelWidth - metaLabelWidth - metaValueWidth;

  autoTable(doc, {
    startY,
    margin: { left: MARGIN, right: MARGIN },
    tableWidth,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: { top: 2.5, right: 2, bottom: 2.5, left: 2 },
      lineColor: [0, 0, 0],
      lineWidth: 0.35,
      valign: "middle",
      halign: "left",
      overflow: "linebreak",
    },
    body: [
      [
        {
          content: "",
          rowSpan: 2,
          styles: {
            cellWidth: logoWidth,
            minCellHeight: 22,
            halign: "center",
            valign: "middle",
          },
        },
        {
          content: "Title",
          styles: { cellWidth: labelWidth, fontSize: 8, fontStyle: "normal" },
        },
        {
          content: "AUDIT ACTION MONITORING TABLE",
          styles: {
            cellWidth: titleValueWidth,
            fontSize: 10,
            fontStyle: "bold",
            halign: "center",
          },
        },
        {
          content: "Revision",
          styles: { cellWidth: metaLabelWidth, fontSize: 8, fontStyle: "normal" },
        },
        {
          content: DOC_REVISION,
          styles: {
            cellWidth: metaValueWidth,
            fontSize: 9,
            fontStyle: "bold",
            halign: "center",
          },
        },
      ],
      [
        {
          content: "Code Number :",
          styles: { cellWidth: labelWidth, fontSize: 8, fontStyle: "normal" },
        },
        {
          content: DOC_CODE,
          styles: {
            cellWidth: titleValueWidth,
            fontSize: 9,
            fontStyle: "bold",
            halign: "center",
          },
        },
        {
          content: "Creation date",
          styles: { cellWidth: metaLabelWidth, fontSize: 8, fontStyle: "normal" },
        },
        {
          content: DOC_CREATION_DATE,
          styles: {
            cellWidth: metaValueWidth,
            fontSize: 9,
            fontStyle: "bold",
            halign: "center",
          },
        },
      ],
    ],
    didDrawCell: (data) => {
      if (
        data.section !== "body" ||
        data.row.index !== 0 ||
        data.column.index !== 0 ||
        !logo
      ) {
        return;
      }

      const { x, y, width, height } = data.cell;
      const padding = 2;
      const maxSize = Math.min(width - padding * 2, height - padding * 2);
      doc.addImage(
        logo.dataUrl,
        logo.format,
        x + (width - maxSize) / 2,
        y + (height - maxSize) / 2,
        maxSize,
        maxSize,
      );
    },
  });

  return getLastTableY(doc, startY + 22);
}

function drawMainTable(
  doc: jsPDF,
  startY: number,
  actions: SmqAction[],
  nonConformites: NonConformite[],
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const tableWidth = pageWidth - MARGIN * 2;
  const indexColWidth = 16;

  autoTable(doc, {
    startY,
    margin: { left: MARGIN, right: MARGIN, top: 0, bottom: MARGIN },
    tableWidth,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 7,
      cellPadding: { top: 2, right: 1.5, bottom: 2, left: 1.5 },
      lineColor: [0, 0, 0],
      lineWidth: 0.35,
      valign: "top",
      overflow: "linebreak",
      minCellHeight: 11,
    },
    headStyles: {
      fillColor: GREY,
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 6.3,
      halign: "center",
      valign: "middle",
      cellPadding: { top: 2, right: 1.2, bottom: 2, left: 1.2 },
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { cellWidth: indexColWidth, halign: "center", valign: "middle" },
      1: { cellWidth: 27 },
      2: { cellWidth: 16, halign: "center", valign: "middle" },
      3: { cellWidth: 18, halign: "center", valign: "middle" },
      4: { cellWidth: 36 },
      5: { cellWidth: 22, halign: "center", valign: "middle" },
      6: { cellWidth: 80 },
      7: { cellWidth: 22, halign: "center", valign: "middle" },
      8: { cellWidth: 15, halign: "center", valign: "middle" },
      9: { cellWidth: 14, halign: "center", valign: "middle" },
      10: { cellWidth: 17, halign: "center", valign: "middle" },
    },
    head: [
      [
        "",
        "Source of action\n(risk assessment, malfunction, complaint, incident, non-compliance, audit, etc.)",
        "Registration\nDate",
        "Corresponding\nregistration\nnumber",
        "Summary of the risk /\nproblem / finding",
        "Causes\nanalysis",
        "Action to be taken",
        "Responsible",
        "Due date",
        "Advancement",
        "Date of\ncompletion",
      ],
    ],
    body: buildRows(actions, nonConformites),
    showHead: "everyPage",
    didParseCell: (data) => {
      if (data.section === "head" && data.column.index === 0) {
        data.cell.styles.fillColor = GREY;
      }
      if (data.section === "body" && data.column.index === 0) {
        data.cell.styles.fillColor = GREY;
        data.cell.styles.fontStyle = "normal";
        data.cell.styles.valign = "middle";
      }
    },
  });
}

export function buildAuditActionMonitoringPdf(
  actions: SmqAction[],
  nonConformites: NonConformite[],
): Uint8Array {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const logo = loadLogoAsset();
  const headerEndY = drawHeaderTable(doc, logo, MARGIN);
  drawMainTable(doc, headerEndY + HEADER_TABLE_GAP, actions, nonConformites);

  return new Uint8Array(doc.output("arraybuffer"));
}
