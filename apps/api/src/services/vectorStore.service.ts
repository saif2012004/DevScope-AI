import fs from "fs/promises";
import path from "path";
import { IndexFlatL2 } from "faiss-node";
import type { CodeChunk } from "./chunker.service";
import { EMBEDDING_DIM } from "./embedder.service";

export { EMBEDDING_DIM };

const VECTOR_STORES_DIR = path.resolve(__dirname, "../../vector_stores");

export type StoreStats = {
  repoId: string;
  totalChunks: number;
  dimension: number;
  createdAt: string;
  updatedAt: string;
};

export class VectorStore {
  private repoId: string;
  private dim: number;
  private index: IndexFlatL2;
  private chunks: CodeChunk[];

  constructor(repoId: string, dim: number = EMBEDDING_DIM) {
    this.repoId = repoId;
    this.dim = dim;
    this.index = new IndexFlatL2(dim);
    this.chunks = [];
  }

  static getStorePath(repoId: string): string {
    return path.join(VECTOR_STORES_DIR, repoId);
  }

  add(chunks: CodeChunk[], embeddings: number[][]): void {
    if (chunks.length !== embeddings.length) {
      throw new Error(
        `Mismatch: ${chunks.length} chunks vs ${embeddings.length} embeddings`,
      );
    }
    this.index.add(embeddings.flat());
    this.chunks.push(...chunks);
  }

  search(queryEmbedding: number[], k: number): CodeChunk[] {
    const total = this.index.ntotal();
    if (total === 0) return [];
    const { labels } = this.index.search(queryEmbedding, Math.min(k, total));
    return labels
      .filter((l) => l >= 0)
      .map((l) => this.chunks[l])
      .filter((c): c is CodeChunk => c !== undefined);
  }

  async save(): Promise<void> {
    const storePath = VectorStore.getStorePath(this.repoId);
    await fs.mkdir(storePath, { recursive: true });

    this.index.write(path.join(storePath, "index.faiss"));

    await fs.writeFile(
      path.join(storePath, "chunks.json"),
      JSON.stringify(this.chunks),
      "utf-8",
    );

    const statsPath = path.join(storePath, "stats.json");
    const now = new Date().toISOString();
    let createdAt = now;
    try {
      const prev = JSON.parse(
        await fs.readFile(statsPath, "utf-8"),
      ) as StoreStats;
      createdAt = prev.createdAt;
    } catch {
      // first save — createdAt stays as now
    }

    const stats: StoreStats = {
      repoId: this.repoId,
      totalChunks: this.chunks.length,
      dimension: this.dim,
      createdAt,
      updatedAt: now,
    };
    await fs.writeFile(statsPath, JSON.stringify(stats, null, 2), "utf-8");
  }

  static async load(repoId: string): Promise<VectorStore> {
    const storePath = VectorStore.getStorePath(repoId);

    const stats = JSON.parse(
      await fs.readFile(path.join(storePath, "stats.json"), "utf-8"),
    ) as StoreStats;

    const store = new VectorStore(repoId, stats.dimension);
    store.index = IndexFlatL2.read(path.join(storePath, "index.faiss"));
    store.chunks = JSON.parse(
      await fs.readFile(path.join(storePath, "chunks.json"), "utf-8"),
    ) as CodeChunk[];

    return store;
  }

  async getStats(): Promise<StoreStats> {
    const statsPath = path.join(
      VectorStore.getStorePath(this.repoId),
      "stats.json",
    );
    return JSON.parse(await fs.readFile(statsPath, "utf-8")) as StoreStats;
  }
}
