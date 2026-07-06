"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  FileDown,
  FileType,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import MarkdownPreview from "./MarkdownPreview";

interface OutputScreenProps {
  markdown: string;
  onMarkdownChange: (value: string) => void;
  isGenerating: boolean;
  loadingStage: string;
  error: string | null;
  fileName: string | null;
  onRegenerate: () => void;
  onStartOver: () => void;
}

function slugify(base: string): string {
  return (
    base
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "article"
  );
}

export default function OutputScreen({
  markdown,
  onMarkdownChange,
  isGenerating,
  loadingStage,
  error,
  fileName,
  onRegenerate,
  onStartOver,
}: OutputScreenProps) {
  const [copied, setCopied] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const baseName = slugify(fileName ?? "article");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setExportError("Couldn't copy to clipboard. Your browser may be blocking clipboard access.");
    }
  }

  function handleDownloadMd() {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDownloadDocx() {
    setExportError(null);
    setIsExportingDocx(true);
    try {
      const res = await fetch("/api/export/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown, fileName: baseName }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setExportError(data.error ?? "Failed to export as Word document.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${baseName}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError("Network error while exporting the Word document.");
    } finally {
      setIsExportingDocx(false);
    }
  }

  const showStageBanner = isGenerating && markdown.trim().length === 0;

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Review &amp; edit</h2>
          {isGenerating && (
            <span className="flex items-center gap-1.5 rounded-full bg-accent-100 px-2.5 py-1 text-xs font-medium text-accent-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-600" aria-hidden="true" />
              {markdown.trim() ? "Writing article…" : loadingStage}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onStartOver}
          className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700 focus:outline-none focus-visible:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Start over
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="mb-2 flex items-center gap-1.5 font-medium">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            Generation stopped
          </p>
          <p className="mb-3">{error}</p>
          <button
            type="button"
            onClick={onRegenerate}
            className="flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Retry
          </button>
        </div>
      )}

      {showStageBanner && !error && (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-8 text-sm text-slate-500 shadow-sm">
          <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin text-accent-500" aria-hidden="true" />
          <span>{loadingStage}</span>
        </div>
      )}

      {(markdown.trim() || (!showStageBanner && !error)) && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              Markdown (editable)
            </div>
            <textarea
              value={markdown}
              onChange={(e) => onMarkdownChange(e.target.value)}
              readOnly={isGenerating}
              rows={28}
              className="w-full resize-y p-4 font-mono text-xs leading-relaxed text-slate-800 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-accent-500"
              spellCheck={false}
              aria-label="Article markdown source, editable"
            />
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              Preview
            </div>
            <div className="max-h-[42rem] overflow-y-auto p-4">
              <MarkdownPreview markdown={markdown} />
            </div>
          </div>
        </div>
      )}

      {exportError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          {exportError}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={handleCopy}
          disabled={isGenerating || !markdown.trim()}
          className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copy Markdown
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleDownloadMd}
          disabled={isGenerating || !markdown.trim()}
          className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FileDown className="h-4 w-4" aria-hidden="true" />
          Download .md
        </button>
        <button
          type="button"
          onClick={handleDownloadDocx}
          disabled={isGenerating || !markdown.trim() || isExportingDocx}
          className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isExportingDocx ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <FileType className="h-4 w-4" aria-hidden="true" />
          )}
          {isExportingDocx ? "Exporting…" : "Download .docx"}
        </button>
        <div className="ml-auto flex gap-3">
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isGenerating}
            className="flex items-center gap-1.5 rounded-md bg-accent-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            <RefreshCw className={`h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} aria-hidden="true" />
            Regenerate
          </button>
        </div>
      </div>
    </div>
  );
}
