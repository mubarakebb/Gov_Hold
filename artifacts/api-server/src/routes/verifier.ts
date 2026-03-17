import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, usersTable, verifierApplicationsTable } from "@workspace/db";

const router: IRouter = Router();

router.post("/verifier/apply", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { type, state, lga } = req.body as {
    type?: string;
    state?: string;
    lga?: string;
  };

  if (!type || !state || !["lga", "state"].includes(type)) {
    res.status(400).json({ error: "Invalid application data" });
    return;
  }

  if (type === "lga" && !lga) {
    res.status(400).json({ error: "LGA is required for LGA verifier application" });
    return;
  }

  const existing = await db
    .select()
    .from(verifierApplicationsTable)
    .where(eq(verifierApplicationsTable.userId, req.user.id));

  if (existing.length > 0) {
    const latest = existing[existing.length - 1];
    if (latest.status === "pending" || latest.status === "approved") {
      res.status(400).json({ error: "You already have an active or pending application" });
      return;
    }
    await db
      .update(verifierApplicationsTable)
      .set({
        type,
        state,
        lga: lga ?? null,
        status: "pending",
        reason: null,
      })
      .where(eq(verifierApplicationsTable.id, latest.id));

    const [updated] = await db
      .select()
      .from(verifierApplicationsTable)
      .where(eq(verifierApplicationsTable.id, latest.id));

    res.json(updated);
    return;
  }

  const [application] = await db
    .insert(verifierApplicationsTable)
    .values({
      userId: req.user.id,
      type,
      state,
      lga: lga ?? null,
      status: "pending",
    })
    .returning();

  res.json(application);
});

router.get("/verifier/my-application", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const applications = await db
    .select()
    .from(verifierApplicationsTable)
    .where(eq(verifierApplicationsTable.userId, req.user.id))
    .orderBy(verifierApplicationsTable.createdAt);

  if (applications.length === 0) {
    res.json(null);
    return;
  }

  const latest = applications[applications.length - 1];
  res.json(latest);
});

export default router;
