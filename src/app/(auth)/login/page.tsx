"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { api, setSession, User } from "@/lib/api";
import Button from "@/components/ui/Button";
import { Field, PasswordField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import { flash } from "@/components/FlashToast";

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}

const EMPTY = { name: "", email: "", password: "" };

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const rawNext = params.get("next") ?? "/";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/"; // no open redirects
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  // Switching between sign in and sign up starts from a blank form; nothing typed carries over.
  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setForm(EMPTY);
    setError(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = mode === "login" ? { email: form.email, password: form.password } : form;
      const res = await api<{ token: string; user: User }>(`/api/auth/${mode}`, { method: "POST", body: JSON.stringify(body) });
      setSession(res);
      const first = res.user.name.split(" ")[0];
      flash(mode === "login" ? `Signed in. Welcome back, ${first}!` : `Account created. Welcome to Seatlock, ${first}!`);
      // Next keeps visited pages alive (hidden) during client navigation, so wipe the credentials now,
      // or they'd still be in the form when someone opens sign-in after signing out.
      setForm(EMPTY);
      setMode("login");
      // Organizers, staff and the super admin start on their dashboard unless a page asked for them to come back.
      router.push(next === "/" && res.user.role !== "USER" ? "/admin" : next);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div>
        <p className="eyebrow">{mode === "login" ? "Welcome back" : "Join Seatlock"}</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">{mode === "login" ? "Sign in" : "Create an account"}</h1>
        <p className="mt-1 text-sm text-muted">
          {mode === "login" ? "New here? " : "Already have an account? "}
          <button type="button" onClick={switchMode} className="font-medium text-accent-fg underline-offset-4 hover:underline">
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </p>

        {mode === "register" && (
          <p className="mt-3 rounded-md bg-sunken px-3 py-2 text-xs text-muted">
            This creates a customer account for booking tickets. Hosting events? <Link href="/organizer/signup" className="font-medium text-accent-fg underline-offset-4 hover:underline">Create an organizer account</Link>.
          </p>
        )}
        {/* key={mode}: fresh inputs per mode, so browser-filled values don't follow you across */}
        <form key={mode} onSubmit={submit} className="mt-6 space-y-4">
          {error && <Alert>{error}</Alert>}
          {mode === "register" && <Field label="Name" required autoComplete="name" value={form.name} onChange={set("name")} />}
          <Field label="Email" type="email" required autoComplete="email" value={form.email} onChange={set("email")} />
          <PasswordField
            label="Password" required minLength={mode === "register" ? 8 : undefined}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            hint={mode === "register" ? "At least 8 characters." : undefined}
            value={form.password} onChange={set("password")}
          />
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>
      </div>
      <p className="mt-8 text-center text-sm text-muted">
        Hosting events? <Link href="/organizer/signup" className="font-medium text-accent-fg underline-offset-4 hover:underline">Create an organizer account</Link>
      </p>
    </div>
  );
}
