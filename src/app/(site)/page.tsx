"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api, EventItem, EventPage, inr, when } from "@/lib/api";
import EventCover from "@/components/EventCover";
import Button from "@/components/ui/Button";
import { controlClass } from "@/components/ui/Field";
import { Alert, Skeleton } from "@/components/ui/Feedback";
import { PinIcon, SearchIcon } from "@/components/ui/Icons";

const PAGE_SIZE = 12;
const WHEN_OPTIONS = { any: "Any time", week: "Next 7 days", month: "Next 30 days" } as const;
const PRICE_OPTIONS = { any: "Any price", "50000": "Up to ₹500", "100000": "Up to ₹1,000", "200000": "Up to ₹2,000" } as const;

export default function Home() {
  return <Suspense><HomeView /></Suspense>;
}

function HomeView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const city = params.get("city") ?? "";
  const whenKey = (params.get("when") ?? "any") as keyof typeof WHEN_OPTIONS;
  const price = (params.get("price") ?? "any") as keyof typeof PRICE_OPTIONS;

  const [result, setResult] = useState<EventPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [text, setText] = useState(q);

  // Filters live in the URL so a search can be shared or bookmarked.
  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value && value !== "any") next.set(key, value); else next.delete(key);
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  };

  useEffect(() => {
    if (text === q) return;
    const t = setTimeout(() => setFilter("q", text.trim()), 300); // debounce typing
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when the typed text changes
  }, [text]);

  const query = (page: number) => {
    const s = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
    if (q) s.set("q", q);
    if (category) s.set("category", category);
    if (city) s.set("city", city);
    if (price !== "any") s.set("maxPrice", price);
    if (whenKey !== "any") s.set("to", new Date(Date.now() + (whenKey === "week" ? 7 : 30) * 86_400_000).toISOString());
    return `/api/events/search?${s}`;
  };

  useEffect(() => {
    api<EventPage>(query(0)).then((r) => { setResult(r); setError(null); }).catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- query() reads exactly these filters
  }, [q, category, city, whenKey, price]);

  const loadMore = async () => {
    if (!result) return;
    setLoadingMore(true);
    try {
      const next = await api<EventPage>(query(result.page + 1));
      setResult({ ...next, items: [...result.items, ...next.items] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingMore(false);
    }
  };

  const filtered = Boolean(q || category || city || whenKey !== "any" || price !== "any");
  const items = result?.items ?? [];
  const pill = (on: boolean) =>
    `h-8 shrink-0 rounded-full px-3.5 text-[13px] font-medium transition-colors ${on ? "bg-[var(--sl-action)] text-[var(--sl-on-action)]" : "bg-surface text-muted ring-1 ring-inset ring-[var(--sl-border)] hover:text-fg"}`;
  const select = `${controlClass} h-10 w-auto min-w-0 shrink-0 bg-surface pr-8 text-sm`;

  return (
    <div className="pt-2">
      {/* Search first: one bar, filters beside it */}
      <form role="search" onSubmit={(e) => { e.preventDefault(); setFilter("q", text.trim()); }}
        className="flex flex-wrap items-center gap-2 rounded-[var(--radius-lg)] border border-line bg-surface p-2 shadow-[var(--sl-shadow-sm)]">
        <label className="relative min-w-60 flex-[3]">
          <span className="sr-only">Search events</span>
          <SearchIcon width={18} height={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
          <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Search concerts, comedy, venues, artists…"
            className="h-10 w-full rounded-[var(--radius-md)] bg-transparent pl-10 pr-3 text-[15px] outline-none placeholder:text-subtle focus-visible:ring-2 focus-visible:ring-[var(--sl-focus)]" />
        </label>
        <div className="flex min-w-72 flex-[2] flex-wrap gap-2 [&>select]:min-w-28 [&>select]:flex-1">
          <label className="sr-only" htmlFor="city">City</label>
          <select id="city" value={city} onChange={(e) => setFilter("city", e.target.value)} className={select}>
            <option value="">All cities</option>
            {result?.cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <label className="sr-only" htmlFor="when">Date</label>
          <select id="when" value={whenKey} onChange={(e) => setFilter("when", e.target.value)} className={select}>
            {Object.entries(WHEN_OPTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <label className="sr-only" htmlFor="price">Price</label>
          <select id="price" value={price} onChange={(e) => setFilter("price", e.target.value)} className={select}>
            {Object.entries(PRICE_OPTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </form>

      <div className="mt-5 flex items-center gap-3">
        <div role="group" aria-label="Filter by category" className="-mx-1 flex flex-1 gap-2 overflow-x-auto px-1 py-1">
          {["", ...(result?.categories ?? [])].map((c) => (
            <button key={c || "all"} type="button" aria-pressed={category === c} onClick={() => setFilter("category", c)} className={pill(category === c)}>
              {c || "All events"}
            </button>
          ))}
        </div>
        {result && result.total > 0 && <p className="shrink-0 text-sm text-subtle tabular" aria-live="polite">{result.total} event{result.total === 1 ? "" : "s"}</p>}
      </div>

      {error && <div className="mt-6"><Alert>{error}</Alert></div>}

      {result === null && !error && (
        <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Skeleton key={i} className="aspect-[4/5]" />)}
        </div>
      )}

      {result?.total === 0 && (
        <div className="mt-5 grid place-items-center rounded-[var(--radius-lg)] border border-dashed border-line-strong bg-surface px-6 py-16 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-sunken text-subtle"><SearchIcon width={22} height={22} /></span>
          <p className="mt-3 font-medium">{filtered ? "No events match those filters" : "No events on sale yet"}</p>
          <p className="mt-1 text-sm text-muted">{filtered ? "Try another city, date or category." : "New shows appear here as soon as organizers publish them."}</p>
          {filtered && <Button variant="secondary" size="sm" className="mt-4" onClick={() => { setText(""); router.replace(pathname, { scroll: false }); }}>Clear filters</Button>}
        </div>
      )}

      {items.length > 0 && (
        <section aria-label="Events" className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {items.map((e) => <EventCard key={e.id} event={e} />)}
        </section>
      )}

      {result && result.items.length < result.total && (
        <div className="mt-8 text-center">
          <Button variant="secondary" onClick={loadMore} disabled={loadingMore}>{loadingMore ? "Loading…" : "Show more"}</Button>
        </div>
      )}
    </div>
  );
}

/** Compact poster card: cover with a date badge, title, venue, price and seats left. */
function EventCard({ event: e }: { event: EventItem }) {
  const soldOut = e.availableSeats === 0;
  const low = !soldOut && e.availableSeats / Math.max(1, e.totalSeats) < 0.2;
  return (
    <Link href={`/events/${e.id}`}
      className="group flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[var(--sl-shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--sl-shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sl-focus)]">
      <div className="relative aspect-[4/3] overflow-hidden">
        <EventCover event={e} sizes="card" className="transition-transform duration-500 group-hover:scale-[1.04]" />
        <span className="absolute left-2.5 top-2.5 flex flex-col items-center rounded-[var(--radius-md)] bg-surface/95 px-2 py-1 leading-none shadow-sm backdrop-blur">
          <span className="text-[10px] font-semibold uppercase text-accent-fg">{when(e.startsAt, { month: "short" })}</span>
          <span className="font-display text-lg font-bold tabular">{when(e.startsAt, { day: "numeric" })}</span>
        </span>
        <span className="absolute right-2.5 top-2.5 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">{e.category}</span>
        {(soldOut || low) && (
          <span className={`absolute bottom-2.5 left-2.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${soldOut ? "bg-black/75 text-white" : "bg-[var(--marigold-400)] text-[#111827]"}`}>
            {soldOut ? "Sold out" : `Only ${e.availableSeats} left`}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-3.5">
        <h2 className="line-clamp-2 font-display text-[15px] font-semibold leading-snug tracking-tight">{e.title}</h2>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted"><PinIcon width={13} height={13} className="shrink-0 text-subtle" /><span className="truncate">{e.venue}{e.city ? `, ${e.city}` : ""}</span></p>
        <p className="mt-0.5 text-xs text-subtle tabular">{when(e.startsAt, { weekday: "short", hour: "numeric", minute: "2-digit" })}</p>
        <div className="mt-auto flex items-center justify-between pt-3">
          <p className="text-sm font-semibold tabular"><span className="mr-1 text-[11px] font-normal text-subtle">from</span>{inr(e.priceCents)}</p>
          <span className="text-xs font-medium text-accent-fg opacity-0 transition-opacity group-hover:opacity-100">Book →</span>
        </div>
      </div>
    </Link>
  );
}
