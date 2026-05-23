import { defineConfig } from "drizzle-kit";
import path from "path";

function getConnectionString(): string {
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (password) {
    const host = process.env.SUPABASE_DB_HOST ?? "aws-1-us-east-2.pooler.supabase.com";
    const user = process.env.SUPABASE_DB_USER ?? "postgres.bfufjqlofylnjamfoorb";
    return `postgresql://${user}:${encodeURIComponent(password)}@${host}:5432/postgres`;
  }
  const url = process.env.SUPABASE_DB_URL ?? process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("No database credentials found.");
  }
  return url;
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: getConnectionString(),
    ssl: { rejectUnauthorized: false },
  },
});
