import fs from "fs";
import path from "path";
import jsPDF from "jspdf";
import { getSmqPdfLabels, type SmqLocale } from "@/lib/smq-i18n";
import { translateSmqStoredLabel } from "@/lib/smq-i18n-ui";
import type { SmqEvent } from "@/lib/types";
import { fmtDate } from "@/lib/utils";

const MARGIN = 14;

function loadLogoAsset(): { dataUrl: string; format: "PNG" | "JPEG" } | null {
  const logoPath = path.join(process.cwd(), "public", "logo-cides.png");
  if (!fs.existsSync(/* turbopackIgnore: true */ logoPath)) return null;
  const buffer = fs.readFileSync(/* turbopackIgnore: true */ logoPath);
  return {
    dataUrl: `data:image/png;base64,${buffer.toString("base64")}`,
    format: "PNG",
  };
}

function writeBlock(
  doc: jsPDF,
  title: string,
  body: string,
  startY: number,
  maxWidth: number,
): number {
  let y = startY;
  if (y > doc.internal.pageSize.getHeight() - 30) {
    doc.addPage();
    y = MARGIN;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(32, 38, 46);
  doc.text(title, MARGIN, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  const text = body.trim() || "—";
  const lines = doc.splitTextToSize(text, maxWidth);
  for (const line of lines) {
    if (y > doc.internal.pageSize.getHeight() - 15) {
      doc.addPage();
      y = MARGIN;
    }
    doc.text(line, MARGIN, y);
    y += 4.2;
  }
  return y + 4;
}

export function buildSmqEventPdf(event: SmqEvent, locale: SmqLocale): Uint8Array {
  const L = getSmqPdfLabels(locale);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const logo = loadLogoAsset();
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN * 2;
  const generatedAt = new Date().toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const titleX = MARGIN + (logo ? 24 : 0);
  if (logo) {
    doc.addImage(logo.dataUrl, logo.format, MARGIN, MARGIN, 20, 20);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(L.internalAuditSheet, titleX, MARGIN + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text(`${L.generatedOn} ${generatedAt}`, titleX, MARGIN + 13);
  doc.text(`${L.docCodeAudit} · ${event.id}`, pageWidth - MARGIN - 55, MARGIN + 7);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  let y = MARGIN + 24;
  const meta: [string, string][] = [
    [L.reference, event.id],
    [L.type, translateSmqStoredLabel(event.type, locale)],
    [L.date, fmtDate(event.date)],
    [L.status, translateSmqStoredLabel(event.statut, locale)],
    [
      L.services,
      event.servicesConcernes.map((s) => translateSmqStoredLabel(s, locale)).join(", ") || L.none,
    ],
    [L.participants, event.participants.trim() || L.none],
  ];
  for (const [label, value] of meta) {
    doc.setFont("helvetica", "bold");
    doc.text(`${label} :`, MARGIN, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(value, contentWidth - 38);
    doc.text(lines, MARGIN + 38, y);
    y += Math.max(5, lines.length * 4.2);
  }

  y += 2;
  y = writeBlock(doc, L.agenda, event.ordreDuJour, y, contentWidth);
  y = writeBlock(doc, L.minutes, event.compteRendu, y, contentWidth);

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(L.footer, MARGIN, doc.internal.pageSize.getHeight() - 8);

  return new Uint8Array(doc.output("arraybuffer"));
}
