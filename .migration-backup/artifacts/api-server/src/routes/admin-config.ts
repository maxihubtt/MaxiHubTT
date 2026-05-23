import { Router } from "express";
import { db, adminConfigTable } from "@workspace/db";
import { DEFAULT_CONFIG, type ConfigKey } from "@workspace/db";
import { requireAdmin } from "../middleware/requireAdmin";

const router = Router();

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

export default router;
