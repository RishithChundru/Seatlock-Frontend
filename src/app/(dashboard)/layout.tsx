import DashboardShell from "@/components/DashboardShell";

/** Signed-in pages: sidebar for managers, top bar for customers (the route guard sends visitors to sign in). */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
