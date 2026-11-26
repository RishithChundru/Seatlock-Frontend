# Seatlock Web

Next.js frontend for **Seatlock**, an event seat-booking system where two people can never book the same seat. The backend uses Redis seat holds and optimistic locking.

**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS 4

Backend (Spring Boot): [Seatlock-Backend](https://github.com/RishithChundru/Seatlock-Backend)

## Features

- Event list with a featured event, category filters, cover photos and live availability
- Interactive seat map: tapping a seat places a 5-minute hold with a countdown; seats in other people's carts are hatched
- Every checkout sends an `Idempotency-Key`, so a double-click or network retry never books twice
- Tickets page shows "Issuing…" until the backend's RabbitMQ consumer issues the ticket code
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

`.env.local` (git-ignored) contains one setting:

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | Base URL of the Seatlock API, no trailing slash |

It's baked in at build time, so restart `npm run dev` (or redeploy) after changing it.

### 3. Run

```bash
npm run dev
```

Open http://localhost:3000.
- **Customers:** click **Sign in → Create an account**, then pick seats on any event.
- **Admin:** sign in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` you configured in the backend's `.env`. An **Admin** link appears in the nav, where you create events and upload covers.

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
| **Primitive** | `--ink-100`, `--cobalt-600`, `--radius-md` | Raw values. Never used by components directly. |
| **Semantic** | `--sl-surface`, `--sl-text-muted`, `--sl-accent`, `--sl-warning` | What a value is *for*. Re-pointed for dark mode, so themes only touch this layer. |
| **Component** | `--seat-held-bg`, `--button-primary-bg`, `--card-radius` | Per-component decisions, built only from semantic tokens. |

[`globals.css`](src/app/globals.css) maps the semantic layer into Tailwind (`bg-surface`, `text-muted`, `border-line`, `bg-accent`…), so utilities follow the active theme automatically. Seat states are driven by `data-state` plus component tokens, not ad-hoc classes.

Shared components live in [`src/components/ui`](src/components/ui): `Button`, `Badge`, `Field` / `PasswordField` / `SelectField` / `TextareaField`, `Alert`, `Skeleton`, `Toast` and a small icon set.

Type: Fraunces (display), Geist (UI), Geist Mono (seat labels, ticket codes).

## Project structure

| Path | What |
|---|---|
| `src/app/page.tsx` | Event list |
| `src/app/events/[id]/page.tsx` | Seat map and checkout |
| `src/app/login/page.tsx` | Sign in / sign up |
| `src/app/bookings/page.tsx` | Tickets |
| `src/app/admin/page.tsx` | Create events, upload covers (admins only) |
| `src/styles/tokens.css` | Design tokens |
| `src/components/ui/*` | Component library |
| `src/lib/api.ts` | API client, session store, formatters |

---

## Branches, CI and deploy

- Work on **`dev`**; merge to **`main`** through a pull request.
- GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs lint and a production build on every push to `dev`/`main` and on PRs.
- **Vercel** deploys `main` to production and gives every branch/PR a preview URL. To deploy your own copy: import the repo in Vercel, set `NEXT_PUBLIC_API_URL` to your deployed API, and deploy. Then add your Vercel URL to the API's `CORS_ORIGINS`.

The full-stack walkthrough (Neon, Upstash, CloudAMQP, Render, Vercel) is in the backend's [DEPLOY.md](https://github.com/RishithChundru/Seatlock-Backend/blob/main/DEPLOY.md).

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Can't reach the server" | The API isn't running at `NEXT_PUBLIC_API_URL`, or this site's URL is missing from the API's `CORS_ORIGINS` |
| First load is slow on the deployed site | Free hosting puts the API to sleep when idle; the first request wakes it (~30–60 s) |
| Changed `NEXT_PUBLIC_API_URL` but nothing changed | Restart `npm run dev`, or redeploy on Vercel |
| No **Admin** link after signing in | You're signed in as a customer; sign in with the backend's `ADMIN_EMAIL` account |
