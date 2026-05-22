import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// Build Supabase connection from parts if password is set separately,
// otherwise fall back to a full connection string or Replit's DATABASE_URL
function getConnectionString(): string {
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (password) {
    const host = process.env.SUPABASE_DB_HOST ?? "aws-1-us-east-2.pooler.supabase.com";
    const user = process.env.SUPABASE_DB_USER ?? "postgres.bfufjqlofylnjamfoorb";
    return `postgresql://${user}:${encodeURIComponent(password)}@${host}:5432/postgres`;
  }
  const url = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("No database credentials found. Set SUPABASE_DB_PASSWORD or DATABASE_URL.");
  }
  return url;
}

const connectionString = getConnectionString();

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});
export const db = drizzle(pool, { schema });

export * from "./schema";
