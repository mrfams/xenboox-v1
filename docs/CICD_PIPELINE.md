# CI/CD Pipeline — Xenboox

> GitHub Actions workflows, deployment strategy, and environment management for the Xenboox monorepo.

---

## 1. Overview

```
PR opened/updated          Merge to main
      |                         |
      v                         v
+-------------+          +-------------+
| PR Checks   |          | Production  |
| - lint      |          | Deploy      |
| - typecheck |          | - migrate   |
| - test      |          | - build     |
| - build     |          | - deploy    |
| - eval      |          | - verify    |
+-------------+          +-------------+
      |                         |
      v                         v
+-------------+          +-------------+
| Preview     |          | Monitoring  |
| Deploy      |          | - health    |
| (Vercel)    |          | - errors    |
+-------------+          | - perf      |
                         +-------------+
```

**Tools:**
- CI: GitHub Actions
- Deployment: Vercel (monorepo with Turborepo remote cache)
- Database: Neon (branching for preview, main for production)
- Monitoring: Vercel Analytics + custom health checks

---

## 2. Environment Management

| Environment  | Branch / Trigger    | Database          | URL                          |
|--------------|---------------------|-------------------|------------------------------|
| Development  | Local               | Local Neon        | `localhost:3000`             |
| Preview      | PR                  | Neon branch       | `<branch>.vercel.app`        |
| Staging      | `staging` branch    | Neon staging      | `staging.xenboox.app`        |
| Production   | `main`              | Neon production   | `xenboox.app`                |

---

## 3. Main CI/CD Workflow

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: "20"
  PNPM_VERSION: "9"
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ vars.TURBO_TEAM }}

jobs:
  # ------------------------------------------
  # PR Checks — run on every push and PR
  # ------------------------------------------
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint

  typecheck:
    name: Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck

  test-unit:
    name: Unit Tests
    runs-on: ubuntu-latest
    needs: [lint, typecheck]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - run: pnpm test --filter unit -- --coverage
      - name: Check coverage threshold
        run: pnpm test:coverage-check

  test-integration:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: [lint, typecheck]
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: xenboox_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    env:
      DATABASE_URL: postgres://test:test@localhost:5432/xenboox_test
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - run: pnpm db:push
      - run: pnpm test --filter integration

  test-e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: [lint, typecheck]
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: xenboox_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    env:
      DATABASE_URL: postgres://test:test@localhost:5432/xenboox_test
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - run: pnpm db:push
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: apps/web/playwright-report/
          retention-days: 7

  agent-eval:
    name: Agent Evaluation
    runs-on: ubuntu-latest
    needs: [lint, typecheck]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - name: Run agent evaluation suite
        run: pnpm agents:eval --threshold 0.85
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          LANGFUSE_PUBLIC_KEY: ${{ secrets.LANGFUSE_PUBLIC_KEY }}
          LANGFUSE_SECRET_KEY: ${{ secrets.LANGFUSE_SECRET_KEY }}

  build:
    name: Build Verification
    runs-on: ubuntu-latest
    needs: [test-unit, test-integration, test-e2e, agent-eval]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - run: pnpm build

  # ------------------------------------------
  # Preview Deployment — on PR
  # ------------------------------------------
  preview:
    name: Preview Deploy
    if: github.event_name == 'pull_request'
    needs: [build]
    runs-on: ubuntu-latest
    environment:
      name: preview
      url: ${{ steps.deploy.outputs.url }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile

      - name: Create Neon branch for preview
        uses: neon-actions/branch-create@v1
        id: neon-branch
        with:
          project_id: ${{ secrets.NEON_PROJECT_ID }}
          branch_name: preview-${{ github.head_ref }}
          api_key: ${{ secrets.NEON_API_KEY }}

      - name: Run migrations on preview branch
        run: pnpm db:migrate
        env:
          DATABASE_URL: ${{ steps.neon-branch.outputs.connection_string }}

      - name: Deploy to Vercel (preview)
        id: deploy
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: "--pre"
          working-directory: apps/web

      - name: Post-deploy health check
        run: |
          for i in 1 2 3 4 5; do
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${{ steps.deploy.outputs.url }}/api/health")
            if [ "$STATUS" = "200" ]; then
              echo "Health check passed"
              exit 0
            fi
            echo "Attempt $i: got $STATUS, retrying in 10s..."
            sleep 10
          done
          echo "Health check failed after 5 attempts"
          exit 1

  # ------------------------------------------
  # Production Deployment — on merge to main
  # ------------------------------------------
  deploy-staging:
    name: Deploy Staging
    if: github.ref == 'refs/heads/staging'
    needs: [build]
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.xenboox.app
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile

      - name: Run migrations on staging
        run: pnpm db:migrate
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}

      - name: Deploy to Vercel (staging)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: "--target staging"
          working-directory: apps/web

  deploy-production:
    name: Deploy Production
    if: github.ref == 'refs/heads/main'
    needs: [build]
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://xenboox.app
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile

      - name: Backup database
        run: |
          curl -X POST "${{ secrets.NEON_API_URL }}/projects/${{ secrets.NEON_PROJECT_ID }}/branches/main/backup" \
            -H "Authorization: Bearer ${{ secrets.NEON_API_KEY }}"

      - name: Run migrations on production
        run: pnpm db:migrate
        env:
          DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}

      - name: Deploy to Vercel (production)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: "--prod"
          working-directory: apps/web

      - name: Post-deploy verification
        run: |
          echo "Waiting for deployment to propagate..."
          sleep 30
          for i in 1 2 3 4 5; do
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://xenboox.app/api/health")
            if [ "$STATUS" = "200" ]; then
              echo "Production health check passed"
              exit 0
            fi
            echo "Attempt $i: got $STATUS, retrying in 15s..."
            sleep 15
          done
          echo "Production health check failed"
          exit 1

  # ------------------------------------------
  # Post-Deploy Monitoring
  # ------------------------------------------
  post-deploy-monitor:
    name: Post-Deploy Monitoring
    if: github.ref == 'refs/heads/main'
    needs: [deploy-production]
    runs-on: ubuntu-latest
    steps:
      - name: Wait for stability
        run: sleep 60

      - name: Check error rate
        run: |
          ERROR_RATE=$(curl -s "https://xenboox.app/api/metrics/error-rate?window=5m" \
            -H "Authorization: Bearer ${{ secrets.MONITORING_TOKEN }}" | jq '.rate')
          echo "Error rate (last 5m): $ERROR_RATE"
          if (( $(echo "$ERROR_RATE > 0.05" | bc -l) )); then
            echo "Error rate exceeds 5% threshold"
            exit 1
          fi

      - name: Check response time baseline
        run: |
          P95=$(curl -s "https://xenboox.app/api/metrics/p95?window=5m" \
            -H "Authorization: Bearer ${{ secrets.MONITORING_TOKEN }}" | jq '.p95Ms')
          echo "P95 response time (last 5m): ${P95}ms"
          if (( $(echo "$P95 > 2000" | bc -l) )); then
            echo "P95 exceeds 2000ms threshold"
            exit 1
          fi
```

---

## 4. PR Check Pipeline Details

Every PR must pass all of the following before merge:

```
+------------------+     +------------------+     +------------------+
| TypeScript       |     | ESLint           |     | Prettier         |
| typecheck        |     | lint             |     | format check     |
+------------------+     +------------------+     +------------------+
         |                        |                        |
         v                        v                        v
+------------------+     +------------------+     +------------------+
| Unit Tests       |     | Integration      |     | Agent            |
| (Vitest)         |     | Tests (Vitest)   |     | Evaluation       |
+------------------+     +------------------+     +------------------+
         |                        |                        |
         +------------------------+------------------------+
                                  |
                                  v
                        +------------------+
                        | Build            |
                        | Verification     |
                        +------------------+
                                  |
                                  v
                        +------------------+
                        | Preview          |
                        | Deployment       |
                        +------------------+
```

### Required Status Checks (GitHub branch protection)

```json
{
  "required_status_checks": [
    "lint",
    "typecheck",
    "test-unit",
    "test-integration",
    "test-e2e",
    "agent-eval",
    "build"
  ]
}
```

---

## 5. Deployment Pipeline

### PR → Preview

1. PR opened/updated triggers CI pipeline
2. All checks pass → build succeeds
3. Neon branch created (database isolation)
4. Migrations run against preview branch
5. Vercel preview deployment created
6. Health check confirms deployment is live
7. Preview URL posted as PR comment

### Merge to main → Production

1. Merge triggers CI pipeline
2. All checks pass → build succeeds
3. Database backup triggered
4. Migrations run against production
5. Vercel production deployment triggered
6. Post-deploy verification (health + error rate + latency)
7. Rollback automatically triggered if checks fail

---

## 6. Rollback Strategy

### Vercel Instant Rollback

```bash
# Rollback to previous deployment
vercel rollback --token $VERCEL_TOKEN --scope xenboox

# Or via GitHub Actions (manual trigger)
gh workflow run rollback.yml -f environment=production
```

### Rollback Workflow

```yaml
# .github/workflows/rollback.yml
name: Rollback

on:
  workflow_dispatch:
    inputs:
      environment:
        description: "Target environment"
        required: true
        type: choice
        options:
          - production
          - staging
      reason:
        description: "Rollback reason"
        required: true

jobs:
  rollback:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    steps:
      - name: Vercel rollback
        run: |
          vercel rollback --token ${{ secrets.VERCEL_TOKEN }} --scope xenboox
          echo "Rolled back ${{ inputs.environment }}"

      - name: Notify team
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Rolled back ${{ inputs.environment }}. Reason: ${{ inputs.reason }}"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### Database Migration Rollback

```bash
# Generate rollback migration
pnpm db:rollback --migration <migration-id>

# Or manual rollback
pnpm db:migrate:down
```

### Agent Version Rollback

Agent prompts and configs are versioned in git. Rollback = revert the commit that changed them.

```bash
# Find the commit that broke agent quality
pnpm agents:eval --threshold 0.85  # identify regression
git log --oneline -- packages/agents/  # find cause
git revert <commit-sha>  # rollback
```

---

## 7. Monitoring Post-Deploy

### Health Check Endpoint

```typescript
// apps/web/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { db } from '~/lib/db';

export async function GET() {
  try {
    // Database connectivity
    await db.execute('SELECT 1');

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7),
      checks: {
        database: 'ok',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
```

### Metrics Endpoint

```typescript
// apps/web/app/api/metrics/error-rate/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const window = searchParams.get('window') || '5m';

  // Query error rate from observability platform (LangFuse / Vercel Analytics)
  const rate = await getErrorRate(window);

  return NextResponse.json({ rate, window });
}
```

### Monitoring Checklist

| Metric               | Threshold       | Action on Breach        |
|----------------------|-----------------|-------------------------|
| Error rate (5m)      | < 5%            | Auto-rollback           |
| P95 response time    | < 2000ms        | Alert + investigate     |
| Agent confidence     | > 0.85          | Alert + eval re-run     |
| Database connections | < 80% pool      | Alert + scale           |
| Deployment status    | 200 OK          | Auto-rollback           |

---

## 8. Required Secrets

| Secret                    | Purpose                              |
|---------------------------|--------------------------------------|
| `VERCEL_TOKEN`            | Vercel deployment authentication     |
| `VERCEL_ORG_ID`           | Vercel organization                  |
| `VERCEL_PROJECT_ID`       | Vercel project                       |
| `NEON_API_KEY`            | Neon API authentication              |
| `NEON_PROJECT_ID`         | Neon project identifier              |
| `ANTHROPIC_API_KEY`       | Claude API for agent evaluation      |
| `LANGFUSE_PUBLIC_KEY`     | LangFuse observability               |
| `LANGFUSE_SECRET_KEY`     | LangFuse secret key                  |
| `TURBO_TOKEN`             | Turborepo remote cache               |
| `SLACK_WEBHOOK`           | Deployment notifications             |
| `MONITORING_TOKEN`        | Metrics endpoint auth                |
| `STAGING_DATABASE_URL`    | Staging Neon connection string       |
| `PRODUCTION_DATABASE_URL` | Production Neon connection string    |

---

## 9. Local Development

```bash
# Run CI checks locally before pushing
pnpm lint && pnpm typecheck && pnpm test

# Run full build verification
pnpm build

# Run agent evaluation locally
pnpm agents:eval --threshold 0.85
```

### Pre-commit Hook (Husky + lint-staged)

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```
