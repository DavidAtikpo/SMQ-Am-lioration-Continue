import type jsPDF from "jspdf";
import QRCode from "qrcode";
import type { SmqLocale } from "@/lib/smq-i18n";
import { resolveSmqLogoAsset, smqPlanningQrTargetUrl } from "@/lib/smq-pdf-assets";
import { SMQ_RHYTHME } from "@/lib/smq-rhythm";

const MARGIN = 10;
const QR_MM = 24;
const LOGO_ON_QR_MM = 9;

export type SmqPlanningHeaderLabels = {
  planningTitle: string;
  docCodePlan: string;
  generatedOn: string;
  year: string;
  allPeriods: string;
  internalMeetings: string;
  internalAudits: string;
  managementReview: string;
};

export type SmqPlanningHeaderRhythm = {
  reunions: number;
  audits: number;
  revues: number;
};

function rhythmLine(label: string, fait: number, cible: number): string {
  return `${label} : ${fait} / ${cible}`;
}

async function loadPlanningQrImage(): Promise<string> {
  const url = smqPlanningQrTargetUrl();
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "H",
    margin: 0,
    width: 280,
    color: { dark: "#000000", light: "#FFFFFF" },
  });
}

/** En-tête planification SMQ (QR + titre + rythme QHSE + DOC N°). Retourne la position Y du tableau. */
export async function drawSmqPlanningPdfHeader(
  doc: jsPDF,
  options: {
    labels: SmqPlanningHeaderLabels;
    locale: SmqLocale;
    year: number;
    allYears?: boolean;
    generatedAt: string;
    rhythm: SmqPlanningHeaderRhythm;
  },
): Promise<number> {
  const { labels: L, year, allYears, generatedAt, rhythm } = options;
  const pageWidth = doc.internal.pageSize.getWidth();
  const headerY = MARGIN;

  const qrDataUrl = await loadPlanningQrImage();
  doc.addImage(qrDataUrl, "PNG", MARGIN, headerY, QR_MM, QR_MM);

  const logo = resolveSmqLogoAsset();
  const logoX = MARGIN + (QR_MM - LOGO_ON_QR_MM) / 2;
  const logoY = headerY + (QR_MM - LOGO_ON_QR_MM) / 2;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(logoX - 0.5, logoY - 0.5, LOGO_ON_QR_MM + 1, LOGO_ON_QR_MM + 1, 0.8, 0.8, "F");
  if (logo) {
    doc.addImage(logo.dataUrl, logo.format, logoX, logoY, LOGO_ON_QR_MM, LOGO_ON_QR_MM);
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(32, 38, 46);
    doc.text("CI.DES", logoX + LOGO_ON_QR_MM / 2, logoY + LOGO_ON_QR_MM / 2 + 1, {
      align: "center",
    });
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(32, 38, 46);
  const docLabel = `DOC N° ${L.docCodePlan}`;
  const docLabelWidth = doc.getTextWidth(docLabel);
  doc.text(docLabel, pageWidth - MARGIN - docLabelWidth, headerY + 6);

  const textX = MARGIN + QR_MM + 5;
  const textMaxWidth = pageWidth - textX - MARGIN - docLabelWidth - 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  const titleLines = doc.splitTextToSize(L.planningTitle, textMaxWidth);
  let y = headerY + 7;
  doc.text(titleLines, textX, y);
  y += titleLines.length * 6.2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(72, 72, 72);
  const periodLabel = allYears ? L.allPeriods : `${L.year} ${year}`;
  doc.text(`CI.DES — ${periodLabel} — ${L.generatedOn} ${generatedAt}`, textX, y + 1);
  y += 5.5;

  doc.setFontSize(8);
  doc.setTextColor(48, 48, 48);
  const rhythmText = [
    rhythmLine(L.internalMeetings, rhythm.reunions, SMQ_RHYTHME.reunionInterne.cibleParAn),
    rhythmLine(L.internalAudits, rhythm.audits, SMQ_RHYTHME.auditInterne.cibleParAn),
    rhythmLine(L.managementReview, rhythm.revues, SMQ_RHYTHME.revueDirection.cibleParAn),
  ].join("   ·   ");
  const rhythmLines = doc.splitTextToSize(rhythmText, pageWidth - textX - MARGIN);
  doc.text(rhythmLines, textX, y + 1);
  y += rhythmLines.length * 3.6 + 2;

  doc.setDrawColor(200, 195, 185);
  doc.setLineWidth(0.35);
  doc.line(MARGIN, y, pageWidth - MARGIN, y);

  return y + 4;
}

export { MARGIN as SMQ_PDF_MARGIN };
