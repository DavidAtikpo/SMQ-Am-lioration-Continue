import jsPDF from "jspdf";
import { resolveSmqLogoAsset } from "@/lib/smq-pdf-assets";
import { getSmqPdfLabels, type SmqLocale } from "@/lib/smq-i18n";
import { translateSmqStoredLabel } from "@/lib/smq-i18n-ui";
import { localizeSmqEventsForLocale } from "@/lib/smq-translate-text";
import type { SmqEvent } from "@/lib/types";
import { renderMarkdownInPdf } from "@/lib/smq-pdf-markdown";
import { fmtDate } from "@/lib/utils";

const MARGIN = 14;

function writeBlock(
  doc: jsPDF,
  title: string,
  body: string,
  startY: number,
  maxWidth: number,
): number {
  let y = startY;
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y > pageHeight - 30) {
    doc.addPage();
    y = MARGIN;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(32, 38, 46);
  doc.text(title, MARGIN, y);
  y += 5;

  const text = body.trim();
  if (!text) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("—", MARGIN, y);
    return y + 8;
  }

  return renderMarkdownInPdf(doc, text, y, {
    margin: MARGIN,
    maxWidth,
    pageHeight,
    fontSize: 9,
  });
}

export async function buildSmqEventPdf(event: SmqEvent, locale: SmqLocale): Promise<Uint8Array> {
  const [eventLoc] = await localizeSmqEventsForLocale([event], locale);
  const ev = eventLoc ?? event;
  const L = getSmqPdfLabels(locale);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const logo = resolveSmqLogoAsset();
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
  doc.text(`${L.docCodeAudit} · ${ev.id}`, pageWidth - MARGIN - 55, MARGIN + 7);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  let y = MARGIN + 24;
  const meta: [string, string][] = [
    [L.reference, ev.id],
    [L.type, translateSmqStoredLabel(ev.type, locale)],
    [L.date, fmtDate(ev.date, locale)],
    [L.status, translateSmqStoredLabel(ev.statut, locale)],
    [
      L.services,
      ev.servicesConcernes.map((s) => translateSmqStoredLabel(s, locale)).join(", ") || L.none,
    ],
    [L.participants, ev.participants.trim() || L.none],
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
  y = writeBlock(doc, L.agenda, ev.ordreDuJour, y, contentWidth);
  y = writeBlock(doc, L.minutes, ev.compteRendu, y, contentWidth);

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(L.footer, MARGIN, doc.internal.pageSize.getHeight() - 8);

  return new Uint8Array(doc.output("arraybuffer"));
}
