# Sentry REST API Reference

Base: `https://sentry.io/api/0/`
Auth: `Authorization: Bearer $SENTRY_AUTH_TOKEN`
Pagination: cursor-based via `Link` response header. Parse `cursor` from the `next` URL.
Rate limits: per caller + endpoint, not published numerically. Back off on 429.

## Issues

### List unresolved issues

```bash
# top issues by frequency in the last 24h
curl -s "https://sentry.io/api/0/organizations/$SENTRY_ORG/issues/?query=is:unresolved&sort=freq&statsPeriod=24h&limit=25" \
  -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" | python3 -m json.tool
```

- `GET /organizations/{org}/issues/`
- Scope: `event:read`
- Query params: `query` (default `is:unresolved`), `sort` (date|freq|new|trends|user), `statsPeriod` (24h, 7d, 14d, 30d), `start`/`end` (ISO-8601), `project` (array of IDs, `-1` for all), `environment`, `groupStatsPeriod` (24h|14d|auto), `limit` (max 100), `cursor`, `expand` (inbox|owners|sessions), `collapse` (base|stats|lifetime)
- Response: array of `{ id, title, count, userCount, firstSeen, lastSeen, status, level, stats, metadata, project, assignedTo, shortId }`

### Get issue detail

```bash
curl -s "https://sentry.io/api/0/organizations/$SENTRY_ORG/issues/ISSUE_ID/" \
  -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" | python3 -m json.tool
```

- `GET /organizations/{org}/issues/{issue_id}/`

### List events for an issue

```bash
# with full stacktrace
curl -s "https://sentry.io/api/0/organizations/$SENTRY_ORG/issues/ISSUE_ID/events/?full=true&statsPeriod=7d" \
  -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" | python3 -m json.tool
```

- `GET /organizations/{org}/issues/{issue_id}/events/`
- Query params: `full` (boolean -- include stacktrace), `statsPeriod`, `start`/`end`, `environment`, `query`, `cursor`

## Events

### List project error events

```bash
curl -s "https://sentry.io/api/0/projects/$SENTRY_ORG/$SENTRY_PROJECT/events/?statsPeriod=24h" \
  -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" | python3 -m json.tool
```

- `GET /projects/{org}/{project}/events/`
- Scope: `project:read`
- Query params: `statsPeriod`, `start`/`end`, `cursor`, `full`, `sample`

### Get single event detail

```bash
curl -s "https://sentry.io/api/0/projects/$SENTRY_ORG/$SENTRY_PROJECT/events/EVENT_ID/" \
  -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" | python3 -m json.tool
```

- `GET /projects/{org}/{project}/events/{event_id}/`
- Returns full event: `entries` (exceptions, breadcrumbs, request), `contexts`, `tags`, `user`, `release`, `sdk`

## Stats (error/transaction volume over time)

### Org stats v2

```bash
# error volume over 7 days, daily granularity
curl -s "https://sentry.io/api/0/organizations/$SENTRY_ORG/stats_v2/?field=sum(quantity)&groupBy=outcome&category=error&statsPeriod=7d&interval=1d" \
  -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" | python3 -m json.tool

# transaction volume over 24h, hourly
curl -s "https://sentry.io/api/0/organizations/$SENTRY_ORG/stats_v2/?field=sum(quantity)&groupBy=outcome&category=transaction&statsPeriod=24h&interval=1h" \
  -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" | python3 -m json.tool

# errors grouped by project over 30d
curl -s "https://sentry.io/api/0/organizations/$SENTRY_ORG/stats_v2/?field=sum(quantity)&groupBy=project&category=error&outcome=accepted&statsPeriod=30d&interval=1d" \
  -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" | python3 -m json.tool
```

- `GET /organizations/{org}/stats_v2/`
- Scope: `org:read`
- Required: `field` (`sum(quantity)` or `sum(times_seen)`)
- Query params: `groupBy` (outcome|category|reason|project), `statsPeriod`, `interval` (min 1h, max 1d), `start`/`end`, `project`, `category` (error|transaction|attachment|replay|profile|monitor), `outcome` (accepted|filtered|rate_limited|invalid|abuse|client_discard)
- Response: `{ intervals: [...], groups: [{ by: {...}, totals: {...}, series: {...} }] }`

## Discover queries (custom event queries)

The most powerful endpoint. Runs arbitrary queries across errors and transactions.

### Slowest endpoints (by p95)

```bash
curl -G "https://sentry.io/api/0/organizations/$SENTRY_ORG/events/" \
  --data-urlencode "field=transaction" \
  --data-urlencode "field=count()" \
  --data-urlencode "field=p50(transaction.duration)" \
  --data-urlencode "field=p95(transaction.duration)" \
  --data-urlencode "field=failure_rate()" \
  --data-urlencode "query=event.type:transaction" \
  --data-urlencode "sort=-p95(transaction.duration)" \
  --data-urlencode "statsPeriod=24h" \
  --data-urlencode "per_page=10" \
  -H "Authorization: Bearer $SENTRY_AUTH_TOKEN"
```

### Top errors by frequency

```bash
curl -G "https://sentry.io/api/0/organizations/$SENTRY_ORG/events/" \
  --data-urlencode "field=title" \
  --data-urlencode "field=count()" \
  --data-urlencode "field=count_unique(user)" \
  --data-urlencode "field=last_seen()" \
  --data-urlencode "query=event.type:error" \
  --data-urlencode "sort=-count()" \
  --data-urlencode "statsPeriod=24h" \
  --data-urlencode "per_page=10" \
  -H "Authorization: Bearer $SENTRY_AUTH_TOKEN"
```

### Web Vitals by page

```bash
curl -G "https://sentry.io/api/0/organizations/$SENTRY_ORG/events/" \
  --data-urlencode "field=transaction" \
  --data-urlencode "field=p75(measurements.lcp)" \
  --data-urlencode "field=p75(measurements.fcp)" \
  --data-urlencode "field=p75(measurements.cls)" \
  --data-urlencode "field=count()" \
  --data-urlencode "query=event.type:transaction transaction.op:pageload" \
  --data-urlencode "sort=-count()" \
  --data-urlencode "statsPeriod=24h" \
  -H "Authorization: Bearer $SENTRY_AUTH_TOKEN"
```

### Throughput and user satisfaction

```bash
curl -G "https://sentry.io/api/0/organizations/$SENTRY_ORG/events/" \
  --data-urlencode "field=transaction" \
  --data-urlencode "field=epm()" \
  --data-urlencode "field=apdex(300)" \
  --data-urlencode "field=user_misery(300)" \
  --data-urlencode "field=failure_rate()" \
  --data-urlencode "query=event.type:transaction" \
  --data-urlencode "sort=-epm()" \
  --data-urlencode "statsPeriod=24h" \
  -H "Authorization: Bearer $SENTRY_AUTH_TOKEN"
```

### Errors by HTTP status code

```bash
curl -G "https://sentry.io/api/0/organizations/$SENTRY_ORG/events/" \
  --data-urlencode "field=http.status_code" \
  --data-urlencode "field=count()" \
  --data-urlencode "field=count_unique(user)" \
  --data-urlencode "query=event.type:error !http.status_code:\"\"" \
  --data-urlencode "sort=-count()" \
  --data-urlencode "statsPeriod=24h" \
  -H "Authorization: Bearer $SENTRY_AUTH_TOKEN"
```

### Discover query reference

- `GET /organizations/{org}/events/`
- Scope: `org:read` or `event:read`
- Max 20 `field` params per request
- Query params: `field` (repeatable), `query` (Sentry search syntax), `sort` (must be in field list, prefix `-` for DESC), `per_page` (max 100), `statsPeriod`, `start`/`end`, `project`, `environment`, `dataset` (errors|transactions), `cursor`

Key available fields:
- Event: `id`, `title`, `message`, `event.type`, `timestamp`, `level`, `platform`, `project`, `release`, `environment`
- Transaction: `transaction`, `transaction.op`, `transaction.status`, `transaction.duration`
- Error: `error.type`, `error.value`, `error.mechanism`, `error.handled`, `error.unhandled`
- Web Vitals: `measurements.lcp`, `measurements.fcp`, `measurements.cls`, `measurements.fid`, `measurements.fp`, `measurements.ttfb`
- Spans: `spans.browser`, `spans.db`, `spans.http`, `spans.resource`, `spans.ui`
- User: `user.id`, `user.email`, `user.ip`, `user.display`
- HTTP: `http.method`, `http.url`, `http.status_code`
- Geo: `geo.country_code`, `geo.city`, `geo.region`
- Tags: `tag[key]` format

Key available functions:
- Count: `count()`, `count_unique(field)`, `count_if(col,op,val)`, `count_miserable(field,threshold)`, `count_web_vitals(vital,threshold)`
- Aggregation: `avg(field)`, `sum(field)`, `min(field)`, `max(field)`
- Percentiles: `p50(field)`, `p75(field)`, `p95(field)`, `p99(field)`, `p100(field)`
- Performance: `apdex(threshold)`, `failure_rate()`, `failure_count()`, `user_misery(threshold)`, `epm()`, `eps()`
- Time: `last_seen()`

## Sessions / release health

### Crash-free rate by release

```bash
curl -G "https://sentry.io/api/0/organizations/$SENTRY_ORG/sessions/" \
  --data-urlencode "field=crash_free_rate(session)" \
  --data-urlencode "field=sum(session)" \
  --data-urlencode "field=count_unique(user)" \
  --data-urlencode "groupBy=release" \
  --data-urlencode "statsPeriod=24h" \
  --data-urlencode "project=-1" \
  -H "Authorization: Bearer $SENTRY_AUTH_TOKEN"
```

### Session status breakdown

```bash
curl -G "https://sentry.io/api/0/organizations/$SENTRY_ORG/sessions/" \
  --data-urlencode "field=sum(session)" \
  --data-urlencode "groupBy=session.status" \
  --data-urlencode "statsPeriod=24h" \
  -H "Authorization: Bearer $SENTRY_AUTH_TOKEN"
```

### Sessions by environment

```bash
curl -G "https://sentry.io/api/0/organizations/$SENTRY_ORG/sessions/" \
  --data-urlencode "field=sum(session)" \
  --data-urlencode "field=crash_free_rate(user)" \
  --data-urlencode "groupBy=environment" \
  --data-urlencode "statsPeriod=7d" \
  --data-urlencode "interval=1d" \
  -H "Authorization: Bearer $SENTRY_AUTH_TOKEN"
```

- `GET /organizations/{org}/sessions/`
- Scope: `org:read`
- Required: `field` (array)
- Field options: `sum(session)`, `count_unique(user)`, `crash_rate(session)`, `crash_rate(user)`, `crash_free_rate(session)`, `crash_free_rate(user)`, `avg|p50|p75|p90|p95|p99|max(session.duration)`
- Query params: `groupBy` (project|release|environment|session.status), `statsPeriod`, `start`/`end`, `interval`, `project`, `environment`, `orderBy`, `query`, `includeTotals`, `includeSeries`

## Releases

### List releases

```bash
curl -s "https://sentry.io/api/0/organizations/$SENTRY_ORG/releases/" \
  -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" | python3 -m json.tool
```

- `GET /organizations/{org}/releases/`
- Scope: `project:releases`
- Query params: `query` (starts-with filter on version), `cursor`
- Response: array of `{ version, shortVersion, dateCreated, dateReleased, commitCount, deployCount, firstEvent, lastEvent, newGroups, projects, authors }`

### Get single release

```bash
curl -s "https://sentry.io/api/0/organizations/$SENTRY_ORG/releases/VERSION/" \
  -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" | python3 -m json.tool
```

- `GET /organizations/{org}/releases/{version}/`

### List deploys for a release

```bash
curl -s "https://sentry.io/api/0/organizations/$SENTRY_ORG/releases/VERSION/deploys/" \
  -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" | python3 -m json.tool
```

- `GET /organizations/{org}/releases/{version}/deploys/`

## Alerts

### List metric alert rules

```bash
curl -s "https://sentry.io/api/0/organizations/$SENTRY_ORG/alert-rules/" \
  -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" | python3 -m json.tool
```

- `GET /organizations/{org}/alert-rules/`
- Scope: `alerts:read` or `org:read`
- Response: array of `{ id, name, query, aggregate, timeWindow, triggers, projects, environment, dateCreated }`

### List issue alert rules (per project)

```bash
curl -s "https://sentry.io/api/0/projects/$SENTRY_ORG/$SENTRY_PROJECT/rules/" \
  -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" | python3 -m json.tool
```

- `GET /projects/{org}/{project}/rules/`
- Scope: `alerts:read` or `project:read`
- Response: array of `{ id, name, conditions, filters, actions, frequency, lastTriggered, status }`

## Source map debugging

### Debug source map issues for a specific frame

```bash
curl -s "https://sentry.io/api/0/projects/$SENTRY_ORG/$SENTRY_PROJECT/events/EVENT_ID/source-map-debug/?frame_idx=0&exception_idx=0" \
  -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" | python3 -m json.tool
```

- `GET /projects/{org}/{project}/events/{event_id}/source-map-debug/`
- Required: `frame_idx` (integer), `exception_idx` (integer)
- Scope: `project:read`
- Response: `{ errors: [{ type, message, data }] }` -- describes source map problems for that frame

## Sentry CLI read-only commands

```bash
# list releases
sentry-cli releases list

# release info
sentry-cli releases info VERSION

# list deploys for a release
sentry-cli deploys list --release VERSION

# debug why source maps failed for a specific event
sentry-cli sourcemaps explain EVENT_ID

# propose a version from git
sentry-cli releases propose-version
```

Configure via env vars: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_URL` (defaults to https://sentry.io/)

## Web Vitals thresholds (Google)

These are measured at p75 per Google's methodology:

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP | < 2.5s | 2.5s - 4.0s | >= 4.0s |
| FCP | < 1.8s | 1.8s - 3.0s | >= 3.0s |
| CLS | < 0.1 | 0.1 - 0.25 | >= 0.25 |
| FID | < 100ms | 100ms - 300ms | >= 300ms |
| TTFB | < 800ms | 800ms - 1.8s | >= 1.8s |
