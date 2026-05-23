import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const jobsTable = pgTable("jobs", {
  id: text("id").primaryKey(),
  pickup: text("pickup").notNull(),
  dropoff: text("dropoff").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  price: text("price").notNull(),
  passengers: text("passengers"),
  status: text("status").notNull().default("pending"),
  claimedBy: text("claimed_by"),
  vehicleType: text("vehicle_type"),
  numberPlate: text("number_plate"),
  // Booking classification
  pickupDatetime: text("pickup_datetime"),
  urgency: text("urgency").notNull().default("standard"),
  // Deposit tracking
  depositAmount: integer("deposit_amount"),
  rushFee: integer("rush_fee").notNull().default(0),
  depositPaid: boolean("deposit_paid").notNull().default(false),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertJobSchema = createInsertSchema(jobsTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobsTable.$inferSelect;
