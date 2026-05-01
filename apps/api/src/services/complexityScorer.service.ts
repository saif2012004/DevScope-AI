import { embedQuery, geminiClient, GEMINI_MODEL } from "./embedder.service";
import { VectorStore } from "./vectorStore.service";

export interface ComplexityResult {
  taskDescription: string;
  repoOwner: string;
  repoName: string;
  effortScore: number;
  effortLabel: "Trivial" | "Small" | "Medium" | "Large" | "Extra Large" | "Epic";
  estimatedHours: { min: number; max: number };
  estimatedDays: { min: number; max: number };
  affectedFiles: Array<{
    path: string;
    changeType: "modify" | "create" | "delete" | "uncertain";
    reason: string;
    complexity: "low" | "medium" | "high";
  }>;
  risks: Array<{
    severity: "low" | "medium" | "high";
    title: string;
    description: string;
    mitigation: string;
  }>;
  implementationPlan: Array<{
    step: number;
    title: string;
    description: string;
    estimatedHours: number;
  }>;
  dependencies: string[];
  testingConsiderations: string;
  summary: string;
  tokensUsed: number;
}

export interface ScoreComplexityOptions {
  repoId: string;
  repoOwner: string;
  repoName: string;
  taskDescription: string;
}

export async function scoreComplexity(
  options: ScoreComplexityOptions,
): Promise<ComplexityResult> {
  const { repoId, repoOwner, repoName, taskDescription } = options;

  const store = await VectorStore.load(repoId);

  // Step 1 — Three parallel vector searches
  const [results1, results2, results3] = await Promise.all([
    store.search(await embedQuery(taskDescription), 10),
    store.search(
      await embedQuery(
        taskDescription + " configuration setup initialization dependencies",
      ),
      5,
    ),
    store.search(
      await embedQuery(
        taskDescription +
          " tests testing error handling validation edge cases",
      ),
      5,
    ),
  ]);

  // Deduplicate by chunk id, take top 15
  const seen = new Set<string>();
  const combined = [...results1, ...results2, ...results3];
  const top15 = combined.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  }).slice(0, 15);

  // Step 2 — Build context string
  const context = top15
    .map(
      (c) =>
        `[${c.filePath} Lines ${c.startLine}-${c.endLine}]\n${c.content.slice(0, 300)}`,
    )
    .join("\n\n");

  // Step 3 — Build scoring prompt
  const scoringPrompt = `You are a senior software architect estimating the complexity of a development task for the repository ${repoOwner}/${repoName}.

TASK TO ESTIMATE:
${taskDescription}

RELEVANT CODEBASE CONTEXT:
${context}

Analyze this task carefully. Consider the codebase structure visible in the context.
Respond with ONLY a valid JSON object. No text before or after. No markdown wrapper.

{
  "effortScore": <integer 1-10>,
  "effortLabel": <"Trivial" | "Small" | "Medium" | "Large" | "Extra Large" | "Epic">,
  "estimatedHours": { "min": <integer>, "max": <integer> },
  "estimatedDays": { "min": <number with 1 decimal>, "max": <number with 1 decimal> },
  "affectedFiles": [
    {
      "path": "<file path relative to repo root>",
      "changeType": "modify" | "create" | "delete" | "uncertain",
      "reason": "<why this file needs to change>",
      "complexity": "low" | "medium" | "high"
    }
  ],
  "risks": [
    {
      "severity": "low" | "medium" | "high",
      "title": "<risk title>",
      "description": "<what could go wrong>",
      "mitigation": "<how to reduce the risk>"
    }
  ],
  "implementationPlan": [
    {
      "step": <integer starting at 1>,
      "title": "<step title>",
      "description": "<what to do>",
      "estimatedHours": <integer>
    }
  ],
  "dependencies": ["<package or module names this task depends on>"],
  "testingConsiderations": "<what tests are needed and why>",
  "summary": "<2-3 sentence plain English summary of effort and main challenges>"
}

Effort score guide:
1-2 = Trivial: change config, update text, fix typo (< 2 hours)
3-4 = Small: new field, minor endpoint, simple component (2-8 hours)
5-6 = Medium: new feature with DB changes, moderate integration (1-3 days)
7-8 = Large: significant new system, cross-cutting changes (3-10 days)
9-10 = Epic: architectural change, fundamental refactor (> 2 weeks)

Only reference files you can actually see in the context. Mark files you are less certain about as changeType: uncertain.`;

  // Step 4 — Call Gemini
  const response = await geminiClient.chat.completions.create({
    model: GEMINI_MODEL,
    messages: [{ role: "user", content: scoringPrompt }],
    temperature: 0.1,
    max_tokens: 2500,
    response_format: { type: "json_object" },
  });

  // Step 5 — Parse and return
  const raw = response.choices[0]?.message?.content ?? "";
  let parsed: Omit<ComplexityResult, "taskDescription" | "repoOwner" | "repoName" | "tokensUsed">;
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    throw new Error("Failed to parse complexity analysis. Please try again.");
  }

  return {
    ...parsed,
    taskDescription,
    repoOwner,
    repoName,
    tokensUsed: response.usage?.total_tokens ?? 0,
  };
}
