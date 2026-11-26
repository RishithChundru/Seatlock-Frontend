import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import Nav from "@/components/Nav";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SeatLock — book seats, never twice",
  description: "Concurrency-safe event seat booking built with Spring Boot and Next.js",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}>
      <body className="glow min-h-full flex flex-col font-sans">
        <Suspense fallback={<div className="h-16 border-b border-white/5" />}>
          <Nav />
        </Suspense>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 sm:px-6">{children}</main>
        <footer className="border-t border-white/5 py-6 text-center text-xs text-white/40">
          SeatLock · Spring Boot + PostgreSQL + Next.js · optimistic locking demo
        </footer>
      </body>
    </html>
  );
}
