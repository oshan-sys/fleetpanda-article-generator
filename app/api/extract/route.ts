import { NextRequest, NextResponse } from "next/server";
import { MAX_FILE_SIZE_BYTES } from "@/lib/constants";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Could not read the upload. Please try again." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "The uploaded file is empty." }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const maxMb = (MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0);
    return NextResponse.json({ error: `That file is too large. Max size is ${maxMb}MB.` }, { status: 400 });
  }

  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    let text = "";

    if (name.endsWith(".docx") || name.endsWith(".doc")) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (name.endsWith(".txt") || name.endsWith(".md")) {
      text = buffer.toString("utf-8");
    } else if (name.endsWith(".pdf")) {
      try {
        // Import the internal module directly — requiring the package's
        // top-level entry point runs its debug/test harness under some
        // bundlers (a long-standing pdf-parse quirk).
        const pdfParseModule = await import("pdf-parse/lib/pdf-parse.js");
        const pdfParse = (pdfParseModule as unknown as { default?: typeof pdfParseModule }).default ?? pdfParseModule;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (pdfParse as any)(buffer);
        text = result.text;
      } catch (pdfErr) {
        console.error("PDF parse failed:", pdfErr);
        return NextResponse.json(
          {
            error:
              "Could not read this PDF. Try exporting it as .docx or .txt, or paste the text directly instead.",
          },
          { status: 422 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Upload a .docx, .doc, .txt, .md, or .pdf file." },
        { status: 400 }
      );
    }

    text = text.trim();

    if (!text) {
      return NextResponse.json(
        { error: "No readable text was found in this file. Try pasting the text directly instead." },
        { status: 422 }
      );
    }

    return NextResponse.json({ text, fileName: file.name });
  } catch (err) {
    console.error("Extraction failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error.";
    return NextResponse.json({ error: `Failed to parse the file: ${message}` }, { status: 422 });
  }
}
