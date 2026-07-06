"use client";

import type { ReactNode } from "react";
import ReactMarkdown, { type Components, type ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";

type CalloutKind = "warning" | "info" | "confirmation" | "default";

const CALLOUT_CLASSES: Record<CalloutKind, string> = {
  warning: "border-amber-400 bg-amber-50 text-amber-900",
  info: "border-blue-400 bg-blue-50 text-blue-900",
  confirmation: "border-emerald-400 bg-emerald-50 text-emerald-900",
  default: "border-slate-300 bg-slate-50 text-slate-800",
};

function extractText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in node) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return extractText((node as any).props?.children);
  }
  return "";
}

function detectCalloutKind(text: string): CalloutKind {
  const upper = text.toUpperCase();
  if (upper.includes("WARNING")) return "warning";
  if (upper.includes("CONFIRMATION")) return "confirmation";
  if (upper.includes("INFO")) return "info";
  return "default";
}

const components: Components = {
  blockquote({ children }: { children?: ReactNode } & ExtraProps) {
    const kind = detectCalloutKind(extractText(children));
    return (
      <blockquote
        className={`not-prose my-4 rounded-md border-l-4 px-4 py-3 text-sm leading-relaxed ${CALLOUT_CLASSES[kind]}`}
      >
        {children}
      </blockquote>
    );
  },
};

interface MarkdownPreviewProps {
  markdown: string;
  className?: string;
}

export default function MarkdownPreview({ markdown, className }: MarkdownPreviewProps) {
  return (
    <div
      className={`prose prose-slate max-w-none prose-headings:font-semibold prose-h1:text-[#e96b2c] prose-h2:mt-8 prose-h2:text-lg prose-h2:text-[#e96b2c] prose-table:text-sm ${className ?? ""}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown || "*Nothing to preview yet.*"}
      </ReactMarkdown>
    </div>
  );
}
