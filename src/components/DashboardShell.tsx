"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ComponentType, ReactNode, Suspense, SVGProps, useState } from "react";
import { signOut } from "@/lib/api";
import { useDashboardRole } from "@/lib/dashboard";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import {
  GlobeIcon, GridIcon, InboxIcon, ListIcon, LogoutIcon, MenuIcon, PlusIcon, ScanIcon, SidebarIcon, StoreIcon,
  TicketIcon, UserIcon, UsersIcon, XIcon,
} from "@/components/ui/Icons";

type Item = { href: string; label: string; icon: ComponentType<SVGProps<SVGSVGElement>> };

/**
 * Every signed-in page (customers, organizers, staff, super admin), public pages included, shares this shell: a full-height navy sidebar
 * with the sections for the role, collapsible to icons on desktop and a slide-in drawer on phones.
 */
export default function DashboardShell({ children }: { children: ReactNode }) {
  return <Suspense><Shell>{children}</Shell></Suspense>;
}

function Shell({ children }: { children: ReactNode }) {
  const d = useDashboardRole();
  const path = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  if (!d.session) return <main id="main" className="flex-1">{children}</main>; // the route guard sends visitors to sign in

  const items: Item[] = d.manager ? [
    { href: "/admin", label: "Overview", icon: GridIcon },
    { href: "/", label: "Browse events", icon: GlobeIcon },
    { href: "/admin/events", label: d.superAdmin ? "Manage events" : "My events", icon: ListIcon },
    ...(d.canCreate ? [{ href: "/admin/events/new", label: "Create event", icon: PlusIcon }] : []),
    ...(d.canScan ? [{ href: "/admin/checkin", label: "Scan tickets", icon: ScanIcon }] : []),
    ...(d.superAdmin ? [{ href: "/admin/organizers", label: "Organizer requests", icon: InboxIcon }] : []),
    ...(d.organizer && !d.pendingOrganizer ? [{ href: "/admin/staff", label: "Gate staff", icon: UsersIcon }] : []),
    ...(d.organizer ? [{ href: "/organizer", label: d.pendingOrganizer ? "Application" : "Public profile", icon: StoreIcon }] : []),
    { href: "/account", label: "Account", icon: UserIcon },
  ] : [
    { href: "/me", label: "Overview", icon: GridIcon },
    { href: "/", label: "Events", icon: GlobeIcon },
    { href: "/bookings", label: "My tickets", icon: TicketIcon },
    { href: "/account", label: "Account", icon: UserIcon },
  ];
  // The most specific match wins, so "Create event" isn't also highlighted as "Events".
  // "/" (the event list) also owns the event pages under /events.
  const active = items.filter((i) => path === i.href || (i.href === "/" ? path.startsWith("/events/") : path.startsWith(i.href + "/")))
    .sort((a, b) => b.href.length - a.href.length)[0];
  const user = d.session.user;
  const roleLabel = d.superAdmin ? "Super admin" : d.staff ? "Gate staff" : d.organizer ? "Organizer" : "Customer";
  const initials = user.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
  const leave = async () => { await signOut(); router.replace("/"); };

  const link = (i: Item, compact: boolean) => {
    const on = i.href === active?.href;
    return (
      <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined} title={compact ? i.label : undefined} onClick={() => setDrawer(false)}
        className={`flex items-center gap-3 rounded-[var(--radius-md)] py-2 text-sm transition-colors ${compact ? "justify-center px-0" : "px-3"} ${
          on ? "bg-[var(--sidebar-active-bg)] font-medium text-[var(--sidebar-active-fg)]" : "text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-fg)]"}`}>
        <i.icon width={18} height={18} className="shrink-0" />
        {!compact && <span className="truncate">{i.label}</span>}
      </Link>
    );
  };

  const sidebar = (compact: boolean, inDrawer: boolean) => (
    <div className="flex h-full flex-col bg-[var(--sidebar-bg)] p-3 text-[var(--sidebar-fg)]">
      <div className={`flex items-center gap-2 px-1 pb-4 pt-1 ${compact ? "flex-col" : "justify-between"}`}>
        <Link href="/" aria-label="Seatlock home" onClick={() => setDrawer(false)}><Logo size={30} tone="onDark" showText={!compact} className="text-lg" /></Link>
        {inDrawer ? (
          <button type="button" onClick={() => setDrawer(false)} aria-label="Close menu" className="grid h-8 w-8 place-items-center rounded-[var(--radius-sm)] text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-hover)]">
            <XIcon width={18} height={18} />
          </button>
        ) : (
          <button type="button" onClick={() => setCollapsed(!compact)} aria-label={compact ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!compact}
            className="grid h-8 w-8 place-items-center rounded-[var(--radius-sm)] text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-fg)]">
            <SidebarIcon width={18} height={18} />
          </button>
        )}
      </div>
      {!compact && <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--sidebar-muted)]">{roleLabel}</p>}
      <nav aria-label="Dashboard" className="flex flex-col gap-1">{items.map((i) => link(i, compact))}</nav>

      <div className="mt-auto pt-4">
        <div className={`flex items-center gap-3 rounded-[var(--radius-md)] bg-[var(--sidebar-hover)] p-2 ${compact ? "flex-col" : ""}`}>
          <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--marigold-400)] text-sm font-bold text-[var(--ink)]">{initials}</span>
          {!compact && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-[var(--sidebar-muted)]">{roleLabel}</p>
            </div>
          )}
          <button type="button" onClick={leave} aria-label="Sign out" title="Sign out"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius-sm)] text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-fg)]">
            <LogoutIcon width={17} height={17} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh flex-1">
      {/* Desktop sidebar, full height */}
      <aside aria-label="Dashboard sidebar" className={`sticky top-0 hidden h-dvh shrink-0 transition-[width] duration-200 lg:block ${collapsed ? "w-[72px]" : "w-64"}`}>
        {sidebar(collapsed, false)}
      </aside>

      {/* Phones and tablets: slide-in drawer */}
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
          <span className="lg:hidden"><Logo size={24} showText={false} /></span>
          <p className="truncate text-sm font-medium text-muted">{active?.label ?? "Dashboard"}</p>
          <div className="ml-auto"><ThemeToggle /></div>
        </header>
        <main id="main" className="w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
