import { describe, expect, test } from 'bun:test';

describe('globals.css', () => {
	test('does not force smooth scrolling on html', async () => {
		const css = await Bun.file(
			new URL('./globals.css', import.meta.url),
		).text();
		const htmlRule = css.match(/\n\thtml\s*\{([\s\S]*?)\n\t\}/)?.[1] ?? '';

		expect(htmlRule).toContain('font-size: 16px');
		expect(htmlRule).not.toContain('scroll-behavior: smooth');
	});

	// Tailwind v4 silently drops unknown utilities — a `bg-yellow-pale`
	// class without a matching `--color-yellow-pale` token renders the
	// element transparent. The scheduled-change banner and change-plan
	// dialog both reach for this token, so it must exist in `@theme`.
	test('defines --color-yellow-pale used by the scheduled-change banner', async () => {
		const css = await Bun.file(
			new URL('./globals.css', import.meta.url),
		).text();
		expect(css).toMatch(
			/--color-yellow-pale:\s*(#[0-9a-fA-F]{3,8}|var\(--color-[a-z0-9-]+\));/,
		);
	});
});
