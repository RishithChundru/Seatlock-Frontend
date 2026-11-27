"use client";

// Razorpay Checkout (https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/).
// The script is loaded only when someone pays, so pages that never pay don't download it.

export type RazorpaySuccess = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };

type RazorpayOptions = {
  key: string; amount: number; currency: string; order_id: string; name: string; description: string;
  prefill?: { name?: string; email?: string }; theme?: { color?: string }; timeout?: number;
  handler: (r: RazorpaySuccess) => void; modal?: { ondismiss?: () => void };
};
declare global {
  interface Window { Razorpay?: new (o: RazorpayOptions) => { open: () => void } }
}

let loading: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => { loading = null; reject(new Error("Couldn't load the payment window. Check your connection and try again.")); };
    document.body.appendChild(s);
  });
  return loading;
}

/** Opens Checkout. Resolves with the signed result, or null if the user closed it without paying. */
export async function payWithRazorpay(o: {
  keyId: string; orderId: string; amountCents: number; description: string; name?: string; email?: string;
}): Promise<RazorpaySuccess | null> {
  await loadScript();
  const accent = getComputedStyle(document.documentElement).getPropertyValue("--sl-accent").trim() || undefined;
  return new Promise((resolve) => {
    new window.Razorpay!({
      key: o.keyId, amount: o.amountCents, currency: "INR", order_id: o.orderId,
      name: "Seatlock", description: o.description,
      prefill: { name: o.name, email: o.email }, theme: { color: accent },
      timeout: 600, // closes before the 15-minute payment hold runs out
      handler: resolve,
      modal: { ondismiss: () => resolve(null) },
    }).open();
  });
}
