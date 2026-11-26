"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { setSession, useSession } from "@/lib/api";

export default function Nav() {
  const session = useSession();
  const path = usePathname();
  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition ${path === href ? "bg-white/10 text-white" : "text-white/60 hover:text-white"}`}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-[#07070c]/70 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6">
        <Link href="/" className="mr-2 flex shrink-0 sm:mr-4 items-center gap-2 font-display text-lg font-bold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm">🔒</span>
          <span className="hidden sm:inline">SeatLock</span>
        </Link>
        {link("/", "Events")}
        {session && link("/bookings", "My tickets")}
        <div className="ml-auto flex items-center gap-3">
          {session ? (
            <>
              <span className="hidden text-sm text-white/50 sm:inline">Hi, {session.user.name.split(" ")[0]}</span>
              <button
                onClick={() => setSession(null)}
                className="whitespace-nowrap rounded-full border border-white/15 px-4 py-1.5 text-sm text-white/80 transition hover:bg-white/10"
              >
                Log out
              </button>
            </>
          ) : (
            <Link href="/login" className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-black transition hover:bg-white/90">
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
