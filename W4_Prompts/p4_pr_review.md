Build the PR Review Bot feature completely. Users paste a GitHub PR URL, DevScope AI fetches the diff, analyzes it against the indexed codebase, and returns a structured code review.

=== BACKEND ===

Create /apps/api/src/services/prReviewer.service.ts

Import: geminiClient, GEMINI_MODEL, embedQuery from embedder.service.ts
Import: VectorStore from vectorStore.service.ts
Import: detectLanguage from github.service.ts (or reimplement inline if not exported)

Define these types:

interface PRFile {
  filename: string
  status: 'added' | 'modified' | 'deleted' | 'renamed'
  additions: number
  deletions: number
  patch?: string
  language: string
}

interface PRReviewResult {
  summary: string
  overallVerdict: 'approve' | 'request_changes' | 'comment'
  issues: Array<{
    severity: 'critical' | 'warning' | 'suggestion'
    filename: string
    line?: number
    title: string
    description: string
    suggestedFix?: string
  }>
  positives: string[]
  fullReviewMarkdown: string
  tokensUsed: number
}

interface ReviewPROptions {
  repoId: string
  repoOwner: string
  repoName: string
  prNumber: number
  prTitle: string
  prDescription: string
  prAuthor: string
  baseBranch: string
  files: PRFile[]
}

Build exported function: reviewPR(options: ReviewPROptions): Promise<PRReviewResult>

Step 1 — Filter files:
- Skip files where patch is undefined or empty
- Skip files matching: package-lock.json, yarn.lock, pnpm-lock.yaml, *.min.js, *.min.css
- Skip files where path contains: /dist/, /build/, /.next/
- Skip deleted files (status === 'deleted')
- Take maximum 10 files
- Log: "Reviewing {n} of {total} files in PR #{prNumber}"

Step 2 — Get codebase context for the changes:
For each filtered file, embed a query:
  query = "code review: " + file.filename + " " + (file.patch?.slice(0, 400) ?? '')
  Search vectorStore with topK: 4
Collect all results, deduplicate by chunkId, take top 12 unique results total.

Step 3 — Build review prompt:
Format the changed files section as:
For each file:
"### {filename} ({status}, +{additions}/-{deletions})
{patch content, max 800 chars per file}"

Format the context section from vector search results.

Build this prompt:
"You are an expert code reviewer for the repository {repoOwner}/{repoName}.

Pull Request #{prNumber}: {prTitle}
Author: {prAuthor} | Base branch: {baseBranch}
Description: {prDescription or 'No description provided'}

CHANGED FILES:
{formatted files section}

EXISTING CODEBASE CONTEXT (for comparing patterns and style):
{formatted context from vector search}

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
  \"summary\": \"2-3 sentence overall assessment\",
  \"overallVerdict\": \"approve\" or \"request_changes\" or \"comment\",
  \"issues\": [
    {
      \"severity\": \"critical\" or \"warning\" or \"suggestion\",
      \"filename\": \"path/to/file.ts\",
      \"line\": 42,
      \"title\": \"Short issue title\",
      \"description\": \"Detailed explanation\",
      \"suggestedFix\": \"Suggested code or fix\"
    }
  ],
  \"positives\": [\"list of things done well\"],
  \"reviewBody\": \"Complete Markdown review comment for GitHub. Use ## DevScope AI Review heading. Include verdict, summary, issues grouped by severity with emoji (🔴 Critical, 🟡 Warning, 🔵 Suggestion), positives section, and end with ---\\n*Review by [DevScope AI](https://devscope.ai)*\"
}"

Step 4 — Call Gemini with json_object response format:
const response = await geminiClient.chat.completions.create({
  model: GEMINI_MODEL,
  messages: [{ role: 'user', content: reviewPrompt }],
  temperature: 0.1,
  max_tokens: 3000,
  response_format: { type: 'json_object' },
})

Step 5 — Parse response:
const parsed = JSON.parse(response.choices[0].message.content)
Map parsed to PRReviewResult.
Set fullReviewMarkdown = parsed.reviewBody
tokensUsed = response.usage?.total_tokens ?? 0

If JSON parse fails: return a fallback PRReviewResult with:
- summary: "Review generation failed. Raw response available."
- overallVerdict: 'comment'
- issues: []
- positives: []
- fullReviewMarkdown: "## DevScope AI Review\n\nReview parsing failed. Please try again."

Return PRReviewResult.

---

Create /apps/api/src/services/githubPR.service.ts

Helper to fetch PR data from GitHub API using GITHUB_TOKEN.

Use the same makeGitHubRequest pattern from github.service.ts (import it or replicate the function).

Export function: getPRMetadata(owner: string, repo: string, prNumber: number): Promise<any>
- GET https://api.github.com/repos/{owner}/{repo}/pulls/{prNumber}
- Returns the full GitHub PR object

Export function: getPRFiles(owner: string, repo: string, prNumber: number): Promise<PRFile[]>
- GET https://api.github.com/repos/{owner}/{repo}/pulls/{prNumber}/files
- Map each file to PRFile type
- Use detectLanguage on the filename for the language field

---

Create /apps/api/src/routes/prReview.routes.ts

Register in routes/index.ts as: router.use('/pr-review', prReviewRoutes)

POST /api/pr-review/analyze — protected by requireAuth + planGate('unlimited_messages')
Request body: { repoId, prUrl }

Validate:
- Both repoId and prUrl required
- prUrl must match: /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/
- Extract prOwner, prRepoName, prNumber from the regex match
- If invalid format: return 400 with message "Invalid GitHub PR URL. Expected format: https://github.com/owner/repo/pull/123"

Logic:
- Get user from clerkId
- Verify repo ownership in DB
- Check repo.status === 'INDEXED' or return 400
- Fetch PR metadata using getPRMetadata
- Fetch PR files using getPRFiles
- Call reviewPR with all data
- Save to PrReview table in DB
- Log to UsageLog: action 'pr_review'
- Return the PRReviewResult as JSON

GET /api/pr-review/:repoId — list past reviews
- Verify repo ownership
- Return all PrReview rows for this repo ordered by createdAt desc
- Select: id, prNumber, prTitle, prUrl, verdict, summary, issueCount, tokensUsed, createdAt

---

Create /apps/web/src/app/(dashboard)/dashboard/pr-review/page.tsx

useSetPageTitle('PR Review')

Page is a two-panel layout (same structure as chat page):
className="flex h-full -m-6 overflow-hidden"

LEFT PANEL (380px, border-right, flex col, h-full, overflow hidden):

Top section (p-4, border-bottom):
  Heading: "PR Review Bot" with GitPullRequest icon

  Repo selector:
  - Label: "Select Repository" (text-xs muted)
  - shadcn Select component showing INDEXED repos as "{owner}/{name}"
  - When changed: load past reviews for that repo

  PR URL input:
  - Label: "GitHub Pull Request URL"
  - Input: placeholder "https://github.com/owner/repo/pull/123"
  - Inline error message below if URL format is invalid (show on blur or submit)
  - "Analyze PR" button: brand color, full width, GitPullRequest icon
  - Disabled when: no repo selected, no URL, isLoading, or URL is invalid format
  - While loading: show Spinner inside button + "Analyzing..." text

Past reviews list (flex-1, overflow-y-auto, p-3):
  - Heading "Past Reviews" (text-xs uppercase muted mb-2)
  - Fetch GET /api/pr-review/{selectedRepoId} when repo is selected
  - Each review item (clickable, rounded-lg p-3 hover:bg-accent):
    - Top row: "PR #{number}" badge + verdict badge
      - approve: bg-green-100 text-green-800 "Approved"
      - request_changes: bg-red-100 text-red-800 "Changes Requested"
      - comment: bg-gray-100 text-gray-700 "Commented"
    - PR title (truncated 50 chars, text-sm font-medium)
    - Bottom: "{n} issues" text-xs muted + relative time right-aligned
  - When clicked: load that review into right panel
  - If no reviews: small muted text "No reviews yet"

RIGHT PANEL (flex-1, overflow-y-auto):

STATE A — nothing selected:
EmptyState: GitPullRequest icon (48px), "Analyze a Pull Request", "Paste a GitHub PR URL to get an AI code review comparing the changes against your indexed codebase."

STATE B — loading:
Centered (p-8):
- Loader2 spinning (brand color, 40px)
- "Analyzing PR..." heading
- Cycling status messages (change every 3 seconds using useEffect + setInterval):
  "Fetching changed files from GitHub..."
  "Searching codebase for relevant context..."
  "Running code review analysis..."
  "Generating review with Gemini..."

STATE C — review loaded:
div with p-6 space-y-6

Header card (bg-muted rounded-lg p-4):
- Row 1: "PR #{prNumber}" in font-mono text-sm muted + large PR title heading
- Row 2: verdict badge (large, colored) + "Copy Review" button (outline, Copy icon)
  - Copy button: copies fullReviewMarkdown to clipboard, shows "Copied!" for 2s

Summary card (border rounded-lg p-4):
- "Summary" label text-xs uppercase muted mb-2
- Summary text paragraph

Issues section (if issues.length > 0):
- Heading "Issues Found" with count badge
- Group issues by severity. For each group (critical first, then warning, then suggestion):
  - Group header with colored left border:
    critical: border-red-500 text-red-700 with AlertCircle icon "Critical Issues"
    warning: border-yellow-500 text-yellow-700 with AlertTriangle icon "Warnings"
    suggestion: border-blue-500 text-blue-700 with Lightbulb icon "Suggestions"
  - Each issue card (border-l-2 with severity color, bg-background rounded p-4 mb-2):
    - Title in font-medium
    - Filename in font-mono text-xs text-muted + "Line {n}" if line exists
    - Description paragraph text-sm
    - If suggestedFix: "Suggested fix:" label + code block in bg-muted rounded p-3 font-mono text-sm

Positives section (if positives.length > 0):
- Heading "What Was Done Well" with CheckCircle2 icon in green
- Bullet list of positives (text-sm, each with a green checkmark bullet)

Full Review section (collapsible):
- Trigger button "View Full Review Markdown" with ChevronDown icon
- Uses shadcn Collapsible component
- Content: react-markdown rendering of fullReviewMarkdown

=== VERIFICATION ===
1. npx tsc --noEmit in both apps — fix ALL errors
2. Navigate to /dashboard/pr-review
3. Verify left panel shows repo selector and URL input
4. Select an indexed repo
5. Find a real public GitHub PR URL (e.g. https://github.com/expressjs/express/pull/5727)
6. Paste it and click "Analyze PR"
7. Verify: loading state cycles through status messages
8. After 15-30 seconds: verify review appears with:
   - Verdict badge in correct color
   - Issues grouped by severity
   - Positives listed
   - Copy button works (copies markdown)
9. Verify past review appears in left panel list
10. Click the past review — verify it loads in right panel
Report results.
