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
