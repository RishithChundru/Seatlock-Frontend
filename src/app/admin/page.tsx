"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, CATEGORIES, EventItem, inr, useSession, when } from "@/lib/api";
import EventCover from "@/components/EventCover";
import Button, { buttonClass } from "@/components/ui/Button";
import { Field, SelectField, TextareaField } from "@/components/ui/Field";
import { Alert, Skeleton, Toast } from "@/components/ui/Feedback";
import { UploadIcon } from "@/components/ui/Icons";

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp";
const emptyForm = { title: "", venue: "", category: "Concert", startsAt: "", price: "", rows: "8", seatsPerRow: "12", description: "" };

export default function AdminPage() {
  const session = useSession();
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<number | null>(null);
  const clearToast = useCallback(() => setToast(null), []);

  const load = useCallback(() => api<EventItem[]>("/api/events").then(setEvents).catch((e) => setError(e.message)), []);
  useEffect(() => { if (session?.user.role === "ADMIN") load(); }, [session, load]);

  if (session?.user.role !== "ADMIN") {
    return <div className="mx-auto max-w-md pt-24"><Alert tone="warning">This page is for admins. Sign in as admin@seatlock.dev to manage events.</Alert></div>;
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

  return (
    <div className="pt-12">
      <p className="eyebrow">Admin</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Manage events</h1>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
        <section aria-labelledby="list-h" className="min-w-0">
          <h2 id="list-h" className="font-display text-xl font-semibold">Events and covers</h2>
          <p className="mt-1 text-sm text-muted">JPEG, PNG or WebP, up to 2 MB. Landscape (3:2) photos look best.</p>
          <ul className="mt-5 divide-y divide-line overflow-hidden rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)]">
            {events === null && [0, 1, 2].map((i) => <li key={i} className="p-4"><Skeleton className="h-16" /></li>)}
            {events?.map((ev) => (
              <li key={ev.id} className="flex items-center gap-4 p-4">
                <div className="hidden h-16 w-24 shrink-0 overflow-hidden rounded-md border border-line min-[420px]:block"><EventCover event={ev} sizes="sm" /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{ev.title}</p>
                  <p className="truncate text-sm text-muted tabular">{when(ev.startsAt, { day: "numeric", month: "short" })} · {ev.venue} · {inr(ev.priceCents)}</p>
                </div>
                <label className={buttonClass("secondary", "sm", `cursor-pointer ${uploading === ev.id ? "pointer-events-none opacity-50" : ""}`)}>
                  <UploadIcon /> {uploading === ev.id ? "Uploading…" : ev.imageUrl ? "Replace" : "Add cover"}
                  <input type="file" accept={ACCEPT} className="sr-only" aria-label={`Upload cover for ${ev.title}`}
                    onChange={(e) => { upload(ev, e.target.files?.[0]); e.target.value = ""; }} />
                </label>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="create-h" className="rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)] lg:self-start">
          <h2 id="create-h" className="font-display text-xl font-semibold">New event</h2>
          <form onSubmit={create} className="mt-5 space-y-4">
            {error && <Alert>{error}</Alert>}
            <Field label="Title" required maxLength={120} value={form.title} onChange={set("title")} />
            <Field label="Venue" required maxLength={120} value={form.venue} onChange={set("venue")} />
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="Category" value={form.category} onChange={set("category")}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </SelectField>
              <Field label="Price (₹)" type="number" min={0} step={1} required value={form.price} onChange={set("price")} />
            </div>
            <Field label="Starts at" type="datetime-local" required value={form.startsAt} onChange={set("startsAt")} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Rows" type="number" min={1} max={26} required value={form.rows} onChange={set("rows")} />
              <Field label="Seats per row" type="number" min={1} max={40} required value={form.seatsPerRow} onChange={set("seatsPerRow")} />
            </div>
            <TextareaField label="Description" maxLength={1000} value={form.description} onChange={set("description")} hint="Shown on the event page." />
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creating…" : "Create event"}</Button>
          </form>
        </section>
      </div>

      <Toast message={toast} onDone={clearToast} />
    </div>
  );
}
