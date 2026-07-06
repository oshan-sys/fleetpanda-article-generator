import { NextRequest, NextResponse } from "next/server";
import { buildDocxFromMarkdown } from "@/lib/markdownToDocx";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { markdown?: string; fileName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const markdown = (body.markdown ?? "").trim();
  if (!markdown) {
    return NextResponse.json({ error: "Nothing to export yet." }, { status: 400 });
  }

  try {
    const buffer = await buildDocxFromMarkdown(markdown);
    const fileName = (body.fileName || "article").replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "article";

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${fileName}.docx"`,
      },
    });
  } catch (err) {
    console.error("DOCX export failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error.";
    return NextResponse.json({ error: `Failed to build the Word document: ${message}` }, { status: 500 });
  }
}
