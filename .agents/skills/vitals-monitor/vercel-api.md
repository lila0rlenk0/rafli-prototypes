# Vercel Reference

Auth: handled automatically by `vercel` CLI session (`vercel login`).

Project auto-detected from `.vercel/project.json`. Run `vercel link` in the project root if missing.

## `vercel logs` -- the primary observability tool

`vercel logs` is the main entrypoint for runtime observability. Defaults: last 24h of request logs for the linked project and current git branch, up to 100 entries. No `--follow` = historical request logs (does not block).

### Flag reference (exact, from docs)

| Flag            | Shorthand | Values                                                           | Notes                                                   |
| --------------- | --------- | ---------------------------------------------------------------- | ------------------------------------------------------- |
| `--follow`      | `-f`      | (boolean)                                                        | Live stream. Caps at 5 min per session. Blocking.       |
| `--no-follow`   |           | (boolean)                                                        | Disables auto-follow when a deployment arg is passed.   |
| `--json`        | `-j`      | (boolean)                                                        | JSON Lines output. Pipe to `jq`.                        |
| `--expand`      | `-x`      | (boolean)                                                        | Show full message (stack traces) instead of truncating. |
| `--limit`       | `-n`      | integer                                                          | Default 100.                                            |
| `--level`       |           | `error` \| `warning` \| `info` \| `fatal`                        | Repeatable (`--level error --level warning`).           |
| `--status-code` |           | specific code or wildcard (`500`, `5xx`, `4xx`)                  | Filter by HTTP status.                                  |
| `--source`      |           | `serverless` \| `edge-function` \| `edge-middleware` \| `static` | Repeatable.                                             |
| `--query`       | `-q`      | string                                                           | Full-text search across log messages.                   |
| `--request-id`  |           | `req_xxx`                                                        | Pull all logs for one request.                          |
| `--environment` |           | `production` \| `preview`                                        | Environment filter.                                     |
| `--since`       |           | relative (`1h`, `30m`) or ISO-8601                               | Default: 24h ago.                                       |
| `--until`       |           | relative or ISO-8601                                             | Default: now. Combine with `--since` for windows.       |
| `--branch`      | `-b`      | branch name                                                      | Auto-detects current branch. Use `--no-branch` for all. |
| `--no-branch`   |           | (boolean)                                                        | Disables branch auto-filter.                            |
| `--deployment`  | `-d`      | `dpl_xxx` or URL                                                 | Scope to one deployment.                                |
| `--project`     | `-p`      | project ID or name                                               | Override linked project.                                |

### Recipes

```bash
# historical error + warning logs, last hour, expanded
vercel logs --environment production --level error --level warning --since 1h --expand

# 5xx in production, JSON for piping
vercel logs --environment production --status-code 5xx --since 1h --json

# one specific status code
vercel logs --environment production --status-code 500 --since 1h --json

# full-text search for a known error string
vercel logs --environment production --query "Cannot read properties of undefined" --since 1h --expand

# all logs for a single request ID (from an error report / alert payload)
vercel logs --request-id req_xxxxx --expand

# edge function logs only, preview environment
vercel logs --environment preview --source edge-function --since 1h --json

# multiple sources
vercel logs --source edge-function --source edge-middleware --since 30m --json

# specific deployment (disable auto-follow when a deployment is passed)
vercel logs --deployment dpl_xxx --no-follow --json

# time window (errors between 2h and 1h ago)
vercel logs --environment production --status-code 500 --since 2h --until 1h

# stream live (use sparingly -- 5 min cap)
vercel logs --environment production --follow
```

### JSON fields (per line)

Emitted by `--json` as JSON Lines (one JSON object per line). Typical fields — structure mirrors the dashboard's runtime logs:

- `timestamp`, `level` (`info`|`warning`|`error`|`fatal`), `message`
- `requestId`, `requestPath`, `route` (pattern, e.g. `/blog/[slug]`)
- `method`, `status`, `host`, `environment`, `branch`
- `deployment`, `deploymentId`
- `resource` (`function`|`middleware`|`cache`|`rewrite`|`redirect`)
- `requestType` (`api`|`ssr`|`isr`|`ppr`|`rsc`|`cron`)
- `cache` (`HIT`|`MISS`|`STALE`|`PRERENDER`)
- `sessionId`, `traceId`, `invocationId` (for distributed tracing correlation)
- `function` metadata: name, location, runtime, duration, memory, start type

Use `jq` to reshape:

```bash
# top error paths in last hour
vercel logs --environment production --level error --since 1h --json \
  | jq -r '.requestPath' | sort | uniq -c | sort -rn | head -10

# group 5xx by route pattern
vercel logs --environment production --status-code 5xx --since 1h --json \
  | jq -r '.route' | sort | uniq -c | sort -rn

# extract message + path + timestamp
vercel logs --environment production --status-code 500 --since 1h --json \
  | jq '{path: .requestPath, message: .message, timestamp: .timestamp, requestId: .requestId}'
```

### Log level mapping

How `console.*` maps to Vercel log levels (informs what `--level` filters catch):

| Source                     | Streaming functions | Non-streaming functions |
| -------------------------- | ------------------- | ----------------------- |
| `stdout` (`console.log`)   | `info`              | `info`                  |
| `stderr` (`console.error`) | `error`             | `error`                 |
| `console.warn`             | `warning`           | `error`                 |

Implicit levels from status: `4xx` → warning, `5xx` → error.

### Runtime log limits (per-request, enforced by Vercel)

- Max 256 log lines per request
- Max 256 KB per line
- Max 1 MB total per request

If a function exceeds these, older lines are dropped and only the most recent are queryable. Important when debugging loops / chatty logs.

### Retention (plan-dependent)

| Plan                            | Retention |
| ------------------------------- | --------- |
| Hobby                           | 1 hour    |
| Pro                             | 1 day     |
| Pro + Observability Plus        | 30 days   |
| Enterprise                      | 3 days    |
| Enterprise + Observability Plus | 30 days   |

If `vercel logs` returns empty for a valid time window, the logs have fallen outside retention. Check plan first.

### Rate limits for `vercel logs`

100 req/min against the runtime logs backend. Polling more aggressively returns 429.

## `vercel inspect` -- deployment introspection

```bash
# deployment info as JSON (state, URL, creator, timestamps, aliases, regions, git metadata)
vercel inspect dpl_xxx --format json

# build logs (useful when a deployment shipped but broke at build-time warnings)
vercel inspect dpl_xxx --logs

# wait for in-progress deployment
vercel inspect dpl_xxx --wait --timeout 90s
```

## `vercel ls` / `vercel list` -- list deployments

```bash
# production deployments
vercel ls --environment production

# filter by status
vercel ls --status READY
vercel ls --status BUILDING,ERROR

# JSON output
vercel ls -F json
```

Flags: `--status` (READY,BUILDING,ERROR,CANCELED,INITIALIZING,QUEUED), `--environment` (production|preview), `--meta KEY=VALUE`, `-F json`, `--all`, `--next <cursor>`.

## `vercel env ls` -- env var keys (read-only)

```bash
# list env var keys for production (values are encrypted and NOT returned)
vercel env ls production
```

## `vercel api` -- raw API proxy

For endpoints without a dedicated CLI command. Uses CLI session automatically.

```bash
# project info
vercel api /v9/projects/prj_xxx --raw

# list deployments with filters
vercel api "/v6/deployments?projectId=prj_xxx&limit=5&target=production" --raw

# deployment checks
vercel api "/v1/deployments/dpl_xxx/checks" --raw

# deployment events (build + runtime logs)
vercel api "/v3/deployments/dpl_xxx/events?limit=-1" --raw

# auto-paginate
vercel api "/v6/deployments?projectId=prj_xxx" --paginate --raw
```

Flags: `-X`/`--method`, `-F`/`--field`, `-H`/`--header`, `--input FILE`, `--raw`, `--paginate`, `--silent`, `--verbose`, `--generate=curl`.

## API endpoints (for `vercel api`)

### Deployments

- `GET /v6/deployments` -- list
  - Params: `projectId`, `state` (BUILDING|ERROR|INITIALIZING|QUEUED|READY|CANCELED), `target` (production|staging), `branch`, `sha`, `limit` (max 100), `from`, `to`, `since`, `until`
  - Response: `{ deployments: [{ uid, name, url, state, readyState, created, ready, buildingAt, creator, meta, target, checksState, checksConclusion, errorCode, errorMessage, inspectorUrl }], pagination: { count, next, prev } }`

- `GET /v13/deployments/{idOrUrl}` -- full detail
  - Response: `id`, `name`, `url`, `readyState`, `status`, `createdAt`, `buildingAt`, `bootedAt`, `ready`, `errorCode`, `errorMessage`, `alias[]`, `regions[]`, `lambdas[]`, `crons[]`, `functions`, `routes`, `projectSettings`, `plan`, `meta` (githubCommitSha, githubCommitMessage, githubCommitRef), `team`, `creator`

- `GET /v3/deployments/{idOrUrl}/events` -- build + runtime log events
  - Params: `direction` (forward|backward), `follow` (0|1), `limit` (-1 for all), `since`, `until`, `statusCode`, `builds` (0|1)
  - Event types: `delimiter`, `command`, `stdout`, `stderr`, `exit`, `deployment-state`, `middleware`, `middleware-invocation`, `edge-function-invocation`, `metric`, `report`, `fatal`

### Projects

- `GET /v9/projects/{idOrName}` -- project info
- `GET /v9/projects/{idOrName}/env` -- env keys (values encrypted)
- `GET /v9/projects/{idOrName}/domains` -- domains

### Checks

- `GET /v1/deployments/{deploymentId}/checks` -- checks status

### Drains (READ ONLY -- never mutate)

- `GET /v1/integrations/log-drains` -- list configured log drains for the team/project
- `GET /v2/integrations/log-drains/{id}` -- single drain detail

Drains forward logs, traces, speed insights, and analytics to external systems (Dash0, Datadog, S3, custom HTTPS endpoints). They are a write-side concern — only listing them is in scope for this skill, so the user can confirm an external sink exists.

### Billing

- `GET /v1/billing/charges` -- monthly usage (JSONL format)
  - Params: `from` (YYYY-MM-DD), `to` (YYYY-MM-DD)

## Pagination

- Default page size 20, max `limit` 100
- Response: `pagination: { count, next, prev }`
- Use `next` as `from` for the next page, or `vercel api --paginate` to auto-paginate

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

## Out of scope (write commands -- skill is READ ONLY)

These exist and are documented by Vercel; the skill must never invoke them. Name them only when advising the user they may want to run them manually.

- `vercel deploy`, `vercel deploy --prod`
- `vercel rollback`, `vercel rollback status`
- `vercel promote`, `vercel redeploy`
- `vercel remove`
- `vercel env add` / `vercel env rm` / `vercel env pull`
- `vercel domains add` / `vercel domains rm` / `vercel alias`
- `vercel bisect` (it modifies deployment aliasing during bisection)
- `vercel git connect` / `vercel link` (link is acceptable only on first setup, ask first)

If investigation reveals a bad deploy, stop and tell the user to run `vercel rollback` themselves.
