"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError, Booking, EventItem, inr, Seat, styleFor, useSession, when } from "@/lib/api";
import ErrorBox from "@/components/ErrorBox";

const MAX_SEATS = 10;
const POLL_MS = 4000;

export default function EventPage() {
  return <Suspense><EventView /></Suspense>;
}

function EventView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const session = useSession();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Booking | null>(null);
  // One key per checkout attempt: a double-click or network retry replays instead of booking twice.
  const idemKey = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [e, s] = await Promise.all([api<EventItem>(`/api/events/${id}`), api<Seat[]>(`/api/events/${id}/seats`)]);
      setEvent(e);
      setSeats(s);
      // Drop selections someone else just booked.
      const booked = new Set(s.filter((x) => x.status === "BOOKED").map((x) => x.id));
      setSelected((sel) => {
        const kept = sel.filter((x) => !booked.has(x));
        if (kept.length !== sel.length) setToast("A seat you picked was just taken by someone else.");
        return kept;
      });
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() only sets state after its fetch resolves
    load();
    // shortcut: polling for live updates, swap for SSE/WebSocket push when traffic grows
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const rows = useMemo(() => {
    const m = new Map<string, Seat[]>();
    seats.forEach((s) => m.set(s.row, [...(m.get(s.row) ?? []), s]));
    return [...m.entries()];
  }, [seats]);

  const seatById = useMemo(() => new Map(seats.map((s) => [s.id, s])), [seats]);

  const toggle = (s: Seat) => {
    if (s.status === "BOOKED") return;
    idemKey.current = null;
    setSelected((sel) => {
      if (sel.includes(s.id)) return sel.filter((x) => x !== s.id);
      if (sel.length >= MAX_SEATS) { setToast(`You can book up to ${MAX_SEATS} seats at once.`); return sel; }
      return [...sel, s.id];
    });
  };

  const book = async () => {
    if (!session) { router.push(`/login?next=/events/${id}`); return; }
    idemKey.current ??= crypto.randomUUID();
    setBusy(true);
    try {
      const b = await api<Booking>("/api/bookings", {
        method: "POST",
        headers: { "Idempotency-Key": idemKey.current },
        body: JSON.stringify({ eventId: Number(id), seatIds: selected }),
      });
      setDone(b);
      setSelected([]);
      idemKey.current = null;
      load();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) { idemKey.current = null; setToast(e.message); load(); }
      else if (e instanceof ApiError && e.status === 401) router.push(`/login?next=/events/${id}`);
      else setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (error && !event) return <div className="pt-10"><ErrorBox message={error} /></div>;
  if (!event) return <div className="mt-10 h-96 animate-pulse rounded-3xl bg-white/5" />;

  const style = styleFor(event.category);
  const total = selected.length * event.priceCents;

  return (
    <div className="pt-8">
      <Link href="/" className="text-sm text-white/50 hover:text-white">← All events</Link>

      <header className={`mt-4 overflow-hidden rounded-3xl bg-gradient-to-br ${style.gradient} p-6 sm:p-8`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="rounded-full bg-black/25 px-2.5 py-1 text-xs">{event.category}</span>
            <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">{event.title}</h1>
            <p className="mt-1 text-white/80">
              {event.venue} · {when(event.startsAt, { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" })}
            </p>
          </div>
          <div className="rounded-2xl bg-black/25 px-4 py-3 text-right backdrop-blur">
            <div className="text-xs text-white/70">Per seat</div>
            <div className="font-display text-2xl font-bold">{inr(event.priceCents)}</div>
          </div>
        </div>
      </header>

      {error && <div className="mt-4"><ErrorBox message={error} /></div>}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <section aria-label="Seat map" className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-8">
          <div className="stage mx-auto mb-2 h-10 w-4/5 bg-gradient-to-b from-white/40 to-white/0" />
          <p className="mb-8 text-center text-[11px] uppercase tracking-[0.3em] text-white/40">Stage</p>

          <div className="overflow-x-auto pb-2">
            <div className="mx-auto flex w-max flex-col gap-2">
              {rows.map(([row, list]) => (
                <div key={row} className="flex items-center gap-1.5">
                  <span className="w-5 text-center font-mono text-xs text-white/40">{row}</span>
                  {list.map((s, i) => {
                    const mine = selected.includes(s.id);
                    const aisle = i === Math.floor(list.length / 2);
                    return (
                      <button
                        key={s.id}
                        onClick={() => toggle(s)}
                        disabled={s.status === "BOOKED"}
                        aria-pressed={mine}
                        aria-label={`Seat ${s.row}${s.number}, ${s.status === "BOOKED" ? "booked" : mine ? "selected" : "available"}`}
                        className={`${aisle ? "ml-4" : ""} grid h-7 w-7 place-items-center rounded-t-lg rounded-b-sm text-[10px] font-medium transition sm:h-8 sm:w-8
                          ${s.status === "BOOKED"
                            ? "cursor-not-allowed bg-white/5 text-white/20"
                            : mine
                              ? "pop bg-gradient-to-b from-fuchsia-400 to-violet-500 text-white shadow-lg shadow-fuchsia-500/30"
                              : "bg-white/15 text-white/70 hover:bg-emerald-400/70 hover:text-black"}
                          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300`}
                      >
                        {s.status === "BOOKED" ? "×" : s.number}
                      </button>
                    );
                  })}
                  <span className="w-5 text-center font-mono text-xs text-white/40">{row}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-5 text-xs text-white/60">
            <Legend className="bg-white/15" label="Available" />
            <Legend className="bg-gradient-to-b from-fuchsia-400 to-violet-500" label="Your pick" />
            <Legend className="bg-white/5" label="Booked" />
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Live · refreshes every {POLL_MS / 1000}s
            </span>
          </div>
        </section>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="font-display text-lg font-semibold">Your selection</h2>
            <p className="mt-1 text-sm text-white/50">{event.availableSeats} seats still available</p>

            <div className="mt-5 flex min-h-12 flex-wrap gap-2">
              {selected.length === 0 && <p className="text-sm text-white/40">Tap seats on the map to pick them.</p>}
              {selected.map((sid) => {
                const s = seatById.get(sid);
                return s && (
                  <button key={sid} onClick={() => toggle(s)} className="rounded-lg bg-violet-500/20 px-2.5 py-1 font-mono text-sm text-violet-100 hover:bg-violet-500/30">
                    {s.row}{s.number} ✕
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex items-baseline justify-between border-t border-white/10 pt-4">
              <span className="text-sm text-white/60">{selected.length} × {inr(event.priceCents)}</span>
              <span className="font-display text-2xl font-bold">{inr(total)}</span>
            </div>

            <button
              onClick={book}
              disabled={selected.length === 0 || busy}
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3.5 font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              {busy ? "Locking your seats…" : session ? "Book now" : "Sign in to book"}
            </button>
            <p className="mt-3 text-center text-xs text-white/40">Payment is simulated in this demo.</p>
          </div>
        </aside>
      </div>

      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-2xl border border-amber-300/30 bg-[#1a1408] px-5 py-3 text-sm text-amber-100 shadow-2xl">
          {toast}
        </div>
      )}

      {done && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="done-title">
          <div className="pop w-full max-w-sm rounded-3xl border border-white/10 bg-[#0f0f18] p-7 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-400/15 text-3xl">✓</div>
            <h2 id="done-title" className="mt-4 font-display text-2xl font-bold">You&apos;re in!</h2>
            <p className="mt-2 text-white/60">
              Seats <span className="font-mono text-white">{done.seats.join(", ")}</span> are locked in for {done.eventTitle}.
            </p>
            <p className="mt-1 text-sm text-white/40">Booking #{done.id} · {inr(done.totalCents)}</p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setDone(null)} className="flex-1 rounded-xl border border-white/15 py-2.5 text-sm hover:bg-white/5">
                Book more
              </button>
              <Link href="/bookings" className="flex-1 rounded-xl bg-white py-2.5 text-sm font-medium text-black hover:bg-white/90">
                View tickets
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-3.5 w-3.5 rounded-t-md rounded-b-sm ${className}`} /> {label}
    </span>
  );
}
