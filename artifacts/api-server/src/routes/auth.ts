import { Router } from "express";
import { logger } from "../lib/logger";

declare module "express-session" {
  interface SessionData {
    admin?: boolean;
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

export default router;
