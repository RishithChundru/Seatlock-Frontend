import { Suspense } from "react";
import Logo from "@/components/Logo";
import Nav from "@/components/Nav";

/** Public pages: top nav, centred content, footer. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
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
