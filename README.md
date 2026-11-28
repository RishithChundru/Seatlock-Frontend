# Seatlock Web

Next.js frontend for **Seatlock**, an event seat-booking system where two people can never book the same seat. The backend uses Redis seat holds and optimistic locking.

**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS 4

Backend (Spring Boot): [Seatlock-Backend](https://github.com/RishithChundru/Seatlock-Backend)

## Features

- Event list with a featured event, cover photos and live availability
- **Search and filters:** text, city, date window, max price and category, all kept in the URL (shareable), with "Load more" pagination
- **Seat tiers:** VIP and Premium rows are outlined on the map, with a price legend and per-tier checkout lines
- **QR tickets:** each upcoming ticket shows a QR of its code; tickets are split into Upcoming and Past, and show "Checked in"
- **Organizer sign-up, separate from customers:** `/organizer/signup` (linked in the footer and on customer sign-up) is a 4-step form: account, organisation (with an optional logo upload and preview), public contact details (Indian mobile with a +91 picker), review with a live preview of the "Hosted by" card. Until approved the organizer's dashboard is read-only; the status page shows pending, changes requested (with the note), approved or suspended
- **Dashboard with a collapsible sidebar** (`/admin`; a pill tab bar on phones), sections by role: Overview (upcoming events, seats sold, revenue, check-ins, what needs attention), Events (search; super admin can filter by organizer), Create event, Scan tickets, Organizer requests (super admin), Gate staff and Public profile (organizers), Browse live site. Admin, organizer and staff accounts never book: no Tickets link, and event pages show the live seat map read-only
- **Dashboards by role:** the super admin sees every event and an **Organizers** review queue (approve, request changes, suspend, reinstate); organizers see only their events with bookings, revenue and check-ins, plus **Gate staff** (invite by email, resend or cancel invites, remove); staff see their organizer's dashboard read-only and the scanner. Invited staff create their account at `/staff/invite`
- **"Hosted by"** card on every organizer's event page
- **Gate check-in** (organizers, their staff, super admin): type the code, or scan the QR with the camera where the browser supports `BarcodeDetector`. Shows green Admit, amber "Already used at…" or red refusal
- **Event management:** create events with tiers, upload, replace or remove covers, cancel events (every ticket holder is refunded and emailed)
- **Account:** profile and change password
- Interactive seat map: tapping a seat places a 5-minute hold with a countdown; seats in other people's carts are hatched
- **Live updates:** the map listens to a Server-Sent Events stream (`EventSource`), so other people's holds and bookings appear instantly, with a "Live" indicator and automatic reconnect. A slow 30 s refetch catches holds that expire on their own.
- The hold timer comes from the server, so it survives a reload and also covers seats offered from the waitlist
- **Waitlist:** sold-out events show "Join the waitlist" and your place in line; when someone cancels, the seat appears as yours with a toast and a timer
- **Cancel bookings** from Tickets until 3 days before the event (with a confirmation dialog); cancelled tickets show as refunded
- **Share a ticket:** a link to a public page (`/t/<token>`, not indexed) with the QR, for whoever is going instead
- **Payments with Razorpay Checkout** (test mode), full page: `/pay` opens Checkout with `callback_url`, Razorpay POSTs the signed result to `/payment/callback`, and `/payment/complete` verifies it with the API and shows the confirmation. Closing or cancelling releases the seats at once. With payments off on the API, checkout books instantly
- Every checkout sends an `Idempotency-Key`, so a double-click or network retry never books twice
- Tickets page shows "Issuing…" until the backend's RabbitMQ consumer issues the ticket code, plus your waitlists and any seat held for you
- **Cookie sessions:** both tokens are httpOnly cookies set by the API, so JavaScript never touches a token. Calls go to same-origin `/api/*`, which Next proxies to the backend; an expired access token is refreshed once (shared by all in-flight requests) and the request retried
- **Route guard** ([`src/proxy.ts`](src/proxy.ts)): `/bookings`, `/account` and `/admin` redirect to sign-in without a session, and `/admin` sends non-admins home
- Sign in / sign up with a show/hide password toggle; switching between them starts from a blank form
- Admin page: create events and upload cover photos (JPEG/PNG/WebP, 2 MB max)
- Light and dark themes (follows the system, with a toggle), keyboard focus rings, mobile layout

---

## Getting started

### Prerequisites

| Tool | Version | Check |
|---|---|---|
| Node.js | 20.9 or newer (22 LTS recommended) | `node -v` |
| npm | comes with Node | `npm -v` |
| Seatlock API | running locally or deployed | see the [backend README](https://github.com/RishithChundru/Seatlock-Backend#getting-started) |

### 1. Clone and install

```bash
git clone https://github.com/RishithChundru/Seatlock-Frontend.git
cd Seatlock-Frontend
npm install
```

### 2. Point it at the API

```bash
cp .env.example .env.local    # Windows PowerShell: Copy-Item .env.example .env.local
```

`.env.local` (git-ignored):

| Variable | Default | Purpose |
|---|---|---|
| `API_ORIGIN` | `NEXT_PUBLIC_API_URL` | Where `/api/*` is proxied (and the route guard checks the session), no trailing slash |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | The API URL the browser uses directly, only for the live seat-map stream |

Both are read at build time, so restart `npm run dev` (or redeploy) after changing it.

### 3. Run

```bash
npm run dev
```

Open http://localhost:3000.
- **Customers:** click **Sign in → Create an account**, then pick seats on any event.
- **Super admin:** sign in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` you configured in the backend's `.env`. A **Dashboard** link appears in the nav (all events, plus **Organizers** to review applications).
- **Organizer:** open **Host events on Seatlock** in the footer (`/organizer/signup`) and create an organizer account; approve it as the super admin (Dashboard → Organizer requests) and its dashboard unlocks.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload on :3000 |
| `npm run build` | Production build (also type-checks) |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |

---

## Design system

Styling is built on a three-layer token architecture in [`src/styles/tokens.css`](src/styles/tokens.css):

| Layer | Example | Rule |
|---|---|---|
| **Primitive** | `--sand-100`, `--vermilion-600`, `--radius-md` | Raw values. Never used by components directly. |
| **Semantic** | `--sl-surface`, `--sl-text-muted`, `--sl-accent`, `--sl-warning` | What a value is *for*. Re-pointed for dark mode, so themes only touch this layer. |
| **Component** | `--seat-held-bg`, `--button-primary-bg`, `--card-radius` | Per-component decisions, built only from semantic tokens. |

[`globals.css`](src/app/globals.css) maps the semantic layer into Tailwind (`bg-surface`, `text-muted`, `border-line`, `bg-accent`…), so utilities follow the active theme automatically. Seat states are driven by `data-state` plus component tokens, not ad-hoc classes.

Shared components live in [`src/components/ui`](src/components/ui): `Button`, `Badge`, `Field` / `PasswordField` / `SelectField` / `TextareaField`, `Alert`, `Skeleton`, `Toast` and a small icon set.

Type: Plus Jakarta Sans (display), Inter (UI). Palette: Midnight & Marigold (navy actions, marigold accents) in light and dark.

## Project structure

Pages live in three route groups, each with its own layout: `(site)` (public pages), `(dashboard)` (signed-in pages inside the sidebar shell) and `(auth)` (split-screen sign-in).

| Path | What |
|---|---|
| `src/app/(site)/page.tsx` | Event list: search and filters on top, compact event cards |
| `src/app/(site)/events/[id]/page.tsx` | Seat map and checkout (read-only for managers) |
| `src/app/(site)/t/[token]/page.tsx` | Public shared ticket |
| `src/app/(auth)/organizer/signup/page.tsx` | Organizer sign-up (public, split screen like sign-in) |
| `src/app/(auth)/staff/invite/page.tsx` | Create a staff account from an invite (public) |
| `src/app/(auth)/layout.tsx` | Split screen: brand panel with the animated isometric arena (`components/AuthArt.tsx`, CSS only, still for reduced motion), form on the right |
| `src/app/(auth)/login/page.tsx` | Sign in / sign up |
| `src/components/DashboardShell.tsx` | App chrome for every page: organizers, staff and the super admin get a grouped, collapsible sidebar (mobile drawer) |
| `src/components/SiteFrame.tsx` | Customers: top bar with tabs and the profile menu, bottom tabs on phones |
| `src/components/ProfileMenu.tsx` | Profile menu for every role; account settings (profile, change password) open in a modal |
| `src/app/(dashboard)/me/page.tsx` | Customer overview: stats, spending chart, next ticket, recent bookings |
| `src/app/(dashboard)/bookings/page.tsx` | Customer tickets: newest first, search, filters (upcoming, checked in, past, cancelled, event cancelled) |
| `src/app/(dashboard)/admin/page.tsx` | Manager overview: KPIs, weekly sales chart, latest bookings |
| `src/app/(dashboard)/admin/events/page.tsx` | Events: sales, covers, cancel, search. Super admin: `?scope=mine` (Seatlock's own) or `?scope=organizers` |
| `src/app/(dashboard)/admin/events/[id]/page.tsx` | One event's sales and everyone who booked it |
| `src/app/(dashboard)/admin/events/new/page.tsx` | Create event: details, seats and tiers, with a live card and seat-map preview |
| `src/app/(dashboard)/admin/checkin/page.tsx` | Gate check-in by code or QR scan |
| `src/app/(dashboard)/admin/organizers/page.tsx` | Super admin: review and manage organizers |
| `src/app/(dashboard)/admin/staff/page.tsx` | Organizer: gate staff and invites |
| `src/app/(dashboard)/account/page.tsx` | Account settings for every role: profile photo, organizer profile (organizers), password |
| `src/app/(site)/pay/page.tsx`, `src/app/payment/*` | Full-page checkout, Razorpay callback, confirmation screen |
| `src/components/InviteBanner.tsx` | Customers accept or decline a gate staff invite in the app |
| `src/lib/dashboard.ts` | What each role may see and do in the dashboard |
| `src/components/DashboardUI.tsx` | Page header, panels, stat cards, status pills, tables |
| `src/components/Charts.tsx` | Area and bar charts (Recharts), themed with the design tokens |
| `src/components/OrganizerWizard.tsx` | Sign-up / edit wizard |
| `src/components/HostCard.tsx` | "Hosted by" organizer profile |
| `src/components/TicketQr.tsx` | QR code for a ticket |
| `src/styles/tokens.css` | Design tokens |
| `src/components/ui/*` | Component library |
| `src/lib/api.ts` | API client (cookie auth, refresh-and-retry), session store, formatters |
| `src/proxy.ts` | Route guard: signed out, everything but sign-in, sign-up and shared tickets goes to `/login`; per-role dashboard access |
| `next.config.ts` | `/api/*` proxy to the backend |

---

## Branches, CI and deploy

- Work on **`dev`**; merge to **`main`** through a pull request.
- GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs lint and a production build on every push to `dev`/`main` and on PRs.
- **Vercel** deploys `main` to production and gives every branch/PR a preview URL. To deploy your own copy: import the repo in Vercel, set `API_ORIGIN` and `NEXT_PUBLIC_API_URL` to your deployed API, and deploy. Then add your Vercel URL to the API's `CORS_ORIGINS`.

The full-stack walkthrough (Neon, Upstash, CloudAMQP, Render, Vercel) is in the backend's [DEPLOY.md](https://github.com/RishithChundru/Seatlock-Backend/blob/main/DEPLOY.md).

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Can't reach the server" | The API isn't running at `API_ORIGIN` |
| Signed in, but bounced back to sign-in | The API has `COOKIE_SECURE=true` while you're on `http://`; it must be `false` locally |
| Live seat map doesn't update | `NEXT_PUBLIC_API_URL` is wrong, or this site's URL is missing from the API's `CORS_ORIGINS` |
| First load is slow on the deployed site | Free hosting puts the API to sleep when idle; the first request wakes it (~30–60 s) |
| Changed `API_ORIGIN` / `NEXT_PUBLIC_API_URL` but nothing changed | Restart `npm run dev`, or redeploy on Vercel |
| No **Admin** link after signing in | You're signed in as a customer; sign in with the backend's `ADMIN_EMAIL` account |
