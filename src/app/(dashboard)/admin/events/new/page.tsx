"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { api, CATEGORIES, EventItem, inr, when } from "@/lib/api";
import EventCover from "@/components/EventCover";
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
          {d.staff ? "Gate staff can't create events." : <>Creating events unlocks once your organizer account is approved. <Link className="underline" href="/account#organization">Application status</Link>.</>}
        </Alert></div>
      </div>
    );
  }

  const rows = Math.min(26, Number(form.rows) || 0);
  const perRow = Math.min(40, Number(form.seatsPerRow) || 0);
  const seats = rows * perRow;
  const vip = Math.min(rows, Number(form.vipRows) || 0);
  const premium = Math.min(rows - vip, Number(form.premiumRows) || 0);
  const std = Number(form.price) || 0;
  // Same defaults as the server: VIP 2x, Premium 1.5x the standard price.
  const vipPrice = form.vipPrice.trim() ? Number(form.vipPrice) : std * 2;
  const premiumPrice = form.premiumPrice.trim() ? Number(form.premiumPrice) : std * 1.5;
  const potential = perRow * (vip * vipPrice + premium * premiumPrice + (rows - vip - premium) * std) * 100;
  const preview: EventItem = {
    id: form.title.length, title: form.title || "Your event title", venue: form.venue || "Venue, City", category: form.category,
    startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : "2026-12-31T19:30:00+05:30", priceCents: std * 100,
    totalSeats: seats, availableSeats: seats, description: null, imageUrl: null, city: "", tiers: [], host: null,
  };

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
  const step = (n: number, id: string, title: string, note: string) => (
    <div className="flex items-start gap-3">
      <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--sl-action)] text-xs font-bold text-[var(--sl-on-action)]">{n}</span>
      <div><h2 id={id} className="font-display text-lg font-bold leading-7">{title}</h2><p className="text-sm text-muted">{note}</p></div>
    </div>
  );
  return (
    <div className="mx-auto max-w-6xl">
      <p className="eyebrow">Events</p>
      <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Create event</h1>
      <p className="mt-1 text-muted">It goes on sale as soon as you create it. Add a cover photo afterwards from Events.</p>

      <form onSubmit={create} className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          {error && <Alert>{error}</Alert>}

          <section aria-labelledby="details-h" className={card}>
            {step(1, "details-h", "Event details", "What it is, where and when.")}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Title" required maxLength={120} value={form.title} onChange={set("title")} className="sm:col-span-2" placeholder="e.g. Neon Nights Live" />
              <Field label="Venue" required maxLength={120} value={form.venue} onChange={set("venue")} hint="Place, City (the city powers search)" placeholder="Phoenix Arena, Pune" />
              <SelectField label="Category" value={form.category} onChange={set("category")}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </SelectField>
              <Field label="Starts at" type="datetime-local" required value={form.startsAt} onChange={set("startsAt")} className="sm:col-span-2" />
              <TextareaField label="Description" maxLength={1000} value={form.description} onChange={set("description")} hint={`Shown on the event page. ${form.description.length}/1000`} className="sm:col-span-2" />
            </div>
          </section>

          <section aria-labelledby="seats-h" className={card}>
            {step(2, "seats-h", "Seats and pricing", "Rows run A to Z from the stage. Front rows can be VIP or Premium.")}
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <Field label="Rows" type="number" min={1} max={26} required value={form.rows} onChange={set("rows")} />
              <Field label="Seats per row" type="number" min={1} max={40} required value={form.seatsPerRow} onChange={set("seatsPerRow")} />
              <Field label="Standard price (₹)" type="number" min={0} step={1} required value={form.price} onChange={set("price")} />
            </div>
            <div className="mt-5 grid gap-4 rounded-[var(--radius-md)] bg-sunken p-4 sm:grid-cols-2">
              <p className="text-sm font-medium sm:col-span-2">Premium front rows <span className="font-normal text-subtle">(optional)</span></p>
              <Field label="VIP rows" type="number" min={0} max={26} value={form.vipRows} onChange={set("vipRows")} />
              <Field label="VIP price (₹)" type="number" min={0} step={1} value={form.vipPrice} onChange={set("vipPrice")} placeholder={std ? `${std * 2} (2× standard)` : "2× standard"} />
              <Field label="Premium rows" type="number" min={0} max={26} value={form.premiumRows} onChange={set("premiumRows")} />
              <Field label="Premium price (₹)" type="number" min={0} step={1} value={form.premiumPrice} onChange={set("premiumPrice")} placeholder={std ? `${std * 1.5} (1.5× standard)` : "1.5× standard"} />
            </div>
          </section>

          <div className="flex flex-wrap justify-end gap-3">
            <Button href="/admin/events" variant="ghost">Cancel</Button>
            <Button type="submit" size="lg" disabled={busy}>{busy ? "Creating…" : "Create and put on sale"}</Button>
          </div>
        </div>

        {/* Live preview: what customers will see, and what a sell-out is worth */}
        <aside aria-label="Preview" className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <p className="eyebrow">Preview</p>
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[var(--sl-shadow-sm)]">
            <div className="relative aspect-[16/9]">
              <EventCover event={preview} sizes="card" />
              <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">{form.category}</span>
            </div>
            <div className="p-4">
              <p className="line-clamp-2 font-display font-semibold">{preview.title}</p>
              <p className="mt-1 text-xs text-muted">{form.startsAt ? when(preview.startsAt, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "Date and time"} · {preview.venue}</p>
              <p className="mt-2 text-sm font-semibold tabular"><span className="mr-1 text-[11px] font-normal text-subtle">from</span>{inr(std * 100)}</p>
            </div>
          </div>
          <div className={card.replace("p-6", "p-4")}>
            <div className="mb-3 rounded-sm bg-sunken py-1 text-center text-[10px] font-semibold uppercase tracking-widest text-subtle">Stage</div>
            {seats > 0 ? (
              <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))` }} aria-hidden>
                {Array.from({ length: seats }, (_, i) => {
                  const r = Math.floor(i / perRow);
                  const tone = r < vip ? "bg-[var(--marigold-400)]" : r < vip + premium ? "bg-[var(--sl-action)]" : "bg-[var(--sl-seat-open-border)]";
                  return <span key={i} className={`aspect-square rounded-[2px] ${tone}`} />;
                })}
              </div>
            ) : <p className="text-center text-sm text-muted">Add rows and seats to see the map.</p>}
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              {vip > 0 && <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--marigold-400)]" />VIP {inr(vipPrice * 100)}</li>}
              {premium > 0 && <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--sl-action)]" />Premium {inr(premiumPrice * 100)}</li>}
              <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--sl-seat-open-border)]" />Standard {inr(std * 100)}</li>
            </ul>
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4">
              <div><dt className="text-xs text-muted">Seats</dt><dd className="font-display text-lg font-bold tabular">{seats.toLocaleString("en-IN")}</dd></div>
              <div><dt className="text-xs text-muted">If it sells out</dt><dd className="font-display text-lg font-bold tabular">{inr(potential)}</dd></div>
            </dl>
          </div>
        </aside>
      </form>
    </div>
  );
}
