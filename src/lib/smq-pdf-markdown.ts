import type jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type PdfMarkdownBlock =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "table"; rows: string[][] };

/** Retire le markup inline pour aperçus courts (tableau planning). */
export function plainTextFromMarkdown(text: string): string {
  return stripInlineMarkdown(
    text
      .split("\n")
      .map((line) => {
        const h = line.match(/^(#{1,6})\s+(.*)$/);
        if (h) return h[2];
        if (/^\|/.test(line.trim()) && !isTableSeparator(line)) {
          return line
            .split("|")
            .map((c) => c.trim())
            .filter(Boolean)
            .join(" — ");
        }
        if (isTableSeparator(line)) return "";
        return line;
      })
      .filter((l) => l.trim())
      .join(" ")
      .replace(/\s+/g, " "),
  ).trim();
}

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1");
}

function isTableSeparator(line: string): boolean {
  return /^\|?[\s\-:|]+\|?$/.test(line.trim()) && line.includes("-");
}

function parseTableRow(line: string): string[] {
  const cells = line
    .split("|")
    .map((c) => stripInlineMarkdown(c.trim()))
    .filter((c) => c.length > 0);
  return cells;
}

export function parseMarkdownToPdfBlocks(markdown: string): PdfMarkdownBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: PdfMarkdownBlock[] = [];
  let para: string[] = [];
  let tableRows: string[][] | null = null;

  const flushPara = () => {
    const joined = stripInlineMarkdown(para.join(" ").trim());
    if (joined) blocks.push({ kind: "paragraph", text: joined });
    para = [];
  };

  const flushTable = () => {
    if (tableRows && tableRows.length > 0) {
      blocks.push({ kind: "table", rows: tableRows });
    }
    tableRows = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushPara();
      flushTable();
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushPara();
      flushTable();
      blocks.push({
        kind: "heading",
        level: heading[1].length,
        text: stripInlineMarkdown(heading[2].trim()),
      });
      continue;
    }

    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      flushPara();
      if (isTableSeparator(trimmed)) continue;
      const row = parseTableRow(trimmed);
      if (row.length) {
        if (!tableRows) tableRows = [];
        tableRows.push(row);
      }
      continue;
    }

    flushTable();
    para.push(trimmed);
  }

  flushPara();
  flushTable();
  return blocks;
}

type RenderOpts = {
  margin: number;
  maxWidth: number;
  pageHeight: number;
  fontSize?: number;
  orientation?: "portrait" | "landscape";
  onNewPage?: () => void;
};

function addPdfPage(doc: jsPDF, orientation?: "portrait" | "landscape") {
  if (orientation === "landscape") {
    doc.addPage("a4", "landscape");
  } else {
    doc.addPage();
  }
}

function ensureSpace(doc: jsPDF, y: number, need: number, opts: RenderOpts): number {
  if (y + need <= opts.pageHeight - 12) return y;
  addPdfPage(doc, opts.orientation);
  opts.onNewPage?.();
  return opts.margin;
}

export function renderMarkdownInPdf(
  doc: jsPDF,
  markdown: string,
  startY: number,
  opts: RenderOpts,
): number {
  const blocks = parseMarkdownToPdfBlocks(markdown);
  if (blocks.length === 0) return startY;

  let y = startY;
  const baseSize = opts.fontSize ?? 7.5;

  for (const block of blocks) {
    if (block.kind === "heading") {
      const size = block.level <= 1 ? 10 : block.level === 2 ? 9 : 8;
      y = ensureSpace(doc, y, size + 4, opts);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(size);
      doc.setTextColor(32, 38, 46);
      const lines = doc.splitTextToSize(block.text, opts.maxWidth);
      doc.text(lines, opts.margin, y);
      y += lines.length * (size * 0.45) + 2;
      continue;
    }

    if (block.kind === "paragraph") {
      y = ensureSpace(doc, y, 6, opts);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(baseSize);
      doc.setTextColor(40, 40, 40);
      const lines = doc.splitTextToSize(block.text, opts.maxWidth);
      doc.text(lines, opts.margin, y);
      y += lines.length * 3.2 + 2;
      continue;
    }

    if (block.kind === "table") {
      y = ensureSpace(doc, y, 14, opts);
      const head = block.rows[0];
      const body = block.rows.slice(1);
      autoTable(doc, {
        startY: y,
        margin: { left: opts.margin, right: opts.margin },
        head: head ? [head] : undefined,
        body: head ? body : block.rows,
        styles: {
          font: "helvetica",
          fontSize: baseSize,
          cellPadding: 1.5,
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: [32, 38, 46],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        alternateRowStyles: { fillColor: [248, 246, 240] },
        theme: "grid",
      });
      const meta = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable;
      y = (meta?.finalY ?? y) + 4;
    }
  }

  return y;
}
