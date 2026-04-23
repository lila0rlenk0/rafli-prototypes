import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { ReviewRow } from './review-row';

// Static-markup rendering gives us a stable HTML string to assert against.
// This suite exercises the public surface of `ReviewRow` — label/value
// slotting, optional action slot, custom className merge — without pulling
// in a DOM testing library the repo doesn't use elsewhere.
describe('ReviewRow', () => {
	describe('label + value rendering', () => {
		test('renders the label inside a <dt>', () => {
			const markup = renderToStaticMarkup(
				<ReviewRow label="Title">Sunday giveaway</ReviewRow>,
			);
			expect(markup).toContain('<dt');
			expect(markup).toContain('Title');
		});

		test('renders the value children inside a <dd>', () => {
			const markup = renderToStaticMarkup(
				<ReviewRow label="Title">Sunday giveaway</ReviewRow>,
			);
			expect(markup).toContain('<dd');
			expect(markup).toContain('Sunday giveaway');
		});

		test('uses semantic muted-foreground token on the label', () => {
			const markup = renderToStaticMarkup(
				<ReviewRow label="Title">value</ReviewRow>,
			);
			expect(markup).toContain('text-muted-foreground');
		});

		test('uses semantic foreground token on the value', () => {
			const markup = renderToStaticMarkup(
				<ReviewRow label="Title">value</ReviewRow>,
			);
			expect(markup).toContain('text-foreground');
		});
	});

	describe('action slot', () => {
		test('renders the action node when provided', () => {
			const markup = renderToStaticMarkup(
				<ReviewRow label="Title" action={<button type="button">Edit</button>}>
					value
				</ReviewRow>,
			);
			expect(markup).toContain('>Edit</button>');
		});

		test('omits the action wrapper when action is not provided', () => {
			const markup = renderToStaticMarkup(
				<ReviewRow label="Title">value</ReviewRow>,
			);
			expect(markup).not.toContain('<span class="shrink-0"');
		});
	});

	describe('className merge', () => {
		test('forwards custom className to the root element', () => {
			const markup = renderToStaticMarkup(
				<ReviewRow label="Title" className="custom-marker">
					value
				</ReviewRow>,
			);
			expect(markup).toContain('custom-marker');
		});
	});
});
