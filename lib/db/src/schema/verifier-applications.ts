import { pgTable, serial, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const verifierApplicationsTable = pgTable("verifier_applications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 10 }).notNull(),
  state: varchar("state").notNull(),
  lga: varchar("lga"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type VerifierApplication = typeof verifierApplicationsTable.$inferSelect;
export type InsertVerifierApplication = typeof verifierApplicationsTable.$inferInsert;
