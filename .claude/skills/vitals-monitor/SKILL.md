---
name: vitals-monitor
description: Monitor Vercel deployments and Sentry error tracking for the Next.js frontend. Use when user mentions "vercel stats", "deployment health", "sentry errors", "error rate", "crash-free rate", "web vitals", "deployment logs", "release health", "frontend health", "frontend monitoring", "500 errors", "sentry issues", "performance metrics", "slowest endpoints", "deployment status", "error spike", "LCP", "FCP", "CLS", "p95", "apdex", or wants a frontend health check.
argument-hint: '[environment] [time-window]'
---

# Vercel + Sentry Frontend Monitor

## Safety -- READ ONLY

ALL operations are READ-ONLY. This is non-negotiable.

- NEVER create, promote, rollback, or delete deployments
- NEVER modify environment variables, domains, or project settings on Vercel
- NEVER resolve, ignore, merge, or delete issues on Sentry
- NEVER create or modify alert rules on either platform
- NEVER upload source maps, create releases, or modify any Sentry state
- NEVER delete log drains, webhooks, or edge configs
- Before ANY write or mutating operation, STOP and ask the user for explicit permission
- When in doubt, default to read-only -- the cost of not acting is zero, the cost of a bad mutation is high

## Authentication -- CLI-based, no tokens

Both CLIs must be pre-authenticated. No API tokens stored in this repo.

- **Vercel**: `vercel` CLI, authenticated via `vercel login` (session stored in `~/.vercel`)
- **Sentry**: `sentry` CLI (v0.25+, the newer Go-based CLI), authenticated via `sentry auth login` (session stored in `~/.sentry/cli.db`, auto-refreshes)

Do NOT use `sentry-cli` (the older Rust-based CLI). Use `sentry` (the newer CLI with `sentry api`, `sentry issue list`, etc.).

### Preflight check

Run before any monitoring operation. If either fails, tell the user to authenticate.

```bash
# vercel -- should print username
vercel whoami

# sentry -- should show "Authenticated" with token info
sentry auth status
```

## Configuration

Read `.claude/skills/vitals-monitor/.env` for project identifiers (non-secret).

- `SENTRY_ORG` -- Sentry organization slug
- `SENTRY_PROJECT` -- Sentry project slug

Vercel project is auto-detected from the linked project (`.vercel/project.json`).

## Running commands

### Vercel

Use CLI commands directly. For endpoints without a dedicated CLI command, use `vercel api`.

```bash
# runtime logs -- errors in the last hour
vercel logs --environment production --level error --since 1h --json --no-follow

# list production deployments
vercel api "/v6/deployments?projectId=$(cat .vercel/project.json | python3 -c 'import sys,json; print(json.load(sys.stdin)["projectId"])')&limit=5&target=production" --raw

# inspect a deployment
vercel inspect dpl_xxx --format json
```

### Sentry

Use `sentry` CLI commands where possible. For Discover, stats_v2, sessions, and alerts, use `sentry api`.

```bash
# source project identifiers
source .claude/skills/vitals-monitor/.env

# list unresolved issues
sentry issue list $SENTRY_ORG/$SENTRY_PROJECT --sort freq --period 24h --json

# list events for an issue
sentry event list ISSUE_SHORT_ID --limit 10 --json

# raw API -- stats, Discover, sessions, alerts
sentry api "organizations/$SENTRY_ORG/stats_v2/?field=sum(quantity)&groupBy=outcome&category=error&statsPeriod=7d&interval=1d" --json

# raw API -- Discover query (Web Vitals)
sentry api "organizations/$SENTRY_ORG/events/?field=transaction&field=p75(measurements.lcp)&field=p75(measurements.fcp)&field=p75(measurements.cls)&field=count()&query=event.type:transaction+transaction.op:pageload&sort=-count()&statsPeriod=24h" --json
```

For large JSON responses, pipe through `python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d, indent=2)[:8000])"` to truncate.

## Additional resources

- For all Vercel CLI commands and API endpoints, see [vercel-api.md](vercel-api.md)
- For all Sentry CLI commands and API endpoints, see [sentry-api.md](sentry-api.md)

## Workflow: full frontend health check

1. Confirm scope: environment (production/preview), time window (default 24h)
2. Vercel -- latest deployments:
   - `vercel api "/v6/deployments?..."` -- check for ERROR state
   - Note build times (buildingAt -> ready timestamps)
   - Check if current production deployment is healthy (readyState: READY)
3. Vercel -- runtime errors:
   - `vercel logs --environment production --level error --since <window> --json --no-follow`
   - Filter for 5xx status codes, edge function or middleware failures
4. Sentry -- error volume trend:
   - `sentry api "organizations/$SENTRY_ORG/stats_v2/..."` with category=error, statsPeriod=7d, interval=1d
   - Compare today vs 7-day average to determine trend (up/down/stable)
5. Sentry -- top unresolved issues:
   - `sentry issue list $SENTRY_ORG/$SENTRY_PROJECT --sort freq --period 24h --json`
   - Note count, userCount, firstSeen for each
6. Sentry -- crash-free session rate:
   - `sentry api "organizations/$SENTRY_ORG/sessions/..."` with crash_free_rate(session) and crash_free_rate(user)
   - Flag if below 99.5% (sessions) or 99% (users)
7. Sentry -- Web Vitals:
   - Discover query with transaction.op:pageload
   - Measure p75 for LCP, FCP, CLS
   - Assess against Google thresholds: LCP < 2.5s good / < 4s needs-improvement / >= 4s poor, FCP < 1.8s good / < 3s needs-improvement / >= 3s poor, CLS < 0.1 good / < 0.25 needs-improvement / >= 0.25 poor
8. Sentry -- slowest transactions:
   - Discover query sorted by p95(transaction.duration)
   - Include failure_rate() to identify both slow and unreliable endpoints
9. Sentry -- release health:
   - Sessions endpoint grouped by release
   - Check crash-free rate and adoption for current production release
10. Summarize:
    - Deployment status (healthy/degraded/down)
    - Error trend (up/down/stable with percentage change)
    - Top 5 errors with event counts and affected users
    - Crash-free rate (session and user)
    - Web Vitals assessment per page (good/needs-improvement/poor)
    - Top 3 slowest pages by p95
    - Any alert rules currently firing

## Workflow: deployment investigation

1. Get deployment details:
   - `vercel inspect dpl_xxx --format json`
   - readyState, errorCode, errorMessage, regions, aliases
   - Git metadata: commit SHA, branch, message
2. Fetch build logs:
   - `vercel inspect dpl_xxx --logs`
   - Look for errors, warnings, build failures
   - Note total build duration
3. Check deployment checks:
   - `vercel api "/v1/deployments/dpl_xxx/checks"` --raw
4. Compare error rate before/after deployment:
   - `sentry api` stats_v2 with explicit start/end timestamps bracketing the deployment time
   - Calculate percentage change in error volume
5. Check for new issues introduced:
   - `sentry issue list` sorted by date, filtered to firstSeen after deployment time
   - These are regressions -- errors that didn't exist before this deploy
6. Verify source maps:
   - If stack traces show minified code, source maps may not have uploaded
   - `sentry api` source-map-debug on a recent event to diagnose

## Workflow: error spike investigation

1. Get error volume trend -- `sentry api` stats_v2 hourly for 24h
   - Identify the spike window (hour with abnormal volume)
2. List top issues in the spike window:
   - `sentry issue list` with `--period` matching the spike window
   - Sort by frequency to find the dominant error
3. Deep dive on the top issue:
   - `sentry event list ISSUE_ID --full --json` for stacktrace and breadcrumbs
   - Check request context (URL, headers, user agent)
   - Look for patterns: specific browser, region, user segment
4. Cross-reference with Vercel:
   - `vercel api` deployments around the spike time
   - Check if a deploy happened just before the spike started
   - `vercel logs --since <spike_start> --until <spike_end> --level error --json --no-follow`
5. Check release health:
   - `sentry api` sessions -- did crash-free rate drop during the spike?
   - Group by release to see if a specific release caused it
6. Report:
   - Root cause hypothesis (bad deploy, third-party failure, traffic spike, etc.)
   - Affected user count and session impact
   - Related deployment if identified
   - Recommended action

## Workflow: performance audit

1. Slowest transactions by p95:
   - Discover query sorted by -p95(transaction.duration)
   - Include count() to weight by traffic volume
   - Focus on transactions with both high p95 and high volume
2. Web Vitals by page:
   - Discover query with transaction.op:pageload
   - p75 for LCP, FCP, CLS per transaction (page)
   - Grade each page against Google thresholds
3. Throughput and reliability:
   - epm() (events per minute) for traffic volume
   - failure_rate() for reliability
   - apdex(300) for user satisfaction (300ms threshold)
   - user_misery(300) for frustrated user count
4. Apdex breakdown:
   - Transactions with apdex < 0.9 need attention
   - user_misery > 0.1 indicates significant user impact
5. Vercel cross-reference:
   - `vercel inspect` for regions serving traffic
   - `vercel logs` for edge function and middleware latency
6. Report:
   - Pages ranked by optimization priority (high traffic + poor vitals)
   - Web Vitals vs Google thresholds with specific numbers
   - Apdex and user misery scores
   - Recommended optimizations (code splitting, image optimization, API caching, etc.)

## Gotchas

- Vercel has no Analytics/Speed Insights query API -- these are dashboard-only features. Use Sentry Discover for performance data instead.
- Vercel runtime log retention: Hobby 1h, Pro 1d, Enterprise 3d. Build logs stored indefinitely. If logs are empty, the deployment may have been outside the retention window.
- `sentry` CLI (Go-based, v0.25+) is NOT `sentry-cli` (Rust-based, v3.x). They use different auth stores (`~/.sentry/cli.db` vs `~/.sentryclirc`). Always use `sentry`, never `sentry-cli`.
- `sentry` CLI token auto-refreshes but expires after ~30 days of inactivity. If `sentry auth status` shows expired, run `sentry auth login` again.
- Sentry stats_v2 interval minimum is 1h, maximum is 1d. For finer granularity, use Discover queries with explicit time ranges.
- Sentry Discover queries are limited to 20 fields per request. Split into multiple queries if you need more dimensions.
- Sentry session data (crash-free rate) requires the SDK to send session events. The Next.js Sentry SDK does this by default, but verify with a sessions query first.
- Sentry source-map-debug requires a specific event ID and frame index -- you can't check source maps in general, only for a specific error occurrence.
- Vercel deployment events (logs) are rate-limited to 60/min -- don't poll aggressively.
- Sentry rate limits are per caller identity + endpoint, not published numerically. If you get 429, back off.
- Web Vitals thresholds are measured at p75 (75th percentile) per Google's methodology, not average or median.
