import express from "express";

const router = express.Router();

router.post("/", (_req, res) => {
  res.status(503).json({ error: "Pricing service removed — fares are calculated locally." });
});

export default router;
