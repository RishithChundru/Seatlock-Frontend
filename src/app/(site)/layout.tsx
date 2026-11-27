"use client";

import { Suspense } from "react";
import { useSession } from "@/lib/api";
import DashboardShell from "@/components/DashboardShell";
import Logo from "@/components/Logo";
import Nav from "@/components/Nav";

/** Public pages. Signed in, they open inside the sidebar shell like everything else; visitors get the top nav. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const session = useSession();
  if (session) return <DashboardShell>{children}</DashboardShell>;
  return (
    <>
      <Suspense fallback={<div className="h-16 border-b border-line" />}>
        <Nav />
      </Suspense>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 sm:px-6">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-subtle sm:px-6">
          <Logo size={20} className="text-sm text-muted" />
          <a href="/organizer/signup" className="hover:text-fg">Host events on Seatlock</a>
        </div>
      </footer>
    </>
  );
}
