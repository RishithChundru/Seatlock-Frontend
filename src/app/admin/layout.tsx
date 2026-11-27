"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ComponentType, ReactNode, Suspense, SVGProps, useState } from "react";
import { useDashboardRole } from "@/lib/dashboard";
import {
  GlobeIcon, GridIcon, InboxIcon, ListIcon, PlusIcon, ScanIcon, SidebarIcon, StoreIcon, UsersIcon,
} from "@/components/ui/Icons";

type Item = { href: string; label: string; icon: ComponentType<SVGProps<SVGSVGElement>> };

/** Dashboard shell: a collapsible sidebar on desktop, a scrollable tab bar on phones. Sections depend on the role. */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <Suspense><Shell>{children}</Shell></Suspense>;
}

function Shell({ children }: { children: ReactNode }) {
  const d = useDashboardRole();
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  if (!d.manager) return <>{children}</>; // the pages explain who they're for

  const items: Item[] = [
    { href: "/admin", label: "Overview", icon: GridIcon },
    { href: "/admin/events", label: d.superAdmin ? "All events" : "Events", icon: ListIcon },
    ...(d.canCreate ? [{ href: "/admin/events/new", label: "Create event", icon: PlusIcon }] : []),
    ...(d.canScan ? [{ href: "/admin/checkin", label: "Scan tickets", icon: ScanIcon }] : []),
    ...(d.superAdmin ? [{ href: "/admin/organizers", label: "Organizer requests", icon: InboxIcon }] : []),
    ...(d.organizer && !d.pendingOrganizer ? [{ href: "/admin/staff", label: "Gate staff", icon: UsersIcon }] : []),
    ...(d.organizer ? [{ href: "/organizer", label: d.pendingOrganizer ? "Application" : "Public profile", icon: StoreIcon }] : []),
  ];
  const browse: Item = { href: "/", label: "Browse live site", icon: GlobeIcon };
  // The most specific match wins, so "Create event" isn't also highlighted as "Events".
  const active = items.filter((i) => path === i.href || path.startsWith(i.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const roleLabel = d.superAdmin ? "Super admin" : d.staff ? "Gate staff" : "Organizer";

  const link = (i: Item, compact: boolean) => {
    const on = i.href === active;
    return (
      <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined} title={compact ? i.label : undefined}
        className={`flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm transition-colors ${
          on ? "bg-accent-subtle font-medium text-accent-fg" : "text-muted hover:bg-sunken hover:text-fg"} ${compact ? "justify-center px-0" : ""}`}>
        <i.icon width={18} height={18} className="shrink-0" />
        {!compact && <span className="truncate">{i.label}</span>}
      </Link>
    );
  };

  return (
    <div className="pt-6 lg:flex lg:gap-8">
      {/* Desktop: collapsible sidebar */}
      <aside aria-label="Dashboard" className={`hidden shrink-0 transition-[width] duration-200 lg:block ${collapsed ? "w-14" : "w-56"}`}>
        <div className="sticky top-20 flex flex-col gap-1 rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-2 shadow-[var(--card-shadow)]">
          <div className={`flex items-center px-2 pb-2 pt-1 ${collapsed ? "justify-center" : "justify-between"}`}>
            {!collapsed && <span className="eyebrow">{roleLabel}</span>}
            <button type="button" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed} className="grid h-8 w-8 place-items-center rounded-[var(--radius-sm)] text-muted hover:bg-sunken hover:text-fg">
              <SidebarIcon width={18} height={18} />
            </button>
          </div>
          <nav className="flex flex-col gap-1">{items.map((i) => link(i, collapsed))}</nav>
          <div className="my-1 border-t border-line" />
          {link(browse, collapsed)}
        </div>
      </aside>

      {/* Phones and tablets: the same sections as a scrollable tab bar */}
      <nav aria-label="Dashboard" className="-mx-4 mb-6 flex gap-2 overflow-x-auto border-b border-line px-4 pb-3 lg:hidden">
        {[...items, browse].map((i) => {
          const on = i.href === active;
          return (
            <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${
                on ? "border-transparent bg-fg text-bg" : "border-line bg-surface text-muted"}`}>
              <i.icon width={15} height={15} /> {i.label}
            </Link>
          );
        })}
      </nav>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
