import pg from "pg";

function getConnectionString() {
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (password) {
    const host = process.env.SUPABASE_DB_HOST ?? "aws-1-us-east-2.pooler.supabase.com";
    const user = process.env.SUPABASE_DB_USER ?? "postgres.bfufjqlofylnjamfoorb";
    return `postgresql://${user}:${encodeURIComponent(password)}@${host}:5432/postgres`;
  }
  return process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? null;
}

const url = getConnectionString();
if (!url) { console.error("ERROR: SUPABASE_DB_PASSWORD or DATABASE_URL must be set"); process.exit(1); }

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
await client.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS pickup_datetime TEXT`);
await client.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS urgency TEXT NOT NULL DEFAULT 'standard'`);
await client.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deposit_amount INTEGER`);
await client.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS rush_fee INTEGER NOT NULL DEFAULT 0`);
await client.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN NOT NULL DEFAULT FALSE`);
await client.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP`);
console.log("✓ jobs");

await client.query(`
  CREATE TABLE IF NOT EXISTS drivers (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    username      TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,
    availability  TEXT NOT NULL DEFAULT 'offline',
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
  )
`);
await client.query(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS username        TEXT      NOT NULL DEFAULT ''`);
await client.query(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS availability    TEXT      NOT NULL DEFAULT 'offline'`);
await client.query(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMP NOT NULL DEFAULT NOW()`);
await client.query(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS dp_expiry       DATE`);
await client.query(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS insurance_expiry DATE`);
await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS drivers_username_idx ON drivers (username)`);
console.log("✓ drivers");

await client.query(`
  CREATE TABLE IF NOT EXISTS driver_signups (
    id                TEXT PRIMARY KEY,
    full_name         TEXT NOT NULL,
    username          TEXT NOT NULL DEFAULT '',
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
await client.query(`ALTER TABLE driver_signups ADD COLUMN IF NOT EXISTS username TEXT NOT NULL DEFAULT ''`);
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

await client.query(`
  CREATE TABLE IF NOT EXISTS admin_config (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`);
// Seed defaults (INSERT ... ON CONFLICT DO NOTHING)
const defaults = [
  ["min_booking_hours",   "6"],
  ["same_day_min_hours",  "2"],
  ["deposit_pct",         "25"],
  ["rush_fee",            "150"],
  ["deposit_expiry_mins", "45"],
  ["urgent_enabled",      "true"],
];
for (const [key, value] of defaults) {
  await client.query(
    `INSERT INTO admin_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
    [key, value]
  );
}
console.log("✓ admin_config");

await client.end();
console.log("Migrations complete.");
