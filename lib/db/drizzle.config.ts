import { defineConfig } from "drizzle-kit";
import path from "path";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

// Supabase requires a direct (non-pooled) connection for schema migrations.
// Set DIRECT_URL to your Supabase direct connection string (port 5432).
// Falls back to DATABASE_URL when not set (e.g. local / Replit dev).
const migrationUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: migrationUrl,
  },
});
