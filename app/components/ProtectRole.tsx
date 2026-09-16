"use client";

import type { ReactNode } from "react";
import { useAuth, type UserRole } from "@/app/contexts/AuthContext";

/** Lower = fewer privileges. Used by hasMinRole(). */
export const ROLE_ORDER: Record<UserRole, number> = {
  viewer: 0,
  technician: 1,
  admin: 2,
};

/** True when `role` has at least the rank of `minimum`. */
export function hasMinRole(role: UserRole, minimum: UserRole): boolean {
  return ROLE_ORDER[role] >= ROLE_ORDER[minimum];
}

/**
 * Renders `children` only when the current user's role is in `allowedRoles`.
 * Otherwise renders `fallback` (defaults to nothing).
 *
 * The context role defaults to the fail-closed 'viewer' while the profile is
 * loading, so mutation sections never flash before the real role resolves.
 */
export default function ProtectRole({
  allowedRoles,
  fallback = null,
  children,
}: {
  allowedRoles: UserRole[];
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { role } = useAuth();
  if (!allowedRoles.includes(role)) return <>{fallback}</>;
  return <>{children}</>;
}

/** Visible permission-warning state for roles that cannot mutate data. */
export function ReadOnlyNotice({
  message = "You are viewing this section in read-only mode. Contact an administrator to add, edit, or delete records.",
}: {
  message?: string;
}) {
  return (
    <div
      role="status"
      className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
    >
      <svg
        className="mt-0.5 h-5 w-5 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
      <div>
        <p className="font-medium">Read-only access</p>
        <p className="mt-0.5">{message}</p>
      </div>
    </div>
  );
}