"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { api, Booking, inr, when } from "@/lib/api";
import { pendingPayment, setPendingPayment } from "@/lib/razorpay";
import Button from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Feedback";
import { CheckIcon, XIcon } from "@/components/ui/Icons";

export default function PaymentCompletePage() {
  return <Suspense><Complete /></Suspense>;
}

type State = { kind: "checking" } | { kind: "paid"; booking: Booking } | { kind: "failed"; message: string; eventId?: number };

/** Where Razorpay lands after a full-page payment: verify it, then show the booking (or release the seats). */
function Complete() {
  const params = useSearchParams();
  const [state, setState] = useState<State>({ kind: "checking" });
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const pending = pendingPayment();
    const paymentId = params.get("payment_id");
    if (paymentId) {
      api<Booking>("/api/payments/verify", {
        method: "POST",
        body: JSON.stringify({ orderId: params.get("order_id"), paymentId, signature: params.get("signature") }),
      })
        .then((booking) => { setPendingPayment(null); setState({ kind: "paid", booking }); })
        .catch((e) => setState({ kind: "failed", message: (e as Error).message, eventId: pending?.eventId }));
      return;
    }
    // Failed or abandoned: let go of the seats now rather than after the payment window.
    if (pending) api(`/api/payments/${encodeURIComponent(pending.orderId)}/cancel`, { method: "POST" }).catch(() => undefined);
    setPendingPayment(null);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage is only readable after mount
    setState({ kind: "failed", message: "The payment didn't go through, so nothing was charged. Your seats have been released.", eventId: pending?.eventId });
  }, [params]);

  if (state.kind === "checking") {
    return (
      <div className="mx-auto max-w-lg pt-12" aria-live="polite">
        <p className="text-center text-muted">Confirming your payment…</p>
        <Skeleton className="mt-6 h-56" />
      </div>
    );
  }
  if (state.kind === "failed") {
    return (
      <div className="mx-auto max-w-md pt-16 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-danger-subtle text-danger"><XIcon width={26} height={26} /></span>
        <h1 className="mt-4 font-display text-2xl font-bold">Payment not completed</h1>
        <p className="mt-2 text-muted">{state.message}</p>
        <div className="mt-6 flex justify-center gap-3">
          {state.eventId && <Button href={`/events/${state.eventId}`}>Try again</Button>}
          <Button href="/" variant="secondary">Browse events</Button>
        </div>
      </div>
    );
  }
  const b = state.booking;
  return (
    <div className="mx-auto max-w-lg pt-10 sm:pt-16">
      <div className="text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success-subtle text-success"><CheckIcon width={30} height={30} /></span>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">You&apos;re going!</h1>
        <p className="mt-2 text-muted">Payment received. Your tickets are on their way to your email.</p>
      </div>
      <section className="mt-8 overflow-hidden rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)]">
        <div className="p-6">
          <p className="font-display text-xl font-semibold">{b.eventTitle}</p>
          <p className="mt-1 text-sm text-muted">{when(b.startsAt, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} · {b.venue}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {b.seats.map((s) => <span key={s} className="rounded-sm bg-sunken px-2 py-0.5 font-mono text-sm">{s}</span>)}
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-dashed border-line-strong px-6 py-4">
          <span className="text-sm text-muted">Paid</span>
          <span className="font-display text-xl font-bold tabular">{inr(b.totalCents)}</span>
        </div>
      </section>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Button href="/bookings" size="lg">View my tickets</Button>
        <Button href="/" size="lg" variant="secondary">Browse more events</Button>
      </div>
    </div>
  );
}
