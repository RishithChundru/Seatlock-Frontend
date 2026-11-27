"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, inr, Insights, ManagedEvent, Organizer, when } from "@/lib/api";
import { useDashboardRole } from "@/lib/dashboard";
import { AreaChart } from "@/components/Charts";
import { change, PageHeader, Panel, StatCard, StatusPill, Table } from "@/components/DashboardUI";
import Button from "@/components/ui/Button";
import { Alert, Skeleton } from "@/components/ui/Feedback";
import { CalendarIcon, InboxIcon, ListIcon, PlusIcon, RupeeIcon, ScanIcon, TicketIcon, UsersIcon } from "@/components/ui/Icons";

/** Dashboard overview for super admin, organizers and gate staff. Everything is scoped to what they may see. */
export default function OverviewPage() {
  const d = useDashboardRole();
  const [events, setEvents] = useState<ManagedEvent[] | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [requests, setRequests] = useState<Organizer[] | null>(null);
  const [metric, setMetric] = useState<"revenue" | "bookings">("revenue");
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(0); // stamped when data arrives; Date.now() in render breaks prerendering

  useEffect(() => {
    if (!d.manager) return;
    api<ManagedEvent[]>("/api/manage/events").then((e) => { setNow(Date.now()); setEvents(e); }).catch((e) => setError((e as Error).message));
    api<Insights>("/api/manage/insights").then(setInsights).catch(() => setInsights({ weeks: [], recent: [] }));
  }, [d.manager]);
  useEffect(() => {
    if (d.superAdmin) api<Organizer[]>("/api/admin/organizers?status=PENDING").then(setRequests).catch(() => setRequests([]));
  }, [d.superAdmin]);

  if (!d.session) return null;
  if (!d.manager) {
    return <Alert tone="warning">This dashboard is for organizers. <Link className="underline" href="/me">Go to your dashboard</Link>.</Alert>;
  }

  const weeks = insights?.weeks ?? [];
  const thisWeek = weeks.at(-1), lastWeek = weeks.at(-2);
  const revenueChange = change(thisWeek?.revenueCents ?? 0, lastWeek?.revenueCents ?? 0);
  const bookingsChange = change(thisWeek?.bookings ?? 0, lastWeek?.bookings ?? 0);
  const upcoming = (events ?? []).filter((e) => Date.parse(e.event.startsAt) > now)
    .sort((a, b) => Date.parse(a.event.startsAt) - Date.parse(b.event.startsAt));
  const totals = (events ?? []).reduce((t, e) => ({ bookings: t.bookings + e.bookings, checkedIn: t.checkedIn + e.checkedIn }), { bookings: 0, checkedIn: 0 });
  const points = weeks.map((w) => ({
    label: when(w.weekStart + "T00:00:00+05:30", { day: "numeric", month: "short" }),
    hint: `Week of ${when(w.weekStart + "T00:00:00+05:30", { day: "numeric", month: "long" })}`,
    value: metric === "revenue" ? w.revenueCents : w.bookings,
  }));

  return (
    <div>
      <PageHeader eyebrow={d.superAdmin ? "Super admin" : d.staff ? "Gate staff · read-only" : "Organizer"} title="Dashboard"
        actions={d.canCreate ? <Button href="/admin/events/new"><PlusIcon /> Create event</Button> : undefined} />

      {d.pendingOrganizer && (
        <div className="mb-6"><Alert tone="warning">
          {d.status === "PENDING" && <><span className="font-medium">Your organizer account is waiting for approval.</span> You can look around; creating events, gate staff and scanning unlock once it&apos;s approved. We&apos;ll email you.</>}
          {d.status === "REJECTED" && <><span className="font-medium">Your application needs changes.</span> <Link className="underline" href="/organizer">See the note and resubmit</Link>.</>}
          {d.status === "SUSPENDED" && <><span className="font-medium">Your organizer account is suspended.</span> Everything is read-only. Contact Seatlock support.</>}
        </Alert></div>
      )}
      {error && <div className="mb-6"><Alert>{error}</Alert></div>}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Revenue this week" icon={RupeeIcon} value={insights ? inr(thisWeek?.revenueCents ?? 0) : null}
          change={insights ? revenueChange.text : undefined} trend={revenueChange.trend} />
        <StatCard label="Bookings this week" icon={TicketIcon} value={insights ? String(thisWeek?.bookings ?? 0) : null}
          change={insights ? bookingsChange.text : undefined} trend={bookingsChange.trend} />
        <StatCard label="Upcoming events" icon={CalendarIcon} value={events ? String(upcoming.length) : null}
          change={upcoming[0] ? `Next: ${when(upcoming[0].event.startsAt, { day: "numeric", month: "short" })}` : events ? "Nothing scheduled" : undefined} />
        <StatCard label="Checked in" icon={ScanIcon} value={events ? totals.checkedIn.toLocaleString("en-IN") : null}
          change={events ? `of ${totals.bookings.toLocaleString("en-IN")} bookings` : undefined} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Sales each week" className="xl:col-span-2" action={
          <div role="group" aria-label="Chart metric" className="flex rounded-[var(--radius-md)] border border-line p-0.5 text-xs">
            {(["revenue", "bookings"] as const).map((m) => (
              <button key={m} type="button" aria-pressed={metric === m} onClick={() => setMetric(m)}
                className={`rounded-[var(--radius-sm)] px-2.5 py-1 capitalize ${metric === m ? "bg-fg text-bg" : "text-muted hover:text-fg"}`}>{m}</button>
            ))}
          </div>
        }>
          {insights ? (
            <AreaChart points={points} label={`${metric} per week, last 8 weeks`}
              format={(n) => metric === "revenue" ? inr(n) : `${n} booking${n === 1 ? "" : "s"}`} />
          ) : <Skeleton className="h-56" />}
        </Panel>

        {d.superAdmin ? (
          <Panel title="Waiting for review" action={<Button href="/admin/organizers" size="sm" variant="secondary">See all</Button>}>
            {requests === null ? <Skeleton className="h-40" /> : requests.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">No organizer requests waiting.</p>
            ) : (
              <ul className="divide-y divide-line">
                {requests.slice(0, 4).map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{o.name}</p>
                      <p className="truncate text-xs text-muted">{o.city} · applied {when(o.createdAt, { day: "numeric", month: "short" })}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-warning-subtle px-2 py-0.5 text-xs font-medium text-warning">Review</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ) : (
          <Panel title="Coming up" action={<Link href="/admin/events" className="text-sm font-medium text-accent-fg hover:underline">All events</Link>}>
            {events === null ? <Skeleton className="h-40" /> : upcoming.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">No upcoming events.</p>
            ) : (
              <ul className="space-y-3">
                {upcoming.slice(0, 4).map(({ event: ev }) => {
                  const pct = ev.totalSeats ? Math.round(((ev.totalSeats - ev.availableSeats) / ev.totalSeats) * 100) : 0;
                  return (
                    <li key={ev.id}>
                      <div className="flex justify-between gap-2 text-sm"><span className="truncate font-medium">{ev.title}</span><span className="shrink-0 text-muted tabular">{pct}%</span></div>
                      <p className="text-xs text-muted">{when(ev.startsAt, { weekday: "short", day: "numeric", month: "short" })}</p>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sunken"><div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} /></div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        )}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <ActionCard title="Events" value={events ? `${upcoming.length} upcoming` : null} text={`${events?.length ?? 0} in total`}
          href="/admin/events" cta="Open events" icon={ListIcon} />
        {d.canScan ? (
          <ActionCard title="Gate" value={events ? `${totals.checkedIn} checked in` : null} text="Scan QR codes at the entrance"
            href="/admin/checkin" cta="Open scanner" icon={ScanIcon} />
        ) : (
          <ActionCard title="Application" value={d.status ? d.status.toLowerCase().replace(/^./, (c) => c.toUpperCase()) : null}
            text="Your organizer review" href="/organizer" cta="View status" icon={InboxIcon} />
        )}
        {d.superAdmin ? (
          <ActionCard title="Organizers" value={requests ? `${requests.length} waiting` : null} text="Approve or request changes"
            href="/admin/organizers" cta="Review requests" icon={InboxIcon} />
        ) : d.organizer && !d.pendingOrganizer ? (
          <ActionCard title="Gate staff" value="Your team" text="Invite people to scan tickets" href="/admin/staff" cta="Manage staff" icon={UsersIcon} />
        ) : (
          <ActionCard title="Live site" value="Browse" text="See events the way customers do" href="/" cta="Open site" icon={CalendarIcon} />
        )}
      </div>

      <Panel title="Latest bookings" className="mt-4" action={<Link href="/admin/events" className="text-sm font-medium text-accent-fg hover:underline">See events</Link>}>
        {insights === null ? <Skeleton className="h-40" /> : insights.recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No bookings yet.</p>
        ) : (
          <Table head={["Booking", "Event", "Seats", "Customer", "Amount", "Status"]}>
            {insights.recent.map((b) => (
              <tr key={b.id}>
                <td className="py-3 pr-4 font-mono text-xs">#{b.id}</td>
                <td className="max-w-[14rem] truncate py-3 pr-4"><Link href={`/events/${b.eventId}`} className="hover:text-accent-fg">{b.eventTitle}</Link></td>
                <td className="py-3 pr-4 font-mono text-xs">{b.seats.join(", ")}</td>
                <td className="py-3 pr-4">{b.customer}</td>
                <td className="py-3 pr-4 tabular">{inr(b.totalCents)}</td>
                <td className="py-3"><StatusPill status={b.status} checkedIn={b.checkedIn} /></td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </div>
  );
}

function ActionCard({ title, value, text, href, cta, icon: Icon }: {
  title: string; value: string | null; text: string; href: string; cta: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}) {
  return (
    <Panel>
      <p className="text-sm text-muted">{title}</p>
      {value === null ? <Skeleton className="mt-1 h-7 w-28" /> : <p className="mt-1 font-display text-xl font-bold">{value}</p>}
      <p className="mt-1 text-sm text-muted">{text}</p>
      <Button href={href} variant="secondary" size="sm" className="mt-4 w-full"><Icon /> {cta}</Button>
    </Panel>
  );
}
