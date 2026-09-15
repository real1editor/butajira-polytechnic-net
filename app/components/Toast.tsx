"use client";

import { useEffect } from "react";

type ToastProps = {
  message: string;
  type: "success" | "error";
  onClose: () => void;
};

export default function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <div
        role="status"
        className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-lg border bg-white px-4 py-3 shadow-lg dark:bg-zinc-900"
        style={
          type === "success"
            ? { borderColor: "rgb(134 239 172)" }
            : { borderColor: "rgb(252 165 165)" }
        }
      >
        <span
          className={`inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${
            type === "success" ? "bg-green-500" : "bg-red-500"
          }`}
        />
        <p className="flex-1 text-sm text-zinc-700 dark:text-zinc-200">
          {message}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss notification"
          className="rounded p-0.5 text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
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
    </div>
  );
}