import { pgTable, text, timestamp, date } from "drizzle-orm/pg-core";

export const driversTable = pgTable("drivers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  availability: text("availability").notNull().default("offline"),
  dpExpiry: date("dp_expiry"),
  insuranceExpiry: date("insurance_expiry"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Driver = typeof driversTable.$inferSelect;
