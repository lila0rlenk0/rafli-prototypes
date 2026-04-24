---
name: vitals-monitor
description: Monitor Vercel deployments and Sentry error tracking for the Next.js frontend. Use when user mentions "vercel stats", "deployment health", "sentry errors", "error rate", "crash-free rate", "web vitals", "vercel logs", "runtime logs", "deployment logs", "build logs", "release health", "frontend health", "frontend monitoring", "500 errors", "5xx errors", "sentry issues", "performance metrics", "slowest endpoints", "deployment status", "error spike", "LCP", "FCP", "CLS", "p95", "apdex", "observability", "log drain", "request id", "trace id", or wants a frontend health check, log investigation, or production incident triage.
argument-hint: '[environment] [time-window]'
---

# Vercel + Sentry Frontend Monitor

## Safety -- READ ONLY

ALL operations are READ-ONLY. Non-negotiable.

- NEVER create, promote, redeploy, rollback, or delete deployments (no `vercel deploy`, `vercel rollback`, `vercel promote`, `vercel redeploy`, `vercel remove`, `vercel bisect`)
- NEVER modify environment variables, domains, aliases, or project settings on Vercel
- NEVER create, modify, or delete log drains, webhooks, or integrations
- NEVER resolve, ignore, merge, or delete issues on Sentry
- NEVER create or modify alert rules on either platform
- NEVER upload source maps, create releases, or modify any Sentry state
- Before ANY write or mutating operation, STOP and ask the user for explicit permission
- When in doubt, default to read-only -- the cost of not acting is zero, the cost of a bad mutation is high
- If investigation reveals a bad deploy, surface the finding and recommend the user run `vercel rollback` themselves

## Authentication -- CLI-based, no tokens

Both CLIs must be pre-authenticated. No API tokens stored in this repo.

- **Vercel**: `vercel` CLI, authenticated via `vercel login` (session in `~/.vercel`)
- **Sentry**: `sentry` CLI (v0.25+, Go-based), authenticated via `sentry auth login` (session in `~/.sentry/cli.db`, auto-refreshes)

Do NOT use `sentry-cli` (the older Rust-based tool). Use `sentry` (the newer CLI with `sentry api`, `sentry issue list`, etc.) — they have separate auth stores and incompatible flags.

### Preflight check

Run before any monitoring operation. If either fails, tell the user to authenticate.

```bash
vercel whoami          # should print username
sentry auth status     # should show "Authenticated"
```

## Configuration

Read `.agents/skills/vitals-monitor/.env` for project identifiers (non-secret).

- `SENTRY_ORG` -- Sentry organization slug
- `SENTRY_PROJECT` -- Sentry project slug

Vercel project auto-detected from `.vercel/project.json`. Run `vercel link` only if it's missing — ask the user first.

## Mental model -- two complementary signals

The skill pairs two data sources because neither alone tells the whole story:

- **Vercel logs** = ground truth for what the infrastructure did. Every request, every status code, every middleware invocation, every cold start. Best for "what happened" and "when".
- **Sentry** = aggregated, deduplicated errors with stack traces, breadcrumbs, user context, and release correlation. Best for "why" and "who's affected".

Always cross-reference: an error in Sentry should usually correspond to a request in Vercel logs (match on `requestId` or timestamp). If they disagree, something is wrong with your instrumentation.

## Running commands

### Vercel logs -- the primary observability tool

`vercel logs` is THE command for runtime observability. Default window is 24h; default limit is 100 entries; default is no streaming (historical).

```bash
# historical errors + warnings, last hour, expanded stack traces
vercel logs --environment production --level error --level warning --since 1h --expand

# 5xx in production as JSON (for jq pipelines)
vercel logs --environment production --status-code 5xx --since 1h --json

# one specific request ID (from error report, Sentry event tags, user complaint)
vercel logs --request-id req_xxxxx --expand

# full-text search for a known error message
vercel logs --environment production --query "Cannot read properties of undefined" --since 1h --expand

# narrow to a specific deployment to compare pre/post-deploy
vercel logs --deployment dpl_xxx --no-follow --json

# edge function or middleware only
vercel logs --environment production --source edge-function --source edge-middleware --since 1h --json
```

**Always prefer `--json` for analysis** — piped through `jq` it surfaces patterns the human-readable format buries.

```bash
# top error paths
vercel logs --environment production --level error --since 1h --json \
  | jq -r '.requestPath' | sort | uniq -c | sort -rn | head -10

# group 5xx by route pattern (e.g. /blog/[slug])
vercel logs --environment production --status-code 5xx --since 1h --json \
  | jq -r '.route' | sort | uniq -c | sort -rn
```

**`--expand` is essential for error investigation** — without it, stack traces get truncated and you can't tell what actually broke.

### Vercel deployments

```bash
# list recent production deployments
vercel ls --environment production -F json

# inspect a deployment (state, git metadata, regions, aliases)
vercel inspect dpl_xxx --format json

# build logs for a deployment (catches build-time warnings that still deployed)
vercel inspect dpl_xxx --logs

# raw API for filters not supported by CLI
vercel api "/v6/deployments?projectId=$(jq -r .projectId .vercel/project.json)&limit=5&target=production" --raw
```

### Sentry

Use `sentry` CLI commands where available. For Discover, stats_v2, sessions, and alerts, use `sentry api`.

```bash
source .agents/skills/vitals-monitor/.env

# list unresolved issues sorted by frequency
sentry issue list $SENTRY_ORG/$SENTRY_PROJECT --sort freq --period 24h --json

# events for an issue with full stacktrace
sentry event list ISSUE_SHORT_ID --full --limit 10 --json

# raw API -- error volume stats
sentry api "organizations/$SENTRY_ORG/stats_v2/?field=sum(quantity)&groupBy=outcome&category=error&statsPeriod=7d&interval=1d" --json

# raw API -- Web Vitals p75 per page
sentry api "organizations/$SENTRY_ORG/events/?field=transaction&field=p75(measurements.lcp)&field=p75(measurements.fcp)&field=p75(measurements.cls)&field=count()&query=event.type:transaction+transaction.op:pageload&sort=-count()&statsPeriod=24h" --json
```

For large JSON responses, truncate: `python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d, indent=2)[:8000])"`.

## Additional resources

- For all Vercel CLI flags, API endpoints, log fields, retention, and limits: [vercel-api.md](vercel-api.md)
- For all Sentry CLI commands, API endpoints, Discover queries, and field reference: [sentry-api.md](sentry-api.md)

---

## Workflow: full frontend health check

1. Confirm scope: environment (production/preview), time window (default 24h)
2. **Vercel -- deployment state**:
   - `vercel ls --environment production -F json` -- check for ERROR state, build times
   - Confirm current production is `readyState: READY`
3. **Vercel -- runtime errors**:
   - `vercel logs --environment production --level error --since <window> --json`
   - Group by route: `jq -r '.route' | sort | uniq -c | sort -rn`
   - Note top 3 failing routes
4. **Vercel -- 5xx volume**:
   - `vercel logs --environment production --status-code 5xx --since <window> --json | jq -r '.status' | sort | uniq -c`
   - Separate 500 vs 502/503/504 (different root causes: app error vs. infra)
5. **Sentry -- error volume trend**:
   - stats_v2 with category=error, statsPeriod=7d, interval=1d
   - Today vs 7-day average → trend (up/down/stable)
6. **Sentry -- top unresolved issues**:
   - `sentry issue list --sort freq --period 24h`
   - Note count, userCount, firstSeen
7. **Sentry -- crash-free rate**:
   - sessions endpoint with `crash_free_rate(session)` and `crash_free_rate(user)`
   - Flag if below 99.5% (sessions) or 99% (users)
8. **Sentry -- Web Vitals**:
   - Discover query with `transaction.op:pageload`
   - p75 for LCP/FCP/CLS per page
   - Grade against Google thresholds (LCP < 2.5s good, FCP < 1.8s good, CLS < 0.1 good)
9. **Sentry -- slowest transactions**:
   - Discover sorted by `-p95(transaction.duration)`, include `failure_rate()`
10. **Sentry -- release health**:
    - sessions grouped by release
    - Crash-free rate + adoption for current production release
11. **Summarize**: deployment state, error trend, top 5 errors, crash-free rate, Web Vitals grades, slowest pages, any firing alerts

## Workflow: production 500 / 5xx incident triage

Based on Vercel's official CLI debugging flow, adapted to read-only.

1. **Scope the problem**:
   ```bash
   vercel logs --environment production --status-code 5xx --since 1h --expand
   ```
   Look for concentration: one route vs. spread; common error message.
2. **Get structured data**:
   ```bash
   vercel logs --environment production --status-code 500 --json --since 1h \
     | jq '{path: .requestPath, route: .route, message: .message, timestamp: .timestamp, requestId: .requestId, deploymentId: .deploymentId}'
   ```
3. **Narrow the time window** once the spike start is known:
   ```bash
   vercel logs --environment production --status-code 500 --since 2h --until 1h --json
   ```
4. **Pull one request's full context** (pair with Sentry event's `requestId` tag when available):
   ```bash
   vercel logs --request-id req_xxxxx --expand
   ```
5. **Identify the failing deployment**:
   ```bash
   vercel ls --environment production -F json     # current + recent
   vercel inspect <dpl_or_url> --format json      # git SHA, build time, regions
   vercel inspect <dpl_or_url> --logs             # build warnings that still shipped
   ```
6. **Cross-reference with Sentry**:
   - `sentry issue list --sort date` filtered to `firstSeen >= deployment_time` → regressions introduced by this deploy
   - `sentry event list @latest --full --json` → stacktrace + breadcrumbs
   - Match on `requestId` if the Sentry SDK tags events with it (it does by default in `@sentry/nextjs`)
7. **Correlate with git**: `git log --oneline -10` and `git show <sha> --stat` using the commit SHA from `vercel inspect`.
8. **Report findings**:
   - Failing route(s), error message(s), count, affected users
   - Suspected deployment ID + git SHA + author
   - Recommendation: rollback vs. forward-fix
   - **Do NOT run `vercel rollback` or `vercel deploy` — tell the user to**

## Workflow: error spike investigation

1. **Volume trend** (hourly, 24h): `sentry api stats_v2` with interval=1h → identify the spike hour
2. **Top issues in spike**: `sentry issue list --period <spike_window> --sort freq`
3. **Deep dive on dominant issue**: `sentry event list ISSUE_ID --full --json` for stacktrace, breadcrumbs, user agent, region
4. **Vercel correlation**:
   - Deployments around spike: `vercel ls --environment production -F json`
   - Raw logs in the exact window: `vercel logs --environment production --since <spike_start> --until <spike_end> --level error --json`
5. **Release health**: `sentry api sessions` grouped by release — did crash-free rate drop? Does the spike align with a release rollout?
6. **Report**: root cause hypothesis (bad deploy, third-party failure, traffic spike, browser update), affected users, related deployment, recommended action

## Workflow: performance audit

1. Slowest transactions: Discover sorted by `-p95(transaction.duration)`, include `count()` to weight by traffic
2. Web Vitals by page: Discover with `transaction.op:pageload`, p75 for LCP/FCP/CLS, grade vs Google thresholds
3. Throughput + reliability: `epm()`, `failure_rate()`, `apdex(300)`, `user_misery(300)`
4. Apdex breakdown: transactions with `apdex < 0.9` need attention; `user_misery > 0.1` = significant impact
5. Vercel cross-reference:
   - `vercel inspect` for regions serving traffic (cold starts cluster by region)
   - `vercel logs --source edge-middleware --json` + measure middleware duration (in log metadata)
6. Report: pages ranked by (high traffic × poor vitals), specific p75 numbers, apdex, recommended optimizations

## Workflow: targeted log search

When the user knows *what* they're looking for (a specific error string, a request ID from a user report, a deployment ID):

```bash
# by request ID (most precise)
vercel logs --request-id req_xxxxx --expand

# by error string
vercel logs --environment production --query "ECONNRESET" --since 6h --expand --json

# by deployment
vercel logs --deployment dpl_xxx --no-follow --expand --json

# by branch (preview environment)
vercel logs --environment preview --branch feature/new-checkout --since 24h --level error --json
```

Then pivot to Sentry:
- Search issues by message: `sentry issue list --query "ECONNRESET" --period 24h --json`
- Filter events by user: `sentry event list ISSUE_ID --query "user.email:affected@user.com" --json`

---

## Observability capabilities on Vercel (awareness only)

Know what exists, even though the skill doesn't configure these:

- **Runtime Logs (dashboard + `vercel logs` CLI)** -- retention per plan: Hobby 1h, Pro 1d, Enterprise 3d, +Observability Plus extends both to 30d. Streamed in real-time, grouped per request, 256 lines / 256 KB per line / 1 MB per request cap.
- **Observability tab** -- framework-aware insights: Vercel Functions, External APIs, Edge Requests, Middleware, Fast Data Transfer, Image Optimization, ISR, Build Diagnostics. Dashboard-only, no query API, but useful to mention when the user asks "why is this slow?".
- **Speed Insights + Web Analytics** -- dashboard-only, no query API. Use **Sentry Discover** for programmatic Web Vitals instead.
- **Drains** (Pro/Enterprise) -- forward logs / traces / speed insights / analytics to external sinks (Datadog, S3, Dash0, custom HTTPS). Drains can be **listed** read-only via `vercel api /v1/integrations/log-drains`, but NEVER created or modified by this skill.
- **Build Logs** -- accessible via `vercel inspect <dpl> --logs`, stored indefinitely (unlike runtime logs).

---

## Gotchas

- `vercel logs` default window is **24h** and default limit is **100 entries**. For longer windows or more entries, always pass `--since` and `--limit` explicitly.
- Runtime log retention: Hobby 1h, Pro 1d, Enterprise 3d, +Observability Plus 30d. **If `vercel logs` returns empty for a valid window, logs fell outside retention — check plan first**. Build logs are stored indefinitely.
- Per-request log caps: 256 lines, 256 KB per line, 1 MB total. If a function hits the cap, older lines are dropped and only the most recent are queryable — investigate any runaway logging.
- **Always use `--expand` when investigating errors** — default output truncates stack traces mid-message and you lose the actual failure point.
- `--follow` caps at **5 minutes** per session and blocks the shell. Don't use in scripts; use historical queries with `--since` instead.
- `vercel logs` rate limit is **100 req/min**; deployment events endpoint is **60 req/min**. Don't poll aggressively.
- `vercel logs` auto-filters to the current git branch unless you pass `--no-branch`. When debugging production from a feature branch, this is a footgun.
- Vercel has no Analytics / Speed Insights query API — those are dashboard-only. Use Sentry Discover for programmatic performance data.
- Sentry `stats_v2` interval minimum is 1h, maximum 1d. For finer granularity use Discover with explicit `start`/`end`.
- Sentry Discover queries are limited to 20 fields per request — split into multiple queries for more dimensions.
- Sentry session data (crash-free rate) requires the SDK to send session events. `@sentry/nextjs` does this by default — verify with a sessions query before trusting the number.
- Sentry source-map-debug requires a specific event ID + frame index — you can't check source maps in general, only for a specific occurrence.
- `sentry` CLI (Go-based, v0.25+) is NOT `sentry-cli` (Rust-based, v3.x). Different auth stores (`~/.sentry/cli.db` vs `~/.sentryclirc`). Always use `sentry`.
- `sentry` CLI token auto-refreshes but expires after ~30 days of inactivity. If `sentry auth status` shows expired, run `sentry auth login` again.
- Web Vitals thresholds are measured at **p75** per Google's methodology, not average or median.
- When matching Vercel logs to Sentry events, use `requestId` — `@sentry/nextjs` tags events with it automatically. Timestamps alone can be ambiguous under load.
