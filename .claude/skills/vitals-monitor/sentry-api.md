# Sentry Reference

Auth: handled automatically by `sentry` CLI session (`sentry auth login`). Token stored in `~/.sentry/cli.db`, auto-refreshes.

Important: use `sentry` (Go-based, v0.25+), NOT `sentry-cli` (Rust-based, v3.x). Different tools, different auth stores.

## CLI commands

### Issues

```bash
# unresolved issues sorted by frequency, last 24h
sentry issue list mode-mobile-t5/rafli --sort freq --period 24h --json

# with specific query
sentry issue list mode-mobile-t5/rafli --query "is:unresolved level:error" --limit 10 --json

# all projects in org
sentry issue list mode-mobile-t5/ --sort freq --period 24h --json

# compact output (no JSON)
sentry issue list mode-mobile-t5/rafli --sort freq --period 24h --compact

# paginate
sentry issue list mode-mobile-t5/rafli --cursor next
```

Flags: `-q`/`--query` (Sentry search syntax), `-n`/`--limit` (max 1000, default 25), `-s`/`--sort` (date|new|freq|user), `-t`/`--period` (7d, 24h, `2026-03-09..2026-04-09`, `>=2026-03-09`), `-c`/`--cursor` (next|prev), `--compact`, `--fresh`, `--json`, `--fields`

JSON fields: `id`, `shortId`, `title`, `culprit`, `count`, `userCount`, `firstSeen`, `lastSeen`, `level`, `status`, `priority`, `platform`, `permalink`, `project`, `metadata`, `assignedTo`, `substatus`, `isUnhandled`, `seerFixabilityScore`

### Events

```bash
# events for an issue (by short ID)
sentry event list RAFLI-123 --limit 10 --json

# latest unresolved issue's events
sentry event list @latest --json

# most frequent issue's events
sentry event list @most_frequent --json

# with full stacktrace
sentry event list RAFLI-123 --full --json

# filter by user
sentry event list RAFLI-123 --query "user.email:foo@bar.com" --json
```

Flags: `-n`/`--limit` (1-1000, default 25), `-q`/`--query`, `--full` (include stacktraces), `-t`/`--period`, `-c`/`--cursor` (next|prev|first), `--json`, `--fields`

JSON fields: `id`, `event.type`, `groupID`, `eventID`, `projectID`, `message`, `title`, `location`, `culprit`, `user`, `tags`, `platform`, `dateCreated`, `crashFile`, `metadata`

### Releases

```bash
sentry release list --json
sentry release view VERSION --json
sentry release deploys VERSION --json
```

### Monitors (cron)

```bash
sentry monitor list --json
```

### `sentry api` -- raw API proxy

For Discover, stats_v2, sessions, alerts, and any endpoint without a dedicated command. Uses CLI session automatically.

```bash
# source project config
source .claude/skills/vitals-monitor/.env

# stats_v2 -- error volume
sentry api "organizations/$SENTRY_ORG/stats_v2/?field=sum(quantity)&groupBy=outcome&category=error&statsPeriod=7d&interval=1d" --json

# Discover -- slowest endpoints
sentry api "organizations/$SENTRY_ORG/events/?field=transaction&field=count()&field=p95(transaction.duration)&field=failure_rate()&query=event.type:transaction&sort=-p95(transaction.duration)&statsPeriod=24h&per_page=10" --json

# sessions -- crash-free rate
sentry api "organizations/$SENTRY_ORG/sessions/?field=crash_free_rate(session)&field=crash_free_rate(user)&field=sum(session)&statsPeriod=24h&project=-1" --json

# alerts
sentry api "organizations/$SENTRY_ORG/alert-rules/" --json
```

Flags: `-X`/`--method` (GET|POST|PUT|DELETE), `-d`/`--data` (inline JSON body), `-F`/`--field KEY=VALUE`, `-H`/`--header KEY:VALUE`, `--input FILE`, `--silent`, `--verbose`, `-n`/`--dry-run`, `--json`, `--fields`

## API endpoints (for `sentry api`)

Endpoints are relative to `/api/0/` -- do not include the prefix.

### Issues (extended)

- `organizations/{org}/issues/` -- list issues with full query support
  - Params: `query`, `sort` (date|freq|new|trends|user), `statsPeriod`, `start`/`end` (ISO-8601), `project` (-1 for all), `environment`, `limit` (max 100), `cursor`, `expand` (inbox|owners|sessions)
  - Response: array of `{ id, title, count, userCount, firstSeen, lastSeen, status, level, stats, metadata, project, assignedTo, shortId }`

- `organizations/{org}/issues/{issue_id}/` -- issue detail
- `organizations/{org}/issues/{issue_id}/events/?full=true` -- events with stacktrace

### Events

- `projects/{org}/{project}/events/` -- list project error events
  - Params: `statsPeriod`, `start`/`end`, `cursor`, `full`, `sample`

- `projects/{org}/{project}/events/{event_id}/` -- single event detail
  - Returns: `entries` (exceptions, breadcrumbs, request), `contexts`, `tags`, `user`, `release`, `sdk`

### Stats (error/transaction volume)

- `organizations/{org}/stats_v2/` -- volume over time
  - Required: `field` (`sum(quantity)` or `sum(times_seen)`)
  - Params: `groupBy` (outcome|category|reason|project), `statsPeriod`, `interval` (min 1h, max 1d), `start`/`end`, `project`, `category` (error|transaction|attachment|replay|profile|monitor), `outcome` (accepted|filtered|rate_limited|invalid|abuse|client_discard)
  - Response: `{ intervals: [...], groups: [{ by: {...}, totals: {...}, series: {...} }] }`

### Discover queries

The most powerful endpoint. Runs arbitrary queries across errors and transactions.

- `organizations/{org}/events/` -- custom event queries
  - Max 20 `field` params per request
  - Params: `field` (repeatable), `query` (Sentry search syntax), `sort` (prefix `-` for DESC), `per_page` (max 100), `statsPeriod`, `start`/`end`, `project`, `environment`, `dataset` (errors|transactions), `cursor`

Key fields:
- Event: `id`, `title`, `message`, `event.type`, `timestamp`, `level`, `platform`, `project`, `release`, `environment`
- Transaction: `transaction`, `transaction.op`, `transaction.status`, `transaction.duration`
- Error: `error.type`, `error.value`, `error.mechanism`, `error.handled`, `error.unhandled`
- Web Vitals: `measurements.lcp`, `measurements.fcp`, `measurements.cls`, `measurements.fid`, `measurements.fp`, `measurements.ttfb`
- Spans: `spans.browser`, `spans.db`, `spans.http`, `spans.resource`, `spans.ui`
- User: `user.id`, `user.email`, `user.ip`, `user.display`
- HTTP: `http.method`, `http.url`, `http.status_code`
- Geo: `geo.country_code`, `geo.city`, `geo.region`
- Tags: `tag[key]` format

Key functions:
- Count: `count()`, `count_unique(field)`, `count_if(col,op,val)`, `count_miserable(field,threshold)`, `count_web_vitals(vital,threshold)`
- Aggregation: `avg(field)`, `sum(field)`, `min(field)`, `max(field)`
- Percentiles: `p50(field)`, `p75(field)`, `p95(field)`, `p99(field)`, `p100(field)`
- Performance: `apdex(threshold)`, `failure_rate()`, `failure_count()`, `user_misery(threshold)`, `epm()`, `eps()`
- Time: `last_seen()`

### Common Discover queries

```bash
# slowest endpoints by p95
sentry api "organizations/$SENTRY_ORG/events/?field=transaction&field=count()&field=p50(transaction.duration)&field=p95(transaction.duration)&field=failure_rate()&query=event.type:transaction&sort=-p95(transaction.duration)&statsPeriod=24h&per_page=10" --json

# top errors by frequency
sentry api "organizations/$SENTRY_ORG/events/?field=title&field=count()&field=count_unique(user)&field=last_seen()&query=event.type:error&sort=-count()&statsPeriod=24h&per_page=10" --json

# Web Vitals by page
sentry api "organizations/$SENTRY_ORG/events/?field=transaction&field=p75(measurements.lcp)&field=p75(measurements.fcp)&field=p75(measurements.cls)&field=count()&query=event.type:transaction+transaction.op:pageload&sort=-count()&statsPeriod=24h" --json

# throughput and user satisfaction
sentry api "organizations/$SENTRY_ORG/events/?field=transaction&field=epm()&field=apdex(300)&field=user_misery(300)&field=failure_rate()&query=event.type:transaction&sort=-epm()&statsPeriod=24h" --json

# errors by HTTP status code
sentry api "organizations/$SENTRY_ORG/events/?field=http.status_code&field=count()&field=count_unique(user)&query=event.type:error+!http.status_code:\"\"&sort=-count()&statsPeriod=24h" --json
```

### Sessions / release health

- `organizations/{org}/sessions/` -- crash-free rates, session counts
  - Required: `field` (array)
  - Fields: `sum(session)`, `count_unique(user)`, `crash_rate(session)`, `crash_rate(user)`, `crash_free_rate(session)`, `crash_free_rate(user)`, `avg|p50|p75|p90|p95|p99|max(session.duration)`
  - Params: `groupBy` (project|release|environment|session.status), `statsPeriod`, `start`/`end`, `interval`, `project`, `environment`

```bash
# crash-free rate by release
sentry api "organizations/$SENTRY_ORG/sessions/?field=crash_free_rate(session)&field=sum(session)&field=count_unique(user)&groupBy=release&statsPeriod=24h&project=-1" --json

# session status breakdown
sentry api "organizations/$SENTRY_ORG/sessions/?field=sum(session)&groupBy=session.status&statsPeriod=24h" --json

# sessions by environment over 7d
sentry api "organizations/$SENTRY_ORG/sessions/?field=sum(session)&field=crash_free_rate(user)&groupBy=environment&statsPeriod=7d&interval=1d" --json
```

### Releases

- `organizations/{org}/releases/` -- list releases
- `organizations/{org}/releases/{version}/` -- single release
- `organizations/{org}/releases/{version}/deploys/` -- deploys for a release

### Alerts

- `organizations/{org}/alert-rules/` -- metric alert rules
- `projects/{org}/{project}/rules/` -- issue alert rules (per project)

### Source map debugging

- `projects/{org}/{project}/events/{event_id}/source-map-debug/?frame_idx=0&exception_idx=0`
  - Diagnoses source map problems for a specific frame in a specific event

## Web Vitals thresholds (Google)

Measured at p75 per Google's methodology:

| Metric | Good    | Needs Improvement | Poor     |
| ------ | ------- | ----------------- | -------- |
| LCP    | < 2.5s  | 2.5s - 4.0s       | >= 4.0s  |
| FCP    | < 1.8s  | 1.8s - 3.0s       | >= 3.0s  |
| CLS    | < 0.1   | 0.1 - 0.25        | >= 0.25  |
| FID    | < 100ms | 100ms - 300ms     | >= 300ms |
| TTFB   | < 800ms | 800ms - 1.8s      | >= 1.8s  |
