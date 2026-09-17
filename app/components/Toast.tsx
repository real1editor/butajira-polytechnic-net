"use client";

import { useEffect } from "react";
import { useToast, type ToastItem } from "@/app/contexts/ToastContext";

const typeStyles: Record<ToastItem["type"], { inner: string; icon: string }> = {
  success: {
    inner: "bg-green-400/20 text-green-800 dark:text-green-200",
    icon: "bg-green-500",
  },
  error: {
    inner: "bg-red-400/20 text-red-800 dark:text-red-200",
    icon: "bg-red-500",
  },
  info: {
    inner: "bg-blue-400/20 text-blue-800 dark:text-blue-200",
    icon: "bg-blue-500",
  },
};

function ToastCard({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, item.duration);
    return () => clearTimeout(timer);
  }, [item.duration, onClose]);

  return (
    <div
      role="status"
      className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
    >
      <span
        className={`inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${typeStyles[item.type].icon}`}
      />
      <p className={`flex-1 text-sm ${typeStyles[item.type].inner}`}>{item.message}</p>
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
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export default function Toaster() {
  const { items, dismiss } = useToast();

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 px-4 pt-4">
      {items.map((item) => (
        <ToastCard key={item.id} item={item} onClose={() => dismiss(item.id)} />
      ))}
    </div>
  );
}