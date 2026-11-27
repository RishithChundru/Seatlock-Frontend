"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { api, Organizer, OrganizerStatus, useSession, when } from "@/lib/api";
import HostCard from "@/components/HostCard";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { TextareaField } from "@/components/ui/Field";
import { Alert, Skeleton, Toast } from "@/components/ui/Feedback";


const TABS: { status: OrganizerStatus; label: string }[] = [
  { status: "PENDING", label: "To review" }, { status: "APPROVED", label: "Active" },
  { status: "REJECTED", label: "Needs changes" }, { status: "SUSPENDED", label: "Suspended" },
];
type Pending = { org: Organizer; action: "reject" | "suspend" };

/** Super admin: review organizer applications and manage active organizers. */
export default function OrganizersPage() {
  const session = useSession();
  const [tab, setTab] = useState<OrganizerStatus>("PENDING");
  const [list, setList] = useState<Organizer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const clearToast = useCallback(() => setToast(null), []);
  const superAdmin = session?.user.role === "ADMIN";

  const load = useCallback(() => {
    api<Organizer[]>(`/api/admin/organizers?status=${tab}`).then(setList).catch((e) => setError((e as Error).message));
  }, [tab]);
  useEffect(() => { if (superAdmin) load(); }, [superAdmin, load]);
  useEffect(() => { if (pending) dialog.current?.showModal(); }, [pending]);

  if (!superAdmin) return <div className="mx-auto max-w-md pt-24"><Alert tone="warning">This page is for the super admin.</Alert></div>;

  const act = async (org: Organizer, action: "approve" | "reinstate" | "reject" | "suspend", body?: object) => {
    setBusy(true);
    try {
      await api(`/api/admin/organizers/${org.id}/${action}`, { method: "POST", body: body ? JSON.stringify(body) : undefined });
      const done = { approve: "approved", reinstate: "reinstated", reject: "sent back for changes", suspend: "suspended" }[action];
      setToast(`${org.name} ${done}. They've been emailed.`);
      dialog.current?.close();
      load();
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const confirm = (e: FormEvent) => {
    e.preventDefault();
    if (!pending) return;
    if (pending.action === "reject" && !note.trim()) return;
    act(pending.org, pending.action, { note: note.trim() });
  };

  return (
    <div>
      <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">Organizers</h1>
      <p className="mt-2 text-muted">Approved organizers create and sell their own events. Suspending one stops them and their gate staff straight away; their events stay on sale.</p>

      <div role="tablist" aria-label="Organizer status" className="mt-8 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.status} role="tab" aria-selected={tab === t.status} onClick={() => { if (t.status !== tab) { setList(null); setTab(t.status); } }}
            className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${tab === t.status ? "bg-fg text-bg" : "bg-sunken text-muted hover:text-fg"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {error && <Alert>{error}</Alert>}
        {list === null && !error && <><Skeleton className="h-48" /><Skeleton className="h-48" /></>}
        {list?.length === 0 && <p className="rounded-[var(--card-radius)] border border-dashed border-line-strong px-6 py-12 text-center text-muted">Nothing here.</p>}
        {list?.map((org) => (
          <article key={org.id} className="grid gap-5 rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-5 md:grid-cols-[1fr_320px]">
            <HostCard host={org} className="border-0 p-0" />
            <div className="flex flex-col gap-3 text-sm md:border-l md:border-line md:pl-5">
              <div>
                <p className="eyebrow">Account</p>
                <p className="mt-1">{org.accountName}</p>
                <p className="break-all text-muted">{org.accountEmail}</p>
              </div>
              <p className="text-muted">Applied {when(org.createdAt, { day: "numeric", month: "short", year: "numeric" })}
                {org.reviewedAt && <> · reviewed {when(org.reviewedAt, { day: "numeric", month: "short" })}</>}</p>
              {org.reviewNote && <p><Badge tone={org.status === "SUSPENDED" ? "danger" : "warning"}>Note</Badge> <span className="text-muted">{org.reviewNote}</span></p>}
              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                {org.status === "PENDING" && <>
                  <Button size="sm" disabled={busy} onClick={() => act(org, "approve")}>Approve</Button>
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => { setNote(""); setPending({ org, action: "reject" }); }}>Request changes</Button>
                </>}
                {org.status === "APPROVED" && (
                  <Button size="sm" variant="ghost" className="text-danger hover:text-danger" disabled={busy} onClick={() => { setNote(""); setPending({ org, action: "suspend" }); }}>Suspend</Button>
                )}
                {org.status === "SUSPENDED" && <Button size="sm" disabled={busy} onClick={() => act(org, "reinstate")}>Reinstate</Button>}
                {org.status === "REJECTED" && <p className="text-muted">Waiting for them to edit and resubmit.</p>}
              </div>
            </div>
          </article>
        ))}
      </div>

      <Toast message={toast} onDone={clearToast} />

      <dialog ref={dialog} onClose={() => setPending(null)} aria-labelledby="review-title"
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-[var(--card-radius)] border border-line bg-surface p-0 text-fg shadow-lg">
        {pending && (
          <form onSubmit={confirm} className="space-y-4 p-7">
            <h2 id="review-title" className="font-display text-2xl font-semibold">
              {pending.action === "reject" ? `Request changes from ${pending.org.name}?` : `Suspend ${pending.org.name}?`}
            </h2>
            <p className="text-sm text-muted">
              {pending.action === "reject"
                ? "They'll get this note by email and can edit their application and resubmit."
                : "They and their gate staff lose access at once. Their events stay on sale; you can cancel any of them from the dashboard."}
            </p>
            <TextareaField label={pending.action === "reject" ? "What needs to change" : "Reason (optional)"} required={pending.action === "reject"}
              maxLength={300} rows={3} value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant="secondary" onClick={() => dialog.current?.close()}>Back</Button>
              <Button type="submit" disabled={busy || (pending.action === "reject" && !note.trim())}>
                {pending.action === "reject" ? "Send note" : "Suspend"}
              </Button>
            </div>
          </form>
        )}
      </dialog>
    </div>
  );
}
