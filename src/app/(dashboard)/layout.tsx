import DashboardShell from "@/components/DashboardShell";

/** Signed-in pages: the sidebar shell (the route guard sends visitors to sign in). */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
