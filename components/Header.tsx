import { LogOut, Sparkles } from "lucide-react";
import { signOut } from "@/auth";

interface HeaderProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export default function Header({ user }: HeaderProps) {
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

        <div className="flex items-center gap-4">
          <p className="hidden max-w-xs text-right text-sm text-slate-400 lg:block">
            Convert internal 102 docs into customer-facing knowledge-base articles.
          </p>
          {user && (
            <div className="flex items-center gap-2 border-l border-white/10 pl-4">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt="" className="h-7 w-7 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-xs font-medium">
                  {(user.name ?? user.email ?? "?").charAt(0).toUpperCase()}
                </span>
              )}
              <span className="hidden text-sm text-slate-300 sm:block">{user.name ?? user.email}</span>
              <form
                action={async () => {
                  "use server";
                  await signOut();
                }}
              >
                <button
                  type="submit"
                  aria-label="Sign out"
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
