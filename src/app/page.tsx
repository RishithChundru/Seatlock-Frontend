"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api, EventItem, EventPage, inr, when } from "@/lib/api";
import EventCover from "@/components/EventCover";
import Button from "@/components/ui/Button";
import { controlClass } from "@/components/ui/Field";
import { Alert, Skeleton } from "@/components/ui/Feedback";
import { PinIcon } from "@/components/ui/Icons";

const PAGE_SIZE = 9;
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
  const [featured, ...rest] = filtered ? [undefined, ...items] : items;

  return (
    <>
      <section className="border-b border-line pb-10 pt-12 sm:pb-14 sm:pt-20">
        <p className="eyebrow">Now booking</p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          Live events, and seats that stay yours.
        </h1>
        <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-muted">
          Tap a seat and it&apos;s held for you for five minutes. Nobody else can take it while you check out.
        </p>
      </section>

      {/* Search and filters */}
      <form role="search" onSubmit={(e) => { e.preventDefault(); setFilter("q", text.trim()); }}
        className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <label className="sr-only" htmlFor="q">Search events</label>
        <input id="q" type="search" value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Search events, venues, artists" className={`${controlClass} h-11`} />
        <label className="sr-only" htmlFor="city">City</label>
        <select id="city" value={city} onChange={(e) => setFilter("city", e.target.value)} className={`${controlClass} h-11`}>
          <option value="">All cities</option>
          {result?.cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="sr-only" htmlFor="when">Date</label>
        <select id="when" value={whenKey} onChange={(e) => setFilter("when", e.target.value)} className={`${controlClass} h-11`}>
          {Object.entries(WHEN_OPTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label className="sr-only" htmlFor="price">Price</label>
        <select id="price" value={price} onChange={(e) => setFilter("price", e.target.value)} className={`${controlClass} h-11`}>
          {Object.entries(PRICE_OPTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </form>

      <div role="group" aria-label="Filter by category" className="-mx-1 mt-4 flex gap-1 overflow-x-auto px-1 pb-1">
        {["", ...(result?.categories ?? [])].map((c) => (
          <button
            key={c || "all"}
            aria-pressed={category === c}
            onClick={() => setFilter("category", c)}
            className={`h-9 shrink-0 rounded-full border px-4 text-sm transition-colors ${
              category === c ? "border-fg bg-fg text-bg" : "border-line-strong text-muted hover:border-fg hover:text-fg"
            }`}
          >
            {c || "All"}
          </button>
        ))}
      </div>

      {error && <div className="mt-8"><Alert>{error}</Alert></div>}

      {result === null && !error && (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="aspect-[3/2] sm:col-span-2 lg:col-span-3 lg:aspect-[3/1]" />
          {[0, 1, 2].map((i) => <Skeleton key={i} className="aspect-[4/5]" />)}
        </div>
      )}

      {result && (
        <p className="mt-6 text-sm text-subtle" aria-live="polite">
          {result.total === 0 ? "" : `${result.total} event${result.total === 1 ? "" : "s"}`}
        </p>
      )}

      {result?.total === 0 && (
        <div className="mt-6 rounded-[var(--card-radius)] border border-dashed border-line-strong px-6 py-14 text-center">
          <p className="text-muted">{filtered ? "No events match those filters." : "No events on sale yet. Check back soon."}</p>
          {filtered && <Button variant="secondary" className="mt-4" onClick={() => { setText(""); router.replace(pathname, { scroll: false }); }}>Clear filters</Button>}
        </div>
      )}

      {featured && <FeaturedCard event={featured} />}

      {rest.length > 0 && (
        <section aria-label="Events" className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((e) => e && <EventCard key={e.id} event={e} />)}
        </section>
      )}

      {result && result.items.length < result.total && (
        <div className="mt-10 text-center">
          <Button variant="secondary" onClick={loadMore} disabled={loadingMore}>{loadingMore ? "Loading…" : "Load more"}</Button>
        </div>
      )}
    </>
  );
}

function Availability({ event: e }: { event: EventItem }) {
  const left = e.availableSeats / Math.max(1, e.totalSeats);
  const low = left < 0.2;
  return (
    <div className="min-w-24">
      <p className={`text-right text-xs tabular ${low ? "font-medium text-warning" : "text-subtle"}`}>
        {e.availableSeats === 0 ? "Sold out" : low ? `Only ${e.availableSeats} left` : `${e.availableSeats} seats left`}
      </p>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-sunken" aria-hidden>
        <div className={`h-full rounded-full ${low ? "bg-warning" : "bg-fg/70"}`} style={{ width: `${left * 100}%` }} />
      </div>
    </div>
  );
}

function Meta({ event: e }: { event: EventItem }) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
      <span className="tabular">{when(e.startsAt, { weekday: "short", day: "numeric", month: "short" })} · {when(e.startsAt, { hour: "numeric", minute: "2-digit" })}</span>
      <span className="inline-flex items-center gap-1"><PinIcon className="text-subtle" />{e.venue}</span>
    </p>
  );
}

function FeaturedCard({ event: e }: { event: EventItem }) {
  return (
    <Link
      href={`/events/${e.id}`}
      className="group mt-6 grid overflow-hidden rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] transition-shadow hover:shadow-md md:grid-cols-[1.4fr_1fr]"
    >
      <div className="aspect-[16/10] overflow-hidden md:aspect-auto md:min-h-80">
        <EventCover event={e} sizes="lg" className="transition-transform duration-500 group-hover:scale-[1.02]" />
      </div>
      <div className="flex flex-col p-6 sm:p-8">
        <p className="eyebrow text-accent-fg">Featured · {e.category}</p>
        <h2 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{e.title}</h2>
        <div className="mt-3"><Meta event={e} /></div>
        {e.description && <p className="mt-4 line-clamp-3 leading-relaxed text-muted">{e.description}</p>}
        <div className="mt-auto flex items-end justify-between gap-4 pt-8">
          <div>
            <p className="text-xs text-subtle">From</p>
            <p className="font-display text-2xl font-semibold tabular">{inr(e.priceCents)}</p>
          </div>
          <Availability event={e} />
        </div>
      </div>
    </Link>
  );
}

function EventCard({ event: e }: { event: EventItem }) {
  return (
    <Link
      href={`/events/${e.id}`}
      className="group flex flex-col overflow-hidden rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] transition-shadow hover:shadow-md"
    >
      <div className="aspect-[3/2] overflow-hidden">
        <EventCover event={e} className="transition-transform duration-500 group-hover:scale-[1.03]" />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="eyebrow">{e.category}</p>
        <h2 className="mt-2 font-display text-xl font-semibold leading-snug tracking-tight">{e.title}</h2>
        <div className="mt-2"><Meta event={e} /></div>
        <div className="mt-auto flex items-end justify-between gap-4 pt-6">
          <p className="font-semibold tabular"><span className="mr-1 text-xs font-normal text-subtle">from</span>{inr(e.priceCents)}</p>
          <Availability event={e} />
        </div>
      </div>
    </Link>
  );
}
