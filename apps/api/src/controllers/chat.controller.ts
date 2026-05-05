import type { Request, Response } from "express";
import { MessageRole, RepoStatus } from "@devscope/db";
import { prisma } from "../lib/prisma";
import {
  embedQuery,
  geminiClient,
  GEMINI_MODEL,
  RateLimitedError,
  withGeminiRetry,
} from "../services/embedder.service";
import { VectorStore } from "../services/vectorStore.service";

const TOP_K = 8;

// ── helpers ────────────────────────────────────────────────────────────────

function sendSse(res: Response, data: object): void {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function buildSystemPrompt(
  owner: string,
  name: string,
  contextBlocks: string[],
): string {
  return [
    `You are an expert code assistant for the repository "${owner}/${name}".`,
    "Answer the user's question using ONLY the code context below.",
    "Be concise. Cite file paths when referencing specific code.",
    "If the context is insufficient, say so honestly.",
    "",
    "=== CODE CONTEXT ===",
    contextBlocks.join("\n\n---\n\n"),
    "=== END CONTEXT ===",
  ].join("\n");
}

// ── POST /api/chat/sessions ─────────────────────────────────────────────────

export async function createSession(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const body = req.body as { repoId?: unknown; title?: unknown };
    if (typeof body.repoId !== "string") {
      res.status(400).json({ error: "repoId is required" });
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

    const session = await prisma.chatSession.create({
      data: {
        userId: user.id,
        repoId: repo.id,
        title:
          typeof body.title === "string" && body.title.trim()
            ? body.title.trim().slice(0, 200)
            : "New Chat",
      },
    });

    res.status(201).json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ── GET /api/chat/sessions?repoId= ─────────────────────────────────────────

export async function listSessions(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const repoId =
      typeof req.query.repoId === "string" ? req.query.repoId : undefined;

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const sessions = await prisma.chatSession.findMany({
      where: { userId: user.id, ...(repoId ? { repoId } : {}) },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { messages: true } } },
    });

    res.json(sessions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ── GET /api/chat/sessions/:sessionId/messages ──────────────────────────────

export async function getMessages(
  req: Request,
  res: Response,
): Promise<void> {
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

    const session = await prisma.chatSession.findFirst({
      where: { id: req.params.sessionId, userId: user.id },
    });
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const messages = await prisma.message.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: "asc" },
    });

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ── DELETE /api/chat/sessions/:sessionId ────────────────────────────────────

export async function deleteSession(
  req: Request,
  res: Response,
): Promise<void> {
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

    const session = await prisma.chatSession.findFirst({
      where: { id: req.params.sessionId, userId: user.id },
    });
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    await prisma.chatSession.delete({ where: { id: session.id } });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ── POST /api/chat/query (SSE) ──────────────────────────────────────────────

export async function streamQuery(
  req: Request,
  res: Response,
): Promise<void> {
  const clerkId = req.auth?.userId;
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const body = req.body as {
    repoId?: unknown;
    question?: unknown;
    sessionId?: unknown;
  };

  if (typeof body.repoId !== "string" || !body.repoId) {
    res.status(400).json({ error: "repoId is required" });
    return;
  }
  if (typeof body.question !== "string" || !body.question.trim()) {
    res.status(400).json({ error: "question is required" });
    return;
  }

  const question = body.question.trim();

  // Verify ownership and INDEXED status before opening the SSE stream
  const user = await prisma.user.findUnique({ where: { clerkId } }).catch(
    () => null,
  );
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

  // Find or create session
  let session = await (async () => {
    if (typeof body.sessionId === "string") {
      return prisma.chatSession.findFirst({
        where: { id: body.sessionId, userId: user.id, repoId: repo.id },
      });
    }
    return null;
  })();

  if (!session) {
    session = await prisma.chatSession.create({
      data: {
        userId: user.id,
        repoId: repo.id,
        title: question.slice(0, 100),
      },
    });
  }

  // All validation passed — open the SSE stream
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    // 1. Embed question
    const queryVec = await embedQuery(question);

    // 2. Search vector store
    const store = await VectorStore.load(repo.id);
    const chunks = store.search(queryVec, TOP_K);

    // 3. Build context
    const contextBlocks = chunks.map(
      (c) => `// File: ${c.filePath}\n${c.content}`,
    );
    const systemPrompt = buildSystemPrompt(
      repo.githubOwner,
      repo.githubName,
      contextBlocks,
    );

    // 4. Stream from Gemini (with one retry on 429)
    const stream = await withGeminiRetry(
      () =>
        geminiClient.chat.completions.create({
          model: GEMINI_MODEL,
          stream: true,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: question },
          ],
        }),
      "chat query",
    );

    let fullResponse = "";
    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content ?? "";
      if (token) {
        fullResponse += token;
        sendSse(res, { type: "token", content: token });
      }
    }

    // 5. Persist messages
    await prisma.message.create({
      data: {
        sessionId: session.id,
        role: MessageRole.USER,
        content: question,
      },
    });

    const citations = chunks.map((c) => ({
      path: c.filePath,
      language: c.language,
      startLine: c.startLine,
      endLine: c.endLine,
    }));

    const assistantMsg = await prisma.message.create({
      data: {
        sessionId: session.id,
        role: MessageRole.ASSISTANT,
        content: fullResponse,
        sourceCitations: citations,
      },
    });

    // 6. Log usage
    await prisma.usageLog.create({
      data: { userId: user.id, action: "chat_message", repoId: repo.id },
    });

    // 7. Done
    sendSse(res, {
      type: "done",
      sessionId: session.id,
      messageId: assistantMsg.id,
    });
  } catch (err) {
    console.error("[chat/query]", err);
    if (err instanceof RateLimitedError) {
      sendSse(res, { type: "error", message: err.message });
    } else {
      sendSse(res, { type: "error", message: "Failed to generate response" });
    }
  }

  res.end();
}
