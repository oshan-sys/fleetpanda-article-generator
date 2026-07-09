/**
 * Splits text into chunks of at most maxChars, breaking on paragraph
 * boundaries so a chunk never cuts mid-sentence where avoidable. A single
 * paragraph longer than maxChars is hard-split as a last resort.
 */
export function splitIntoChunks(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];

  const paragraphs = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;

    if (candidate.length > maxChars && current) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = candidate;
    }

    while (current.length > maxChars) {
      chunks.push(current.slice(0, maxChars));
      current = current.slice(maxChars);
    }
  }

  if (current) chunks.push(current);
  return chunks;
}
