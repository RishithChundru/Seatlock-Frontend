/** The ticket mark (same drawing as app/icon.svg) and the Seatlock wordmark. */
export function LogoMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden className={`shrink-0 ${className}`}>
      <rect width="64" height="64" rx="14" fill="#1E3A8A" />
      <path d="M10 20a4 4 0 0 1 4-4h36a4 4 0 0 1 4 4v6a6 6 0 0 0 0 12v6a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4v-6a6 6 0 0 0 0-12z" fill="#FFFFFF" />
      <path d="M41 19v26" stroke="#1E3A8A" strokeWidth="2.5" strokeDasharray="3 3" />
      <circle cx="26" cy="29" r="4.5" fill="#F59E0B" />
      <rect x="24" y="31" width="4" height="9" rx="2" fill="#F59E0B" />
    </svg>
  );
}

/** tone "onDark": white "Seat" + marigold "lock", for the navy sidebar and the sign-in panel. */
export default function Logo({ size = 28, className = "", tone = "default", showText = true }: {
  size?: number; className?: string; tone?: "default" | "onDark"; showText?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2 font-display font-bold tracking-tight ${tone === "onDark" ? "text-white" : ""} ${className}`}>
      <LogoMark size={size} className={tone === "onDark" ? "ring-1 ring-white/15 rounded-[22%]" : ""} />
      {/* "lock" in the brand accent: navy on light pages, marigold on dark surfaces */}
      {showText && <span>Seat<span className={tone === "onDark" ? "text-[var(--marigold-400)]" : "text-accent-fg"}>lock</span></span>}
    </span>
  );
}
