import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export const runtime = "nodejs";

// Matches the document ID out of any of Google Docs' common URL shapes:
// .../document/d/<ID>/edit, .../document/d/<ID>/view, .../document/d/<ID>, etc.
const GOOGLE_DOC_ID_PATTERN = /\/document\/d\/([a-zA-Z0-9_-]+)/;

function extractDocId(url: string): string | null {
  const match = GOOGLE_DOC_ID_PATTERN.exec(url);
  return match ? match[1] : null;
}

// Minimal shape of the fields we actually read from the Docs API response —
// see https://developers.google.com/docs/api/reference/rest/v1/documents
interface DocsParagraphElement {
  textRun?: { content?: string };
}
interface DocsStructuralElement {
  paragraph?: { elements?: DocsParagraphElement[] };
  table?: { tableRows?: { tableCells?: { content?: DocsStructuralElement[] }[] }[] };
}
interface DocsApiDocument {
  title?: string;
  body?: { content?: DocsStructuralElement[] };
}

function extractText(elements: DocsStructuralElement[] | undefined): string {
  let text = "";
  for (const el of elements ?? []) {
    if (el.paragraph) {
      for (const part of el.paragraph.elements ?? []) {
        text += part.textRun?.content ?? "";
      }
    } else if (el.table) {
      for (const row of el.table.tableRows ?? []) {
        const cells = (row.tableCells ?? []).map((cell) => extractText(cell.content).trim());
        text += cells.join("\t") + "\n";
      }
    }
  }
  return text;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json(
      { error: "Your sign-in session needs a refresh. Sign out and back in, then try again." },
      { status: 401 }
    );
  }
  if (session.error === "RefreshAccessTokenError") {
    return NextResponse.json(
      { error: "Your Google session expired. Sign out and back in, then try again." },
      { status: 401 }
    );
  }

  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const url = (body.url ?? "").trim();
  if (!url) {
    return NextResponse.json({ error: "Paste a Google Docs link first." }, { status: 400 });
  }

  const docId = extractDocId(url);
  if (!docId) {
    return NextResponse.json(
      {
        error:
          "That doesn't look like a Google Docs link. Open the doc, click Share, then Copy link, and paste the full URL here.",
      },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });

    if (res.status === 404) {
      return NextResponse.json({ error: "That document doesn't exist, or you don't have access to it." }, { status: 404 });
    }
    if (res.status === 403) {
      return NextResponse.json(
        { error: "Your FleetPanda Google account doesn't have access to that document. Ask the owner to share it with you." },
        { status: 403 }
      );
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Google Docs API error (${res.status}). ${detail.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const doc = (await res.json()) as DocsApiDocument;
    const text = extractText(doc.body?.content).trim();

    if (!text) {
      return NextResponse.json({ error: "That document appears to be empty." }, { status: 422 });
    }

    return NextResponse.json({ text, fileName: doc.title || "Google Doc" });
  } catch {
    return NextResponse.json(
      { error: "Network error while fetching the Google Doc. Check the link and try again." },
      { status: 502 }
    );
  }
}
