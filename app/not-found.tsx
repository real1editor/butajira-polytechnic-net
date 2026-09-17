import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-4 py-16 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="w-full max-w-sm text-center">
        <span className="mb-3 inline-flex h-3 w-3 rounded-full bg-amber-500" />
        <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          The page you’re looking for doesn’t exist or may have been moved.
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}