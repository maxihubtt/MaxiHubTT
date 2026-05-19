import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { logger } from "./logger";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  logger.warn("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set — Supabase features disabled");
}

export const supabase: SupabaseClient | null = url && key
  ? createClient(url, key)
  : null;
