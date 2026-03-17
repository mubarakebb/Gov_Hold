import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, usersTable, reportsTable, reportConfirmationsTable } from "@workspace/db";
import {
  GetProfileResponse,
  UpdateProfileBody,
  UpdateProfileResponse,
  GetUserStatsResponse,
  GetUserStatsParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/profile", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.user.id));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(GetProfileResponse.parse(user));
});

router.post("/profile", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName ?? undefined,
      phone: parsed.data.phone,
      state: parsed.data.state,
      lga: parsed.data.lga,
      profileComplete: true,
    })
    .where(eq(usersTable.id, req.user.id))
    .returning();

  res.json(UpdateProfileResponse.parse(user));
});

router.get("/users/:id/stats", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetUserStatsParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, params.data.id));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [reportCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reportsTable)
    .where(eq(reportsTable.userId, params.data.id));

  const [confirmCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reportConfirmationsTable)
    .where(eq(reportConfirmationsTable.userId, params.data.id));

  res.json(GetUserStatsResponse.parse({
    userId: params.data.id,
    reportsSubmitted: reportCount?.count ?? 0,
    reportsConfirmed: confirmCount?.count ?? 0,
  }));
});

export default router;
