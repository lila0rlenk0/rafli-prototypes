import { describe, expect, test } from 'bun:test';

import { getPdfPreviewUrl, isImageType, isPdfType } from './mime';

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

		test('returns true for image type with MIME parameters', () => {
			expect(isImageType('image/jpeg; charset=utf-8')).toBe(true);
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

describe('isPdfType', () => {
	test('returns true for application/pdf', () => {
		expect(isPdfType('application/pdf')).toBe(true);
	});

	test('returns true for uppercase PDF MIME with parameters', () => {
		expect(isPdfType('Application/PDF; charset=utf-8')).toBe(true);
	});

	test('returns false for non-pdf MIME types', () => {
		expect(isPdfType('image/jpeg')).toBe(false);
	});
});

describe('getPdfPreviewUrl', () => {
	test('appends the preview hash parameters', () => {
		expect(getPdfPreviewUrl('https://example.com/file.pdf')).toBe(
			'https://example.com/file.pdf#toolbar=0&navpanes=0&scrollbar=0&view=FitH',
		);
	});

	test('replaces any existing hash to avoid conflicting viewer options', () => {
		expect(getPdfPreviewUrl('https://example.com/file.pdf#toolbar=1')).toBe(
			'https://example.com/file.pdf#toolbar=0&navpanes=0&scrollbar=0&view=FitH',
		);
	});
});
