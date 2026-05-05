import type { Request, Response } from "express";
import { RepoStatus } from "@devscope/db";
import { prisma } from "../lib/prisma";
import { scoreComplexity } from "../services/complexityScorer.service";
import { RateLimitedError } from "../services/embedder.service";

export async function scoreTask(req: Request, res: Response): Promise<void> {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const body = req.body as { repoId?: unknown; taskDescription?: unknown };

    if (typeof body.repoId !== "string" || !body.repoId) {
      res.status(400).json({ error: "repoId is required" });
      return;
    }
    if (typeof body.taskDescription !== "string" || !body.taskDescription) {
      res.status(400).json({ error: "taskDescription is required" });
      return;
    }

    const desc = body.taskDescription.trim();
    if (desc.length < 10) {
      res.status(400).json({
        error:
          "Please describe the task in more detail (minimum 10 characters)",
      });
      return;
    }
    if (desc.length > 1000) {
      res.status(400).json({
        error: "Task description too long (maximum 1000 characters)",
      });
      return;
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const repo = await prisma.repo.findFirst({
      where: { id: body.repoId, userId: user.id },
    });
    if (!repo) {
      res.status(404).json({ error: "Repository not found" });
      return;
    }

    if (repo.status !== RepoStatus.INDEXED) {
      res.status(400).json({ error: "Repository is not indexed yet" });
      return;
    }

    const result = await scoreComplexity({
      repoId: repo.id,
      repoOwner: repo.githubOwner,
      repoName: repo.githubName,
      taskDescription: desc,
    });

    await prisma.complexityScore.create({
      data: {
        repoId: repo.id,
        userId: user.id,
        taskDescription: desc,
        effortScore: result.effortScore,
        effortLabel: result.effortLabel,
        estimatedHoursMin: result.estimatedHours.min,
        estimatedHoursMax: result.estimatedHours.max,
        affectedFilesCount: result.affectedFiles.length,
        risksCount: result.risks.length,
        fullResult: result as unknown as Parameters<typeof prisma.complexityScore.create>[0]["data"]["fullResult"],
        tokensUsed: result.tokensUsed,
      },
    });

    await prisma.usageLog.create({
      data: {
        userId: user.id,
        action: "complexity_score",
        repoId: repo.id,
        tokensUsed: result.tokensUsed,
      },
    });

    res.json(result);
  } catch (err) {
    console.error("[complexity/score]", err);
    if (err instanceof RateLimitedError) {
      res.status(429).json({ error: err.message });
      return;
    }
    const message =
      err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
}

export async function listScores(req: Request, res: Response): Promise<void> {
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

    const repo = await prisma.repo.findFirst({
      where: { id: req.params.repoId, userId: user.id },
    });
    if (!repo) {
      res.status(404).json({ error: "Repository not found" });
      return;
    }

    const scores = await prisma.complexityScore.findMany({
      where: { repoId: repo.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        taskDescription: true,
        effortScore: true,
        effortLabel: true,
        estimatedHoursMin: true,
        estimatedHoursMax: true,
        affectedFilesCount: true,
        risksCount: true,
        fullResult: true,
        createdAt: true,
      },
    });

    res.json(scores);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}
