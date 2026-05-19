import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const driversTable = pgTable("drivers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  availability: text("availability").notNull().default("offline"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Driver = typeof driversTable.$inferSelect;
