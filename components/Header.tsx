import { Sparkles } from "lucide-react";

export default function Header() {
  return (
    <header className="border-b border-accent-600/40 bg-panda-900 text-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-accent-600/20 text-accent-400">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              FleetPanda · Product Enablement
            </p>
            <h1 className="text-lg font-semibold leading-tight">Article Generator</h1>
          </div>
        </div>
        <p className="hidden max-w-xs text-right text-sm text-slate-400 sm:block">
          Convert internal 102 docs into customer-facing knowledge-base articles.
        </p>
      </div>
    </header>
  );
}
