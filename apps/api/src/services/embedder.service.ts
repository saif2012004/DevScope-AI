import OpenAI from "openai";
import { VoyageAIClient } from "voyageai";

export const GEMINI_MODEL = "gemini-2.0-flash";
export const VOYAGE_MODEL = "voyage-code-3";
export const EMBEDDING_DIM = 1024;

export const geminiClient = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
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
// Global rate-limit gate for ALL Gemini calls.
//
// Free-tier limits: 15 RPM · 1M TPM · 1,500 RPD on gemini-2.0-flash.
// A minimum 5s spacing prevents burst 429s when multiple features fire
// Gemini calls back-to-back (e.g. Voyage gate releases → chat + docs both
// call Gemini at once). One retry after 30s for transient RPM 429s; if it
// fails again it is almost certainly daily quota — throwing is the right call.
// ─────────────────────────────────────────────────────────────────────────────

// 8s spacing → max 7.5 RPM per instance, well under the 15 RPM free-tier cap.
// Retries: 20s (handles transient spikes), then 65s (guarantees full RPM window
// reset). If all three attempts fail it is almost certainly daily quota (RPD).
const GEMINI_MIN_INTERVAL_MS = 8_000;
const GEMINI_RETRY_WAITS_MS = [20_000, 65_000];

let lastGeminiCallAt = 0;
let geminiQueue: Promise<unknown> = Promise.resolve();

async function waitForGeminiSlot(label: string): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastGeminiCallAt;
  if (elapsed < GEMINI_MIN_INTERVAL_MS && lastGeminiCallAt > 0) {
    const wait = GEMINI_MIN_INTERVAL_MS - elapsed;
    console.log(`[gemini] Rate-limit gate (${label}): waiting ${Math.ceil(wait / 1000)}s`);
    await new Promise((r) => setTimeout(r, wait));
  }
  lastGeminiCallAt = Date.now();
  console.log(`[gemini] Calling API for: ${label}`);
}

export async function withGeminiRetry<T>(
  fn: () => Promise<T>,
  label = "gemini",
): Promise<T> {
  // Serialize Gemini calls through a queue — prevents concurrent burst 429s
  const prev = geminiQueue;
  let release: () => void;
  const next = new Promise<void>((r) => {
    release = r;
  });
  geminiQueue = prev.then(() => next);

  try {
    await prev;
    await waitForGeminiSlot(label);

    let lastErr: unknown;
    for (let attempt = 0; attempt <= GEMINI_RETRY_WAITS_MS.length; attempt++) {
      try {
        return await fn();
      } catch (err) {
        if (!isRateLimitError(err)) throw err;
        lastErr = err;
        const waitMs = GEMINI_RETRY_WAITS_MS[attempt];
        if (waitMs === undefined) break; // exhausted retries
        console.log(
          `[gemini] 429 on ${label} (attempt ${attempt + 1}) — retrying after ${waitMs / 1000}s`,
        );
        await new Promise((r) => setTimeout(r, waitMs));
        lastGeminiCallAt = Date.now();
      }
    }
    console.error(`[gemini] All attempts exhausted for ${label}`);
    throw lastErr instanceof Error && isRateLimitError(lastErr)
      ? new RateLimitedError("gemini")
      : lastErr;
  } finally {
    release!();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider-aware rate-limit error wrapping.
// ─────────────────────────────────────────────────────────────────────────────

export type RateLimitProvider = "voyage" | "gemini" | "ai";

const PROVIDER_MESSAGES: Record<RateLimitProvider, string> = {
  voyage:
    "Voyage AI free-tier rate limit hit (3 requests/min, 10K tokens/min). " +
    "Wait ~60 seconds and try again. To unlock higher limits, add a payment method at https://dashboard.voyageai.com (the 200M free tokens still apply).",
  gemini:
    "Gemini API quota exhausted. This is most likely the daily 1,500-request free-tier limit. " +
    "Check your quota at https://aistudio.google.com/app/apikey — if it's daily, you must wait until tomorrow or enable billing on Google Cloud.",
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
    return "gemini";
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
