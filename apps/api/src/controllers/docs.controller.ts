import type { Request, Response } from "express";
import { RepoStatus } from "@devscope/db";
import { prisma } from "../lib/prisma";
import { generateDocumentation } from "../services/docGenerator.service";

export async function generateDoc(req: Request, res: Response): Promise<void> {
  const clerkId = req.auth?.userId;
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const body = req.body as { repoId?: unknown };
  if (typeof body.repoId !== "string" || !body.repoId) {
    res.status(400).json({ error: "repoId is required" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { clerkId } }).catch(() => null);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const repo = await prisma.repo
    .findFirst({ where: { id: body.repoId, userId: user.id } })
    .catch(() => null);
  if (!repo) {
    res.status(404).json({ error: "Repository not found" });
    return;
  }

  if (repo.status !== RepoStatus.INDEXED) {
    res.status(400).json({ error: "Repository is not indexed yet" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const result = await generateDocumentation({
      repoId: repo.id,
      repoOwner: repo.githubOwner,
      repoName: repo.githubName,
      defaultBranch: repo.defaultBranch,
      streamCallback: (event, data) => sendEvent(event, data),
    });

    await prisma.generatedDoc.upsert({
      where: { repoId: repo.id },
      create: {
        repoId: repo.id,
        userId: user.id,
        content: result.fullMarkdown,
        tokensUsed: result.tokensUsed,
      },
      update: {
        content: result.fullMarkdown,
        tokensUsed: result.tokensUsed,
        generatedAt: new Date(),
      },
    });

    await prisma.usageLog.create({
      data: {
        userId: user.id,
        action: "doc_generate",
        repoId: repo.id,
        tokensUsed: result.tokensUsed,
      },
    });
  } catch (err) {
    console.error("[docs/generate]", err);
    const message =
      err instanceof Error ? err.message : "Failed to generate documentation";
    sendEvent("error", { message });
  }

  res.end();
}

export async function getDoc(req: Request, res: Response): Promise<void> {
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

    const doc = await prisma.generatedDoc.findUnique({
      where: { repoId: repo.id },
    });
    if (!doc) {
      res.status(404).json({ error: "No documentation generated yet" });
      return;
    }

    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function downloadDoc(req: Request, res: Response): Promise<void> {
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

    const doc = await prisma.generatedDoc.findUnique({
      where: { repoId: repo.id },
    });
    if (!doc) {
      res.status(404).json({ error: "No documentation generated yet" });
      return;
    }

    const filename = `${repo.githubOwner}-${repo.githubName}-docs.md`;
    res.setHeader("Content-Type", "text/markdown");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(doc.content);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}
