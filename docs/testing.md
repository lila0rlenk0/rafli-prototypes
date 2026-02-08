# Testing Guidelines

## Golden Rules

ALWAYS: Add unit tests for new utility functions
ALWAYS: Add unit tests for new pure logic (validators, formatters, helpers)
ALWAYS: Run `bun run test` before completing tasks
NEVER: Skip tests for business-critical logic (auth, payments, validation)

## Commands

```bash
bun run test              # run all tests
bun test src/lib/utils/   # run specific folder
bun test path/to/file.test.ts  # run specific file
```

## File Naming

Test files must mirror source files with `.test.ts` suffix:

```
src/lib/utils/strip-markdown.ts      -> src/lib/utils/strip-markdown.test.ts
src/lib/utils/validate-return-to.ts  -> src/lib/utils/validate-return-to.test.ts
```

## Test Structure

```typescript
import { describe, expect, test } from 'bun:test';
import { myFunction } from './my-function';

describe('myFunction', () => {
	describe('category of behavior', () => {
		test('specific case description', () => {
			expect(myFunction(input)).toBe(expected);
		});
	});
});
```

## What to Test

Priority order:
1. Security-critical functions (validation, sanitization, auth)
2. Pure utility functions (formatters, parsers, helpers)
3. Business logic (calculations, transformations)

## When to Add Tests

- New utility function in `src/lib/utils/` -> add test
- New validator or formatter -> add test
- Bug fix in existing logic -> add regression test
- Refactoring critical code -> ensure tests exist first
