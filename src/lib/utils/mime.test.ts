import { describe, expect, test } from 'bun:test';

import { isImageType } from './mime';

describe('isImageType', () => {
	describe('image MIME types', () => {
		test('returns true for image/jpeg', () => {
			expect(isImageType('image/jpeg')).toBe(true);
		});

		test('returns true for image/png', () => {
			expect(isImageType('image/png')).toBe(true);
		});

		test('returns true for image/webp', () => {
			expect(isImageType('image/webp')).toBe(true);
		});

		test('returns true for image/svg+xml', () => {
			expect(isImageType('image/svg+xml')).toBe(true);
		});
	});

	describe('non-image MIME types', () => {
		test('returns false for application/pdf', () => {
			expect(isImageType('application/pdf')).toBe(false);
		});

		test('returns false for text/plain', () => {
			expect(isImageType('text/plain')).toBe(false);
		});

		test('returns false for empty string', () => {
			expect(isImageType('')).toBe(false);
		});
	});
});
