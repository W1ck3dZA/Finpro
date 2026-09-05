import { NextFunction, Request, Response } from "express";

/** Must run after `authenticate`. Backend-enforced role check — the real security boundary. */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}
