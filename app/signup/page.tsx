"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AuthShell from "@/app/components/AuthShell";
import { signupSchema, zodMessage } from "@/lib/validation";
import { toUserMessage } from "@/lib/errors";
import { inputClass } from "@/lib/ui";

export default function SignupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const parsed = signupSchema.safeParse({ display_name: displayName, email, password, confirm });
    if (!parsed.success) {
      setError(zodMessage(parsed.error));
      return;
    }

    setBusy(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { display_name: parsed.data.display_name },
      },
    });
    setBusy(false);

    if (signUpError) {
      setError(toUserMessage(signUpError));
      return;
    }

    // If no session is returned, email confirmation is enabled.
    if (data.session) {
      router.refresh();
      router.push("/");
    } else {
      setNeedsConfirmation(true);
    }
  }

  if (needsConfirmation) {
    return (
      <AuthShell>
        <div className="glass-card-strong p-8 text-center">
          <div className="mb-6 flex flex-col items-center">
            <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
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
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                />
              </svg>
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
              Check your email
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              We sent a confirmation link to{" "}
              <span className="font-medium">{email}</span>. Click it to activate
              your account, then sign in.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-block btn-primary"
          >
            Back to Sign In
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="glass-card-strong p-6 sm:p-8">
        <div className="mb-6">
          <p className="mb-1 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/15 px-2.5 py-0.5 text-[11px] font-medium text-cyan-700 dark:text-cyan-300">
            Request access
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            Create account
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            New accounts start with read-only access (viewer). Write access is
            granted by the IT administrator.
          </p>
        </div>

          {error && (
            <div className="mb-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 backdrop-blur-xl dark:border-rose-400/20 dark:text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Full Name
              <input
                type="text"
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Abera Bekele"
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Email
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@college.edu.et"
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Password
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Confirm Password
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat your password"
                className={inputClass}
              />
            </label>

            <button
              type="submit"
              disabled={busy}
              className="btn-primary mt-1 w-full"
            >
              {busy ? "Creating account..." : "Create Account"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-200"
          >
            Sign in
          </Link>
        </p>
    </AuthShell>
  );
}