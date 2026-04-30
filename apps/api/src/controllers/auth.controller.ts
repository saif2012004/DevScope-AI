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

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const monthStart = startOfCurrentUtcMonth();

    const [
      messagesThisMonth,
      repoCount,
      repoAgg,
      docsGenerated,
      prReviewsCount,
      complexityScoresCount,
    ] = await Promise.all([
      prisma.usageLog.count({
        where: { userId: user.id, action: "chat_message", createdAt: { gte: monthStart } },
      }),
      prisma.repo.count({ where: { userId: user.id } }),
      prisma.repo.aggregate({
        where: { userId: user.id, status: "INDEXED" },
        _sum: { totalChunks: true, totalFiles: true },
      }),
      prisma.generatedDoc.count({ where: { userId: user.id } }),
      prisma.prReview.count({ where: { userId: user.id } }),
      prisma.complexityScore.count({ where: { userId: user.id } }),
    ]);

    const isPro = user.plan === PlanType.PRO;

    res.json({
      plan: user.plan,
      messagesThisMonth,
      messagesLimit: isPro ? null : 50,
      repoCount,
      repoLimit: isPro ? null : 1,
      totalChunks: repoAgg._sum.totalChunks ?? 0,
      totalFiles: repoAgg._sum.totalFiles ?? 0,
      docsGenerated,
      prReviewsCount,
      complexityScoresCount,
      memberSince: user.createdAt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function activity(req: Request, res: Response): Promise<void> {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const logs = await prisma.usageLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        user: false,
      },
    });

    const repoIds = [...new Set(logs.map((l) => l.repoId).filter(Boolean) as string[])];
    const repos = await prisma.repo.findMany({
      where: { id: { in: repoIds } },
      select: { id: true, githubOwner: true, githubName: true },
    });
    const repoMap = new Map(repos.map((r) => [r.id, r]));

    const result = logs.map((log) => {
      const repo = log.repoId ? repoMap.get(log.repoId) : undefined;
      return {
        id: log.id,
        action: log.action,
        repoId: log.repoId,
        repoOwner: repo?.githubOwner ?? null,
        repoName: repo?.githubName ?? null,
        tokensUsed: log.tokensUsed,
        createdAt: log.createdAt,
      };
    });

    res.json(result);
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
