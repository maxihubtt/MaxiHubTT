# Maxi Hub TT — Job Dispatch & Management System

A web platform for a premium shuttle/taxi service in Trinidad & Tobago. Admins create and dispatch jobs to drivers via a dashboard; drivers claim jobs through a driver portal. Supports Telegram notifications and web push notifications.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/dispatch-app run dev` — run the frontend (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Required Environment Variables / Secrets

- `DATABASE_URL` — Postgres connection string (auto-provisioned by Replit)
- `SESSION_SECRET` — secret for express-session (set in Replit secrets)
- `ADMIN_PASSWORD` — password to log in to the admin dashboard
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` — for web push notifications (already set)

## Optional Secrets (Telegram)

- `TELEGRAM_BOT_TOKEN` — Telegram bot token for job dispatch notifications
- `TELEGRAM_GROUP_ID` — Telegram group/channel ID for notifications

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (port 8080)
- Frontend: React 19 + Vite (port 5000, proxies /api → :8080)
- DB: Replit PostgreSQL + Drizzle ORM
- Validation: Zod, drizzle-zod
- Auth: Custom session-based (express-session) — admin password + driver username/password
- Notifications: Telegram bot + Web Push (VAPID)
- API codegen: Orval (from OpenAPI spec in lib/api-spec/openapi.yaml)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for the API contract
- `lib/db/src/schema/` — database tables (jobs, drivers, driver-signups, push-subscriptions)
- `artifacts/api-server/src/` — Express backend
- `artifacts/dispatch-app/src/` — React frontend (admin + driver views)
- `artifacts/api-server/src/lib/telegram.ts` — Telegram integration
- `artifacts/api-server/src/routes/auth.ts` — admin + driver session auth

## Architecture decisions

- Monorepo with pnpm workspaces — shared DB schema and API types across packages
- API-first: OpenAPI spec drives code generation for both Zod validators and React Query hooks
- Session auth (not JWT) — express-session with httpOnly cookies; admin uses a single shared password, drivers have individual username/password
- Telegram polling every 3s in the API server process — drivers can claim jobs via Telegram bot command
- Supabase client is optional — if `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` are not set, those features are gracefully disabled

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The Vite dev server proxies `/api/*` to `localhost:8080` — ensure the API server is running before the frontend
- `pnpm --filter @workspace/db run push` requires `DATABASE_URL` to be set
- Drizzle migrations use `DIRECT_URL` if set (for Supabase direct connections), otherwise falls back to `DATABASE_URL`
