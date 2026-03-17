import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, reportsTable, usersTable } from "@workspace/db";
import {
  AdminListReportsResponse,
  AdminUpdateReportBody,
  AdminUpdateReportParams,
  AdminDeleteReportParams,
  AdminUpdateReportResponse,
  AdminListUsersResponse,
  AdminSetUserAdminParams,
  AdminSetUserAdminBody,
  AdminSetUserAdminResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function requireAdmin(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  if (!req.user.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

router.get("/admin/reports", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const reports = await db
    .select({
      id: reportsTable.id,
      title: reportsTable.title,
      description: reportsTable.description,
      category: reportsTable.category,
      status: reportsTable.status,
      latitude: reportsTable.latitude,
      longitude: reportsTable.longitude,
      imageUrl: reportsTable.imageUrl,
      videoUrl: reportsTable.videoUrl,
      userId: reportsTable.userId,
      confirmationsCount: reportsTable.confirmationsCount,
      isHighlighted: reportsTable.isHighlighted,
      createdAt: reportsTable.createdAt,
      submittedBy: {
        id: usersTable.id,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        state: usersTable.state,
        lga: usersTable.lga,
      },
    })
    .from(reportsTable)
    .leftJoin(usersTable, eq(reportsTable.userId, usersTable.id))
    .orderBy(reportsTable.createdAt);

  res.json(AdminListReportsResponse.parse(reports));
});

router.patch("/admin/reports/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = AdminUpdateReportParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = AdminUpdateReportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.isHighlighted !== undefined) updateData.isHighlighted = parsed.data.isHighlighted;

  const [updated] = await db
    .update(reportsTable)
    .set(updateData)
    .where(eq(reportsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Report not found" });
    return;
  }

  const [withUser] = await db
    .select({
      id: reportsTable.id,
      title: reportsTable.title,
      description: reportsTable.description,
      category: reportsTable.category,
      status: reportsTable.status,
      latitude: reportsTable.latitude,
      longitude: reportsTable.longitude,
      imageUrl: reportsTable.imageUrl,
      videoUrl: reportsTable.videoUrl,
      userId: reportsTable.userId,
      confirmationsCount: reportsTable.confirmationsCount,
      isHighlighted: reportsTable.isHighlighted,
      createdAt: reportsTable.createdAt,
      submittedBy: {
        id: usersTable.id,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        state: usersTable.state,
        lga: usersTable.lga,
      },
    })
    .from(reportsTable)
    .leftJoin(usersTable, eq(reportsTable.userId, usersTable.id))
    .where(eq(reportsTable.id, params.data.id));

  res.json(AdminUpdateReportResponse.parse(withUser));
});

router.delete("/admin/reports/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = AdminDeleteReportParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(reportsTable)
    .where(eq(reportsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Report not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/admin/users", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const users = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      isAdmin: usersTable.isAdmin,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .orderBy(usersTable.createdAt);

  res.json(AdminListUsersResponse.parse(users));
});

router.post("/admin/users/:id/set-admin", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = AdminSetUserAdminParams.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = AdminSetUserAdminBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ isAdmin: parsed.data.isAdmin })
    .where(eq(usersTable.id, params.data.id))
    .returning({
      id: usersTable.id,
      email: usersTable.email,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      isAdmin: usersTable.isAdmin,
      createdAt: usersTable.createdAt,
    });

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(AdminSetUserAdminResponse.parse(updated));
});

export default router;
