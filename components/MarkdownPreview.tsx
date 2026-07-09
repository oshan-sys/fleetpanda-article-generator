"use client";

import type { ReactNode } from "react";
import ReactMarkdown, { type Components, type ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";

// Callout labels vary a lot in this house style (NOTE, QUICK TIP, PLEASE
// NOTE, WHY IT MATTERS, SETUP NOTE, IF X FAILS, ...) — rather than
// color-coding a fixed keyword list, every callout gets one neutral
// treatment; the bold ALL-CAPS label the model writes is what stands out.
const components: Components = {
  blockquote({ children }: { children?: ReactNode } & ExtraProps) {
    return (
      <blockquote className="not-prose my-4 rounded-md border-l-4 border-slate-300 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-800">
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
      className={`prose prose-slate max-w-none prose-headings:font-semibold prose-h1:text-[#e96b2c] prose-h2:mt-8 prose-h2:text-lg prose-h2:text-[#e96b2c] prose-h3:text-base prose-table:text-sm ${className ?? ""}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown || "*Nothing to preview yet.*"}
      </ReactMarkdown>
    </div>
  );
}
