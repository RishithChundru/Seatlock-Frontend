import { NextResponse, type NextRequest } from "next/server";

const BACKEND = (process.env.API_ORIGIN ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/+$/, "");

/**
 * Route guard (optimistic check, the API still authorizes every call):
 * no session cookie -> /login?next=...; /admin pages by role (the session endpoint reads the role from the database).
 */
const ADMIN_PAGES: [string, string[]][] = [
  ["/admin/checkin", ["ADMIN", "ORGANIZER", "STAFF"]],
  ["/admin/organizers", ["ADMIN"]],
  ["/admin/staff", ["ORGANIZER"]],
  ["/admin", ["ADMIN", "ORGANIZER"]],
];
export async function proxy(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/organizer/signup")) return NextResponse.next(); // public: organizer sign-up
  const refresh = req.cookies.get("sl_refresh")?.value;
  if (!refresh) {
    const login = new URL("/login", req.url);
    login.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(login);
  }
  if (req.nextUrl.pathname.startsWith("/admin")) {
    try {
      const res = await fetch(`${BACKEND}/api/auth/session`, {
        headers: { cookie: `sl_refresh=${refresh}` },
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });
      if (res.status === 401) return NextResponse.redirect(new URL("/login?next=" + encodeURIComponent(req.nextUrl.pathname), req.url));
      if (res.ok) {
        const { role, organizerStatus } = (await res.json()) as { role: string; organizerStatus: string | null };
        const path = req.nextUrl.pathname;
        const allowed = ADMIN_PAGES.find(([prefix]) => path.startsWith(prefix))![1];
        if (!allowed.includes(role)) return NextResponse.redirect(new URL(role === "STAFF" ? "/admin/checkin" : "/", req.url));
        // Pending / suspended organizers get a read-only dashboard, not the scanner or staff pages.
        if (role === "ORGANIZER" && organizerStatus !== "APPROVED" && path !== "/admin") return NextResponse.redirect(new URL("/admin", req.url));
      }
    } catch {
      // Backend slow (cold start) or down: let the page load; it checks the role and the API enforces it.
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/bookings/:path*", "/account/:path*", "/admin/:path*", "/organizer/:path*"] };
