Build the Complexity Scorer feature completely. Users describe a task and DevScope AI estimates effort, identifies affected files, predicts risks, and generates an implementation plan.

=== BACKEND ===

Create /apps/api/src/services/complexityScorer.service.ts

Import: geminiClient, GEMINI_MODEL, embedQuery from embedder.service.ts
Import: VectorStore from vectorStore.service.ts

Define these types:

interface ComplexityResult {
  taskDescription: string
  repoOwner: string
  repoName: string
  effortScore: number
  effortLabel: 'Trivial' | 'Small' | 'Medium' | 'Large' | 'Extra Large' | 'Epic'
  estimatedHours: { min: number, max: number }
  estimatedDays: { min: number, max: number }
  affectedFiles: Array<{
    path: string
    changeType: 'modify' | 'create' | 'delete' | 'uncertain'
    reason: string
    complexity: 'low' | 'medium' | 'high'
  }>
  risks: Array<{
    severity: 'low' | 'medium' | 'high'
    title: string
    description: string
    mitigation: string
  }>
  implementationPlan: Array<{
    step: number
    title: string
    description: string
    estimatedHours: number
  }>
  dependencies: string[]
  testingConsiderations: string
  summary: string
  tokensUsed: number
}

interface ScoreComplexityOptions {
  repoId: string
  repoOwner: string
  repoName: string
  taskDescription: string
}

Build exported function: scoreComplexity(options: ScoreComplexityOptions): Promise<ComplexityResult>

Step 1 — Three parallel vector searches for comprehensive context:
Run these 3 searches concurrently using Promise.all:
Search 1: embedQuery(taskDescription) — topK: 10
Search 2: embedQuery(taskDescription + " configuration setup initialization dependencies") — topK: 5
Search 3: embedQuery(taskDescription + " tests testing error handling validation edge cases") — topK: 5

Combine all results, deduplicate by chunkId, take top 15 unique results by score.

Step 2 — Build context string from top 15 results:
Format each result as:
"[{filePath} Lines {startLine}-{endLine}]
{content snippet, first 300 chars}
"

Step 3 — Build the scoring prompt:
"You are a senior software architect estimating the complexity of a development task for the repository {repoOwner}/{repoName}.

TASK TO ESTIMATE:
{taskDescription}

RELEVANT CODEBASE CONTEXT:
{context string from Step 2}

Analyze this task carefully. Consider the codebase structure visible in the context.
Respond with ONLY a valid JSON object. No text before or after. No markdown wrapper.

{
  \"effortScore\": <integer 1-10>,
  \"effortLabel\": <\"Trivial\" | \"Small\" | \"Medium\" | \"Large\" | \"Extra Large\" | \"Epic\">,
  \"estimatedHours\": { \"min\": <integer>, \"max\": <integer> },
  \"estimatedDays\": { \"min\": <number with 1 decimal>, \"max\": <number with 1 decimal> },
  \"affectedFiles\": [
    {
      \"path\": \"<file path relative to repo root>\",
      \"changeType\": \"modify\" | \"create\" | \"delete\" | \"uncertain\",
      \"reason\": \"<why this file needs to change>\",
      \"complexity\": \"low\" | \"medium\" | \"high\"
    }
  ],
  \"risks\": [
    {
      \"severity\": \"low\" | \"medium\" | \"high\",
      \"title\": \"<risk title>\",
      \"description\": \"<what could go wrong>\",
      \"mitigation\": \"<how to reduce the risk>\"
    }
  ],
  \"implementationPlan\": [
    {
      \"step\": <integer starting at 1>,
      \"title\": \"<step title>\",
      \"description\": \"<what to do>\",
      \"estimatedHours\": <integer>
    }
  ],
  \"dependencies\": [\"<package or module names this task depends on>\"],
  \"testingConsiderations\": \"<what tests are needed and why>\",
  \"summary\": \"<2-3 sentence plain English summary of effort and main challenges>\"
}

Effort score guide:
1-2 = Trivial: change config, update text, fix typo (< 2 hours)
3-4 = Small: new field, minor endpoint, simple component (2-8 hours)
5-6 = Medium: new feature with DB changes, moderate integration (1-3 days)
7-8 = Large: significant new system, cross-cutting changes (3-10 days)
9-10 = Epic: architectural change, fundamental refactor (> 2 weeks)

Only reference files you can actually see in the context. Mark files you are less certain about as changeType: uncertain."

Step 4 — Call Gemini with json_object format:
const response = await geminiClient.chat.completions.create({
  model: GEMINI_MODEL,
  messages: [{ role: 'user', content: scoringPrompt }],
  temperature: 0.1,
  max_tokens: 2500,
  response_format: { type: 'json_object' },
})

Step 5 — Parse and return:
Parse JSON from response.choices[0].message.content
Add: taskDescription, repoOwner, repoName, tokensUsed = response.usage?.total_tokens ?? 0
Return as ComplexityResult

On JSON parse failure: throw Error('Failed to parse complexity analysis. Please try again.')

---

Create /apps/api/src/routes/complexity.routes.ts

Register in routes/index.ts as: router.use('/complexity', complexityRoutes)

POST /api/complexity/score — protected by requireAuth + planGate('unlimited_messages')
Body: { repoId, taskDescription }

Validate:
- Both required
- taskDescription: minimum 10 chars, maximum 1000 chars
- If too short: return 400 "Please describe the task in more detail (minimum 10 characters)"
- If too long: return 400 "Task description too long (maximum 1000 characters)"

Logic:
- Get user, verify repo ownership
- Check repo.status === 'INDEXED'
- Call scoreComplexity()
- Save to ComplexityScore table:
  repoId, userId, taskDescription, effortScore, effortLabel,
  estimatedHoursMin: result.estimatedHours.min,
  estimatedHoursMax: result.estimatedHours.max,
  affectedFilesCount: result.affectedFiles.length,
  risksCount: result.risks.length,
  fullResult: result (the entire JSON object),
  tokensUsed
- Log to UsageLog: action 'complexity_score'
- Return the ComplexityResult as JSON

GET /api/complexity/:repoId — list past scores
- Verify repo ownership
- Return ComplexityScore rows for this repo ordered by createdAt desc
- Select: id, taskDescription, effortScore, effortLabel, estimatedHoursMin, estimatedHoursMax, affectedFilesCount, risksCount, createdAt

---

Create /apps/web/src/app/(dashboard)/dashboard/complexity/page.tsx

useSetPageTitle('Complexity Scorer')

Two-panel layout: className="flex h-full -m-6 overflow-hidden"

LEFT PANEL (400px, border-right, flex col, h-full):

Top section (p-4, border-bottom):
  Heading: "Complexity Scorer" with BarChart2 icon

  Repo selector (same Select pattern as PR Review page)

  Textarea input:
  - Label: "Describe the task or feature"
  - Textarea: min-h-[120px] max-h-[240px] resize-none
  - Placeholder: "e.g. Add email notifications when a user's subscription expires. Users should receive an email 3 days before and on the day their subscription ends."
  - Character counter below: shown as "{n} / 1000" right-aligned
  - If over 1000: counter turns red, textarea gets red border
  - "Estimate Complexity" button: brand color, full width, Zap icon
  - Disabled when: no repo, textarea empty or over 1000 chars, isLoading
  - Loading state: Spinner + "Analyzing codebase..."

Past estimates (flex-1, overflow-y-auto, p-3 border-top mt-2):
  - Heading "Past Estimates" text-xs uppercase muted mb-2
  - Fetch GET /api/complexity/{selectedRepoId} when repo selected
  - Each item (clickable, rounded p-3 hover:bg-accent):
    - Task description truncated to 55 chars
    - Effort badge colored by score:
      1-2: bg-green-100 text-green-800
      3-4: bg-blue-100 text-blue-800
      5-6: bg-yellow-100 text-yellow-800
      7-8: bg-orange-100 text-orange-800
      9-10: bg-red-100 text-red-800
    - "{min}-{max}h" in text-xs muted
    - Relative time right-aligned
  - Clicking loads that estimate's fullResult into right panel

RIGHT PANEL (flex-1, overflow-y-auto, p-6):

STATE A — no result:
EmptyState: BarChart2 icon, "Estimate Task Complexity", "Describe a feature or task and get a detailed effort estimate with affected files, risks, and an implementation plan."
Below EmptyState: 4 example chips (border rounded-full px-3 py-1.5 text-sm hover:bg-accent cursor-pointer):
- "Add rate limiting to all API endpoints"
- "Implement dark mode toggle"
- "Add email notifications for subscription expiry"
- "Migrate authentication from JWT to sessions"
Clicking a chip: prefills the textarea in left panel

STATE B — loading:
Centered (p-8 space-y-4):
- BarChart2 icon pulsing (animate-pulse, brand color, 48px)
- "Estimating complexity..." heading
- shadcn Progress bar that fills from 0 to 95% over 15 seconds (use useEffect + setInterval to increment)
- Cycling status messages every 4 seconds:
  "Searching codebase for relevant context..."
  "Running 3 parallel semantic searches..."
  "Analyzing task complexity..."
  "Building implementation plan..."

STATE C — result shown:
space-y-6

HERO CARD (border rounded-xl p-6):
Two columns (flex gap-6):
Left col: 
  Large effort score number styled by value:
  - 1-2: text-green-600
  - 3-4: text-blue-600
  - 5-6: text-yellow-600
  - 7-8: text-orange-600
  - 9-10: text-red-600
  Font size: text-7xl font-bold
  An SVG circular arc below the number (simple — just a circle outline with a colored arc overlaid):
  - Circle: cx=40 cy=40 r=34, stroke gray, strokeWidth=6, fill none
  - Arc: same circle, stroke=currentColor (inherits text color), strokeWidth=6, 
    strokeDasharray="213 213" (213 = 2*PI*34), 
    strokeDashoffset={213 - (effortScore/10)*213}
    strokeLinecap="round", transform="rotate(-90 40 40)"
  SVG viewBox="0 0 80 80" width=80 height=80
  effortLabel below the SVG: text-xl font-semibold

Right col:
  Time estimate: "{min}-{max} hours ({minDays}-{maxDays} days)" in text-2xl font-medium
  Summary paragraph in text-muted-foreground

AFFECTED FILES (border rounded-xl p-5):
Heading row: FileCode icon + "Affected Files" + count badge (text-xs bg-muted px-2 py-0.5 rounded-full)
Table (w-full text-sm):
  Header row: File | Change | Complexity | Reason
  Each row:
  - File path in font-mono text-xs (clicking copies to clipboard — show brief toast)
  - Change badge: modify=blue, create=green, delete=red, uncertain=gray
  - Complexity badge: low=green, medium=yellow, high=red
  - Reason in text-muted-foreground (truncated with title attr for full text)

IMPLEMENTATION PLAN (border rounded-xl p-5):
Heading: ListChecks icon + "Implementation Plan"
Vertical stepper:
Each step (flex gap-4 items-start, pb-4, relative):
  Left: step number circle (w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center text-sm font-medium flex-shrink-0)
  Connector line between steps (absolute left-4 top-8 bottom-0 w-0.5 bg-border — not on last step)
  Right:
    Step title (font-medium) + "~{hours}h" badge (text-xs bg-muted px-2 rounded-full ml-2)
    Step description (text-sm text-muted-foreground mt-1)

RISKS (border rounded-xl p-5, only if risks.length > 0):
Heading: AlertTriangle icon + "Risks" + count badge
Sort by severity: high first
Each risk card (rounded-lg p-4 mb-3 border-l-4):
  high: border-red-500 bg-red-50/50
  medium: border-yellow-500 bg-yellow-50/50
  low: border-blue-500 bg-blue-50/50
  - Severity badge + title row
  - Description paragraph text-sm
  - "Mitigation:" label in font-medium + mitigation text in bg-muted rounded p-2 text-sm

DEPENDENCIES (if dependencies.length > 0):
Heading: Package icon + "Dependencies"
Horizontal flex-wrap gap-2:
Each dependency as: bg-muted rounded-full px-3 py-1 text-sm font-mono

TESTING (border rounded-xl p-5):
Heading: FlaskConical icon + "Testing Considerations"
testingConsiderations as a paragraph

Bottom action bar (sticky bottom-0 bg-background border-top p-4 flex gap-3):
- "Copy Summary" button: copies a formatted text summary to clipboard
  Format: "Complexity Estimate: {effortLabel} ({effortScore}/10)\nTime: {min}-{max} hours\nFiles affected: {count}\nRisks: {count}\n\nSummary: {summary}"
- "New Estimate" button: outline variant, clears result and focuses textarea

=== VERIFICATION ===
1. npx tsc --noEmit in both apps — fix ALL errors
2. Navigate to /dashboard/complexity
3. Verify left panel shows repo selector and textarea
4. Select an indexed repo
5. Click one of the example chips — verify it prefills the textarea
6. Click "Estimate Complexity"
7. Verify: progress bar fills, status messages cycle, loading state looks good
8. After 10-20 seconds: verify result appears with:
   - Colored effort score with circular arc SVG
   - Real file paths in the affected files table (from the indexed repo)
   - Numbered implementation plan steps
   - Colored risk cards
9. Click a file path in the table — verify it copies to clipboard
10. Click "Copy Summary" — verify it copies the formatted text
11. Past estimate appears in left panel — clicking it loads result
Report results.
