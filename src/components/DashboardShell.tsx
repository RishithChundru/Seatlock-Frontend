"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ComponentType, ReactNode, Suspense, SVGProps, useEffect, useState } from "react";
import { api, Organizer } from "@/lib/api";
import { useDashboardRole } from "@/lib/dashboard";
import Logo from "./Logo";
import ProfileMenu from "./ProfileMenu";
import SiteFrame from "./SiteFrame";
import ThemeToggle from "./ThemeToggle";
import {
  GlobeIcon, GridIcon, InboxIcon, ListIcon, MenuIcon, PlusIcon, ScanIcon, SidebarIcon, StoreIcon, UsersIcon, XIcon,
} from "./ui/Icons";

type Item = { href: string; label: string; icon: ComponentType<SVGProps<SVGSVGElement>>; badge?: number };
type Group = { title: string; items: Item[] };

/**
 * App chrome for every page. Organizers, staff and the super admin work in a full-height sidebar
 * (collapsible on desktop, a drawer on phones); visitors and customers get the top bar in SiteFrame.
 */
export default function DashboardShell({ children }: { children: ReactNode }) {
  return <Suspense><Chrome>{children}</Chrome></Suspense>;
}

function Chrome({ children }: { children: ReactNode }) {
  const d = useDashboardRole();
  if (!d.session || !d.manager) return <SiteFrame>{children}</SiteFrame>;
  return <Sidebar>{children}</Sidebar>;
}

function Sidebar({ children }: { children: ReactNode }) {
  const d = useDashboardRole();
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [pending, setPending] = useState(0);

  // Re-count on navigation so the badge drops after a review.
  useEffect(() => {
    if (d.superAdmin) api<Organizer[]>("/api/admin/organizers?status=PENDING").then((l) => setPending(l.length)).catch(() => {});
  }, [d.superAdmin, path]);

  const groups: Group[] = [
    { title: "General", items: [
      { href: "/admin", label: "Overview", icon: GridIcon },
      { href: "/admin/events", label: d.superAdmin ? "All events" : "Events", icon: ListIcon },
      ...(d.canCreate ? [{ href: "/admin/events/new", label: "Create event", icon: PlusIcon }] : []),
      { href: "/", label: "Live site", icon: GlobeIcon },
    ] },
    { title: "Operations", items: [
      ...(d.canScan ? [{ href: "/admin/checkin", label: "Scan tickets", icon: ScanIcon }] : []),
      ...(d.organizer && !d.pendingOrganizer ? [{ href: "/admin/staff", label: "Gate staff", icon: UsersIcon }] : []),
      ...(d.superAdmin ? [{ href: "/admin/organizers", label: "Organizer requests", icon: InboxIcon, badge: pending }] : []),
    ] },
    { title: "Settings", items: [
      ...(d.organizer ? [{ href: "/organizer", label: d.pendingOrganizer ? "Application" : "Public profile", icon: StoreIcon }] : []),
    ] },
  ].filter((g) => g.items.length > 0);
  const all = groups.flatMap((g) => g.items);
  // The most specific match wins; "/" (the live site) also owns /events/*.
  const active = all.filter((i) => path === i.href || (i.href === "/" ? path.startsWith("/events/") : path.startsWith(i.href + "/")))
    .sort((a, b) => b.href.length - a.href.length)[0];

  const link = (i: Item, compact: boolean) => {
    const on = i.href === active?.href;
    return (
      <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined} title={compact ? i.label : undefined} onClick={() => setDrawer(false)}
        className={`relative flex h-10 items-center gap-3 rounded-[var(--radius-md)] text-sm transition-colors ${compact ? "justify-center px-0" : "px-3"} ${
          on ? "bg-[var(--sidebar-active-bg)] font-medium text-[var(--sidebar-active-fg)]" : "text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-fg)]"}`}>
        {on && <span aria-hidden className="absolute -left-3 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[var(--marigold-400)]" />}
        <i.icon width={18} height={18} className="shrink-0" />
        {!compact && <span className="flex-1 truncate">{i.label}</span>}
        {!!i.badge && (
          <span className={`grid min-w-5 place-items-center rounded-full bg-[var(--marigold-400)] px-1.5 text-[11px] font-bold text-[#111827] ${compact ? "absolute -right-1 -top-1 h-4 min-w-4 text-[10px]" : "h-5"}`}>
            {i.badge}<span className="sr-only"> waiting</span>
          </span>
        )}
      </Link>
    );
  };

  const sidebar = (compact: boolean, inDrawer: boolean) => (
    <div className="flex h-full flex-col overflow-y-auto bg-[var(--sidebar-bg)] p-3 text-[var(--sidebar-fg)]">
      {/* Top: logo. Collapsed, hovering the logo turns it into the expand button. */}
      <div className="flex h-12 items-center justify-between gap-2 px-1 pb-3">
        {compact ? (
          <button type="button" onClick={() => setCollapsed(false)} aria-label="Expand sidebar" aria-expanded={false} title="Expand sidebar"
            className="group relative mx-auto grid h-10 w-10 place-items-center rounded-[var(--radius-md)] hover:bg-[var(--sidebar-hover)]">
            <span className="transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0"><Logo size={30} tone="onDark" showText={false} /></span>
            <SidebarIcon width={20} height={20} className="absolute text-[var(--sidebar-fg)] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
          </button>
        ) : (
          <>
            <Link href="/admin" aria-label="Dashboard home" onClick={() => setDrawer(false)}><Logo size={30} tone="onDark" className="text-lg" /></Link>
            <button type="button" onClick={() => (inDrawer ? setDrawer(false) : setCollapsed(true))}
              aria-label={inDrawer ? "Close menu" : "Collapse sidebar"} aria-expanded={inDrawer ? undefined : true} title={inDrawer ? undefined : "Collapse sidebar"}
              className="grid h-8 w-8 place-items-center rounded-[var(--radius-sm)] text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-fg)]">
              {inDrawer ? <XIcon width={18} height={18} /> : <SidebarIcon width={18} height={18} />}
            </button>
          </>
        )}
      </div>

      <nav aria-label="Dashboard" className="mt-2 flex flex-col gap-4">
        {groups.map((g) => (
          <div key={g.title}>
            {compact ? <div className="mx-3 mb-2 border-t border-[var(--sidebar-line)]" /> :
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--sidebar-muted)]/80">{g.title}</p>}
            <div className="flex flex-col gap-0.5">{g.items.map((i) => link(i, compact))}</div>
          </div>
        ))}
      </nav>

      <div className="mt-auto border-t border-[var(--sidebar-line)] pt-3">
        <ProfileMenu variant="sidebar" compact={compact} />
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh flex-1">
      <aside aria-label="Dashboard sidebar" className={`sticky top-0 hidden h-dvh shrink-0 transition-[width] duration-200 lg:block ${collapsed ? "w-[72px]" : "w-64"}`}>
        {sidebar(collapsed, false)}
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-[var(--sl-overlay)]" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] shadow-lg">{sidebar(false, true)}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <button type="button" onClick={() => setDrawer(true)} aria-label="Open menu"
            className="grid h-9 w-9 place-items-center rounded-[var(--radius-sm)] text-muted hover:bg-sunken hover:text-fg lg:hidden">
            <MenuIcon width={20} height={20} />
          </button>
          <h2 className="truncate font-display text-base font-semibold text-fg">{active?.label ?? "Dashboard"}</h2>
          <div className="ml-auto"><ThemeToggle /></div>
        </header>
        <main id="main" className="w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
