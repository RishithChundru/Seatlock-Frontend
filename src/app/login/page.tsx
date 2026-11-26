"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { api, setSession, User } from "@/lib/api";
import ErrorBox from "@/components/ErrorBox";

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

  const field = (key: keyof typeof form, label: string, type: string, autoComplete: string) => (
    <label className="block">
      <span className="text-sm text-white/60">{label}</span>
      <input
        type={type}
        required
        minLength={key === "password" && mode === "register" ? 8 : undefined}
        autoComplete={autoComplete}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition placeholder:text-white/30 focus:border-violet-400 focus:bg-white/[0.07]"
      />
    </label>
  );

  return (
    <div className="mx-auto max-w-md pt-16">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-violet-950/40">
        <h1 className="font-display text-3xl font-bold">{mode === "login" ? "Welcome back" : "Create account"}</h1>
        <p className="mt-1 text-white/50">{mode === "login" ? "Sign in to lock in your seats." : "It takes ten seconds."}</p>

        <div className="mt-6 grid grid-cols-2 rounded-xl bg-white/5 p-1 text-sm">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(null); }}
              className={`rounded-lg py-2 transition ${mode === m ? "bg-white text-black" : "text-white/60 hover:text-white"}`}
            >
              {m === "login" ? "Sign in" : "Register"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {error && <ErrorBox message={error} />}
          {mode === "register" && field("name", "Name", "text", "name")}
          {field("email", "Email", "email", "email")}
          {field("password", "Password", "password", mode === "login" ? "current-password" : "new-password")}
          <button
            disabled={busy}
            className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3 font-semibold transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        {mode === "login" && (
          <button
            type="button"
            onClick={() => setForm({ name: "", email: "demo@seatlock.dev", password: "Demo@12345" })}
            className="mt-4 w-full rounded-xl border border-dashed border-white/15 py-2.5 text-sm text-white/60 transition hover:border-white/30 hover:text-white"
          >
            Use demo account
          </button>
        )}
      </div>
    </div>
  );
}
