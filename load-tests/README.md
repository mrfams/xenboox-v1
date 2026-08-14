# Xenboox Load Testing (k6)

> Turn "should scale" into measured p95/p99 numbers (§25.1). Every scenario
> runs against a **staging environment** — never production.

## Install k6

```bash
# Windows (choco) / macOS (brew) / Linux (apt)
choco install k6        # or: brew install k6   or: sudo apt install k6
# or download from https://grafana.com/docs/k6/latest/set-up/install-k6/
```

## Targets (matching the SLOs in §24.2)

| Metric                     | Target                               |
| -------------------------- | ------------------------------------ |
| Availability               | 99.9% (measured via external probes) |
| p95 core tRPC reads        | < 300 ms                             |
| p99 writes (journal/close) | < 1 s                                |
| Breaking point             | documented per scenario (ramp test)  |

## Run

```bash
# All scenarios against a local dev server
K6_BASE_URL=http://localhost:3000 \
K6_USER_EMAIL=demo@xenboox.com \
K6_USER_PASSWORD=demo1234 \
K6_ENTITY_ID=<your-entity-uuid> \
pnpm --filter=@xenboox/web load-test:smoke

# Full suite against staging (from CI or locally)
K6_BASE_URL=https://staging.xenboox.com \
K6_USER_EMAIL=... K6_USER_PASSWORD=... K6_ENTITY_ID=... \
pnpm --filter=@xenboox/web load-test:full

# Breakpoint: find where the stack gives up
pnpm --filter=@xenboox/web load-test:ramp
```

Env vars (all optional — safe defaults below):

| Var                | Default                 | Purpose                             |
| ------------------ | ----------------------- | ----------------------------------- |
| `K6_BASE_URL`      | `http://localhost:3000` | Target base URL                     |
| `K6_USER_EMAIL`    | `demo@xenboox.com`      | Login user (must exist + verified)  |
| `K6_USER_PASSWORD` | `demo1234`              | Login password                      |
| `K6_ENTITY_ID`     | _(random)_              | Entity for authenticated tRPC calls |

> The email/password above are the **demo seed credentials** (see
> `docs/seed-credentials.md`). Use real staging credentials in CI via GitHub
> secrets — never commit real secrets.

## Scenarios

| File             | What it proves                                   | VUs      |
| ---------------- | ------------------------------------------------ | -------- |
| `smoke.js`       | Stack alive: health + landing + login round-trip | 1        |
| `auth-flow.js`   | CSRF → login → session cookie (hottest path)     | 100 / 1K |
| `read-heavy.js`  | Authenticated tRPC reads (p95 < 300ms)           | 100 / 1K |
| `write-heavy.js` | Journal posting + idempotency keys (p99 < 1s)    | 100 / 1K |
| `realtime.js`    | N concurrent SSE connections per entity          | 100      |
| `ramp.js`        | Ramp 0 → 10K VUs to find the breaking point      | 0→10K    |

## CI

`.github/workflows/load-test.yml` — nightly (02:00 UTC) + manual dispatch,
gated behind the `LOAD_TEST_URL` + `LOAD_TEST_*` secrets so it only runs when
a staging environment exists. Fails the run when p95/p99 thresholds are
breached. Re-run after every DB/index/partition change (per §25.1).

## Writing new scenarios

- Auth flows: reuse `loginAndGetCookies()` from `lib/common.js` — it performs
  the CSRF fetch then the credentials POST and returns the session jar.
- Always set `K6_ENTITY_ID` for tRPC calls; entity scoping is mandatory.
- Keep thresholds in `lib/thresholds.js` so targets live in one file.
