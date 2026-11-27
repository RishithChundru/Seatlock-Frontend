import type { ComponentType, ReactNode, SVGProps } from "react";
import { Skeleton } from "@/components/ui/Feedback";

/** Page header used by every dashboard section. */
export function PageHeader({ eyebrow, title, actions, children }: { eyebrow?: string; title: string; actions?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {children && <div className="mt-1.5 text-muted">{children}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** White card with an optional title row and action. */
export function Panel({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-[var(--card-shadow)] ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="font-display text-base font-bold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Headline number with an icon chip and an optional change line ("+12% vs last week"). */
export function StatCard({ label, value, icon: Icon, change, trend }: {
  label: string; value: string | null; icon: ComponentType<SVGProps<SVGSVGElement>>; change?: string; trend?: "up" | "down" | "flat";
}) {
  const tone = trend === "up" ? "text-success" : trend === "down" ? "text-danger" : "text-subtle";
  return (
    <div className="rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-[var(--card-shadow)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted">{label}</p>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-subtle text-accent-fg"><Icon width={17} height={17} /></span>
      </div>
      {value === null ? <Skeleton className="mt-1 h-8 w-24" /> : <p className="mt-1 font-display text-2xl font-bold tabular">{value}</p>}
      {change && <p className={`mt-1 text-xs tabular ${tone}`}>{change}</p>}
    </div>
  );
}

/** Week-over-week change as text and trend. */
export function change(now: number, before: number): { text: string; trend: "up" | "down" | "flat" } {
  if (before === 0) return now === 0 ? { text: "No change vs last week", trend: "flat" } : { text: "New this week", trend: "up" };
  const pct = Math.round(((now - before) / before) * 100);
  return { text: `${pct > 0 ? "+" : ""}${pct}% vs last week`, trend: pct > 0 ? "up" : pct < 0 ? "down" : "flat" };
}

/** Booking status pill for tables. */
export function StatusPill({ status, checkedIn }: { status: "CONFIRMED" | "CANCELLED"; checkedIn?: boolean }) {
  const [text, cls] = status === "CANCELLED" ? ["Cancelled", "bg-danger-subtle text-danger"]
    : checkedIn ? ["Checked in", "bg-success-subtle text-success"] : ["Confirmed", "bg-accent-subtle text-accent-fg"];
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{text}</span>;
}

/** Table wrapper: horizontal scroll on small screens instead of squashing columns. */
export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs text-subtle">{head.map((h) => <th key={h} scope="col" className="py-2 pr-4 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}
