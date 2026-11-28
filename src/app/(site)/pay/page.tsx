"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, inr, useSession } from "@/lib/api";
import { openCheckout, PendingPayment, pendingPayment, setPendingPayment } from "@/lib/razorpay";
import Button from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { ClockIcon, TicketIcon } from "@/components/ui/Icons";

/**
 * Full-page checkout. Opens Razorpay straight away; success is POSTed to /payment/callback and ends on
 * /payment/complete. Closing Razorpay or pressing Cancel releases the seats at once (no 15-minute hold).
 */
export default function PayPage() {
  const router = useRouter();
  const session = useSession();
  const [pay, setPay] = useState<PendingPayment | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const opened = useRef(false);

  const cancel = useCallback(async (p: PendingPayment) => {
    setLeaving(true);
    await api(`/api/payments/${encodeURIComponent(p.orderId)}/cancel`, { method: "POST" }).catch(() => undefined);
    setPendingPayment(null);
    router.replace(`/events/${p.eventId}?payment=cancelled`);
  }, [router]);

  const start = useCallback((p: PendingPayment) => {
    setError(null);
    openCheckout(p, { name: session?.user.name, email: session?.user.email }, () => cancel(p))
      .catch((e) => setError((e as Error).message));
  }, [session, cancel]);

  useEffect(() => {
    const p = pendingPayment();
    setPay(p); // eslint-disable-line react-hooks/set-state-in-effect -- sessionStorage is only readable after mount
    if (p && session && !opened.current) { opened.current = true; start(p); }
  }, [session, start]);

  if (pay === undefined) return null;
  if (!pay) {
    return (
      <div className="mx-auto max-w-md pt-20 text-center">
        <p className="text-muted">There&apos;s no payment in progress.</p>
        <Button href="/" variant="secondary" className="mt-4">Browse events</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg pt-6 sm:pt-12">
      <p className="eyebrow">Checkout</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Complete your payment</h1>
      <section className="mt-6 overflow-hidden rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)]">
        <div className="flex items-start gap-4 p-6">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sunken text-accent-fg"><TicketIcon width={20} height={20} /></span>
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold">{pay.eventTitle}</p>
            <p className="mt-1 text-sm text-muted">Seats <span className="font-mono text-fg">{pay.seats.join(", ")}</span></p>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-dashed border-line-strong px-6 py-4">
          <span className="text-sm text-muted">Total</span>
          <span className="font-display text-2xl font-bold tabular">{inr(pay.amountCents)}</span>
        </div>
      </section>
      <p className="mt-4 flex items-center gap-2 text-sm text-muted"><ClockIcon /> Your seats are reserved while you pay.</p>
      {error && <div className="mt-4"><Alert>{error}</Alert></div>}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Button size="lg" onClick={() => start(pay)} disabled={leaving}>Pay {inr(pay.amountCents)}</Button>
        <Button size="lg" variant="secondary" onClick={() => cancel(pay)} disabled={leaving}>{leaving ? "Releasing seats…" : "Cancel and release seats"}</Button>
      </div>
      <p className="mt-6 text-center text-xs text-subtle">Payments are processed securely by Razorpay. <Link href={`/events/${pay.eventId}`} className="underline">Back to the event</Link></p>
    </div>
  );
}
