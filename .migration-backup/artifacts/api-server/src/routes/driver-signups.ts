import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, driversTable, driverSignupsTable } from "@workspace/db";
import { requireAdmin } from "../middleware/requireAdmin";

const router = Router();

function generateDriverId(): string {
  return "D" + Math.random().toString(36).slice(2, 8).toUpperCase();
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
      username: s.username,
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

  try {
    const [signup] = await db
      .select()
      .from(driverSignupsTable)
      .where(eq(driverSignupsTable.id, id));

    if (!signup) {
      res.status(404).json({ error: "Signup not found" });
      return;
    }

    const username = signup.username || signup.fullName.trim().toLowerCase().split(/\s+/)[0].replace(/[^a-z0-9]/g, "") + Math.floor(Math.random() * 900 + 100);

    const existing = await db.select().from(driversTable).where(eq(driversTable.username, username));
    if (existing.length > 0) {
      res.status(409).json({ error: `Username "@${username}" is already taken. Ask the driver to reapply with a different username.` });
      return;
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    req.log.error({ err, signupId: id }, "Failed to approve driver signup");
    res.status(500).json({ error: `Database error: ${msg}` });
  }
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
