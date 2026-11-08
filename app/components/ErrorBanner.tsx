"use client";

type ErrorBannerProps = {
  message: string;
  onDismiss: () => void;
};

/** Inline dismissible error notice shared by every page. */
export default function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 backdrop-blur-xl dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-300"
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss error"
        className="shrink-0 rounded p-0.5 text-red-400 transition-colors hover:text-red-700"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}