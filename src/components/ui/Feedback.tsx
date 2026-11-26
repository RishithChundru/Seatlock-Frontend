"use client";

import { useEffect, type ReactNode } from "react";
import { AlertIcon } from "./Icons";

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

/** Bottom-centre toast; auto-dismisses after 4s. */
export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [message, onDone]);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      {message && (
        <div role="status" className="pointer-events-auto flex max-w-md items-center gap-2.5 rounded-lg bg-fg px-4 py-3 text-sm text-bg shadow-lg">
          <AlertIcon className="shrink-0" /> {message}
        </div>
      )}
    </div>
  );
}
