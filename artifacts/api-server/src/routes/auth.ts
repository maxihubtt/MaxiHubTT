import { Router } from "express";
import { logger } from "../lib/logger";

declare module "express-session" {
  interface SessionData {
    admin?: boolean;
    driver?: boolean;
    driverName?: string;
  }
}

const router = Router();

router.get("/auth/me", (req, res) => {
  if (req.session?.admin) {
    res.json({ authenticated: true });
  } else {
    res.status(401).json({ authenticated: false });
  }
});

router.post("/auth/login", (req, res) => {
  const { password } = req.body as { password?: string };
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    logger.error("ADMIN_PASSWORD environment variable is not set");
    res.status(500).json({ error: "Server misconfiguration" });
    return;
  }

  if (password && password === adminPassword) {
    req.session.admin = true;
    req.session.save((err) => {
      if (err) {
        logger.error({ err }, "Failed to save session");
        res.status(500).json({ error: "Session error" });
        return;
      }
      res.json({ ok: true });
    });
  } else {
    res.status(401).json({ error: "Incorrect password" });
  }
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.post("/auth/driver-login", (req, res) => {
  const { name, pin } = req.body as { name?: string; pin?: string };
  const driverPin = process.env.DRIVER_PIN;

  if (!driverPin) {
    logger.error("DRIVER_PIN environment variable is not set");
    res.status(500).json({ error: "Server misconfiguration — DRIVER_PIN not set" });
    return;
  }

  if (!name?.trim()) {
    res.status(400).json({ error: "Name is required" });
    return;
  }

  if (pin === driverPin) {
    req.session.driver = true;
    req.session.driverName = name.trim();
    req.session.save((err) => {
      if (err) {
        logger.error({ err }, "Failed to save driver session");
        res.status(500).json({ error: "Session error" });
        return;
      }
      res.json({ ok: true, name: name.trim() });
    });
  } else {
    res.status(401).json({ error: "Incorrect PIN" });
  }
});

router.get("/auth/driver-me", (req, res) => {
  if (req.session?.driver) {
    res.json({ authenticated: true, name: req.session.driverName ?? "" });
  } else {
    res.status(401).json({ authenticated: false });
  }
});

router.post("/auth/driver-logout", (req, res) => {
  req.session.driver = undefined;
  req.session.driverName = undefined;
  req.session.save(() => {
    res.json({ ok: true });
  });
});

export default router;
