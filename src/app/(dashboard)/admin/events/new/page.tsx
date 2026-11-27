"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { api, CATEGORIES, EventItem } from "@/lib/api";
import { useDashboardRole } from "@/lib/dashboard";
import Button from "@/components/ui/Button";
import { Field, SelectField, TextareaField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";

const EMPTY = {
  title: "", venue: "", category: "Concert", startsAt: "", price: "", rows: "8", seatsPerRow: "12", description: "",
  vipRows: "0", vipPrice: "", premiumRows: "0", premiumPrice: "",
};
const rupeesToPaise = (v: string) => (v.trim() === "" ? null : Math.round(Number(v) * 100));

/** Create an event: details, then the seat map (size and optional VIP / Premium front rows). */
export default function NewEventPage() {
  const d = useDashboardRole();
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  if (!d.manager) return null;
  if (!d.canCreate) {
    return (
      <div className="max-w-xl">
        <h1 className="font-display text-3xl font-bold tracking-tight">Create event</h1>
        <div className="mt-6"><Alert tone="warning">
          {d.staff ? "Gate staff can't create events." : <>Creating events unlocks once your organizer account is approved. <Link className="underline" href="/organizer">Application status</Link>.</>}
        </Alert></div>
      </div>
    );
  }

  const rows = Number(form.rows) || 0;
  const seats = rows * (Number(form.seatsPerRow) || 0);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await api<EventItem>("/api/events", {
        method: "POST",
        body: JSON.stringify({
          title: form.title, venue: form.venue, category: form.category, description: form.description || null,
          startsAt: new Date(form.startsAt).toISOString(), // datetime-local is in the organizer's local time
          priceCents: Math.round(Number(form.price) * 100), rows, seatsPerRow: Number(form.seatsPerRow),
          vipRows: Number(form.vipRows), vipPriceCents: rupeesToPaise(form.vipPrice),
          premiumRows: Number(form.premiumRows), premiumPriceCents: rupeesToPaise(form.premiumPrice),
        }),
      });
      setForm(EMPTY);
      router.push(`/admin/events?created=${encodeURIComponent(created.title)}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  const card = "rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)]";
  return (
    <div className="max-w-3xl">
      <p className="eyebrow">Events</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">Create event</h1>
      <p className="mt-2 text-muted">It goes on sale as soon as you create it. You can add a cover photo afterwards.</p>

      <form onSubmit={create} className="mt-8 space-y-6">
        {error && <Alert>{error}</Alert>}

        <section aria-labelledby="details-h" className={card}>
          <h2 id="details-h" className="font-display text-lg font-bold">Details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Title" required maxLength={120} value={form.title} onChange={set("title")} className="sm:col-span-2" />
            <Field label="Venue" required maxLength={120} value={form.venue} onChange={set("venue")} hint="Place, City (the city powers search)" />
            <SelectField label="Category" value={form.category} onChange={set("category")}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </SelectField>
            <Field label="Starts at" type="datetime-local" required value={form.startsAt} onChange={set("startsAt")} />
            <Field label="Standard price (₹)" type="number" min={0} step={1} required value={form.price} onChange={set("price")} />
            <TextareaField label="Description" maxLength={1000} value={form.description} onChange={set("description")} hint="Shown on the event page." className="sm:col-span-2" />
          </div>
        </section>

        <section aria-labelledby="seats-h" className={card}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="seats-h" className="font-display text-lg font-bold">Seat map</h2>
            <span className="text-sm text-muted tabular">{seats.toLocaleString("en-IN")} seats</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Field label="Rows" type="number" min={1} max={26} required value={form.rows} onChange={set("rows")} hint="A to Z, front first" />
            <Field label="Seats per row" type="number" min={1} max={40} required value={form.seatsPerRow} onChange={set("seatsPerRow")} />
          </div>
          <p className="mt-6 text-sm font-medium">Premium front rows <span className="font-normal text-subtle">(optional)</span></p>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <Field label="VIP rows" type="number" min={0} max={26} value={form.vipRows} onChange={set("vipRows")} />
            <Field label="VIP price (₹)" type="number" min={0} step={1} value={form.vipPrice} onChange={set("vipPrice")} placeholder="2× standard" />
            <Field label="Premium rows" type="number" min={0} max={26} value={form.premiumRows} onChange={set("premiumRows")} />
            <Field label="Premium price (₹)" type="number" min={0} step={1} value={form.premiumPrice} onChange={set("premiumPrice")} placeholder="1.5× standard" />
          </div>
        </section>

        <div className="flex flex-wrap justify-end gap-3">
          <Button href="/admin/events" variant="ghost">Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create event"}</Button>
        </div>
      </form>
    </div>
  );
}
