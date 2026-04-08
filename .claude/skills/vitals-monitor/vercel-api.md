# Vercel REST API Reference

Base: `https://api.vercel.com`
Auth: `Authorization: Bearer $VERCEL_TOKEN`
Team scope: append `?teamId=$VERCEL_TEAM_ID` to every request (required for team resources)
Rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Deployments

### List deployments

```bash
# recent production deployments
curl -s "https://api.vercel.com/v6/deployments?projectId=$VERCEL_PROJECT_ID&limit=10&target=production&teamId=$VERCEL_TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" | python3 -m json.tool
```

- `GET /v6/deployments`
- Rate limit: 1000/min
- Query params: `projectId`, `state` (BUILDING|ERROR|INITIALIZING|QUEUED|READY|CANCELED), `target` (production|staging), `branch`, `sha`, `limit` (max 100), `from`, `to`, `since`, `until`, `teamId`
- Response: `{ deployments: [{ uid, name, url, state, readyState, created, ready, buildingAt, creator, meta, target, checksState, checksConclusion, errorCode, errorMessage, inspectorUrl }], pagination: { count, next, prev } }`

### Get deployment details

```bash
curl -s "https://api.vercel.com/v13/deployments/dpl_xxx?teamId=$VERCEL_TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" | python3 -m json.tool
```

- `GET /v13/deployments/{idOrUrl}`
- Rate limit: 500/min
- Response includes: `id`, `name`, `url`, `readyState`, `status`, `createdAt`, `buildingAt`, `bootedAt`, `ready`, `errorCode`, `errorMessage`, `alias[]`, `regions[]`, `lambdas[]`, `crons[]`, `functions`, `routes`, `projectSettings` (framework, nodeVersion, buildCommand, speedInsights, webAnalytics), `plan`, `meta` (githubCommitSha, githubCommitMessage, githubCommitRef), `team`, `creator`

### Get deployment events (build + runtime logs)

```bash
# all build logs
curl -s "https://api.vercel.com/v3/deployments/dpl_xxx/events?limit=-1&teamId=$VERCEL_TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" | python3 -m json.tool

# stream live logs (SSE-style)
curl -s -N "https://api.vercel.com/v3/deployments/dpl_xxx/events?follow=1&teamId=$VERCEL_TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN"

# filter by status code
curl -s "https://api.vercel.com/v3/deployments/dpl_xxx/events?statusCode=500&teamId=$VERCEL_TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" | python3 -m json.tool
```

- `GET /v3/deployments/{idOrUrl}/events`
- Rate limit: 60/min -- do not poll aggressively
- Query params: `direction` (forward|backward), `follow` (0|1), `limit` (-1 for all), `since`, `until`, `statusCode`, `builds` (0|1), `teamId`
- Event types: `delimiter`, `command`, `stdout`, `stderr`, `exit`, `deployment-state`, `middleware`, `middleware-invocation`, `edge-function-invocation`, `metric`, `report`, `fatal`
- Each event: `{ type, created, payload: { text, deploymentId, statusCode, requestId, proxy: { method, host, path, statusCode, region, vercelCache, lambdaRegion, responseByteSize, wafAction } } }`
- `vercelCache` values: MISS, HIT, STALE, BYPASS, PRERENDER, REVALIDATED

## Projects

### Get project info

```bash
curl -s "https://api.vercel.com/v9/projects/$VERCEL_PROJECT_ID?teamId=$VERCEL_TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" | python3 -m json.tool
```

- `GET /v9/projects/{idOrName}`
- Response includes: framework, speedInsights config, webAnalytics config, build settings, node version, regions

### List environment variables

```bash
# list env var keys and targets -- values encrypted by default
curl -s "https://api.vercel.com/v9/projects/$VERCEL_PROJECT_ID/env?teamId=$VERCEL_TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" | python3 -m json.tool
```

- `GET /v9/projects/{idOrName}/env`
- Rate limit: 500/min
- Query params: `decrypt` (true to show values, requires permission), `teamId`
- Response: array of `{ key, value, type (plain|encrypted|secret|system), target[], gitBranch, id, createdAt, updatedAt }`

### Get project domains

```bash
curl -s "https://api.vercel.com/v9/projects/$VERCEL_PROJECT_ID/domains?teamId=$VERCEL_TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" | python3 -m json.tool
```

- `GET /v9/projects/{idOrName}/domains`

## Domains

### Get domain DNS config

```bash
curl -s "https://api.vercel.com/v6/domains/example.com/config?teamId=$VERCEL_TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" | python3 -m json.tool
```

- `GET /v6/domains/{domain}/config`
- Rate limit: 500/min

### List DNS records

```bash
curl -s "https://api.vercel.com/v4/domains/example.com/records?teamId=$VERCEL_TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" | python3 -m json.tool
```

- `GET /v4/domains/{domain}/records`

## Checks

### List deployment checks

```bash
curl -s "https://api.vercel.com/v1/deployments/dpl_xxx/checks?teamId=$VERCEL_TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" | python3 -m json.tool
```

- `GET /v1/deployments/{deploymentId}/checks`
- Rate limit: 500/min

## Billing / Usage

### List billing charges

```bash
# usage for a month -- returns JSONL (newline-delimited JSON)
curl -s "https://api.vercel.com/v1/billing/charges?from=2026-01-01&to=2026-01-31&teamId=$VERCEL_TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN"
```

- `GET /v1/billing/charges`
- Query params: `from` (YYYY-MM-DD), `to` (YYYY-MM-DD), `teamId`
- Supports `Accept-Encoding: gzip`
- Response format: JSONL (one JSON object per line)

## Vercel CLI commands

All commands use `--token $VERCEL_TOKEN` for authentication. These are read-only monitoring commands.

### Fetch runtime logs

```bash
# production errors in the last hour, JSON format for parsing
vercel logs --environment production --level error --since 1h --json --token $VERCEL_TOKEN

# 5xx errors specifically
vercel logs --environment production --status-code 5xx --since 1h --json --token $VERCEL_TOKEN

# edge function logs only
vercel logs --environment production --source edge-function --since 1h --json --token $VERCEL_TOKEN

# full-text search
vercel logs --environment production --query "timeout" --since 1h --json --token $VERCEL_TOKEN

# stream live logs (max 5 min per session)
vercel logs --environment production --follow --token $VERCEL_TOKEN
```

Flags: `--follow`/`-f`, `--json`/`-j`, `--level` (error|warning|info|fatal), `--status-code` (500 or 5xx), `--source` (serverless|edge-function|edge-middleware|static), `--query`, `--request-id`, `--environment` (production|preview), `--since`/`--until` (relative like 1h or ISO 8601), `--limit` (default 100), `--expand`, `--deployment`, `--project`, `--branch`

### Inspect a deployment

```bash
# deployment info (state, URL, creator, timestamps, aliases, regions)
vercel inspect dpl_xxx --token $VERCEL_TOKEN

# build logs instead of info
vercel inspect dpl_xxx --logs --token $VERCEL_TOKEN
```

### List deployments

```bash
vercel list my-project --status READY --prod --token $VERCEL_TOKEN
```

Flags: `--status` (READY,BUILDING,ERROR), `--prod`, `--environment`, `--meta`

### List environment variable keys

```bash
vercel env ls production --token $VERCEL_TOKEN
```

## Pagination

- Default page size: 20 items
- Max `limit`: 100
- Response includes `pagination: { count, next, prev }`
- Use `next` value as `from` parameter for the next page
- Cursor-based (timestamp), not offset-based

## Rate limits summary

| Endpoint                 | Limit    |
| ------------------------ | -------- |
| Deployments list         | 1000/min |
| Single deployment        | 500/min  |
| Deployment events (logs) | 60/min   |
| Runtime logs             | 100/min  |
| Request logs             | 240/min  |
| Env var retrieval        | 500/min  |
| Project domains          | 500/min  |
| Domain DNS config        | 500/min  |
| Edge Config reads        | 500/min  |
| Checks                   | 500/min  |
| Log drains               | 100/min  |
| Team retrieval           | 600/min  |
| User retrieval           | 500/min  |

Exceeding any limit returns HTTP 429.
