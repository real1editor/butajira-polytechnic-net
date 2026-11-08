"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  UserProfile,
  fetchProfiles,
  updateUserRole,
} from "@/lib/queries";
import { useAuth } from "@/app/contexts/AuthContext";
import { useToast } from "@/app/contexts/ToastContext";
import ProtectRole, { ReadOnlyNotice } from "@/app/components/ProtectRole";
import ErrorBanner from "@/app/components/ErrorBanner";
import { inputClass } from "@/lib/ui";
import { formatDateTime } from "@/lib/utils";

const ROLE_OPTIONS = ["admin", "technician", "viewer"] as const;

const ROLE_BADGE: Record<string, string> = {
  admin: "border border-cyan-400/30 bg-cyan-400/15 text-cyan-700 dark:text-cyan-300",
  technician:
    "border border-emerald-400/30 bg-emerald-400/15 text-emerald-700 dark:text-emerald-300",
  viewer:
    "border border-slate-400/30 bg-slate-400/10 text-slate-600 dark:text-slate-400",
};

export default function UsersAdminPage() {
  const { user } = useAuth();
  const { success, error: errorToast } = useToast();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetchProfiles().then((res) => {
      if (res.error) setError(res.error);
      else setProfiles(res.data ?? []);
      setLoading(false);
    });
  }, []);

  async function handleRoleChange(profileId: string, role: UserProfile["role"]) {
    setSavingId(profileId);
    setError(null);
    const err = await updateUserRole(profileId, role);
    setSavingId(null);
    if (err) {
      errorToast(err);
      return;
    }
    setProfiles((prev) =>
      prev.map((p) => (p.id === profileId ? { ...p, role } : p))
    );
    success("Role updated.");
  }

  return (
    <div className="flex flex-1 flex-col font-sans text-slate-900 dark:text-slate-100">
      <ProtectRole
        allowedRoles={["admin"]}
        fallback={
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
            <header className="mb-6 sm:mb-8">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                User Management
              </h1>
            </header>
            <ReadOnlyNotice message="Only administrators can manage user roles. If you need elevated access, contact an admin." />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              <Link href="/" className="font-medium underline-offset-2 hover:underline">
                Back to Dashboard
              </Link>
            </p>
          </main>
        }
      >
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
          <header className="mb-6 sm:mb-8">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              User Management
            </h1>
            <p className="mt-1 text-sm text-zinc-600 sm:text-base dark:text-zinc-400">
              Assign roles to user accounts. Changes take effect immediately.
            </p>
          </header>

          {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

          <section className="glass-card">
            <div className="border-b border-slate-200/60 px-4 py-4 sm:px-6 dark:border-white/10">
              <h2 className="text-lg font-medium">All Users</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {loading ? "Loading..." : `${profiles.length} account${profiles.length !== 1 ? "s" : ""}`}
              </p>
            </div>

            {loading ? (
              <div className="px-6 py-10 text-center text-sm text-zinc-500">
                Loading users...
              </div>
            ) : profiles.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-zinc-500">
                No user profiles found. Users appear here after their first sign-up.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[560px] divide-y divide-slate-200/60 text-sm dark:divide-white/10">
                  <thead className="bg-transparent">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-zinc-500 sm:px-6 dark:text-zinc-400">
                        Display Name
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-zinc-500 sm:px-6 dark:text-zinc-400">
                        Role
                      </th>
                      <th className="hidden px-4 py-3 text-left font-medium text-zinc-500 md:table-cell md:px-6 dark:text-zinc-400">
                        Created
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-zinc-500 sm:px-6 dark:text-zinc-400">
                        Change Role
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50 dark:divide-white/5">
                    {profiles.map((p) => {
                      const isSelf = p.id === user?.id;
                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-cyan-400/5 dark:hover:bg-cyan-400/5"
                        >
                          <td className="px-4 py-3 sm:px-6">
                            <span className="font-medium">
                              {p.display_name ?? "—"}
                            </span>
                            {isSelf && (
                              <span className="glass-chip ml-2 rounded px-1.5 py-0.5 text-xs font-medium">
                                You
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 sm:px-6">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ROLE_BADGE[p.role] ?? ROLE_BADGE.viewer}`}
                            >
                              {p.role}
                            </span>
                          </td>
                          <td className="hidden px-4 py-3 text-zinc-600 md:table-cell md:px-6 dark:text-zinc-400">
                            {formatDateTime(p.created_at)}
                          </td>
                          <td className="px-4 py-3 sm:px-6">
                            <div className="flex items-center justify-end gap-2">
                              <select
                                value={p.role}
                                disabled={savingId === p.id || isSelf}
                                title={
                                  isSelf
                                    ? "You cannot change your own role here"
                                    : undefined
                                }
                                onChange={(e) =>
                                  handleRoleChange(
                                    p.id,
                                    e.target.value as UserProfile["role"]
                                  )
                                }
                                className={`${inputClass} w-40`}
                              >
                                {ROLE_OPTIONS.map((r) => (
                                  <option key={r} value={r}>
                                    {r.charAt(0).toUpperCase() + r.slice(1)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="glass-card mt-6 p-4 text-sm text-slate-600 sm:p-5 dark:text-slate-400">
            <h3 className="mb-1 font-medium text-zinc-800 dark:text-zinc-200">
              Role Permissions
            </h3>
            <ul className="list-inside list-disc space-y-1">
              <li>
                <strong>Admin</strong> — full access to all features plus user role management
              </li>
              <li>
                <strong>Technician</strong> — add, edit assets, connections, and maintenance logs (no delete)
              </li>
              <li>
                <strong>Viewer</strong> — read-only access to dashboards and data
              </li>
            </ul>
          </div>
        </main>
      </ProtectRole>
    </div>
  );
}