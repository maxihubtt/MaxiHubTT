import express from "express";
import { eq } from "drizzle-orm";
import { db, driversTable, pushSubscriptionsTable } from "@workspace/db";
import { supabase } from "../lib/supabase";
import { notifyDriverSignup } from "../lib/telegram";
import { hashPassword } from "../lib/password";
import { getVapidPublicKey } from "../lib/push";
import { requireDriver } from "../middleware/requireDriver";

const router = express.Router();

router.post("/signup", async (req, res) => {
  try {
    const { full_name, phone, password, number_plate, dp_number, taxi_badge_number } = req.body;

    if (!full_name || !phone || !password || !number_plate || !dp_number || !taxi_badge_number) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const password_hash = await hashPassword(password);

    if (!supabase) {
      return res.status(503).json({ error: "Database not configured" });
    }

    const { error } = await supabase.from("drivers").insert({
      full_name, phone, password_hash, number_plate, dp_number, taxi_badge_number,
      status: "pending",
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

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
