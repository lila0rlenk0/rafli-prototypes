# Vercel Reference

Auth: handled automatically by `vercel` CLI session (`vercel login`).

## CLI commands

### Runtime logs

```bash
# production errors in the last hour, JSON format
vercel logs --environment production --level error --since 1h --json --no-follow

# 5xx errors specifically
vercel logs --environment production --status-code 5xx --since 1h --json --no-follow

# edge function logs only
vercel logs --environment production --source edge-function --since 1h --json --no-follow

# full-text search
vercel logs --environment production --query "timeout" --since 1h --json --no-follow

# specific deployment logs
vercel logs dpl_xxx --json --no-follow

# stream live logs (use sparingly -- max 5 min per session)
vercel logs --environment production --follow
```

Flags: `--follow`/`-f`, `--json`/`-j`, `--level` (error|warning|info|fatal), `--status-code` (500 or 5xx), `--source` (serverless|edge-function|edge-middleware|static), `--query`, `--search` (advanced filter syntax: `"status:500 error"`), `--request-id`, `--environment` (production|preview), `--since`/`--until` (relative like 1h/30m or ISO 8601), `--limit` (default 100), `--expand`, `--deployment`, `--project`, `--branch`, `--no-branch`, `--no-follow`

### Inspect a deployment

```bash
# deployment info (state, URL, creator, timestamps, aliases, regions)
vercel inspect dpl_xxx --format json

# build logs instead of info
vercel inspect dpl_xxx --logs

# wait for in-progress deployment
vercel inspect dpl_xxx --wait --timeout 90s
```

### List deployments

```bash
# production deployments
vercel ls --environment production

# filter by status
vercel ls --status READY

# multiple statuses
vercel ls --status BUILDING,ERROR

# JSON output
vercel ls -F json
```

Flags: `--status` (READY,BUILDING,ERROR), `--environment` (production|preview), `--meta KEY=VALUE`, `-F json` (format), `--all` (across all projects), `--next <cursor>` (pagination)

### Environment variables

```bash
# list env var keys for production
vercel env ls production
```

### `vercel api` -- raw API proxy

For any endpoint without a dedicated CLI command. Uses the CLI session automatically.

```bash
# get project info
vercel api /v9/projects/prj_xxx --raw

# list deployments with filters
vercel api "/v6/deployments?projectId=prj_xxx&limit=5&target=production" --raw

# deployment checks
vercel api "/v1/deployments/dpl_xxx/checks" --raw

# deployment events (build + runtime logs)
vercel api "/v3/deployments/dpl_xxx/events?limit=-1" --raw

# domain DNS config
vercel api "/v6/domains/example.com/config" --raw

# paginate through all results
vercel api "/v6/deployments?projectId=prj_xxx" --paginate --raw
```

Flags: `-X`/`--method` (GET|POST|PUT|DELETE), `-F`/`--field KEY=VALUE`, `-H`/`--header KEY:VALUE`, `--input FILE`, `--raw` (raw JSON, no pretty-printing), `--paginate`, `--silent`, `--verbose`, `--generate=curl` (preview as curl command)

## API endpoints (for `vercel api`)

### Deployments

- `GET /v6/deployments` -- list deployments
  - Params: `projectId`, `state` (BUILDING|ERROR|INITIALIZING|QUEUED|READY|CANCELED), `target` (production|staging), `branch`, `sha`, `limit` (max 100), `from`, `to`, `since`, `until`
  - Response: `{ deployments: [{ uid, name, url, state, readyState, created, ready, buildingAt, creator, meta, target, checksState, checksConclusion, errorCode, errorMessage, inspectorUrl }], pagination: { count, next, prev } }`

- `GET /v13/deployments/{idOrUrl}` -- deployment details
  - Response includes: `id`, `name`, `url`, `readyState`, `status`, `createdAt`, `buildingAt`, `bootedAt`, `ready`, `errorCode`, `errorMessage`, `alias[]`, `regions[]`, `lambdas[]`, `crons[]`, `functions`, `routes`, `projectSettings`, `plan`, `meta` (githubCommitSha, githubCommitMessage, githubCommitRef), `team`, `creator`

- `GET /v3/deployments/{idOrUrl}/events` -- build + runtime logs
  - Params: `direction` (forward|backward), `follow` (0|1), `limit` (-1 for all), `since`, `until`, `statusCode`, `builds` (0|1)
  - Event types: `delimiter`, `command`, `stdout`, `stderr`, `exit`, `deployment-state`, `middleware`, `middleware-invocation`, `edge-function-invocation`, `metric`, `report`, `fatal`
  - Each event: `{ type, created, payload: { text, deploymentId, statusCode, requestId, proxy: { method, host, path, statusCode, region, vercelCache, lambdaRegion } } }`

### Projects

- `GET /v9/projects/{idOrName}` -- project info (framework, regions, build settings)
- `GET /v9/projects/{idOrName}/env` -- environment variables (keys + targets, values encrypted)
- `GET /v9/projects/{idOrName}/domains` -- project domains

### Checks

- `GET /v1/deployments/{deploymentId}/checks` -- deployment checks status

### Billing

- `GET /v1/billing/charges` -- usage for a month (JSONL format)
  - Params: `from` (YYYY-MM-DD), `to` (YYYY-MM-DD)

## Pagination

- Default page size: 20 items, max `limit`: 100
- Response: `pagination: { count, next, prev }`
- Use `next` value as `from` parameter for the next page
- Or use `vercel api --paginate` to auto-paginate

## Rate limits

| Endpoint                 | Limit    |
| ------------------------ | -------- |
| Deployments list         | 1000/min |
| Single deployment        | 500/min  |
| Deployment events (logs) | 60/min   |
| Runtime logs             | 100/min  |
| Env var retrieval        | 500/min  |
| Checks                   | 500/min  |

Exceeding any limit returns HTTP 429.
