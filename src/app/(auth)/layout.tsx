import Link from "next/link";
import AuthArt from "@/components/AuthArt";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { CheckIcon } from "@/components/ui/Icons";

/** Sign-in and sign-up: brand panel with the arena illustration on the left, the form on the right. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-dvh min-h-0 grid-rows-[minmax(0,1fr)] overflow-hidden lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden min-h-0 flex-col overflow-hidden bg-[var(--sidebar-bg)] p-10 text-[var(--sidebar-fg)] lg:flex xl:px-14">
        <Link href="/" aria-label="Seatlock home" className="self-start"><Logo tone="onDark" size={34} className="text-xl" /></Link>
        <div className="mt-10 max-w-md shrink-0">
          <h2 className="font-display text-4xl font-bold leading-tight tracking-tight">
            Book the seat you see.<br /><span className="text-[var(--marigold-400)]">Keep it while you pay.</span>
          </h2>
          <ul className="mt-6 space-y-2.5 text-[var(--sidebar-muted)]">
            {["Live seat maps that update for everyone", "Your seats held for 5 minutes at checkout", "QR tickets by email, scanned at the gate"].map((t) => (
              <li key={t} className="flex items-center gap-2.5">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--sidebar-active-bg)] text-[var(--marigold-400)]"><CheckIcon width={13} height={13} /></span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        {/* min-h-0 + flex-1: the drawing shrinks to the space left, so the page never scrolls */}
        <AuthArt className="mt-6 min-h-0 w-full max-w-xl flex-1 self-center" />
      </aside>

      <main id="main" className="relative flex min-h-0 flex-col items-center overflow-y-auto px-6 py-14">
        <div className="absolute right-4 top-4"><ThemeToggle /></div>
        {/* my-auto centres the form, and it still scrolls inside this panel on very short screens */}
        <div className="my-auto flex w-full flex-col items-center">
          <Link href="/" aria-label="Seatlock home" className="mb-8 lg:hidden"><Logo size={32} className="text-xl" /></Link>
          {children}
        </div>
      </main>
    </div>
  );
}
