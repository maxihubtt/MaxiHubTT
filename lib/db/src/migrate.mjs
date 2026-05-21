import pg from "pg";

const url = process.env.DATABASE_URL ?? process.env.DIRECT_URL;

if (!url) {
  console.error("ERROR: DIRECT_URL or DATABASE_URL must be set");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

await client.connect();
console.log("Connected — running migrations...");

await client.query(`
  CREATE TABLE IF NOT EXISTS jobs (
    id           TEXT PRIMARY KEY,
    pickup       TEXT NOT NULL,
    dropoff      TEXT NOT NULL,
    name         TEXT NOT NULL,
    phone        TEXT NOT NULL,
    price        TEXT NOT NULL,
    passengers   TEXT,
    status       TEXT NOT NULL DEFAULT 'pending',
    claimed_by   TEXT,
    vehicle_type TEXT,
    number_plate TEXT,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
  )
`);
console.log("✓ jobs");

await client.query(`
  CREATE TABLE IF NOT EXISTS drivers (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    availability  TEXT NOT NULL DEFAULT 'offline',
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
  )
`);
console.log("✓ drivers");

await client.query(`
  CREATE TABLE IF NOT EXISTS driver_signups (
    id                TEXT PRIMARY KEY,
    full_name         TEXT NOT NULL,
    phone             TEXT NOT NULL,
    password_hash     TEXT NOT NULL,
    number_plate      TEXT NOT NULL,
    dp_number         TEXT NOT NULL,
    taxi_badge_number TEXT NOT NULL,
    status            TEXT NOT NULL DEFAULT 'pending',
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
  )
`);
console.log("✓ driver_signups");

await client.query(`
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id         TEXT PRIMARY KEY,
    driver_id  TEXT NOT NULL,
    endpoint   TEXT NOT NULL UNIQUE,
    p256dh     TEXT NOT NULL,
    auth       TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
`);
console.log("✓ push_subscriptions");

await client.end();
console.log("Migrations complete.");
