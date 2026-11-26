"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { setSession, useSession } from "@/lib/api";
import ThemeToggle from "./ThemeToggle";
import Button from "./ui/Button";

export default function Nav() {
  const session = useSession();
  const path = usePathname();

  const link = (href: string, label: string) => {
    const active = href === "/" ? path === "/" || path.startsWith("/events") : path.startsWith(href);
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`relative whitespace-nowrap px-1 py-5 text-sm transition-colors ${active ? "text-fg" : "text-muted hover:text-fg"}`}
      >
        {label}
        {active && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-accent" />}
      </Link>
    );
  };

  const links = (
    <>
      {link("/", "Events")}
      {session && link("/bookings", "Tickets")}
      {session?.user.role === "ADMIN" && link("/admin", "Admin")}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
      <nav aria-label="Main" className="mx-auto flex h-14 max-w-6xl items-center gap-7 px-4 sm:h-16 sm:px-6">
        <Link href="/" className="mr-3 font-display text-xl font-semibold tracking-tight">
          Seat<span className="text-accent-fg">lock</span>
        </Link>
        <div className="hidden items-center gap-7 sm:flex">{links}</div>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          {session ? (
            <>
              <span className="hidden px-2 text-sm text-muted md:inline">{session.user.name}</span>
              <Button variant="ghost" size="sm" onClick={() => setSession(null)}>Sign out</Button>
            </>
          ) : (
            <Button href="/login" size="sm">Sign in</Button>
          )}
        </div>
      </nav>
      {/* Phones: links get their own row instead of crowding the bar */}
      <div className="mx-auto -mt-1 flex h-10 items-center gap-6 px-4 sm:hidden [&>a]:py-2.5">{links}</div>
    </header>
  );
}
