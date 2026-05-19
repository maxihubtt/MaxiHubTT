import { Request, Response, NextFunction } from "express";

export function requireDriver(req: Request, res: Response, next: NextFunction) {
  if (req.session?.driver) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
}
