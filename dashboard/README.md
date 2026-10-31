# Umami Dashboard (TanStack Start + ReUI)

A new frontend for [Umami](https://umami.is), built with **TanStack Start**, **shadcn/ui (Base UI)** and
**ReUI** components: a ReUI-style app shell (collapsible sidebar, ⌘K command menu, theme toggle),
dot-dithered cards, segmented period switches and recharts-based charts.

The Umami server in the repository root stays the analytics backend (tracker, database, REST API).
This app talks to it exclusively through TanStack Start server functions; the Umami auth token lives
in an httpOnly cookie and never reaches the browser.

## Pages

- `/login` — sign in with your Umami credentials
- `/` — overview across all websites (totals, sparklines, visitor trend, top websites)
- `/websites` — all websites with visitors, change and sparkline
- `/websites/:id` — website dashboard: key numbers, traffic trend, pages, sources, location, environment, events
- `/websites/:id/realtime` — live view, refreshes every 10 s

## Development

```bash
# 1. Run the Umami backend from the repository root (port 3000)
pnpm dev

# 2. Run this app (port 3100)
cd dashboard
npm install
npm run dev
```

Configuration (environment variables):

| Variable          | Default                     | Purpose                                |
| ----------------- | --------------------------- | -------------------------------------- |
| `UMAMI_API_URL`   | `http://localhost:3000/api` | Base URL of the Umami REST API         |
| `UMAMI_TIMEZONE`  | server time zone            | Time zone used to bucket chart data    |

## Production

```bash
npm run build     # outputs dist/client + dist/server
npm run preview   # serves the production build locally
```
