export interface ExtractResponse {
  text: string;
  fileName: string;
}

export interface ExtractErrorResponse {
  error: string;
}

export interface GenerateRequestBody {
  documentText: string;
  styleInstructions: string;
}

export interface GenerateMetaEvent {
  truncated: boolean;
  originalLength: number;
  usedLength: number;
}

export interface GenerateDeltaEvent {
  text: string;
}

// Emitted only for documents big enough to need the chunk-and-condense
// pipeline (see lib/chunking.ts) — lets the UI show real progress instead
// of a blank wait during the (potentially 30-90s+) condensation phase.
export interface GenerateProgressEvent {
  stage: "condensing" | "writing";
  current?: number;
  total?: number;
}

export interface GenerateDoneEvent {
  stopReason: string | null;
}

export interface GenerateErrorEvent {
  message: string;
}

export type AppStep = "input" | "output";

export interface HistoryEntry {
  id: string;
  createdAt: number;
  fileName: string;
  markdown: string;
}
