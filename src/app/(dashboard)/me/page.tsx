"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, Booking, inr, useSession, WaitlistItem, when } from "@/lib/api";
import { BarChart } from "@/components/Charts";
import { PageHeader, Panel, StatCard, StatusPill, Table } from "@/components/DashboardUI";
import TicketQr from "@/components/TicketQr";
import Button from "@/components/ui/Button";
import { Alert, Skeleton } from "@/components/ui/Feedback";
import { CalendarIcon, ClockIcon, GlobeIcon, RupeeIcon, TicketIcon } from "@/components/ui/Icons";

const MONTHS = 6;

/** Customer dashboard: what's coming up, what you've spent, and your latest bookings. */
export default function CustomerOverview() {
  const session = useSession();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [waitlist, setWaitlist] = useState<WaitlistItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(0); // stamped when data arrives; Date.now() in render breaks prerendering

  useEffect(() => {
    if (!session) return;
    api<Booking[]>("/api/bookings/me").then((b) => { setNow(Date.now()); setBookings(b); }).catch((e) => setError((e as Error).message));
    api<WaitlistItem[]>("/api/waitlist/me").then(setWaitlist).catch(() => setWaitlist([]));
  }, [session]);

  if (!session) return null;
  if (session.user.role !== "USER") {
    return <Alert tone="warning">This is the customer dashboard. <Link className="underline" href="/admin">Open your dashboard</Link>.</Alert>;
  }

  const confirmed = (bookings ?? []).filter((b) => b.status === "CONFIRMED");
  const upcoming = confirmed.filter((b) => Date.parse(b.startsAt) > now).sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const attended = confirmed.filter((b) => Date.parse(b.startsAt) <= now);
  const spent = confirmed.reduce((s, b) => s + b.totalCents, 0);
  const next = upcoming[0];

  // Spend per month for the last 6 months (by booking date), oldest first.
  const base = new Date(now || 0);
  const months = Array.from({ length: MONTHS }, (_, i) => new Date(base.getFullYear(), base.getMonth() - (MONTHS - 1 - i), 1));
  const points = months.map((m) => ({
    label: when(m.toISOString(), { month: "short" }),
    hint: when(m.toISOString(), { month: "long", year: "numeric" }),
    value: confirmed.filter((b) => { const d = new Date(b.createdAt); return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth(); })
      .reduce((s, b) => s + b.totalCents, 0),
  }));

  return (
    <div>
      <PageHeader eyebrow="Your dashboard" title={`Hi, ${session.user.name.split(" ")[0]}`}
        actions={<Button href="/"><GlobeIcon /> Browse events</Button>}>
        {next ? <>Your next show is <span className="font-medium text-fg">{next.eventTitle}</span> on {when(next.startsAt, { weekday: "long", day: "numeric", month: "long" })}.</> : "Find something to look forward to."}
      </PageHeader>
      {error && <div className="mb-6"><Alert>{error}</Alert></div>}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Upcoming tickets" icon={TicketIcon} value={bookings ? String(upcoming.length) : null}
          change={next ? `Next: ${when(next.startsAt, { day: "numeric", month: "short" })}` : bookings ? "Nothing booked yet" : undefined} />
        <StatCard label="Events attended" icon={CalendarIcon} value={bookings ? String(attended.length) : null} />
        <StatCard label="Total spent" icon={RupeeIcon} value={bookings ? inr(spent) : null}
          change={bookings ? `${confirmed.length} booking${confirmed.length === 1 ? "" : "s"}` : undefined} />
        <StatCard label="Waitlists" icon={ClockIcon} value={bookings ? String(waitlist.length) : null}
          change={waitlist.some((w) => w.offeredSeat) ? "A seat is held for you" : undefined} trend={waitlist.some((w) => w.offeredSeat) ? "up" : undefined} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Spending by month" className="xl:col-span-2">
          {bookings ? <BarChart points={points} format={inr} label="Money spent per month, last 6 months" /> : <Skeleton className="h-56" />}
        </Panel>
        <Panel title="Next ticket" action={<Link href="/bookings" className="text-sm font-medium text-accent-fg hover:underline">All tickets</Link>}>
          {bookings === null ? <Skeleton className="h-48" /> : !next ? (
            <div className="py-6 text-center">
              <p className="text-sm text-muted">No upcoming tickets.</p>
              <Button href="/" variant="secondary" size="sm" className="mt-4">Browse events</Button>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <p className="font-display text-lg font-bold">{next.eventTitle}</p>
              <p className="text-sm text-muted">{when(next.startsAt, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p>
              <p className="mt-1 font-mono text-sm">{next.seats.join(", ")}</p>
              {next.ticketCode ? <div className="mt-4"><TicketQr code={next.ticketCode} size={120} /></div>
                : <p className="mt-4 text-sm text-warning">Ticket code is being issued…</p>}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Recent bookings" className="mt-4" action={<Link href="/bookings" className="text-sm font-medium text-accent-fg hover:underline">My tickets</Link>}>
        {bookings === null ? <Skeleton className="h-40" /> : bookings.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No bookings yet. <Link href="/" className="font-medium text-accent-fg hover:underline">Browse events</Link>.</p>
        ) : (
          <Table head={["Event", "When", "Seats", "Amount", "Status"]}>
            {bookings.slice(0, 6).map((b) => (
              <tr key={b.id}>
                <td className="max-w-[16rem] truncate py-3 pr-4"><Link href={`/events/${b.eventId}`} className="font-medium hover:text-accent-fg">{b.eventTitle}</Link></td>
                <td className="py-3 pr-4 text-muted tabular">{when(b.startsAt, { day: "numeric", month: "short" })}</td>
                <td className="py-3 pr-4 font-mono text-xs">{b.seats.join(", ")}</td>
                <td className="py-3 pr-4 tabular">{inr(b.totalCents)}</td>
                <td className="py-3"><StatusPill status={b.status} checkedIn={Boolean(b.checkedInAt)} /></td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </div>
  );
}
