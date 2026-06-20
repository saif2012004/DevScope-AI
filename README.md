# DevScope AI

Chat with any GitHub repository, generate documentation, review pull requests, and score task complexity — all backed by a RAG pipeline over the repo's own code.

DevScope AI is a TypeScript monorepo that indexes a GitHub repository (chunk → embed → store) and then lets the user query that index through four LLM-powered features:

1. **Chat** — streaming Q&A grounded in the repo's code, with file citations.
2. **Documentation generator** — produces a six-section technical doc for the indexed repo.
3. **PR reviewer** — analyzes a pull request against the indexed codebase and returns a verdict, summary, and issue list.
4. **Complexity scorer** — given a natural-language task description, estimates effort score, hour range, affected files, and risks.

The product is structured as a SaaS with Clerk auth and Stripe-backed Free / Pro plans.

---

## Architecture

```
┌──────────────┐   GitHub URL    ┌─────────────────┐
│  Next.js 16  │ ──────────────► │  Express API    │
│  (apps/web)  │ ◄────────────── │  (apps/api)     │
│              │  REST + SSE     │                 │
└──────────────┘                 │  ┌───────────┐  │
                                 │  │  BullMQ   │──┼──► Ingestion worker
                                 │  │  + Redis  │  │      ├─ fetch files
                                 │  └───────────┘  │      ├─ chunk
                                 │                 │      ├─ Voyage embed
                                 │  Prisma         │      └─ write Faiss store
                                 └────────┬────────┘
                                          │
                          ┌───────────────┼───────────────────┐
                          ▼               ▼                   ▼
                    ┌──────────┐   ┌──────────────┐   ┌─────────────────┐
                    │PostgreSQL│   │ Faiss index  │   │ Voyage AI       │
                    │  15      │   │ per repo on  │   │ (embeddings)    │
                    │          │   │ disk         │   │ + Groq          │
                    └──────────┘   └──────────────┘   │ (llama-3.3-70b) │
                                                     └─────────────────┘
```

**Request path for a chat message:**
`question → embed (Voyage) → search Faiss for top-K=8 chunks → build prompt with code context → stream completion from Groq → persist message + citations + usage log`

---

## Tech stack

| Layer | Choice |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui (Radix), TanStack Query, Axios, react-markdown + rehype-highlight, motion, sonner |
| **Auth (web + api)** | Clerk (`@clerk/nextjs`, `@clerk/express`) |
| **Backend** | Express 4, TypeScript, Helmet, CORS, Morgan, express-rate-limit |
| **Data** | PostgreSQL 15 via Prisma 5 (`packages/db`), Redis 7 via ioredis, BullMQ for job queue |
| **LLM** | Groq `llama-3.3-70b-versatile` (called via OpenAI-compatible SDK at `https://api.groq.com/openai/v1`) |
| **Embeddings** | Voyage AI `voyage-code-3` (1024-dim) |
| **Vector store** | `faiss-node` (`IndexFlatL2`), persisted per-repo on disk under `apps/api/vector_stores/<repoId>/` |
| **Payments** | Stripe Checkout + Customer Portal, webhook-driven plan updates |
| **Infra (local)** | Docker Compose (Postgres + Redis) |
| **Workspaces** | npm workspaces (`apps/*`, `packages/*`) |

---

## Project structure

```
apps/
  api/                          Express backend (port 4000)
    src/
      controllers/              HTTP handlers (auth, repos, chat, docs, pr-review, complexity, billing)
      routes/                   Express routers — mounted under /api
      services/
        chunker.service.ts      Splits source files into code chunks
        embedder.service.ts     Voyage + Groq clients, rate-limit gates, retry logic
        vectorStore.service.ts  Faiss wrapper (load / add / search / save)
        ingestion.queue.ts      BullMQ producer
        ingestion.worker.ts     BullMQ consumer (runs embedding pipeline)
        docGenerator.service.ts Six-section repo doc pipeline
        prReviewer.service.ts   PR-against-repo review pipeline
        complexityScorer.service.ts  Effort scoring pipeline
        githubPR.service.ts     GitHub PR fetch helpers
      middleware/
        requireAuth.ts          Clerk-based auth guard
        planGate.ts             FREE = 1 repo / 50 chat msgs per UTC month; PRO = unlimited
        rateLimiter.ts          Global rate limiter
        errorHandler.ts         Centralised error responses
      lib/                      Prisma client, GitHub helpers, Stripe client
      scripts/
        test-groq.ts            Smoke test — confirms Groq API key/model work
        eval-chat.ts            RAG eval harness — see "Eval harness" below
        eval-cases.json         Test cases for the harness
        test-github.ts          Manual GitHub fetch test
        test-chunker.ts         Manual chunker test
      tests/                    Jest unit tests
      vector_stores/<repoId>/   Faiss index + chunk metadata (created at runtime)
    .env.example                Required env vars

  web/                          Next.js 16 frontend (port 3000)
    src/
      app/
        (auth)/                 Sign-in / sign-up (Clerk)
        (dashboard)/dashboard/
          page.tsx              Overview + stats
          repos/                Repo CRUD
          chat/                 Streaming RAG chat UI
          docs/                 Doc generator UI
          pr-review/            PR review UI
          complexity/           Task-complexity UI
          billing/              Stripe checkout / portal entry
          settings/             Account settings
        page.tsx                Landing page
        layout.tsx              Root layout
      components/               shadcn/ui + custom components
      hooks/, lib/, providers/, context/, types/
      proxy.ts                  Forwards Clerk-signed requests to the API
    .env.local                  Required env vars

packages/
  db/
    prisma/schema.prisma        Single source of truth for the data model
    generated/client/           Generated Prisma client (re-exported as `@devscope/db`)

docker-compose.yml              Postgres + Redis (default profile), plus full-stack profile
docker-compose.dev.yml          Alternative dev compose
FUTURE_WORK.md                  Tracked deferred work
```

---

## Data model (Prisma)

| Model | Purpose |
|---|---|
| `User` | Clerk-mirrored user, plan (`FREE` / `PRO`), Stripe customer + subscription IDs |
| `Repo` | A linked GitHub repo; tracks `status` (`PENDING` → `INDEXING` → `INDEXED` / `FAILED`), chunk + file counts |
| `ChatSession` / `Message` | Chat history. Messages store `sourceCitations` JSON with file path, language, line range |
| `UsageLog` | Per-action audit + monthly quota counter (chat messages, doc gen, etc.) |
| `GeneratedDoc` | Latest generated doc per repo (one-to-one) |
| `PrReview` | History of PR reviews — verdict, summary, full markdown, issue count |
| `ComplexityScore` | History of complexity scores — effort score + label, hour range, file/risk counts, full JSON result |

---

## API surface

All routes are mounted under `/api`. Auth is via Clerk session JWT in the request (handled by `clerkMiddleware` + `requireAuth`).

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Liveness + DB ping |
| POST | `/api/auth/sync` | Upsert the Clerk user into Postgres |
| GET | `/api/auth/me` | Current user profile + plan |
| GET | `/api/auth/usage` | Current-month usage counters |
| GET | `/api/auth/activity` | Recent activity log |
| GET, POST | `/api/repos` | List / create (enqueues ingestion) |
| GET, DELETE | `/api/repos/:repoId` | Get / delete |
| POST | `/api/chat/sessions` | Create a chat session |
| GET | `/api/chat/sessions` | List sessions (optionally filtered by `repoId`) |
| GET | `/api/chat/sessions/:id/messages` | Message history |
| DELETE | `/api/chat/sessions/:id` | Delete session |
| POST | `/api/chat/query` | Streaming SSE chat response |
| POST | `/api/docs/generate` | Generate the six-section doc |
| GET | `/api/docs/:repoId` | Fetch latest doc |
| GET | `/api/docs/:repoId/download` | Download as markdown |
| POST | `/api/pr-review/analyze` | Run PR review (takes repo + PR URL/number) |
| GET | `/api/pr-review/:repoId` | List reviews for a repo |
| POST | `/api/complexity/score` | Score a task description (10-1000 chars) |
| GET | `/api/complexity/:repoId` | List scores for a repo |
| POST | `/api/billing/create-checkout-session` | Stripe Checkout for PRO upgrade |
| POST | `/api/billing/create-portal-session` | Stripe Customer Portal |
| GET | `/api/billing/subscription-status` | Current subscription status |
| POST | `/api/webhooks/stripe` | Stripe webhook (raw body) |

**Plan gating** (`apps/api/src/middleware/planGate.ts`):
- `FREE`: max 1 repo, max 50 chat messages per UTC month
- `PRO`: unlimited (gate short-circuits)

There's also a BullBoard admin UI at `http://localhost:4000/admin/queues` for inspecting the ingestion queue.

---

## Prerequisites

- **Node.js 18+** (the API uses Node-only globals; `@types/node` is `^22.10.5`)
- **Docker** (for Postgres + Redis)
- **API keys:**
  - [Clerk](https://dashboard.clerk.com) — backend secret + frontend publishable
  - [Stripe](https://dashboard.stripe.com) — secret key, webhook signing secret, Pro price ID
  - [Groq](https://console.groq.com/keys) — for LLM completions
  - [Voyage AI](https://dashboard.voyageai.com) — for embeddings
  - [GitHub Personal Access Token](https://github.com/settings/tokens) (optional but recommended — raises GitHub API rate limits)

---

## Setup

```bash
# 1. Install everything (npm workspaces)
npm install

# 2. Boot Postgres + Redis
npm run db:up

# 3. Apply Prisma schema
npm run db:push
```

Create the two env files using the provided examples:

```bash
cp apps/api/.env.example apps/api/.env
# apps/web/.env.local — see the variable list below
```

**`apps/api/.env`** (see `apps/api/.env.example` for the live list):

```
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

DATABASE_URL=postgresql://devscope:devscope@localhost:5433/devscope_db
REDIS_URL=redis://localhost:6379

CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...

GROQ_API_KEY=gsk_...
VOYAGE_API_KEY=pa-...

GITHUB_TOKEN=                 # optional
```

**`apps/web/.env.local`** (typical values):

```
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## Development

Run both apps together (concurrent, colour-coded):

```bash
npm run dev
```

Or separately:

```bash
npm run dev:web   # http://localhost:3000
npm run dev:api   # http://localhost:4000
```

Database tooling:

```bash
npm run db:push     # apply schema changes
npm run db:studio   # Prisma Studio
npm run db:up       # start Postgres + Redis containers
npm run db:down     # stop them
```

Full-stack containers (API + Web + Postgres + Redis):

```bash
npm run docker:up:all
npm run docker:down
```

---

## Eval harness

The RAG pipeline is tested by a self-contained harness at `apps/api/src/scripts/eval-chat.ts`. It bypasses HTTP and auth, calls the embed → retrieve → Groq pipeline directly, and grades responses against a JSON case file.

```bash
cd apps/api

# Run the whole suite
npx ts-node src/scripts/eval-chat.ts

# Run one case
npx ts-node src/scripts/eval-chat.ts --case nlp-02-sentiment-lib

# Verbose (prints full answers and citations)
npx ts-node src/scripts/eval-chat.ts --verbose
```

Each case in `eval-cases.json` supports four rubric primitives:

- `mustContain` — every substring must appear (case-insensitive)
- `mustContainAny` — at least one substring must appear (use for grounded-refusal phrasing)
- `mustNotContain` — none may appear (use to forbid hallucinations)
- `mustCite` — file paths that must be among the retrieved chunks

Exit code is `0` if all pass, `1` if any fail — wire it into CI when ready.

There's also a `test-groq.ts` smoke script that does a one-shot Groq call to verify the API key + model.

---

## Plans and billing

| Plan | Repos | Chat messages / month | Source of truth |
|---|---|---|---|
| `FREE` | 1 | 50 | `planGate.ts` |
| `PRO` | unlimited | unlimited | Stripe subscription via webhook |

Plan upgrades flow: user hits `POST /api/billing/create-checkout-session` → Stripe Checkout → on success Stripe calls `POST /api/webhooks/stripe` (raw body, signature-verified) → API flips `User.plan = PRO` and stores subscription state. Portal management goes through `/api/billing/create-portal-session`.

---

## Rate-limit notes

Both Voyage and Groq are wrapped by serialized rate-limit gates in `embedder.service.ts` to prevent burst 429s:

- **Voyage** — 22s minimum spacing (free tier is 3 RPM / 10K TPM)
- **Groq** — 2.5s minimum spacing on `llama-3.3-70b-versatile` (free tier is 30 RPM / 12K TPM / 1,000 RPD)

The Voyage gate dominates user-visible latency on the free tier. The `FUTURE_WORK.md` file tracks this as the highest-impact UX bottleneck.

---

## Roadmap

Tracked in [`FUTURE_WORK.md`](./FUTURE_WORK.md). Current top items:

- Expand the eval harness to 25-30 cases across multiple repos and wire it into CI.
- Render `Message.sourceCitations` as clickable file references in the chat UI.
- Upgrade Voyage to paid tier (or switch to a self-hosted embedder) to remove the 22s gate.
- Add LLM-as-judge grading for subjective answers.

---

## License

Private / unpublished.
