"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { api, setSession, User } from "@/lib/api";
import Button from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const rawNext = params.get("next") ?? "/";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/"; // no open redirects
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = mode === "login" ? { email: form.email, password: form.password } : form;
      const res = await api<{ token: string; user: User }>(`/api/auth/${mode}`, { method: "POST", body: JSON.stringify(body) });
      setSession(res);
      router.push(next);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-4xl gap-10 pt-12 sm:pt-20 md:grid-cols-[1fr_380px] md:items-center">
      <div className="hidden md:block">
        <p className="eyebrow">Seatlock</p>
        <p className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight">
          The seat you tap is the seat you get.
        </p>
        <ul className="mt-6 space-y-3 text-muted">
          <li>Seats are held for 5 minutes while you check out.</li>
          <li>Two people can never book the same seat.</li>
          <li>Tickets arrive by email within seconds.</li>
        </ul>
      </div>

      <div className="rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-7 shadow-md">
        <h1 className="font-display text-2xl font-semibold">{mode === "login" ? "Sign in" : "Create an account"}</h1>
        <p className="mt-1 text-sm text-muted">
          {mode === "login" ? "New here? " : "Already have an account? "}
          <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }} className="font-medium text-accent-fg underline-offset-4 hover:underline">
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {error && <Alert>{error}</Alert>}
          {mode === "register" && <Field label="Name" required autoComplete="name" value={form.name} onChange={set("name")} />}
          <Field label="Email" type="email" required autoComplete="email" value={form.email} onChange={set("email")} />
          <Field
            label="Password" type="password" required minLength={mode === "register" ? 8 : undefined}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            hint={mode === "register" ? "At least 8 characters." : undefined}
            value={form.password} onChange={set("password")}
          />
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>

        {mode === "login" && (
          <div className="mt-5 border-t border-line pt-5">
            <Button variant="secondary" className="w-full" onClick={() => setForm({ name: "", email: "demo@seatlock.dev", password: "Demo@12345" })}>
              Fill in demo account
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
