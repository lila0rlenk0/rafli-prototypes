import { describe, expect, test } from 'bun:test';
import { generateSlugPreview } from './slug-preview';

describe('generateSlugPreview', () => {
	describe('basic slugification', () => {
		test('converts to lowercase', () => {
			const slug = generateSlugPreview('HELLO WORLD');
			expect(slug.startsWith('hello-world-')).toBe(true);
		});

		test('replaces spaces with hyphens', () => {
			const slug = generateSlugPreview('my raffle title');
			expect(slug.startsWith('my-raffle-title-')).toBe(true);
		});

		test('removes special characters', () => {
			const slug = generateSlugPreview('raffle!@#$%');
			expect(slug.startsWith('raffle-')).toBe(true);
		});

		test('removes accents', () => {
			const slug = generateSlugPreview('café résumé');
			expect(slug.startsWith('cafe-resume-')).toBe(true);
		});

		test('collapses multiple hyphens', () => {
			const slug = generateSlugPreview('hello   world');
			expect(slug).not.toContain('--');
		});

		test('trims edge hyphens from base', () => {
			const slug = generateSlugPreview('  hello world  ');
			expect(slug.startsWith('hello-world-')).toBe(true);
		});
	});

	describe('suffix generation', () => {
		test('adds 5-char suffix', () => {
			const slug = generateSlugPreview('test');
			const parts = slug.split('-');
			const suffix = parts[parts.length - 1];
			expect(suffix.length).toBe(5);
		});

		test('suffix is alphanumeric lowercase', () => {
			const slug = generateSlugPreview('any title');
			const parts = slug.split('-');
			const suffix = parts[parts.length - 1];
			expect(suffix).toMatch(/^[a-z0-9]+$/);
		});

		test('same input produces same suffix (deterministic)', () => {
			const slug1 = generateSlugPreview('consistent title');
			const slug2 = generateSlugPreview('consistent title');
			expect(slug1).toBe(slug2);
		});

		test('different inputs produce different suffixes', () => {
			const slug1 = generateSlugPreview('title one');
			const slug2 = generateSlugPreview('title two');
			expect(slug1).not.toBe(slug2);
		});
	});

	describe('edge cases', () => {
		test('handles empty title', () => {
			const slug = generateSlugPreview('');
			expect(slug.length).toBe(5); // just suffix
			expect(slug).toMatch(/^[a-z0-9]+$/);
		});

		test('handles title with only special chars', () => {
			const slug = generateSlugPreview('!@#$%^&*()');
			expect(slug.length).toBe(5); // just suffix
		});

		test('handles very long titles', () => {
			const longTitle = 'a'.repeat(100);
			const slug = generateSlugPreview(longTitle);
			// base is max 50 chars + hyphen + 5 char suffix = max 56
			expect(slug.length).toBeLessThanOrEqual(56);
		});

		test('handles unicode characters', () => {
			const slug = generateSlugPreview('日本語タイトル');
			// should have suffix at least
			expect(slug.length).toBeGreaterThanOrEqual(5);
		});

		test('handles numbers in title', () => {
			const slug = generateSlugPreview('raffle 2024');
			expect(slug.startsWith('raffle-2024-')).toBe(true);
		});

		test('preserves hyphens in title', () => {
			const slug = generateSlugPreview('pre-order raffle');
			expect(slug.startsWith('pre-order-raffle-')).toBe(true);
		});
	});
});
