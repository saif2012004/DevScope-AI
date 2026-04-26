import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.auth = { userId };
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}
