"use client";

import { useSyncExternalStore } from "react";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export type User = { id: number; email: string; name: string; role: "USER" | "ADMIN" };
export type Tier = "VIP" | "PREMIUM" | "STANDARD";
export type EventItem = {
  id: number; title: string; venue: string; category: string; startsAt: string;
  priceCents: number; totalSeats: number; availableSeats: number;
  description: string | null; imageUrl: string | null;
  city: string; tiers: { tier: Tier; priceCents: number }[]; // most expensive first; STANDARD always present
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
type Session = { token: string; user: User };

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// shortcut: token in localStorage is readable by any XSS on this origin; move to an httpOnly cookie for production
const KEY = "seatlock.session";
const listeners = new Set<() => void>();
let cached: { raw: string | null; value: Session | null } = { raw: null, value: null };

function readSession(): Session | null {
  let raw: string | null = null;
  try { raw = localStorage.getItem(KEY); } catch { /* storage blocked */ }
  if (raw !== cached.raw) cached = { raw, value: raw ? (JSON.parse(raw) as Session) : null };
  return cached.value;
}

export function setSession(s: Session | null) {
  try { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

export function useSession(): Session | null {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    readSession,
    () => null,
  );
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = readSession();
  const headers = new Headers(init.headers);
  if (typeof init.body === "string") headers.set("Content-Type", "application/json"); // FormData sets its own boundary
  if (session) headers.set("Authorization", `Bearer ${session.token}`);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers, cache: "no-store" });
  } catch {
    throw new ApiError(0, "Can't reach the server. Is the backend running on " + API_URL + "?");
  }
  if (res.status === 401 && session) setSession(null); // expired token
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.detail ?? body?.title ?? `Request failed (${res.status})`);
  }
  return (res.status === 204 ? undefined : res.json()) as Promise<T>;
}

export const inr = (paise: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);

export const when = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", ...opts }).format(new Date(iso));

export const CATEGORIES = ["Concert", "Comedy", "Movie", "Theatre", "Sports", "Tech"] as const;

export const imageSrc = (e: { imageUrl: string | null }) => (e.imageUrl ? `${API_URL}${e.imageUrl}` : null);
