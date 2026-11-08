/**
 * Shared UI class strings. Keep Tailwind presentation in one place so a
 * style change to inputs/selects/propagates across every page.
 *
 * The glass system lives in `app/globals.css` (`.glass-card`, `.btn-primary`,
 * `.btn-secondary`, `.btn-danger`, `.glass-field`). These helpers simply expose
 * those tokens to TSX without repeating long utility chains.
 */
export const inputClass =
  "glass-field placeholder:text-slate-400 dark:placeholder:text-slate-500";

export const cardClass = "glass-card";

export const panelClass = "glass-card overflow-hidden";

export const btnPrimary = "btn-primary";

export const btnSecondary = "btn-secondary";

export const btnDanger = "btn-danger";

/** Small translucent pill used for metadata and status chips. */
export const chipClass = "glass-chip rounded-full px-2.5 py-0.5 text-xs font-medium";
