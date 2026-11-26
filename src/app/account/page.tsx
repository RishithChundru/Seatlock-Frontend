"use client";

import { FormEvent, useState } from "react";
import { api, setSession, useSession } from "@/lib/api";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { PasswordField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import { CheckIcon } from "@/components/ui/Icons";

const EMPTY = { current: "", next: "", confirm: "" };

export default function AccountPage() {
  const session = useSession();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!session) {
    return (
      <div className="mx-auto max-w-sm pt-24 text-center">
        <p className="text-muted">Sign in to manage your account.</p>
        <Button href="/login?next=/account" className="mt-5">Sign in</Button>
      </div>
    );
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => { setForm({ ...form, [k]: e.target.value }); setSaved(false); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.next !== form.confirm) { setError("The new passwords don't match."); return; }
    setBusy(true);
    try {
      await api("/api/account/password", { method: "POST", body: JSON.stringify({ currentPassword: form.current, newPassword: form.next }) });
      setForm(EMPTY);
      setSaved(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const { user } = session;
  return (
    <div className="mx-auto max-w-2xl pt-12">
      <p className="eyebrow">Account</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">{user.name}</h1>

      <section aria-labelledby="profile-h" className="mt-8 rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)]">
        <h2 id="profile-h" className="font-display text-xl font-semibold">Profile</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-[120px_1fr]">
          <dt className="text-muted">Name</dt><dd>{user.name}</dd>
          <dt className="text-muted">Email</dt><dd>{user.email}</dd>
          <dt className="text-muted">Role</dt><dd>{user.role === "ADMIN" ? <Badge tone="accent">Admin</Badge> : "Customer"}</dd>
        </dl>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button href="/bookings" variant="secondary">Your tickets</Button>
          <Button variant="ghost" onClick={() => setSession(null)}>Sign out</Button>
        </div>
      </section>

      <section aria-labelledby="pw-h" className="mt-6 rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)]">
        <h2 id="pw-h" className="font-display text-xl font-semibold">Change password</h2>
        <form onSubmit={submit} className="mt-5 max-w-sm space-y-4">
          {error && <Alert>{error}</Alert>}
          {saved && (
            <p role="status" className="flex items-center gap-2 rounded-md bg-success-subtle px-3.5 py-3 text-sm text-success">
              <CheckIcon /> Password updated.
            </p>
          )}
          <PasswordField label="Current password" required autoComplete="current-password" value={form.current} onChange={set("current")} />
          <PasswordField label="New password" required minLength={8} autoComplete="new-password" hint="At least 8 characters." value={form.next} onChange={set("next")} />
          <PasswordField label="Confirm new password" required minLength={8} autoComplete="new-password" value={form.confirm} onChange={set("confirm")} />
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Update password"}</Button>
        </form>
      </section>
    </div>
  );
}
