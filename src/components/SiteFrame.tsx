"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ComponentType, ReactNode, SVGProps, useEffect, useRef, useState } from "react";
import { signOut, useSession } from "@/lib/api";
import { initialsOf } from "./HostCard";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import Button from "./ui/Button";
import { GlobeIcon, GridIcon, LogoutIcon, TicketIcon, UserIcon } from "./ui/Icons";

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
            {session ? <AccountMenu name={session.user.name} email={session.user.email} /> : (
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
        <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
          {[...TABS, { href: "/account", label: "Account", icon: UserIcon }].map((t) => {
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

function AccountMenu({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);
  const leave = async () => { setOpen(false); await signOut(); router.replace("/"); };
  const item = "flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm text-muted hover:bg-sunken hover:text-fg";

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu" aria-label="Account menu"
        className="flex items-center gap-2 rounded-full p-0.5 pr-0.5 ring-1 ring-[var(--sl-border)] transition hover:ring-[var(--sl-border-strong)] sm:pr-3">
        <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-[var(--sl-action)] text-xs font-bold text-[var(--sl-on-action)]">{initialsOf(name)}</span>
        <span className="hidden max-w-32 truncate text-sm font-medium sm:inline">{name.split(" ")[0]}</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-60 rounded-[var(--radius-lg)] border border-line bg-surface p-1.5 shadow-[var(--sl-shadow-md)]">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="truncate text-xs text-subtle">{email}</p>
          </div>
          <div className="my-1 border-t border-line" />
          <Link role="menuitem" href="/me" className={item} onClick={() => setOpen(false)}><GridIcon width={16} height={16} />Overview</Link>
          <Link role="menuitem" href="/bookings" className={item} onClick={() => setOpen(false)}><TicketIcon width={16} height={16} />My tickets</Link>
          <Link role="menuitem" href="/account" className={item} onClick={() => setOpen(false)}><UserIcon width={16} height={16} />Account</Link>
          <div className="my-1 border-t border-line" />
          <button role="menuitem" type="button" onClick={leave} className={`${item} w-full`}><LogoutIcon width={16} height={16} />Sign out</button>
        </div>
      )}
    </div>
  );
}
