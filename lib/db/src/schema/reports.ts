import { pgTable, text, serial, timestamp, doublePrecision, integer, boolean, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reportsTable = pgTable("reports", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull().default("open"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  userId: varchar("user_id"),
  confirmationsCount: integer("confirmations_count").notNull().default(0),
  resolvedCount: integer("resolved_count").notNull().default(0),
  reportersCount: integer("reporters_count").notNull().default(1),
  isHighlighted: boolean("is_highlighted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReportSchema = createInsertSchema(reportsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reportsTable.$inferSelect;
