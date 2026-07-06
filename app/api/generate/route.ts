import Groq from "groq-sdk";
import { NextRequest } from "next/server";
import { DEFAULT_STYLE_PROMPT, MAX_DOCUMENT_CHARS, MAX_OUTPUT_TOKENS, MODEL_ID } from "@/lib/constants";
import type { GenerateRequestBody } from "@/lib/types";

export const runtime = "nodejs";

function sseLine(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

// Resolves a Groq API key the same way the SDK does: explicit env var first.
// Kept as a single function so auth could be swapped for a per-user token
// lookup later without touching the rest of the route.
function getApiKey(): string | undefined {
  return process.env.GROQ_API_KEY;
}

export async function POST(req: NextRequest) {
  let body: Partial<GenerateRequestBody>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body." }), { status: 400 });
  }

  const documentText = (body.documentText ?? "").trim();
  if (!documentText) {
    return new Response(
      JSON.stringify({ error: "No document text to convert. Upload a file or paste text first." }),
      { status: 400 }
    );
  }

  const styleInstructions = (body.styleInstructions ?? "").trim() || DEFAULT_STYLE_PROMPT;

  const apiKey = getApiKey();
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: "Server is missing GROQ_API_KEY. Set it in your environment (see .env.example) and restart the server.",
      }),
      { status: 500 }
    );
  }

  let sourceText = documentText;
  let truncated = false;
  if (sourceText.length > MAX_DOCUMENT_CHARS) {
    sourceText = sourceText.slice(0, MAX_DOCUMENT_CHARS);
    truncated = true;
  }

  const client = new Groq({ apiKey });
  const userMessage = `Here is the internal 102 document to convert:\n\n<document>\n${sourceText}\n</document>`;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => controller.enqueue(encoder.encode(sseLine(event, data)));

      send("meta", {
        truncated,
        originalLength: documentText.length,
        usedLength: sourceText.length,
      });

      try {
        const groqStream = await client.chat.completions.create({
          model: MODEL_ID,
          max_completion_tokens: MAX_OUTPUT_TOKENS,
          stream: true,
          messages: [
            { role: "system", content: styleInstructions },
            { role: "user", content: userMessage },
          ],
        });

        let finishReason: string | null = null;
        for await (const chunk of groqStream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) send("delta", { text: delta });
          finishReason = chunk.choices[0]?.finish_reason ?? finishReason;
        }

        send("done", { stopReason: finishReason });
      } catch (err) {
        let message = "Something went wrong while generating the article.";
        if (err instanceof Groq.RateLimitError) {
          message = "Groq API rate limit reached. Wait a moment and try again.";
        } else if (err instanceof Groq.AuthenticationError) {
          message = "Groq API authentication failed. Check that GROQ_API_KEY is set correctly.";
        } else if (err instanceof Groq.APIError) {
          message = `Groq API error (${err.status ?? "unknown"}): ${err.message}`;
        } else if (err instanceof Error) {
          message = err.message;
        }
        send("error", { message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
