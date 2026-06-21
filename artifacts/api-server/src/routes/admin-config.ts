import { Router } from "express";
import webpush from "web-push";
import { db, adminConfigTable } from "@workspace/db";
import { DEFAULT_CONFIG, type ConfigKey } from "@workspace/db";
import { requireAdmin } from "../middleware/requireAdmin";
import { sendJobToGroup } from "../lib/telegram";

const router = Router();

router.get("/config/booking", async (_req, res) => {
  try {
    const rows = await db.select().from(adminConfigTable);
    const config: Record<string, string> = { ...DEFAULT_CONFIG };
    for (const row of rows) {
      config[row.key] = row.value;
    }
    res.json({
      deposit_pct: Number(config.deposit_pct),
      rush_fee: Number(config.rush_fee),
      min_booking_hours: Number(config.min_booking_hours),
      same_day_min_hours: Number(config.same_day_min_hours),
      urgent_enabled: config.urgent_enabled === "true",
    });
  } catch {
    res.json({
      deposit_pct: 25,
      rush_fee: 150,
      min_booking_hours: 6,
      same_day_min_hours: 2,
      urgent_enabled: true,
    });
  }
});

router.get("/admin/vapid", requireAdmin, (_req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (publicKey && privateKey) {
    return res.json({ configured: true, publicKey });
  }
  const keys = webpush.generateVAPIDKeys();
  return res.json({
    configured: false,
    publicKey: keys.publicKey,
    privateKey: keys.privateKey,
    instructions: "Set these as VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables on your Render service, then redeploy.",
  });
});

router.get("/admin/config", requireAdmin, async (_req, res) => {
  const rows = await db.select().from(adminConfigTable);
  const config: Record<string, string> = { ...DEFAULT_CONFIG };
  for (const row of rows) {
    config[row.key] = row.value;
  }
  res.json(config);
});

router.put("/admin/config", requireAdmin, async (req, res) => {
  const body = req.body as Record<string, string>;
  const validKeys = Object.keys(DEFAULT_CONFIG) as ConfigKey[];
  for (const key of validKeys) {
    if (key in body && typeof body[key] === "string") {
      await db
        .insert(adminConfigTable)
        .values({ key, value: body[key] })
        .onConflictDoUpdate({ target: adminConfigTable.key, set: { value: body[key] } });
    }
  }
  const rows = await db.select().from(adminConfigTable);
  const config: Record<string, string> = { ...DEFAULT_CONFIG };
  for (const row of rows) {
    config[row.key] = row.value;
  }
  res.json(config);
});

router.post("/admin/telegram/test", requireAdmin, async (_req, res) => {
  const ok = await sendJobToGroup({
    id: "TEST-001",
    pickup: "Port of Spain",
    dropoff: "Piarco International Airport",
    price: "TTD 250",
    passengers: "2",
  });
  if (ok) {
    res.json({ success: true, message: "Test message sent to Telegram group." });
  } else {
    res.status(500).json({ success: false, message: "Failed to send. Check that TELEGRAM_BOT_TOKEN and TELEGRAM_GROUP_ID are set correctly." });
  }
});

export default router;
