# Build from monorepo root: docker build -f apps/web/Dockerfile -t devscope-web .
# On Windows, run from the repository root; see README for the exact path.

# Stage 1 — deps
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
RUN npm ci

# Stage 2 — builder
FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=true
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY tsconfig.json ./
COPY apps/web ./apps/web
COPY apps/api/package.json ./apps/api/
COPY packages/db ./packages/db
RUN npm run build -w web

# Stage 3 — runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup -S nodejs -g 1001 && adduser -S nextjs -u 1001 -G nodejs

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000
WORKDIR /app/apps/web
CMD ["node", "server.js"]
