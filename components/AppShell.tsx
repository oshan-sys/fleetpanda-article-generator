"use client";

import { TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import InputScreen from "@/components/InputScreen";
import OutputScreen from "@/components/OutputScreen";
import StepIndicator from "@/components/StepIndicator";
import { parseSSEStream } from "@/lib/sse";
import {
  DEFAULT_STYLE_PROMPT,
  STYLE_INSTRUCTIONS_STORAGE_KEY,
} from "@/lib/constants";
import type {
  AppStep,
  GenerateDeltaEvent,
  GenerateErrorEvent,
  GenerateMetaEvent,
  GenerateProgressEvent,
} from "@/lib/types";

export default function AppShell() {
  const [step, setStep] = useState<AppStep>("input");

  const [documentText, setDocumentText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);

  const [styleInstructions, setStyleInstructions] = useState(DEFAULT_STYLE_PROMPT);
  const [styleLoaded, setStyleLoaded] = useState(false);

  const [markdown, setMarkdown] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStage, setLoadingStage] = useState("Reading document…");
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [truncationWarning, setTruncationWarning] = useState<string | null>(null);

  // Load the person's last-used style instructions once, on mount.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STYLE_INSTRUCTIONS_STORAGE_KEY);
      if (saved) setStyleInstructions(saved);
    } catch {
      // localStorage can be unavailable (privacy mode, disabled storage) — fall back to the default silently.
    } finally {
      setStyleLoaded(true);
    }
  }, []);

  // Persist style instructions as the person edits them.
  useEffect(() => {
    if (!styleLoaded) return;
    try {
      window.localStorage.setItem(STYLE_INSTRUCTIONS_STORAGE_KEY, styleInstructions);
    } catch {
      // ignore — non-critical
    }
  }, [styleInstructions, styleLoaded]);

  function handleDocumentReady(text: string, name: string | null) {
    setDocumentText(text);
    setFileName(name);
  }

  async function handleGenerate() {
    if (!documentText.trim()) return;

    setStep("output");
    setMarkdown("");
    setGenerateError(null);
    setTruncationWarning(null);
    setIsGenerating(true);
    setLoadingStage("Reading document…");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentText, styleInstructions }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setGenerateError(data.error ?? `Request failed with status ${res.status}.`);
        return;
      }

      setLoadingStage("Writing article…");

      for await (const msg of parseSSEStream(res)) {
        if (msg.event === "meta") {
          const data = msg.data as GenerateMetaEvent;
          if (data.truncated) {
            setTruncationWarning(
              `Heads up: the source document was very long, so only the first ${data.usedLength.toLocaleString()} of ${data.originalLength.toLocaleString()} characters were used.`
            );
          }
        } else if (msg.event === "progress") {
          const data = msg.data as GenerateProgressEvent;
          if (data.stage === "condensing") {
            setLoadingStage(
              `Condensing large document (part ${data.current} of ${data.total})… this can take a while on the free tier.`
            );
          } else {
            setLoadingStage("Writing article…");
          }
        } else if (msg.event === "delta") {
          const data = msg.data as GenerateDeltaEvent;
          setMarkdown((prev) => prev + data.text);
        } else if (msg.event === "error") {
          const data = msg.data as GenerateErrorEvent;
          setGenerateError(data.message);
        }
        // "done" carries only the stop reason — nothing else to do with it here.
      }
    } catch {
      setGenerateError("Network error while generating the article. Check your connection and try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleStartOver() {
    setStep("input");
    setDocumentText("");
    setFileName(null);
    setMarkdown("");
    setGenerateError(null);
    setTruncationWarning(null);
  }

  return (
    <>
      <StepIndicator step={step} />
      <main>
        {step === "input" ? (
          <InputScreen
            documentText={documentText}
            fileName={fileName}
            onDocumentReady={handleDocumentReady}
            styleInstructions={styleInstructions}
            onStyleInstructionsChange={setStyleInstructions}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
          />
        ) : (
          <>
            {truncationWarning && (
              <div className="mx-auto max-w-6xl px-6 pt-6">
                <div
                  role="status"
                  className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800"
                >
                  <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  {truncationWarning}
                </div>
              </div>
            )}
            <OutputScreen
              markdown={markdown}
              onMarkdownChange={setMarkdown}
              isGenerating={isGenerating}
              loadingStage={loadingStage}
              error={generateError}
              fileName={fileName}
              onRegenerate={handleGenerate}
              onStartOver={handleStartOver}
            />
          </>
        )}
      </main>
    </>
  );
}
