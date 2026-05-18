import express from "express";
import bcrypt from "bcryptjs";
import { supabase } from "../lib/supabase";

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

    const password_hash = await bcrypt.hash(password, 10);

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
