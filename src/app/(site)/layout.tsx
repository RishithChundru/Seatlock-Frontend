import DashboardShell from "@/components/DashboardShell";

/** Public pages: top bar for visitors and customers, the sidebar for organizers, staff and the super admin. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
