export interface SSEMessage<T = unknown> {
  event: string;
  data: T;
}

/**
 * Minimal Server-Sent Events reader for a POST fetch() Response — the
 * built-in EventSource API only supports GET, so streaming a generation
 * result back from POST /api/generate needs a hand-rolled parser.
 */
export async function* parseSSEStream<T = unknown>(
  response: Response
): AsyncGenerator<SSEMessage<T>> {
  if (!response.body) return;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary: number;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        const rawMessage = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const parsed = parseSSEBlock<T>(rawMessage);
        if (parsed) yield parsed;
      }
    }

    // Flush anything left in the buffer once the stream closes.
    if (buffer.trim()) {
      const parsed = parseSSEBlock<T>(buffer);
      if (parsed) yield parsed;
    }
  } finally {
    reader.releaseLock();
  }
}

function parseSSEBlock<T>(block: string): SSEMessage<T> | null {
  let event = "message";
  const dataLines: string[] = [];

  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trim());
    }
  }

  if (dataLines.length === 0) return null;

  try {
    const data = JSON.parse(dataLines.join("\n")) as T;
    return { event, data };
  } catch {
    return null;
  }
}
