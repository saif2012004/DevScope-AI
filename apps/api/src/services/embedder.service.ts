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

const EMBED_BATCH = 32;

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    const batch = texts.slice(i, i + EMBED_BATCH);
    const res = await voyageClient.embed({
      input: batch,
      model: VOYAGE_MODEL,
      inputType: "document",
    });
    for (const item of res.data ?? []) {
      results.push(item.embedding ?? []);
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
