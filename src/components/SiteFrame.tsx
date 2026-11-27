"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ComponentType, ReactNode, SVGProps } from "react";
import { useSession } from "@/lib/api";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import Button from "./ui/Button";
import ProfileMenu from "./ProfileMenu";
import { GlobeIcon, GridIcon, TicketIcon } from "./ui/Icons";

type Tab = { href: string; label: string; icon: ComponentType<SVGProps<SVGSVGElement>> };
const TABS: Tab[] = [
  { href: "/", label: "Events", icon: GlobeIcon },
  { href: "/bookings", label: "My tickets", icon: TicketIcon },
  { href: "/me", label: "Overview", icon: GridIcon },
];
const isOn = (href: string, path: string) => href === "/" ? path === "/" || path.startsWith("/events/") : path === href || path.startsWith(href + "/");

/**
 * Visitors and customers: a top bar with segmented tabs and an account menu, plus a bottom tab bar on phones.
 * Organizers, staff and the super admin get the sidebar shell instead.
 */
export default function SiteFrame({ children }: { children: ReactNode }) {
  const session = useSession();
  const path = usePathname();
  const tabs = session ? TABS : TABS.slice(0, 1);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link href="/" aria-label="Seatlock home" className="text-xl"><Logo size={30} /></Link>
          <nav aria-label="Main" className="mx-auto hidden items-center gap-1 rounded-full bg-sunken p-1 md:flex">
            {tabs.map((t) => {
              const on = isOn(t.href, path);
              return (
                <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition ${on ? "bg-surface text-fg shadow-[var(--sl-shadow-sm)] ring-1 ring-[var(--sl-border)]" : "text-muted hover:text-fg"}`}>
                  <t.icon width={16} height={16} className={on ? "text-accent-fg" : ""} />{t.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <ThemeToggle />
            {session ? <ProfileMenu variant="topbar" /> : (
              <>
                <Link href="/organizer/signup" className="hidden px-2 text-sm text-muted hover:text-fg sm:inline">Host events</Link>
                <Button href="/login" size="sm">Sign in</Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="main" className={`mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6 sm:px-6 sm:pt-8 ${session ? "pb-28 md:pb-16" : ""}`}>{children}</main>

      <footer className="hidden border-t border-line md:block">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-subtle sm:px-6">
          <Logo size={20} className="text-sm text-muted" />
          <Link href="/organizer/signup" className="hover:text-fg">Host events on Seatlock</Link>
        </div>
      </footer>

      {/* Phones: app-style bottom tabs for signed-in customers */}
      {session && (
        <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
          {TABS.map((t) => {
            const on = isOn(t.href, path);
            return (
              <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${on ? "text-accent-fg" : "text-subtle"}`}>
                <t.icon width={20} height={20} />{t.label}
              </Link>
            );
          })}
        </nav>
      )}
    </>
  );
}
