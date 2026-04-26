import "dotenv/config";
import { chunkFiles } from "../services/chunker.service";
import type { FileRecord } from "../lib/fetchRepoFiles";

// Build a mock 200-line TypeScript file
function makeMockFile(): FileRecord {
  const lines: string[] = [
    'import { Something } from "./somewhere";',
    "",
    "export interface User {",
    "  id: string;",
    "  name: string;",
    "  email: string;",
    "}",
    "",
    "export class UserService {",
    "  private users: User[] = [];",
    "",
    "  constructor() {}",
    "",
    "  function add(user: User): void {",
    "    this.users.push(user);",
    "  }",
    "",
    "  function find(id: string): User | undefined {",
    "    return this.users.find((u) => u.id === id);",
    "  }",
  ];

  // Pad to 200 lines with realistic-looking code
  for (let i = lines.length; i < 200; i++) {
    const n = i - lines.length;
    if (n % 10 === 0) {
      lines.push(`\n  function helper${n}(x: number): number {`);
    } else if (n % 10 === 1) {
      lines.push(`    // line ${i + 1}: does computation`);
    } else if (n % 10 === 2) {
      lines.push(`    return x * ${n};`);
    } else if (n % 10 === 3) {
      lines.push("  }");
    } else {
      lines.push(`  // filler line ${i + 1}`);
    }
  }

  const content = lines.slice(0, 200).join("\n");

  return {
    path: "src/services/user.service.ts",
    content,
    language: "TypeScript",
    size: content.length,
  };
}

function main() {
  const mockFile = makeMockFile();
  const lineCount = mockFile.content.split("\n").length;
  console.log(`Mock file: ${lineCount} lines, ${mockFile.size} bytes\n`);

  const chunks = chunkFiles([mockFile], "repo123", "acme", "my-repo");

  console.log(`\n=== Chunk Summary ===`);
  console.log(`Total chunks: ${chunks.length}`);

  for (const chunk of chunks) {
    const chunkLines = chunk.content.split("\n").length;
    console.log(
      `\nChunk ${chunk.chunkIndex + 1}/${chunk.totalChunks}  id=${chunk.id}`,
    );
    console.log(
      `  lines ${chunk.startLine}–${chunk.endLine}  (${chunkLines} lines in content incl. header)`,
    );
    console.log(
      `  hasExports=${chunk.hasExports}  hasFunctions=${chunk.hasFunctions}  hasClasses=${chunk.hasClasses}`,
    );
    console.log(`  --- first 3 content lines ---`);
    chunk.content
      .split("\n")
      .slice(0, 3)
      .forEach((l) => console.log(`  ${l}`));
  }

  // Verify overlap: last N lines of chunk[i] should appear as first N lines of chunk[i+1] body
  if (chunks.length >= 2) {
    console.log("\n=== Overlap Verification (chunk 0 → chunk 1) ===");
    const HEADER_LINES = 3; // "// File:", "// Language:", blank
    const CHUNK_OVERLAP = 20;

    const c0body = chunks[0]!.content.split("\n").slice(HEADER_LINES);
    const c1body = chunks[1]!.content.split("\n").slice(HEADER_LINES);

    const c0tail = c0body.slice(-CHUNK_OVERLAP).join("\n");
    const c1head = c1body.slice(0, CHUNK_OVERLAP).join("\n");

    console.log(`Tail of chunk 0 matches head of chunk 1: ${c0tail === c1head}`);
  }
}

main();
