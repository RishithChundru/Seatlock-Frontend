"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Toast } from "./ui/Feedback";

const KEY = "seatlock.flash";

/** Queue a toast for the next page (sign in, sign up, sign out all navigate away right after). */
export function flash(message: string) {
  try { sessionStorage.setItem(KEY, message); } catch { /* storage blocked: no toast, nothing breaks */ }
}

/** Mounted once in the root layout: shows a queued flash after each navigation. */
export default function FlashToast() {
  const path = usePathname();
  const [message, setMessage] = useState<string | null>(null);
  const done = useCallback(() => setMessage(null), []);
  useEffect(() => {
    let m: string | null = null;
    try { m = sessionStorage.getItem(KEY); sessionStorage.removeItem(KEY); } catch { /* ignore */ }
    if (m) setMessage(m); // eslint-disable-line react-hooks/set-state-in-effect -- sessionStorage is only readable after mount
  }, [path]);
  return <Toast message={message} onDone={done} />;
}
