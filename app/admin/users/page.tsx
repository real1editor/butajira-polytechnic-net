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

const ROLE_OPTIONS = ["admin", "technician", "viewer"] as const;

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-300",
  technician:
    "bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-300",
  viewer:
    "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

const inputClass =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-700";

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
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
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
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

          {error && (
            <div className="mb-6 flex items-center justify-between gap-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                aria-label="Dismiss error"
                className="shrink-0 rounded p-0.5 text-red-400 transition-colors hover:text-red-700"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}

          <section className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-200 px-4 py-4 sm:px-6 dark:border-zinc-800">
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
                <table className="min-w-[560px] divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/50">
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
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {profiles.map((p) => {
                      const isSelf = p.id === user?.id;
                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                        >
                          <td className="px-4 py-3 sm:px-6">
                            <span className="font-medium">
                              {p.display_name ?? "—"}
                            </span>
                            {isSelf && (
                              <span className="ml-2 rounded bg-zinc-200 px-1.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
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
                            {formatDate(p.created_at)}
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

          <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 sm:p-5 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
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