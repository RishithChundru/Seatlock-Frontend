# Seatlock frontend

Next.js 16 (React 19, Tailwind 4) UI for **Seatlock**, a concurrency-safe event seat booking system. The Spring Boot backend uses Redis holds and optimistic locking so two people can never book the same seat.

## Features

- Event list with a featured event, category filters, cover photos and live availability
- Interactive seat map: tapping a seat places a 5-minute Redis hold with a countdown; seats in other people's carts are hatched
- Every checkout sends an `Idempotency-Key`, so a double-click or network retry never books twice
- Tickets page shows "Issuing…" until the RabbitMQ consumer issues the ticket code
- Admin page: create events and upload cover photos (JPEG/PNG/WebP, 2 MB max)
- Light and dark themes (follows the system, with a toggle), keyboard focus rings, mobile layout

## Design system

Styling is built on a three-layer token architecture in [`src/styles/tokens.css`](src/styles/tokens.css):

| Layer | Example | Rule |
|---|---|---|
| **Primitive** | `--sand-100`, `--vermilion-600`, `--radius-md` | Raw values. Never used by components directly. |
| **Semantic** | `--sl-surface`, `--sl-text-muted`, `--sl-accent`, `--sl-warning` | What a value is *for*. Re-pointed for dark mode, so themes only touch this layer. |
| **Component** | `--seat-held-bg`, `--button-primary-bg`, `--card-radius` | Per-component decisions, built only from semantic tokens. |

[`globals.css`](src/app/globals.css) maps the semantic layer into Tailwind (`bg-surface`, `text-muted`, `border-line`, `bg-accent`...), so utilities follow the active theme automatically. Seat states are driven by `data-state` plus component tokens, not ad-hoc classes.

Shared components live in [`src/components/ui`](src/components/ui): `Button`, `Badge`, `Field` / `SelectField` / `TextareaField`, `Alert`, `Skeleton`, `Toast` and a small icon set.

Type: Fraunces (display), Geist (UI), Geist Mono (seat labels, ticket codes).

## Run

Start the Seatlock backend first (Spring Boot, port 8080), then:

```powershell
npm install
npm run dev
```

Open http://localhost:3000 and use **Fill in demo account** on the sign-in page. Sign in as `admin@seatlock.dev` / `Admin@12345` to reach the Admin page.

Set `NEXT_PUBLIC_API_URL` if the backend isn't at `http://localhost:8080`.

## Structure

| Path | What |
|---|---|
| `src/app/page.tsx` | Event list |
| `src/app/events/[id]/page.tsx` | Seat map and checkout |
| `src/app/login/page.tsx` | Sign in / register |
| `src/app/bookings/page.tsx` | Tickets |
| `src/app/admin/page.tsx` | Create events, upload covers |
| `src/styles/tokens.css` | Design tokens |
| `src/components/ui/*` | Component library |
| `src/lib/api.ts` | API client, session store, formatters |
