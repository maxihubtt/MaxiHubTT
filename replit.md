# Maxi Hub TT

Premium private maxi shuttle booking and driver dispatch app for Trinidad & Tobago. Customers book rides; admins dispatch jobs to drivers via Telegram.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/dispatch-app run dev` — run the frontend (port 19494)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: Vite + React + Wouter (routing) + TanStack Query
- Backend: Express 5 + Pino (logging) + express-session
- DB: Supabase PostgreSQL + Drizzle ORM (via `SUPABASE_DB_PASSWORD` or `DATABASE_URL`)
- Auth: Session-based (admin password in env; driver login/signup)
- Push notifications: Web Push API (VAPID keys in env)
- Telegram integration: Bot API for job dispatch and driver claim notifications
- API codegen: Orval (from OpenAPI spec → React Query hooks + Zod schemas)
- Build: esbuild (CJS bundle for api-server)

## Where things live

- `artifacts/dispatch-app/` — React + Vite frontend (public booking + admin + driver portals)
- `artifacts/api-server/` — Express 5 backend (jobs, auth, drivers, push, telegram)
- `lib/api-spec/openapi.yaml` — Single source of truth for all API contracts
- `lib/api-client-react/src/generated/` — Generated React Query hooks
- `lib/api-zod/src/generated/` — Generated Zod validation schemas
- `lib/db/src/schema/` — Drizzle table definitions (jobs, drivers, signups, push, config)

## Architecture decisions

- **Supabase for DB**: Uses `SUPABASE_DB_PASSWORD` env var to build connection string; falls back to `DATABASE_URL`. SSL required (`rejectUnauthorized: false`).
- **Session auth**: Admin and driver sessions stored server-side via express-session. No JWT.
- **Telegram polling**: Every 3 seconds, polls Telegram for new messages to handle driver claims via bot.
- **Web Push**: Drivers can subscribe to push notifications; VAPID keys required in env.
- **Booking urgency**: Same-day/urgent bookings classified by pickup datetime vs. configurable thresholds stored in `admin_config` table.

## Product

- **Customer-facing**: Home page with booking form, fare calculator, route planner
- **Admin portal** (`/admin`): Dashboard with job stats, job creation, driver management, config
- **Driver portal** (`/driver`): Login/signup, view available jobs, claim jobs, update status
- **Job lifecycle**: pending → pending_deposit → deposit_received → claimed → completed / cancelled / expired

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- API server requires `SUPABASE_DB_PASSWORD` (or `DATABASE_URL`) — it will throw on startup without it
- `SESSION_SECRET` is required in production (defaults to dev-only string in dev)
- Telegram features silently disabled if `TELEGRAM_BOT_TOKEN` / `TELEGRAM_GROUP_ID` not set
- Push notifications silently disabled if `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` not set
- The app is a PWA — service worker registered via `public/sw.js`; three separate manifests for customer, admin, driver

## Required env vars

- `SUPABASE_DB_PASSWORD` — Supabase database password (or `DATABASE_URL` for full connection string)
- `SESSION_SECRET` — Session encryption secret (required in production)
- `TELEGRAM_BOT_TOKEN` — Optional: Telegram bot token for notifications
- `TELEGRAM_GROUP_ID` — Optional: Telegram group for dispatching jobs
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` — Optional: Web push notification keys
- `ADMIN_PASSWORD_HASH` — Bcrypt hash of admin password

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
