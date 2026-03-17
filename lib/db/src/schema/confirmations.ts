import { pgTable, primaryKey, timestamp, varchar, integer } from "drizzle-orm/pg-core";

export const reportConfirmationsTable = pgTable("report_confirmations", {
  userId: varchar("user_id").notNull(),
  reportId: integer("report_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.reportId] }),
]);

export type ReportConfirmation = typeof reportConfirmationsTable.$inferSelect;
