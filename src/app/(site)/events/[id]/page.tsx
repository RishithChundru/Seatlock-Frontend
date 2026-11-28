"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { setPendingPayment } from "@/lib/razorpay";
import { api, API_URL, ApiError, Booking, CheckoutResponse, EventItem, Hold, inr, Seat, TIER_LABEL, useSession, WaitlistStatus, when } from "@/lib/api";
import EventCover from "@/components/EventCover";
import HostCard from "@/components/HostCard";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Alert, Skeleton, Toast } from "@/components/ui/Feedback";
import { ArrowLeftIcon, CalendarIcon, CheckIcon, ClockIcon, PinIcon, XIcon } from "@/components/ui/Icons";

const MAX_SEATS = 10;
// Changes arrive instantly over SSE; this slow poll only catches holds that expire on their own.
const BACKUP_POLL_MS = 30_000;
const HOLD_SECONDS = 300;

export default function EventPage() {
  return <Suspense><EventView /></Suspense>;
}

function EventView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const session = useSession();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Booking | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [live, setLive] = useState(false);
  const [waitlist, setWaitlist] = useState<WaitlistStatus | null>(null);
  const [joining, setJoining] = useState(false);
  // One key per checkout attempt: a double-click or network retry replays instead of booking twice.
  const idemKey = useRef<string | null>(null);
  // Seats we believe we hold, to notice holds that expire or arrive from the waitlist.
  const mine = useRef<Set<number> | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const loginUrl = `/login?next=/events/${id}`;
  const clearToast = useCallback(() => setToast(null), []);
  const cancelledPayment = useSearchParams().get("payment") === "cancelled";
  useEffect(() => {
    if (cancelledPayment) setToast("Payment cancelled. Your seats were released for others."); // eslint-disable-line react-hooks/set-state-in-effect
  }, [cancelledPayment]);
  const signedIn = session !== null;
  // Super admin, organizers and gate staff browse events but never book (the API refuses it too).
  const manager = session !== null && session.user.role !== "USER";
  const MANAGER_NOTE = "Organizer, staff and admin accounts can't book seats. Use a customer account to book.";

  const load = useCallback(async () => {
    try {
      const [e, s, w] = await Promise.all([
        api<EventItem>(`/api/events/${id}`),
        api<Seat[]>(`/api/events/${id}/seats`),
        signedIn ? api<WaitlistStatus>(`/api/events/${id}/waitlist`) : Promise.resolve(null),
      ]);
      setEvent(e);
      setSeats(s);
      setWaitlist(w);
      const held = new Set(s.filter((x) => x.mine).map((x) => x.id));
      const before = mine.current;
      if (before) {
        const gained = s.filter((x) => x.mine && !before.has(x.id));
        if (gained.length) setToast(`Good news: seat ${gained.map((x) => x.row + x.number).join(", ")} from the waitlist is held for you.`);
        else if ([...before].some((x) => !held.has(x))) setToast("Your hold on a seat ran out. Pick it again if it's still free.");
      }
      mine.current = held;
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id, signedIn]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() only sets state after its fetch resolves
    load();
    const t = setInterval(load, BACKUP_POLL_MS);
    // Live updates: the server pings "seats" whenever this map changes; EventSource reconnects by itself.
    const es = new EventSource(`${API_URL}/api/events/${id}/stream`);
    es.addEventListener("seats", () => load());
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(false);
    return () => { clearInterval(t); es.close(); };
  }, [load, id]);

  const selected = useMemo(() => seats.filter((s) => s.mine), [seats]);
  // The server is the clock: earliest expiry among my holds (also right after a reload or a waitlist offer).
  const holdUntil = useMemo(() => {
    const times = selected.map((s) => (s.holdExpiresAt ? Date.parse(s.holdExpiresAt) : NaN)).filter((t) => !Number.isNaN(t));
    return times.length ? Math.min(...times) : null;
  }, [selected]);

  useEffect(() => {
    if (holdUntil === null) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    // Refetch the moment the earliest hold runs out so the map and timer stay honest.
    const expire = setTimeout(load, Math.max(0, holdUntil - Date.now()) + 500);
    return () => { clearInterval(t); clearTimeout(expire); };
  }, [holdUntil, load]);

  useEffect(() => {
    if (done) dialog.current?.showModal();
  }, [done]);

  const rows = useMemo(() => {
    const m = new Map<string, Seat[]>();
    seats.forEach((s) => m.set(s.row, [...(m.get(s.row) ?? []), s]));
    return [...m.entries()];
  }, [seats]);

  const patch = (seatId: number, change: Partial<Seat>) =>
    setSeats((list) => list.map((s) => (s.id === seatId ? { ...s, ...change } : s)));

  const toggle = async (s: Seat) => {
    if (!session) { router.push(loginUrl); return; }
    if (manager) { setToast(MANAGER_NOTE); return; }
    if (s.status === "BOOKED" || (s.status === "HELD" && !s.mine)) return;
    idemKey.current = null;

    if (s.mine) {
      mine.current?.delete(s.id);
      patch(s.id, { status: "AVAILABLE", mine: false, holdExpiresAt: null });
      api(`/api/holds/${s.id}`, { method: "DELETE" }).catch(() => load());
      return;
    }
    if (selected.length >= MAX_SEATS) { setToast(`You can hold up to ${MAX_SEATS} seats at once.`); return; }

    mine.current?.add(s.id);
    patch(s.id, { status: "HELD", mine: true, holdExpiresAt: null }); // optimistic; the server is the judge
    try {
      const h = await api<Hold>("/api/holds", { method: "POST", body: JSON.stringify({ eventId: Number(id), seatIds: [s.id] }) });
      setNow(Date.parse(h.expiresAt) - HOLD_SECONDS * 1000); // the hold just started; the 1s ticker takes over
      patch(s.id, { holdExpiresAt: h.expiresAt });
    } catch (e) {
      mine.current?.delete(s.id);
      if (e instanceof ApiError && e.status === 401) { router.push(loginUrl); return; }
      setToast(e instanceof ApiError && e.status === 409 ? "Someone grabbed that seat a moment ago." : (e as Error).message);
      load();
    }
  };

  const book = async () => {
    if (!session) { router.push(loginUrl); return; }
    if (manager) { setToast(MANAGER_NOTE); return; }
    idemKey.current ??= crypto.randomUUID();
    setBusy(true);
    const finish = (b: Booking) => {
      setDone(b);
      mine.current = new Set();
      idemKey.current = null;
      load();
    };
    try {
      const res = await api<CheckoutResponse>("/api/payments/checkout", {
        method: "POST",
        headers: { "Idempotency-Key": idemKey.current },
        body: JSON.stringify({ eventId: Number(id), seatIds: selected.map((s) => s.id) }),
      });
      if (res.booking) { finish(res.booking); return; } // payments off, or a free order
      // Paid checkout happens on its own full page; it comes back to /payment/complete.
      setPendingPayment({
        orderId: res.orderId!, keyId: res.keyId!, amountCents: res.amountCents!, eventId: Number(id),
        eventTitle: event?.title ?? "", seats: selected.map((x) => x.row + x.number),
      });
      idemKey.current = null;
      router.push("/pay");
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) { idemKey.current = null; setToast(e.message); load(); }
      else if (e instanceof ApiError && e.status === 401) router.push(loginUrl);
      else setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const joinWaitlist = async () => {
    if (!session) { router.push(loginUrl); return; }
    if (manager) { setToast(MANAGER_NOTE); return; }
    setJoining(true);
    try {
      setWaitlist(await api<WaitlistStatus>(`/api/events/${id}/waitlist`, { method: "POST" }));
    } catch (e) {
      setToast((e as Error).message);
      load();
    } finally {
      setJoining(false);
    }
  };

  const leaveWaitlist = async () => {
    try {
      await api(`/api/events/${id}/waitlist`, { method: "DELETE" });
      setWaitlist({ joined: false, position: null, offeredSeat: null, offerExpiresAt: null });
    } catch (e) {
      setToast((e as Error).message);
    }
  };

  if (error && !event) return <div className="pt-10"><Alert>{error}</Alert></div>;
  if (!event) {
    return (
      <div className="grid gap-8 pt-10 md:grid-cols-2">
        <Skeleton className="aspect-[16/10]" />
        <div className="space-y-4"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-5 w-1/2" /><Skeleton className="h-24" /></div>
      </div>
    );
  }

  const secondsLeft = holdUntil === null ? null : Math.max(0, Math.round((holdUntil - now) / 1000));
  const total = selected.reduce((sum, s) => sum + s.priceCents, 0);
  const tiered = event.tiers.length > 1;
  // Checkout lines grouped by tier: "2 × VIP ₹2,998".
  const lines = event.tiers
    .map((t) => ({ ...t, count: selected.filter((s) => s.tier === t.tier).length }))
    .filter((l) => l.count > 0);
  const soldOut = event.availableSeats === 0;

  return (
    <div className="pt-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeftIcon /> All events
      </Link>

      {/* Hero */}
      <header className="mt-5 grid gap-6 md:grid-cols-[1.25fr_1fr] md:gap-10">
        <div className="aspect-[16/10] overflow-hidden rounded-[var(--card-radius)] border border-line">
          <EventCover event={event} sizes="lg" />
        </div>
        <div className="flex flex-col">
          <Badge className="self-start">{event.category}</Badge>
          <h1 className="mt-4 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-[2.75rem]">{event.title}</h1>
          <dl className="mt-5 space-y-2.5 text-[15px]">
            <div className="flex items-center gap-2.5"><dt className="sr-only">Date</dt><CalendarIcon className="text-subtle" />
              <dd className="tabular">{when(event.startsAt, { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" })}</dd></div>
            <div className="flex items-center gap-2.5"><dt className="sr-only">Venue</dt><PinIcon className="text-subtle" /><dd>{event.venue}</dd></div>
          </dl>
          {event.description && <p className="mt-5 leading-relaxed text-muted">{event.description}</p>}
          {event.host && <HostCard host={event.host} className="mt-6" />}
          <div className="mt-auto border-t border-line pt-5 max-md:mt-6">
            <div className="flex items-baseline gap-2">
              {tiered && <span className="text-sm text-subtle">from</span>}
              <span className="font-display text-3xl font-semibold tabular">{inr(event.priceCents)}</span>
              <span className="text-sm text-subtle">per seat · {event.availableSeats} of {event.totalSeats} available</span>
            </div>
            {tiered && (
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted tabular">
                {event.tiers.map((t) => <span key={t.tier}>{TIER_LABEL[t.tier]} {inr(t.priceCents)}</span>)}
              </p>
            )}
          </div>
        </div>
      </header>

      {error && <div className="mt-6"><Alert>{error}</Alert></div>}

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_340px] lg:gap-8">
        {/* Seat map */}
        <section aria-labelledby="seats-h" className="min-w-0 rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-[var(--card-shadow)] sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="seats-h" className="font-display text-xl font-semibold">Choose your seats</h2>
            <p className="flex items-center gap-1.5 text-xs text-subtle" aria-live="polite">
              {live ? (
                <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-50" /><span className="relative inline-flex h-2 w-2 rounded-full bg-success" /></span>
              ) : (
                <span className="h-2 w-2 rounded-full bg-line-strong" />
              )}
              {live ? "Live" : "Reconnecting…"}
            </p>
          </div>

          <div className="mx-auto mt-8 max-w-md" aria-hidden>
            <div className="h-2 rounded-t-[100%] border-x border-t border-line-strong" />
            <p className="eyebrow mt-1 text-center">Stage</p>
          </div>

          <div className="mt-6 overflow-x-auto pb-2">
            <div className="mx-auto flex w-max flex-col gap-[var(--seat-gap)]">
              {rows.map(([row, list]) => (
                <div key={row} className="flex items-center gap-[var(--seat-gap)]">
                  <span className="w-6 text-center font-mono text-xs text-subtle">{row}</span>
                  {list.map((s, i) => {
                    const heldByOther = s.status === "HELD" && !s.mine;
                    const state = s.status === "BOOKED" ? "booked" : s.mine ? "mine" : heldByOther ? "held" : "available";
                    const label = { booked: "booked", mine: "held by you", held: "in another customer's cart", available: "available" }[state];
                    return (
                      <button
                        key={s.id}
                        onClick={() => toggle(s)}
                        disabled={state === "booked" || state === "held"}
                        aria-pressed={s.mine}
                        aria-label={`Seat ${s.row}${s.number}, ${TIER_LABEL[s.tier]} ${inr(s.priceCents)}, ${label}`}
                        title={`${s.row}${s.number} · ${TIER_LABEL[s.tier]} · ${inr(s.priceCents)}`}
                        data-state={state}
                        data-tier={s.tier}
                        className={`seat ${i === Math.floor(list.length / 2) ? "ml-4" : ""}`}
                      >
                        {s.number}
                      </button>
                    );
                  })}
                  <span className="w-6 text-center font-mono text-xs text-subtle">{row}</span>
                </div>
              ))}
            </div>
          </div>

          <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 border-t border-line pt-5 text-xs text-muted">
            {[["available", "Available"], ["mine", "Your hold"], ["held", "In someone's cart"], ["booked", "Sold"]].map(([state, label]) => (
              <li key={state} className="flex items-center gap-2">
                <span data-state={state} className="seat !h-4 !w-4" aria-hidden /> {label}
              </li>
            ))}
          </ul>
          {tiered && (
            <ul aria-label="Seat prices" className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted tabular">
              {event.tiers.map((t) => (
                <li key={t.tier} className="flex items-center gap-2">
                  <span data-state="available" data-tier={t.tier} className="seat !h-4 !w-4" aria-hidden /> {TIER_LABEL[t.tier]} {inr(t.priceCents)}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Checkout */}
        <aside aria-labelledby="summary-h" className="lg:sticky lg:top-24 lg:self-start">
          {manager ? (
            <div className="rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)]">
              <Badge>{session.user.role === "ADMIN" ? "Super admin" : session.user.role === "STAFF" ? "Gate staff" : "Organizer"}</Badge>
              <h2 id="summary-h" className="mt-3 font-display text-xl font-semibold">Viewing as {session.user.role === "ADMIN" ? "admin" : session.user.role === "STAFF" ? "staff" : "organizer"}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                This is the live seat map customers see. {MANAGER_NOTE}
              </p>
              <Button href="/admin/events" variant="secondary" className="mt-5 w-full">Open dashboard</Button>
            </div>
          ) : soldOut && selected.length === 0 ? (
            <div className="rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)]">
              <Badge tone="warning">Sold out</Badge>
              <h2 id="summary-h" className="mt-3 font-display text-xl font-semibold">
                {waitlist?.joined && waitlist.position ? `You're #${waitlist.position} in line` : "Join the waitlist"}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {waitlist?.joined
                  ? "If someone cancels, the seat is held for you for 5 minutes and shows up on this map. We'll email you too."
                  : "If someone cancels, the next person in line gets their seat held for 5 minutes before it goes back on sale."}
              </p>
              {waitlist?.joined ? (
                <Button variant="secondary" className="mt-5 w-full" onClick={leaveWaitlist}>Leave waitlist</Button>
              ) : (
                <Button size="lg" className="mt-5 w-full" onClick={joinWaitlist} disabled={joining}>
                  {joining ? "Joining…" : session ? "Join the waitlist" : "Sign in to join"}
                </Button>
              )}
            </div>
          ) : (
          <div className="rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)]">
            <h2 id="summary-h" className="font-display text-xl font-semibold">Your seats</h2>

            {secondsLeft !== null && selected.length > 0 ? (
              <div role="timer" aria-label="Hold time remaining" className="mt-4">
                <div className={`flex items-center justify-between text-sm ${secondsLeft < 60 ? "text-danger" : "text-muted"}`}>
                  <span className="inline-flex items-center gap-1.5"><ClockIcon /> Held for you</span>
                  <span className="font-mono tabular">{Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}</span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-sunken">
                  <div className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${secondsLeft < 60 ? "bg-danger" : "bg-accent"}`} style={{ width: `${Math.min(100, (secondsLeft / HOLD_SECONDS) * 100)}%` }} />
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">
                {session ? "Tap seats on the map. Each one is held for you for 5 minutes." : "Sign in, then tap seats to hold them."}
              </p>
            )}

            {selected.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-2">
                {selected.map((s) => (
                  <li key={s.id}>
                    <button onClick={() => toggle(s)} aria-label={`Release seat ${s.row}${s.number}`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line-strong pl-2.5 pr-2 font-mono text-sm transition-colors hover:border-fg">
                      {s.row}{s.number} <XIcon className="h-3.5 w-3.5 text-subtle" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <dl className="mt-6 space-y-2 border-t border-line pt-4 text-sm">
              {lines.length === 0 && <div className="flex justify-between text-muted"><dt>0 seats</dt><dd className="tabular">{inr(0)}</dd></div>}
              {lines.map((l) => (
                <div key={l.tier} className="flex justify-between text-muted">
                  <dt>{l.count} × {tiered ? `${TIER_LABEL[l.tier]} ` : ""}{inr(l.priceCents)}</dt>
                  <dd className="tabular">{inr(l.count * l.priceCents)}</dd>
                </div>
              ))}
              <div className="flex justify-between text-muted"><dt>Booking fee</dt><dd>Free</dd></div>
              <div className="flex items-baseline justify-between pt-2"><dt className="font-medium">Total</dt><dd className="font-display text-2xl font-semibold tabular">{inr(total)}</dd></div>
            </dl>

            <Button size="lg" className="mt-5 w-full" onClick={book} disabled={(session !== null && selected.length === 0) || busy}>
              {busy ? "Processing…" : !session ? "Sign in to book" : selected.length === 0 ? "Book seats" : `Book ${selected.length} seat${selected.length === 1 ? "" : "s"}`}
            </Button>
            <p className="mt-3 text-center text-xs text-subtle">Secure payment by Razorpay (test mode: no real money is charged).</p>
          </div>
          )}
        </aside>
      </div>

      <Toast message={toast} onDone={clearToast} />

      <dialog
        ref={dialog}
        onClose={() => setDone(null)}
        aria-labelledby="done-title"
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-[var(--card-radius)] border border-line bg-surface p-0 text-fg shadow-lg"
      >
        {done && (
          <div className="p-7 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-success-subtle text-success"><CheckIcon className="h-6 w-6" /></div>
            <h2 id="done-title" className="mt-4 font-display text-2xl font-semibold">You&apos;re in</h2>
            <p className="mt-2 text-muted">
              <span className="font-mono text-fg">{done.seats.join(", ")}</span> for {done.eventTitle}.
            </p>
            <p className="mt-1 text-sm text-subtle tabular">Booking #{done.id} · {inr(done.totalCents)}</p>
            <p className="mt-4 rounded-md bg-sunken px-3 py-2 text-xs text-muted">Your ticket code is being issued. It appears under Tickets in a few seconds.</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={() => dialog.current?.close()}>Book more</Button>
              <Button href="/bookings">View tickets</Button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
