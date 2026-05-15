#!/bin/bash
# Runs eslint on file just edited or written. Reads Claude tool-input JSON
# on stdin, lints only the changed .ts/.tsx file. Exit 2 blocks Claude until
# lint errors are fixed.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

if [[ "$FILE_PATH" != *.ts ]] && [[ "$FILE_PATH" != *.tsx ]]; then
  exit 0
fi

if [[ "$FILE_PATH" != */src/app/* ]] && \
   [[ "$FILE_PATH" != */src/components/* ]] && \
   [[ "$FILE_PATH" != */src/lib/* ]] && \
   [[ "$FILE_PATH" != */src/services/* ]] && \
   [[ "$FILE_PATH" != */src/providers/* ]] && \
   [[ "$FILE_PATH" != */src/store/* ]] && \
   [[ "$FILE_PATH" != */src/types/* ]] && \
   [[ "$FILE_PATH" != */src/env/* ]] && \
   [[ "$FILE_PATH" != */tests/* ]]; then
  exit 0
fi

# Skip shadcn-managed primitives — vendored, out of scope.
if [[ "$FILE_PATH" == */src/components/ui/* ]]; then
  exit 0
fi

# Skip files outside this project's worktree — cross-repo edits are linted by
# their own repo's hooks. Without this, bunx eslint runs against the FE config
# for BE files and emits "File ignored because outside of base path".
# Guard against an empty $CLAUDE_PROJECT_DIR — the unquoted glob would
# otherwise expand to `/*` and match every absolute path the hook sees.
[ -n "$CLAUDE_PROJECT_DIR" ] || exit 0
case "$FILE_PATH" in
  "$CLAUDE_PROJECT_DIR"/*) ;;
  *) exit 0 ;;
esac

cd "$CLAUDE_PROJECT_DIR" || exit 0
RESULT=$(bunx eslint --max-warnings=0 "$FILE_PATH" 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo "ESLint errors in $FILE_PATH:" >&2
  echo "$RESULT" >&2
  exit 2
fi

exit 0
