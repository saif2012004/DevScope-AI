import type { FileRecord } from "../lib/fetchRepoFiles";

const CHUNK_SIZE = 100;   // lines per chunk
const CHUNK_OVERLAP = 20; // lines of overlap between consecutive chunks

export type CodeChunk = {
  id: string;
  repoId: string;
  filePath: string;
  language: string;
  content: string;
  startLine: number;
  endLine: number;
  chunkIndex: number;
  totalChunks: number;
  hasExports: boolean;
  hasFunctions: boolean;
  hasClasses: boolean;
};

function sanitizePathForId(filePath: string): string {
  return filePath.replace(/[^a-zA-Z0-9]/g, "_");
}

export function chunkFile(
  file: FileRecord,
  repoId: string,
  repoOwner: string,
  repoName: string,
): CodeChunk[] {
  const lines = file.content.split("\n");
  const header = `// File: ${repoOwner}/${repoName}/${file.path}\n// Language: ${file.language}\n\n`;
  const sanitizedPath = sanitizePathForId(file.path);
  const chunks: CodeChunk[] = [];

  const step = CHUNK_SIZE - CHUNK_OVERLAP;

  for (let start = 0; start < lines.length; start += step) {
    const end = Math.min(start + CHUNK_SIZE, lines.length);
    const chunkLines = lines.slice(start, end);
    const body = chunkLines.join("\n");
    const content = header + body;

    chunks.push({
      id: `${repoId}_${sanitizedPath}_${chunks.length}`,
      repoId,
      filePath: file.path,
      language: file.language,
      content,
      startLine: start + 1,
      endLine: end,
      chunkIndex: chunks.length,
      totalChunks: 0, // filled in below
      hasExports:
        body.includes("export ") || body.includes("module.exports"),
      hasFunctions:
        body.includes("function ") ||
        body.includes("def ") ||
        body.includes("fn ") ||
        body.includes("func "),
      hasClasses:
        body.includes("class ") ||
        body.includes("interface ") ||
        body.includes("struct "),
    });

    if (end === lines.length) break;
  }

  const total = chunks.length;
  for (const chunk of chunks) {
    chunk.totalChunks = total;
  }

  return chunks;
}

export function chunkFiles(
  files: FileRecord[],
  repoId: string,
  repoOwner: string,
  repoName: string,
): CodeChunk[] {
  const all: CodeChunk[] = [];

  for (const file of files) {
    const chunks = chunkFile(file, repoId, repoOwner, repoName);
    all.push(...chunks);
  }

  console.log(
    `[chunker] ${files.length} files → ${all.length} chunks` +
      ` (CHUNK_SIZE=${CHUNK_SIZE}, OVERLAP=${CHUNK_OVERLAP})`,
  );

  return all;
}
