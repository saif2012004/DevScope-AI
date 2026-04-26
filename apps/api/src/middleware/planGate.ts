import type { NextFunction, Request, Response } from "express";
import { PlanType } from "@devscope/db";
import { prisma } from "../lib/prisma";

function startOfUtcMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

function startOfNextUtcMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 0, 0, 0, 0));
}

export function planGate(feature: "unlimited_repos" | "unlimited_messages") {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const clerkId = req.auth?.userId;
    if (!clerkId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        _count: { select: { repos: true } },
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (user.plan === PlanType.PRO) {
      next();
      return;
    }

    if (feature === "unlimited_repos") {
      if (user._count.repos >= 1) {
        res.status(403).json({
          error: "Upgrade to Pro to add unlimited repos",
          upgradeRequired: true,
        });
        return;
      }
    }

    if (feature === "unlimited_messages") {
      const from = startOfUtcMonth(new Date());
      const to = startOfNextUtcMonth(new Date());
      const count = await prisma.usageLog.count({
        where: {
          userId: user.id,
          action: "chat_message",
          createdAt: { gte: from, lt: to },
        },
      });
      if (count >= 50) {
        res.status(403).json({
          error: "Monthly message limit reached",
          upgradeRequired: true,
        });
        return;
      }
    }

    next();
  };
}
