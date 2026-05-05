import {
  embedQuery,
  geminiClient,
  GEMINI_MODEL,
  withGeminiRetry,
} from "./embedder.service";
import { VectorStore } from "./vectorStore.service";

interface DocSection {
  title: string;
  content: string;
  order: number;
}

export interface GeneratedDoc {
  repoOwner: string;
  repoName: string;
  generatedAt: Date;
  sections: DocSection[];
  fullMarkdown: string;
  tokensUsed: number;
}

export interface DocGenerationOptions {
  repoId: string;
  repoOwner: string;
  repoName: string;
  defaultBranch: string;
  streamCallback?: (
    event: "section_start" | "token" | "section_end" | "done",
    data: unknown,
  ) => void;
}

const SECTIONS = [
  {
    title: "Project Overview",
    order: 1,
    searchQuery: "project overview purpose main functionality what does this do",
    topK: 10,
    buildPrompt: (owner: string, name: string, context: string) =>
      `You are writing technical documentation for the GitHub repository ${owner}/${name}.
Based ONLY on the code context below, write a comprehensive Project Overview section in Markdown.
Include: what the project does, its main purpose, key features, and who it is for.
Be specific — reference actual files and functionality you can see in the code.
Write in present tense. Start with ## Project Overview as the heading.
Do not make up features not visible in the code.
Code context:
${context}`,
  },
  {
    title: "Architecture and Structure",
    order: 2,
    searchQuery:
      "folder structure architecture modules components organization entry point",
    topK: 12,
    buildPrompt: (owner: string, name: string, context: string) =>
      `Based on the code below from ${owner}/${name}, write an Architecture and Structure section in Markdown.
Include: high-level architecture, main folders and their purpose, key modules, how the codebase is organized, entry points, and how data flows between components.
Start with ## Architecture and Structure as the heading.
Only describe what you can actually see in the code.
Code context:
${context}`,
  },
  {
    title: "Installation and Setup",
    order: 3,
    searchQuery:
      "installation setup dependencies package.json requirements environment variables configuration",
    topK: 8,
    buildPrompt: (owner: string, name: string, context: string) =>
      `Based on the code below from ${owner}/${name}, write an Installation and Setup section in Markdown.
Include: prerequisites, step-by-step installation commands, environment variables needed, configuration files, and how to run the project locally.
Start with ## Installation and Setup as the heading. Format all commands in bash code blocks.
Only include steps visible in the actual code and config files.
Code context:
${context}`,
  },
  {
    title: "API Reference",
    order: 4,
    searchQuery:
      "API endpoints routes HTTP methods request response handlers controllers REST",
    topK: 15,
    buildPrompt: (owner: string, name: string, context: string) =>
      `Based on the code below from ${owner}/${name}, write an API Reference section in Markdown.
For each endpoint you can see in the code, document: HTTP method, path, description, request parameters, and response format.
Start with ## API Reference as the heading. Use a table for the endpoint listing.
Only document endpoints you can actually see — do not invent any.
Code context:
${context}`,
  },
  {
    title: "Key Functions and Classes",
    order: 5,
    searchQuery:
      "functions classes methods exports main logic business rules algorithms important",
    topK: 12,
    buildPrompt: (owner: string, name: string, context: string) =>
      `Based on the code below from ${owner}/${name}, write a Key Functions and Classes section in Markdown.
Document the most important functions, classes, and modules. For each: name, purpose, parameters, return value, and brief usage example where visible.
Start with ## Key Functions and Classes as the heading. Use ### subheadings for each major item.
Code context:
${context}`,
  },
  {
    title: "Contributing Guide",
    order: 6,
    searchQuery:
      "testing tests contributing pull request code style lint CI configuration",
    topK: 8,
    buildPrompt: (owner: string, name: string, context: string) =>
      `Based on the code below from ${owner}/${name}, write a Contributing Guide section in Markdown.
Include: development setup, coding conventions visible in the code, testing approach, how to run tests, and contribution guidelines.
Start with ## Contributing as the heading.
Code context:
${context}`,
  },
];

export async function generateDocumentation(
  options: DocGenerationOptions,
): Promise<GeneratedDoc> {
  const { repoId, repoOwner, repoName, streamCallback } = options;

  let store: VectorStore;
  try {
    store = await VectorStore.load(repoId);
  } catch {
    throw new Error("Repository not indexed yet");
  }

  const sections: DocSection[] = [];
  let totalTokensUsed = 0;

  for (let i = 0; i < SECTIONS.length; i++) {
    const def = SECTIONS[i]!;

    streamCallback?.("section_start", {
      title: def.title,
      sectionIndex: i,
      totalSections: SECTIONS.length,
    });

    try {
      const queryVec = await embedQuery(def.searchQuery);
      const chunks = store.search(queryVec, def.topK);
      const context = chunks
        .map((c) => `// File: ${c.filePath}\n${c.content}`)
        .join("\n\n---\n\n");

      const prompt = def.buildPrompt(repoOwner, repoName, context);

      const stream = await withGeminiRetry(
        () =>
          geminiClient.chat.completions.create({
            model: GEMINI_MODEL,
            stream: true,
            temperature: 0.3,
            max_tokens: 1500,
            messages: [{ role: "user", content: prompt }],
          }),
        `doc section "${def.title}"`,
      );

      let content = "";

      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content ?? "";
        if (token) {
          content += token;
          streamCallback?.("token", { token });
        }
        if (chunk.usage?.total_tokens) {
          totalTokensUsed += chunk.usage.total_tokens;
        }
      }

      sections.push({ title: def.title, content, order: def.order });
      streamCallback?.("section_end", { title: def.title, content });
    } catch (err) {
      console.error(`[docGenerator] Section "${def.title}" failed:`, err);
      const placeholder = `## ${def.title}\n\n*This section could not be generated.*`;
      sections.push({ title: def.title, content: placeholder, order: def.order });
      streamCallback?.("section_end", { title: def.title, content: placeholder });
    }
  }

  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const header = `# ${repoOwner}/${repoName} Documentation\n\n> Auto-generated by DevScope AI on ${date}\n\n`;
  const body = sections
    .sort((a, b) => a.order - b.order)
    .map((s) => s.content)
    .join("\n\n---\n\n");
  const fullMarkdown = header + body;

  streamCallback?.("done", { fullMarkdown, tokensUsed: totalTokensUsed });

  return {
    repoOwner,
    repoName,
    generatedAt: new Date(),
    sections,
    fullMarkdown,
    tokensUsed: totalTokensUsed,
  };
}
