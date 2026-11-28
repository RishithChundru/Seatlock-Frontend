"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, Attendee, inr, ManagedEvent, when } from "@/lib/api";
import { useDashboardRole } from "@/lib/dashboard";
import { PageHeader, Panel, StatCard, StatusPill, Table } from "@/components/DashboardUI";
import Button from "@/components/ui/Button";
import { Alert, Skeleton } from "@/components/ui/Feedback";
import { ArrowLeftIcon, RupeeIcon, ScanIcon, SearchIcon, TicketIcon } from "@/components/ui/Icons";

type Filter = "all" | "confirmed" | "checked-in" | "cancelled";

/** One event: its sales and everyone who booked it. For its organizer (and their staff) and the super admin. */
export default function EventBookingsPage() {
  const { id } = useParams<{ id: string }>();
  const d = useDashboardRole();
  const [row, setRow] = useState<ManagedEvent | null>(null);
  const [people, setPeople] = useState<Attendee[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (!d.manager) return;
    api<ManagedEvent[]>("/api/manage/events")
      .then((rows) => { const r = rows.find((x) => String(x.event.id) === id); if (r) setRow(r); else setError("Event not found."); })
      .catch((e) => setError((e as Error).message));
    api<Attendee[]>(`/api/manage/events/${id}/bookings`).then(setPeople).catch((e) => setError((e as Error).message));
  }, [d.manager, id]);

  if (!d.manager) return null;
  const ev = row?.event;
  const kind = (a: Attendee): Filter => a.status === "CANCELLED" ? "cancelled" : a.checkedInAt ? "checked-in" : "confirmed";
  const needle = q.trim().toLowerCase();
  const shown = (people ?? []).filter((a) => (filter === "all" || kind(a) === filter)
    && (!needle || `${a.name} ${a.email} ${a.seats.join(" ")}`.toLowerCase().includes(needle)));
  const count = (f: Filter) => (people ?? []).filter((a) => f === "all" || kind(a) === f).length;

  return (
    <div>
      <Link href="/admin/events" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeftIcon /> Events</Link>
      <PageHeader eyebrow={ev ? (ev.host?.name ?? "Hosted by Seatlock") : "Event"} title={ev?.title ?? "…"}
        actions={ev ? <Button href={`/events/${ev.id}`} variant="secondary">View event page</Button> : undefined}>
        {ev && <p className="mt-1 text-sm text-muted">{when(ev.startsAt, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} · {ev.venue}</p>}
      </PageHeader>
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Seats sold" icon={TicketIcon} value={ev ? `${ev.totalSeats - ev.availableSeats}/${ev.totalSeats}` : null} />
        <StatCard label="Bookings" icon={TicketIcon} value={row ? String(row.bookings) : null} />
        <StatCard label="Revenue" icon={RupeeIcon} value={row ? inr(row.revenueCents) : null} change={ev?.host && d.superAdmin ? "Earned by the organizer" : undefined} />
        <StatCard label="Checked in" icon={ScanIcon} value={row ? String(row.checkedIn) : null} />
      </div>

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative lg:w-80">
          <span className="sr-only">Search bookings</span>
          <SearchIcon width={18} height={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email or seat"
            className="h-11 w-full rounded-full border border-line bg-surface pl-10 pr-4 text-sm outline-none focus-visible:border-[var(--sl-focus)] focus-visible:shadow-[0_0_0_4px_var(--sl-accent-subtle)]" />
        </label>
        <div role="group" aria-label="Filter bookings" className="flex gap-2 overflow-x-auto py-1">
          {([["all", "All"], ["confirmed", "Confirmed"], ["checked-in", "Checked in"], ["cancelled", "Cancelled"]] as [Filter, string][]).map(([k, label]) => (
            <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}
              className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium ${filter === k ? "bg-[var(--sl-action)] text-[var(--sl-on-action)]" : "bg-surface text-muted ring-1 ring-inset ring-[var(--sl-border)] hover:text-fg"}`}>
              {label}<span className="tabular text-xs opacity-75">{count(k)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {people === null ? <Skeleton className="h-48" /> : shown.length === 0 ? (
          <p className="rounded-[var(--card-radius)] border border-dashed border-line-strong p-10 text-center text-sm text-muted">
            {people.length === 0 ? "No bookings yet." : "No bookings match."}
          </p>
        ) : (
          <Panel><Table head={["Customer", "Seats", "Amount", "Status", "Booked"]}>
            {shown.map((a) => (
              <tr key={a.id}>
                <td className="py-3 pr-4"><p className="font-medium">{a.name}</p><p className="text-xs text-muted">{a.email}</p></td>
                <td className="py-3 pr-4 font-mono text-sm">{a.seats.join(", ")}</td>
                <td className="py-3 pr-4 tabular">{inr(a.totalCents)}</td>
                <td className="py-3 pr-4"><StatusPill status={a.status} checkedIn={!!a.checkedInAt} /></td>
                <td className="py-3 pr-4 text-sm text-muted tabular">{when(a.createdAt, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</td>
              </tr>
            ))}
          </Table></Panel>
        )}
      </div>
    </div>
  );
}
