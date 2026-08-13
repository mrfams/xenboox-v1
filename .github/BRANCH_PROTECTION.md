# Branch Protection Configuration

Apply these settings in **GitHub → Settings → Branches → Add rule** for `main`/`master`:

## Required Settings

### Branch name pattern

```
main
```

(or `master` — match your default branch)

### ✅ Require a pull request before merging

- ✅ Require approvals: **1**
- ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require review from Code Owners

### ✅ Require status checks before merging

Required status checks (must pass):

```
Security Gate
Lint
Typecheck
Test
Build
```

### ✅ Require branches to be up to date before merging

### ✅ Require conversation resolution before merging

### ✅ Require signed commits (optional but recommended)

### ✅ Require linear history (enforces squash/rebase, no merge commits)

### ✅ Include administrators

**⚠️ IMPORTANT:** Check this. Without it, admins can bypass all protections.

### ✅ Restrict who can push to matching branches

- Allow force pushes: **❌ NO**
- Allow deletions: **❌ NO**

### ✅ Block force pushes

### ✅ Block deletions

---

## GitHub Settings → Code Security

### Dependency scanning

- ✅ Dependabot alerts: **ON**
- ✅ Dependabot security updates: **ON**

### Code scanning

- ✅ CodeQL: **ON** (configured via workflow)

### Secret scanning

- ✅ Secret scanning: **ON**
- ✅ Push protection: **ON** (blocks pushes with detected secrets)

---

## Environment Variables Required for CI

Add these in **GitHub → Settings → Secrets and variables → Actions**:

| Secret             | Description                                        |
| ------------------ | -------------------------------------------------- |
| `GITLEAKS_LICENSE` | (Optional) gitleaks pro license for advanced rules |
| `DATABASE_URL`     | Neon PostgreSQL connection string (for build)      |
| `AUTH_SECRET`      | NextAuth secret (for build)                        |
| `NEXTAUTH_URL`     | Production URL (for build)                         |

---

## Verification Checklist

After applying settings:

1. ✅ Create a test PR — all status checks should appear
2. ✅ Try to merge without approval — should be blocked
3. ✅ Try to push directly to main — should be blocked
4. ✅ Try to force push — should be blocked
5. ✅ Verify Security Gate job runs on the PR
6. ✅ Check GitHub Security tab shows CodeQL + gitleaks results
