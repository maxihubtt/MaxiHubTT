import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const driverSignupsTable = pgTable("driver_signups", {
  id: text("id").primaryKey(),
  fullName: text("full_name").notNull(),
  username: text("username").notNull().default(""),
  phone: text("phone").notNull(),
  passwordHash: text("password_hash").notNull(),
  numberPlate: text("number_plate").notNull(),
  dpNumber: text("dp_number").notNull(),
  taxiBadgeNumber: text("taxi_badge_number").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type DriverSignup = typeof driverSignupsTable.$inferSelect;
