"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";
import { credentialsSchema, zodMessage } from "@/lib/validation";

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-700";

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
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16 font-sans dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 inline-flex h-3 w-3 rounded-full bg-green-500" />
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            Butajira Polytechnic College
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Network Asset & Cable Infrastructure Management
          </p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-white">
            Sign in
          </h2>

          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
              {error}
            </div>
          )}

          {passwordUpdated && (
            <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/50 dark:text-green-300">
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
              className="mt-1 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
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
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}