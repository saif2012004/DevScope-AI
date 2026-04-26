# DevScope AI — Week 1 Cursor Prompts
# Use these IN ORDER. Complete each one before starting the next.
# Do not combine prompts — Cursor needs to finish and stabilize each step first.

---

## PROMPT 1 — Project Initialization
### (Run this first, in a brand new empty folder)

```
Create a new full-stack web application called "DevScope AI" with the following exact structure and tech stack.

## Project structure
Create a monorepo with two workspaces:
- /apps/web — Next.js 14 frontend
- /apps/api — Node.js + Express backend
- /packages/db — Prisma schema and client (shared)

Root-level files:
- package.json with workspaces: ["apps/*", "packages/*"]
- .gitignore (Node, Next.js, .env files)
- docker-compose.yml (see below)
- README.md with project overview

## Frontend — /apps/web
Initialize with: Next.js 14, App Router, TypeScript, Tailwind CSS, ESLint.
Install these additional packages:
- shadcn/ui (run: npx shadcn@latest init — choose Default style, Slate base color, CSS variables: yes)
- @tanstack/react-query
- axios
- clsx
- lucide-react

Create this folder structure inside /apps/web/src:
- app/ (App Router pages)
  - layout.tsx (root layout with Providers wrapper)
  - page.tsx (landing page — just an <h1>DevScope AI</h1> for now)
  - (auth)/ — route group for auth pages
  - (dashboard)/ — route group for protected pages
- components/
  - ui/ (shadcn components go here)
  - shared/ (our custom shared components)
- lib/
  - api.ts (axios instance pointing to NEXT_PUBLIC_API_URL)
  - utils.ts (cn() utility from shadcn)
- providers/
  - QueryProvider.tsx (React Query provider)
- types/
  - index.ts (shared TypeScript types)

Create a .env.local file with these keys (values empty, just keys):
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

## Backend — /apps/api
Initialize a Node.js + Express project with TypeScript.
Install these packages:
- express
- cors
- helmet
- dotenv
- express-rate-limit
- morgan
- @clerk/express (Clerk backend SDK)
- stripe
- ioredis
- @prisma/client
Dev dependencies: typescript, ts-node, nodemon, @types/express, @types/cors, @types/morgan, @types/node, prisma

Create this folder structure inside /apps/api/src:
- index.ts (entry point — Express app setup)
- routes/
  - index.ts (router aggregator)
  - auth.routes.ts (placeholder)
  - repos.routes.ts (placeholder)
  - billing.routes.ts (placeholder)
- middleware/
  - requireAuth.ts (Clerk JWT verification middleware — placeholder for now)
  - rateLimiter.ts (express-rate-limit setup: 100 req/15min globally, 20 req/min for AI routes)
  - errorHandler.ts (global error handler middleware)
- controllers/
  - auth.controller.ts (placeholder)
  - repos.controller.ts (placeholder)
  - billing.controller.ts (placeholder)
- services/
  - redis.service.ts (ioredis client singleton)
- lib/
  - prisma.ts (Prisma client singleton)
  - stripe.ts (Stripe client singleton)
- types/
  - express.d.ts (extend Express Request to include auth user)

Create a .env file with these keys (values empty):
PORT=4000
DATABASE_URL=postgresql://devscope:devscope@localhost:5432/devscope_db
REDIS_URL=redis://localhost:6379
CLERK_SECRET_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
OPENAI_API_KEY=
FRONTEND_URL=http://localhost:3000

## Shared DB package — /packages/db
Initialize with Prisma. Create prisma/schema.prisma with just the datasource and generator blocks for now (no models yet — we add those in the next step):

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
  output   = "../generated/client"
}

## docker-compose.yml (root level)
Create a docker-compose.yml that spins up:
1. PostgreSQL 15 container:
   - image: postgres:15-alpine
   - container_name: devscope_postgres
   - environment: POSTGRES_USER=devscope, POSTGRES_PASSWORD=devscope, POSTGRES_DB=devscope_db
   - port: 5432:5432
   - volume: postgres_data:/var/lib/postgresql/data

2. Redis 7 container:
   - image: redis:7-alpine
   - container_name: devscope_redis
   - port: 6379:6379
   - volume: redis_data:/data

3. Named volumes: postgres_data, redis_data

## Root package.json scripts
Add these scripts to the root package.json:
- "dev": runs both web and api concurrently (use concurrently package)
- "dev:web": cd apps/web && npm run dev
- "dev:api": cd apps/api && npm run dev
- "db:push": cd packages/db && npx prisma db push
- "db:studio": cd packages/db && npx prisma studio
- "docker:up": docker-compose up -d
- "docker:down": docker-compose down

Install concurrently at root level.

## tsconfig.json
Create a root tsconfig.json with strict mode enabled. Each app should extend it.

## Final check
After creating everything, verify:
1. /apps/web runs with `npm run dev:web` (Next.js starts on port 3000)
2. /apps/api runs with `npm run dev:api` (Express starts on port 4000, logs "DevScope API running on port 4000")
3. Docker services start with `npm run docker:up`
4. No TypeScript errors in either app

Do NOT install Clerk or Stripe UI components yet — those come in later prompts.
Do NOT create any pages, UI, or API logic yet beyond what is specified above.
```

---

## PROMPT 2 — Database Schema + Prisma Setup
### (Run after Prompt 1 is complete and Docker is running)

```
We are building DevScope AI, a SaaS platform where developers connect GitHub repos and get AI-powered insights. The backend uses Node.js + Express + Prisma + PostgreSQL.

Add the complete Prisma database schema to /packages/db/prisma/schema.prisma. Here are all the models we need:

## Models

### User
Fields:
- id: String @id @default(cuid())
- clerkId: String @unique (this is Clerk's user ID — our external auth identifier)
- email: String @unique
- name: String?
- avatarUrl: String?
- plan: PlanType @default(FREE) (enum: FREE, PRO)
- stripeCustomerId: String? @unique
- stripeSubscriptionId: String? @unique
- subscriptionStatus: SubscriptionStatus @default(INACTIVE) (enum: INACTIVE, ACTIVE, PAST_DUE, CANCELLED)
- createdAt: DateTime @default(now())
- updatedAt: DateTime @updatedAt
- repos: Repo[] (relation)
- chatSessions: ChatSession[] (relation)

### Repo
Fields:
- id: String @id @default(cuid())
- userId: String (foreign key to User)
- user: User @relation(...)
- githubUrl: String
- githubOwner: String (e.g. "facebook")
- githubName: String (e.g. "react")
- defaultBranch: String @default("main")
- isPrivate: Boolean @default(false)
- status: RepoStatus @default(PENDING) (enum: PENDING, INDEXING, INDEXED, FAILED)
- indexedAt: DateTime?
- totalChunks: Int @default(0)
- totalFiles: Int @default(0)
- errorMessage: String?
- createdAt: DateTime @default(now())
- updatedAt: DateTime @updatedAt
- chatSessions: ChatSession[] (relation)
Add a @@unique([userId, githubUrl]) constraint — one user can't add same repo twice.

### ChatSession
Fields:
- id: String @id @default(cuid())
- userId: String (foreign key to User)
- user: User @relation(...)
- repoId: String (foreign key to Repo)
- repo: Repo @relation(...)
- title: String @default("New Chat")
- createdAt: DateTime @default(now())
- updatedAt: DateTime @updatedAt
- messages: Message[] (relation)

### Message
Fields:
- id: String @id @default(cuid())
- sessionId: String (foreign key to ChatSession)
- session: ChatSession @relation(...)
- role: MessageRole (enum: USER, ASSISTANT)
- content: String @db.Text
- sourceCitations: Json? (stores array of {file, line, snippet} objects)
- createdAt: DateTime @default(now())

### UsageLog
Fields:
- id: String @id @default(cuid())
- userId: String (foreign key to User, no back-relation needed)
- action: String (e.g. "chat_message", "doc_generate", "pr_review")
- repoId: String? (optional)
- tokensUsed: Int @default(0)
- createdAt: DateTime @default(now())
Add @@index([userId, createdAt]) for efficient usage queries.

## After writing the schema:
1. Run `npx prisma generate` inside /packages/db to generate the client
2. Run `npx prisma db push` to push the schema to the running PostgreSQL container
3. In /apps/api/src/lib/prisma.ts, create the Prisma client singleton properly:
   - Import from the generated path (@devscope/db or the relative path, whichever works in the monorepo)
   - Use the global singleton pattern to avoid multiple instances in development (check if global.prisma exists)
4. Create a seed script at /packages/db/prisma/seed.ts that creates one test user with:
   - clerkId: "test_clerk_id"
   - email: "test@devscope.ai"
   - name: "Test User"
   - plan: FREE
   Add "prisma": { "seed": "ts-node prisma/seed.ts" } to packages/db/package.json
5. Run the seed: `npx prisma db seed`
6. Verify with Prisma Studio (`npm run db:studio`) that all tables exist and the seed data is there

Do NOT create any API routes or controllers yet.
```

---

## PROMPT 3 — Clerk Authentication (Backend + Frontend)
### (Run after Prompt 2 is complete)

```
We are building DevScope AI. We have a Next.js 14 frontend at /apps/web and a Node.js + Express backend at /apps/api. We use Clerk for authentication.

I will provide my actual Clerk keys when I set up the Clerk dashboard. For now, use placeholder values in .env files. Build the complete auth system so it works the moment I drop in real keys.

## Backend — Clerk JWT Verification

In /apps/api/src/middleware/requireAuth.ts:
- Use @clerk/express to verify the Clerk session JWT on incoming requests
- Extract the userId (Clerk's user ID) from the verified token
- Attach it to req.auth = { userId: clerkId }
- If verification fails (no token, invalid token, expired), return 401 JSON: { error: "Unauthorized" }
- Export the middleware as `requireAuth`

In /apps/api/src/routes/auth.routes.ts, create these endpoints:

POST /api/auth/sync
- Protected by requireAuth middleware
- This is called by the frontend after a user signs in or signs up in Clerk
- It receives: { clerkId, email, name, avatarUrl } from the request body
- Logic: upsert the user in our PostgreSQL database using Prisma:
  - If user with this clerkId exists → update their email/name/avatarUrl
  - If user does not exist → create new user with plan: FREE
- Return the user object (without stripeCustomerId or stripeSubscriptionId)

GET /api/auth/me
- Protected by requireAuth middleware
- Look up the current user in DB by their clerkId (from req.auth.userId)
- Return full user profile including plan, subscriptionStatus, repo count
- If user not found in DB, return 404 (this means /sync was never called)

## Frontend — Clerk Provider + Auth Flow

Install in /apps/web:
- @clerk/nextjs

In /apps/web/src/app/layout.tsx:
- Wrap the entire app in <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
- ClerkProvider must be the outermost wrapper, outside QueryProvider

Create /apps/web/src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:
- Render Clerk's <SignIn /> component centered on the page
- Use routing="path" path="/sign-in"
- afterSignInUrl="/dashboard"
- signUpUrl="/sign-up"

Create /apps/web/src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:
- Render Clerk's <SignUp /> component centered on the page
- Use routing="path" path="/sign-up"
- afterSignUpUrl="/dashboard"
- signInUrl="/sign-in"

Create /apps/web/src/middleware.ts (Next.js middleware):
- Use Clerk's clerkMiddleware() from @clerk/nextjs/server
- Protect these routes: /dashboard and everything under /dashboard/*
- Public routes: /, /sign-in, /sign-up, /api/webhooks/*
- If an unauthenticated user hits a protected route, redirect to /sign-in
- If an authenticated user hits / redirect to /dashboard

Create /apps/web/src/hooks/useAuthSync.ts:
- A custom hook that runs once after the user signs in
- Uses Clerk's useAuth() to get the userId and getToken()
- Uses Clerk's useUser() to get name, email, imageUrl
- On mount (when userId is available), calls POST /api/auth/sync with the user's data and the Bearer token
- Stores the result in React Query cache under the key ['currentUser']
- Handles loading and error states

Create /apps/web/src/app/(dashboard)/layout.tsx:
- This is the layout for all dashboard pages
- Use Clerk's auth() to verify the user is authenticated server-side
- If not authenticated, redirect to /sign-in
- Call useAuthSync hook to sync user with our backend on first load
- Render a basic sidebar layout shell (just structure, no real UI yet):
  - Left sidebar: 240px wide, shows "DevScope AI" logo text and "Dashboard" link
  - Main content area: flex-1, renders {children}

Create /apps/web/src/app/(dashboard)/dashboard/page.tsx:
- Shows "Welcome to DevScope AI" heading
- Shows the signed-in user's email from Clerk's useUser() hook
- Shows a "Sign Out" button using Clerk's <SignOutButton>

## API Client setup
In /apps/web/src/lib/api.ts:
- Create an axios instance with baseURL: process.env.NEXT_PUBLIC_API_URL
- Add a request interceptor that:
  - Gets the current Clerk session token using window.Clerk?.session?.getToken()
  - Attaches it as Authorization: Bearer <token> header on every request
  - Handles the case where there is no token (unauthenticated requests)

## Environment variables
In /apps/web/.env.local, add the Clerk keys (placeholders):
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_placeholder
In /apps/api/.env, add:
CLERK_SECRET_KEY=sk_test_placeholder

## Verification steps
After implementing everything:
1. `npm run dev` should start both apps without errors
2. Navigating to http://localhost:3000 should redirect to /sign-in
3. The sign-in and sign-up pages should render Clerk's UI components
4. TypeScript should have no errors

Do NOT implement Stripe or any other feature yet.
Do NOT add any real UI/styling beyond what is specified — that comes later.
```

---

## PROMPT 4 — Stripe Subscriptions
### (Run after Prompt 3 is complete)

```
We are building DevScope AI. Auth is working with Clerk. Now add Stripe subscription billing.

We have two plans:
- FREE: Can index 1 GitHub repo, 50 AI messages per month
- PRO ($12/month): Unlimited repos, unlimited messages

I will add real Stripe keys and create the products in the Stripe dashboard manually. Build the complete billing system to work the moment I drop in real keys.

## Backend — Stripe Setup

In /apps/api/src/lib/stripe.ts:
- Initialize Stripe with process.env.STRIPE_SECRET_KEY and apiVersion: "2024-06-20"
- Export as a singleton

In /apps/api/src/routes/billing.routes.ts, create these endpoints (all protected by requireAuth):

POST /api/billing/create-checkout-session
- Get the current user from DB using clerkId from req.auth.userId
- If user doesn't have a stripeCustomerId, create a Stripe customer with their email and name, then save stripeCustomerId to DB
- Create a Stripe Checkout Session:
  - mode: "subscription"
  - line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID, quantity: 1 }]
  - success_url: process.env.FRONTEND_URL + "/dashboard?upgraded=true"
  - cancel_url: process.env.FRONTEND_URL + "/dashboard/billing"
  - customer: the user's stripeCustomerId
  - metadata: { clerkId: user.clerkId }
  - allow_promotion_codes: true
- Return { url: session.url } — the frontend will redirect to this URL

POST /api/billing/create-portal-session
- Get user from DB
- Create a Stripe Customer Portal session with return_url: process.env.FRONTEND_URL + "/dashboard/billing"
- Return { url: portalSession.url }

GET /api/billing/subscription-status
- Get user from DB
- Return { plan: user.plan, subscriptionStatus: user.subscriptionStatus, stripeSubscriptionId: user.stripeSubscriptionId }

POST /api/webhooks/stripe (IMPORTANT: this route must NOT use requireAuth — it's called by Stripe, not the user)
- Use express.raw({ type: "application/json" }) middleware on this specific route (not json())
- Verify the webhook signature using process.env.STRIPE_WEBHOOK_SECRET with stripe.webhooks.constructEvent()
- If signature invalid, return 400
- Handle these Stripe events:
  1. "checkout.session.completed":
     - Get clerkId from event.data.object.metadata.clerkId
     - Update user in DB: plan = PRO, stripeSubscriptionId = event.data.object.subscription, subscriptionStatus = ACTIVE
  2. "customer.subscription.updated":
     - Find user by stripeSubscriptionId
     - Update subscriptionStatus based on event.data.object.status (active→ACTIVE, past_due→PAST_DUE, canceled→CANCELLED)
     - If status is "canceled", also set plan back to FREE
  3. "customer.subscription.deleted":
     - Find user by stripeSubscriptionId
     - Set plan = FREE, subscriptionStatus = CANCELLED, stripeSubscriptionId = null
- Always return { received: true } with status 200

Add to /apps/api/.env:
STRIPE_PRO_PRICE_ID=price_placeholder

## Backend — Plan Enforcement Middleware
Create /apps/api/src/middleware/planGate.ts:
- A middleware factory: planGate(feature: "unlimited_repos" | "unlimited_messages")
- Checks the current user's plan in DB
- For "unlimited_repos": if plan is FREE and user already has 1 repo, return 403 { error: "Upgrade to Pro to add unlimited repos", upgradeRequired: true }
- For "unlimited_messages": if plan is FREE and user has sent 50+ messages this month (query UsageLog), return 403 { error: "Monthly message limit reached", upgradeRequired: true }
- If plan is PRO, allow through
- Export planGate

## Frontend — Billing UI

Create /apps/web/src/app/(dashboard)/dashboard/billing/page.tsx with:
- A heading "Billing & Plan"
- Current plan display: shows "Free Plan" or "Pro Plan" badge
- Free plan card showing limits (1 repo, 50 messages/month)
- Pro plan card showing:
  - Price: $12/month
  - Features: Unlimited repos, Unlimited AI messages, PR Review Bot, Auto Doc Generation
  - An "Upgrade to Pro" button
- If user is already Pro: show "Manage Subscription" button instead of upgrade button
- "Upgrade to Pro" button: calls POST /api/billing/create-checkout-session then redirects to the returned URL
- "Manage Subscription" button: calls POST /api/billing/create-portal-session then redirects
- Handle loading states on both buttons (disable + show spinner while waiting)
- On /dashboard?upgraded=true: show a success toast "Welcome to Pro! Your account has been upgraded."

Create /apps/web/src/components/shared/PlanBadge.tsx:
- Accepts plan: "FREE" | "PRO"
- Renders a small colored badge: gray for Free, purple/gold for Pro
- Used in sidebar and billing page

Update the dashboard sidebar layout to show the user's current plan badge next to their name.

## Verification
1. Both apps start without errors
2. TypeScript has no errors
3. Clicking "Upgrade to Pro" redirects to a Stripe Checkout page (will show Stripe's test mode UI once real keys are added)
4. The webhook endpoint is at POST /api/webhooks/stripe

Do NOT implement repo ingestion or AI features yet.
```

---

## PROMPT 5 — Docker, CI/CD + Final Week 1 Verification
### (Run after Prompt 4 is complete)

```
We are building DevScope AI. The app has Next.js frontend, Express backend, PostgreSQL, Redis, Clerk auth, and Stripe billing. Now add proper Docker configuration and GitHub Actions CI/CD.

## Dockerfiles

Create /apps/web/Dockerfile (multi-stage, production-optimized):
Stage 1 - deps:
  - FROM node:20-alpine AS deps
  - Copy package.json and package-lock.json
  - Run npm ci

Stage 2 - builder:
  - FROM node:20-alpine AS builder
  - Copy deps from previous stage
  - Copy source
  - Set build-time ENV vars: NEXT_TELEMETRY_DISABLED=1
  - Run npm run build

Stage 3 - runner:
  - FROM node:20-alpine AS runner
  - Set NODE_ENV=production, NEXT_TELEMETRY_DISABLED=1
  - Create a non-root user "nextjs" and group "nodejs"
  - Copy built files from builder stage (.next/standalone, .next/static, public)
  - Run as nextjs user
  - EXPOSE 3000
  - CMD ["node", "server.js"]

Create /apps/api/Dockerfile (multi-stage):
Stage 1 - builder:
  - FROM node:20-alpine AS builder
  - Copy package files, run npm ci
  - Copy source, run npm run build (compile TypeScript to /dist)

Stage 2 - runner:
  - FROM node:20-alpine AS runner
  - Set NODE_ENV=production
  - Create non-root user "apiuser"
  - Copy package.json, npm ci --production only
  - Copy /dist from builder
  - Run as apiuser
  - EXPOSE 4000
  - CMD ["node", "dist/index.js"]

Update docker-compose.yml to add the app services (for local full-stack testing):
- web service: builds from apps/web/Dockerfile, port 3000:3000, depends on api
- api service: builds from apps/api/Dockerfile, port 4000:4000, depends on postgres and redis
- Keep existing postgres and redis services unchanged
- Add a "docker-compose.dev.yml" that overrides for development (uses volumes for hot reload instead of builds)

Add /apps/web/.dockerignore and /apps/api/.dockerignore:
- node_modules, .next, dist, .env*, coverage, .git

## GitHub Actions CI/CD

Create .github/workflows/ci.yml:
Trigger: on push to main and on all pull_request events

Jobs:

Job 1 - lint-and-typecheck:
  - runs-on: ubuntu-latest
  - steps:
    - checkout
    - setup Node 20 with npm cache
    - npm ci (root)
    - Run TypeScript check: npx tsc --noEmit in both apps/web and apps/api
    - Run ESLint: npm run lint in apps/web

Job 2 - test-api (depends on lint-and-typecheck):
  - runs-on: ubuntu-latest
  - services:
      postgres:
        image: postgres:15-alpine
        env: POSTGRES_USER=devscope, POSTGRES_PASSWORD=devscope, POSTGRES_DB=devscope_test
        ports: 5432:5432
        options: health check
      redis:
        image: redis:7-alpine
        ports: 6379:6379
  - env: DATABASE_URL pointing to the test postgres, REDIS_URL, plus placeholder values for CLERK_SECRET_KEY and STRIPE_SECRET_KEY
  - steps:
    - checkout
    - setup Node 20
    - npm ci
    - Generate Prisma client
    - Run prisma db push on the test DB
    - Run tests: npm run test in apps/api (if no tests exist yet, this step should succeed with exit 0 — add a placeholder test)

Job 3 - build-check (depends on lint-and-typecheck):
  - runs-on: ubuntu-latest
  - steps:
    - checkout
    - setup Node 20
    - npm ci
    - Build the API: npm run build in apps/api (TypeScript compile)
    - Build check for Next.js: set SKIP_ENV_VALIDATION=true and run npm run build in apps/web

## Test setup

In /apps/api, install Jest + ts-jest:
- jest, ts-jest, @types/jest, supertest, @types/supertest

Create /apps/api/jest.config.ts:
- preset: ts-jest
- testEnvironment: node
- testMatch: **/*.test.ts

Create /apps/api/src/tests/health.test.ts:
- Test that GET /api/health returns 200 and { status: "ok" }

Make sure GET /api/health exists in the Express app (just returns { status: "ok", timestamp: new Date() }).

## Package.json scripts
Add to /apps/api/package.json:
- "test": "jest"
- "test:watch": "jest --watch"
- "build": "tsc"
- "start": "node dist/index.js"
- "dev": "nodemon src/index.ts"

Add to /apps/web/package.json:
- "lint": "next lint"

## .env.example files
Create /apps/web/.env.example and /apps/api/.env.example — copies of the .env files with all values replaced by descriptive placeholders like:
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key_here
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

## Final verification checklist
After all of the above:
1. `npm run docker:up` starts postgres and redis with no errors
2. `npm run dev` starts both apps — web on :3000, api on :4000
3. GET http://localhost:4000/api/health returns { status: "ok" }
4. TypeScript compiles with no errors in both apps: `npx tsc --noEmit`
5. Jest test passes: `npm run test` in apps/api
6. ESLint passes: `npm run lint` in apps/web
7. Both Dockerfiles build successfully: `docker build -t devscope-web apps/web` and `docker build -t devscope-api apps/api`
8. The full app flow works:
   - Visit http://localhost:3000 → redirected to /sign-in
   - Sign-in page renders (Clerk UI — shows error about invalid key which is expected until real keys added)
   - /dashboard is protected

Print a summary of all environment variables that need real values before the app is fully functional.
```

---

## HOW TO USE THESE PROMPTS IN CURSOR

1. Open Cursor in an empty folder called `devscope-ai`
2. Open the Cursor Chat panel (Cmd+L or Ctrl+L)
3. Set model to Claude Sonnet (best for large codegen tasks)
4. Paste PROMPT 1 → wait for it to finish completely → review the output
5. If Cursor asks clarifying questions, answer them before it proceeds
6. Run the verification steps at the end of each prompt manually before moving on
7. If something fails, paste the error message back into Cursor chat and say:
   "Fix this error: [paste error]. Do not change anything else."
8. Once the verification passes, move to the next prompt

## TIPS
- If Cursor generates something wrong, say "Revert that change and try again with [specific correction]"
- Never skip a prompt — each one builds on the last
- Commit to Git after each prompt passes its verification steps
- Keep docker running the whole time (`npm run docker:up`)
