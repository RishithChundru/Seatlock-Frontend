"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, Booking, inr, useSession, WaitlistItem, when } from "@/lib/api";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Alert, Skeleton, Toast } from "@/components/ui/Feedback";
import { CalendarIcon, ClockIcon, PinIcon, TicketIcon } from "@/components/ui/Icons";
import TicketQr from "@/components/TicketQr";

export default function BookingsPage() {
  const session = useSession();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [waitlist, setWaitlist] = useState<WaitlistItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(0); // stamped when data arrives; Date.now() in render breaks prerendering
  const dialog = useRef<HTMLDialogElement>(null);
  const clearToast = useCallback(() => setToast(null), []);

  const pending = bookings?.some((b) => b.status === "CONFIRMED" && !b.ticketCode) ?? false;
  // An upcoming ticket that hasn't been scanned yet: the gate could check it in at any moment.
  const awaitingGate = bookings?.some((b) => b.status === "CONFIRMED" && b.ticketCode && !b.checkedInAt
    && Date.parse(b.startsAt) > now - 6 * 3600_000) ?? false;
  const checkedIn = useRef<Set<number> | null>(null);

  const load = useCallback(() => {
    api<Booking[]>("/api/bookings/me")
      .then((list) => {
        // Announce tickets that were scanned at the gate since the last refresh (not on first load).
        const before = checkedIn.current;
        const fresh = list.filter((b) => b.checkedInAt && before && !before.has(b.id));
        if (fresh.length) setToast(`Checked in: ${fresh.map((b) => b.eventTitle).join(", ")}. Enjoy the show!`);
        checkedIn.current = new Set(list.filter((b) => b.checkedInAt).map((b) => b.id));
        setNow(Date.now());
        setBookings(list);
      })
      .catch((e) => setError(e.message));
    api<WaitlistItem[]>("/api/waitlist/me").then(setWaitlist).catch(() => setWaitlist([]));
  }, []);

  useEffect(() => {
    if (!session) return;
    load();
    // Issuing a code takes a second or two (RabbitMQ); a gate scan can happen any time. Poll only while
    // something can still change, and only while the tab is visible.
    // shortcut: polling; push per-user updates over SSE if many people keep this page open
    const every = pending ? 2000 : awaitingGate ? 5000 : 0;
    if (!every) return;
    const t = setInterval(() => { if (document.visibilityState === "visible") load(); }, every);
    return () => clearInterval(t);
  }, [session, pending, awaitingGate, load]);

  // Coming back to the tab (e.g. after walking through the gate) refreshes straight away.
  useEffect(() => {
    if (!session) return;
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [session, load]);

  useEffect(() => {
    if (cancelling) dialog.current?.showModal();
  }, [cancelling]);

  const confirmCancel = async () => {
    if (!cancelling) return;
    setBusy(true);
    try {
      const updated = await api<Booking>(`/api/bookings/${cancelling.id}/cancel`, { method: "POST" });
      setBookings((list) => list?.map((b) => (b.id === updated.id ? updated : b)) ?? null);
      setToast(`Cancelled. ${inr(updated.totalCents)} will be refunded.`);
      dialog.current?.close();
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // A link anyone can open to see (and use) the ticket: the way to pass it on once cancelling has closed.
  const share = async (b: Booking) => {
    try {
      const { token } = await api<{ token: string }>(`/api/bookings/${b.id}/share`, { method: "POST" });
      const url = `${window.location.origin}/t/${token}`;
      const text = `Ticket for ${b.eventTitle} (${b.seats.join(", ")})`;
      if (navigator.share) {
        await navigator.share({ title: text, text, url }).catch(() => undefined); // closing the share sheet is fine
      } else {
        await navigator.clipboard.writeText(url);
        setToast("Ticket link copied. Anyone with the link can use this ticket, so only send it to the person going.");
      }
    } catch (e) {
      setToast((e as Error).message);
    }
  };

  // Upcoming = confirmed and not started yet; everything else (past or cancelled) goes below.
  const upcoming = (bookings ?? []).filter((b) => b.status === "CONFIRMED" && Date.parse(b.startsAt) > now)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const past = (bookings ?? []).filter((b) => !upcoming.includes(b));

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
    <div>
      <p className="eyebrow">Your wallet</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Tickets</h1>

      {waitlist.length > 0 && (
        <section aria-labelledby="wl-h" className="mt-8">
          <h2 id="wl-h" className="font-display text-xl font-semibold">Waitlists</h2>
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)]">
            {waitlist.map((w) => {
              const live = w.offeredSeat && w.offerExpiresAt && Date.parse(w.offerExpiresAt) > now;
              return (
                <li key={w.eventId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <Link href={`/events/${w.eventId}`} className="font-medium hover:text-accent-fg">{w.eventTitle}</Link>
                    <p className="text-sm text-muted tabular">{when(w.startsAt, { weekday: "short", day: "numeric", month: "short" })}</p>
                  </div>
                  {live ? (
                    <div className="flex items-center gap-3">
                      <Badge tone="success"><ClockIcon className="h-3.5 w-3.5" /> Seat {w.offeredSeat} held until {when(w.offerExpiresAt!, { hour: "numeric", minute: "2-digit" })}</Badge>
                      <Button href={`/events/${w.eventId}`} size="sm">Book it</Button>
                    </div>
                  ) : w.offeredSeat ? (
                    <Badge>Offer for {w.offeredSeat} expired</Badge>
                  ) : (
                    <Badge tone="accent">#{w.position} in line</Badge>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="mt-8 space-y-4">
        {error && <Alert>{error}</Alert>}
        {bookings === null && !error && <><Skeleton className="h-36" /><Skeleton className="h-36" /></>}
        {bookings?.length === 0 && (
          <div className="rounded-[var(--card-radius)] border border-dashed border-line-strong px-6 py-14 text-center">
            <p className="text-muted">No tickets yet.</p>
            <Button href="/" variant="secondary" className="mt-4">Browse events</Button>
          </div>
        )}
        {upcoming.length > 0 && <h2 className="pt-2 font-display text-xl font-semibold">Upcoming</h2>}
        {upcoming.map((b) => (
          <TicketCard key={b.id} b={b} upcoming now={now} onShare={() => share(b)}
            onCancel={Date.parse(b.cancellableUntil) > now ? () => setCancelling(b) : undefined} />
        ))}
        {past.length > 0 && <h2 className="pt-6 font-display text-xl font-semibold">Past and cancelled</h2>}
        {past.map((b) => <TicketCard key={b.id} b={b} upcoming={false} now={now} />)}
      </div>

      <Toast message={toast} onDone={clearToast} />

      <dialog
        ref={dialog}
        onClose={() => setCancelling(null)}
        aria-labelledby="cancel-title"
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-[var(--card-radius)] border border-line bg-surface p-0 text-fg shadow-lg"
      >
        {cancelling && (
          <div className="p-7">
            <h2 id="cancel-title" className="font-display text-2xl font-semibold">Cancel this booking?</h2>
            <p className="mt-3 text-muted">
              <span className="font-mono text-fg">{cancelling.seats.join(", ")}</span> for {cancelling.eventTitle} go back on sale, and
              you get a full refund of <span className="font-medium text-fg">{inr(cancelling.totalCents)}</span>. You can&apos;t undo this.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={() => dialog.current?.close()}>Keep tickets</Button>
              <Button onClick={confirmCancel} disabled={busy}>{busy ? "Cancelling…" : "Cancel booking"}</Button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}

function TicketCard({ b, upcoming, now, onCancel, onShare }: {
  b: Booking; upcoming: boolean; now: number; onCancel?: () => void; onShare?: () => void;
}) {
  const cancelled = b.status === "CANCELLED";
  return (
    <article
      className={`flex flex-col overflow-hidden rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] sm:flex-row ${upcoming ? "" : "opacity-75"}`}
    >
      <div className="flex-1 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/events/${b.eventId}`} className="font-display text-xl font-semibold tracking-tight hover:text-accent-fg">{b.eventTitle}</Link>
          {cancelled && <Badge tone="danger">Cancelled</Badge>}
          {b.checkedInAt && <Badge tone="success">Checked in {when(b.checkedInAt, { hour: "numeric", minute: "2-digit" })}</Badge>}
        </div>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5 tabular"><CalendarIcon className="text-subtle" />{when(b.startsAt, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span>
          <span className="inline-flex items-center gap-1.5"><PinIcon className="text-subtle" />{b.venue}</span>
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="eyebrow mr-1">Seats</span>
          {b.seats.map((s) => <span key={s} className={`rounded-sm bg-sunken px-2 py-0.5 font-mono text-sm ${cancelled ? "line-through" : ""}`}>{s}</span>)}
          {upcoming && !b.checkedInAt && (
            <span className="ml-auto flex items-center gap-1">
              {onShare && b.ticketCode && <Button variant="ghost" size="sm" onClick={onShare}>Share ticket</Button>}
              {onCancel && <Button variant="ghost" size="sm" onClick={onCancel}>Cancel booking</Button>}
            </span>
          )}
        </div>
        {upcoming && !b.checkedInAt && (
          <p className="mt-3 text-xs text-subtle">
            {Date.parse(b.cancellableUntil) > now
              ? `Free cancellation until ${when(b.cancellableUntil, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}.`
              : "Cancellation has closed (3 days before the event). Can't go? Share the ticket with someone instead."}
          </p>
        )}
      </div>
      <div className="flex items-center justify-between gap-5 border-t border-dashed border-line-strong px-6 py-5 sm:w-64 sm:border-l sm:border-t-0">
        <div className="min-w-0">
          <p className="eyebrow">Ticket code</p>
          {cancelled ? (
            <p className="mt-1 font-mono text-[15px] text-subtle line-through">{b.ticketCode ?? "—"}</p>
          ) : b.ticketCode ? (
            <p className="mt-1 whitespace-nowrap font-mono text-[15px] font-medium tracking-wide text-fg">{b.ticketCode}</p>
          ) : (
            <p className="mt-1 flex items-center gap-2 text-sm text-warning" aria-live="polite">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden /> Issuing…
            </p>
          )}
          <p className="eyebrow mt-4">{cancelled ? "Refunded" : "Paid"}</p>
          <p className="mt-1 font-display text-lg font-semibold tabular">{inr(b.totalCents)}</p>
        </div>
        {upcoming && b.ticketCode && !cancelled && <TicketQr code={b.ticketCode} size={96} />}
      </div>
    </article>
  );
}
