"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, Booking, inr, useSession, when } from "@/lib/api";
import Button from "@/components/ui/Button";
import { Alert, Skeleton } from "@/components/ui/Feedback";
import { CalendarIcon, PinIcon, TicketIcon } from "@/components/ui/Icons";

export default function BookingsPage() {
  const session = useSession();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pending = bookings?.some((b) => !b.ticketCode) ?? false;

  useEffect(() => {
    if (!session) return;
    const load = () => api<Booking[]>("/api/bookings/me").then(setBookings).catch((e) => setError(e.message));
    load();
    if (!pending) return;
    // Tickets are issued asynchronously by the RabbitMQ consumer; refresh until every booking has one.
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [session, pending]);

  if (!session) {
    return (
      <div className="mx-auto max-w-sm pt-24 text-center">
        <TicketIcon className="mx-auto h-8 w-8 text-subtle" />
        <p className="mt-4 text-muted">Sign in to see your tickets.</p>
        <Button href="/login?next=/bookings" className="mt-5">Sign in</Button>
      </div>
    );
  }

  return (
    <div className="pt-12">
      <p className="eyebrow">Your wallet</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Tickets</h1>

      <div className="mt-8 space-y-4">
        {error && <Alert>{error}</Alert>}
        {bookings === null && !error && <><Skeleton className="h-36" /><Skeleton className="h-36" /></>}
        {bookings?.length === 0 && (
          <div className="rounded-[var(--card-radius)] border border-dashed border-line-strong px-6 py-14 text-center">
            <p className="text-muted">No tickets yet.</p>
            <Button href="/" variant="secondary" className="mt-4">Browse events</Button>
          </div>
        )}
        {bookings?.map((b) => (
          <article key={b.id} className="flex flex-col overflow-hidden rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] sm:flex-row">
            <div className="flex-1 p-6">
              <Link href={`/events/${b.eventId}`} className="font-display text-xl font-semibold tracking-tight hover:text-accent-fg">{b.eventTitle}</Link>
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                <span className="inline-flex items-center gap-1.5 tabular"><CalendarIcon className="text-subtle" />{when(b.startsAt, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span>
                <span className="inline-flex items-center gap-1.5"><PinIcon className="text-subtle" />{b.venue}</span>
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="eyebrow mr-1 self-center">Seats</span>
                {b.seats.map((s) => <span key={s} className="rounded-sm bg-sunken px-2 py-0.5 font-mono text-sm">{s}</span>)}
              </div>
            </div>
            <div className="flex items-center justify-between gap-6 border-t border-dashed border-line-strong px-6 py-5 sm:w-56 sm:flex-col sm:items-start sm:justify-center sm:border-l sm:border-t-0">
              <div>
                <p className="eyebrow">Ticket code</p>
                {b.ticketCode ? (
                  <p className="mt-1 font-mono text-[15px] font-medium tracking-wide text-fg">{b.ticketCode}</p>
                ) : (
                  <p className="mt-1 flex items-center gap-2 text-sm text-warning" aria-live="polite">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden /> Issuing…
                  </p>
                )}
              </div>
              <div className="sm:mt-4">
                <p className="eyebrow">Paid</p>
                <p className="mt-1 font-display text-lg font-semibold tabular">{inr(b.totalCents)}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
