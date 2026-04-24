#!/bin/bash
# Full project lint at end of turn. Soft nudge — emits systemMessage so
# Claude sees errors but turn is not blocked.

cd "$CLAUDE_PROJECT_DIR" || exit 0

RESULT=$(bun run lint 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  ESCAPED=$(echo "$RESULT" | jq -Rsa .)
  echo "{\"systemMessage\": \"ESLint errors found after edits. Fix them before continuing:\\n${ESCAPED:1:-1}\"}"
  exit 0
fi

exit 0
