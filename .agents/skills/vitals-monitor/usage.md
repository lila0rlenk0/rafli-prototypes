# Usage Examples

## Prerequisites

Authenticate both CLIs once (browser flow, tokens auto-refresh):

```bash
vercel login
sentry auth login
```

## General health check

```
/vitals-monitor production 24h
```

## Error spike investigation

```
/vitals-monitor — there's been an error spike in the last 2 hours, investigate what's causing it and cross-reference with recent deployments
```

## Deployment investigation

```
/vitals-monitor — check the latest production deployment, compare error rates before and after, and list any new Sentry issues introduced by it
```

## Performance audit

```
/vitals-monitor — run a performance audit: slowest pages by p95, Web Vitals grades, and any transactions with apdex below 0.9
```

## Targeted log search

```
/vitals-monitor — check Vercel production logs for 5xx errors and timeouts in the last hour, then cross-reference the top errors with Sentry issues to find root causes
```

## Weekly summary

```
/vitals-monitor production 7d — give me a summary: error volume trend vs last week, crash-free rate, top 5 unresolved issues by affected users, and any Web Vitals regressions
```

## Natural language

The skill triggers on keywords like "sentry errors", "vercel stats", "deployment health", "web vitals", "error rate" — so even a natural prompt like `"are there any concerning errors in production?"` will activate it.
