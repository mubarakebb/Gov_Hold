import { pgTable, serial, integer, varchar, timestamp, unique } from "drizzle-orm/pg-core";
import { reportsTable } from "./reports";
import { usersTable } from "./auth";

export const reportReportersTable = pgTable("report_reporters", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").notNull().references(() => reportsTable.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique().on(t.reportId, t.userId),
]);
