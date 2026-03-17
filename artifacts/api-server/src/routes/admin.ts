import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, reportsTable, usersTable, verifierApplicationsTable } from "@workspace/db";
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
  AdminListVerifierApplicationsResponse,
  AdminApproveVerifierApplicationParams,
  AdminApproveVerifierApplicationResponse,
  AdminRejectVerifierApplicationParams,
  AdminRejectVerifierApplicationBody,
  AdminRejectVerifierApplicationResponse,
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

const adminReportSelect = {
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
  resolvedCount: reportsTable.resolvedCount,
  reportersCount: reportsTable.reportersCount,
  isHighlighted: reportsTable.isHighlighted,
  createdAt: reportsTable.createdAt,
  submittedBy: {
    id: usersTable.id,
    firstName: usersTable.firstName,
    lastName: usersTable.lastName,
    state: usersTable.state,
    lga: usersTable.lga,
  },
};

router.get("/admin/reports", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const reports = await db
    .select(adminReportSelect)
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
    .select(adminReportSelect)
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
      isVerifier: usersTable.isVerifier,
      verifierType: usersTable.verifierType,
      verifierState: usersTable.verifierState,
      verifierLga: usersTable.verifierLga,
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
      isVerifier: usersTable.isVerifier,
      verifierType: usersTable.verifierType,
      verifierState: usersTable.verifierState,
      verifierLga: usersTable.verifierLga,
      createdAt: usersTable.createdAt,
    });

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(AdminSetUserAdminResponse.parse(updated));
});

router.get("/admin/verifier-applications", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const applications = await db
    .select({
      id: verifierApplicationsTable.id,
      userId: verifierApplicationsTable.userId,
      type: verifierApplicationsTable.type,
      state: verifierApplicationsTable.state,
      lga: verifierApplicationsTable.lga,
      status: verifierApplicationsTable.status,
      reason: verifierApplicationsTable.reason,
      createdAt: verifierApplicationsTable.createdAt,
      applicant: {
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        email: usersTable.email,
      },
    })
    .from(verifierApplicationsTable)
    .leftJoin(usersTable, eq(verifierApplicationsTable.userId, usersTable.id))
    .orderBy(verifierApplicationsTable.createdAt);

  res.json(AdminListVerifierApplicationsResponse.parse(applications));
});

router.post("/admin/verifier-applications/:id/approve", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = AdminApproveVerifierApplicationParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [application] = await db
    .select()
    .from(verifierApplicationsTable)
    .where(eq(verifierApplicationsTable.id, params.data.id));

  if (!application) {
    res.status(404).json({ error: "Application not found" });
    return;
  }

  const [updated] = await db
    .update(verifierApplicationsTable)
    .set({ status: "approved" })
    .where(eq(verifierApplicationsTable.id, params.data.id))
    .returning();

  await db
    .update(usersTable)
    .set({
      isVerifier: true,
      verifierType: application.type,
      verifierState: application.state,
      verifierLga: application.lga,
    })
    .where(eq(usersTable.id, application.userId));

  const [withApplicant] = await db
    .select({
      id: verifierApplicationsTable.id,
      userId: verifierApplicationsTable.userId,
      type: verifierApplicationsTable.type,
      state: verifierApplicationsTable.state,
      lga: verifierApplicationsTable.lga,
      status: verifierApplicationsTable.status,
      reason: verifierApplicationsTable.reason,
      createdAt: verifierApplicationsTable.createdAt,
      applicant: {
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        email: usersTable.email,
      },
    })
    .from(verifierApplicationsTable)
    .leftJoin(usersTable, eq(verifierApplicationsTable.userId, usersTable.id))
    .where(eq(verifierApplicationsTable.id, params.data.id));

  res.json(AdminApproveVerifierApplicationResponse.parse(withApplicant));
});

router.post("/admin/verifier-applications/:id/reject", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = AdminRejectVerifierApplicationParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = AdminRejectVerifierApplicationBody.safeParse(req.body ?? {});

  const [application] = await db
    .select()
    .from(verifierApplicationsTable)
    .where(eq(verifierApplicationsTable.id, params.data.id));

  if (!application) {
    res.status(404).json({ error: "Application not found" });
    return;
  }

  await db
    .update(verifierApplicationsTable)
    .set({
      status: "rejected",
      reason: parsed.success ? (parsed.data.reason ?? null) : null,
    })
    .where(eq(verifierApplicationsTable.id, params.data.id));

  if (application.status === "approved") {
    await db
      .update(usersTable)
      .set({ isVerifier: false, verifierType: null, verifierState: null, verifierLga: null })
      .where(eq(usersTable.id, application.userId));
  }

  const [withApplicant] = await db
    .select({
      id: verifierApplicationsTable.id,
      userId: verifierApplicationsTable.userId,
      type: verifierApplicationsTable.type,
      state: verifierApplicationsTable.state,
      lga: verifierApplicationsTable.lga,
      status: verifierApplicationsTable.status,
      reason: verifierApplicationsTable.reason,
      createdAt: verifierApplicationsTable.createdAt,
      applicant: {
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        email: usersTable.email,
      },
    })
    .from(verifierApplicationsTable)
    .leftJoin(usersTable, eq(verifierApplicationsTable.userId, usersTable.id))
    .where(eq(verifierApplicationsTable.id, params.data.id));

  res.json(AdminRejectVerifierApplicationResponse.parse(withApplicant));
});

export default router;
