"use client";

import { useSyncExternalStore } from "react";

// Direct backend URL, only for the SSE stream (EventSource). Every other call goes to same-origin /api/*,
// which next.config.ts proxies to the backend, so the httpOnly auth cookies belong to this site.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

/** ADMIN = super admin (every event). ORGANIZER = their own events. STAFF = scanner for one organizer. */
export type Role = "USER" | "ADMIN" | "ORGANIZER" | "STAFF";
export type User = { id: number; email: string; name: string; role: Role };
/** The organizer's public profile, shown on their events. null = hosted by Seatlock. */
export type Host = {
  id: number; name: string; about: string; city: string; contactEmail: string; contactPhone: string; website: string | null;
};
export type OrganizerStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
export type Organizer = Host & {
  status: OrganizerStatus; reviewNote: string | null; createdAt: string; reviewedAt: string | null;
  accountName: string; accountEmail: string;
};
export type StaffMember = { id: number; name: string; email: string };
export type Tier = "VIP" | "PREMIUM" | "STANDARD";
export type EventItem = {
  id: number; title: string; venue: string; category: string; startsAt: string;
  priceCents: number; totalSeats: number; availableSeats: number;
  description: string | null; imageUrl: string | null;
  city: string; tiers: { tier: Tier; priceCents: number }[]; // most expensive first; STANDARD always present
  host: Host | null;
};
export type EventPage = {
  items: EventItem[]; total: number; page: number; size: number; cities: string[]; categories: string[];
};
export type Seat = {
  id: number; row: string; number: number; status: "AVAILABLE" | "BOOKED" | "HELD"; mine: boolean;
  holdExpiresAt: string | null; // only on your own holds
  tier: Tier; priceCents: number;
};
export type Booking = {
  id: number; eventId: number; eventTitle: string; venue: string; startsAt: string;
  totalCents: number; createdAt: string; seats: string[]; ticketCode: string | null;
  status: "CONFIRMED" | "CANCELLED"; cancelledAt: string | null; checkedInAt: string | null;
  cancellableUntil: string; // after this, cancelling is closed; sharing is the way out
};
/** booking when done right away (payments off / free); otherwise a Razorpay order to pay. */
export type CheckoutResponse = {
  booking: Booking | null; orderId: string | null; amountCents: number | null; currency: string | null; keyId: string | null;
};
/** Public view of a shared ticket (no email, price or booking id). ticketCode is null once cancelled or used. */
export type SharedTicket = {
  eventId: number; eventTitle: string; venue: string; startsAt: string; seats: string[];
  ticketCode: string | null; status: "CONFIRMED" | "CANCELLED"; checkedInAt: string | null; sharedBy: string;
};
export type CheckInResult = {
  result: "ADMITTED" | "ALREADY_CHECKED_IN"; bookingId: number; eventTitle: string; holder: string;
  seats: string[]; checkedInAt: string;
};

export const TIER_LABEL: Record<Tier, string> = { VIP: "VIP", PREMIUM: "Premium", STANDARD: "Standard" };
export type Hold = { seatIds: number[]; expiresAt: string };
export type WaitlistStatus = { joined: boolean; position: number | null; offeredSeat: string | null; offerExpiresAt: string | null };
export type WaitlistItem = {
  eventId: number; eventTitle: string; startsAt: string;
  position: number | null; offeredSeat: string | null; offerExpiresAt: string | null;
};
// Both tokens live in httpOnly cookies set by the API; JavaScript never sees them. Only the public
// profile (name, role) is kept here so the UI can render instantly; /api/auth/session re-checks it on load.
type Session = { user: User };

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const KEY = "seatlock.user";
const listeners = new Set<() => void>();
let cached: { raw: string | null; value: Session | null } = { raw: null, value: null };
let synced = false;

function readSession(): Session | null {
  let raw: string | null = null;
  try { raw = localStorage.getItem(KEY); } catch { /* storage blocked */ }
  if (raw !== cached.raw) cached = { raw, value: raw ? { user: JSON.parse(raw) as User } : null };
  return cached.value;
}

export function setSession(s: Session | null) {
  try { if (s) localStorage.setItem(KEY, JSON.stringify(s.user)); else localStorage.removeItem(KEY); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

/** Once per page load: drop a stale profile (cookies expired or revoked) or pick up a fresh one. */
function syncSession() {
  if (synced) return;
  synced = true;
  try { localStorage.removeItem("seatlock.session"); } catch { /* old token-in-storage format */ }
  fetch("/api/auth/session", { cache: "no-store", headers: { "X-Requested-With": "fetch" } })
    .then((r) => (r.ok ? r.json() : r.status === 401 ? null : undefined))
    .then((u: User | null | undefined) => {
      if (u === undefined) return;
      const before = cached.value?.user.role;
      setSession(u ? { user: u } : null);
      if (u && before && before !== u.role) refresh(); // new access token carries the new role
    })
    .catch(() => { /* offline: keep what we have */ });
}

export function useSession(): Session | null {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); syncSession(); return () => listeners.delete(cb); },
    readSession,
    () => null,
  );
}

// Single-flight: many requests failing with 401 at once share one refresh call.
let refreshing: Promise<boolean> | null = null;
function refresh(): Promise<boolean> {
  refreshing ??= fetch("/api/auth/refresh", { method: "POST", headers: { "X-Requested-With": "fetch" } })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => { refreshing = null; });
  return refreshing;
}

function send(path: string, init: RequestInit) {
  const headers = new Headers(init.headers);
  if (typeof init.body === "string") headers.set("Content-Type", "application/json"); // FormData sets its own boundary
  headers.set("X-Requested-With", "fetch"); // the API's CSRF check for cookie-authenticated writes
  return fetch(path, { ...init, headers, cache: "no-store", credentials: "same-origin" });
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await send(path, init);
    // Access cookie expired: refresh once, then retry. A failed refresh may just mean another tab rotated
    // the cookies a moment earlier (they share the jar), so the retry still gets a chance.
    if (res.status === 401 && !path.startsWith("/api/auth/") && readSession()) {
      if (!(await refresh())) await new Promise((r) => setTimeout(r, 400));
      res = await send(path, init);
      if (res.status === 401) setSession(null);
    }
  } catch {
    throw new ApiError(0, "Can't reach the server. Please try again in a moment.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.detail ?? body?.title ?? `Request failed (${res.status})`);
  }
  return (res.status === 204 ? undefined : res.json()) as Promise<T>;
}

/** Dashboard row: the event plus its sales (confirmed bookings). */
export type ManagedEvent = { event: EventItem; bookings: number; revenueCents: number; checkedIn: number };

/**
 * Picks up a role change (approved as organizer, added as staff) without signing out: rotating the session
 * issues a new access token from the current database role, then the profile is re-read.
 */
export async function refreshSession(): Promise<User | null> {
  await send("/api/auth/refresh", { method: "POST" }).catch(() => undefined);
  const res = await send("/api/auth/session", {}).catch(() => null);
  const user = res?.ok ? ((await res.json()) as User) : null;
  if (user) setSession({ user });
  return user;
}

/** Ends the session on the server (revokes the refresh token, clears both cookies), then locally. */
export async function signOut() {
  await send("/api/auth/logout", { method: "POST" }).catch(() => undefined);
  setSession(null);
}

export const inr = (paise: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);

export const when = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", ...opts }).format(new Date(iso));

export const CATEGORIES = ["Concert", "Comedy", "Movie", "Theatre", "Sports", "Tech"] as const;

// Absolute (object storage / CDN) or same-origin /api/... (Postgres-stored covers, via the proxy).
export const imageSrc = (e: { imageUrl: string | null }) => e.imageUrl;
