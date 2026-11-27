"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api, SharedTicket, when } from "@/lib/api";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Feedback";
import { CalendarIcon, PinIcon, TicketIcon } from "@/components/ui/Icons";
import TicketQr from "@/components/TicketQr";

/** Public: anyone with the link sees the ticket and its QR, so it can be passed to whoever is going. */
export default function SharedTicketPage() {
  return <Suspense><SharedTicketView /></Suspense>;
}

function SharedTicketView() {
  const { token } = useParams<{ token: string }>();
  const [ticket, setTicket] = useState<SharedTicket | null>(null);
  const [missing, setMissing] = useState(false);
  const [now, setNow] = useState(0); // stamped when data arrives; Date.now() in render breaks prerendering

  useEffect(() => {
    api<SharedTicket>(`/api/tickets/${encodeURIComponent(token)}`)
      .then((t) => { setNow(Date.now()); setTicket(t); })
      .catch(() => setMissing(true));
  }, [token]);

  if (missing) {
    return (
      <div className="mx-auto max-w-sm pt-24 text-center">
        <TicketIcon className="mx-auto h-8 w-8 text-subtle" />
        <h1 className="mt-4 font-display text-2xl font-semibold">This ticket link isn&apos;t valid</h1>
        <p className="mt-2 text-muted">Ask the person who sent it for a new link.</p>
        <Button href="/" variant="secondary" className="mt-6">Browse events</Button>
      </div>
    );
  }
  if (!ticket) return <div className="mx-auto max-w-md pt-16"><Skeleton className="h-96" /></div>;

  const cancelled = ticket.status === "CANCELLED";
  const over = Date.parse(ticket.startsAt) < now - 6 * 3600_000; // shows stay "on" a few hours after the start
  const usable = !cancelled && !over && ticket.ticketCode;

  return (
    <div className="mx-auto max-w-md pt-12">
      <p className="eyebrow">Shared by {ticket.sharedBy}</p>
      <article className="mt-3 overflow-hidden rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)]">
        <div className="p-6">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-semibold tracking-tight">{ticket.eventTitle}</h1>
            {cancelled && <Badge tone="danger">Cancelled</Badge>}
            {ticket.checkedInAt && <Badge tone="success">Checked in {when(ticket.checkedInAt, { hour: "numeric", minute: "2-digit" })}</Badge>}
          </div>
          <p className="mt-3 flex flex-col gap-1.5 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5 tabular"><CalendarIcon className="text-subtle" />{when(ticket.startsAt, { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" })}</span>
            <span className="inline-flex items-center gap-1.5"><PinIcon className="text-subtle" />{ticket.venue}</span>
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="eyebrow mr-1">Seats</span>
            {ticket.seats.map((s) => <span key={s} className={`rounded-sm bg-sunken px-2 py-0.5 font-mono text-sm ${cancelled ? "line-through" : ""}`}>{s}</span>)}
          </div>
        </div>
        <div className="flex flex-col items-center gap-3 border-t border-dashed border-line-strong px-6 py-7 text-center">
          {usable ? (
            <>
              <TicketQr code={ticket.ticketCode!} size={180} />
              <p className="font-mono text-lg font-medium tracking-wide">{ticket.ticketCode}</p>
              <p className="text-sm text-muted">Show this QR code at the gate. It works once, for whoever scans in first.</p>
            </>
          ) : cancelled ? (
            <p className="text-muted">This booking was cancelled, so the ticket can&apos;t be used.</p>
          ) : over ? (
            <p className="text-muted">This event has already happened.</p>
          ) : (
            <p className="text-muted">The ticket code is still being issued. Refresh in a moment.</p>
          )}
        </div>
      </article>
      <p className="mt-4 text-center text-sm text-muted">
        <Link href={`/events/${ticket.eventId}`} className="hover:text-fg">About this event</Link>
      </p>
    </div>
  );
}
