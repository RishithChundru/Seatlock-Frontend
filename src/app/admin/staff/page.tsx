"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, StaffMember, useSession, when } from "@/lib/api";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Alert, Skeleton, Toast } from "@/components/ui/Feedback";
import { ArrowLeftIcon } from "@/components/ui/Icons";

/**
 * Organizer: invite gate staff. Invites go only to emails with no Seatlock account; the person creates their
 * staff account from the emailed link. Staff can scan your tickets and see your events, read-only.
 */
export default function StaffPage() {
  const session = useSession();
  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const [form, setForm] = useState({ name: "", email: "" });
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const clearToast = useCallback(() => setToast(null), []);
  const organizer = session?.user.role === "ORGANIZER";

  const load = useCallback(() => { api<StaffMember[]>("/api/organizer/staff").then(setStaff).catch((e) => setError((e as Error).message)); }, []);
  useEffect(() => { if (organizer) load(); }, [organizer, load]);

  if (!organizer) return <div className="mx-auto max-w-md pt-24"><Alert tone="warning">This page is for organizers.</Alert></div>;

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const s = await api<StaffMember>("/api/organizer/staff", { method: "POST", body: JSON.stringify({ name: form.name.trim(), email: form.email.trim() }) });
      setForm({ name: "", email: "" });
      setToast(`Invite sent to ${s.email}. They'll appear as active once they create their account.`);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const act = async (path: string, method: "POST" | "DELETE", done: string) => {
    try {
      await api(path, { method });
      setToast(done);
      load();
    } catch (err) {
      setToast((err as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-2xl pt-10">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeftIcon /> Dashboard</Link>
      <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">Gate staff</h1>
      <p className="mt-2 text-muted">
        Staff scan tickets for your events and can see your dashboard, read-only. Invite an email that isn&apos;t registered on
        Seatlock yet; they&apos;ll get a link to create their staff account.
      </p>

      <form onSubmit={add} className="mt-8 grid gap-3 rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-5 sm:grid-cols-[1fr_1.3fr_auto] sm:items-end">
        <Field label="Name" required maxLength={60} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Field label="Email" type="email" required maxLength={254} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Button type="submit" disabled={busy || !form.name.trim() || !form.email.trim()}>{busy ? "Sending…" : "Send invite"}</Button>
      </form>
      {error && <div className="mt-3"><Alert>{error}</Alert></div>}

      <ul className="mt-6 divide-y divide-line overflow-hidden rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)]">
        {staff === null && <li className="p-4"><Skeleton className="h-10" /></li>}
        {staff?.length === 0 && <li className="p-8 text-center text-sm text-muted">No gate staff yet. You can scan tickets yourself from Check-in.</li>}
        {staff?.map((s) => (
          <li key={`${s.status}-${s.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-medium">
                {s.name}
                {s.status === "ACTIVE" && <Badge tone="success">Active</Badge>}
                {s.status === "INVITED" && <Badge tone="warning">Invite sent</Badge>}
                {s.status === "EXPIRED" && <Badge tone="danger">Invite expired</Badge>}
              </p>
              <p className="truncate text-sm text-muted">
                {s.email}
                {s.status === "INVITED" && s.inviteExpiresAt && <> · link valid until {when(s.inviteExpiresAt, { day: "numeric", month: "short" })}</>}
              </p>
            </div>
            <div className="flex gap-1">
              {s.status === "ACTIVE" ? (
                <Button variant="ghost" size="sm" className="text-danger hover:text-danger"
                  onClick={() => act(`/api/organizer/staff/${s.id}`, "DELETE", `${s.name} no longer has access.`)}>Remove</Button>
              ) : (
                <>
                  <Button variant="secondary" size="sm"
                    onClick={() => act(`/api/organizer/staff/invites/${s.id}/resend`, "POST", `New invite link sent to ${s.email}.`)}>Resend</Button>
                  <Button variant="ghost" size="sm" className="text-danger hover:text-danger"
                    onClick={() => act(`/api/organizer/staff/invites/${s.id}`, "DELETE", `Invite to ${s.email} cancelled.`)}>Cancel</Button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      <Toast message={toast} onDone={clearToast} />
    </div>
  );
}
