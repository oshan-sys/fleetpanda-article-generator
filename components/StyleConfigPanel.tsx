"use client";

import { ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useId, useState } from "react";
import { DEFAULT_STYLE_PROMPT } from "@/lib/constants";

interface StyleConfigPanelProps {
  value: string;
  onChange: (value: string) => void;
}

export default function StyleConfigPanel({ value, onChange }: StyleConfigPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const textareaId = useId();
  const isCustomized = value.trim() !== DEFAULT_STYLE_PROMPT.trim();

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-controls={`${textareaId}-panel`}
        className="flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left text-sm font-medium text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-inset"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-slate-400" aria-hidden="true" />
          Customize article style
          {isCustomized && (
            <span className="rounded-full bg-accent-100 px-2 py-0.5 text-xs font-medium text-accent-700">
              Edited
            </span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      <div
        id={`${textareaId}-panel`}
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-slate-200 px-4 py-4">
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor={textareaId} className="text-xs font-medium text-slate-600">
                System prompt sent to Claude for this run
              </label>
              <button
                type="button"
                onClick={() => onChange(DEFAULT_STYLE_PROMPT)}
                className="flex items-center gap-1 text-xs font-medium text-accent-600 hover:text-accent-700 focus:outline-none focus-visible:underline"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                Reset to default
              </button>
            </div>
            <textarea
              id={textareaId}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              rows={16}
              className="w-full resize-y rounded-md border border-slate-300 bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-800 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
              spellCheck={false}
            />
            <p className="mt-2 text-xs text-slate-500">
              Your changes are saved automatically in this browser and reused next time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
