import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 font-sans text-slate-900 dark:text-slate-100">
      <div className="glass-card-strong w-full max-w-sm p-8 text-center">
        <span className="mb-4 inline-flex h-3 w-3 rounded-full bg-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.8)]" />
        <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          The page you’re looking for doesn’t exist or may have been moved.
        </p>
        <div className="mt-6">
          <Link href="/" className="btn-primary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}