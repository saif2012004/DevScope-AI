# DevScope AI — Week 3 Cursor Prompts (Grok + Voyage AI Edition)
# Week 3 goal: Repo ingestion pipeline + RAG query engine + streaming AI chat interface.
# By end of week: Users can index a GitHub repo and ask real AI questions about it.
# Use these IN ORDER. Complete and verify each prompt before starting the next.
# Always have `npm run docker:up` and `npm run dev` running before you start.

---

## AI PROVIDER DECISION — READ THIS FIRST

We are NOT using OpenAI. Here is exactly what we use and why:

### Chat / Generation → Grok API (xAI)
- Free tier: $25 free credits on signup at console.x.ai — enough for months of dev
- Model: grok-3 (excellent at code understanding)
- Key detail: Grok API is 100% OpenAI SDK compatible — same SDK, just a different baseURL
- SDK: we still install the `openai` npm package and point it at xAI's endpoint

### Embeddings → Voyage AI
- Free tier: 50 million tokens free — enough to index hundreds of repos at zero cost
- Model: voyage-code-3 (purpose-built for code — outperforms OpenAI's embeddings on code tasks)
- Dimensions: 1024 (smaller than OpenAI's 1536 — faster search, less memory)
- SDK: official `voyageai` npm package
- Sign up at: dash.voyageai.com — free, no credit card required

### Everything else — completely free:
- GitHub Token → free (github.com/settings/tokens)
- Clerk → free tier (10k MAU)
- Stripe → test mode free forever
- Redis → Docker (local, free)
- PostgreSQL → Docker (local, free)
- FAISS → open source (local, free)
- BullMQ → open source (local, free)
- Railway / Vercel → free hobby tier for deployment

---

## CONTEXT (read before every prompt session)
At the end of Week 2 we have:
- Full dashboard UI: sidebar, header, repos page, billing, settings
- Users can add a GitHub repo — it gets saved to PostgreSQL with status: PENDING
- Stripe subscriptions and plan gating working
- Redis running via Docker (BullMQ queue ready to use)
- Clerk auth working end-to-end
- All pages have loading/error/empty states

Week 3 builds the core AI product:
1. Prompt 1: GitHub file fetcher service (fetch all files from a repo via GitHub API)
2. Prompt 2: Code chunker + Voyage AI embedder (split code into chunks, embed with voyage-code-3)
3. Prompt 3: FAISS vector store per repo + BullMQ ingestion job queue
4. Prompt 4: RAG query engine (semantic search + Grok streaming generation)
5. Prompt 5: Full chat UI with streaming, citations, and repo selector

---

## BEFORE STARTING WEEK 3 — Required setup

### Step 1 — Get your API keys (all free)

**Grok API key (xAI):**
1. Go to console.x.ai
2. Sign up / log in
3. Create an API key
4. You get $25 free credits — more than enough

**Voyage AI key:**
1. Go to dash.voyageai.com
2. Sign up (no credit card required)
3. Create an API key
4. Free tier: 50M tokens — enough for hundreds of repo indexings

**GitHub Personal Access Token:**
1. Go to github.com/settings/tokens
2. "Generate new token (classic)"
3. Scopes: check only "public_repo" (read public repos) or "repo" (if you need private repos)
4. Copy the token

### Step 2 — Add to /apps/api/.env
```
GROK_API_KEY=xai-your-grok-key-here
VOYAGE_API_KEY=pa-your-voyage-key-here
GITHUB_TOKEN=ghp_your-github-pat-here
VECTOR_STORE_PATH=./vector_stores
```

### Step 3 — Install new packages in /apps/api
```bash
cd apps/api
npm install openai voyageai faiss-node @bull-board/api @bull-board/express bullmq
npm install --save-dev @types/node
```

Note on faiss-node: it requires a C++ build step. If it fails on your machine:
```bash
npm install vectra   # pure JS vector search — no build step, slightly slower
```
We write an abstraction layer so either can be swapped with a one-line change.

### Step 4 — Add vector_stores to .gitignore
In the root .gitignore, add:
```
apps/api/vector_stores/
```

---

## PROMPT 1 — GitHub File Fetcher Service
### (Run first. This fetches all source code files from a GitHub repo via API.)

```
We are building DevScope AI. Week 2 is complete — users can add repos which are stored in PostgreSQL with status PENDING. Now build the GitHub file fetcher service that fetches all source files from a repo via the GitHub API.

## Context
- Backend: Node.js + Express + TypeScript at /apps/api
- We use the GitHub REST API (no git clone — we fetch file trees and content via API calls)
- GITHUB_TOKEN env var is set (Personal Access Token with public_repo scope)
- We need to fetch: the repo file tree, then the content of each relevant source file
- We do NOT use octokit — use native fetch (Node 18+) only

## Create /apps/api/src/services/github.service.ts

### Types to define at the top of the file:
```typescript
export interface GitHubFile {
  path: string        // e.g. "src/components/Button.tsx"
  content: string     // decoded file content (UTF-8 string)
  size: number        // bytes
  sha: string         // git blob SHA
  language: string    // detected from file extension e.g. "TypeScript"
}

export interface RepoMetadata {
  owner: string
  name: string
  defaultBranch: string
  description: string | null
  stars: number
  language: string | null
  size: number        // repo size in KB
}

export interface FetchRepoResult {
  metadata: RepoMetadata
  files: GitHubFile[]
  totalFilesFound: number
  totalFilesSkipped: number
  skippedReasons: Record<string, number>
}
```

### File filtering constants — define at top of file:
```typescript
const EXCLUDED_DIRS = new Set([
  'node_modules', '.git', '.github', 'dist', 'build', 'out', '.next',
  '.nuxt', 'coverage', '.nyc_output', 'vendor', '__pycache__', '.pytest_cache',
  'venv', '.venv', 'env', 'target', 'bin', 'obj', '.gradle',
  'android', 'ios', '.idea', '.vscode', 'tmp', 'temp', 'logs', 'log',
  'public', 'static', 'assets', 'images', 'fonts', 'icons',
  'fixtures', 'mocks', '__mocks__', 'e2e', 'cypress', 'playwright',
])

const INCLUDED_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.rb', '.go', '.rs', '.java', '.kt', '.swift',
  '.c', '.cpp', '.h', '.hpp', '.cs', '.php',
  '.vue', '.svelte', '.sql', '.graphql', '.gql',
  '.json', '.yaml', '.yml', '.toml', '.env.example',
  '.md', '.mdx', '.sh', '.bash', '.zsh',
  '.dockerfile', '.Dockerfile',
])

const MAX_FILE_SIZE_BYTES = 100_000   // 100KB
const MAX_FILES_PER_REPO = 500
```

### Helper: detectLanguage(filePath: string): string
Map file extension to language name:
- .ts, .tsx → "TypeScript"
- .js, .jsx, .mjs, .cjs → "JavaScript"
- .py → "Python"
- .go → "Go"
- .rs → "Rust"
- .java → "Java"
- .rb → "Ruby"
- .php → "PHP"
- .cs → "C#"
- .cpp, .cc, .c → "C/C++"
- .swift → "Swift"
- .kt → "Kotlin"
- .vue → "Vue"
- .svelte → "Svelte"
- .sql → "SQL"
- .graphql, .gql → "GraphQL"
- .md, .mdx → "Markdown"
- .json → "JSON"
- .yaml, .yml → "YAML"
- .sh, .bash, .zsh → "Shell"
- default → "Other"

### Helper: makeGitHubRequest(url: string): Promise<any>
- Headers: Accept: "application/vnd.github+json", X-GitHub-Api-Version: "2022-11-28"
- If GITHUB_TOKEN is set: add Authorization: Bearer {token}
- Parse and return JSON response
- If response not ok: throw Error with status code and GitHub error message

### Main export: fetchRepoFiles(owner: string, repoName: string, defaultBranch: string): Promise<FetchRepoResult>

Step 1 — Fetch repo metadata via GET https://api.github.com/repos/{owner}/{repoName}
Extract: description, stargazers_count, language, size, default_branch

Step 2 — Fetch full file tree via GET https://api.github.com/repos/{owner}/{repoName}/git/trees/{defaultBranch}?recursive=1
Filter to only type === "blob" items.
If response.truncated === true: log a warning but continue with what we got.

Step 3 — Filter files:
For each file, apply skip rules in order:
1. Any path segment (split by "/") is in EXCLUDED_DIRS → skip, reason: "excluded_dir"
2. File extension not in INCLUDED_EXTENSIONS → skip, reason: "excluded_extension"
3. File size > MAX_FILE_SIZE_BYTES → skip, reason: "too_large"
4. Already collected MAX_FILES_PER_REPO files → skip, reason: "limit_reached"

Step 4 — Fetch file contents in batches of 10 concurrently:
- Fetch raw content via: GET https://raw.githubusercontent.com/{owner}/{repoName}/{branch}/{path}
- Use Promise.all per batch
- Wait 200ms between batches: await new Promise(r => setTimeout(r, 200))
- If any single file fetch fails: skip silently, reason "fetch_failed"
- Content is already a UTF-8 string (no base64 decoding needed)

Step 5 — Return FetchRepoResult

### Also export: estimateRepoCost(fileCount: number, avgFileSizeBytes: number): { estimatedTokens: number, estimatedEmbeddingCostUSD: number }
- Tokens ≈ (totalBytes / 4) * 1.3
- Voyage AI voyage-code-3 cost: $0.00 for first 50M tokens (free tier)
- Return both values for logging

## Verification
1. No TypeScript errors: npx tsc --noEmit in apps/api
2. Create test script /apps/api/src/scripts/test-github-fetch.ts:
   - Call fetchRepoFiles("sindresorhus", "is", "main") — this is a tiny public JS repo
   - Log: total files found, files included, files skipped by reason, first 3 file paths + languages
   - Run: npx ts-node src/scripts/test-github-fetch.ts
   - Should succeed without errors and show files fetched
```

---

## PROMPT 2 — Code Chunker + Voyage AI Embedder
### (Run after Prompt 1 verification passes)

```
We are building DevScope AI. The GitHub file fetcher is complete. Now build the code chunker and the Voyage AI embedder.

IMPORTANT: We are using Voyage AI for embeddings (NOT OpenAI embeddings).
- Package: voyageai (already installed)
- Model: voyage-code-3
- Dimensions: 1024 (NOT 1536 — this is important for FAISS index setup in Prompt 3)
- Free tier: 50 million tokens — no cost during development

## Create /apps/api/src/services/chunker.service.ts

### Types:
```typescript
export interface CodeChunk {
  id: string            // "{repoId}_{sanitizedFilePath}_{chunkIndex}"
  repoId: string
  filePath: string      // "src/components/Button.tsx"
  language: string
  content: string       // chunk text including context header
  startLine: number     // 1-indexed
  endLine: number       // 1-indexed
  chunkIndex: number    // 0-indexed within file
  totalChunks: number   // set after all chunks for this file are known
  metadata: {
    repoOwner: string
    repoName: string
    fileSize: number
    hasExports: boolean
    hasFunctions: boolean
    hasClasses: boolean
  }
}

export interface EmbeddedChunk extends CodeChunk {
  embedding: number[]   // 1024-dimensional vector from voyage-code-3
}
```

### Constants:
```typescript
const CHUNK_SIZE_CHARS = 1600    // ~400 tokens at 4 chars/token
const CHUNK_OVERLAP_CHARS = 320  // ~80 tokens overlap
```

### chunkFile(file: GitHubFile, repoId: string, repoOwner: string, repoName: string): CodeChunk[]

Strategy — sliding window over lines:
1. Split file.content by '\n' into lines array
2. If total chars < CHUNK_SIZE_CHARS: return one chunk with entire file content
3. If content is empty: return []
4. Otherwise sliding window:
   - Accumulate lines until char count > CHUNK_SIZE_CHARS
   - Record startLine (1-indexed) and endLine (1-indexed)
   - Roll window forward: drop lines from the front until remaining chars ≤ CHUNK_OVERLAP_CHARS
   - Continue until all lines are processed

For each chunk, prepend a context header to the content:
```
// File: {filePath}
// Language: {language}
// Lines: {startLine}-{endLine}

{actual code content here}
```

Metadata flags — simple string matching (no AST):
- hasExports: content includes "export " or "module.exports"
- hasFunctions: content includes "function " or "def " or "fn " or "func "
- hasClasses: content includes "class " or "interface " or "struct "

Chunk ID: `${repoId}_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}_${chunkIndex}`
After generating all chunks: set totalChunks on each one.

### chunkFiles(files: GitHubFile[], repoId: string, repoOwner: string, repoName: string): CodeChunk[]
- Call chunkFile on each file, flatten results
- Log: "Chunked {fileCount} files into {totalChunks} chunks"
- Return all chunks

## Create /apps/api/src/services/embedder.service.ts

IMPORTANT: This file uses Voyage AI for embeddings and Grok API for chat.
They are separate clients for separate purposes.

### Voyage AI setup (for embeddings):
```typescript
import VoyageAI from 'voyageai'

const voyageClient = new VoyageAI({ apiKey: process.env.VOYAGE_API_KEY! })
const EMBEDDING_MODEL = 'voyage-code-3'
const EMBEDDING_DIMENSIONS = 1024   // voyage-code-3 outputs 1024 dimensions
const EMBED_BATCH_SIZE = 128        // Voyage AI allows up to 128 texts per request
```

### Grok client setup (for chat generation — used in Prompt 4, set up here):
```typescript
import OpenAI from 'openai'

// Grok API is OpenAI-compatible — same SDK, different baseURL and key
export const grokClient = new OpenAI({
  apiKey: process.env.GROK_API_KEY!,
  baseURL: 'https://api.x.ai/v1',
})
const GROK_MODEL = 'grok-3'
```

Export grokClient and GROK_MODEL — they will be imported by rag.service.ts in Prompt 4.

### embedChunks(chunks: CodeChunk[]): Promise<EmbeddedChunk[]>

Process in batches of EMBED_BATCH_SIZE:
```typescript
for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
  const batch = chunks.slice(i, i + EMBED_BATCH_SIZE)
  
  try {
    const response = await voyageClient.embed({
      input: batch.map(c => c.content),
      model: EMBEDDING_MODEL,
    })
    
    // response.data is an array of { embedding: number[], index: number }
    for (const item of response.data) {
      embeddedChunks.push({
        ...batch[item.index],
        embedding: item.embedding,
      })
    }
  } catch (error: any) {
    // If rate limited (429): wait 60s and retry once
    if (error?.status === 429) {
      console.warn('Voyage AI rate limit hit, waiting 60s...')
      await new Promise(r => setTimeout(r, 60_000))
      // retry this batch once
      const retryResponse = await voyageClient.embed({
        input: batch.map(c => c.content),
        model: EMBEDDING_MODEL,
      })
      for (const item of retryResponse.data) {
        embeddedChunks.push({ ...batch[item.index], embedding: item.embedding })
      }
    } else {
      // Other error: log and skip this batch (don't crash the whole job)
      console.error(`Voyage AI error on batch ${i}-${i + EMBED_BATCH_SIZE}:`, error.message)
    }
  }
  
  // Progress log every 5 batches
  if ((i / EMBED_BATCH_SIZE) % 5 === 0) {
    console.log(`Embedded ${Math.min(i + EMBED_BATCH_SIZE, chunks.length)}/${chunks.length} chunks...`)
  }
  
  // Small delay between batches
  if (i + EMBED_BATCH_SIZE < chunks.length) {
    await new Promise(r => setTimeout(r, 100))
  }
}
```

### embedQuery(query: string): Promise<number[]>
```typescript
const response = await voyageClient.embed({
  input: [query],
  model: EMBEDDING_MODEL,
})
return response.data[0].embedding
```
Throw on error — caller handles it.

### cosineSimilarity(a: number[], b: number[]): number
Standard cosine similarity — single loop, no intermediate arrays.
Throw if lengths don't match.
Returns number between -1 and 1.

## Verification
1. No TypeScript errors
2. Create /apps/api/src/scripts/test-embedder.ts:
   - Create 3 mock CodeChunks with short content like "function add(a, b) { return a + b }" etc.
   - Call embedChunks(mockChunks)
   - Log: number of results, first embedding's length (should be 1024), first 5 values
   - Verify cosineSimilarity(embedding, embedding) ≈ 1.0
   - Run: npx ts-node src/scripts/test-embedder.ts
   - This uses Voyage AI free tier — costs $0
3. No TypeScript errors
```

---

## PROMPT 3 — FAISS Vector Store + BullMQ Ingestion Queue
### (Run after Prompt 2 verification passes)

```
We are building DevScope AI. Chunker and Voyage AI embedder are complete. Now build the FAISS vector store and BullMQ ingestion job queue.

CRITICAL DIMENSION CHANGE vs OpenAI:
- We use Voyage AI voyage-code-3 which produces 1024-dimensional embeddings
- OpenAI produces 1536 dimensions
- The FAISS index MUST be initialized with dimension=1024 — do NOT use 1536 anywhere

## Part A — Vector Store Service

### Create /apps/api/src/services/vectorStore.service.ts

FAISS abstraction layer — try faiss-node, fall back to pure JS:
```typescript
// IMPORTANT: FAISS dimension is 1024 (voyage-code-3 output size)
const VECTOR_DIMENSIONS = 1024

let faissAvailable = false
let FaissIndex: any = null

try {
  const faissModule = await import('faiss-node')
  FaissIndex = faissModule.IndexFlatIP
  faissAvailable = true
  console.log('[VectorStore] Using faiss-node for vector search')
} catch {
  console.warn('[VectorStore] faiss-node not available — using pure JS cosine similarity fallback')
}
```

### Types:
```typescript
export interface VectorSearchResult {
  chunkId: string
  filePath: string
  content: string
  language: string
  startLine: number
  endLine: number
  score: number       // cosine similarity 0-1
  metadata: CodeChunk['metadata']
}

interface StoredChunkMetadata {
  chunkId: string
  filePath: string
  content: string
  language: string
  startLine: number
  endLine: number
  metadata: CodeChunk['metadata']
}
```

### File layout on disk:
```
{VECTOR_STORE_PATH}/
  {repoId}/
    index.faiss        ← FAISS binary index (if faiss-node available)
    embeddings.json    ← fallback: array of { chunkId, embedding: number[] }
    metadata.json      ← array of StoredChunkMetadata (parallel array to index)
    stats.json         ← { totalChunks, totalFiles, createdAt, updatedAt }
```

### VectorStore class:

**constructor(repoId: string)**
- this.repoId = repoId
- this.storePath = path.join(process.env.VECTOR_STORE_PATH!, repoId)
- this.isLoaded = false
- this.metadataArray: StoredChunkMetadata[] = []
- this.fallbackEmbeddings: number[][] = [] (used when faiss-node unavailable)
- this.faissIndex: any = null

**async initialize(): Promise<void>**
- fs.mkdirSync(this.storePath, { recursive: true })
- If index exists on disk:
  - If faissAvailable: load from index.faiss using FaissIndex.read(path)
  - Else: load this.fallbackEmbeddings from embeddings.json
  - Load this.metadataArray from metadata.json
- this.isLoaded = true

**async addChunks(chunks: EmbeddedChunk[]): Promise<void>**
- if (!this.isLoaded) await this.initialize()
- Build metadataArray from chunks (strip the embedding field)
- If faissAvailable:
  - Create new FaissIndex(VECTOR_DIMENSIONS) — MUST be 1024
  - Normalize each embedding (divide by L2 norm) then add to index
  - index.write(path.join(this.storePath, 'index.faiss'))
- Else (pure JS fallback):
  - Store normalized embeddings in this.fallbackEmbeddings
  - Write to embeddings.json
- Write metadataArray to metadata.json
- Write stats.json: { totalChunks: chunks.length, totalFiles: unique file paths, createdAt: new Date(), updatedAt: new Date() }

**L2 normalization helper (private):**
```typescript
private normalizeVector(vec: number[]): number[] {
  const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0))
  if (magnitude === 0) return vec
  return vec.map(v => v / magnitude)
}
```

**async search(queryEmbedding: number[], topK: number = 8): Promise<VectorSearchResult[]>**
- Normalize queryEmbedding
- If faissAvailable:
  - const { labels, distances } = this.faissIndex.search(normalizedQuery, topK)
  - Map labels to metadata (label is the index into metadataArray)
  - Map distances to scores (inner product of normalized vectors = cosine similarity)
- Else (pure JS):
  - Compute cosineSimilarity(normalizedQuery, each stored embedding)
  - Sort descending, take top topK
- Filter: score >= 0.25 (lower threshold than before — voyage-code-3 scores differently)
- Return VectorSearchResult[] sorted by score desc

**async delete(): Promise<void>**
- fs.rmSync(this.storePath, { recursive: true, force: true })

**async exists(): Promise<boolean>**
- return fs.existsSync(path.join(this.storePath, 'stats.json'))

**async getStats()**
- Read and parse stats.json, return null if not found

**static getStorePath(repoId: string): string**
- return path.join(process.env.VECTOR_STORE_PATH!, repoId)

## Part B — BullMQ Ingestion Queue

### Create /apps/api/src/queues/ingestion.queue.ts
```typescript
import { Queue } from 'bullmq'
import IORedis from 'ioredis'

const connection = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null })

export interface IngestionJobData {
  repoId: string
  userId: string
  githubOwner: string
  githubName: string
  defaultBranch: string
}

export const ingestionQueue = new Queue<IngestionJobData>('repo-ingestion', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
})

export async function addIngestionJob(data: IngestionJobData): Promise<void> {
  await ingestionQueue.add('ingest-repo', data, {
    jobId: `ingest-${data.repoId}`,  // idempotent
  })
}
```

### Create /apps/api/src/workers/ingestion.worker.ts
```typescript
import { Worker, Job } from 'bullmq'
import IORedis from 'ioredis'
import { prisma } from '../lib/prisma'
import { fetchRepoFiles } from '../services/github.service'
import { chunkFiles } from '../services/chunker.service'
import { embedChunks } from '../services/embedder.service'
import { VectorStore } from '../services/vectorStore.service'
import { IngestionJobData } from '../queues/ingestion.queue'

const connection = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null })

const worker = new Worker<IngestionJobData>(
  'repo-ingestion',
  async (job: Job<IngestionJobData>) => {
    const { repoId, githubOwner, githubName, defaultBranch } = job.data

    // Step 1 — Mark as INDEXING
    await prisma.repo.update({ where: { id: repoId }, data: { status: 'INDEXING', errorMessage: null } })
    await job.updateProgress(5)
    console.log(`[Worker] Starting ingestion for ${githubOwner}/${githubName}`)

    // Step 2 — Fetch files from GitHub
    const { files, totalFilesFound, skippedReasons } = await fetchRepoFiles(githubOwner, githubName, defaultBranch)
    console.log(`[Worker] Fetched ${files.length}/${totalFilesFound} files. Skipped:`, skippedReasons)
    await job.updateProgress(25)

    // Step 3 — Chunk files
    const chunks = chunkFiles(files, repoId, githubOwner, githubName)
    console.log(`[Worker] Created ${chunks.length} chunks`)
    await job.updateProgress(40)

    // Step 4 — Embed chunks with Voyage AI (voyage-code-3, 1024 dimensions)
    const embeddedChunks = await embedChunks(chunks)
    console.log(`[Worker] Embedded ${embeddedChunks.length} chunks (1024 dims each)`)
    await job.updateProgress(75)

    // Step 5 — Store in FAISS (dimension=1024)
    const vectorStore = new VectorStore(repoId)
    await vectorStore.initialize()
    await vectorStore.addChunks(embeddedChunks)
    console.log(`[Worker] Stored vectors in FAISS at ${VectorStore.getStorePath(repoId)}`)
    await job.updateProgress(90)

    // Step 6 — Mark as INDEXED
    await prisma.repo.update({
      where: { id: repoId },
      data: {
        status: 'INDEXED',
        indexedAt: new Date(),
        totalFiles: files.length,
        totalChunks: embeddedChunks.length,
        errorMessage: null,
      }
    })
    await job.updateProgress(100)
    console.log(`[Worker] ✓ Completed ingestion for ${githubOwner}/${githubName}`)
  },
  { connection, concurrency: 2 }
)

worker.on('failed', async (job, error) => {
  if (!job) return
  console.error(`[Worker] ✗ Ingestion failed for ${job.data.repoId}:`, error.message)
  await prisma.repo.update({
    where: { id: job.data.repoId },
    data: { status: 'FAILED', errorMessage: error.message.slice(0, 500) }
  })
})

worker.on('completed', job => console.log(`[Worker] Job ${job.id} done`))

export { worker as ingestionWorker }
```

### Update /apps/api/src/index.ts
Add at the top, after other imports:
```typescript
import './workers/ingestion.worker'  // starts BullMQ worker on API startup
```

Add BullBoard monitoring UI:
```typescript
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ExpressAdapter } from '@bull-board/express'
import { ingestionQueue } from './queues/ingestion.queue'

const serverAdapter = new ExpressAdapter()
serverAdapter.setBasePath('/admin/queues')
createBullBoard({ queues: [new BullMQAdapter(ingestionQueue)], serverAdapter })
app.use('/admin/queues', serverAdapter.getRouter())
// Note: in production, protect this with requireAuth middleware
```

### Update POST /api/repos controller
After successfully creating the repo in DB, add the ingestion job:
```typescript
import { addIngestionJob } from '../queues/ingestion.queue'

// After prisma.repo.create(...):
await addIngestionJob({
  repoId: createdRepo.id,
  userId: user.id,
  githubOwner: owner,
  githubName: repoName,
  defaultBranch: fetchedDefaultBranch,
})
```

### Add GET /api/repos/:repoId/status endpoint
In repos.routes.ts:
```typescript
router.get('/:repoId/status', requireAuth, async (req, res) => {
  const user = await getUserFromClerkId(req.auth.userId)
  const repo = await prisma.repo.findFirst({
    where: { id: req.params.repoId, userId: user.id },
    select: { id: true, status: true, totalFiles: true, totalChunks: true, errorMessage: true, indexedAt: true }
  })
  if (!repo) return res.status(404).json({ error: 'Repository not found' })
  return res.json(repo)
})
```

### Frontend — Repo status polling
In /apps/web/src/components/repos/RepoCard.tsx:
For repos with status PENDING or INDEXING:
- useEffect that polls GET /api/repos/{repoId}/status every 5 seconds
- When status → INDEXED: invalidate ['repos'] query, show toast "Repository indexed and ready!"
- When status → FAILED: show toast error with the errorMessage
- Clean up interval on unmount

## Verification
1. No TypeScript errors
2. BullBoard accessible at http://localhost:4000/admin/queues
3. Full pipeline test:
   a. Add https://github.com/sindresorhus/is via the repos UI
   b. Watch API terminal logs: "Starting ingestion" → "Fetched X files" → "Created Y chunks" → "Embedded N chunks (1024 dims each)" → "✓ Completed"
   c. Repo card changes: Pending → Indexing → Ready (with file/chunk counts)
   d. BullBoard shows completed job
   e. Prisma Studio: repo row has status INDEXED, totalFiles > 0, totalChunks > 0
   f. Filesystem: apps/api/vector_stores/{repoId}/ exists with index files
```

---

## PROMPT 4 — RAG Query Engine with Grok Streaming
### (Run after Prompt 3 verification passes)

```
We are building DevScope AI. The ingestion pipeline is complete. Now build the RAG query engine using:
- Voyage AI (voyage-code-3) for query embedding — same model used during ingestion
- Grok API (grok-3) for streaming answer generation

IMPORTANT architecture notes:
- Query embedding uses voyageClient from embedder.service.ts
- Answer generation uses grokClient from embedder.service.ts (it's the OpenAI SDK pointed at xAI's endpoint)
- Grok API is fully OpenAI-SDK-compatible — the streaming code is identical to OpenAI streaming
- FAISS search uses 1024-dimensional vectors (matching voyage-code-3 output)

## Create /apps/api/src/services/rag.service.ts

### Types:
```typescript
export interface RAGQueryOptions {
  repoId: string
  repoOwner: string
  repoName: string
  question: string
  chatHistory: Array<{ role: 'user' | 'assistant', content: string }>
  topK?: number
  streamCallback?: (token: string) => void
}

export interface RAGQueryResult {
  answer: string
  citations: Array<{
    filePath: string
    startLine: number
    endLine: number
    language: string
    snippet: string     // first 200 chars for display
    score: number
  }>
  tokensUsed: number
  retrievedChunks: number
}
```

### System prompt constant:
```typescript
const SYSTEM_PROMPT = `You are DevScope AI, an expert software engineering assistant with deep knowledge of the repository "{repoOwner}/{repoName}".

You have been given relevant code snippets as context. Answer the user's question accurately based ONLY on the provided context.

Rules:
1. Base your answer strictly on the code shown in the context.
2. If context is insufficient, say so clearly — do not invent code.
3. Always cite sources using the format [filename:L{start}-L{end}] when referencing specific code.
4. Format all code in your response using markdown code blocks with the correct language tag.
5. Be precise and developer-focused in your explanations.
6. If asked to modify code, base your suggestions on the existing patterns in the codebase.

Repository: {repoOwner}/{repoName}
Indexed languages: {languages}`
```

### Main export: ragQuery(options: RAGQueryOptions): Promise<RAGQueryResult>

```typescript
import { embedQuery } from './embedder.service'
import { grokClient, GROK_MODEL } from './embedder.service'
import { VectorStore } from './vectorStore.service'

export async function ragQuery(options: RAGQueryOptions): Promise<RAGQueryResult> {
  const { repoId, repoOwner, repoName, question, chatHistory, streamCallback } = options
  const topK = options.topK ?? 8

  // Step 1 — Verify repo is indexed
  const vectorStore = new VectorStore(repoId)
  if (!(await vectorStore.exists())) {
    throw new Error('Repository not indexed yet. Please wait for indexing to complete.')
  }
  await vectorStore.initialize()

  // Step 2 — Embed the question with Voyage AI (voyage-code-3, 1024 dims)
  const questionEmbedding = await embedQuery(question)

  // Step 3 — Semantic search in FAISS
  const searchResults = await vectorStore.search(questionEmbedding, topK)
  if (searchResults.length === 0) {
    throw new Error('No relevant code found for your question. Try rephrasing or asking about a specific file or function.')
  }

  // Step 4 — Build context string from search results
  const contextString = searchResults.map((result, i) => {
    return [
      `--- Chunk ${i + 1}: ${result.filePath} (Lines ${result.startLine}-${result.endLine}, ${result.language}, Score: ${result.score.toFixed(2)}) ---`,
      result.content,
      '',
    ].join('\n')
  }).join('\n')

  const fullContext = `=== RETRIEVED CODE CONTEXT (${searchResults.length} chunks) ===\n\n${contextString}\n=== END CONTEXT ===`

  // Step 5 — Build messages for Grok
  const languages = [...new Set(searchResults.map(r => r.language))].join(', ')
  const systemPrompt = SYSTEM_PROMPT
    .replace('{repoOwner}', repoOwner)
    .replace('{repoName}', repoName)
    .replace('{languages}', languages)

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: `Here is the relevant code context from the repository:\n\n${fullContext}` },
    // Include last 6 turns of chat history for follow-up question support
    ...chatHistory.slice(-6).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: question },
  ]

  // Step 6 — Stream from Grok API (grok-3)
  // Note: grokClient is the OpenAI SDK instance with baseURL='https://api.x.ai/v1'
  // The streaming API is 100% identical to OpenAI's API
  const stream = await grokClient.chat.completions.create({
    model: GROK_MODEL,          // 'grok-3'
    messages,
    stream: true,
    temperature: 0.2,           // low temperature for code-focused, accurate answers
    max_tokens: 2000,
  })

  let fullAnswer = ''
  let totalTokens = 0

  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content ?? ''
    if (token) {
      fullAnswer += token
      streamCallback?.(token)
    }
    if (chunk.usage) {
      totalTokens = chunk.usage.total_tokens
    }
  }

  // Step 7 — Build citations
  const citations = searchResults
    .sort((a, b) => b.score - a.score)
    .map(result => ({
      filePath: result.filePath,
      startLine: result.startLine,
      endLine: result.endLine,
      language: result.language,
      snippet: result.content.slice(0, 200),
      score: result.score,
    }))
    // Deduplicate by filePath + startLine
    .filter((citation, index, arr) =>
      arr.findIndex(c => c.filePath === citation.filePath && c.startLine === citation.startLine) === index
    )

  return {
    answer: fullAnswer,
    citations,
    tokensUsed: totalTokens,
    retrievedChunks: searchResults.length,
  }
}
```

## Create /apps/api/src/routes/chat.routes.ts

All routes protected by requireAuth.

### POST /api/chat/query — SSE streaming endpoint

```typescript
router.post('/query', requireAuth, planGate('unlimited_messages'), async (req, res) => {
  const { repoId, question, sessionId, chatHistory = [] } = req.body

  if (!repoId || !question) return res.status(400).json({ error: 'repoId and question are required' })
  if (question.length > 2000) return res.status(400).json({ error: 'Question too long (max 2000 chars)' })

  // Verify ownership
  const user = await getUserFromClerkId(req.auth.userId)
  const repo = await prisma.repo.findFirst({ where: { id: repoId, userId: user.id } })
  if (!repo) return res.status(404).json({ error: 'Repository not found' })
  if (repo.status !== 'INDEXED') return res.status(400).json({ error: `Repository not ready (status: ${repo.status})` })

  // SSE headers — MUST set before any async work
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  try {
    // Get or create session
    let session = sessionId
      ? await prisma.chatSession.findFirst({ where: { id: sessionId, userId: user.id } })
      : null

    if (!session) {
      session = await prisma.chatSession.create({
        data: { userId: user.id, repoId, title: question.slice(0, 60) }
      })
      sendEvent('session', { sessionId: session.id })
    }

    // Save user message
    await prisma.message.create({
      data: { sessionId: session.id, role: 'USER', content: question }
    })

    // Run RAG with Grok streaming
    const result = await ragQuery({
      repoId,
      repoOwner: repo.githubOwner,
      repoName: repo.githubName,
      question,
      chatHistory,
      streamCallback: (token) => sendEvent('token', { token }),
    })

    // Save assistant message
    await prisma.message.create({
      data: {
        sessionId: session.id,
        role: 'ASSISTANT',
        content: result.answer,
        sourceCitations: result.citations,
      }
    })

    // Log usage
    await prisma.usageLog.create({
      data: { userId: user.id, action: 'chat_message', repoId, tokensUsed: result.tokensUsed }
    })

    sendEvent('done', {
      citations: result.citations,
      tokensUsed: result.tokensUsed,
      sessionId: session.id,
    })
    res.end()

  } catch (error: any) {
    sendEvent('error', { message: error.message ?? 'Unknown error' })
    res.end()
  }
})
```

### GET /api/chat/sessions
Returns sessions for the current user, ordered by updatedAt desc.
Include: id, title, repoId, repo { githubOwner, githubName }, createdAt, _count { messages }.

### GET /api/chat/sessions/:sessionId/messages
Verify ownership. Return all messages ordered by createdAt asc.
Include: id, role, content, sourceCitations, createdAt.

### DELETE /api/chat/sessions/:sessionId
Verify ownership. Delete session + messages (cascade). Return 204.

### Register routes in /apps/api/src/routes/index.ts:
```typescript
import chatRoutes from './chat.routes'
router.use('/chat', chatRoutes)
```

## Verification
1. No TypeScript errors
2. Create /apps/api/src/scripts/test-rag.ts:
   - Get a repoId that is status INDEXED from Prisma Studio
   - Call ragQuery with question: "What does this repository do? Give me an overview."
   - Pass streamCallback that process.stdout.write(token) — prints tokens as they arrive
   - After completion: log citations (file paths and line numbers)
   - Run: npx ts-node src/scripts/test-rag.ts
   - Should stream an answer character by character and show citations
3. Test the SSE endpoint with curl:
   ```bash
   # Get your Clerk token from browser DevTools Network tab (any API request Authorization header)
   curl -N -X POST http://localhost:4000/api/chat/query \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
     -d '{"repoId":"YOUR_REPO_ID","question":"What does this codebase do?"}'
   ```
   Should stream: event: session → many event: token → event: done
```

---

## PROMPT 5 — Streaming Chat UI
### (Run after Prompt 4 verification passes. Frontend only.)

```
We are building DevScope AI. The RAG engine is complete with Grok streaming via SSE. Now build the full chat interface.

## Install frontend packages
```bash
cd apps/web
npm install react-markdown remark-gfm rehype-highlight highlight.js
```

## Create /apps/web/src/hooks/useChat.ts

```typescript
'use client'
import { useState, useRef } from 'react'

interface Citation {
  filePath: string
  startLine: number
  endLine: number
  language: string
  snippet: string
  score: number
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  isStreaming?: boolean
  createdAt: Date
}

export function useChat(repoId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = async (question: string) => {
    if (!repoId || isStreaming || !question.trim()) return
    setError(null)

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: question, createdAt: new Date() }
    const assistantMsgId = crypto.randomUUID()
    const assistantMsg: ChatMessage = { id: assistantMsgId, role: 'assistant', content: '', isStreaming: true, createdAt: new Date() }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setIsStreaming(true)

    const chatHistory = messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
    abortRef.current = new AbortController()

    try {
      const token = await window.Clerk?.session?.getToken()
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ repoId, question, sessionId, chatHistory }),
        signal: abortRef.current.signal,
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error ?? 'Request failed')
      }

      // SSE parsing
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let currentEvent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))

            if (currentEvent === 'session') {
              setSessionId(data.sessionId)
            } else if (currentEvent === 'token') {
              setMessages(prev => prev.map(m =>
                m.id === assistantMsgId
                  ? { ...m, content: m.content + data.token }
                  : m
              ))
            } else if (currentEvent === 'done') {
              setMessages(prev => prev.map(m =>
                m.id === assistantMsgId
                  ? { ...m, isStreaming: false, citations: data.citations }
                  : m
              ))
              setSessionId(data.sessionId)
            } else if (currentEvent === 'error') {
              throw new Error(data.message)
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User cancelled — mark assistant message as not streaming
        setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, isStreaming: false } : m))
        return
      }
      setError(err.message ?? 'Something went wrong')
      setMessages(prev => prev.filter(m => m.id !== assistantMsgId))
    } finally {
      setIsStreaming(false)
    }
  }

  const stopStreaming = () => {
    abortRef.current?.abort()
    setIsStreaming(false)
  }

  const clearChat = () => {
    setMessages([])
    setSessionId(null)
    setError(null)
  }

  const loadSession = async (sid: string) => {
    try {
      const token = await window.Clerk?.session?.getToken()
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/sessions/${sid}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setMessages(data.map((m: any) => ({
        id: m.id,
        role: m.role.toLowerCase() as 'user' | 'assistant',
        content: m.content,
        citations: m.sourceCitations,
        isStreaming: false,
        createdAt: new Date(m.createdAt),
      })))
      setSessionId(sid)
    } catch (e) {
      console.error('Failed to load session:', e)
    }
  }

  return { messages, isStreaming, error, sessionId, sendMessage, stopStreaming, clearChat, loadSession }
}
```

## Build the Chat page at /apps/web/src/app/(dashboard)/dashboard/chat/page.tsx

Replace the placeholder EmptyState from Week 2 with the full two-panel chat layout.
This is a 'use client' component.

useSetPageTitle("AI Chat")

State:
- selectedRepoId: string | null
- Use useRepos() to get repos — filter to only status === 'INDEXED'

Layout (full height, negates parent padding):
```tsx
<div className="flex h-full -m-6 overflow-hidden">
  <ChatSidebar
    repos={indexedRepos}
    selectedRepoId={selectedRepoId}
    onSelectRepo={setSelectedRepoId}
    sessionId={chat.sessionId}
    onSelectSession={chat.loadSession}
    onNewChat={chat.clearChat}
  />
  <ChatMain
    repoId={selectedRepoId}
    repo={indexedRepos.find(r => r.id === selectedRepoId)}
    chat={chat}
  />
</div>
```

## Create /apps/web/src/components/chat/ChatSidebar.tsx
Width: 260px, border-right, flex col, h-full.

Top section — Repositories:
- Label "Repositories" (text-xs uppercase muted)
- List of indexed repos as buttons:
  - Each shows: "{owner}/{name}" in font-mono text-sm
  - Active: bg-brand-light border-l-2 border-brand
  - Inactive: hover:bg-accent text-muted-foreground
  - If empty: "No indexed repos yet. →" link to /dashboard/repos

Middle section — Chat Sessions (flex-1, overflow-y-auto):
- "New Chat" button at top (PlusCircle icon, outline variant, small, full width)
- "Recent Chats" label
- Fetch GET /api/chat/sessions on mount and when selectedRepoId changes
- Filter sessions by selectedRepoId
- Each session: title (truncated 45 chars) + relative time
- Clicking: calls onSelectSession(session.id)
- Active session: highlighted with bg-accent

## Create /apps/web/src/components/chat/ChatMain.tsx
Flex-1, flex col, h-full, overflow-hidden.

### ChatHeader (border-bottom, px-4 py-3, flex items-center justify-between):
- Left: repo name in font-mono (or "Select a repository" if none selected)
- Right: Trash2 icon button → calls chat.clearChat()

### MessageList (flex-1, overflow-y-auto, p-4):
Import and apply highlight.js CSS in globals.css:
```css
@import 'highlight.js/styles/github-dark.css';
```

If no messages and no repo selected: EmptyState (MessageSquare icon, "Ask anything about your code", "Select a repository from the left, then type your question below")

If no messages but repo selected: Suggested questions panel:
- "Try asking..." heading
- 4 chip buttons (rounded-full, border, hover:bg-accent, text-sm, px-3 py-1.5):
  - "Give me an overview of this codebase"
  - "What are the main components or modules?"
  - "How does authentication work?"
  - "What are the API endpoints?"
- Clicking any chip calls chat.sendMessage(chipText)

Render messages: map over chat.messages, each rendered with <ChatMessage />
Auto-scroll: attach a ref to a div after the last message, call ref.current.scrollIntoView() in useEffect when messages changes.

Error display: if chat.error, show a red Alert above the input:
```tsx
<Alert variant="destructive">
  <AlertDescription>{chat.error}</AlertDescription>
</Alert>
```

### ChatInput (border-top, p-4):
```tsx
<div className="flex gap-2 items-end">
  <Textarea
    placeholder={selectedRepoId ? "Ask a question about your code..." : "Select a repository first"}
    className="flex-1 min-h-[44px] max-h-[200px] resize-none"
    value={input}
    onChange={e => setInput(e.target.value)}
    onKeyDown={e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (input.trim()) { chat.sendMessage(input.trim()); setInput('') }
      }
    }}
    disabled={!selectedRepoId || chat.isStreaming}
  />
  {chat.isStreaming ? (
    <Button variant="outline" size="icon" onClick={chat.stopStreaming} title="Stop">
      <Square className="h-4 w-4 fill-current" />
    </Button>
  ) : (
    <Button
      size="icon"
      onClick={() => { if (input.trim()) { chat.sendMessage(input.trim()); setInput('') } }}
      disabled={!input.trim() || !selectedRepoId}
    >
      <Send className="h-4 w-4" />
    </Button>
  )}
</div>
<p className="text-xs text-muted-foreground mt-1 pl-1">
  Enter to send · Shift+Enter for new line · Powered by Grok + Voyage AI
</p>
```

## Create /apps/web/src/components/chat/ChatMessage.tsx

User message:
- justify-end, max-w-[70%], bg-brand text-white rounded-2xl rounded-tr-sm px-4 py-2.5
- Plain text (no markdown rendering needed for user messages)

Assistant message:
- justify-start, w-full, flex gap-3
- Left: small DS avatar (24px purple square, same as Logo but smaller)
- Right: full flex-1 content area

Assistant content renders with ReactMarkdown:
```tsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  rehypePlugins={[rehypeHighlight]}
  components={{
    code({ node, inline, className, children }) {
      if (inline) {
        return <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono">{children}</code>
      }
      return <CodeBlock className={className}>{children}</CodeBlock>
    }
  }}
>
  {message.content}
</ReactMarkdown>
```

If message.isStreaming and message.content is empty:
Show thinking indicator:
```tsx
<div className="flex gap-1 items-center py-2">
  <span className="text-xs text-muted-foreground">Grok is thinking</span>
  {[0,1,2].map(i => (
    <div key={i} className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce"
      style={{ animationDelay: `${i * 150}ms` }} />
  ))}
</div>
```

If message.isStreaming and message.content has text:
Append a blinking cursor:
```tsx
<span className="inline-block w-0.5 h-4 bg-brand ml-0.5 animate-pulse" />
```

After content: render <CitationList citations={message.citations} /> if citations exist and length > 0.

## Create /apps/web/src/components/chat/CodeBlock.tsx

```tsx
'use client'
export function CodeBlock({ className, children }: { className?: string, children: React.ReactNode }) {
  const [copied, setCopied] = useState(false)
  const language = className?.replace('language-', '') ?? 'code'
  const codeString = String(children).replace(/\n$/, '')

  const copy = async () => {
    await navigator.clipboard.writeText(codeString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden border">
      <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-800 border-b border-zinc-700">
        <span className="text-xs text-zinc-400 font-mono">{language}</span>
        <button onClick={copy} className="text-xs text-zinc-400 hover:text-white transition-colors">
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 bg-zinc-900 text-sm">
        <code className={className}>{children}</code>
      </pre>
    </div>
  )
}
```

## Create /apps/web/src/components/chat/CitationList.tsx

```tsx
'use client'
export function CitationList({ citations, repoOwner, repoName }: {
  citations: Citation[]
  repoOwner?: string
  repoName?: string
}) {
  const [expanded, setExpanded] = useState(false)
  if (!citations?.length) return null

  return (
    <div className="mt-3 border-t pt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Paperclip className="h-3 w-3" />
        {citations.length} source{citations.length > 1 ? 's' : ''} referenced
        <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {citations.map((c, i) => {
            const githubUrl = repoOwner && repoName
              ? `https://github.com/${repoOwner}/${repoName}/blob/main/${c.filePath}#L${c.startLine}-L${c.endLine}`
              : '#'
            const scoreColor = c.score > 0.8 ? 'bg-green-500' : c.score > 0.6 ? 'bg-yellow-500' : 'bg-orange-500'

            return (
              <div key={i} className="rounded-md border bg-muted/50 p-3 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <a href={githubUrl} target="_blank" rel="noopener noreferrer"
                    className="font-mono text-brand hover:underline flex items-center gap-1">
                    {c.filePath}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <span className="text-muted-foreground">L{c.startLine}–{c.endLine}</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${scoreColor} rounded-full`} style={{ width: `${c.score * 100}%` }} />
                  </div>
                  <span className="text-muted-foreground">{(c.score * 100).toFixed(0)}% match</span>
                </div>
                <code className="block bg-muted rounded p-2 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
                  {c.snippet.slice(0, 150)}{c.snippet.length > 150 ? '...' : ''}
                </code>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

Import Paperclip, ChevronDown, ExternalLink from lucide-react.

Pass repoOwner and repoName to CitationList from ChatMessage — thread them down from the repo object.

## Verification
1. /dashboard/chat renders the two-panel layout
2. Select an indexed repo from the sidebar — it highlights
3. Click a suggested question chip — it sends the message
4. User message appears immediately (right-aligned, purple)
5. "Grok is thinking" dots appear
6. Answer streams in token by token
7. Code blocks render with syntax highlighting and copy button
8. "N sources referenced" button appears below the answer
9. Expanding citations shows file paths, line ranges, match % bars, and snippets
10. GitHub links in citations open the correct file+line on GitHub
11. Stop button halts streaming mid-response
12. Shift+Enter adds a new line without sending
13. Session loads from sidebar after page refresh
14. Footer shows "Powered by Grok + Voyage AI"
15. No TypeScript errors

## Complete Week 3 verification — run this full flow:
[ ] Add https://github.com/expressjs/express via the repos UI
[ ] Watch: Pending → Indexing → Ready (with file/chunk counts shown on card)
[ ] Navigate to AI Chat, select the express repo
[ ] Ask: "Give me an overview of this codebase"
[ ] Grok streams a detailed answer with citations
[ ] Ask: "How does routing work in Express?"
[ ] See follow-up answer using chat history context
[ ] Expand citations — see real Express.js file paths with line numbers
[ ] Click a citation GitHub link — opens the correct file
[ ] Refresh page — session visible in sidebar, click to reload
[ ] Check BullBoard at http://localhost:4000/admin/queues
[ ] Check Prisma Studio — messages saved with sourceCitations JSON

Commit: "feat: complete Week 3 — repo ingestion, Voyage AI embeddings, Grok RAG engine, streaming chat UI"
```

---

## TIPS FOR WEEK 3

**Voyage AI free tier:**
- 50M free tokens — at ~500 tokens per chunk average, this lets you index ~100,000 chunks for free
- You will never hit this limit during development
- Dashboard: dash.voyageai.com — shows usage in real time

**Grok API free credits:**
- $25 on signup at console.x.ai
- grok-3 costs roughly $0.003 per 1K input tokens, $0.015 per 1K output tokens
- Each chat message costs ~$0.02–0.08 depending on codebase size and answer length
- $25 = hundreds of chat messages — plenty for development and demo

**If faiss-node fails to build:**
- The pure JS fallback works fine for repos up to ~5000 chunks
- Switch by setting `faissAvailable = false` at the top of vectorStore.service.ts
- Or install: `npm install hnswlib-node` as a third option

**VECTOR_STORE_PATH on disk:**
- Path: apps/api/vector_stores/{repoId}/
- The repoId is a cuid() like "clzxy123abc..." — one folder per repo
- In production (Railway): mount a persistent disk volume at this path

**SSE streaming debugging:**
- Always set res.flushHeaders() before any async work
- Test with curl before the browser (shown in Prompt 4)
- If tokens arrive all at once instead of streaming: check X-Accel-Buffering header

**Small repos to test with (free, fast to index):**
- https://github.com/sindresorhus/is — 30 files, indexes in ~10 seconds
- https://github.com/expressjs/express — ~80 files, indexes in ~20 seconds
- https://github.com/fastify/fastify — ~150 files, good for testing larger repos

**Week 4 preview:**
Week 4 builds: Auto Doc Generator, PR Review Bot, Complexity Scorer, and the landing page.
All three AI features reuse the exact same RAG service and Grok streaming pattern from this week.
```
