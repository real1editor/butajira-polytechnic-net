"use client";

import { useId, useRef, type ReactNode } from "react";
import { useDialog } from "@/app/components/useDialog";

type ModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
};

export default function Modal({ open, title, children, onClose }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  useDialog(open, onClose, panelRef);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-backdrop-in"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="glass-card-strong animate-palette-in w-full max-w-lg overflow-hidden outline-none"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex items-center justify-between border-b border-slate-200/60 px-6 py-4 dark:border-white/10">
          <h2
            id={titleId}
            className="text-base font-semibold text-slate-900 dark:text-white"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/60 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
          >
            <svg
              className="h-5 w-5"
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
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}