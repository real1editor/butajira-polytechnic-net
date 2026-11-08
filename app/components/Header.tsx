"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";
import { useTheme } from "@/app/contexts/ThemeContext";
import ProtectRole from "@/app/components/ProtectRole";
import Image from "next/image";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/insights", label: "Insights" },
  { href: "/topology", label: "Topology" },
  { href: "/connections", label: "Connections" },
  { href: "/maintenance", label: "Maintenance" },
];

const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle color theme"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="theme-menu"
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-white/60 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
      >
        <svg
          className="h-4 w-4 dark:hidden"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
        <svg
          className="hidden h-4 w-4 dark:block"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div
            id="theme-menu"
            role="menu"
            aria-label="Color theme"
            className="glass-card-strong absolute right-0 z-50 mt-2 w-36 overflow-hidden py-1"
          >
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={theme === option.value}
                onClick={() => {
                  setTheme(option.value);
                  setOpen(false);
                }}
                className={`block w-full px-4 py-2 text-left text-sm transition-colors ${
                  theme === option.value
                    ? "bg-cyan-400/15 font-medium text-cyan-700 dark:text-cyan-300"
                    : "text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function UserMenu() {
  const { user, profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!user) {
    return (
      <Link
        href="/login"
        className="btn-primary px-3.5 py-1.5"
      >
        Sign In
      </Link>
    );
  }

  const displayName = profile?.display_name ?? user.email ?? "User";
  const roleLabel = profile ? ` · ${profile.role}` : "";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="user-menu"
        aria-label={`Account menu for ${displayName}`}
        className="flex max-w-[10rem] items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-white/60 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
      >
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-300 to-cyan-400 text-xs font-semibold text-slate-950 shadow-sm">
          {displayName.charAt(0).toUpperCase()}
        </span>
        <span className="hidden truncate sm:block">
          {displayName}
          {roleLabel}
        </span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            id="user-menu"
            role="menu"
            aria-label="Account"
            className="glass-card-strong absolute right-0 z-50 mt-2 w-48 overflow-hidden py-1"
          >
            <div className="border-b border-slate-200/60 px-4 py-2 dark:border-white/10">
              <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                {displayName}
              </p>
              <p className="truncate text-xs capitalize text-zinc-500 dark:text-zinc-400">
                {profile?.role ?? "user"}
              </p>
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                signOut();
              }}
              className="block w-full px-4 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, loading } = useAuth();
  const isAuthed = !!user;

  // Close the mobile drawer with the Escape key.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <header className="glass-bar sticky top-0 z-30">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/company-logo.png"
            alt="Company logo"
            width={32}
            height={32}
            className="h-8 w-8 rounded-lg object-contain ring-1 ring-cyan-400/20"
            priority
          />
          <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
            BPC Network Management
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {isAuthed && (
            <nav className="hidden items-center gap-1 md:flex">
              {LINKS.map((link) => {
                const active =
                  pathname === link.href ||
                  (link.href !== "/" && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-cyan-400/15 text-cyan-700 ring-1 ring-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-300 dark:ring-cyan-400/30"
                        : "text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <ProtectRole allowedRoles={["admin"]}>
                <Link
                  href="/admin/users"
                  aria-current={
                    pathname.startsWith("/admin/users") ? "page" : undefined
                  }
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    pathname.startsWith("/admin/users")
                      ? "bg-cyan-400/15 text-cyan-700 ring-1 ring-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-300 dark:ring-cyan-400/30"
                      : "text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
                  }`}
                >
                  Users
                </Link>
                <Link
                  href="/admin/audit"
                  aria-current={
                    pathname.startsWith("/admin/audit") ? "page" : undefined
                  }
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    pathname.startsWith("/admin/audit")
                      ? "bg-cyan-400/15 text-cyan-700 ring-1 ring-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-300 dark:ring-cyan-400/30"
                      : "text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
                  }`}
                >
                  Audit
                </Link>
              </ProtectRole>
            </nav>
          )}

          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("bpc:open-command"))}
            aria-label="Open command palette"
            aria-keyshortcuts="Control+K Meta+K"
            className="glass-chip flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors hover:border-cyan-400/40 hover:text-cyan-700 dark:hover:text-cyan-300"
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
                d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
              />
            </svg>
            <span className="hidden lg:inline">Search</span>
            
          </button>

          <ThemeToggle />
          {!loading && <UserMenu />}

          {isAuthed && (
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-white/60 hover:text-slate-900 md:hidden dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
            >
              {mobileOpen ? (
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
              ) : (
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
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {isAuthed && mobileOpen && (
        <nav
          id="mobile-nav"
          aria-label="Mobile navigation"
          className="border-t border-slate-200/60 md:hidden dark:border-white/10"
        >
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-2 sm:px-6">
            {LINKS.map((link) => {
              const active =
                pathname === link.href ||
                (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-cyan-400/15 text-cyan-700 ring-1 ring-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-300 dark:ring-cyan-400/30"
                      : "text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <ProtectRole allowedRoles={["admin"]}>
              <Link
                href="/admin/users"
                onClick={() => setMobileOpen(false)}
                aria-current={
                  pathname.startsWith("/admin/users") ? "page" : undefined
                }
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  pathname.startsWith("/admin/users")
                    ? "bg-cyan-400/15 text-cyan-700 ring-1 ring-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-300 dark:ring-cyan-400/30"
                    : "text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
                }`}
              >
                Users
              </Link>
              <Link
                href="/admin/audit"
                onClick={() => setMobileOpen(false)}
                aria-current={
                  pathname.startsWith("/admin/audit") ? "page" : undefined
                }
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  pathname.startsWith("/admin/audit")
                    ? "bg-cyan-400/15 text-cyan-700 ring-1 ring-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-300 dark:ring-cyan-400/30"
                    : "text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
                }`}
              >
                Audit
              </Link>
            </ProtectRole>
          </div>
        </nav>
      )}
    </header>
  );
}