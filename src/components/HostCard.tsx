import type { Host } from "@/lib/api";
import { PinIcon } from "@/components/ui/Icons";

/** "Rishith Events" -> "RE": the fallback logo when an organizer hasn't uploaded one. */
export const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

/** "Hosted by" block: the organizer's public profile, as customers see it on an event page. */
export default function HostCard({ host, className = "" }: { host: Host; className?: string }) {
  const initials = initialsOf(host.name);
  return (
    <section aria-labelledby={`host-${host.id}`} className={`rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-5 ${className}`}>
      <p className="eyebrow">Hosted by</p>
      <div className="mt-3 flex items-start gap-3">
        {host.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- tiny, already sized and cached; nothing for next/image to add
          <img src={host.logoUrl} alt={`${host.name} logo`} width={44} height={44} className="h-11 w-11 shrink-0 rounded-full border border-line bg-white object-cover" />
        ) : (
          <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-subtle font-display text-base font-semibold text-accent-fg">{initials}</span>
        )}
        <div className="min-w-0">
          <h2 id={`host-${host.id}`} className="font-display text-lg font-semibold leading-tight">{host.name}</h2>
          <p className="mt-0.5 inline-flex items-center gap-1 text-sm text-muted"><PinIcon className="text-subtle" />{host.city}</p>
        </div>
      </div>
      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">{host.about}</p>
      <dl className="mt-4 grid gap-1.5 text-sm">
        <div className="flex gap-2"><dt className="w-16 shrink-0 text-subtle">Email</dt><dd className="min-w-0 break-all"><a href={`mailto:${host.contactEmail}`} className="hover:text-accent-fg">{host.contactEmail}</a></dd></div>
        <div className="flex gap-2"><dt className="w-16 shrink-0 text-subtle">Phone</dt><dd><a href={`tel:${host.contactPhone.replace(/[^+\d]/g, "")}`} className="tabular hover:text-accent-fg">{host.contactPhone}</a></dd></div>
        {host.website && (
          <div className="flex gap-2"><dt className="w-16 shrink-0 text-subtle">Website</dt><dd className="min-w-0 break-all"><a href={host.website} target="_blank" rel="noopener noreferrer nofollow" className="hover:text-accent-fg">{host.website.replace(/^https?:\/\//, "")}</a></dd></div>
        )}
      </dl>
    </section>
  );
}
