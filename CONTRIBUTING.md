# Contributing Guide

Clear, pragmatic workflow for contributing code. Follow this process for features, fixes, chores, and hotfixes.

## Branching Strategy

- Long‑lived branches: `main` (production) and `staging` (staging environment).
- Always branch from `main` for any work (feature, fix, hotfix, chore).
- Open first PR from your feature branch → `staging` (do NOT delete the branch after merging to `staging`).
- After verification on staging, open a second PR from the same branch → `main`.
- No direct commits to `main` or `staging`. PRs only; branches are protected.

Why this flow

- Keeps `main` production‑safe; `staging` is the integration gate.
- Allows iterative staging validation without losing the feature branch.

## Branch Naming

Use lowercase kebab‑case; prefix by type; include a scope (service or lib) and a concise slug.

- `feature/<scope>-<short-desc>` e.g., `feature/quests-validate-milestones`
- `fix/<scope>-<short-desc>` e.g., `fix/draws-partner-auth`
- `hotfix/<scope>-<short-desc>` e.g., `hotfix/onchain-replay-window`
- `chore/<scope>-<short-desc>` e.g., `chore/ci-cache-tuning`
- `docs/<short-desc>` e.g., `docs/wiki-leaderboard-recalc`
- `refactor/<scope>-<short-desc>` e.g., `refactor/lib-redis-cache`
- `test/<scope>-<short-desc>` e.g., `test/streaks-checkin-edge`

Rules

- Allowed: a–z, 0–9, `-`, `/`; keep under ~60 chars.
- Scope: service name (`draws`, `streaks`, `subscriptions`, `onchain-sync`, `quests`, `lib`).

## Commit Messages

- Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `perf:`, `ci:`
- Optional scope: `feat(quests): add validate endpoint`
- Keep body concise; reference issues if applicable.

## Pull Request Flow

1. Prepare branch

- Rebase on latest `main`: `git fetch && git rebase origin/main`
- Ensure quality gates pass locally: `encore test && pnpm check-types && pnpm eslint:fix`

2. PR → staging

- Open PR from `your-branch` to `staging` using the appropriate template.
- Do NOT delete the branch after merge; keep it for the next PR to `main`.
- Staging deploy happens from `staging` merges; validate behavior end‑to‑end.

3. Verify in staging

- Run manual/automated checks; confirm migrations, topics, and config behave as expected.
- Update docs (service README + wiki) if not already done.

4. PR → main

- Open PR from `your-branch` to `main` (link the staging PR for context).
- Rebase onto latest `main` first if there were new changes: `git rebase origin/main`.
- Production deploy happens from `main` merges.

Merge strategy

- Prefer “Squash and merge” for feature branches to keep history clean.
- Keep the feature branch until both PRs (→ staging and → main) are complete; then delete if unused.
