import { EventItem, imageSrc, when } from "@/lib/api";

/**
 * Uploaded cover photo, or a typographic poster when there is none, so the grid never
 * looks broken while organisers haven't added images yet.
 */
export default function EventCover({ event, className = "", sizes = "md" }: { event: EventItem; className?: string; sizes?: "sm" | "md" | "lg" }) {
  const src = imageSrc(event);
  if (src) {
    // Plain <img>: covers come from the API host with immutable cache headers; next/image optimisation adds nothing here.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" loading="lazy" className={`h-full w-full object-cover ${className}`} />;
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
