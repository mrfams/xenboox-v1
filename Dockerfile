# ─── Stage 1: Dependencies ────────────────────────────────────────────────
FROM node:26-alpine AS deps

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
COPY packages/agents/package.json packages/agents/
COPY packages/models/package.json packages/models/
COPY packages/jobs/package.json packages/jobs/
COPY packages/ui/package.json packages/ui/

# Install dependencies (frozen lockfile for reproducibility)
RUN pnpm install --frozen-lockfile --prod=false

# ─── Stage 2: Build ──────────────────────────────────────────────────────
FROM deps AS builder

COPY . .

# Generate database migrations
RUN cd packages/db && pnpm drizzle-kit generate 2>/dev/null || true

# Build web app
RUN pnpm build --filter=@xenboox/web

# ─── Stage 3: Production ─────────────────────────────────────────────────
FROM node:26-alpine AS runner

WORKDIR /app

# Install pnpm for runtime
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built app
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

# Copy package.json for the standalone build
COPY --from=builder /app/apps/web/package.json ./apps/web/

USER nextjs

EXPOSE 3000

# Container liveness — /api/health/live is process-only (no DB), so it is
# safe for Docker's HEALTHCHECK (checkov CKV_DOCKER_x). Orchestrator-level
# readiness should use /api/health/deep instead.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
