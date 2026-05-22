import express from "express";
import { eq, and, or } from "drizzle-orm";
import { db, driversTable, pushSubscriptionsTable, driverSignupsTable } from "@workspace/db";
import { notifyDriverSignup } from "../lib/telegram";
import { hashPassword } from "../lib/password";
import { getVapidPublicKey } from "../lib/push";
import { requireDriver } from "../middleware/requireDriver";

const router = express.Router();

router.post("/signup", async (req, res) => {
  try {
    const { full_name, username, phone, password, number_plate, dp_number, taxi_badge_number } = req.body;

    if (!full_name || !username || !phone || !password || !number_plate || !dp_number || !taxi_badge_number) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const cleanUsername = String(username).trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: "Username must be at least 3 characters (letters and numbers only)." });
    }

    const [takenInSignups] = await db
      .select({ id: driverSignupsTable.id })
      .from(driverSignupsTable)
      .where(and(
        eq(driverSignupsTable.username, cleanUsername),
        eq(driverSignupsTable.status, "pending"),
      ))
      .limit(1);
    const [takenInDrivers] = await db
      .select({ id: driversTable.id })
      .from(driversTable)
      .where(eq(driversTable.username, cleanUsername))
      .limit(1);
    if (takenInSignups || takenInDrivers) {
      return res.status(400).json({ error: "That username is already taken. Please choose another." });
    }

    const passwordHash = await hashPassword(password);
    const id = "DS" + Math.random().toString(36).slice(2, 10).toUpperCase();

    await db.insert(driverSignupsTable).values({
      id,
      fullName: full_name,
      username: cleanUsername,
      phone,
      passwordHash,
      numberPlate: number_plate,
      dpNumber: dp_number,
      taxiBadgeNumber: taxi_badge_number,
      status: "pending",
    });

    notifyDriverSignup({ full_name, phone, number_plate, dp_number, taxi_badge_number }).catch(() => {});

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.patch("/availability", requireDriver, async (req, res) => {
  const { availability } = req.body as { availability?: "available" | "offline" };
  const driverId = req.session.driverId;

  if (!driverId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  if (availability !== "available" && availability !== "offline") {
    return res.status(400).json({ error: "availability must be 'available' or 'offline'" });
  }

  await db
    .update(driversTable)
    .set({ availability, updatedAt: new Date() })
    .where(eq(driversTable.id, driverId));

  return res.json({ ok: true, availability });
});

router.get("/push-key", (_req, res) => {
  const key = getVapidPublicKey();
  if (!key) {
    return res.status(503).json({ error: "Push notifications not configured" });
  }
  return res.json({ publicKey: key });
});

router.post("/push-subscribe", requireDriver, async (req, res) => {
  const driverId = req.session.driverId;
  if (!driverId) return res.status(401).json({ error: "Not authenticated" });

  const { endpoint, keys } = req.body as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: "Invalid subscription object" });
  }

  const id = "PS" + Math.random().toString(36).slice(2, 10).toUpperCase();

  await db
    .insert(pushSubscriptionsTable)
    .values({ id, driverId, endpoint, p256dh: keys.p256dh, auth: keys.auth })
    .onConflictDoUpdate({
      target: pushSubscriptionsTable.endpoint,
      set: { driverId, p256dh: keys.p256dh, auth: keys.auth },
    });

  return res.json({ ok: true });
});

router.delete("/push-subscribe", requireDriver, async (req, res) => {
  const { endpoint } = req.body as { endpoint?: string };
  if (!endpoint) return res.status(400).json({ error: "endpoint required" });
  await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, endpoint));
  return res.json({ ok: true });
});

export default router;
