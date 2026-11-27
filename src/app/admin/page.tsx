"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, inr, ManagedEvent, when } from "@/lib/api";
import { useDashboardRole } from "@/lib/dashboard";
import Button from "@/components/ui/Button";
import { Alert, Skeleton } from "@/components/ui/Feedback";
import { InboxIcon, PlusIcon, ScanIcon, UsersIcon } from "@/components/ui/Icons";

/** Dashboard overview: headline numbers, anything that needs attention, and the next events. */
export default function OverviewPage() {
  const d = useDashboardRole();
  const [events, setEvents] = useState<ManagedEvent[] | null>(null);
  const [requests, setRequests] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(0); // stamped when data arrives; Date.now() in render breaks prerendering

  useEffect(() => {
    if (!d.manager) return;
    api<ManagedEvent[]>("/api/manage/events").then((e) => { setNow(Date.now()); setEvents(e); }).catch((e) => setError((e as Error).message));
  }, [d.manager]);
  useEffect(() => {
    if (d.superAdmin) api<unknown[]>("/api/admin/organizers?status=PENDING").then((l) => setRequests(l.length)).catch(() => setRequests(0));
  }, [d.superAdmin]);

  if (!d.session) return null;
  if (!d.manager) {
    return <div className="mx-auto max-w-md pt-24"><Alert tone="warning">The dashboard is for organizers. <Link className="underline" href="/organizer/signup">Create an organizer account</Link>.</Alert></div>;
  }

  const upcoming = (events ?? []).filter((e) => Date.parse(e.event.startsAt) > now)
    .sort((a, b) => Date.parse(a.event.startsAt) - Date.parse(b.event.startsAt));
  const totals = (events ?? []).reduce((t, e) => ({
    seats: t.seats + e.event.totalSeats - e.event.availableSeats, revenue: t.revenue + e.revenueCents, checkedIn: t.checkedIn + e.checkedIn,
  }), { seats: 0, revenue: 0, checkedIn: 0 });
  const title = d.superAdmin ? "Everything on Seatlock" : d.staff ? "Your gate" : "Your events at a glance";

  return (
    <div>
      <p className="eyebrow">Overview</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>

      {d.pendingOrganizer && (
        <div className="mt-6">
          <Alert tone="warning">
            {d.status === "PENDING" && <><span className="font-medium">Your organizer account is waiting for approval.</span> You can look around; creating events, gate staff and scanning unlock once it&apos;s approved. We&apos;ll email you.</>}
            {d.status === "REJECTED" && <><span className="font-medium">Your application needs changes.</span> <Link className="underline" href="/organizer">See the note and resubmit</Link>.</>}
            {d.status === "SUSPENDED" && <><span className="font-medium">Your organizer account is suspended.</span> Everything is read-only. Contact Seatlock support.</>}
          </Alert>
        </div>
      )}
      {d.staff && <p className="mt-3 text-muted">You can see your organizer&apos;s events and scan their tickets. Nothing here can be changed.</p>}
      {error && <div className="mt-6"><Alert>{error}</Alert></div>}

      {/* Headline numbers */}
      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Upcoming events" value={events ? String(upcoming.length) : null} />
        <Stat label="Seats sold" value={events ? totals.seats.toLocaleString("en-IN") : null} />
        <Stat label="Revenue" value={events ? inr(totals.revenue) : null} />
        <Stat label="Checked in" value={events ? totals.checkedIn.toLocaleString("en-IN") : null} />
      </div>

      {/* Needs attention + quick actions */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {d.superAdmin && (
          <Card>
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-subtle text-accent-fg"><InboxIcon width={18} height={18} /></span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">Organizer requests</p>
                <p className="text-sm text-muted">{requests === null ? "Checking…" : requests === 0 ? "Nothing waiting for review." : `${requests} waiting for your review.`}</p>
              </div>
              <Button href="/admin/organizers" size="sm" variant={requests ? "primary" : "secondary"}>Review</Button>
            </div>
          </Card>
        )}
        <Card>
          <p className="font-medium">Quick actions</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {d.canCreate && <Button href="/admin/events/new" size="sm"><PlusIcon /> Create event</Button>}
            {d.canScan && <Button href="/admin/checkin" size="sm" variant="secondary"><ScanIcon /> Scan tickets</Button>}
            {d.organizer && !d.pendingOrganizer && <Button href="/admin/staff" size="sm" variant="secondary"><UsersIcon /> Gate staff</Button>}
            {d.pendingOrganizer && <Button href="/organizer" size="sm" variant="secondary">Application status</Button>}
          </div>
        </Card>
      </div>

      {/* Next events */}
      <section aria-labelledby="next-h" className="mt-10">
        <div className="flex items-end justify-between gap-3">
          <h2 id="next-h" className="font-display text-xl font-bold">Coming up</h2>
          <Link href="/admin/events" className="text-sm font-medium text-accent-fg hover:underline">All events</Link>
        </div>
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)]">
          {events === null && [0, 1].map((i) => <li key={i} className="p-4"><Skeleton className="h-12" /></li>)}
          {events !== null && upcoming.length === 0 && (
            <li className="p-8 text-center text-sm text-muted">
              No upcoming events.{d.canCreate && <> <Link href="/admin/events/new" className="font-medium text-accent-fg hover:underline">Create one</Link>.</>}
            </li>
          )}
          {upcoming.slice(0, 5).map(({ event: ev, bookings }) => {
            const sold = ev.totalSeats - ev.availableSeats;
            const pct = ev.totalSeats ? Math.round((sold / ev.totalSeats) * 100) : 0;
            return (
              <li key={ev.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/events/${ev.id}`} className="truncate font-medium hover:text-accent-fg">{ev.title}</Link>
                  <p className="truncate text-sm text-muted tabular">
                    {when(ev.startsAt, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} · {ev.venue}
                    {d.superAdmin && <> · {ev.host?.name ?? "Seatlock"}</>}
                  </p>
                </div>
                <div className="w-40 shrink-0">
                  <div className="flex justify-between text-xs text-muted tabular"><span>{sold}/{ev.totalSeats} sold</span><span>{bookings} bookings</span></div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sunken"><div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} /></div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-[var(--card-shadow)]">{children}</div>;
}

function Stat({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-[var(--card-shadow)]">
      <p className="text-sm text-muted">{label}</p>
      {value === null ? <Skeleton className="mt-2 h-7 w-20" /> : <p className="mt-1 font-display text-2xl font-bold tabular">{value}</p>}
    </div>
  );
}
