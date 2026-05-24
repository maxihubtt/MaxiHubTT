import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, driversTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { verifyPassword } from "../lib/password";

declare module "express-session" {
  interface SessionData {
    admin?: boolean;
    driver?: boolean;
    driverId?: string;
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

router.post("/auth/driver-login", async (req, res) => {
  const { username, password, rememberMe } = req.body as { username?: string; password?: string; rememberMe?: boolean };

  if (!username?.trim() || !password?.trim()) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }

  const [driver] = await db
    .select()
    .from(driversTable)
    .where(eq(driversTable.username, username.trim().toLowerCase()));

  if (!driver) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const valid = await verifyPassword(driver.passwordHash, password.trim());
  if (!valid) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  req.session.driver = true;
  req.session.driverId = driver.id;
  req.session.driverName = driver.name;
  if (rememberMe) {
    req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
  }
  req.session.save((err) => {
    if (err) {
      logger.error({ err }, "Failed to save driver session");
      res.status(500).json({ error: "Session error" });
      return;
    }
    res.json({ ok: true, name: driver.name });
  });
});

router.get("/auth/driver-me", async (req, res) => {
  if (!req.session?.driver || !req.session.driverId) {
    res.status(401).json({ authenticated: false });
    return;
  }
  const [driver] = await db
    .select({ name: driversTable.name, availability: driversTable.availability })
    .from(driversTable)
    .where(eq(driversTable.id, req.session.driverId));
  if (!driver) {
    res.status(401).json({ authenticated: false });
    return;
  }
  res.json({ authenticated: true, name: driver.name, availability: driver.availability });
});

router.post("/auth/driver-logout", (req, res) => {
  req.session.driver = undefined;
  req.session.driverName = undefined;
  req.session.save(() => {
    res.json({ ok: true });
  });
});

export default router;
