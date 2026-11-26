"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, EventItem, inr, when } from "@/lib/api";
import EventCover from "@/components/EventCover";
import { Alert, Skeleton } from "@/components/ui/Feedback";
import { PinIcon } from "@/components/ui/Icons";

export default function Home() {
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("All");

  useEffect(() => {
    api<EventItem[]>("/api/events").then(setEvents).catch((e) => setError(e.message));
  }, []);

  const categories = useMemo(() => ["All", ...new Set(events?.map((e) => e.category))], [events]);
  const shown = events?.filter((e) => category === "All" || e.category === category) ?? [];
  const [featured, ...rest] = shown;

  return (
    <>
      <section className="border-b border-line pb-10 pt-12 sm:pb-14 sm:pt-20">
        <p className="eyebrow">Now booking</p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          Live events, and seats that stay yours.
        </h1>
        <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-muted">
          Tap a seat and it&apos;s held for you for five minutes. Nobody else can take it while you check out.
        </p>
      </section>

      {error && <div className="mt-8"><Alert>{error}</Alert></div>}

      {events && events.length > 0 && (
        <div role="group" aria-label="Filter by category" className="-mx-1 mt-8 flex gap-1 overflow-x-auto px-1 pb-1">
          {categories.map((c) => (
            <button
              key={c}
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
              className={`h-9 shrink-0 rounded-full border px-4 text-sm transition-colors ${
                category === c ? "border-fg bg-fg text-bg" : "border-line-strong text-muted hover:border-fg hover:text-fg"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {events === null && !error && (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="aspect-[3/2] sm:col-span-2 lg:col-span-3 lg:aspect-[3/1]" />
          {[0, 1, 2].map((i) => <Skeleton key={i} className="aspect-[4/5]" />)}
        </div>
      )}

      {events?.length === 0 && (
        <p className="mt-16 text-center text-muted">No events on sale yet. Check back soon.</p>
      )}

      {featured && <FeaturedCard event={featured} />}

      {rest.length > 0 && (
        <section aria-label="More events" className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((e) => <EventCard key={e.id} event={e} />)}
        </section>
      )}
    </>
  );
}

function Availability({ event: e }: { event: EventItem }) {
  const left = e.availableSeats / Math.max(1, e.totalSeats);
  const low = left < 0.2;
  return (
    <div className="min-w-24">
      <p className={`text-right text-xs tabular ${low ? "font-medium text-warning" : "text-subtle"}`}>
        {e.availableSeats === 0 ? "Sold out" : low ? `Only ${e.availableSeats} left` : `${e.availableSeats} seats left`}
      </p>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-sunken" aria-hidden>
        <div className={`h-full rounded-full ${low ? "bg-warning" : "bg-fg/70"}`} style={{ width: `${left * 100}%` }} />
      </div>
    </div>
  );
}

function Meta({ event: e }: { event: EventItem }) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
      <span className="tabular">{when(e.startsAt, { weekday: "short", day: "numeric", month: "short" })} · {when(e.startsAt, { hour: "numeric", minute: "2-digit" })}</span>
      <span className="inline-flex items-center gap-1"><PinIcon className="text-subtle" />{e.venue}</span>
    </p>
  );
}

function FeaturedCard({ event: e }: { event: EventItem }) {
  return (
    <Link
      href={`/events/${e.id}`}
      className="group mt-6 grid overflow-hidden rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] transition-shadow hover:shadow-md md:grid-cols-[1.4fr_1fr]"
    >
      <div className="aspect-[16/10] overflow-hidden md:aspect-auto md:min-h-80">
        <EventCover event={e} sizes="lg" className="transition-transform duration-500 group-hover:scale-[1.02]" />
      </div>
      <div className="flex flex-col p-6 sm:p-8">
        <p className="eyebrow text-accent-fg">Featured · {e.category}</p>
        <h2 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{e.title}</h2>
        <div className="mt-3"><Meta event={e} /></div>
        {e.description && <p className="mt-4 line-clamp-3 leading-relaxed text-muted">{e.description}</p>}
        <div className="mt-auto flex items-end justify-between gap-4 pt-8">
          <div>
            <p className="text-xs text-subtle">From</p>
            <p className="font-display text-2xl font-semibold tabular">{inr(e.priceCents)}</p>
          </div>
          <Availability event={e} />
        </div>
      </div>
    </Link>
  );
}

function EventCard({ event: e }: { event: EventItem }) {
  return (
    <Link
      href={`/events/${e.id}`}
      className="group flex flex-col overflow-hidden rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] transition-shadow hover:shadow-md"
    >
      <div className="aspect-[3/2] overflow-hidden">
        <EventCover event={e} className="transition-transform duration-500 group-hover:scale-[1.03]" />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="eyebrow">{e.category}</p>
        <h2 className="mt-2 font-display text-xl font-semibold leading-snug tracking-tight">{e.title}</h2>
        <div className="mt-2"><Meta event={e} /></div>
        <div className="mt-auto flex items-end justify-between gap-4 pt-6">
          <p className="font-semibold tabular"><span className="mr-1 text-xs font-normal text-subtle">from</span>{inr(e.priceCents)}</p>
          <Availability event={e} />
        </div>
      </div>
    </Link>
  );
}
