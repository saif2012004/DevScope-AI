import type { Request, Response } from "express";
import { PlanType } from "@devscope/db";
import { prisma } from "../lib/prisma";

type SyncBody = {
  clerkId?: string;
  email?: string;
  name?: string | null;
  avatarUrl?: string | null;
};

function stripStripeIds<T extends { stripeCustomerId: string | null; stripeSubscriptionId: string | null }>(
  user: T,
): Omit<T, "stripeCustomerId" | "stripeSubscriptionId"> {
  const { stripeCustomerId: _sc, stripeSubscriptionId: _ss, ...rest } = user;
  return rest;
}

export async function sync(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as SyncBody;
    const clerkId = body.clerkId;
    const email = body.email;

    if (!clerkId || typeof clerkId !== "string" || !email || typeof email !== "string") {
      res.status(400).json({ error: "clerkId and email are required" });
      return;
    }

    if (!req.auth?.userId || req.auth.userId !== clerkId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await prisma.user.upsert({
      where: { clerkId },
      update: {
        email,
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.avatarUrl !== undefined ? { avatarUrl: body.avatarUrl } : {}),
      },
      create: {
        clerkId,
        email,
        name: body.name ?? null,
        avatarUrl: body.avatarUrl ?? null,
        plan: PlanType.FREE,
      },
    });

    res.json(stripStripeIds(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

function startOfCurrentUtcMonth(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

export async function usage(req: Request, res: Response): Promise<void> {
  try {
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

    const monthStart = startOfCurrentUtcMonth();
    const messagesThisMonth = await prisma.usageLog.count({
      where: {
        userId: user.id,
        action: "chat_message",
        createdAt: { gte: monthStart },
      },
    });

    const isPro = user.plan === PlanType.PRO;

    res.json({
      plan: user.plan,
      messagesThisMonth,
      messagesLimit: isPro ? null : 50,
      repoCount: user._count.repos,
      repoLimit: isPro ? null : 1,
      memberSince: user.createdAt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function me(req: Request, res: Response): Promise<void> {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        _count: {
          select: { repos: true },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const { _count, ...rest } = user;
    res.json({
      ...rest,
      repoCount: _count.repos,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}
