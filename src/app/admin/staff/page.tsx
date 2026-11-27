"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, StaffMember, useSession } from "@/lib/api";
import Button from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Alert, Skeleton, Toast } from "@/components/ui/Feedback";
import { ArrowLeftIcon } from "@/components/ui/Icons";

/** Organizer: people who can scan tickets for your events at the gate, and nothing else. */
export default function StaffPage() {
  const session = useSession();
  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const [email, setEmail] = useState("");
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
      const s = await api<StaffMember>("/api/organizer/staff", { method: "POST", body: JSON.stringify({ email: email.trim() }) });
      setEmail("");
      setToast(`${s.name} can now scan tickets for your events. We've emailed them.`);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (s: StaffMember) => {
    try {
      await api(`/api/organizer/staff/${s.id}`, { method: "DELETE" });
      setToast(`${s.name} no longer has gate access.`);
      load();
    } catch (err) {
      setToast((err as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-2xl pt-10">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeftIcon /> Dashboard</Link>
      <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">Gate staff</h1>
      <p className="mt-2 text-muted">Staff see only the check-in scanner, and it only admits tickets for your events. They need a Seatlock account first.</p>

      <form onSubmit={add} className="mt-8 flex flex-col gap-3 rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-5 sm:flex-row sm:items-end">
        <Field label="Their Seatlock email" type="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1" />
        <Button type="submit" disabled={busy || !email.trim()}>{busy ? "Adding…" : "Add staff"}</Button>
      </form>
      {error && <div className="mt-3"><Alert>{error}</Alert></div>}

      <ul className="mt-6 divide-y divide-line overflow-hidden rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)]">
        {staff === null && <li className="p-4"><Skeleton className="h-10" /></li>}
        {staff?.length === 0 && <li className="p-8 text-center text-sm text-muted">No gate staff yet. You can scan tickets yourself from Check-in.</li>}
        {staff?.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="min-w-0">
              <p className="font-medium">{s.name}</p>
              <p className="truncate text-sm text-muted">{s.email}</p>
            </div>
            <Button variant="ghost" size="sm" className="text-danger hover:text-danger" onClick={() => remove(s)}>Remove</Button>
          </li>
        ))}
      </ul>

      <Toast message={toast} onDone={clearToast} />
    </div>
  );
}
