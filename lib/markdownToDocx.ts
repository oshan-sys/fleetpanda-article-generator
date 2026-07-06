import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

// The only accent color allowed in the exported document — applied to the
// headline and section-label headings. Everything else stays plain black.
const ACCENT_COLOR = "E96B2C";
const BLACK = "000000";

function detectCalloutText(text: string): string {
  return text.replace(/^(⚠️|ℹ️|✓)\s*/, "").trim();
}

/** Splits on **bold** markers; everything else renders as plain text. */
function parseInlineRuns(
  text: string,
  opts: { forceBold?: boolean; color?: string; italics?: boolean } = {}
): TextRun[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter((p) => p.length > 0);
  const runs = parts.map((part) => {
    const isBold = part.startsWith("**") && part.endsWith("**");
    const content = isBold ? part.slice(2, -2) : part;
    return new TextRun({
      text: content,
      bold: isBold || opts.forceBold,
      color: opts.color ?? BLACK,
      italics: opts.italics,
    });
  });
  return runs.length > 0
    ? runs
    : [new TextRun({ text: "", bold: opts.forceBold, color: opts.color ?? BLACK, italics: opts.italics })];
}

function isTableSeparatorRow(line: string): boolean {
  return /^\s*\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?\s*$/.test(line);
}

function splitTableRow(line: string): string[] {
  let trimmed = line.trim();
  if (trimmed.startsWith("|")) trimmed = trimmed.slice(1);
  if (trimmed.endsWith("|")) trimmed = trimmed.slice(0, -1);
  return trimmed.split("|").map((cell) => cell.trim());
}

// Plain black borders only — no colored fills or colored borders anywhere.
const TABLE_BORDER = { style: BorderStyle.SINGLE, size: 4, color: BLACK };

function buildTable(headerCells: string[], bodyRows: string[][]): Table {
  const colCount = Math.max(headerCells.length, 1);
  const cellWidth = { size: Math.floor(100 / colCount), type: WidthType.PERCENTAGE } as const;
  const cellBorders = {
    top: TABLE_BORDER,
    bottom: TABLE_BORDER,
    left: TABLE_BORDER,
    right: TABLE_BORDER,
  };

  const headerRow = new TableRow({
    tableHeader: true,
    children: headerCells.map(
      (cell) =>
        new TableCell({
          width: cellWidth,
          borders: cellBorders,
          children: [new Paragraph({ children: parseInlineRuns(cell, { forceBold: true }) })],
        })
    ),
  });

  const rows = bodyRows.map(
    (row) =>
      new TableRow({
        children: row.map(
          (cell) =>
            new TableCell({
              width: cellWidth,
              borders: cellBorders,
              children: [new Paragraph({ children: parseInlineRuns(cell) })],
            })
        ),
      })
  );

  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...rows] });
}

/** Converts the app's generated Markdown into a downloadable Word document. */
export async function buildDocxFromMarkdown(markdown: string): Promise<Buffer> {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const children: (Paragraph | Table)[] = [];
  let sawTitle = false;
  let calloutBuffer: string[] = [];

  const flushCallout = () => {
    if (calloutBuffer.length === 0) return;
    const joined = detectCalloutText(calloutBuffer.join(" ").trim());
    // Callouts aren't part of the current house style, but if one slips
    // through, render it as a plain indented, italicized paragraph rather
    // than introducing any color.
    children.push(
      new Paragraph({
        border: {
          left: { style: BorderStyle.SINGLE, size: 6, color: BLACK },
        },
        spacing: { before: 160, after: 160 },
        indent: { left: 200, right: 200 },
        children: parseInlineRuns(joined, { italics: true }),
      })
    );
    calloutBuffer = [];
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trimEnd();

    if (line.trim().startsWith(">")) {
      calloutBuffer.push(line.trim().replace(/^>\s?/, ""));
      i++;
      continue;
    }
    flushCallout();

    if (line.trim() === "") {
      i++;
      continue;
    }

    // GFM table: a row containing "|" immediately followed by a separator row.
    if (line.includes("|") && i + 1 < lines.length && isTableSeparatorRow(lines[i + 1])) {
      const headerCells = splitTableRow(line);
      i += 2;
      const bodyRows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") {
        bodyRows.push(splitTableRow(lines[i]));
        i++;
      }
      children.push(buildTable(headerCells, bodyRows));
      continue;
    }

    const h1 = /^#\s+(.*)/.exec(line);
    const h2 = /^##\s+(.*)/.exec(line);
    const h3 = /^###\s+(.*)/.exec(line);

    // The headline (Title/H1) — the only other place the accent color applies.
    if (h1) {
      children.push(
        new Paragraph({
          heading: sawTitle ? HeadingLevel.HEADING_1 : HeadingLevel.TITLE,
          spacing: { before: 240, after: 120 },
          children: parseInlineRuns(h1[1], { forceBold: true, color: ACCENT_COLOR }),
        })
      );
      sawTitle = true;
      i++;
      continue;
    }
    // Section labels ("The Problem", "What It Is", ...) — accent color per the house style.
    if (h2) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 320, after: 120 },
          children: parseInlineRuns(h2[1], { forceBold: true, color: ACCENT_COLOR }),
        })
      );
      i++;
      continue;
    }
    if (h3) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 100 },
          children: parseInlineRuns(h3[1]),
        })
      );
      i++;
      continue;
    }

    if (/^\d+\.\s+.*/.test(line)) {
      children.push(
        new Paragraph({ spacing: { after: 100 }, indent: { left: 360 }, children: parseInlineRuns(line) })
      );
      i++;
      continue;
    }

    const bullet = /^[-*]\s+(.*)/.exec(line);
    if (bullet) {
      children.push(
        new Paragraph({ bullet: { level: 0 }, spacing: { after: 80 }, children: parseInlineRuns(bullet[1]) })
      );
      i++;
      continue;
    }

    if (line.trim().startsWith("©")) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 400 },
          children: parseInlineRuns(line),
        })
      );
      i++;
      continue;
    }

    children.push(new Paragraph({ spacing: { after: 120 }, children: parseInlineRuns(line) }));
    i++;
  }
  flushCallout();

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}
