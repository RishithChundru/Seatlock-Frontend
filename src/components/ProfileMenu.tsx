"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { api, signOut, User, useSession } from "@/lib/api";
import { initialsOf } from "./HostCard";
import Button from "./ui/Button";
import { PasswordField } from "./ui/Field";
import { Alert } from "./ui/Feedback";
import { CheckIcon, LogoutIcon, UserIcon, XIcon } from "./ui/Icons";

export const roleName = (u: User) =>
  u.role === "ADMIN" ? "Super admin" : u.role === "STAFF" ? "Gate staff" : u.role === "ORGANIZER" ? "Organizer" : "Customer";

/** Sign out and start again from the sign-in page. */
export function useSignOut() {
  const router = useRouter();
  return async () => { await signOut(); router.replace("/login"); };
}

/**
 * Avatar button with a small menu (account settings, sign out). Account settings open in a modal,
 * so no role needs an Account page in its navigation. "sidebar" opens upwards from the bottom of the navy sidebar.
 */
export default function ProfileMenu({ variant, compact = false }: { variant: "topbar" | "sidebar"; compact?: boolean }) {
  const session = useSession();
  const leave = useSignOut();
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);
  if (!session) return null;
  const { user } = session;
  const side = variant === "sidebar";
  const item = "flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm text-muted hover:bg-sunken hover:text-fg";

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu" aria-label="Account menu"
        className={side
          ? `flex w-full items-center gap-3 rounded-[var(--radius-md)] p-2 text-left transition-colors hover:bg-[var(--sidebar-hover)] ${compact ? "justify-center" : ""} ${open ? "bg-[var(--sidebar-hover)]" : ""}`
          : "flex items-center gap-2 rounded-full p-0.5 ring-1 ring-[var(--sl-border)] transition hover:ring-[var(--sl-border-strong)] sm:pr-3"}>
        <span aria-hidden className={`grid shrink-0 place-items-center rounded-full font-bold ${side ? "h-9 w-9 bg-[var(--marigold-400)] text-sm text-[#111827]" : "h-8 w-8 bg-[var(--sl-action)] text-xs text-[var(--sl-on-action)]"}`}>
          {initialsOf(user.name)}
        </span>
        {side ? !compact && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-[var(--sidebar-fg)]">{user.name}</span>
            <span className="block truncate text-xs text-[var(--sidebar-muted)]">{user.email}</span>
          </span>
        ) : <span className="hidden max-w-32 truncate text-sm font-medium sm:inline">{user.name.split(" ")[0]}</span>}
      </button>

      {open && (
        <div role="menu" className={`absolute z-50 w-64 rounded-[var(--radius-lg)] border border-line bg-surface p-1.5 text-fg shadow-[var(--sl-shadow-lg)] ${
          side ? `bottom-full mb-2 ${compact ? "left-0" : "left-0 right-0 w-auto"}` : "right-0 mt-2"}`}>
          <div className="flex items-center gap-3 px-3 py-2.5">
            <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sunken text-sm font-bold text-accent-fg">{initialsOf(user.name)}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-subtle">{user.email}</p>
            </div>
          </div>
          <div className="my-1 border-t border-line" />
          <button role="menuitem" type="button" className={item} onClick={() => { setOpen(false); setSettings(true); }}>
            <UserIcon width={16} height={16} />Account settings
          </button>
          <button role="menuitem" type="button" className={item} onClick={() => { setOpen(false); leave(); }}>
            <LogoutIcon width={16} height={16} />Sign out
          </button>
        </div>
      )}
      {settings && <AccountDialog onClose={() => setSettings(false)} />}
    </div>
  );
}

function AccountDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="account-h"
      onClick={(e) => { if (e.target === ref.current) ref.current.close(); }} // click on the backdrop
      className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-[var(--radius-lg)] border border-line bg-surface p-0 text-fg shadow-[var(--sl-shadow-lg)] backdrop:bg-[var(--sl-overlay)]">
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <h2 id="account-h" className="font-display text-lg font-semibold">Account settings</h2>
        <button type="button" onClick={() => ref.current?.close()} aria-label="Close"
          className="grid h-8 w-8 place-items-center rounded-[var(--radius-sm)] text-muted hover:bg-sunken hover:text-fg">
          <XIcon width={18} height={18} />
        </button>
      </div>
      <div className="max-h-[75dvh] overflow-y-auto px-6 py-5"><AccountSettings /></div>
    </dialog>
  );
}

const EMPTY = { current: "", next: "", confirm: "" };

/** Profile details and change password; shown in the modal and on /account. */
export function AccountSettings() {
  const session = useSession();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!session) return null;
  const { user } = session;
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
    <div className="space-y-6">
      <section aria-label="Profile" className="flex items-center gap-4 rounded-[var(--radius-md)] bg-sunken p-4">
        <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--sl-action)] font-bold text-[var(--sl-on-action)]">{initialsOf(user.name)}</span>
        <div className="min-w-0">
          <p className="truncate font-semibold">{user.name}</p>
          <p className="truncate text-sm text-muted">{user.email}</p>
          <p className="mt-1 inline-block rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-accent-fg ring-1 ring-[var(--sl-border)]">{roleName(user)}</p>
        </div>
      </section>

      <section aria-labelledby="pw-h">
        <h3 id="pw-h" className="font-semibold">Change password</h3>
        <form onSubmit={submit} className="mt-4 space-y-4">
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
