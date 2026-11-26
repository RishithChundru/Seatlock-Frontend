"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, Booking, inr, useSession, when } from "@/lib/api";
import ErrorBox from "@/components/ErrorBox";

export default function BookingsPage() {
  const session = useSession();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    api<Booking[]>("/api/bookings/me").then(setBookings).catch((e) => setError(e.message));
  }, [session]);

  if (!session) {
    return (
      <div className="pt-20 text-center">
        <p className="text-white/60">Sign in to see your tickets.</p>
        <Link href="/login?next=/bookings" className="mt-4 inline-block rounded-full bg-white px-5 py-2 text-sm font-medium text-black">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="pt-10">
      <h1 className="font-display text-3xl font-bold">My tickets</h1>
      <p className="mt-1 text-white/50">Every seat here is confirmed and can&apos;t be booked by anyone else.</p>

      <div className="mt-8 space-y-4">
        {error && <ErrorBox message={error} />}
        {bookings === null && !error && <div className="h-32 animate-pulse rounded-3xl bg-white/5" />}
        {bookings?.length === 0 && (
          <div className="rounded-3xl border border-dashed border-white/15 p-10 text-center text-white/50">
            No tickets yet. <Link href="/" className="text-violet-300 underline">Find an event</Link>
          </div>
        )}
        {bookings?.map((b) => (
          <article key={b.id} className="flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] sm:flex-row">
            <div className="flex-1 p-6">
              <p className="text-xs uppercase tracking-widest text-violet-300">
                {when(b.startsAt, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
              </p>
              <Link href={`/events/${b.eventId}`} className="mt-1 block font-display text-xl font-semibold hover:underline">{b.eventTitle}</Link>
              <p className="text-sm text-white/50">{b.venue}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {b.seats.map((s) => (
                  <span key={s} className="rounded-lg bg-white/10 px-2.5 py-1 font-mono text-sm">{s}</span>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-6 border-t border-dashed border-white/15 bg-white/[0.03] px-6 py-4 sm:w-48 sm:flex-col sm:items-start sm:justify-center sm:border-l sm:border-t-0">
              <div>
                <div className="text-xs text-white/40">Booking</div>
                <div className="font-mono">#{b.id}</div>
              </div>
              <div>
                <div className="text-xs text-white/40">Paid</div>
                <div className="font-display text-lg font-bold">{inr(b.totalCents)}</div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
