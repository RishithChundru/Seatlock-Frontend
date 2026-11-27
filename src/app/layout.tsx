import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist_Mono, Inter, Plus_Jakarta_Sans } from "next/font/google";
import Logo from "@/components/Logo";
import Nav from "@/components/Nav";
import { themeBootScript } from "@/lib/theme";
import "./globals.css";

// Display / headings: Plus Jakarta Sans. Body, UI and numbers: Inter. Ticket codes: Geist Mono.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], weight: ["600", "700", "800"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Seatlock — live events, seats that stay yours",
  description: "Concurrency-safe event seat booking built with Spring Boot, Redis, RabbitMQ and Next.js",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jakarta.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2">
          Skip to content
        </a>
        <Suspense fallback={<div className="h-16 border-b border-line" />}>
          <Nav />
        </Suspense>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 sm:px-6">{children}</main>
        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-subtle sm:px-6">
            <Logo size={20} className="text-sm text-muted" />
            <a href="/organizer/signup" className="hover:text-fg">Host events on Seatlock</a>
          </div>
        </footer>
      </body>
    </html>
  );
}
