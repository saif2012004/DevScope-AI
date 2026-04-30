Build the Auto Documentation Generator feature completely. This generates 6-section documentation for any indexed repo using the existing RAG pipeline and Gemini streaming.

=== BACKEND ===

Create /apps/api/src/services/docGenerator.service.ts

Import geminiClient and GEMINI_MODEL from embedder.service.ts
Import VectorStore from vectorStore.service.ts
Import embedQuery from embedder.service.ts

Define these TypeScript types:

interface DocSection {
  title: string
  content: string
  order: number
}

interface GeneratedDoc {
  repoOwner: string
  repoName: string
  generatedAt: Date
  sections: DocSection[]
  fullMarkdown: string
  tokensUsed: number
}

interface DocGenerationOptions {
  repoId: string
  repoOwner: string
  repoName: string
  defaultBranch: string
  streamCallback?: (event: 'section_start' | 'token' | 'section_end' | 'done', data: any) => void
}

Build the main exported function: generateDocumentation(options: DocGenerationOptions): Promise<GeneratedDoc>

This function generates 6 sections in sequence. For each section, follow this pattern:
1. Embed a targeted search query using embedQuery()
2. Search the vector store (topK varies per section)
3. Build a context string from search results
4. Build a Gemini prompt
5. Call geminiClient.chat.completions.create with stream: true, temperature: 0.3, max_tokens: 1500
6. Call streamCallback('section_start', { title, sectionIndex, totalSections: 6 }) before streaming
7. Stream tokens, call streamCallback('token', { token }) for each
8. Call streamCallback('section_end', { title, content }) when done
9. Save the section content

The 6 sections:

SECTION 1 - Project Overview (order 1):
searchQuery: "project overview purpose main functionality what does this do"
topK: 10
geminiPrompt: "You are writing technical documentation for the GitHub repository {owner}/{name}.
Based ONLY on the code context below, write a comprehensive Project Overview section in Markdown.
Include: what the project does, its main purpose, key features, and who it is for.
Be specific — reference actual files and functionality you can see in the code.
Write in present tense. Start with ## Project Overview as the heading.
Do not make up features not visible in the code.
Code context:
{context}"

SECTION 2 - Architecture and Structure (order 2):
searchQuery: "folder structure architecture modules components organization entry point"
topK: 12
geminiPrompt: "Based on the code below from {owner}/{name}, write an Architecture and Structure section in Markdown.
Include: high-level architecture, main folders and their purpose, key modules, how the codebase is organized, entry points, and how data flows between components.
Start with ## Architecture and Structure as the heading.
Only describe what you can actually see in the code.
Code context:
{context}"

SECTION 3 - Installation and Setup (order 3):
searchQuery: "installation setup dependencies package.json requirements environment variables configuration"
topK: 8
geminiPrompt: "Based on the code below from {owner}/{name}, write an Installation and Setup section in Markdown.
Include: prerequisites, step-by-step installation commands, environment variables needed, configuration files, and how to run the project locally.
Start with ## Installation and Setup as the heading. Format all commands in bash code blocks.
Only include steps visible in the actual code and config files.
Code context:
{context}"

SECTION 4 - API Reference (order 4):
searchQuery: "API endpoints routes HTTP methods request response handlers controllers REST"
topK: 15
geminiPrompt: "Based on the code below from {owner}/{name}, write an API Reference section in Markdown.
For each endpoint you can see in the code, document: HTTP method, path, description, request parameters, and response format.
Start with ## API Reference as the heading. Use a table for the endpoint listing.
Only document endpoints you can actually see — do not invent any.
Code context:
{context}"

SECTION 5 - Key Functions and Classes (order 5):
searchQuery: "functions classes methods exports main logic business rules algorithms important"
topK: 12
geminiPrompt: "Based on the code below from {owner}/{name}, write a Key Functions and Classes section in Markdown.
Document the most important functions, classes, and modules. For each: name, purpose, parameters, return value, and brief usage example where visible.
Start with ## Key Functions and Classes as the heading. Use ### subheadings for each major item.
Code context:
{context}"

SECTION 6 - Contributing Guide (order 6):
searchQuery: "testing tests contributing pull request code style lint CI configuration"
topK: 8
geminiPrompt: "Based on the code below from {owner}/{name}, write a Contributing Guide section in Markdown.
Include: development setup, coding conventions visible in the code, testing approach, how to run tests, and contribution guidelines.
Start with ## Contributing as the heading.
Code context:
{context}"

After all 6 sections are generated:
- Build fullMarkdown by joining sections with \n\n---\n\n separator
- Prepend a title: # {repoOwner}/{repoName} Documentation\n\n> Auto-generated by DevScope AI on {date}\n\n
- Sum all tokensUsed across sections
- Call streamCallback('done', { fullMarkdown, tokensUsed })
- Return the GeneratedDoc object

Error handling:
- If VectorStore does not exist for this repoId: throw Error('Repository not indexed yet')
- If any single section fails: log the error, use this placeholder for that section: ## {title}\n\n*This section could not be generated.*
- Never let one section failure crash the entire generation

---

Create /apps/api/src/routes/docs.routes.ts

Register it in /apps/api/src/routes/index.ts as: router.use('/docs', docsRoutes)

Routes to build (all protected by requireAuth):

POST /api/docs/generate — SSE streaming
- Body: { repoId }
- Validate repoId exists
- Get user from clerkId, verify repo ownership
- Check repo.status === 'INDEXED' — if not, return 400
- Set SSE headers BEFORE any async work:
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()
- Helper: const sendEvent = (event: string, data: unknown) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
- Call generateDocumentation with streamCallback that calls sendEvent
- On completion: upsert GeneratedDoc in DB (upsert on repoId)
- Log to UsageLog: action 'doc_generate'
- res.end()
- On error: sendEvent('error', { message }) then res.end()

GET /api/docs/:repoId — get saved doc
- Verify repo ownership
- Return GeneratedDoc from DB or 404

GET /api/docs/:repoId/download — download as file
- Set headers: Content-Type: text/markdown, Content-Disposition: attachment; filename="{owner}-{name}-docs.md"
- Send the content field as the response body

---

CREATE /apps/web/src/hooks/useDocs.ts

export function useDoc(repoId: string | null) — React Query fetching GET /api/docs/{repoId}
Cache key: ['doc', repoId]. Enabled only when repoId is set.

export function useGenerateDoc() — returns a function and state:
State: isGenerating (boolean), progress ({ currentSection, sectionIndex, totalSections }), error (string | null)
The function accepts repoId and calls POST /api/docs/generate via SSE fetch.
Parse SSE events:
- section_start: update progress state
- token: append to a ref (not state — avoid re-renders per token)
- section_end: mark section complete
- done: setIsGenerating(false), invalidate ['doc', repoId] React Query cache
- error: setIsGenerating(false), setError(message)

---

Replace /apps/web/src/app/(dashboard)/dashboard/docs/page.tsx completely.

useSetPageTitle('Documentation')

Page has 4 states:

STATE A — No repo selected (selectedRepoId is null):
- Heading: "Documentation Generator"
- Subheading: "Select a repository to generate documentation"
- Grid of repo cards (only INDEXED repos from useRepos())
- Each card: owner/name in font-mono, file count, chunks count, "Select" button
- Clicking a card sets selectedRepoId

STATE B — Repo selected, no doc exists yet (useDoc returns null/404):
- PageHeader: "{owner}/{name} — Documentation" + "Generate Docs" button
- Centered content area:
  - FileText icon (64px, text-brand)
  - Title: "Generate AI Documentation"
  - Description: "DevScope AI will analyze your entire codebase and generate comprehensive documentation including project overview, architecture, API reference, key functions, and a contributing guide."
  - A list of 6 section names with Clock icons (showing what will be generated)
  - Large "Generate Documentation" button (brand color)
  - Helper text: "Estimated time: 60-90 seconds"

STATE C — Generating (isGenerating is true):
- Progress header: "Generating Documentation..."
- shadcn Progress bar: value = (sectionIndex / 6) * 100
- List of 6 section rows with status icons:
  - Completed: CheckCircle2 icon in green + section name
  - Current: Loader2 spinning icon in brand color + section name (font-medium)
  - Pending: Circle icon in gray/muted + section name (text-muted-foreground)
- Live preview area below: renders the accumulated markdown tokens using react-markdown as they stream in

STATE D — Doc exists (not generating):
- PageHeader: "{owner}/{name} — Documentation" with two buttons:
  - "Regenerate" (outline variant, RefreshCw icon) — triggers generation again with AlertDialog confirmation
  - "Download .md" (brand color, Download icon) — opens /api/docs/{repoId}/download in new tab
- "Last generated: {relative time}" small badge
- Two-column layout (hidden sidebar on mobile):
  - Main content (flex-1): full rendered markdown using react-markdown + remarkGfm + rehypeHighlight
    Apply these className overrides to react-markdown components:
    h1, h2: border-bottom pb-2 mb-4
    code (block): use the CodeBlock component from chat components
    table: border-collapse w-full
    td, th: border p-2 text-sm
  - Right sidebar (200px, sticky, hidden on mobile):
    "On this page" heading
    Parse H2 headings from the doc content
    Render as anchor links: href="#section-title-slugified"
    Add IDs to the rendered headings by using a custom h2 component in react-markdown

=== VERIFICATION ===
1. Run npx tsc --noEmit in both apps — fix ALL errors
2. Run the dev server
3. Navigate to /dashboard/docs
4. Verify STATE A shows repo selector grid
5. Select an indexed repo — verify STATE B shows with 6 section list
6. Click "Generate Documentation"
7. Verify STATE C shows progress: sections tick off one by one, live preview streams
8. After completion (~90 seconds): verify STATE D shows with rendered markdown
9. Verify table of contents on the right links to headings
10. Click "Download .md" — verify a markdown file downloads
11. Click "Regenerate" — verify confirmation dialog appears
Report all results.
