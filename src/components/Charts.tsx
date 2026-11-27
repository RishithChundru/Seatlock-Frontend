"use client";

import {
  Area, AreaChart as RAreaChart, Bar, BarChart as RBarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export type Point = { label: string; value: number; hint?: string };
type Props = { points: Point[]; format: (n: number) => string; label: string; empty?: string };

const AXIS = { fill: "var(--sl-text-subtle)", fontSize: 11 };

function ChartTooltip({ active, payload, format }: { active?: boolean; payload?: { payload: Point }[]; format: (n: number) => string }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2 text-sm shadow-[var(--sl-shadow-md)]">
      <p className="text-xs text-muted">{p.hint ?? p.label}</p>
      <p className="font-semibold tabular text-fg">{format(p.value)}</p>
    </div>
  );
}

/** Shared frame: fixed height, accessible label, and an empty-state message instead of a flat line at zero. */
function Frame({ label, isEmpty, empty, children }: { label: string; isEmpty: boolean; empty: string; children: React.ReactElement }) {
  return (
    <figure className="relative m-0 h-60 w-full" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      {isEmpty && <figcaption className="pointer-events-none absolute inset-0 grid place-items-center pb-6 text-sm text-subtle">{empty}</figcaption>}
    </figure>
  );
}

/** Weekly sales: area chart with a soft gradient (Recharts). */
export function AreaChart({ points, format, label, empty = "No sales in the last 8 weeks yet" }: Props) {
  const isEmpty = points.every((p) => p.value === 0);
  return (
    <Frame label={label} isEmpty={isEmpty} empty={empty}>
      <RAreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="sl-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--sl-accent)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--sl-accent)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--sl-border)" strokeDasharray="3 4" />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={76} tickFormatter={(n: number) => format(n)} allowDecimals={false} hide={isEmpty} />
        <Tooltip content={<ChartTooltip format={format} />} cursor={{ stroke: "var(--sl-border-strong)", strokeDasharray: "3 3" }} />
        <Area type="monotone" dataKey="value" stroke="var(--sl-accent-text)" strokeWidth={2.5} fill="url(#sl-area)"
          dot={{ r: 3, fill: "var(--sl-surface)", stroke: "var(--sl-accent-text)", strokeWidth: 2 }}
          activeDot={{ r: 5, fill: "var(--sl-accent)", stroke: "var(--sl-accent-text)", strokeWidth: 2 }} />
      </RAreaChart>
    </Frame>
  );
}

/** Monthly spend: bar chart, the latest month highlighted (Recharts). */
export function BarChart({ points, format, label, empty = "Nothing spent yet" }: Props) {
  const isEmpty = points.every((p) => p.value === 0);
  return (
    <Frame label={label} isEmpty={isEmpty} empty={empty}>
      <RBarChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--sl-border)" strokeDasharray="3 4" />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={76} tickFormatter={(n: number) => format(n)} allowDecimals={false} hide={isEmpty} />
        <Tooltip content={<ChartTooltip format={format} />} cursor={{ fill: "var(--sl-surface-sunken)" }} />
        <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={44}>
          {points.map((p, i) => <Cell key={p.label} fill={i === points.length - 1 ? "var(--sl-accent)" : "var(--sl-seat-open-border)"} />)}
        </Bar>
      </RBarChart>
    </Frame>
  );
}
