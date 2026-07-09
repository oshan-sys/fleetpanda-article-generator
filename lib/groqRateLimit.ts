// Groq enforces a continuously-refilling token bucket (not a fixed
// calendar-minute window) — e.g. 12,000 tokens/60s refills at 200
// tokens/sec. Every response carries the exact remaining budget and time
// until it refills, so a multi-call pipeline (like chunked condensation)
// can pace itself precisely instead of guessing or blindly waiting 60s.

/** Parses Groq's duration strings ("205ms", "7.66s", "1m26.4s") to milliseconds. */
export function parseGroqDuration(input: string): number {
  let ms = 0;
  const hourMatch = /(\d+(?:\.\d+)?)h/.exec(input);
  const minMatch = /(\d+(?:\.\d+)?)m(?!s)/.exec(input);
  const secMatch = /(\d+(?:\.\d+)?)s/.exec(input);
  const msMatch = /(\d+(?:\.\d+)?)ms/.exec(input);
  if (hourMatch) ms += parseFloat(hourMatch[1]) * 3_600_000;
  if (minMatch) ms += parseFloat(minMatch[1]) * 60_000;
  if (secMatch && !msMatch) ms += parseFloat(secMatch[1]) * 1000;
  if (msMatch) ms += parseFloat(msMatch[1]);
  return ms;
}

/**
 * Reads the remaining-token budget off a Groq response and, if it's not
 * enough for the next call, sleeps until the bucket has refilled (plus a
 * small safety buffer) before returning.
 */
export async function waitForGroqTokenBudget(headers: Headers, neededTokens: number): Promise<void> {
  const remaining = Number(headers.get("x-ratelimit-remaining-tokens") ?? NaN);
  if (Number.isNaN(remaining) || remaining >= neededTokens) return;

  const resetStr = headers.get("x-ratelimit-reset-tokens");
  if (!resetStr) return;

  const waitMs = parseGroqDuration(resetStr) + 250;
  await new Promise((resolve) => setTimeout(resolve, waitMs));
}
