import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getSmqPdfLabels, type SmqLocale } from "@/lib/smq-i18n";
import { translateSmqStoredLabel } from "@/lib/smq-i18n-ui";
import { localizeSmqEventsForLocale } from "@/lib/smq-translate-text";
import type { SmqEvent } from "@/lib/types";
import { drawSmqPlanningPdfHeader, SMQ_PDF_MARGIN as MARGIN } from "@/lib/smq-pdf-header";
import { plainTextFromMarkdown, renderMarkdownInPdf } from "@/lib/smq-pdf-markdown";
import { fmtDate } from "@/lib/utils";

function clipText(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export async function buildSmqPlanningPdf(
  events: SmqEvent[],
  options: { year: number; allYears?: boolean; locale?: SmqLocale },
): Promise<Uint8Array> {
  const locale = options.locale ?? "fr";
  const L = getSmqPdfLabels(locale);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const generatedAt = new Date().toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const { year, allYears } = options;
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  const yearEventsRaw = allYears ? sorted : sorted.filter((e) => e.date.startsWith(String(year)));
  const yearEvents = await localizeSmqEventsForLocale(yearEventsRaw, locale);
  const reunions = yearEvents.filter((e) => e.type === "Réunion interne").length;
  const audits = yearEvents.filter((e) => e.type === "Audit interne").length;
  const revues = yearEvents.filter((e) => e.type === "Revue de Direction").length;

  const tableStartY = await drawSmqPlanningPdfHeader(doc, {
    labels: L,
    locale,
    year,
    allYears,
    generatedAt,
    rhythm: { reunions, audits, revues },
  });
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
            translateSmqStoredLabel(e.type, locale),
            fmtDate(e.date, locale),
            translateSmqStoredLabel(e.statut, locale),
            e.servicesConcernes.map((s) => translateSmqStoredLabel(s, locale)).join(", ") ||
              L.none,
            clipText(e.participants || L.none, 48),
            clipText(plainTextFromMarkdown(e.ordreDuJour || L.none), 120),
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
    doc.text(L.detailsSection, MARGIN, detailY);
    detailY += 6;

    for (const e of withDetails) {
      if (detailY > doc.internal.pageSize.getHeight() - 25) {
        doc.addPage("landscape");
        detailY = MARGIN + 8;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(
        `${e.id} · ${translateSmqStoredLabel(e.type, locale)} · ${fmtDate(e.date, locale)}`,
        MARGIN,
        detailY,
      );
      detailY += 4;

      const pageHeight = doc.internal.pageSize.getHeight();
      const renderOpts = {
        margin: MARGIN,
        maxWidth: pageWidth - MARGIN * 2,
        pageHeight,
        fontSize: 7.5,
        orientation: "landscape" as const,
        onNewPage: () => {
          detailY = MARGIN + 8;
        },
      };

      if (e.ordreDuJour?.trim()) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(32, 38, 46);
        if (detailY > pageHeight - 20) {
          doc.addPage("landscape");
          detailY = MARGIN + 8;
        }
        doc.text(`${L.lineAgenda}`, MARGIN, detailY);
        detailY += 4;
        detailY = renderMarkdownInPdf(doc, e.ordreDuJour.trim(), detailY, renderOpts);
        detailY += 2;
      }

      if (e.compteRendu?.trim()) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(32, 38, 46);
        if (detailY > pageHeight - 20) {
          doc.addPage("landscape");
          detailY = MARGIN + 8;
        }
        doc.text(`${L.lineMinutes}`, MARGIN, detailY);
        detailY += 4;
        detailY = renderMarkdownInPdf(doc, e.compteRendu.trim(), detailY, renderOpts);
        detailY += 5;
      }
    }
  }

  return new Uint8Array(doc.output("arraybuffer"));
}
