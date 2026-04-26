import type { Request, Response } from "express";
import { RepoStatus } from "@devscope/db";
import { fetchGithubRepoMetadata, parseGithubUrl } from "../lib/githubRepo";
import { prisma } from "../lib/prisma";
import { addIngestionJob } from "../services/ingestion.queue";

export async function listRepos(req: Request, res: Response): Promise<void> {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const repos = await prisma.repo.findMany({
      where: { user: { clerkId } },
      orderBy: { createdAt: "desc" },
    });

    res.json(repos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getRepo(req: Request, res: Response): Promise<void> {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { repoId } = req.params;
    const repo = await prisma.repo.findFirst({
      where: { id: repoId, user: { clerkId } },
    });

    if (!repo) {
      res.status(404).json({ error: "Repository not found" });
      return;
    }

    res.json(repo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function createRepo(req: Request, res: Response): Promise<void> {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const githubUrlRaw = (req.body as { githubUrl?: unknown })?.githubUrl;
    if (typeof githubUrlRaw !== "string") {
      res.status(400).json({
        error: "Invalid GitHub URL. Use format: https://github.com/owner/repo",
      });
      return;
    }

    const parsed = parseGithubUrl(githubUrlRaw);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    const { owner, repoName, normalizedUrl } = parsed;

    const user = await prisma.user.findUnique({
      where: { clerkId },
    });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const existing = await prisma.repo.findFirst({
      where: { userId: user.id, githubUrl: normalizedUrl },
    });
    if (existing) {
      res.status(409).json({ error: "You have already added this repository" });
      return;
    }

    const gh = await fetchGithubRepoMetadata(owner, repoName);
    if (!gh.ok) {
      res.status(gh.status).json({ error: gh.message });
      return;
    }

    const repo = await prisma.repo.create({
      data: {
        userId: user.id,
        githubUrl: normalizedUrl,
        githubOwner: owner,
        githubName: repoName,
        defaultBranch: gh.data.defaultBranch,
        isPrivate: gh.data.isPrivate,
        status: RepoStatus.PENDING,
      },
    });

    await prisma.usageLog.create({
      data: {
        userId: user.id,
        action: "repo_added",
        repoId: repo.id,
      },
    });

    await addIngestionJob(repo.id);

    res.status(201).json(repo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteRepo(req: Request, res: Response): Promise<void> {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { repoId } = req.params;
    const repo = await prisma.repo.findFirst({
      where: { id: repoId, user: { clerkId } },
    });

    if (!repo) {
      res.status(404).json({ error: "Repository not found" });
      return;
    }

    await prisma.repo.delete({
      where: { id: repoId },
    });

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}
