"use client";

import { useEffect, useMemo, useState } from "react";

export type StatIcon = "assets" | "active" | "ports" | "cables" | "logs";

type StatCardProps = {
  label: string;
  value: number;
  icon: StatIcon;
  accent: string;
  bar: string;
  live?: boolean;
};

const ICONS: Record<StatIcon, string> = {
  assets:
    "M5 3h14a2 2 0 012 2v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zm0 9h14a2 2 0 012 2v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3a2 2 0 012-2z",
  active:
    "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  ports:
    "M4 7h6m4 0h6M4 12h6m4 0h6M4 17h6m4 0h6M7 5v4m10-4v4M7 10v4m10-4v4M7 15v4m10-4v4",
  cables:
    "M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244",
  logs:
    "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
};

function useCountUp(target: number) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      const frame = requestAnimationFrame(() => setDisplay(target));
      return () => cancelAnimationFrame(frame);
    }

    const duration = 900;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return display;
}

export default function StatCard({
  label,
  value,
  icon,
  accent,
  bar,
  live,
}: StatCardProps) {
  const display = useCountUp(value);

  const spark = useMemo(() => {
    const seed = value + label.length * 3;
    return Array.from({ length: 16 }, (_, index) => {
      const wave =
        Math.sin((seed + index * 7.31) * 0.9) * 0.5 +
        Math.sin((seed + index * 2.17) * 1.7) * 0.3;
      return Math.round(28 + Math.abs(wave) * 72);
    });
  }, [label, value]);

  return (
    <div className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md sm:p-5 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
      <span className={`absolute inset-x-0 top-0 h-0.5 ${bar}`} aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">
            {display}
          </p>
        </div>
        <span
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accent}`}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d={ICONS[icon]}
            />
          </svg>
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        {live ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <span className="live-dot inline-flex h-1.5 w-1.5 rounded-full text-emerald-500" />
            Live
          </span>
        ) : (
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
            &nbsp;
          </span>
        )}

        <div
          className="flex h-7 items-end gap-[3px]"
          aria-hidden="true"
        >
          {spark.map((height, index) => (
            <span
              key={index}
              className={`animate-spark w-[3px] rounded-full ${bar} opacity-40 transition-opacity group-hover:opacity-70`}
              style={{
                height: `${height}%`,
                animationDelay: `${index * 35}ms`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
