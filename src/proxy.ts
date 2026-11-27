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
  ["/admin/events/new", ["ADMIN", "ORGANIZER"]],
  ["/admin", ["ADMIN", "ORGANIZER", "STAFF"]], // staff: read-only
];
export async function proxy(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/organizer/signup")) return NextResponse.next(); // public: organizer sign-up
  const refresh = req.cookies.get("sl_refresh")?.value;
  if (!refresh) {
    // Signed out, the app starts at sign-in (the event list included); deep links come back after.
    const login = new URL("/login", req.url);
    if (req.nextUrl.pathname !== "/") login.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(login);
  }
  // /admin pages by role; /bookings (tickets) is for customers only.
  if (["/admin", "/bookings", "/me"].some((p) => req.nextUrl.pathname.startsWith(p))) {
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
        if (path.startsWith("/bookings") || path.startsWith("/me")) {
          if (role !== "USER") return NextResponse.redirect(new URL("/admin", req.url)); // managers never book
          return NextResponse.next();
        }
        const allowed = ADMIN_PAGES.find(([prefix]) => path.startsWith(prefix))![1];
        if (!allowed.includes(role)) return NextResponse.redirect(new URL(role === "USER" ? "/me" : "/admin", req.url));
        // Pending / suspended organizers get a read-only dashboard, not the scanner or staff pages.
        if (role === "ORGANIZER" && organizerStatus !== "APPROVED" && path !== "/admin" && path !== "/admin/events") {
          return NextResponse.redirect(new URL("/admin", req.url));
        }
      }
    } catch {
      // Backend slow (cold start) or down: let the page load; it checks the role and the API enforces it.
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/", "/events/:path*", "/me/:path*", "/bookings/:path*", "/account/:path*", "/admin/:path*", "/organizer/:path*"] };
