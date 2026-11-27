"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { api, CATEGORIES, EventItem, inr, ManagedEvent, useSession, when } from "@/lib/api";
import EventCover from "@/components/EventCover";
import Button, { buttonClass } from "@/components/ui/Button";
import { Field, SelectField, TextareaField } from "@/components/ui/Field";
import { Alert, Skeleton, Toast } from "@/components/ui/Feedback";
import { TicketIcon, UploadIcon, XIcon } from "@/components/ui/Icons";

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp";
const emptyForm = {
  title: "", venue: "", category: "Concert", startsAt: "", price: "", rows: "8", seatsPerRow: "12", description: "",
  vipRows: "0", vipPrice: "", premiumRows: "0", premiumPrice: "",
};
const rupeesToPaise = (v: string) => (v.trim() === "" ? null : Math.round(Number(v) * 100));

export default function AdminPage() {
  const session = useSession();
  const [events, setEvents] = useState<ManagedEvent[] | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<EventItem | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const clearToast = useCallback(() => setToast(null), []);

  const role = session?.user.role;
  const superAdmin = role === "ADMIN";
  // The API returns only what this user may manage: every event for the super admin, their own for an organizer.
  const load = useCallback(() => api<ManagedEvent[]>("/api/manage/events").then(setEvents).catch((e) => setError(e.message)), []);
  useEffect(() => { if (role === "ADMIN" || role === "ORGANIZER") load(); }, [role, load]);
  useEffect(() => { if (deleting) dialog.current?.showModal(); }, [deleting]);

  if (role === "STAFF") {
    return <div className="mx-auto max-w-md pt-24 text-center"><p className="text-muted">Gate staff use the scanner.</p><Button href="/admin/checkin" className="mt-4">Open check-in</Button></div>;
  }
  if (role !== "ADMIN" && role !== "ORGANIZER") {
    return <div className="mx-auto max-w-md pt-24"><Alert tone="warning">This page is for organizers. <Link className="underline" href="/organizer">Apply to host events</Link>.</Alert></div>;
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await api<EventItem>("/api/events", {
        method: "POST",
        body: JSON.stringify({
          title: form.title, venue: form.venue, category: form.category, description: form.description || null,
          startsAt: new Date(form.startsAt).toISOString(), // datetime-local is in the admin's local time
          priceCents: Math.round(Number(form.price) * 100), rows: Number(form.rows), seatsPerRow: Number(form.seatsPerRow),
          vipRows: Number(form.vipRows), vipPriceCents: rupeesToPaise(form.vipPrice),
          premiumRows: Number(form.premiumRows), premiumPriceCents: rupeesToPaise(form.premiumPrice),
        }),
      });
      setForm(emptyForm);
      setToast(`Created "${created.title}". Add a cover photo below.`);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const upload = async (ev: EventItem, file: File | undefined) => {
    if (!file) return;
    if (!ACCEPT.split(",").includes(file.type)) { setToast("Use a JPEG, PNG or WebP image."); return; }
    if (file.size > MAX_BYTES) { setToast("That image is over 2 MB. Try a smaller one."); return; }
    setUploading(ev.id);
    try {
      const body = new FormData();
      body.append("file", file);
      await api<EventItem>(`/api/events/${ev.id}/image`, { method: "POST", body });
      setToast(`Cover updated for "${ev.title}".`);
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
      setToast(`Cover removed from "${ev.title}".`);
      load();
    } catch (err) {
      setToast((err as Error).message);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await api(`/api/events/${deleting.id}`, { method: "DELETE" });
      setToast(`Cancelled "${deleting.title}". Ticket holders are being refunded and emailed.`);
      dialog.current?.close();
      load();
    } catch (err) {
      setToast((err as Error).message);
      dialog.current?.close();
    }
  };

  return (
    <div className="pt-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{superAdmin ? "Super admin" : "Organizer dashboard"}</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">{superAdmin ? "All events" : "Your events"}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {superAdmin && <Button href="/admin/organizers" variant="secondary">Organizers</Button>}
          {!superAdmin && <Button href="/admin/staff" variant="secondary">Gate staff</Button>}
          {!superAdmin && <Button href="/organizer" variant="ghost">Public profile</Button>}
          <Button href="/admin/checkin" variant="secondary"><TicketIcon /> Check in tickets</Button>
        </div>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
        <section aria-labelledby="list-h" className="min-w-0">
          <h2 id="list-h" className="font-display text-xl font-semibold">Events, sales and covers</h2>
          <p className="mt-1 text-sm text-muted">JPEG, PNG or WebP, up to 2 MB. Landscape (3:2) photos look best.</p>
          <ul className="mt-5 divide-y divide-line overflow-hidden rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)]">
            {events === null && [0, 1, 2].map((i) => <li key={i} className="p-4"><Skeleton className="h-16" /></li>)}
            {events?.length === 0 && <li className="p-8 text-center text-sm text-muted">No events yet. Create your first one with the form.</li>}
            {events?.map(({ event: ev, ...sales }) => (
              <li key={ev.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="hidden h-16 w-24 shrink-0 overflow-hidden rounded-md border border-line min-[420px]:block"><EventCover event={ev} sizes="sm" /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{ev.title}</p>
                  <p className="truncate text-sm text-muted tabular">
                    {when(ev.startsAt, { day: "numeric", month: "short" })} · {ev.venue} · {inr(ev.priceCents)}
                    {ev.tiers.length > 1 ? ` · ${ev.tiers.length} tiers` : ""} · {ev.totalSeats - ev.availableSeats}/{ev.totalSeats} sold
                  </p>
                  <p className="truncate text-sm text-muted tabular">
                    {superAdmin && <span className="text-fg">{ev.host?.name ?? "Seatlock"} · </span>}
                    {sales.bookings} booking{sales.bookings === 1 ? "" : "s"} · {inr(sales.revenueCents)} · {sales.checkedIn} checked in
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <label className={buttonClass("secondary", "sm", `cursor-pointer ${uploading === ev.id ? "pointer-events-none opacity-50" : ""}`)}>
                    <UploadIcon /> {uploading === ev.id ? "Uploading…" : ev.imageUrl ? "Replace" : "Add cover"}
                    <input type="file" accept={ACCEPT} className="sr-only" aria-label={`Upload cover for ${ev.title}`}
                      onChange={(e) => { upload(ev, e.target.files?.[0]); e.target.value = ""; }} />
                  </label>
                  {ev.imageUrl && (
                    <Button variant="ghost" size="sm" onClick={() => removeCover(ev)} aria-label={`Remove cover from ${ev.title}`}>
                      <XIcon /> Cover
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="text-danger hover:text-danger" onClick={() => setDeleting(ev)}>Cancel event</Button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="create-h" className="rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)] lg:self-start">
          <h2 id="create-h" className="font-display text-xl font-semibold">New event</h2>
          <form onSubmit={create} className="mt-5 space-y-4">
            {error && <Alert>{error}</Alert>}
            <Field label="Title" required maxLength={120} value={form.title} onChange={set("title")} />
            <Field label="Venue" required maxLength={120} value={form.venue} onChange={set("venue")} hint="Place, City (the city powers search)" />
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="Category" value={form.category} onChange={set("category")}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </SelectField>
              <Field label="Standard price (₹)" type="number" min={0} step={1} required value={form.price} onChange={set("price")} />
            </div>
            <Field label="Starts at" type="datetime-local" required value={form.startsAt} onChange={set("startsAt")} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Rows" type="number" min={1} max={26} required value={form.rows} onChange={set("rows")} />
              <Field label="Seats per row" type="number" min={1} max={40} required value={form.seatsPerRow} onChange={set("seatsPerRow")} />
            </div>
            <fieldset className="rounded-md border border-line p-3">
              <legend className="px-1 text-sm font-medium">Seat tiers <span className="font-normal text-subtle">(front rows, optional)</span></legend>
              <div className="grid grid-cols-2 gap-3">
                <Field label="VIP rows" type="number" min={0} max={26} value={form.vipRows} onChange={set("vipRows")} />
                <Field label="VIP price (₹)" type="number" min={0} step={1} value={form.vipPrice} onChange={set("vipPrice")} placeholder="2× standard" />
                <Field label="Premium rows" type="number" min={0} max={26} value={form.premiumRows} onChange={set("premiumRows")} />
                <Field label="Premium price (₹)" type="number" min={0} step={1} value={form.premiumPrice} onChange={set("premiumPrice")} placeholder="1.5× standard" />
              </div>
            </fieldset>
            <TextareaField label="Description" maxLength={1000} value={form.description} onChange={set("description")} hint="Shown on the event page." />
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creating…" : "Create event"}</Button>
          </form>
        </section>
      </div>

      <Toast message={toast} onDone={clearToast} />

      <dialog
        ref={dialog}
        onClose={() => setDeleting(null)}
        aria-labelledby="delete-title"
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-[var(--card-radius)] border border-line bg-surface p-0 text-fg shadow-lg"
      >
        {deleting && (
          <div className="p-7">
            <h2 id="delete-title" className="font-display text-2xl font-semibold">Cancel and delete this event?</h2>
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
