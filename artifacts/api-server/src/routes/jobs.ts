import { Router } from "express";
import { eq, desc, and, isNotNull } from "drizzle-orm";
import { db, jobsTable, adminConfigTable } from "@workspace/db";
import { DEFAULT_CONFIG, type ConfigKey } from "@workspace/db";
import { CreateJobBody } from "@workspace/api-zod";
import { sendJobToGroup, notifyGroupClaimed, sendJobDetailsToDriver } from "../lib/telegram";
import { logger } from "../lib/logger";
import { requireAdmin } from "../middleware/requireAdmin";
import { requireDriver } from "../middleware/requireDriver";
import { sendPushToAllDrivers } from "../lib/push";

const router = Router();

// ── Helpers ────────────────────────────────────────────────────────────────────

function generateId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "M";
  for (let i = 0; i < 7; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

// Extract the leading TTD number from a price string
function parseJobPrice(price: string): number {
  const match = price.match(/^TTD\s+([\d,]+(?:\.\d+)?)/);
  if (!match) return 0;
  return parseFloat(match[1].replace(/,/g, "")) || 0;
}

async function getConfig(): Promise<Record<string, string>> {
  const rows = await db.select().from(adminConfigTable);
  const config: Record<string, string> = { ...DEFAULT_CONFIG };
  for (const row of rows) config[row.key] = row.value;
  return config;
}

function classifyUrgency(
  pickupDatetime: string | undefined | null,
  sameDayMinHours: number,
  minBookingHours: number
): "standard" | "same_day" | "urgent" {
  if (!pickupDatetime) return "standard";
  const hoursUntil = (new Date(pickupDatetime).getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursUntil < sameDayMinHours) return "urgent";
  if (hoursUntil < minBookingHours) return "same_day";
  return "standard";
}

function serializeJob(j: typeof jobsTable.$inferSelect) {
  return {
    ...j,
    createdAt: j.createdAt.toISOString(),
    updatedAt: j.updatedAt.toISOString(),
    expiresAt: j.expiresAt ? j.expiresAt.toISOString() : null,
  };
}

// ── Driver endpoints ───────────────────────────────────────────────────────────

router.get("/driver/jobs", requireDriver, async (req, res) => {
  const driverName = req.session.driverName ?? "";
  const jobs = await db.select().from(jobsTable).orderBy(jobsTable.createdAt);
  res.json(
    jobs
      .filter(j => {
        // Show admin-dispatched (pending) and deposit-confirmed (deposit_received) to all drivers
        // Show driver's own claimed/assigned jobs
        const isAvailableForDrivers = j.status === "pending" || j.status === "deposit_received";
        const isDriversOwn = j.claimedBy === driverName && !["completed", "cancelled", "expired"].includes(j.status);
        return isAvailableForDrivers || isDriversOwn;
      })
      .map(j => {
        const base = {
          id: j.id,
          pickup: j.pickup,
          dropoff: j.dropoff,
          status: j.status,
          urgency: j.urgency,
          depositPaid: j.depositPaid,
          price: j.price,
          passengers: j.passengers,
          vehicleType: j.vehicleType,
          numberPlate: j.numberPlate,
          claimedBy: j.claimedBy,
          pickupDatetime: j.pickupDatetime ?? null,
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
      urgency: j.urgency,
      price: j.price,
      passengers: j.passengers,
      pickupDatetime: j.pickupDatetime ?? null,
      rating: j.rating ?? null,
      createdAt: j.createdAt.toISOString(),
      updatedAt: j.updatedAt.toISOString(),
    }))
  );
});

// ── Driver: update own job status (en_route / completed) ──────────────────────

router.patch("/jobs/:id/driver-status", requireDriver, async (req, res) => {
  const id = req.params["id"] as string;
  const driverName = req.session.driverName ?? "";
  const { status } = req.body as { status?: string };

  const allowed = ["driver_en_route", "completed"];
  if (!status || !allowed.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${allowed.join(", ")}` });
    return;
  }

  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  if (job.claimedBy !== driverName) { res.status(403).json({ error: "Not your job" }); return; }

  const [updated] = await db
    .update(jobsTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(jobsTable.id, id))
    .returning();

  req.log.info({ jobId: id, status, driverName }, "Driver updated job status");
  res.json(serializeJob(updated));
});

// ── Admin job list ─────────────────────────────────────────────────────────────

router.get("/jobs", requireAdmin, async (req, res) => {
  const jobs = await db.select().from(jobsTable).orderBy(jobsTable.createdAt);
  res.json(jobs.map(serializeJob));
});

// ── Admin stats ────────────────────────────────────────────────────────────────

router.get("/jobs/stats", requireAdmin, async (req, res) => {
  const all = await db.select().from(jobsTable);
  res.json({
    total:           all.length,
    pending:         all.filter(j => j.status === "pending").length,
    pendingDeposit:  all.filter(j => j.status === "pending_deposit").length,
    depositReceived: all.filter(j => j.status === "deposit_received").length,
    claimed:         all.filter(j => j.status === "claimed" || j.status === "driver_assigned").length,
    completed:       all.filter(j => j.status === "completed").length,
    expired:         all.filter(j => j.status === "expired").length,
    cancelled:       all.filter(j => j.status === "cancelled").length,
  });
});

// ── Analytics ─────────────────────────────────────────────────────────────────

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

// ── Claim job ─────────────────────────────────────────────────────────────────

router.post("/jobs/:id/claim", requireDriver, async (req, res) => {
  const id = req.params["id"] as string;
  const driverName = req.session.driverName ?? (req.body as { driverName?: string }).driverName ?? "";

  if (!driverName.trim()) {
    res.status(400).json({ error: "Driver name not found in session" });
    return;
  }

  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }

  const claimableStatuses = ["pending", "deposit_received"];
  if (!claimableStatuses.includes(job.status)) {
    res.status(409).json({ error: "Job is not available to claim" });
    return;
  }

  const newStatus = job.status === "deposit_received" ? "driver_assigned" : "claimed";

  const [updated] = await db
    .update(jobsTable)
    .set({ status: newStatus, claimedBy: driverName.trim(), updatedAt: new Date() })
    .where(eq(jobsTable.id, id))
    .returning();

  await notifyGroupClaimed(id, driverName.trim());
  req.log.info({ jobId: id, driverName }, "Job claimed via driver portal");
  res.json(serializeJob(updated));
});

// ── Admin: driver-info ─────────────────────────────────────────────────────────

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
  res.json(serializeJob(updated));
});

// ── Admin: complete job ────────────────────────────────────────────────────────

router.patch("/jobs/:id/complete", requireAdmin, async (req, res) => {
  const id = req.params["id"] as string;
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  if (job.status === "completed") { res.status(409).json({ error: "Job is already completed" }); return; }

  const [updated] = await db
    .update(jobsTable)
    .set({ status: "completed", updatedAt: new Date() })
    .where(eq(jobsTable.id, id))
    .returning();

  req.log.info({ jobId: id }, "Job marked as completed");
  res.json(serializeJob(updated));
});

// ── Admin: mark deposit paid ───────────────────────────────────────────────────

router.patch("/jobs/:id/deposit-paid", requireAdmin, async (req, res) => {
  const id = req.params["id"] as string;
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }

  const [updated] = await db
    .update(jobsTable)
    .set({ depositPaid: true, status: "deposit_received", expiresAt: null, updatedAt: new Date() })
    .where(eq(jobsTable.id, id))
    .returning();

  req.log.info({ jobId: id }, "Deposit marked as paid — job moved to deposit_received");

  // Send Telegram + push notifications now that deposit is confirmed
  sendJobToGroup({ id: updated.id, pickup: updated.pickup, dropoff: updated.dropoff, price: updated.price, passengers: updated.passengers }).catch(() => {});
  sendPushToAllDrivers({
    title: "New Job Ready",
    body: `${updated.pickup} → ${updated.dropoff} · Deposit confirmed`,
    tag: "deposit-confirmed",
  }).catch(() => {});

  res.json(serializeJob(updated));
});

// ── Admin: update status ──────────────────────────────────────────────────────

router.patch("/jobs/:id/status", requireAdmin, async (req, res) => {
  const id = req.params["id"] as string;
  const { status } = req.body as { status: string };

  const validStatuses = ["pending", "pending_deposit", "deposit_received", "driver_assigned", "driver_en_route", "claimed", "completed", "cancelled", "expired"];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: `Invalid status: ${status}` });
    return;
  }

  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }

  const [updated] = await db
    .update(jobsTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(jobsTable.id, id))
    .returning();

  req.log.info({ jobId: id, status }, "Job status updated by admin");
  res.json(serializeJob(updated));
});

// ── Admin: export CSV ─────────────────────────────────────────────────────────

router.get("/jobs/export", requireAdmin, async (req, res) => {
  const jobs = await db.select().from(jobsTable).orderBy(desc(jobsTable.createdAt));
  const headers = ["id","pickup","dropoff","name","phone","price","passengers","status","urgency","depositAmount","depositPaid","rushFee","pickupDatetime","claimedBy","vehicleType","numberPlate","notes","createdAt","updatedAt"];
  const escape = (v: unknown) => {
    if (v == null) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const rows = [headers.join(","), ...jobs.map(j =>
    [j.id,j.pickup,j.dropoff,j.name,j.phone,j.price,j.passengers,j.status,j.urgency,j.depositAmount,j.depositPaid,j.rushFee,j.pickupDatetime,j.claimedBy,j.vehicleType,j.numberPlate,j.notes,j.createdAt.toISOString(),j.updatedAt.toISOString()].map(escape).join(",")
  )];
  const today = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="maxihub-jobs-${today}.csv"`);
  res.send(rows.join("\n"));
});

// ── Admin: re-dispatch to Telegram ────────────────────────────────────────────

router.post("/jobs/:id/redispatch", requireAdmin, async (req, res) => {
  const id = req.params["id"] as string;
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  const sent = await sendJobToGroup({ id: job.id, pickup: job.pickup, dropoff: job.dropoff, price: job.price, passengers: job.passengers });
  if (!sent) { res.status(503).json({ error: "Telegram not configured or send failed" }); return; }
  req.log.info({ jobId: id }, "Job re-dispatched to Telegram by admin");
  res.json({ ok: true });
});

// ── Admin: update price ───────────────────────────────────────────────────────

router.patch("/jobs/:id/price", requireAdmin, async (req, res) => {
  const id = req.params["id"] as string;
  const { price } = req.body as { price?: string };
  if (!price?.trim()) { res.status(400).json({ error: "Price is required" }); return; }
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  const [updated] = await db.update(jobsTable).set({ price: price.trim(), updatedAt: new Date() }).where(eq(jobsTable.id, id)).returning();
  req.log.info({ jobId: id, price }, "Job price updated by admin");
  res.json(serializeJob(updated));
});

// ── Admin: update notes ───────────────────────────────────────────────────────

router.patch("/jobs/:id/notes", requireAdmin, async (req, res) => {
  const id = req.params["id"] as string;
  const { notes } = req.body as { notes?: string };
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  const [updated] = await db.update(jobsTable).set({ notes: notes ?? null, updatedAt: new Date() }).where(eq(jobsTable.id, id)).returning();
  req.log.info({ jobId: id }, "Job notes updated by admin");
  res.json(serializeJob(updated));
});

// ── Admin: update deposit amount ──────────────────────────────────────────────

router.patch("/jobs/:id/deposit-amount", requireAdmin, async (req, res) => {
  const id = req.params["id"] as string;
  const { depositAmount } = req.body as { depositAmount?: number };
  if (depositAmount == null || isNaN(depositAmount)) { res.status(400).json({ error: "depositAmount (number) is required" }); return; }
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  const [updated] = await db.update(jobsTable).set({ depositAmount, updatedAt: new Date() }).where(eq(jobsTable.id, id)).returning();
  req.log.info({ jobId: id, depositAmount }, "Job deposit amount updated by admin");
  res.json(serializeJob(updated));
});

// ── Get job by ID ─────────────────────────────────────────────────────────────

router.get("/jobs/:id", async (req, res) => {
  const id = req.params["id"] as string;
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }

  const base = {
    id: job.id,
    pickup: job.pickup,
    dropoff: job.dropoff,
    status: job.status,
    urgency: job.urgency,
    depositAmount: job.depositAmount,
    rushFee: job.rushFee,
    depositPaid: job.depositPaid,
    expiresAt: job.expiresAt ? job.expiresAt.toISOString() : null,
    pickupDatetime: job.pickupDatetime,
    price: job.price,
    passengers: job.passengers,
    vehicleType: job.vehicleType,
    numberPlate: job.numberPlate,
    claimedBy: job.claimedBy,
    rating: job.rating ?? null,
    ratingComment: job.ratingComment ?? null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };

  if (req.session?.admin) {
    res.json({ ...base, name: job.name, phone: job.phone });
  } else {
    res.json(base);
  }
});

// ── Customer: rate a completed job ────────────────────────────────────────────

router.patch("/jobs/:id/rate", async (req, res) => {
  const id = req.params["id"] as string;
  const { rating, comment } = req.body as { rating?: unknown; comment?: string };

  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    res.status(400).json({ error: "rating must be an integer between 1 and 5" });
    return;
  }

  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  if (job.status !== "completed") {
    res.status(400).json({ error: "Only completed jobs can be rated" });
    return;
  }
  if (job.rating !== null && job.rating !== undefined) {
    res.status(409).json({ error: "This job has already been rated" });
    return;
  }

  const [updated] = await db
    .update(jobsTable)
    .set({ rating, ratingComment: comment?.trim() ?? null, updatedAt: new Date() })
    .where(eq(jobsTable.id, id))
    .returning();

  req.log.info({ jobId: id, rating }, "Customer rated job");
  res.json({ ok: true, rating: updated.rating, ratingComment: updated.ratingComment });
});

// ── Create job (customer booking or admin dispatch) ───────────────────────────

router.post("/jobs", async (req, res) => {
  const parsed = CreateJobBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ issues: parsed.error.issues }, "Invalid create-job request body");
    res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
    return;
  }

  const { pickup, dropoff, name, phone, price, passengers } = parsed.data;
  const pickupDatetime = (req.body as { pickupDatetime?: string }).pickupDatetime ?? null;
  const notes = (req.body as { notes?: string }).notes?.trim() ?? null;
  const email = (req.body as { email?: string }).email?.trim() ?? null;
  const isAdmin = req.session?.admin === true;

  let urgency: "standard" | "same_day" | "urgent" = "standard";
  let depositAmount: number | null = null;
  let rushFee = 0;
  let expiresAt: Date | null = null;
  let status = "pending";

  if (!isAdmin) {
    const config = await getConfig();
    const sameDayMinHours = parseFloat(config["same_day_min_hours"] ?? DEFAULT_CONFIG.same_day_min_hours);
    const minBookingHours = parseFloat(config["min_booking_hours"] ?? DEFAULT_CONFIG.min_booking_hours);
    const depositPct = parseInt(config["deposit_pct"] ?? DEFAULT_CONFIG.deposit_pct) / 100;
    const rushFeeConfig = parseInt(config["rush_fee"] ?? DEFAULT_CONFIG.rush_fee);
    const depositExpiryMins = parseInt(config["deposit_expiry_mins"] ?? DEFAULT_CONFIG.deposit_expiry_mins);

    urgency = classifyUrgency(pickupDatetime, sameDayMinHours, minBookingHours);

    const fare = parseJobPrice(price);
    if (fare > 0) {
      if (urgency === "urgent") {
        rushFee = rushFeeConfig;
        depositAmount = fare + rushFee;
      } else {
        depositAmount = Math.ceil(fare * depositPct);
      }
    }

    expiresAt = new Date(Date.now() + depositExpiryMins * 60 * 1000);
    status = "pending_deposit";
  }

  let job: typeof jobsTable.$inferSelect;
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
      status,
      urgency,
      depositAmount,
      rushFee,
      depositPaid: isAdmin,
      expiresAt,
      pickupDatetime: pickupDatetime ?? null,
      notes: notes ?? null,
      email: email ?? null,
    }).returning();
    job = inserted;
  } catch (err) {
    req.log.error({ err }, "Failed to insert job into database");
    res.status(500).json({ error: "Failed to create booking. Please try again." });
    return;
  }

  res.status(201).json(serializeJob(job));

  // For admin-dispatched jobs, notify drivers immediately
  if (isAdmin) {
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
  }
  // For customer bookings, notifications are sent after deposit is marked paid
});

// ── Telegram claim handler (used by bot polling) ──────────────────────────────

export async function handleDriverClaim(
  jobId: string,
  driverId: number,
  driverName: string
): Promise<void> {
  const [job] = await db
    .select()
    .from(jobsTable)
    .where(eq(jobsTable.id, jobId));

  if (!job || !["pending", "deposit_received"].includes(job.status)) {
    logger.info({ jobId }, "Job not found or not claimable");
    return;
  }

  const newStatus = job.status === "deposit_received" ? "driver_assigned" : "claimed";

  await db
    .update(jobsTable)
    .set({ status: newStatus, claimedBy: driverName, updatedAt: new Date() })
    .where(eq(jobsTable.id, jobId));

  await sendJobDetailsToDriver(driverId, job);
  await notifyGroupClaimed(jobId, driverName);

  logger.info({ jobId, driverName }, "Job claimed by driver via Telegram");
}

export default router;
