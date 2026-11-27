"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ComponentType, ReactNode, Suspense, SVGProps, useEffect, useState } from "react";
import { api, Organizer, signOut } from "@/lib/api";
import { useDashboardRole } from "@/lib/dashboard";
import { initialsOf } from "./HostCard";
import Logo from "./Logo";
import SiteFrame from "./SiteFrame";
import ThemeToggle from "./ThemeToggle";
import {
  GlobeIcon, GridIcon, InboxIcon, ListIcon, LogoutIcon, MenuIcon, PlusIcon, ScanIcon, SidebarIcon, StoreIcon,
  UserIcon, UsersIcon, XIcon,
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
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [org, setOrg] = useState<Organizer | null>(null);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    if (d.organizer) api<Organizer | undefined>("/api/organizer/me").then((o) => setOrg(o ?? null)).catch(() => {});
  }, [d.organizer]);
  // Re-count on navigation so the badge drops after a review.
  useEffect(() => {
    if (d.superAdmin) api<Organizer[]>("/api/admin/organizers?status=PENDING").then((l) => setPending(l.length)).catch(() => {});
  }, [d.superAdmin, path]);

  const user = d.session!.user;
  const roleLabel = d.superAdmin ? "Super admin" : d.staff ? "Gate staff" : d.pendingOrganizer ? "Organizer · in review" : "Organizer";
  const workspace = d.organizer ? org?.name ?? "Your organization" : d.superAdmin ? "Seatlock HQ" : "Gate team";

  const groups: Group[] = [
    { title: "General", items: [
      { href: "/admin", label: "Overview", icon: GridIcon },
      { href: "/admin/events", label: d.superAdmin ? "All events" : "Events", icon: ListIcon },
      { href: "/", label: "Live site", icon: GlobeIcon },
    ] },
    { title: "Operations", items: [
      ...(d.canScan ? [{ href: "/admin/checkin", label: "Scan tickets", icon: ScanIcon }] : []),
      ...(d.organizer && !d.pendingOrganizer ? [{ href: "/admin/staff", label: "Gate staff", icon: UsersIcon }] : []),
      ...(d.superAdmin ? [{ href: "/admin/organizers", label: "Organizer requests", icon: InboxIcon, badge: pending }] : []),
    ] },
    { title: "Settings", items: [
      ...(d.organizer ? [{ href: "/organizer", label: d.pendingOrganizer ? "Application" : "Public profile", icon: StoreIcon }] : []),
      { href: "/account", label: "Account", icon: UserIcon },
    ] },
  ].filter((g) => g.items.length > 0);
  const all = [...groups.flatMap((g) => g.items), { href: "/admin/events/new", label: "Create event", icon: PlusIcon }];
  // The most specific match wins; "/" (the live site) also owns /events/*.
  const active = all.filter((i) => path === i.href || (i.href === "/" ? path.startsWith("/events/") : path.startsWith(i.href + "/")))
    .sort((a, b) => b.href.length - a.href.length)[0];
  const leave = async () => { await signOut(); router.replace("/"); };

  const link = (i: Item, compact: boolean) => {
    const on = i.href === active?.href;
    return (
      <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined} title={compact ? i.label : undefined} onClick={() => setDrawer(false)}
        className={`relative flex items-center gap-3 rounded-[var(--radius-md)] py-2 text-sm transition-colors ${compact ? "justify-center px-0" : "px-3"} ${
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
      <div className={`flex items-center gap-2 px-1 pb-4 pt-1 ${compact ? "flex-col" : "justify-between"}`}>
        <Link href="/admin" aria-label="Dashboard home" onClick={() => setDrawer(false)}><Logo size={30} tone="onDark" showText={!compact} className="text-lg" /></Link>
        <button type="button" onClick={() => (inDrawer ? setDrawer(false) : setCollapsed(!compact))}
          aria-label={inDrawer ? "Close menu" : compact ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={inDrawer ? undefined : !compact}
          className="grid h-8 w-8 place-items-center rounded-[var(--radius-sm)] text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-fg)]">
          {inDrawer ? <XIcon width={18} height={18} /> : <SidebarIcon width={18} height={18} />}
        </button>
      </div>

      {/* Whose workspace this is */}
      <div className={`flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--sidebar-line)] p-2 ${compact ? "justify-center" : ""}`}>
        {org?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- small cached logo
          <img src={org.logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-[var(--radius-sm)] bg-white object-cover" />
        ) : (
          <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-[var(--sidebar-active-bg)] text-xs font-bold text-[var(--marigold-400)]">{initialsOf(workspace)}</span>
        )}
        {!compact && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{workspace}</p>
            <p className="truncate text-xs text-[var(--sidebar-muted)]">{roleLabel}</p>
          </div>
        )}
      </div>

      {d.canCreate && (
        <Link href="/admin/events/new" onClick={() => setDrawer(false)} title={compact ? "Create event" : undefined}
          className={`mt-3 flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--marigold-400)] text-sm font-semibold text-[#111827] transition hover:brightness-105 ${path === "/admin/events/new" ? "ring-2 ring-white/40" : ""}`}>
          <PlusIcon width={18} height={18} />{!compact && "Create event"}
        </Link>
      )}

      <nav aria-label="Dashboard" className="mt-4 flex flex-col gap-4">
        {groups.map((g) => (
          <div key={g.title}>
            {compact ? <div className="mx-2 mb-2 border-t border-[var(--sidebar-line)]" /> :
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--sidebar-muted)]/80">{g.title}</p>}
            <div className="flex flex-col gap-0.5">{g.items.map((i) => link(i, compact))}</div>
          </div>
        ))}
      </nav>

      <div className="mt-auto pt-4">
        <div className={`flex items-center gap-3 rounded-[var(--radius-md)] bg-[var(--sidebar-hover)] p-2 ${compact ? "flex-col" : ""}`}>
          <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--marigold-400)] text-sm font-bold text-[#111827]">{initialsOf(user.name)}</span>
          {!compact && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-[var(--sidebar-muted)]">{user.email}</p>
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
      <aside aria-label="Dashboard sidebar" className={`sticky top-0 hidden h-dvh shrink-0 transition-[width] duration-200 lg:block ${collapsed ? "w-[76px]" : "w-64"}`}>
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
          <p className="truncate text-sm text-subtle">
            <span className="hidden sm:inline">{workspace} / </span><span className="font-medium text-fg">{active?.label ?? "Dashboard"}</span>
          </p>
          <div className="ml-auto"><ThemeToggle /></div>
        </header>
        <main id="main" className="w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
