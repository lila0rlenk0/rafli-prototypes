import { describe, expect, test } from 'bun:test';

import { normalizeEditorMarkdown } from './normalize-markdown';

/**
 * Normalization tests for Lexical-exported markdown.
 *
 * Regression origin: a prod raffle description rendered `**` literally on a
 * bullet ending `...from Singapore&#32;**🇸🇬`. Lexical encodes the trailing
 * space inside the bold run as `&#32;`; CommonMark then refuses to close the
 * emphasis because an emoji (here a regional-indicator flag) is not treated as
 * punctuation. These lock in the surgical fix without disturbing runs that
 * happen to render correctly.
 */
describe('normalizeEditorMarkdown', () => {
	test('swaps inside-edge space past a bold closer followed by a flag emoji', () => {
		// The entity moves outside the delimiter so the run closes; react-markdown
		// then decodes &#32; to a space in the rendered output.
		const input =
			'- **All products are sealed and shipped from Singapore&#32;**🇸🇬';
		expect(normalizeEditorMarkdown(input)).toBe(
			'- **All products are sealed and shipped from Singapore**&#32;🇸🇬',
		);
	});

	test('handles a pictographic emoji closer the same way', () => {
		expect(normalizeEditorMarkdown('**hot&#32;**🔥')).toBe('**hot**&#32;🔥');
	});

	test('preserves multiple encoded spaces in order', () => {
		expect(normalizeEditorMarkdown('**x&#32;&#32;**🔥')).toBe(
			'**x**&#32;&#32;🔥',
		);
	});

	test('leaves keycap-digit runs untouched (digit is not an emoji here)', () => {
		// `**Pack&#32;**1️⃣**: ...**` renders bold via delimiter pairing around the
		// keycap; touching it would expose the emoji-adjacency and break the run.
		const input = '**Pack&#32;**1️⃣**: Mega Evolution Booster Bundle**';
		expect(normalizeEditorMarkdown(input)).toBe(input);
	});

	test('leaves end-of-line entity closers untouched', () => {
		// The trailing `;` keeps this valid at EOL; decoding would break it.
		const input = '**Pokemon TCG Mega Bundle. 3 Sealed Packs.&#32;**';
		expect(normalizeEditorMarkdown(input)).toBe(input);
	});

	test('leaves an entity that sits after a closing delimiter untouched', () => {
		const input = '**Winner and Delivery.**&#32;Every winner receives:';
		expect(normalizeEditorMarkdown(input)).toBe(input);
	});

	test('does not break an emoji-led bold run', () => {
		expect(normalizeEditorMarkdown('see **🔥hot**')).toBe('see **🔥hot**');
	});

	test('is a no-op on content with no encoded inside-edge whitespace', () => {
		const input = 'Fully insured shipping **paid by the winner**';
		expect(normalizeEditorMarkdown(input)).toBe(input);
	});
});
