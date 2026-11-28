import { NextResponse, type NextRequest } from "next/server";

/**
 * Razorpay POSTs the signed result here after a full-page payment. This is a cross-site form POST, so the
 * SameSite=Lax session cookie isn't sent: just hand the fields to /payment/complete as a normal GET, where the
 * signed-in page verifies them with the API (the signature is checked server-side there).
 */
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const field = (k: string) => (form?.get(k) ?? "").toString();
  const done = new URL("/payment/complete", req.url);
  if (field("razorpay_payment_id")) {
    done.searchParams.set("order_id", field("razorpay_order_id"));
    done.searchParams.set("payment_id", field("razorpay_payment_id"));
    done.searchParams.set("signature", field("razorpay_signature"));
  } else {
    done.searchParams.set("failed", "1");
  }
  return NextResponse.redirect(done, 303);
}
