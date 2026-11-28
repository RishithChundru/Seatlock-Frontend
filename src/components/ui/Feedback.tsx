"use client";

import { useEffect, type ReactNode } from "react";
import { AlertIcon, CheckIcon, XIcon } from "./Icons";

export function Alert({ children, tone = "danger" }: { children: ReactNode; tone?: "danger" | "warning" }) {
  const cls = tone === "danger" ? "border-danger/30 bg-danger-subtle text-danger" : "border-warning/30 bg-warning-subtle text-warning";
  return (
    <div role="alert" className={`flex items-start gap-2.5 rounded-md border px-3.5 py-3 text-sm ${cls}`}>
      <AlertIcon className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-lg bg-sunken ${className}`} />;
}

/** Toast: top-centre card with a dismiss button; auto-dismisses after 4s. */
export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [message, onDone]);

  // shortcut: tone is guessed from the wording; pass it explicitly if callers ever need to override it.
  const bad = !!message && /couldn|can't|failed|error|invalid|not |over |only |no longer|expired|taken|use a /i.test(message);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4">
      {message && (
        <div key={message} role="status"
          className="sl-toast pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface p-4 pr-10 text-sm text-fg shadow-[var(--sl-shadow-lg)]">
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${bad ? "bg-danger-subtle text-danger" : "bg-success-subtle text-success"}`}>
            {bad ? <AlertIcon /> : <CheckIcon />}
          </span>
          <p className="pt-1.5 leading-snug">{message}</p>
          <button type="button" onClick={onDone} aria-label="Dismiss"
            className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-[var(--radius-sm)] text-subtle hover:bg-sunken hover:text-fg">
            <XIcon width={14} height={14} />
          </button>
          <span aria-hidden className={`sl-toast-timer absolute inset-x-0 bottom-0 h-0.5 origin-left ${bad ? "bg-danger" : "bg-success"}`} />
        </div>
      )}
    </div>
  );
}
