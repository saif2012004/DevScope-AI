/**
 * Eval harness for the chat pipeline.
 *
 * Reads test cases from eval-cases.json, runs each through the embed →
 * retrieve → Groq pipeline (bypassing HTTP/auth so it doesn't need a JWT),
 * and grades the answer + retrieved citations against expected criteria.
 *
 * Usage:
 *   npx ts-node src/scripts/eval-chat.ts
 *   npx ts-node src/scripts/eval-chat.ts --case nlp-02-sentiment-lib  (run one)
 *
 * Each test case in eval-cases.json must specify:
 *   repo:           "owner/name" — must be INDEXED in the local DB
 *   question:       string sent to the LLM
 *   mustContain:    substrings that MUST appear in the answer (case-insensitive)
 *   mustNotContain: substrings that must NOT appear (case-insensitive)
 *   mustCite:       file paths that must appear among the retrieved chunks
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../lib/prisma";
import {
  embedQuery,
  groqClient,
  GROQ_MODEL,
  withGroqRetry,
} from "../services/embedder.service";
import { VectorStore } from "../services/vectorStore.service";

const TOP_K = 8;

interface EvalCase {
  id: string;
  repo: string;
  question: string;
  mustContain?: string[];      // ALL of these must appear
  mustContainAny?: string[];   // AT LEAST ONE of these must appear
  mustNotContain?: string[];   // NONE of these may appear
  mustCite?: string[];         // ALL must appear among retrieved file paths
  notes?: string;
}

interface CaseResult {
  id: string;
  passed: boolean;
  reasons: string[];
  latencyMs: number;
  answer: string;
  citations: string[];
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

async function runOne(c: EvalCase): Promise<CaseResult> {
  const reasons: string[] = [];
  const [owner, name] = c.repo.split("/");
  if (!owner || !name) {
    return {
      id: c.id,
      passed: false,
      reasons: [`Bad repo identifier "${c.repo}" — expected "owner/name"`],
      latencyMs: 0,
      answer: "",
      citations: [],
    };
  }

  const repo = await prisma.repo.findFirst({
    where: { githubOwner: owner, githubName: name, status: "INDEXED" },
  });
  if (!repo) {
    return {
      id: c.id,
      passed: false,
      reasons: [
        `Repo "${c.repo}" not found in DB with status=INDEXED — index it via the UI first`,
      ],
      latencyMs: 0,
      answer: "",
      citations: [],
    };
  }

  const start = Date.now();

  const queryVec = await embedQuery(c.question);
  const store = await VectorStore.load(repo.id);
  const chunks = store.search(queryVec, TOP_K);
  const citations = chunks.map((ch) => ch.filePath);

  const contextBlocks = chunks.map(
    (ch) => `// File: ${ch.filePath}\n${ch.content}`,
  );
  const systemPrompt = buildSystemPrompt(
    repo.githubOwner,
    repo.githubName,
    contextBlocks,
  );

  const res = await withGroqRetry(
    () =>
      groqClient.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: c.question },
        ],
        max_tokens: 800,
      }),
    `eval:${c.id}`,
  );

  const answer = res.choices[0]?.message?.content ?? "";
  const latencyMs = Date.now() - start;
  const answerLower = answer.toLowerCase();

  for (const needle of c.mustContain ?? []) {
    if (!answerLower.includes(needle.toLowerCase())) {
      reasons.push(`answer missing required substring: "${needle}"`);
    }
  }
  if (c.mustContainAny && c.mustContainAny.length > 0) {
    const matched = c.mustContainAny.some((n) =>
      answerLower.includes(n.toLowerCase()),
    );
    if (!matched) {
      reasons.push(
        `answer missing ALL of "any" substrings: ${JSON.stringify(c.mustContainAny)}`,
      );
    }
  }
  for (const needle of c.mustNotContain ?? []) {
    if (answerLower.includes(needle.toLowerCase())) {
      reasons.push(`answer contains forbidden substring: "${needle}"`);
    }
  }
  for (const file of c.mustCite ?? []) {
    if (!citations.some((cp) => cp.includes(file))) {
      reasons.push(`retrieval did not include expected file: "${file}"`);
    }
  }

  return {
    id: c.id,
    passed: reasons.length === 0,
    reasons,
    latencyMs,
    answer,
    citations,
  };
}

async function main() {
  const onlyId = process.argv.includes("--case")
    ? process.argv[process.argv.indexOf("--case") + 1]
    : undefined;

  const casesPath = path.join(__dirname, "eval-cases.json");
  const allCases = JSON.parse(fs.readFileSync(casesPath, "utf-8")) as EvalCase[];
  const cases = onlyId ? allCases.filter((c) => c.id === onlyId) : allCases;

  if (cases.length === 0) {
    console.error(`No cases matched filter "${onlyId}"`);
    process.exit(2);
  }

  console.log(`\nRunning ${cases.length} case(s) against model ${GROQ_MODEL}\n`);

  const results: CaseResult[] = [];
  for (const c of cases) {
    process.stdout.write(`  ${c.id} ... `);
    try {
      const r = await runOne(c);
      results.push(r);
      console.log(
        r.passed ? `PASS  (${r.latencyMs}ms)` : `FAIL  (${r.latencyMs}ms)`,
      );
      if (!r.passed) {
        for (const reason of r.reasons) console.log(`        - ${reason}`);
      }
    } catch (err) {
      console.log("ERROR");
      console.log(`        ${err instanceof Error ? err.message : err}`);
      results.push({
        id: c.id,
        passed: false,
        reasons: [`exception: ${err instanceof Error ? err.message : err}`],
        latencyMs: 0,
        answer: "",
        citations: [],
      });
    }
  }

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  const avgLatency = Math.round(
    results.reduce((a, r) => a + r.latencyMs, 0) / Math.max(total, 1),
  );

  console.log(`\n${passed}/${total} passed   avg latency ${avgLatency}ms\n`);

  if (process.argv.includes("--verbose")) {
    for (const r of results) {
      console.log(`\n--- ${r.id} ---`);
      console.log(`citations: ${r.citations.slice(0, 5).join(", ")}`);
      console.log(`answer:\n${r.answer}\n`);
    }
  }

  await prisma.$disconnect();
  process.exit(passed === total ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
