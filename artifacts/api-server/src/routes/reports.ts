import { Router, type IRouter } from "express";
import { eq, desc, asc, sql, and } from "drizzle-orm";
import multer from "multer";
import path from "path";
import { db, reportsTable, usersTable, reportConfirmationsTable, reportReportersTable } from "@workspace/db";
import {
  ListReportsResponse,
  GetReportResponse,
  GetReportParams,
  CreateReportBody,
  UploadReportImageResponse,
  ConfirmReportParams,
  ConfirmReportResponse,
  UnconfirmReportParams,
  UnconfirmReportResponse,
  ResolveReportParams,
  ResolveReportResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.resolve(process.cwd(), "uploads"));
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

const reportWithUserSelect = {
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

router.get("/reports", async (req, res): Promise<void> => {
  const { category, status, sort } = req.query as {
    category?: string;
    status?: string;
    sort?: string;
  };

  let query = db
    .select(reportWithUserSelect)
    .from(reportsTable)
    .leftJoin(usersTable, eq(reportsTable.userId, usersTable.id))
    .$dynamic();

  if (category) {
    query = query.where(eq(reportsTable.category, category));
  }
  if (status) {
    query = query.where(eq(reportsTable.status, status));
  }

  if (sort === "oldest") {
    query = query.orderBy(asc(reportsTable.createdAt));
  } else if (sort === "confirmations") {
    query = query.orderBy(desc(reportsTable.confirmationsCount));
  } else {
    query = query.orderBy(desc(reportsTable.createdAt));
  }

  const reports = await query;
  res.json(ListReportsResponse.parse(reports));
});

router.post("/reports/upload-image", upload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  const url = `/api/uploads/${req.file.filename}`;
  res.json(UploadReportImageResponse.parse({ url }));
});

// Duplicate check — must come before /:id route
router.get("/reports/check-duplicate", async (req, res): Promise<void> => {
  const { lat, lng, category, title } = req.query as {
    lat?: string;
    lng?: string;
    category?: string;
    title?: string;
  };

  if (!category) {
    res.json({ duplicates: [] });
    return;
  }

  const PROXIMITY = 0.05; // ~5.5 km bounding box

  let queryBuilder = db
    .select(reportWithUserSelect)
    .from(reportsTable)
    .leftJoin(usersTable, eq(reportsTable.userId, usersTable.id))
    .$dynamic();

  queryBuilder = queryBuilder.where(eq(reportsTable.category, category));

  const reports = await queryBuilder.orderBy(desc(reportsTable.createdAt));

  const latNum = lat ? parseFloat(lat) : null;
  const lngNum = lng ? parseFloat(lng) : null;

  const PROXIMITY_MATCH = latNum !== null && lngNum !== null
    ? reports.filter(r =>
        r.latitude !== null && r.longitude !== null &&
        Math.abs((r.latitude ?? 0) - latNum) <= PROXIMITY &&
        Math.abs((r.longitude ?? 0) - lngNum) <= PROXIMITY
      )
    : [];

  const titleWords = title
    ? title.toLowerCase().split(/\s+/).filter(w => w.length >= 4)
    : [];

  const TITLE_MATCH = titleWords.length >= 2
    ? reports.filter(r => {
        const rWords = r.title.toLowerCase().split(/\s+/).filter((w: string) => w.length >= 4);
        const shared = titleWords.filter((w: string) => rWords.includes(w));
        return shared.length >= 2;
      })
    : [];

  const seen = new Set<number>();
  const duplicates: typeof reports = [];
  for (const r of [...PROXIMITY_MATCH, ...TITLE_MATCH]) {
    if (!seen.has(r.id)) {
      seen.add(r.id);
      duplicates.push(r);
    }
  }

  res.json({ duplicates: duplicates.slice(0, 5) });
});

router.post("/reports", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = CreateReportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [report] = await db
    .insert(reportsTable)
    .values({
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      latitude: parsed.data.latitude ?? undefined,
      longitude: parsed.data.longitude ?? undefined,
      imageUrl: parsed.data.imageUrl ?? undefined,
      videoUrl: parsed.data.videoUrl ?? undefined,
      userId: req.user.id,
      status: "open",
      reportersCount: 1,
    })
    .returning();

  const [withUser] = await db
    .select(reportWithUserSelect)
    .from(reportsTable)
    .leftJoin(usersTable, eq(reportsTable.userId, usersTable.id))
    .where(eq(reportsTable.id, report.id));

  res.status(201).json(GetReportResponse.parse(withUser));
});

router.get("/reports/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetReportParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [report] = await db
    .select(reportWithUserSelect)
    .from(reportsTable)
    .leftJoin(usersTable, eq(reportsTable.userId, usersTable.id))
    .where(eq(reportsTable.id, params.data.id));

  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }

  const coReporters = await db
    .select({
      id: usersTable.id,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
    })
    .from(reportReportersTable)
    .leftJoin(usersTable, eq(reportReportersTable.userId, usersTable.id))
    .where(eq(reportReportersTable.reportId, params.data.id))
    .orderBy(reportReportersTable.createdAt);

  res.json({
    ...GetReportResponse.parse(report),
    reporters: coReporters,
  });
});

router.post("/reports/:id/escalate", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid report id" });
    return;
  }

  const [report] = await db
    .select({ id: reportsTable.id, userId: reportsTable.userId })
    .from(reportsTable)
    .where(eq(reportsTable.id, id));

  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }

  if (report.userId === req.user.id) {
    res.status(400).json({ error: "You are already the original reporter of this issue" });
    return;
  }

  const inserted = await db
    .insert(reportReportersTable)
    .values({ reportId: id, userId: req.user.id })
    .onConflictDoNothing()
    .returning();

  if (inserted.length > 0) {
    await db
      .update(reportsTable)
      .set({ reportersCount: sql`${reportsTable.reportersCount} + 1` })
      .where(eq(reportsTable.id, id));
  }

  const [updated] = await db
    .select({ reportersCount: reportsTable.reportersCount })
    .from(reportsTable)
    .where(eq(reportsTable.id, id));

  res.json({
    reportersCount: updated?.reportersCount ?? 1,
    escalated: inserted.length > 0,
    alreadyEscalated: inserted.length === 0,
  });
});

router.post("/reports/:id/confirm", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ConfirmReportParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const existing = await db
    .select()
    .from(reportConfirmationsTable)
    .where(
      and(
        eq(reportConfirmationsTable.userId, req.user.id),
        eq(reportConfirmationsTable.reportId, params.data.id)
      )
    );

  if (existing.length === 0) {
    await db.insert(reportConfirmationsTable).values({
      userId: req.user.id,
      reportId: params.data.id,
    }).onConflictDoNothing();

    await db
      .update(reportsTable)
      .set({ confirmationsCount: sql`${reportsTable.confirmationsCount} + 1` })
      .where(eq(reportsTable.id, params.data.id));
  }

  const [report] = await db
    .select({ confirmationsCount: reportsTable.confirmationsCount })
    .from(reportsTable)
    .where(eq(reportsTable.id, params.data.id));

  res.json(ConfirmReportResponse.parse({
    confirmationsCount: report?.confirmationsCount ?? 0,
    confirmed: true,
  }));
});

router.delete("/reports/:id/confirm", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UnconfirmReportParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(reportConfirmationsTable)
    .where(
      and(
        eq(reportConfirmationsTable.userId, req.user.id),
        eq(reportConfirmationsTable.reportId, params.data.id)
      )
    )
    .returning();

  if (deleted) {
    await db
      .update(reportsTable)
      .set({ confirmationsCount: sql`greatest(${reportsTable.confirmationsCount} - 1, 0)` })
      .where(eq(reportsTable.id, params.data.id));
  }

  const [report] = await db
    .select({ confirmationsCount: reportsTable.confirmationsCount })
    .from(reportsTable)
    .where(eq(reportsTable.id, params.data.id));

  res.json(UnconfirmReportResponse.parse({
    confirmationsCount: report?.confirmationsCount ?? 0,
    confirmed: false,
  }));
});

router.post("/reports/:id/resolve", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ResolveReportParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [freshUser] = await db
    .select({ isVerifier: usersTable.isVerifier, isAdmin: usersTable.isAdmin })
    .from(usersTable)
    .where(eq(usersTable.id, req.user.id));

  if (!freshUser?.isVerifier && !freshUser?.isAdmin) {
    res.status(403).json({ error: "Forbidden: verifier access required" });
    return;
  }

  await db
    .update(reportsTable)
    .set({
      resolvedCount: sql`${reportsTable.resolvedCount} + 1`,
      status: "resolved",
    })
    .where(eq(reportsTable.id, params.data.id));

  const [report] = await db
    .select({ resolvedCount: reportsTable.resolvedCount })
    .from(reportsTable)
    .where(eq(reportsTable.id, params.data.id));

  res.json(ResolveReportResponse.parse({
    resolvedCount: report?.resolvedCount ?? 1,
    resolved: true,
  }));
});

export default router;
