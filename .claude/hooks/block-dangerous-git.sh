#!/usr/bin/env bash
set -euo pipefail

# Fail-closed: if jq missing, block all commands rather than silently allowing.
if ! command -v jq > /dev/null 2>&1; then
  echo "BLOCKED: jq is required for hook evaluation but not found." >&2
  exit 2
fi

INPUT=$(cat)
COMMAND=$(jq -r '.tool_input.command' <<< "$INPUT")

# Strip `git -c key=value ...` prefixes so anchored patterns match
# `git -c foo=bar reset --hard` as `git reset ...`.
NORMALIZED=$(sed -E 's/^git( -c [^ ]+)+ /git /' <<< "$COMMAND")

# Anchored patterns — match only at start so mentions inside heredoc/commit
# bodies don't false-positive.
ANCHORED_PATTERNS=(
  "^git push"
  "^git reset"
  "^git clean -f"
  "^git branch -D"
  "^git checkout --"
  "^git checkout .+ -- "
  "^git restore"
  "^git branch -[dD]"
  "^git stash"
  "^git rebase"
  "^git commit --amend"
  "^git rm"
  "^git gc"
  "^git prune"
  "^git reflog expire"
  "^git update-ref"
  "^git worktree"
)

for pattern in "${ANCHORED_PATTERNS[@]}"; do
  if [[ "$NORMALIZED" =~ $pattern ]]; then
    echo "BLOCKED: '$COMMAND' matches dangerous pattern '$pattern'. The user has prevented you from doing this." >&2
    echo "You must work in the current branch, and only commit." >&2
    exit 2
  fi
done

# Substring patterns — catch dangerous flags buried in compound commands
# (e.g. `foo && git reset --hard`) where anchors can't reach.
SUBSTRING_PATTERNS=(
  "push --force"
  "push --force-with-lease"
  "reset --hard"
  "reset --mixed"
  "reset --soft"
)

for pattern in "${SUBSTRING_PATTERNS[@]}"; do
  if [[ "$COMMAND" =~ $pattern ]]; then
    echo "BLOCKED: '$COMMAND' matches dangerous pattern '$pattern'. The user has prevented you from doing this." >&2
    echo "You must work in the current branch, and only commit." >&2
    exit 2
  fi
done

exit 0
