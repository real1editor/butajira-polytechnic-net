"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";
import AuthShell from "@/app/components/AuthShell";
import { credentialsSchema, zodMessage } from "@/lib/validation";
import { inputClass } from "@/lib/ui";

const safeRedirect = (param: string | null) =>
  param?.startsWith("/") && !param.startsWith("//") ? param : "/";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const passwordUpdated = searchParams.get("updated") === "1";

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(zodMessage(parsed.error));
      setBusy(false);
      return;
    }
    const err = await signIn(parsed.data.email, parsed.data.password);
    if (err) {
      setError(err);
      setBusy(false);
      return;
    }
    router.replace(safeRedirect(searchParams.get("next")));
  }

  return (
    <AuthShell>
      <div className="glass-card-strong p-6 sm:p-8">
        <div className="mb-6">
          <p className="mb-1 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/15 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
            <span className="live-dot inline-flex h-1.5 w-1.5 rounded-full text-emerald-500" />
            Secure console
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            Welcome back
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Sign in to access the network operations dashboard.
          </p>
        </div>

          {error && (
            <div className="mb-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 backdrop-blur-xl dark:border-rose-400/20 dark:text-rose-300">
              {error}
            </div>
          )}

          {passwordUpdated && (
            <div className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 backdrop-blur-xl dark:border-emerald-400/20 dark:text-emerald-300">
              Password updated successfully. Sign in with your new password.
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
              />
            </label>

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="btn-primary mt-1 w-full"
            >
              {busy ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Need an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-200"
          >
            Create one
          </Link>
        </p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}