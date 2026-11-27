"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { api, setSession, User, useSession } from "@/lib/api";
import Button from "@/components/ui/Button";
import { Field, PasswordField } from "@/components/ui/Field";
import { Alert, Skeleton } from "@/components/ui/Feedback";

type Invite = { name: string; email: string; organizerName: string };

/** Public: create a gate staff account from an organizer's emailed invite (the invited email only). */
export default function StaffInvitePage() {
  return <Suspense><InviteForm /></Suspense>;
}

function InviteForm() {
  const token = useSearchParams().get("token") ?? "";
  const session = useSession();
  const router = useRouter();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [invalid, setInvalid] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Invite>(`/api/auth/staff-invite?token=${encodeURIComponent(token)}`)
      .then((i) => { setInvite(i); setName(i.name); })
      .catch((e) => setInvalid((e as Error).message));
  }, [token]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError("Use a password of at least 8 characters."); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ user: User }>("/api/auth/staff-invite/accept", { method: "POST", body: JSON.stringify({ token, name, password }) });
      setPassword("");
      setSession({ user: res.user });
      router.replace("/admin/checkin");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (session && session.user.role !== "STAFF") {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="font-display text-2xl font-semibold">You&apos;re signed in as {session.user.name}</h1>
        <p className="mt-2 text-muted">Staff invites create a separate account. Sign out first, then open the invite link again.</p>
      </div>
    );
  }
  if (invalid) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="font-display text-2xl font-semibold">This invite can&apos;t be used</h1>
        <p className="mt-2 text-muted">{invalid}</p>
      </div>
    );
  }
  if (!invite) return <div className="w-full max-w-sm"><Skeleton className="h-80" /></div>;

  return (
    <div className="w-full max-w-sm">
      <p className="eyebrow">Gate staff invite</p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Join {invite.organizerName}</h1>
      <p className="mt-2 text-muted">Create your staff account to scan tickets at their events. You&apos;ll be able to see their events, read-only.</p>
      <form onSubmit={submit} className="mt-6 space-y-4 rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)]">
        {error && <Alert>{error}</Alert>}
        <Field label="Email" type="email" value={invite.email} readOnly disabled hint="The invite is for this email." />
        <Field label="Your name" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        <PasswordField label="Choose a password" required minLength={8} maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password" hint="At least 8 characters." autoFocus />
        <Button type="submit" className="w-full" disabled={busy || !name.trim()}>{busy ? "Creating…" : "Create staff account"}</Button>
      </form>
    </div>
  );
}
