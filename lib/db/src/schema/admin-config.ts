import { pgTable, text } from "drizzle-orm/pg-core";

export const adminConfigTable = pgTable("admin_config", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type AdminConfig = typeof adminConfigTable.$inferSelect;

// Default config values (used when seeding / as fallbacks)
export const DEFAULT_CONFIG = {
  min_booking_hours:    "6",
  same_day_min_hours:   "2",
  deposit_pct:          "25",
  rush_fee:             "150",
  deposit_expiry_mins:  "45",
  urgent_enabled:       "true",
} as const;

export type ConfigKey = keyof typeof DEFAULT_CONFIG;
