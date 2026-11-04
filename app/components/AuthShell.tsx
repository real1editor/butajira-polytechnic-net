import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

const FEATURES = [
  {
    title: "Layered RBAC",
    body: "Row Level Security is the source of truth — never just the UI.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
      />
    ),
  },
  {
    title: "Realtime sync",
    body: "Roles and assets update live across every connected session.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
      />
    ),
  },
  {
    title: "Immutable audit trail",
    body: "Every create, update and delete is recorded and attributable.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
];

const STACK = ["PostgreSQL", "Supabase Auth", "Row Level Security", "Realtime"];

function BrandPanel() {
  return (
    <section className="relative hidden overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 p-8 text-white shadow-2xl lg:flex lg:flex-col">
      <div className="pointer-events-none absolute inset-0 opacity-90">
        <div className="animate-aurora absolute -left-16 -top-24 h-72 w-72 rounded-full bg-emerald-500/30 blur-3xl" />
        <div className="animate-aurora-slow absolute -right-10 top-24 h-64 w-64 rounded-full bg-blue-600/30 blur-3xl" />
        <div className="animate-aurora absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl" />
      </div>
      <div className="brand-grid pointer-events-none absolute inset-0" />

      <div className="relative z-10 flex flex-1 flex-col">
        <div className="flex items-center gap-3">
          <span className="relative inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-white/5 shadow-lg">
            <Image
              src="/company-logo.png"
              alt="Butajira Polytechnic College logo"
              width={40}
              height={40}
              className="h-9 w-9 object-contain"
              priority
            />
          </span>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-emerald-300/80">
              Network Operations
            </p>
            <p className="text-sm font-semibold tracking-tight">
              Butajira Polytechnic College
            </p>
          </div>
        </div>

        <div className="mt-auto pt-10">
          <h1 className="max-w-sm text-3xl font-semibold leading-tight tracking-tight">
            The campus network,{" "}
            <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-blue-300 bg-clip-text text-transparent">
              under control.
            </span>
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-400">
            Track assets, map ports and patch cables, and audit every change from
            a single hardened operations console.
          </p>

          <ul className="mt-8 space-y-4">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-emerald-300">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                  >
                    {feature.icon}
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-medium text-zinc-100">{feature.title}</p>
                  <p className="text-xs leading-relaxed text-zinc-500">{feature.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-white/10 pt-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
            <span className="live-dot inline-flex h-1.5 w-1.5 rounded-full text-emerald-400" />
            Systems operational
          </span>
          {STACK.map((item) => (
            <span
              key={item}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-zinc-400"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex flex-1 overflow-hidden bg-zinc-50 font-sans dark:bg-zinc-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl dark:bg-emerald-500/10" />
        <div className="absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-blue-400/10 blur-3xl dark:bg-blue-500/10" />
      </div>

      <div className="relative mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-stretch lg:gap-10 lg:py-12">
        <BrandPanel />

        <div className="flex flex-col justify-center">
          <div className="mb-6 flex items-center justify-center gap-3 lg:hidden">
            <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
              <Image
                src="/company-logo.png"
                alt="Butajira Polytechnic College logo"
                width={32}
                height={32}
                className="h-7 w-7 object-contain"
                priority
              />
            </span>
            <div className="text-left">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
                Network Operations
              </p>
              <p className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-white">
                Butajira Polytechnic College
              </p>
            </div>
          </div>

          <div className="w-full">{children}</div>

          <p className="mt-6 text-center text-xs text-zinc-400 dark:text-zinc-600">
            <Link href="/" className="transition-colors hover:text-zinc-600 dark:hover:text-zinc-400">
              Network Asset &amp; Cable Infrastructure Management
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
