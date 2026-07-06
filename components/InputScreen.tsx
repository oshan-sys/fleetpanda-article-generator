"use client";

import { AlertCircle, ClipboardPaste, FileText, Link2, Loader2, Sparkles, Upload, X } from "lucide-react";
import { useState } from "react";
import UploadZone from "./UploadZone";
import StyleConfigPanel from "./StyleConfigPanel";
import { MAX_FILE_SIZE_BYTES, PREVIEW_CHAR_COUNT } from "@/lib/constants";

interface InputScreenProps {
  documentText: string;
  fileName: string | null;
  onDocumentReady: (text: string, fileName: string | null) => void;
  styleInstructions: string;
  onStyleInstructionsChange: (value: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

type Mode = "upload" | "paste" | "gdoc";

export default function InputScreen({
  documentText,
  fileName,
  onDocumentReady,
  styleInstructions,
  onStyleInstructionsChange,
  onGenerate,
  isGenerating,
}: InputScreenProps) {
  const [mode, setMode] = useState<Mode>("upload");
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [gdocUrl, setGdocUrl] = useState("");

  async function handleFile(file: File) {
    setImportError(null);

    if (file.size === 0) {
      setImportError("That file is empty. Choose a different file.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setImportError(`That file is too large. Max size is ${(MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0)}MB.`);
      return;
    }

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/extract", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setImportError(data.error ?? "Failed to read that file.");
        return;
      }

      onDocumentReady(data.text, data.fileName ?? file.name);
    } catch {
      setImportError("Network error while uploading the file. Check your connection and try again.");
    } finally {
      setIsImporting(false);
    }
  }

  async function handleFetchGdoc() {
    const url = gdocUrl.trim();
    if (!url) return;

    setImportError(null);
    setIsImporting(true);
    try {
      const res = await fetch("/api/import-gdoc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();

      if (!res.ok) {
        setImportError(data.error ?? "Failed to fetch that Google Doc.");
        return;
      }

      onDocumentReady(data.text, data.fileName ?? "Google Doc");
    } catch {
      setImportError("Network error while fetching the document. Check your connection and try again.");
    } finally {
      setIsImporting(false);
    }
  }

  const canGenerate = documentText.trim().length > 0 && !isGenerating && !isImporting;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div role="tablist" aria-label="Choose input method" className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-1">
          <button
            role="tab"
            type="button"
            aria-selected={mode === "upload"}
            onClick={() => setMode("upload")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 ${
              mode === "upload" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            Upload a file
          </button>
          <button
            role="tab"
            type="button"
            aria-selected={mode === "gdoc"}
            onClick={() => setMode("gdoc")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 ${
              mode === "gdoc" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
            Google Doc link
          </button>
          <button
            role="tab"
            type="button"
            aria-selected={mode === "paste"}
            onClick={() => setMode("paste")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 ${
              mode === "paste" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <ClipboardPaste className="h-3.5 w-3.5" aria-hidden="true" />
            Paste text instead
          </button>
        </div>

        {mode === "upload" && <UploadZone onFileSelected={handleFile} disabled={isImporting || isGenerating} />}

        {mode === "gdoc" && (
          <div>
            <label htmlFor="gdoc-url" className="mb-2 block text-sm font-medium text-slate-700">
              Paste a Google Docs link
            </label>
            <div className="flex gap-2">
              <input
                id="gdoc-url"
                type="url"
                value={gdocUrl}
                onChange={(e) => setGdocUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleFetchGdoc();
                  }
                }}
                disabled={isImporting || isGenerating}
                placeholder="https://docs.google.com/document/d/..."
                className="flex-1 rounded-md border border-slate-300 p-2.5 text-sm text-slate-800 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
              />
              <button
                type="button"
                onClick={handleFetchGdoc}
                disabled={isImporting || isGenerating || !gdocUrl.trim()}
                className="flex flex-shrink-0 items-center gap-1.5 rounded-md bg-panda-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-panda-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                Fetch
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              The doc must be shared with <span className="font-medium">"Anyone with the link"</span> (Share →
              General access) so the server can read it.
            </p>
          </div>
        )}

        {mode === "paste" && (
          <div>
            <label htmlFor="paste-text" className="mb-2 block text-sm font-medium text-slate-700">
              Paste the 102 document text
            </label>
            <textarea
              id="paste-text"
              rows={12}
              value={fileName ? "" : documentText}
              onChange={(e) => onDocumentReady(e.target.value, null)}
              disabled={isGenerating}
              placeholder="Paste the full text of the internal 102 document here..."
              className="w-full resize-y rounded-md border border-slate-300 p-3 text-sm text-slate-800 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
            />
          </div>
        )}

        {isImporting && (
          <p className="mt-3 flex items-center gap-2 text-sm text-slate-500" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {mode === "gdoc" ? "Fetching document…" : "Reading document…"}
          </p>
        )}

        {importError && (
          <div
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
            {importError}
          </div>
        )}

        {!isImporting && documentText.trim() && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="mb-1 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                <FileText className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                {fileName ? (
                  <>
                    Loaded from <span className="font-semibold">{fileName}</span>
                  </>
                ) : (
                  "Pasted text"
                )}{" "}
                · {documentText.length.toLocaleString()} characters
              </p>
              <button
                type="button"
                onClick={() => {
                  onDocumentReady("", null);
                  setGdocUrl("");
                }}
                aria-label="Clear and start over"
                className="flex-shrink-0 rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-500">
              {documentText.slice(0, PREVIEW_CHAR_COUNT)}
              {documentText.length > PREVIEW_CHAR_COUNT ? "…" : ""}
            </p>
          </div>
        )}
      </div>

      <StyleConfigPanel value={styleInstructions} onChange={onStyleInstructionsChange} />

      <button
        type="button"
        onClick={onGenerate}
        disabled={!canGenerate}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-accent-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Generating…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Generate Article
          </>
        )}
      </button>
    </div>
  );
}
