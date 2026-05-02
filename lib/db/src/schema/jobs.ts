import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertJobSchema = createInsertSchema(jobsTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobsTable.$inferSelect;
