"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { api, EventItem, inr, ManagedEvent, when } from "@/lib/api";
import { useDashboardRole } from "@/lib/dashboard";
import EventCover from "@/components/EventCover";
import Button, { buttonClass } from "@/components/ui/Button";
import { Field, SelectField } from "@/components/ui/Field";
import { Alert, Skeleton, Toast } from "@/components/ui/Feedback";
import { PlusIcon, UploadIcon, XIcon } from "@/components/ui/Icons";

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp";

/** Events the user manages: sales, covers and cancellation. Super admin sees every organizer's events. */
export default function EventsPage() {
  return <Suspense><EventsView /></Suspense>;
}

function EventsView() {
  const d = useDashboardRole();
  const created = useSearchParams().get("created");
  const [events, setEvents] = useState<ManagedEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(created ? `Created “${created}”. Add a cover photo to make it stand out.` : null);
  const [query, setQuery] = useState("");
  const [host, setHost] = useState("all");
  const [uploading, setUploading] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<EventItem | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const clearToast = useCallback(() => setToast(null), []);

  const load = useCallback(() => api<ManagedEvent[]>("/api/manage/events").then(setEvents).catch((e) => setError((e as Error).message)), []);
  useEffect(() => { if (d.manager) load(); }, [d.manager, load]);
  useEffect(() => { if (deleting) dialog.current?.showModal(); }, [deleting]);

  if (!d.manager) return null;

  const upload = async (ev: EventItem, file: File | undefined) => {
    if (!file) return;
    if (!ACCEPT.split(",").includes(file.type)) { setToast("Use a JPEG, PNG or WebP image."); return; }
    if (file.size > MAX_BYTES) { setToast("That image is over 2 MB. Try a smaller one."); return; }
    setUploading(ev.id);
    try {
      const body = new FormData();
      body.append("file", file);
      await api<EventItem>(`/api/events/${ev.id}/image`, { method: "POST", body });
      setToast(`Cover updated for “${ev.title}”.`);
      load();
    } catch (err) {
      setToast((err as Error).message);
    } finally {
      setUploading(null);
    }
  };

  const removeCover = async (ev: EventItem) => {
    try {
      await api<EventItem>(`/api/events/${ev.id}/image`, { method: "DELETE" });
      setToast(`Cover removed from “${ev.title}”.`);
      load();
    } catch (err) {
      setToast((err as Error).message);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await api(`/api/events/${deleting.id}`, { method: "DELETE" });
      setToast(`Cancelled “${deleting.title}”. Ticket holders are being refunded and emailed.`);
      load();
    } catch (err) {
      setToast((err as Error).message);
    } finally {
      dialog.current?.close();
    }
  };

  const hosts = [...new Set((events ?? []).map((e) => e.event.host?.name ?? "Seatlock"))].sort();
  const q = query.trim().toLowerCase();
  const shown = (events ?? []).filter(({ event: ev }) =>
    (host === "all" || (ev.host?.name ?? "Seatlock") === host)
    && (!q || `${ev.title} ${ev.venue} ${ev.category}`.toLowerCase().includes(q)));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{d.readOnly ? "Events · read-only" : "Events"}</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">{d.superAdmin ? "All events" : d.staff ? "Events you work at" : "Your events"}</h1>
        </div>
        {d.canCreate && <Button href="/admin/events/new"><PlusIcon /> Create event</Button>}
      </div>

      <div className={`mt-6 grid gap-3 ${d.superAdmin ? "sm:grid-cols-[1fr_220px]" : ""}`}>
        <Field label="Search" placeholder="Title, venue or category" value={query} onChange={(e) => setQuery(e.target.value)} />
        {d.superAdmin && (
          <SelectField label="Organizer" value={host} onChange={(e) => setHost(e.target.value)}>
            <option value="all">All organizers</option>
            {hosts.map((h) => <option key={h}>{h}</option>)}
          </SelectField>
        )}
      </div>
      {!d.readOnly && <p className="mt-3 text-xs text-subtle">Covers: JPEG, PNG or WebP, up to 2 MB. Landscape (3:2) photos look best.</p>}
      {error && <div className="mt-4"><Alert>{error}</Alert></div>}

      <ul className="mt-4 divide-y divide-line overflow-hidden rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)]">
        {events === null && [0, 1, 2].map((i) => <li key={i} className="p-4"><Skeleton className="h-16" /></li>)}
        {events !== null && shown.length === 0 && (
          <li className="p-10 text-center text-sm text-muted">
            {events.length === 0
              ? (d.canCreate ? <>No events yet. <Link href="/admin/events/new" className="font-medium text-accent-fg hover:underline">Create your first one</Link>.</> : "No events yet.")
              : "No events match your search."}
          </li>
        )}
        {shown.map(({ event: ev, ...sales }) => {
          const sold = ev.totalSeats - ev.availableSeats;
          return (
            <li key={ev.id} className="flex flex-wrap items-center gap-4 p-4">
              <div className="hidden h-16 w-24 shrink-0 overflow-hidden rounded-md border border-line min-[420px]:block"><EventCover event={ev} sizes="sm" /></div>
              <div className="min-w-0 flex-1">
                <Link href={`/events/${ev.id}`} className="block truncate font-medium hover:text-accent-fg">{ev.title}</Link>
                <p className="truncate text-sm text-muted tabular">
                  {when(ev.startsAt, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} · {ev.venue}
                  {d.superAdmin && <> · <span className="text-fg">{ev.host?.name ?? "Seatlock"}</span></>}
                </p>
                <p className="mt-0.5 truncate text-sm text-muted tabular">
                  {sold}/{ev.totalSeats} sold · {sales.bookings} booking{sales.bookings === 1 ? "" : "s"} · {inr(sales.revenueCents)} · {sales.checkedIn} checked in
                </p>
              </div>
              {!d.readOnly && (
                <div className="flex items-center gap-1">
                  <label className={buttonClass("secondary", "sm", `cursor-pointer ${uploading === ev.id ? "pointer-events-none opacity-50" : ""}`)}>
                    <UploadIcon /> {uploading === ev.id ? "Uploading…" : ev.imageUrl ? "Replace cover" : "Add cover"}
                    <input type="file" accept={ACCEPT} className="sr-only" aria-label={`Upload cover for ${ev.title}`}
                      onChange={(e) => { upload(ev, e.target.files?.[0]); e.target.value = ""; }} />
                  </label>
                  {ev.imageUrl && (
                    <Button variant="ghost" size="sm" onClick={() => removeCover(ev)} aria-label={`Remove cover from ${ev.title}`}><XIcon /></Button>
                  )}
                  <Button variant="ghost" size="sm" className="text-danger hover:text-danger" onClick={() => setDeleting(ev)}>Cancel event</Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <Toast message={toast} onDone={clearToast} />

      <dialog ref={dialog} onClose={() => setDeleting(null)} aria-labelledby="delete-title"
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-[var(--card-radius)] border border-line bg-surface p-0 text-fg shadow-lg">
        {deleting && (
          <div className="p-7">
            <h2 id="delete-title" className="font-display text-2xl font-bold">Cancel and delete this event?</h2>
            <p className="mt-3 text-muted">
              &ldquo;{deleting.title}&rdquo; and its seat map, cover and waitlist are removed for good. Everyone with tickets is cancelled,
              refunded in full and emailed.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={() => dialog.current?.close()}>Keep event</Button>
              <Button onClick={confirmDelete}>Cancel &amp; delete</Button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
