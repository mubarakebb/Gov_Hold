import { Router, type IRouter } from "express";
import { sql, eq } from "drizzle-orm";
import { db, reportsTable, usersTable } from "@workspace/db";
import { GetAnalyticsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/analytics", async (_req, res): Promise<void> => {
  const [totalReports] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reportsTable);

  const [openReports] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reportsTable)
    .where(eq(reportsTable.status, "open"));

  const [resolvedReports] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reportsTable)
    .where(eq(reportsTable.status, "resolved"));

  const [totalUsers] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usersTable);

  const byCategory = await db
    .select({
      category: reportsTable.category,
      count: sql<number>`count(*)::int`,
    })
    .from(reportsTable)
    .groupBy(reportsTable.category)
    .orderBy(sql`count(*) desc`);

  const byState = await db
    .select({
      state: usersTable.state,
      count: sql<number>`count(*)::int`,
    })
    .from(reportsTable)
    .leftJoin(usersTable, eq(reportsTable.userId, usersTable.id))
    .where(sql`${usersTable.state} is not null`)
    .groupBy(usersTable.state)
    .orderBy(sql`count(*) desc`);

  res.json(GetAnalyticsResponse.parse({
    totalReports: totalReports?.count ?? 0,
    openReports: openReports?.count ?? 0,
    resolvedReports: resolvedReports?.count ?? 0,
    totalUsers: totalUsers?.count ?? 0,
    reportsByCategory: byCategory.map(r => ({ category: r.category, count: r.count })),
    reportsByState: byState.map(r => ({ state: r.state ?? "Unknown", count: r.count })),
  }));
});

export default router;
