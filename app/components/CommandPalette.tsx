"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { fetchAssets, type Asset, TYPE_LABELS } from "@/lib/queries";
import { useAuth, usePermissions } from "@/app/contexts/AuthContext";
import { useTheme } from "@/app/contexts/ThemeContext";

const GLYPHS = {
  dashboard: "M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z",
  connections:
    "M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244",
  maintenance:
    "M14.7 6.3a4 4 0 00-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 005.4-5.4l-2.4 2.4-2.4-.6-.6-2.4 2.4-2.4z",
  users:
    "M17 20h5v-1a4 4 0 00-5-3.87M9 20H4v-1a4 4 0 015-3.87M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM8 10a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z",
  audit:
    "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  server:
    "M5 3h14a2 2 0 012 2v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zm0 9h14a2 2 0 012 2v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3a2 2 0 012-2z",
  sun:
    "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
  moon:
    "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z",
  monitor: "M3 4h18v12H3V4zm6 16h6m-3-4v4",
  signout:
    "M15 12H3m0 0l4-4m-4 4l4 4m6-11h4a2 2 0 012 2v10a2 2 0 01-2 2h-4",
  search: "M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z",
  arrow: "M9 5l7 7-7 7",
} as const;

type GlyphName = keyof typeof GLYPHS;

type Command = {
  id: string;
  label: string;
  hint?: string;
  group: string;
  glyph: GlyphName;
  keywords?: string;
  run: () => void;
};

const GROUP_ORDER = ["Pages", "Admin", "Actions", "Assets"];

function Glyph({ name, className = "h-4 w-4" }: { name: GlyphName; className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={GLYPHS[name]} />
    </svg>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
      {children}
    </kbd>
  );
}

export default function CommandPalette() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { isAdmin } = usePermissions();
  const { setTheme } = useTheme();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const openPalette = useCallback(() => {
    setQuery("");
    setActive(0);
    setOpen(true);
  }, []);

  const closePalette = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (open) {
          closePalette();
        } else {
          openPalette();
        }
      }
    };
    const onOpen = () => openPalette();
    window.addEventListener("keydown", onKey);
    window.addEventListener("bpc:open-command", onOpen as EventListener);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("bpc:open-command", onOpen as EventListener);
    };
  }, [closePalette, open, openPalette]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !user || assetsLoaded) return;
    let current = true;
    fetchAssets().then((result) => {
      if (!current) return;
      if (!result.error) {
        setAssets(result.data ?? []);
        setAssetsLoaded(true);
      }
    });
    return () => {
      current = false;
    };
  }, [open, user, assetsLoaded]);

  const commands = useMemo<Command[]>(() => {
    const close = () => setOpen(false);
    const goto = (href: string) => {
      close();
      router.push(href);
    };

    const base: Command[] = [
      {
        id: "page-dashboard",
        label: "Dashboard",
        hint: "Assets & overview",
        group: "Pages",
        glyph: "dashboard",
        keywords: "home assets stats",
        run: () => goto("/"),
      },
      {
        id: "page-connections",
        label: "Connections",
        hint: "Ports & patch cables",
        group: "Pages",
        glyph: "connections",
        keywords: "ports cables patch",
        run: () => goto("/connections"),
      },
      {
        id: "page-maintenance",
        label: "Maintenance",
        hint: "Work logs",
        group: "Pages",
        glyph: "maintenance",
        keywords: "logs repairs preventive corrective",
        run: () => goto("/maintenance"),
      },
    ];

    if (isAdmin) {
      base.push(
        {
          id: "admin-users",
          label: "Users & roles",
          hint: "Admin",
          group: "Admin",
          glyph: "users",
          keywords: "profiles permissions rbac",
          run: () => goto("/admin/users"),
        },
        {
          id: "admin-audit",
          label: "Audit log",
          hint: "Admin",
          group: "Admin",
          glyph: "audit",
          keywords: "history changes mutations",
          run: () => goto("/admin/audit"),
        }
      );
    }

    base.push(
      {
        id: "theme-light",
        label: "Theme: Light",
        group: "Actions",
        glyph: "sun",
        keywords: "appearance color",
        run: () => {
          setTheme("light");
          close();
        },
      },
      {
        id: "theme-dark",
        label: "Theme: Dark",
        group: "Actions",
        glyph: "moon",
        keywords: "appearance color",
        run: () => {
          setTheme("dark");
          close();
        },
      },
      {
        id: "theme-system",
        label: "Theme: System",
        group: "Actions",
        glyph: "monitor",
        keywords: "appearance color auto",
        run: () => {
          setTheme("system");
          close();
        },
      }
    );

    if (user) {
      base.push({
        id: "sign-out",
        label: "Sign out",
        hint: "End this session",
        group: "Actions",
        glyph: "signout",
        keywords: "logout exit",
        run: () => {
          close();
          void signOut();
        },
      });
    }

    const assetCommands: Command[] = assets.map((asset) => ({
      id: `asset-${asset.id}`,
      label: asset.name,
      hint: [TYPE_LABELS[asset.type], asset.asset_tag, asset.ip_address]
        .filter(Boolean)
        .join(" · "),
      group: "Assets",
      glyph: "server",
      keywords: [asset.location, asset.ip_address, asset.asset_tag, asset.status]
        .filter(Boolean)
        .join(" "),
      run: () => goto(`/?q=${encodeURIComponent(asset.name)}`),
    }));

    return [...base, ...assetCommands];
  }, [assets, isAdmin, router, setTheme, signOut, user]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q
      ? commands
      : commands.filter((command) => command.group !== "Assets");
    const matched = q
      ? pool.filter((command) =>
          `${command.label} ${command.group} ${command.keywords ?? ""}`
            .toLowerCase()
            .includes(q)
        )
      : pool;

    return [...matched].sort(
      (a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group)
    );
  }, [commands, query]);

  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${active}"]`
    );
    node?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const grouped = useMemo(() => {
    const map = new Map<string, { command: Command; index: number }[]>();
    filtered.forEach((command, index) => {
      const list = map.get(command.group) ?? [];
      list.push({ command, index });
      map.set(command.group, list);
    });
    return [...map.entries()];
  }, [filtered]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((prev) => (filtered.length ? (prev + 1) % filtered.length : 0));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((prev) =>
        filtered.length ? (prev - 1 + filtered.length) % filtered.length : 0
      );
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      filtered[active]?.run();
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-zinc-950/50 p-4 pt-[12vh] backdrop-blur-sm animate-backdrop-in"
      onClick={() => setOpen(false)}
      role="presentation"
    >
      <div
        className="animate-palette-in w-full max-w-xl overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl ring-1 ring-black/5 dark:border-zinc-700 dark:bg-zinc-900"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
          <span className="text-zinc-400 dark:text-zinc-500">
            <Glyph name="search" className="h-5 w-5" />
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, assets or actions…"
            className="min-w-0 flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            aria-label="Search commands"
            autoComplete="off"
            spellCheck={false}
          />
          <Kbd>Esc</Kbd>
        </div>

        <div ref={listRef} className="cmd-scroll max-h-[52vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-zinc-500">
              No results for “{query}”.
            </p>
          ) : (
            grouped.map(([group, items]) => (
              <div key={group} className="mb-1">
                <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
                  {group}
                </p>
                {items.map(({ command, index }) => {
                  const isActive = index === active;
                  return (
                    <button
                      key={command.id}
                      type="button"
                      data-index={index}
                      onMouseMove={() => setActive(index)}
                      onClick={() => command.run()}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                        isActive
                          ? "bg-zinc-100 dark:bg-zinc-800"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                      }`}
                    >
                      <span
                        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${
                          isActive
                            ? "border-zinc-300 bg-white text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                            : "border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400"
                        }`}
                      >
                        <Glyph name={command.glyph} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
                          {command.label}
                        </span>
                        {command.hint && (
                          <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                            {command.hint}
                          </span>
                        )}
                      </span>
                      {isActive && (
                        <span className="text-zinc-400 dark:text-zinc-500">
                          <Glyph name="arrow" className="h-4 w-4" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-zinc-200 px-4 py-2.5 text-[11px] text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
          <span className="inline-flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            to navigate
            <Kbd>↵</Kbd>
            to select
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span className="live-dot inline-flex h-1.5 w-1.5 rounded-full text-emerald-500" />
            BPC Command
          </span>
        </div>
      </div>
    </div>
  );
}
