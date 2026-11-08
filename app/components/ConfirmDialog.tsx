"use client";

import { useId, useRef } from "react";
import { useDialog } from "@/app/components/useDialog";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  useDialog(open, onCancel, panelRef);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-backdrop-in"
      onClick={onCancel}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="glass-card-strong animate-palette-in w-full max-w-sm p-6 outline-none"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={`${titleId}-description`}
      >
        <h2
          id={titleId}
          className="text-base font-semibold text-slate-900 dark:text-white"
        >
          {title}
        </h2>
        <p
          id={`${titleId}-description`}
          className="mt-2 text-sm text-slate-600 dark:text-slate-400"
        >
          {message}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="btn-danger"
          >
            {busy ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}