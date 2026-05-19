import express from "express";
import { supabase } from "../lib/supabase";
import { notifyDriverSignup } from "../lib/telegram";
import { hashPassword } from "../lib/password";

const router = express.Router();

router.post("/signup", async (req, res) => {
  try {
    const {
      full_name,
      phone,
      password,
      number_plate,
      dp_number,
      taxi_badge_number,
    } = req.body;

    if (
      !full_name ||
      !phone ||
      !password ||
      !number_plate ||
      !dp_number ||
      !taxi_badge_number
    ) {
      return res.status(400).json({
        error: "All fields are required",
      });
    }

    const password_hash = await hashPassword(password);

    if (!supabase) {
      return res.status(503).json({ error: "Database not configured" });
    }

    const { error } = await supabase
      .from("drivers")
      .insert({
        full_name,
        phone,
        password_hash,
        number_plate,
        dp_number,
        taxi_badge_number,
        status: "pending",
        availability: "offline",
      });

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    // Fire-and-forget: notify Telegram group — never blocks the response
    notifyDriverSignup({ full_name, phone, number_plate, dp_number, taxi_badge_number }).catch(() => {});

    return res.json({
      success: true,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Server error",
    });
  }
});

export default router;
