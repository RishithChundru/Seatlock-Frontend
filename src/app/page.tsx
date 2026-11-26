"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, EventItem, inr, styleFor, when } from "@/lib/api";
import ErrorBox from "@/components/ErrorBox";

export default function Home() {
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<EventItem[]>("/api/events").then(setEvents).catch((e) => setError(e.message));
  }, []);

  return (
    <>
      <section className="py-14 sm:py-20">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs text-violet-200">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Live seat maps · zero double-bookings
        </p>
        <h1 className="max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          Grab the best seat.{" "}
          <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-amber-200 bg-clip-text text-transparent">
            It&apos;s yours, guaranteed.
          </span>
        </h1>
        <p className="mt-5 max-w-xl text-white/60">
          Every booking is protected by optimistic locking, so when two people tap the same seat at the same moment,
          exactly one of them gets it.
        </p>
      </section>

      {error && <ErrorBox message={error} />}

      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {events === null && !error && Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-80 animate-pulse rounded-3xl bg-white/5" />
        ))}
        {events?.map((e) => <EventCard key={e.id} event={e} />)}
      </section>
    </>
  );
}

function EventCard({ event: e }: { event: EventItem }) {
  const s = styleFor(e.category);
  const left = e.availableSeats / Math.max(1, e.totalSeats);
  return (
    <Link
      href={`/events/${e.id}`}
      className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-violet-400"
    >
      <div className={`relative h-40 bg-gradient-to-br ${s.gradient}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.25),transparent_55%)]" />
        <span className="absolute right-5 top-4 text-5xl drop-shadow-lg transition group-hover:scale-110" aria-hidden>{s.emoji}</span>
        <span className="absolute left-4 top-4 rounded-full bg-black/30 px-2.5 py-1 text-xs font-medium backdrop-blur">{e.category}</span>
        <div className="absolute bottom-4 left-4 rounded-xl bg-black/35 px-3 py-1.5 text-center backdrop-blur">
          <div className="text-[10px] uppercase tracking-widest text-white/70">{when(e.startsAt, { month: "short" })}</div>
          <div className="font-display text-2xl font-bold leading-none">{when(e.startsAt, { day: "numeric" })}</div>
        </div>
      </div>
      <div className="p-5">
        <h2 className="font-display text-lg font-semibold leading-snug">{e.title}</h2>
        <p className="mt-1 text-sm text-white/50">{e.venue}</p>
        <p className="text-sm text-white/50">{when(e.startsAt, { weekday: "short", hour: "numeric", minute: "2-digit" })}</p>
        <div className="mt-4 flex items-end justify-between">
          <div>
            <div className="text-xs text-white/40">from</div>
            <div className="font-semibold">{inr(e.priceCents)}</div>
          </div>
          <div className="w-28 text-right">
            <div className={`text-xs ${left < 0.2 ? "text-rose-300" : "text-white/50"}`}>
              {e.availableSeats} of {e.totalSeats} left
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-white/10">
              <div className={`h-full rounded-full ${left < 0.2 ? "bg-rose-400" : "bg-emerald-400"}`} style={{ width: `${left * 100}%` }} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
