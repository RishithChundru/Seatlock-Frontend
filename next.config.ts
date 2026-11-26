import type { NextConfig } from "next";

const BACKEND = (process.env.API_ORIGIN ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  // Same-origin API: the browser talks to /api/* on this site and Next forwards it to the backend, so the
  // httpOnly auth cookies are first-party (no third-party cookie blocking, SameSite=Lax just works).
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND}/api/:path*` }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
