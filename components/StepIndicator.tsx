import { Check } from "lucide-react";
import type { AppStep } from "@/lib/types";

const STEPS: { key: AppStep; label: string }[] = [
  { key: "input", label: "Add document & style" },
  { key: "output", label: "Review & export" },
];

export default function StepIndicator({ step }: { step: AppStep }) {
  const currentIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <ol className="mx-auto flex max-w-3xl items-center px-6 pt-6" aria-label="Progress">
      {STEPS.map((s, index) => {
        const isComplete = index < currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <li key={s.key} className="flex flex-1 items-center last:flex-initial">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  isComplete
                    ? "bg-accent-600 text-white"
                    : isCurrent
                      ? "border-2 border-accent-600 text-accent-700"
                      : "border-2 border-slate-300 text-slate-400"
                }`}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isComplete ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : index + 1}
              </span>
              <span className={`text-sm font-medium ${isCurrent ? "text-slate-900" : "text-slate-500"}`}>
                {s.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <span
                className={`mx-3 h-px flex-1 transition-colors ${isComplete ? "bg-accent-600" : "bg-slate-200"}`}
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
