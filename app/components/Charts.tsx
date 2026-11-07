"use client";

import { useId } from "react";

/* ------------------------------------------------------------------ */
/* Health gauge                                                        */
/* ------------------------------------------------------------------ */

export function HealthGauge({
  score,
  grade,
  size = 176,
}: {
  score: number;
  grade: string;
  size?: number;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const radius = 70;
  const stroke = 12;
  const circumference = 2 * Math.PI * radius;
  const safeScore = Math.max(0, Math.min(100, score));
  const offset = circumference * (1 - safeScore / 100);
  const tone =
    safeScore >= 80 ? "text-emerald-500" : safeScore >= 60 ? "text-amber-500" : "text-red-500";

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Network health score ${score} out of 100, grade ${grade}`}
    >
      <svg viewBox="0 0 176 176" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id={`gauge-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="55%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        <circle
          cx="88"
          cy="88"
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-zinc-100 dark:stroke-zinc-800"
        />
        <circle
          cx="88"
          cy="88"
          r={radius}
          fill="none"
          stroke={`url(#gauge-${uid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-100">
          {score}
        </span>
        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
          Health score
        </span>
        <span className={`mt-1 text-xs font-semibold ${tone}`}>{grade}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Donut chart                                                         */
/* ------------------------------------------------------------------ */

export type DonutSlice = { label: string; value: number; color: string };

export function DonutChart({
  data,
  centerLabel,
  centerValue,
  size = 152,
}: {
  data: DonutSlice[];
  centerLabel: string;
  centerValue?: number | string;
  size?: number;
}) {
  const total = data.reduce((sum, slice) => sum + slice.value, 0);
  const radius = 52;
  const stroke = 16;
  const circumference = 2 * Math.PI * radius;

  let cursor = 0;
  const segments = data.map((slice) => {
    const length = total > 0 ? (slice.value / total) * circumference : 0;
    const segment = { ...slice, length, offset: cursor };
    cursor += length;
    return segment;
  });

  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className="stroke-zinc-100 dark:stroke-zinc-800"
          />
          {total > 0 &&
            segments.map((segment) => (
              <circle
                key={segment.label}
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={stroke}
                strokeDasharray={`${segment.length} ${circumference - segment.length}`}
                strokeDashoffset={-segment.offset}
                strokeLinecap="butt"
              />
            ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
            {centerValue ?? total}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
            {centerLabel}
          </span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5 text-xs">
        {data.map((slice) => (
          <li key={slice.label} className="flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: slice.color }}
            />
            <span className="truncate text-zinc-600 dark:text-zinc-300">{slice.label}</span>
            <span className="ml-auto font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
              {slice.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Trend chart (area + line)                                           */
/* ------------------------------------------------------------------ */

export type TrendPoint = { label: string; value: number };

export function TrendChart({
  data,
  height = 150,
  color = "#6366f1",
  formatter,
}: {
  data: TrendPoint[];
  height?: number;
  color?: string;
  formatter?: (value: number) => string;
}) {
  const width = 340;
  const pad = { top: 14, right: 10, bottom: 24, left: 10 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(1, ...data.map((point) => point.value));
  const step = data.length > 1 ? innerW / (data.length - 1) : 0;

  const points = data.map((point, index) => ({
    x: pad.left + index * step,
    y: pad.top + innerH - (point.value / max) * innerH,
    ...point,
  }));

  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  const baseY = pad.top + innerH;
  const lastX = points.length > 0 ? points[points.length - 1].x : pad.left;
  const firstX = points.length > 0 ? points[0].x : pad.left;
  const area = points.length > 0 ? `${line} L ${lastX} ${baseY} L ${firstX} ${baseY} Z` : "";
  const gradientId = useId().replace(/[^a-zA-Z0-9]/g, "");

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="Maintenance cost trend"
      >
        <defs>
          <linearGradient id={`trend-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={ratio}
            x1={pad.left}
            x2={width - pad.right}
            y1={pad.top + innerH * ratio}
            y2={pad.top + innerH * ratio}
            className="stroke-zinc-100 dark:stroke-zinc-800"
            strokeWidth={1}
          />
        ))}

        {area && <path d={area} fill={`url(#trend-${gradientId})`} />}
        {line && (
          <path d={line} fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
        )}

        {points.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r={3.2} fill={color} />
            <title>{`${point.label}: ${formatter ? formatter(point.value) : point.value}`}</title>
          </g>
        ))}

        {points.map((point) => (
          <text
            key={`label-${point.label}`}
            x={point.x}
            y={height - 6}
            textAnchor="middle"
            className="fill-zinc-400 text-[10px] dark:fill-zinc-500"
          >
            {point.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Progress meter                                                      */
/* ------------------------------------------------------------------ */

export function ProgressMeter({
  value,
  tone = "bg-emerald-500",
  label,
}: {
  value: number;
  tone?: string;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={`h-full rounded-full ${tone} transition-[width] duration-700`}
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        />
      </div>
    </div>
  );
}
