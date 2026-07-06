import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Matches the document ID out of any of Google Docs' common URL shapes:
// .../document/d/<ID>/edit, .../document/d/<ID>/view, .../document/d/<ID>, etc.
const GOOGLE_DOC_ID_PATTERN = /\/document\/d\/([a-zA-Z0-9_-]+)/;

function extractDocId(url: string): string | null {
  const match = GOOGLE_DOC_ID_PATTERN.exec(url);
  return match ? match[1] : null;
}

export async function POST(req: NextRequest) {
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

  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;

  let text: string;
  try {
    const res = await fetch(exportUrl, { redirect: "follow" });
    const contentType = res.headers.get("content-type") ?? "";

    // A doc that isn't shared "Anyone with the link" redirects to a Google
    // login/error page instead of the plain-text export — that comes back
    // as a 200 with an HTML body, so status alone can't detect the failure.
    if (!res.ok || contentType.includes("text/html")) {
      return NextResponse.json(
        {
          error:
            "Couldn't read that document. Make sure it's shared with \"Anyone with the link\" (Share → General access) and try again, or download it and upload the file instead.",
        },
        { status: 422 }
      );
    }

    text = (await res.text()).trim();
  } catch {
    return NextResponse.json(
      { error: "Network error while fetching the Google Doc. Check the link and try again." },
      { status: 502 }
    );
  }

  if (!text) {
    return NextResponse.json({ error: "That document appears to be empty." }, { status: 422 });
  }

  return NextResponse.json({ text, fileName: "Google Doc" });
}
