"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY } from "@/lib/theme";
import { MoonIcon, SunIcon } from "./ui/Icons";

const KEY = THEME_KEY;
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", cb);
  window.addEventListener("seatlock-theme", cb);
  return () => { mq.removeEventListener("change", cb); window.removeEventListener("seatlock-theme", cb); };
};
const isDark = () => {
  const forced = document.documentElement.dataset.theme;
  return forced ? forced === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
};

export default function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);
  const flip = () => {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(KEY, next); } catch { /* storage blocked */ }
    window.dispatchEvent(new Event("seatlock-theme"));
  };
  return (
    <button
      onClick={flip}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="grid h-9 w-9 place-items-center rounded-md text-muted transition-colors hover:bg-sunken hover:text-fg"
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
