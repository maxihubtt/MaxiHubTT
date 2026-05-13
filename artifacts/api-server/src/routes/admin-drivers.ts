import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, driversTable } from "@workspace/db";
import { requireAdmin } from "../middleware/requireAdmin";
import { hashPassword } from "../lib/password";

const router = Router();

function generateDriverId(): string {
  return "D" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

router.get("/admin/drivers", requireAdmin, async (req, res) => {
  const drivers = await db
    .select({ id: driversTable.id, name: driversTable.name, username: driversTable.username, createdAt: driversTable.createdAt })
    .from(driversTable)
    .orderBy(driversTable.createdAt);
  res.json(drivers.map(d => ({ ...d, createdAt: d.createdAt.toISOString() })));
});

router.post("/admin/drivers", requireAdmin, async (req, res) => {
  const { name, username, password } = req.body as { name?: string; username?: string; password?: string };

  if (!name?.trim() || !username?.trim() || !password?.trim()) {
    res.status(400).json({ error: "name, username, and password are required" });
    return;
  }

  const existing = await db.select().from(driversTable).where(eq(driversTable.username, username.trim().toLowerCase()));
  if (existing.length > 0) {
    res.status(409).json({ error: "Username already taken" });
    return;
  }

  const passwordHash = await hashPassword(password.trim());
  const id = generateDriverId();

  const [driver] = await db.insert(driversTable).values({
    id,
    name: name.trim(),
    username: username.trim().toLowerCase(),
    passwordHash,
  }).returning({ id: driversTable.id, name: driversTable.name, username: driversTable.username, createdAt: driversTable.createdAt });

  req.log.info({ driverId: id, username }, "Driver account created");
  res.status(201).json({ ...driver, createdAt: driver.createdAt.toISOString() });
});

router.patch("/admin/drivers/:id/reset-password", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { password } = req.body as { password?: string };

  if (!password?.trim()) {
    res.status(400).json({ error: "password is required" });
    return;
  }

  const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, id as string));
  if (!driver) { res.status(404).json({ error: "Driver not found" }); return; }

  const passwordHash = await hashPassword(password.trim());
  await db.update(driversTable).set({ passwordHash, updatedAt: new Date() }).where(eq(driversTable.id, id as string));

  req.log.info({ driverId: id }, "Driver password reset");
  res.json({ ok: true });
});

router.delete("/admin/drivers/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, id as string));
  if (!driver) { res.status(404).json({ error: "Driver not found" }); return; }

  await db.delete(driversTable).where(eq(driversTable.id, id as string));
  req.log.info({ driverId: id }, "Driver account deleted");
  res.json({ ok: true });
});

export default router;
