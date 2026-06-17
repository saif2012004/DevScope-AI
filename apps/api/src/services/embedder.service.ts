import OpenAI from "openai";
import { VoyageAIClient } from "voyageai";

export const GROQ_MODEL = "llama-3.3-70b-versatile";
export const VOYAGE_MODEL = "voyage-code-3";
export const EMBEDDING_DIM = 1024;

export const groqClient = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const voyageClient = new VoyageAIClient({
  apiKey: process.env.VOYAGE_API_KEY,
});

// ─────────────────────────────────────────────────────────────────────────────
// Global rate-limit gate for ALL Voyage AI calls.
//
// Free-tier limits: 3 RPM · 10K TPM.
// Every call (embedTexts batch OR embedQuery from chat/docs/complexity) goes
// through a single mutex with 22s minimum spacing → ≤ 2.7 RPM. A 429 triggers
// one retry after a 65-second wait.
// ─────────────────────────────────────────────────────────────────────────────

const VOYAGE_MIN_INTERVAL_MS = 22_000;
const VOYAGE_RETRY_WAIT_MS = 65_000;
const EMBED_BATCH = 4;

let lastVoyageCallAt = 0;
let voyageQueue: Promise<unknown> = Promise.resolve();

async function waitForVoyageSlot(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastVoyageCallAt;
  if (elapsed < VOYAGE_MIN_INTERVAL_MS && lastVoyageCallAt > 0) {
    const wait = VOYAGE_MIN_INTERVAL_MS - elapsed;
    console.log(`[voyage] Rate-limit gate: waiting ${Math.ceil(wait / 1000)}s`);
    await new Promise((r) => setTimeout(r, wait));
  }
  lastVoyageCallAt = Date.now();
}

function isRateLimitError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { statusCode?: number; status?: number };
  return e.statusCode === 429 || e.status === 429;
}

async function rateLimitedVoyageCall<T>(fn: () => Promise<T>, label: string): Promise<T> {
  // Chain onto the queue so concurrent callers serialize
  const prev = voyageQueue;
  let release: () => void;
  const next = new Promise<void>((r) => {
    release = r;
  });
  voyageQueue = prev.then(() => next);

  try {
    await prev;
    await waitForVoyageSlot();
    try {
      return await fn();
    } catch (err) {
      if (isRateLimitError(err)) {
        console.log(`[voyage] 429 on ${label} — retrying after ${VOYAGE_RETRY_WAIT_MS / 1000}s`);
        await new Promise((r) => setTimeout(r, VOYAGE_RETRY_WAIT_MS));
        lastVoyageCallAt = Date.now();
        try {
          return await fn();
        } catch (retryErr) {
          if (isRateLimitError(retryErr)) {
            throw new RateLimitedError("voyage");
          }
          throw retryErr;
        }
      }
      throw err;
    }
  } finally {
    release!();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Global rate-limit gate for ALL Groq calls.
//
// Free-tier limits for llama-3.3-70b-versatile: 30 RPM · 12K TPM · 1,000 RPD.
// 2.5s spacing → max 24 RPM per instance, leaving ~20% headroom under the cap.
// Retries: 15s (handles transient spikes), then 65s (full RPM window reset).
// ─────────────────────────────────────────────────────────────────────────────

const GROQ_MIN_INTERVAL_MS = 2_500;
const GROQ_RETRY_WAITS_MS = [15_000, 65_000];

let lastGroqCallAt = 0;
let groqQueue: Promise<unknown> = Promise.resolve();

async function waitForGroqSlot(label: string): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastGroqCallAt;
  if (elapsed < GROQ_MIN_INTERVAL_MS && lastGroqCallAt > 0) {
    const wait = GROQ_MIN_INTERVAL_MS - elapsed;
    console.log(`[groq] Rate-limit gate (${label}): waiting ${Math.ceil(wait / 1000)}s`);
    await new Promise((r) => setTimeout(r, wait));
  }
  lastGroqCallAt = Date.now();
  console.log(`[groq] Calling API for: ${label}`);
}

export async function withGroqRetry<T>(
  fn: () => Promise<T>,
  label = "groq",
): Promise<T> {
  // Serialize Groq calls through a queue — prevents concurrent burst 429s
  const prev = groqQueue;
  let release: () => void;
  const next = new Promise<void>((r) => {
    release = r;
  });
  groqQueue = prev.then(() => next);

  try {
    await prev;
    await waitForGroqSlot(label);

    let lastErr: unknown;
    for (let attempt = 0; attempt <= GROQ_RETRY_WAITS_MS.length; attempt++) {
      try {
        return await fn();
      } catch (err) {
        if (!isRateLimitError(err)) throw err;
        lastErr = err;
        const waitMs = GROQ_RETRY_WAITS_MS[attempt];
        if (waitMs === undefined) break; // exhausted retries
        console.log(
          `[groq] 429 on ${label} (attempt ${attempt + 1}) — retrying after ${waitMs / 1000}s`,
        );
        await new Promise((r) => setTimeout(r, waitMs));
        lastGroqCallAt = Date.now();
      }
    }
    console.error(`[groq] All attempts exhausted for ${label}`);
    throw lastErr instanceof Error && isRateLimitError(lastErr)
      ? new RateLimitedError("groq")
      : lastErr;
  } finally {
    release!();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider-aware rate-limit error wrapping.
// ─────────────────────────────────────────────────────────────────────────────

export type RateLimitProvider = "voyage" | "groq" | "ai";

const PROVIDER_MESSAGES: Record<RateLimitProvider, string> = {
  voyage:
    "Voyage AI free-tier rate limit hit (3 requests/min, 10K tokens/min). " +
    "Wait ~60 seconds and try again. To unlock higher limits, add a payment method at https://dashboard.voyageai.com (the 200M free tokens still apply).",
  groq:
    "Groq API quota exhausted. This is most likely the daily request limit (1,000 RPD on free tier). " +
    "Check your usage at https://console.groq.com/settings/limits — if it's daily, wait until reset or upgrade your plan.",
  ai:
    "AI service is rate-limited. Please wait a minute and try again, or check your provider quotas.",
};

export class RateLimitedError extends Error {
  provider: RateLimitProvider;
  constructor(provider: RateLimitProvider = "ai") {
    super(PROVIDER_MESSAGES[provider]);
    this.name = "RateLimitedError";
    this.provider = provider;
  }
}

function detectProvider(err: unknown): RateLimitProvider {
  if (!err || typeof err !== "object") return "ai";
  const e = err as { rawResponse?: { url?: string }; constructor?: { name?: string } };
  const url = e.rawResponse?.url ?? "";
  if (url.includes("voyageai.com") || e.constructor?.name === "VoyageAIError") {
    return "voyage";
  }
  if (e.constructor?.name === "RateLimitError" || e.constructor?.name === "APIError") {
    return "groq";
  }
  return "ai";
}

export function rethrowAsRateLimited(err: unknown): never {
  if (isRateLimitError(err)) {
    throw new RateLimitedError(detectProvider(err));
  }
  throw err;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  const totalBatches = Math.ceil(texts.length / EMBED_BATCH);

  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    const batchNum = Math.floor(i / EMBED_BATCH) + 1;
    const batch = texts.slice(i, i + EMBED_BATCH);

    console.log(`[embedder] Batch ${batchNum}/${totalBatches} (${batch.length} chunks)`);

    const res = await rateLimitedVoyageCall(
      () =>
        voyageClient.embed({
          input: batch,
          model: VOYAGE_MODEL,
          inputType: "document",
        }),
      `embedTexts batch ${batchNum}/${totalBatches}`,
    );
    for (const item of res.data ?? []) {
      results.push(item.embedding ?? []);
    }
  }
  return results;
}

export async function embedQuery(text: string): Promise<number[]> {
  const res = await rateLimitedVoyageCall(
    () =>
      voyageClient.embed({
        input: [text],
        model: VOYAGE_MODEL,
        inputType: "query",
      }),
    "embedQuery",
  );
  return res.data?.[0]?.embedding ?? [];
}
