"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut, User, useSession } from "@/lib/api";
import { flash } from "./FlashToast";
import { initialsOf } from "./HostCard";
import { ChevronIcon, LogoutIcon, UserIcon } from "./ui/Icons";

export const roleName = (u: User) =>
  u.role === "ADMIN" ? "Super admin" : u.role === "STAFF" ? "Gate staff" : u.role === "ORGANIZER" ? "Organizer" : "Customer";

/** Sign out and start again from the sign-in page. */
export function useSignOut() {
  const router = useRouter();
  return async () => { await signOut(); flash("You've signed out. See you soon!"); router.replace("/login"); };
}

/** Profile photo, or initials when there's none. */
export function Avatar({ user, className = "h-9 w-9 text-sm", tone = "action" }: { user: User; className?: string; tone?: "action" | "marigold" }) {
  if (user.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- small, versioned, cached; nothing for next/image to add
    return <img src={user.avatarUrl} alt="" className={`shrink-0 rounded-full object-cover ${className}`} />;
  }
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-full font-bold ${className} ${
      tone === "marigold" ? "bg-[var(--marigold-400)] text-[#111827]" : "bg-[var(--sl-action)] text-[var(--sl-on-action)]"}`}>
      {initialsOf(user.name)}
    </span>
  );
}

/** Avatar button with a small menu (account settings, sign out). "sidebar" opens upwards from the navy sidebar. */
export default function ProfileMenu({ variant, compact = false }: { variant: "topbar" | "sidebar"; compact?: boolean }) {
  const session = useSession();
  const leave = useSignOut();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);
  if (!session) return null;
  const { user } = session;
  const side = variant === "sidebar";
  const item = "flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm text-muted hover:bg-sunken hover:text-fg";
  const hover = (v: boolean) => () => { if (window.matchMedia("(hover: hover)").matches) setOpen(v); };

  return (
    // Opens on hover (mouse) and on click (touch, keyboard); the padding bridge keeps it open while the pointer moves over.
    <div ref={box} className="relative" onMouseEnter={hover(true)} onMouseLeave={hover(false)}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu" aria-label="Account menu"
        className={side
          ? `flex w-full items-center gap-3 rounded-[var(--radius-md)] p-2 text-left transition-colors hover:bg-[var(--sidebar-hover)] ${compact ? "justify-center" : ""} ${open ? "bg-[var(--sidebar-hover)]" : ""}`
          : "flex items-center gap-2 rounded-full p-0.5 ring-1 ring-[var(--sl-border)] transition hover:ring-[var(--sl-border-strong)] sm:pr-3"}>
        <Avatar user={user} className={side ? "h-9 w-9 text-sm" : "h-8 w-8 text-xs"} tone={side ? "marigold" : "action"} />
        {side ? !compact && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-[var(--sidebar-fg)]">{user.name}</span>
            <span className="block truncate text-xs text-[var(--sidebar-muted)]">{user.email}</span>
          </span>
        ) : <span className="hidden max-w-32 truncate text-sm font-medium sm:inline">{user.name.split(" ")[0]}</span>}
        {!compact && <ChevronIcon width={14} height={14} className={`shrink-0 transition-transform ${side ? "text-[var(--sidebar-muted)]" : "hidden text-subtle sm:block"} ${open !== side ? "rotate-180" : ""}`} />}
      </button>

      {open && (
        <div className={`absolute z-50 ${side ? "bottom-full left-0 right-0 pb-2" : "right-0 top-full pt-2"} ${side && compact ? "right-auto" : ""}`}>
          <div role="menu" className={`rounded-[var(--radius-md)] border border-line bg-surface p-1 text-fg shadow-[var(--sl-shadow-lg)] ${side && !compact ? "" : "w-56"}`}>
            <div className="px-3 pb-2 pt-2.5">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-subtle">{user.email}</p>
              <p className="mt-0.5 text-xs font-medium text-accent-fg">{roleName(user)}</p>
            </div>
            <div className="my-1 border-t border-line" />
            <Link role="menuitem" href="/account" className={item} onClick={() => setOpen(false)}>
              <UserIcon width={16} height={16} />Account settings
            </Link>
            <button role="menuitem" type="button" className={item} onClick={() => { setOpen(false); leave(); }}>
              <LogoutIcon width={16} height={16} />Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
