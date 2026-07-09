import Groq from "groq-sdk";
import { NextRequest } from "next/server";
import { splitIntoChunks } from "@/lib/chunking";
import {
  CHARS_PER_TOKEN_ESTIMATE,
  CONDENSATION_SYSTEM_PROMPT,
  CONDENSE_CHUNK_MAX_CHARS,
  CONDENSE_OUTPUT_TOKENS,
  DEFAULT_STYLE_PROMPT,
  MAX_DOCUMENT_CHARS,
  MAX_OUTPUT_TOKENS,
  MODEL_ID,
  SINGLE_PASS_MAX_CHARS,
} from "@/lib/constants";
import { waitForGroqTokenBudget } from "@/lib/groqRateLimit";
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

function estimateTokens(chars: number): number {
  return Math.ceil(chars / CHARS_PER_TOKEN_ESTIMATE);
}

/** Condenses one chunk of a large document down to customer-relevant notes. */
async function condenseChunk(
  client: Groq,
  chunk: string,
  index: number,
  total: number
): Promise<{ text: string; headers: Headers }> {
  const { data, response } = await client.chat.completions
    .create({
      model: MODEL_ID,
      max_completion_tokens: CONDENSE_OUTPUT_TOKENS,
      messages: [
        { role: "system", content: CONDENSATION_SYSTEM_PROMPT },
        {
          role: "user",
          content: `This is part ${index + 1} of ${total} of the internal 102 document.\n\n<document_part>\n${chunk}\n</document_part>`,
        },
      ],
    })
    .withResponse();

  return { text: (data.choices[0]?.message?.content ?? "").trim(), headers: response.headers };
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
        let finalDocumentText = sourceText;

        // Documents too big for a single request first go through a
        // condense-then-generate pipeline: each chunk gets distilled down
        // to customer-relevant notes (a much shorter prompt than the full
        // style guide, so each chunk can be far bigger), then the combined
        // notes are run through the normal generation step below.
        if (sourceText.length > SINGLE_PASS_MAX_CHARS) {
          const chunks = splitIntoChunks(sourceText, CONDENSE_CHUNK_MAX_CHARS);
          const condensedParts: string[] = [];
          let lastHeaders: Headers | null = null;

          for (let i = 0; i < chunks.length; i++) {
            send("progress", { stage: "condensing", current: i + 1, total: chunks.length });

            if (lastHeaders) {
              const neededTokens =
                estimateTokens(CONDENSATION_SYSTEM_PROMPT.length) +
                estimateTokens(chunks[i].length) +
                CONDENSE_OUTPUT_TOKENS +
                50;
              await waitForGroqTokenBudget(lastHeaders, neededTokens);
            }

            const { text, headers } = await condenseChunk(client, chunks[i], i, chunks.length);
            condensedParts.push(text);
            lastHeaders = headers;
          }

          let condensedText = condensedParts.join("\n\n---\n\n");
          // Rare fallback: if condensation didn't shrink enough (e.g. a
          // very dense document), still cap it so the final call stays
          // within budget rather than erroring out.
          if (condensedText.length > SINGLE_PASS_MAX_CHARS) {
            condensedText = condensedText.slice(0, SINGLE_PASS_MAX_CHARS);
          }

          send("progress", { stage: "writing" });

          if (lastHeaders) {
            const neededTokens =
              estimateTokens(styleInstructions.length) + estimateTokens(condensedText.length) + MAX_OUTPUT_TOKENS + 50;
            await waitForGroqTokenBudget(lastHeaders, neededTokens);
          }

          finalDocumentText = condensedText;
        }

        const userMessage = `Here is the internal 102 document to convert:\n\n<document>\n${finalDocumentText}\n</document>`;

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
