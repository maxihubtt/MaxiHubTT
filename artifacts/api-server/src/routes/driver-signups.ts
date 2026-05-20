import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, driversTable, driverSignupsTable } from "@workspace/db";
import { requireAdmin } from "../middleware/requireAdmin";

const router = Router();

function generateDriverId(): string {
  return "D" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function generateUsername(fullName: string): string {
  const parts = fullName.trim().toLowerCase().split(/\s+/);
  const base = parts[0].replace(/[^a-z0-9]/g, "");
  const suffix = Math.floor(Math.random() * 900 + 100);
  return `${base}${suffix}`;
}

router.get("/admin/driver-signups", requireAdmin, async (req, res) => {
  const signups = await db
    .select()
    .from(driverSignupsTable)
    .where(eq(driverSignupsTable.status, "pending"));

  res.json(
    signups.map(s => ({
      id: s.id,
      full_name: s.fullName,
      phone: s.phone,
      number_plate: s.numberPlate,
      dp_number: s.dpNumber,
      taxi_badge_number: s.taxiBadgeNumber,
      status: s.status,
      created_at: s.createdAt.toISOString(),
    }))
  );
});

router.post("/admin/driver-signups/:id/approve", requireAdmin, async (req, res) => {
  const { id } = req.params;

  const [signup] = await db
    .select()
    .from(driverSignupsTable)
    .where(eq(driverSignupsTable.id, id));

  if (!signup) {
    res.status(404).json({ error: "Signup not found" });
    return;
  }

  let username = generateUsername(signup.fullName);
  const existing = await db.select().from(driversTable).where(eq(driversTable.username, username));
  if (existing.length > 0) {
    username = generateUsername(signup.fullName);
  }

  const driverId = generateDriverId();

  await db.insert(driversTable).values({
    id: driverId,
    name: signup.fullName,
    username,
    passwordHash: signup.passwordHash,
  });

  await db
    .update(driverSignupsTable)
    .set({ status: "approved", updatedAt: new Date() })
    .where(eq(driverSignupsTable.id, id));

  req.log.info({ driverId, username, signupId: id }, "Driver signup approved");
  res.json({ ok: true, username, driverId });
});

router.post("/admin/driver-signups/:id/reject", requireAdmin, async (req, res) => {
  const { id } = req.params;

  const [signup] = await db
    .select()
    .from(driverSignupsTable)
    .where(eq(driverSignupsTable.id, id));

  if (!signup) {
    res.status(404).json({ error: "Signup not found" });
    return;
  }

  await db
    .update(driverSignupsTable)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(eq(driverSignupsTable.id, id));

  req.log.info({ signupId: id }, "Driver signup rejected");
  res.json({ ok: true });
});

export default router;
