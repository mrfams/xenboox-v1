# Change Management Policy

> Xenboox — AI-Native Accounting Platform
> Effective Date: September 2026
> Version: 1.0
> Owner: Engineering Lead

---

## 1. Purpose

This policy ensures all changes to Xenboox's systems are controlled, tested, reviewed, and documented to maintain security, stability, and compliance.

## 2. Scope

Applies to all changes in production environments:

- Application code changes
- Infrastructure changes
- Database schema changes
- Configuration changes
- Security control changes

## 3. Change Categories

| Category      | Description                     | Approval                   | Example                               |
| ------------- | ------------------------------- | -------------------------- | ------------------------------------- |
| **Standard**  | Pre-approved, low-risk changes  | Automated CI/CD            | Bug fixes, dependency updates         |
| **Normal**    | Changes requiring review        | Peer review + CI/CD        | New features, schema migrations       |
| **Emergency** | Critical fixes for P0 incidents | Post-hoc review within 24h | Security patches, production hotfixes |

## 4. Change Process

### 4.1 Standard Changes

1. Developer creates feature branch
2. Writes code with tests (TDD)
3. Opens pull request
4. CI/CD runs: typecheck, lint, tests, security scan
5. Peer review (minimum 1 approval)
6. Merge to `master`
7. Auto-deploy to production

### 4.2 Normal Changes

1. Developer creates feature branch
2. Writes implementation plan
3. Writes code with tests (TDD)
4. Opens pull request with plan reference
5. CI/CD runs full validation suite
6. Peer review (minimum 1 approval)
7. Security review (if security-sensitive)
8. Merge to `master`
9. Auto-deploy to production
10. Monitor deployment for issues

### 4.3 Emergency Changes

1. Hotfix branch created from `master`
2. Minimal fix with tests
3. Direct merge to `master` (bypasses standard review)
4. Auto-deploy to production
5. Post-hoc code review within 24 hours
6. Post-incident review documented

## 5. CI/CD Pipeline Controls

Every change must pass:

- [ ] TypeScript type checking (`pnpm typecheck`)
- [ ] ESLint linting (`pnpm lint`)
- [ ] Unit tests (`pnpm test`)
- [ ] Integration tests (affected packages)
- [ ] E2E tests (Playwright)
- [ ] Security scans (Semgrep, CodeQL, gitleaks)
- [ ] Dependency audit (`pnpm audit`)
- [ ] Build verification (`pnpm build`)

## 6. Database Changes

- Schema changes require Drizzle migration generation (`pnpm db:generate`)
- Migrations reviewed before merge
- Migrations run automatically in CI/CD
- Rollback migrations prepared for every forward migration
- No manual database modifications in production

## 7. Rollback Procedures

- **Application**: Vercel instant rollback to previous deployment
- **Database**: Run rollback migration (`pnpm db:migrate` with down migration)
- **Configuration**: Revert environment variables in Vercel dashboard

## 8. Change Log

All changes tracked via:

- Git commit history (conventional commits)
- CI/CD deployment logs
- Audit log entries for schema and configuration changes

## 9. Compliance

- Changes reviewed against security checklist
- Sensitive changes flagged for Security Officer review
- Change records retained for audit trail

---

**Approved by:** ************\_************ (Engineering Lead)
**Date:** ************\_************
