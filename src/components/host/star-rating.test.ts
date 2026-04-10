import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Regression guard for commit 6436d6e ("refactor: extract shared helpers").
//
// Before the unification, `star-rating.tsx` was a shared module (no directive)
// and the interactive variant lived in a separate `'use client'` file. The
// refactor consolidated them into a single file and hoisted `'use client'` to
// the top, which forces the *display* mode across the RSC boundary for every
// caller — including Server Components like `HostProfileCard` and the public
// host profile page (`/host/[username]`), shipping unused React + useState JS
// to every request.
//
// This test asserts the architectural contract: the file exporting the
// display-mode entry point must NOT be a Client Component module. The
// interactive variant (which legitimately needs `useState` for hover) lives
// in a sibling file that Server Components never reach.
describe('star-rating module boundary', () => {
	test("display entry point must not be marked 'use client'", () => {
		const source = readFileSync(
			join(import.meta.dir, 'star-rating.tsx'),
			'utf-8',
		);

		// Find the first non-blank, non-comment line — that's the position a
		// directive would occupy. Comment-stripping handles docblocks above
		// the directive (unusual but legal).
		const firstDirective = source
			.split('\n')
			.map(line => line.trim())
			.find(
				line =>
					line.length > 0 &&
					!line.startsWith('//') &&
					!line.startsWith('/*') &&
					!line.startsWith('*'),
			);

		expect(firstDirective).not.toBe("'use client';");
	});
});
