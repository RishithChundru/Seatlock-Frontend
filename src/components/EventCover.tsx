import { EventItem, imageSrc, when } from "@/lib/api";

/**
 * Uploaded cover photo, or a typographic poster when there is none, so the grid never
 * looks broken while organisers haven't added images yet.
 */
const POSTERS = [["#1e3a8a", "#3b5bdb"], ["#0f1b3d", "#1e3a8a"], ["#b45309", "#f59e0b"], ["#312e81", "#6d28d9"], ["#134e4a", "#0f766e"], ["#7f1d1d", "#c2410c"]];

export default function EventCover({ event, className = "", sizes = "md" }: { event: EventItem; className?: string; sizes?: "sm" | "md" | "lg" | "card" }) {
  const src = imageSrc(event);
  if (src) {
    // Plain <img>: covers come from the API host with immutable cache headers; next/image optimisation adds nothing here.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" loading="lazy" className={`h-full w-full object-cover ${className}`} />;
  }
  if (sizes === "card") {
    // Grid cards show the date in a badge already, so the stand-in poster is just a gradient.
    const [from, to] = POSTERS[event.id % POSTERS.length];
    return (
      <div aria-hidden className={`relative h-full w-full overflow-hidden ${className}`} style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
        <span className="absolute -bottom-8 -right-8 h-36 w-36 rounded-full border-[14px] border-white/10" />
        <span className="absolute -bottom-2 -right-2 h-20 w-20 rounded-full border-[10px] border-white/10" />
      </div>
    );
  }
  const big = sizes === "lg" ? "text-6xl sm:text-7xl" : sizes === "md" ? "text-5xl" : "text-2xl";
  return (
    <div aria-hidden className={`relative flex h-full w-full flex-col justify-end overflow-hidden bg-sunken p-4 ${className}`}>
      <span className={`font-display font-semibold leading-none tracking-tight text-fg/85 ${big}`}>
        {when(event.startsAt, { day: "numeric" })}
        <span className="ml-2 align-top text-[0.35em] font-normal tracking-normal text-muted">{when(event.startsAt, { month: "short" })}</span>
      </span>
      <span className="absolute -right-6 -top-6 h-28 w-28 rounded-full border border-line-strong" />
      <span className="absolute -right-2 -top-2 h-20 w-20 rounded-full border border-line" />
    </div>
  );
}
