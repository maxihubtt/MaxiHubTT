import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, driversTable } from "@workspace/db";
import { requireAdmin } from "../middleware/requireAdmin";
import { supabase } from "../lib/supabase";

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
  if (!supabase) {
    res.status(503).json({ error: "Supabase not configured" });
    return;
  }

  const { data, error } = await supabase
    .from("drivers")
    .select("id, full_name, phone, number_plate, dp_number, taxi_badge_number, status, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data ?? []);
});

router.post("/admin/driver-signups/:id/approve", requireAdmin, async (req, res) => {
  if (!supabase) {
    res.status(503).json({ error: "Supabase not configured" });
    return;
  }

  const { id } = req.params;

  const { data: rows, error: fetchErr } = await supabase
    .from("drivers")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !rows) {
    res.status(404).json({ error: "Signup not found" });
    return;
  }

  let username = generateUsername(rows.full_name);
  const existing = await db.select().from(driversTable).where(eq(driversTable.username, username));
  if (existing.length > 0) {
    username = generateUsername(rows.full_name);
  }

  const driverId = generateDriverId();

  await db.insert(driversTable).values({
    id: driverId,
    name: rows.full_name,
    username,
    passwordHash: rows.password_hash,
  });

  await supabase
    .from("drivers")
    .update({ status: "approved" })
    .eq("id", id);

  req.log.info({ driverId, username, supabaseId: id }, "Driver signup approved");
  res.json({ ok: true, username, driverId });
});

router.post("/admin/driver-signups/:id/reject", requireAdmin, async (req, res) => {
  if (!supabase) {
    res.status(503).json({ error: "Supabase not configured" });
    return;
  }

  const { id } = req.params;

  const { error } = await supabase
    .from("drivers")
    .update({ status: "rejected" })
    .eq("id", id);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  req.log.info({ supabaseId: id }, "Driver signup rejected");
  res.json({ ok: true });
});

export default router;
