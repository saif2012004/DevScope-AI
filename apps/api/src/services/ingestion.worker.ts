import { Worker } from "bullmq";
import { RepoStatus } from "@devscope/db";
import { chunkFiles } from "./chunker.service";
import { embedTexts, EMBEDDING_DIM } from "./embedder.service";
import { VectorStore } from "./vectorStore.service";
import { fetchRepoFiles } from "../lib/fetchRepoFiles";
import { prisma } from "../lib/prisma";
import type { IngestionJobData } from "./ingestion.queue";

function redisConnection() {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname || "localhost",
      port: Number(parsed.port) || 6379,
      password: parsed.password || undefined,
    };
  } catch {
    return { host: "localhost", port: 6379 };
  }
}

async function processIngestion(repoId: string): Promise<void> {
  console.log(`[ingestion] Starting ingestion for repoId=${repoId}`);

  const repo = await prisma.repo.findUnique({ where: { id: repoId } });
  if (!repo) throw new Error(`Repo ${repoId} not found`);

  await prisma.repo.update({
    where: { id: repoId },
    data: { status: RepoStatus.INDEXING },
  });

  // Step 1: fetch files from GitHub
  const fetchResult = await fetchRepoFiles(
    repo.githubOwner,
    repo.githubName,
    repo.defaultBranch,
  );
  console.log(
    `[ingestion] Fetched ${fetchResult.totalFilesFetched} files for ${repo.githubOwner}/${repo.githubName}`,
  );

  // Step 2: chunk
  const chunks = chunkFiles(
    fetchResult.files,
    repoId,
    repo.githubOwner,
    repo.githubName,
  );
  console.log(`[ingestion] Created ${chunks.length} chunks`);

  // Step 3: embed
  const texts = chunks.map((c) => c.content);
  const embeddings = await embedTexts(texts);
  console.log(`[ingestion] Embedded ${chunks.length} chunks (${EMBEDDING_DIM} dims)`);

  // Step 4: build and save vector store
  const store = new VectorStore(repoId, EMBEDDING_DIM);
  store.add(chunks, embeddings);
  await store.save();

  // Step 5: mark repo as indexed (clear any stale errorMessage from prior retries)
  await prisma.repo.update({
    where: { id: repoId },
    data: {
      status: RepoStatus.INDEXED,
      indexedAt: new Date(),
      totalFiles: fetchResult.totalFilesFetched,
      totalChunks: chunks.length,
      errorMessage: null,
    },
  });

  console.log(
    `[ingestion] Completed: repoId=${repoId}, totalFiles=${fetchResult.totalFilesFetched}, totalChunks=${chunks.length}`,
  );
}

export function startIngestionWorker(): Worker<IngestionJobData> {
  const worker = new Worker<IngestionJobData>(
    "ingestion",
    async (job) => {
      await processIngestion(job.data.repoId);
    },
    { connection: redisConnection() },
  );

  worker.on("failed", async (job, err) => {
    console.error(`[ingestion] Job failed (repoId=${job?.data.repoId}):`, err.message);
    if (job?.data.repoId) {
      await prisma.repo.update({
        where: { id: job.data.repoId },
        data: {
          status: RepoStatus.FAILED,
          errorMessage: err.message.slice(0, 500),
        },
      });
    }
  });

  console.log("[ingestion] Worker started, waiting for jobs...");
  return worker;
}
