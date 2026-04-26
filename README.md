# DevScope AI

Monorepo for **DevScope AI**: a Next.js 14 web app, an Express API, and a shared Prisma database package.

## Structure

- `apps/web` — Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, React Query
- `apps/api` — Node.js + Express, TypeScript
- `packages/db` — Prisma schema and generated client (shared). Prisma currently requires at least one model to emit a client; a tiny bootstrap model in the schema will be replaced when domain models are added.

## Prerequisites

- Node.js 18+
- Docker (for PostgreSQL and Redis)

## Setup

```bash
npm install
npm run docker:up
npm run db:push
```

Copy environment files and fill in secrets as needed:

- `apps/web/.env.local`
- `apps/api/.env`

## Development

Run web and API together:

```bash
npm run dev
```

Or separately:

```bash
npm run dev:web   # http://localhost:3000
npm run dev:api   # http://localhost:4000
```

Database tools:

```bash
npm run db:push
npm run db:studio
```

Docker:

```bash
npm run docker:up
npm run docker:down
```

## Tech stack

- **Frontend:** Next.js 14, Tailwind CSS, shadcn/ui, TanStack Query, Axios
- **Backend:** Express, Clerk, Stripe, Redis (ioredis), Prisma
- **Data:** PostgreSQL 15, Redis 7 (via Docker Compose)
