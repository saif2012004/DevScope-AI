import { Queue } from "bullmq";

export type IngestionJobData = {
  repoId: string;
};

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

export const ingestionQueue = new Queue<IngestionJobData>("ingestion", {
  connection: redisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5_000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

export async function addIngestionJob(repoId: string): Promise<void> {
  await ingestionQueue.add("ingest-repo", { repoId });
}
