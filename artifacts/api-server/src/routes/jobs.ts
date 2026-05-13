import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, jobsTable } from "@workspace/db";
import { CreateJobBody } from "@workspace/api-zod";
import { sendJobToGroup, notifyGroupClaimed, sendJobDetailsToDriver } from "../lib/telegram";
import { logger } from "../lib/logger";
import { requireAdmin } from "../middleware/requireAdmin";
import { requireDriver } from "../middleware/requireDriver";

const router = Router();

function generateId(): string {
  return "M" + Math.floor(Math.random() * 9999).toString().padStart(4, "0");
}

router.get("/driver/jobs", requireDriver, async (req, res) => {
  const jobs = await db.select().from(jobsTable).orderBy(jobsTable.createdAt);
  const driverName = req.session.driverName ?? "";
  res.json(
    jobs
      .filter(j => j.status === "pending" || j.claimedBy === driverName)
      .map(j => ({
        ...j,
        createdAt: j.createdAt.toISOString(),
        updatedAt: j.updatedAt.toISOString(),
      }))
  );
});

router.get("/jobs", requireAdmin, async (req, res) => {
  const jobs = await db.select().from(jobsTable).orderBy(jobsTable.createdAt);
  res.json(jobs.map(j => ({
    ...j,
    createdAt: j.createdAt.toISOString(),
    updatedAt: j.updatedAt.toISOString(),
  })));
});

router.get("/jobs/stats", requireAdmin, async (req, res) => {
  const all = await db.select().from(jobsTable);
  const stats = {
    total: all.length,
    pending: all.filter(j => j.status === "pending").length,
    claimed: all.filter(j => j.status === "claimed").length,
    completed: all.filter(j => j.status === "completed").length,
  };
  res.json(stats);
});

router.post("/jobs/:id/claim", requireDriver, async (req, res) => {
  const id = req.params["id"] as string;
  const driverName = req.session.driverName ?? (req.body as { driverName?: string }).driverName ?? "";

  if (!driverName.trim()) {
    res.status(400).json({ error: "Driver name not found in session" });
    return;
  }

  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  if (job.status !== "pending") {
    res.status(409).json({ error: "Job is already claimed or completed" });
    return;
  }

  const [updated] = await db
    .update(jobsTable)
    .set({ status: "claimed", claimedBy: driverName.trim(), updatedAt: new Date() })
    .where(eq(jobsTable.id, id))
    .returning();

  await notifyGroupClaimed(id, driverName.trim());
  req.log.info({ jobId: id, driverName }, "Job claimed via driver portal");

  res.json({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

router.patch("/jobs/:id/driver-info", requireAdmin, async (req, res) => {
  const id = req.params["id"] as string;
  const { vehicleType, numberPlate } = req.body as { vehicleType?: string; numberPlate?: string };

  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }

  const [updated] = await db
    .update(jobsTable)
    .set({
      ...(vehicleType !== undefined && { vehicleType }),
      ...(numberPlate !== undefined && { numberPlate }),
      updatedAt: new Date(),
    })
    .where(eq(jobsTable.id, id))
    .returning();

  req.log.info({ jobId: id, vehicleType, numberPlate }, "Driver info updated");
  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

router.patch("/jobs/:id/complete", requireAdmin, async (req, res) => {
  const id = req.params["id"] as string;
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));

  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  if (job.status === "completed") {
    res.status(409).json({ error: "Job is already completed" });
    return;
  }

  const [updated] = await db
    .update(jobsTable)
    .set({ status: "completed", updatedAt: new Date() })
    .where(eq(jobsTable.id, id))
    .returning();

  req.log.info({ jobId: id }, "Job marked as completed");
  res.json({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

router.get("/jobs/:id", async (req, res) => {
  const id = req.params["id"] as string;
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  res.json({
    ...job,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  });
});

router.post("/jobs", async (req, res) => {
  const parsed = CreateJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { pickup, dropoff, name, phone, price, passengers } = parsed.data;
  const id = generateId();

  const [job] = await db.insert(jobsTable).values({
    id,
    pickup,
    dropoff,
    name,
    phone,
    price,
    passengers: passengers ?? null,
    status: "pending",
  }).returning();

  const sent = await sendJobToGroup({ id, pickup, dropoff, price, passengers });
  if (!sent) {
    req.log.warn({ jobId: id }, "Failed to send job to Telegram group");
  }

  res.status(201).json({
    ...job,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  });
});

export async function handleDriverClaim(
  jobId: string,
  driverId: number,
  driverName: string
): Promise<void> {
  const [job] = await db
    .select()
    .from(jobsTable)
    .where(eq(jobsTable.id, jobId));

  if (!job || job.status !== "pending") {
    logger.info({ jobId }, "Job not found or already claimed");
    return;
  }

  await db
    .update(jobsTable)
    .set({ status: "claimed", claimedBy: driverName, updatedAt: new Date() })
    .where(eq(jobsTable.id, jobId));

  await sendJobDetailsToDriver(driverId, job);
  await notifyGroupClaimed(jobId, driverName);

  logger.info({ jobId, driverName }, "Job claimed by driver");
}

export default router;
