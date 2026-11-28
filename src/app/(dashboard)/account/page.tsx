"use client";

import { FormEvent, useRef, useState } from "react";
import { api, setSession, User, useSession } from "@/lib/api";
import OrganizationSettings from "@/components/OrganizationSettings";
import { Avatar, roleName, useSignOut } from "@/components/ProfileMenu";
import Button from "@/components/ui/Button";
import { PasswordField } from "@/components/ui/Field";
import { Alert, Toast } from "@/components/ui/Feedback";
import { CheckIcon, LogoutIcon, UploadIcon } from "@/components/ui/Icons";

const PHOTO_TYPES = "image/jpeg,image/png,image/webp";
const EMPTY = { current: "", next: "", confirm: "" };

/** Account settings for every role: profile photo, organizer profile (organizers), password, sign out. */
export default function AccountPage() {
  const session = useSession();
  const leave = useSignOut();
  if (!session) return null; // the route guard sends visitors to sign in
  const { user } = session;
  const sections = [["profile", "Profile"], ...(user.role === "ORGANIZER" ? [["organization", "Organization"]] : []), ["security", "Password"]];

  return (
    <div className="mx-auto max-w-4xl">
      <p className="eyebrow">Account</p>
      <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Account settings</h1>
      <div className="mt-6 grid gap-6 md:grid-cols-[200px_1fr]">
        <nav aria-label="Settings sections" className="flex gap-1 overflow-x-auto md:sticky md:top-20 md:flex-col md:self-start">
          {sections.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="shrink-0 rounded-[var(--radius-md)] px-3 py-2 text-sm text-muted hover:bg-sunken hover:text-fg">{label}</a>
          ))}
          <button type="button" onClick={leave} className="flex shrink-0 items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-left text-sm text-danger hover:bg-danger-subtle">
            <LogoutIcon width={16} height={16} /> Sign out
          </button>
        </nav>
        <div className="min-w-0 space-y-6">
          <Section id="profile" title="Profile" hint="Your photo shows in the menu and on your account."><Profile user={user} /></Section>
          {user.role === "ORGANIZER" && (
            <Section id="organization" title="Organization" hint="Your application status and public profile."><OrganizationSettings /></Section>
          )}
          <Section id="security" title="Password" hint="Changing it signs you out on your other devices."><PasswordForm /></Section>
        </div>
      </div>
    </div>
  );
}

function Section({ id, title, hint, children }: { id: string; title: string; hint: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-24 rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)]">
      <header className="border-b border-line px-6 py-4">
        <h2 id={`${id}-h`} className="font-display text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted">{hint}</p>
      </header>
      <div className="p-6">{children}</div>
    </section>
  );
}

function Profile({ user }: { user: User }) {
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const save = async (file: File | undefined) => {
    if (!file) return;
    if (!PHOTO_TYPES.split(",").includes(file.type)) { setToast("Use a JPEG, PNG or WebP image."); return; }
    if (file.size > 1024 * 1024) { setToast("That photo is over 1 MB. Try a smaller one."); return; }
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      setSession({ user: await api<User>("/api/account/avatar", { method: "POST", body }) });
      setToast("Photo updated.");
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    setBusy(true);
    try { setSession({ user: await api<User>("/api/account/avatar", { method: "DELETE" }) }); setToast("Photo removed."); }
    catch (e) { setToast((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
      <div className="flex items-center gap-4">
        <Avatar user={user} className="h-20 w-20 text-2xl" />
        <div className="flex flex-col gap-2">
          <Button size="sm" variant="secondary" onClick={() => input.current?.click()} disabled={busy}>
            <UploadIcon /> {busy ? "Saving…" : user.avatarUrl ? "Change photo" : "Upload photo"}
          </Button>
          {user.avatarUrl && <Button size="sm" variant="ghost" onClick={remove} disabled={busy}>Remove</Button>}
          <input ref={input} type="file" accept={PHOTO_TYPES} className="sr-only" aria-label="Choose a profile photo"
            onChange={(e) => { save(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
      </div>
      <dl className="grid flex-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-[90px_1fr]">
        <dt className="text-muted">Name</dt><dd className="font-medium">{user.name}</dd>
        <dt className="text-muted">Email</dt><dd className="break-all">{user.email}</dd>
        <dt className="text-muted">Role</dt><dd><span className="rounded-full bg-sunken px-2 py-0.5 text-xs font-medium text-accent-fg">{roleName(user)}</span></dd>
      </dl>
      <p className="text-xs text-subtle sm:hidden">JPEG, PNG or WebP, up to 1 MB.</p>
      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function PasswordForm() {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
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

  return (
    <form onSubmit={submit} className="max-w-sm space-y-4">
      {error && <Alert>{error}</Alert>}
      {saved && <p role="status" className="flex items-center gap-2 rounded-md bg-success-subtle px-3.5 py-3 text-sm text-success"><CheckIcon /> Password updated.</p>}
      <PasswordField label="Current password" required autoComplete="current-password" value={form.current} onChange={set("current")} />
      <PasswordField label="New password" required minLength={8} autoComplete="new-password" hint="At least 8 characters." value={form.next} onChange={set("next")} />
      <PasswordField label="Confirm new password" required minLength={8} autoComplete="new-password" value={form.confirm} onChange={set("confirm")} />
      <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Update password"}</Button>
    </form>
  );
}
