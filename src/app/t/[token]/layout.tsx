import type { Metadata } from "next";

// Shared ticket links are private-by-obscurity: keep them out of search engines.
export const metadata: Metadata = { title: "Shared ticket · Seatlock", robots: { index: false, follow: false } };

export default function SharedTicketLayout({ children }: { children: React.ReactNode }) {
  return children;
}
