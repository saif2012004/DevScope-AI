import { detectLanguage } from "../lib/fetchRepoFiles";
import {
  embedQuery,
  geminiClient,
  GEMINI_MODEL,
  withGeminiRetry,
} from "./embedder.service";
import { VectorStore } from "./vectorStore.service";

export interface PRFile {
  filename: string;
  status: "added" | "modified" | "deleted" | "renamed";
  additions: number;
  deletions: number;
  patch?: string;
  language: string;
}

export interface PRReviewResult {
  summary: string;
  overallVerdict: "approve" | "request_changes" | "comment";
  issues: Array<{
    severity: "critical" | "warning" | "suggestion";
    filename: string;
    line?: number;
    title: string;
    description: string;
    suggestedFix?: string;
  }>;
  positives: string[];
  fullReviewMarkdown: string;
  tokensUsed: number;
}

export interface ReviewPROptions {
  repoId: string;
  repoOwner: string;
  repoName: string;
  prNumber: number;
  prTitle: string;
  prDescription: string;
  prAuthor: string;
  baseBranch: string;
  files: PRFile[];
}

// Re-export for convenience
export { detectLanguage };

const SKIP_PATTERNS = [
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  ".min.js",
  ".min.css",
];

const SKIP_PATH_SEGMENTS = ["/dist/", "/build/", "/.next/"];

function shouldSkipFile(file: PRFile): boolean {
  if (!file.patch || file.patch.trim() === "") return true;
  if (file.status === "deleted") return true;
  for (const pattern of SKIP_PATTERNS) {
    if (file.filename.endsWith(pattern) || file.filename === pattern)
      return true;
  }
  for (const segment of SKIP_PATH_SEGMENTS) {
    if (file.filename.includes(segment)) return true;
  }
  return false;
}

const FALLBACK_RESULT: PRReviewResult = {
  summary: "Review generation failed. Raw response available.",
  overallVerdict: "comment",
  issues: [],
  positives: [],
  fullReviewMarkdown:
    "## DevScope AI Review\n\nReview parsing failed. Please try again.",
  tokensUsed: 0,
};

export async function reviewPR(
  options: ReviewPROptions,
): Promise<PRReviewResult> {
  const {
    repoId,
    repoOwner,
    repoName,
    prNumber,
    prTitle,
    prDescription,
    prAuthor,
    baseBranch,
    files,
  } = options;

  // Step 1 — Filter files (cap at 5 to keep Voyage queue time reasonable: 5×22s=110s)
  const filtered = files.filter((f) => !shouldSkipFile(f)).slice(0, 5);
  console.log(
    `[prReviewer] Reviewing ${filtered.length} of ${files.length} files in PR #${prNumber}`,
  );

  // Step 2 — Get codebase context
  let store: VectorStore | null = null;
  try {
    store = await VectorStore.load(repoId);
  } catch {
    console.warn("[prReviewer] VectorStore not found — proceeding without context");
  }

  const seenChunkIds = new Set<string>();
  const contextChunks: Array<{ filePath: string; content: string }> = [];

  if (store) {
    for (const file of filtered) {
      const query = "code review: " + file.filename + " " + (file.patch?.slice(0, 400) ?? "");
      const queryVec = await embedQuery(query);
      const results = store.search(queryVec, 4);
      for (const chunk of results) {
        if (!seenChunkIds.has(chunk.id) && contextChunks.length < 12) {
          seenChunkIds.add(chunk.id);
          contextChunks.push({ filePath: chunk.filePath, content: chunk.content });
        }
      }
    }
  }

  // Step 3 — Build review prompt
  const changedFilesSection = filtered
    .map(
      (f) =>
        `### ${f.filename} (${f.status}, +${f.additions}/-${f.deletions})\n${
          f.patch?.slice(0, 800) ?? ""
        }`,
    )
    .join("\n\n");

  const contextSection = contextChunks
    .map((c) => `// File: ${c.filePath}\n${c.content}`)
    .join("\n\n---\n\n");

  const reviewPrompt = `You are an expert code reviewer for the repository ${repoOwner}/${repoName}.

Pull Request #${prNumber}: ${prTitle}
Author: ${prAuthor} | Base branch: ${baseBranch}
Description: ${prDescription || "No description provided"}

CHANGED FILES:
${changedFilesSection}

EXISTING CODEBASE CONTEXT (for comparing patterns and style):
${contextSection || "No codebase context available."}

Review this pull request thoroughly. Analyze for:
1. BUGS — logic errors, null pointer risks, unhandled edge cases
2. SECURITY — injection, exposed secrets, unsafe operations, missing validation
3. PERFORMANCE — N+1 queries, unnecessary loops, memory leaks, blocking operations
4. CODE QUALITY — naming clarity, function complexity, code duplication, readability
5. CONSISTENCY — does this match the patterns and conventions of the existing codebase?
6. TESTS — are tests included? Should they be?

Respond with ONLY a valid JSON object. No markdown wrapper. No text before or after the JSON.
The JSON must match this exact structure:
{
  "summary": "2-3 sentence overall assessment",
  "overallVerdict": "approve" or "request_changes" or "comment",
  "issues": [
    {
      "severity": "critical" or "warning" or "suggestion",
      "filename": "path/to/file.ts",
      "line": 42,
      "title": "Short issue title",
      "description": "Detailed explanation",
      "suggestedFix": "Suggested code or fix"
    }
  ],
  "positives": ["list of things done well"],
  "reviewBody": "Complete Markdown review comment for GitHub. Use ## DevScope AI Review heading. Include verdict, summary, issues grouped by severity with emoji (🔴 Critical, 🟡 Warning, 🔵 Suggestion), positives section, and end with ---\\n*Review by [DevScope AI](https://devscope.ai)*"
}`;

  // Step 4 — Call Gemini with json_object format
  let response: Awaited<ReturnType<typeof geminiClient.chat.completions.create>>;
  try {
    response = await withGeminiRetry(
      () =>
        geminiClient.chat.completions.create({
          model: GEMINI_MODEL,
          messages: [{ role: "user", content: reviewPrompt }],
          temperature: 0.1,
          max_tokens: 3000,
          response_format: { type: "json_object" },
        }),
      "PR review",
    );
  } catch (err) {
    console.error("[prReviewer] Gemini call failed:", err);
    return FALLBACK_RESULT;
  }

  // Step 5 — Parse response
  try {
    const raw = response.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw) as {
      summary?: string;
      overallVerdict?: string;
      issues?: PRReviewResult["issues"];
      positives?: string[];
      reviewBody?: string;
    };

    const verdict = (
      ["approve", "request_changes", "comment"].includes(
        parsed.overallVerdict ?? "",
      )
        ? parsed.overallVerdict
        : "comment"
    ) as PRReviewResult["overallVerdict"];

    return {
      summary: parsed.summary ?? "",
      overallVerdict: verdict,
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      positives: Array.isArray(parsed.positives) ? parsed.positives : [],
      fullReviewMarkdown: parsed.reviewBody ?? "",
      tokensUsed: response.usage?.total_tokens ?? 0,
    };
  } catch (err) {
    console.error("[prReviewer] JSON parse failed:", err);
    return FALLBACK_RESULT;
  }
}
