import { Router } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, jobsTable } from "@workspace/db";
import { CreateJobBody } from "@workspace/api-zod";
import { sendJobToGroup, notifyGroupClaimed, sendJobDetailsToDriver } from "../lib/telegram";
import { logger } from "../lib/logger";
import { requireAdmin } from "../middleware/requireAdmin";
import { requireDriver } from "../middleware/requireDriver";
import { sendPushToAllDrivers } from "../lib/push";

const router = Router();

function generateId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "M";
  for (let i = 0; i < 7; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

router.get("/driver/jobs", requireDriver, async (req, res) => {
  const jobs = await db.select().from(jobsTable).orderBy(jobsTable.createdAt);
  const driverName = req.session.driverName ?? "";
  res.json(
    jobs
      .filter(j => j.status === "pending" || j.claimedBy === driverName)
      .map(j => {
        const base = {
          id: j.id,
          pickup: j.pickup,
          dropoff: j.dropoff,
          status: j.status,
          price: j.price,
          passengers: j.passengers,
          vehicleType: j.vehicleType,
          numberPlate: j.numberPlate,
          claimedBy: j.claimedBy,
          createdAt: j.createdAt.toISOString(),
          updatedAt: j.updatedAt.toISOString(),
        };
        if (j.claimedBy === driverName) {
          return { ...base, name: j.name, phone: j.phone };
        }
        return base;
      })
  );
});

router.get("/driver/jobs/history", requireDriver, async (req, res) => {
  const driverName = req.session.driverName ?? "";
  const history = await db
    .select()
    .from(jobsTable)
    .where(eq(jobsTable.claimedBy, driverName))
    .orderBy(desc(jobsTable.updatedAt));
  res.json(
    history.map(j => ({
      id: j.id,
      pickup: j.pickup,
      dropoff: j.dropoff,
      status: j.status,
      price: j.price,
      passengers: j.passengers,
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

// Price strings are stored as e.g. "TTD 1,200 (Round Trip, 8 passengers) — Pickup: ..."
// We extract ONLY the number immediately after "TTD " to avoid picking up dates/times.
function parseJobPrice(price: string): number {
  const match = price.match(/^TTD\s+([\d,]+(?:\.\d+)?)/);
  if (!match) return 0;
  return parseFloat(match[1].replace(/,/g, "")) || 0;
}

router.get("/jobs/analytics", requireAdmin, async (req, res) => {
  const all = await db.select().from(jobsTable).orderBy(desc(jobsTable.createdAt));

  const now = new Date();
  const days: { date: string; count: number; revenue: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayJobs = all.filter(j => j.createdAt.toISOString().slice(0, 10) === dateStr);
    const revenue = dayJobs.reduce((sum, j) => sum + parseJobPrice(j.price), 0);
    days.push({ date: dateStr, count: dayJobs.length, revenue: Math.round(revenue * 100) / 100 });
  }

  const totalRevenue = all
    .filter(j => j.status === "completed")
    .reduce((sum, j) => sum + parseJobPrice(j.price), 0);

  const driverActivity: Record<string, number> = {};
  for (const j of all.filter(j => j.claimedBy)) {
    const name = j.claimedBy as string;
    driverActivity[name] = (driverActivity[name] ?? 0) + 1;
  }
  const topDrivers = Object.entries(driverActivity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, jobs]) => ({ name, jobs }));

  res.json({ days, totalRevenue: Math.round(totalRevenue * 100) / 100, topDrivers });
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

  const base = {
    id: job.id,
    pickup: job.pickup,
    dropoff: job.dropoff,
    status: job.status,
    price: job.price,
    passengers: job.passengers,
    vehicleType: job.vehicleType,
    numberPlate: job.numberPlate,
    claimedBy: job.claimedBy,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };

  if (req.session?.admin) {
    res.json({ ...base, name: job.name, phone: job.phone });
  } else {
    res.json(base);
  }
});

router.post("/jobs", async (req, res) => {
  const parsed = CreateJobBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ issues: parsed.error.issues }, "Invalid create-job request body");
    res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
    return;
  }

  const { pickup, dropoff, name, phone, price, passengers } = parsed.data;

  let job: typeof import("@workspace/db").jobsTable.$inferSelect;
  try {
    const id = generateId();
    const [inserted] = await db.insert(jobsTable).values({
      id,
      pickup,
      dropoff,
      name,
      phone,
      price,
      passengers: passengers ?? null,
      status: "pending",
    }).returning();
    job = inserted;
  } catch (err) {
    req.log.error({ err }, "Failed to insert job into database");
    res.status(500).json({ error: "Failed to create booking. Please try again." });
    return;
  }

  res.status(201).json({
    ...job,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  });

  sendJobToGroup({ id: job.id, pickup, dropoff, price, passengers }).then(sent => {
    if (!sent) req.log.warn({ jobId: job.id }, "Failed to send job to Telegram group");
  }).catch(err => {
    req.log.error({ err, jobId: job.id }, "Unexpected error sending job to Telegram");
  });

  sendPushToAllDrivers({
    title: "New Job Available",
    body: `${pickup} → ${dropoff} · TT$${price}`,
    tag: "new-job",
  }).catch(err => {
    req.log.error({ err, jobId: job.id }, "Failed to send push notifications");
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
