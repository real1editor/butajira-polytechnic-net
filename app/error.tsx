"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 font-sans text-slate-900 dark:text-slate-100">
      <div className="glass-card-strong w-full max-w-sm p-8 text-center">
        <span className="mb-4 inline-flex h-3 w-3 rounded-full bg-rose-500 shadow-[0_0_18px_rgba(244,63,94,0.8)]" />
        <h1 className="text-2xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          An unexpected error occurred while loading this page. Your data is
          safe — try again below.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <button type="button" onClick={reset} className="btn-primary">
            Try again
          </button>
          <Link href="/" className="btn-secondary">
            Go to dashboard
          </Link>
        </div>
        {error.digest && (
          <p className="mt-6 font-mono text-xs text-slate-500">
            Reference: {error.digest}
          </p>
        )}
      </div>
    </main>
  );
}