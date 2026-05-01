# Workspace

## Overview

pnpm workspace monorepo using TypeScript. MxiHub Dispatch — a transport job dispatch system that sends new bookings to a Telegram group and lets drivers claim jobs via a Telegram bot.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite (Tailwind, shadcn/ui, wouter, react-query)
- **Telegram**: Bot polling via REST API (getUpdates loop)

## Architecture

- `artifacts/dispatch-app` — React/Vite frontend (served at `/`)
- `artifacts/api-server` — Express backend (served at `/api`)
- `lib/db` — Drizzle ORM schema (PostgreSQL)
- `lib/api-spec` — OpenAPI spec (source of truth)
- `lib/api-client-react` — Generated React Query hooks
- `lib/api-zod` — Generated Zod validation schemas

## Key Features

- **Job booking**: POST `/api/jobs` creates a job in the DB and sends a message to the Telegram group
- **Driver claiming**: Telegram bot polls every 3 seconds; when a driver sends `/start <jobId>`, they get the customer's contact details and the group is notified
- **Live dashboard**: Real-time stats (total/pending/claimed/completed) and job feed

## Environment Variables / Secrets

- `TELEGRAM_BOT_TOKEN` — Telegram bot token (secret)
- `TELEGRAM_GROUP_ID` — Telegram group chat ID (env var, shared)
- `DATABASE_URL` / `PG*` — PostgreSQL connection (managed)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
