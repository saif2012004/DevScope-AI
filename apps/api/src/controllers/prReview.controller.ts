import type { Request, Response } from "express";
import { RepoStatus } from "@devscope/db";
import { prisma } from "../lib/prisma";
import { getPRFiles, getPRMetadata } from "../services/githubPR.service";
import { reviewPR } from "../services/prReviewer.service";

const PR_URL_RE =
  /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/;

export async function analyzePR(req: Request, res: Response): Promise<void> {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const body = req.body as { repoId?: unknown; prUrl?: unknown };

    if (typeof body.repoId !== "string" || !body.repoId) {
      res.status(400).json({ error: "repoId is required" });
      return;
    }
    if (typeof body.prUrl !== "string" || !body.prUrl) {
      res.status(400).json({ error: "prUrl is required" });
      return;
    }

    const match = body.prUrl.match(PR_URL_RE);
    if (!match) {
      res.status(400).json({
        error:
          "Invalid GitHub PR URL. Expected format: https://github.com/owner/repo/pull/123",
      });
      return;
    }

    const prOwner = match[1]!;
    const prRepoName = match[2]!;
    const prNumber = parseInt(match[3]!, 10);

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

    // Fetch PR data from GitHub
    const [prMeta, prFiles] = await Promise.all([
      getPRMetadata(prOwner, prRepoName, prNumber),
      getPRFiles(prOwner, prRepoName, prNumber),
    ]);

    // Run AI review
    const result = await reviewPR({
      repoId: repo.id,
      repoOwner: repo.githubOwner,
      repoName: repo.githubName,
      prNumber,
      prTitle: prMeta.title,
      prDescription: prMeta.body ?? "",
      prAuthor: prMeta.user.login,
      baseBranch: prMeta.base.ref,
      files: prFiles,
    });

    // Save to DB
    await prisma.prReview.create({
      data: {
        repoId: repo.id,
        userId: user.id,
        prNumber,
        prTitle: prMeta.title,
        prUrl: body.prUrl,
        verdict: result.overallVerdict,
        summary: result.summary,
        fullReview: result.fullReviewMarkdown,
        issueCount: result.issues.length,
        tokensUsed: result.tokensUsed,
      },
    });

    // Log usage
    await prisma.usageLog.create({
      data: {
        userId: user.id,
        action: "pr_review",
        repoId: repo.id,
        tokensUsed: result.tokensUsed,
      },
    });

    res.json({ ...result, prTitle: prMeta.title, prNumber });
  } catch (err) {
    console.error("[pr-review/analyze]", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
}

export async function listReviews(req: Request, res: Response): Promise<void> {
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

    const reviews = await prisma.prReview.findMany({
      where: { repoId: repo.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        prNumber: true,
        prTitle: true,
        prUrl: true,
        verdict: true,
        summary: true,
        fullReview: true,
        issueCount: true,
        tokensUsed: true,
        createdAt: true,
      },
    });

    res.json(reviews);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}
