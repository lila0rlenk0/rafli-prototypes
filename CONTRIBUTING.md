# Contributing Guide

Clear, pragmatic workflow for contributing code. Follow this process for features, fixes, chores, and hotfixes.

## Branching Strategy

- Default branch: `main`.
- Always branch from `main` for any work (feature, fix, hotfix, chore).
- Open PRs from your feature branch → `main`.
- No direct commits to `main`. PRs only; branch is protected.

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
- Ensure quality gates pass locally: `bun run format && bun run lint && bun run test`

2. PR → main

- Open PR from `your-branch` to `main`.
- Production deploy happens from `main` merges.

3. Verify

- Run manual/automated checks; confirm migrations and config behave as expected.
- Update docs if not already done.

Merge strategy

- Prefer “Squash and merge” for feature branches to keep history clean.
- Delete the feature branch after merge.
