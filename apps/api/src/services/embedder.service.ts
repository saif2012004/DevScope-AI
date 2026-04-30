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

// Free-tier Voyage AI limits: 3 RPM · 10K TPM.
// Each chunk header + 100 lines ≈ 1 000-1 500 tokens, so 4 chunks ≈ 5-6K tokens
// per call stays safely under 10K TPM. A 22-second gap between calls keeps us
// at ≤ 2.7 RPM, comfortably under the 3 RPM cap.
const EMBED_BATCH = 4;
const EMBED_DELAY_MS = 22_000;

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  const totalBatches = Math.ceil(texts.length / EMBED_BATCH);

  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    const batchNum = Math.floor(i / EMBED_BATCH) + 1;
    const batch = texts.slice(i, i + EMBED_BATCH);

    console.log(
      `[embedder] Batch ${batchNum}/${totalBatches} (${batch.length} chunks)`,
    );

    const res = await voyageClient.embed({
      input: batch,
      model: VOYAGE_MODEL,
      inputType: "document",
    });
    for (const item of res.data ?? []) {
      results.push(item.embedding ?? []);
    }

    // Rate-limit gap — skip after the final batch
    if (i + EMBED_BATCH < texts.length) {
      console.log(`[embedder] Waiting ${EMBED_DELAY_MS / 1000}s (Voyage AI rate limit)…`);
      await new Promise((resolve) => setTimeout(resolve, EMBED_DELAY_MS));
    }
  }
  return results;
}

export async function embedQuery(text: string): Promise<number[]> {
  const res = await voyageClient.embed({
    input: [text],
    model: VOYAGE_MODEL,
    inputType: "query",
  });
  return res.data?.[0]?.embedding ?? [];
}
