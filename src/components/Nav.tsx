"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import Button from "./ui/Button";

/** Top bar for visitors. Once signed in, every page uses the sidebar shell instead. */
export default function Nav() {
  const path = usePathname();
  const active = path === "/" || path.startsWith("/events");
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
      <nav aria-label="Main" className="mx-auto flex h-14 max-w-6xl items-center gap-7 px-4 sm:h-16 sm:px-6">
        <Link href="/" className="mr-3 text-xl" aria-label="Seatlock home">
          <Logo size={28} />
        </Link>
        <Link href="/" aria-current={active ? "page" : undefined}
          className={`relative whitespace-nowrap px-1 py-5 text-sm transition-colors ${active ? "text-fg" : "text-muted hover:text-fg"}`}>
          Events
          {active && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-accent" />}
        </Link>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <Button href="/login" size="sm">Sign in</Button>
        </div>
      </nav>
    </header>
  );
}
