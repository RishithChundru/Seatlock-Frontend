"use client";

// Razorpay Checkout (https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/).
// Full-page flow: our /pay page opens Checkout over the whole screen with callback_url, so a successful payment
// is POSTed to /payment/callback and lands on our own confirmation screen. The script loads only when someone pays.

type RazorpayOptions = {
  key: string; amount: number; currency: string; order_id: string; name: string; description: string;
  prefill?: { name?: string; email?: string }; theme?: { color?: string }; timeout?: number;
  callback_url: string; redirect: boolean; modal?: { ondismiss?: () => void; confirm_close?: boolean };
};
declare global {
  interface Window { Razorpay?: new (o: RazorpayOptions) => { open: () => void } }
}

/** What /pay needs, handed over from the event page in sessionStorage (never in the URL). */
export type PendingPayment = {
  orderId: string; keyId: string; amountCents: number; eventId: number; eventTitle: string; seats: string[];
};
export const PAY_KEY = "seatlock.pay";
export function pendingPayment(): PendingPayment | null {
  try { return JSON.parse(sessionStorage.getItem(PAY_KEY) ?? "null"); } catch { return null; }
}
export function setPendingPayment(p: PendingPayment | null) {
  try { if (p) sessionStorage.setItem(PAY_KEY, JSON.stringify(p)); else sessionStorage.removeItem(PAY_KEY); } catch { /* storage blocked */ }
}

let loading: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => { loading = null; reject(new Error("Couldn't load the payment page. Check your connection and try again.")); };
    document.body.appendChild(s);
  });
  return loading;
}

/** Opens Checkout. On success Razorpay POSTs to /payment/callback (and leaves this page); onDismiss runs if they close it. */
export async function openCheckout(p: PendingPayment, who: { name?: string; email?: string }, onDismiss: () => void) {
  await loadScript();
  const accent = getComputedStyle(document.documentElement).getPropertyValue("--sl-action").trim() || undefined;
  new window.Razorpay!({
    key: p.keyId, amount: p.amountCents, currency: "INR", order_id: p.orderId,
    name: "Seatlock", description: `${p.seats.length} seat${p.seats.length === 1 ? "" : "s"} · ${p.eventTitle}`,
    prefill: who, theme: { color: accent },
    timeout: 600, // closes before the 15-minute payment hold runs out
    callback_url: `${window.location.origin}/payment/callback`,
    redirect: true,
    modal: { ondismiss: onDismiss, confirm_close: true },
  }).open();
}
