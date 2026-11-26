# SeatLock frontend

Next.js 16 (React 19, Tailwind 4) UI for **SeatLock**, a concurrency-safe event seat booking system. The Spring Boot backend uses optimistic locking so two people can never book the same seat.

## Features

- Event grid with live seat availability
- Interactive seat map: stage, aisles, up to 10 seats per booking, refreshes every 4 seconds and drops seats someone else just took
- Every checkout sends an `Idempotency-Key`, so a double-click or network retry never books twice
- 409 conflicts shown as a friendly "seat just taken" message
- JWT login and registration, a My tickets page, and a mobile-friendly layout

## Run

Start the SeatLock backend first (Spring Boot, port 8080), then:

```powershell
npm install
npm run dev
```

Open http://localhost:3000 and use **Use demo account** on the sign-in page.

Set `NEXT_PUBLIC_API_URL` if the backend isn't at `http://localhost:8080`.

## Structure

| Path | What |
|---|---|
| `src/app/page.tsx` | Event list |
| `src/app/events/[id]/page.tsx` | Seat map and checkout |
| `src/app/login/page.tsx` | Sign in / register |
| `src/app/bookings/page.tsx` | My tickets |
| `src/lib/api.ts` | API client, session store, formatters |
