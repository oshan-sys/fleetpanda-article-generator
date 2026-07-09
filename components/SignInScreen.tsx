import { Sparkles } from "lucide-react";
import { signIn } from "@/auth";

const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: "That Google account isn't part of FleetPanda. Sign in with your @fleetpanda.com account.",
  Configuration: "The app's Google sign-in isn't configured correctly yet. Contact whoever set this up.",
};

export default function SignInScreen({ error }: { error?: string }) {
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? "Couldn't sign you in. Please try again.") : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent-100 text-accent-600">
          <Sparkles className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="text-lg font-semibold text-slate-900">Article Generator</h1>
        <p className="mt-1 text-sm text-slate-500">FleetPanda · Product Enablement</p>

        {errorMessage && (
          <div role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <form
          className="mt-6"
          action={async () => {
            "use server";
            await signIn("google");
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
          >
            <GoogleLogo className="h-4 w-4" />
            Sign in with Google
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-400">Restricted to @fleetpanda.com accounts.</p>
      </div>
    </div>
  );
}

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.92l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11C3.25 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.27a7.2 7.2 0 0 1-.38-2.27c0-.79.14-1.56.38-2.27V6.62H1.27A11.98 11.98 0 0 0 0 12c0 1.94.46 3.77 1.27 5.38z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.62l3.99 3.11C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}
