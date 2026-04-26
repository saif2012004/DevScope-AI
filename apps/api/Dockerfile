# Build from monorepo root: docker build -f apps/api/Dockerfile -t devscope-api .
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
RUN npm ci
COPY tsconfig.json ./
COPY apps/api ./apps/api
COPY packages/db ./packages/db
RUN cd packages/db && npx prisma generate
RUN npm run build -w @devscope/api
RUN npm prune --omit=dev

# Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs apiuser
COPY --from=builder --chown=apiuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=apiuser:nodejs /app/packages/db ./packages/db
COPY --from=builder --chown=apiuser:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=apiuser:nodejs /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=apiuser:nodejs /app/package.json ./package.json
USER apiuser
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["node", "dist/index.js"]
