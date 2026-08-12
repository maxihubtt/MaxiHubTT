import pg from "pg";

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

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

await client.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS pickup_datetime TEXT`);
await client.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS urgency TEXT NOT NULL DEFAULT 'standard'`);
await client.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deposit_amount INTEGER`);
await client.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS rush_fee INTEGER NOT NULL DEFAULT 0`);
await client.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN NOT NULL DEFAULT false`);
await client.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP`);
await client.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS notes TEXT`);
await client.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS rating INTEGER`);
await client.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS rating_comment TEXT`);
await client.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS email TEXT`);
console.log("✓ jobs columns");

await client.query(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS dp_expiry DATE`);
await client.query(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS insurance_expiry DATE`);
console.log("✓ drivers columns");

await client.query(`ALTER TABLE driver_signups ADD COLUMN IF NOT EXISTS username TEXT NOT NULL DEFAULT ''`);
console.log("✓ driver_signups columns");

await client.query(`
  CREATE TABLE IF NOT EXISTS admin_config (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`);
console.log("✓ admin_config");

await client.end();
console.log("Migrations complete.");
