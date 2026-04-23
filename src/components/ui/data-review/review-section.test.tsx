import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { ReviewSection } from './review-section';

// Static-markup rendering keeps this suite dependency-light — we only
// assert on the serialized output, never on event dispatch. The click
// handler path is covered by the wizard + verification E2E specs that
// consume this primitive.
describe('ReviewSection', () => {
	describe('title + description', () => {
		test('renders the title', () => {
			const markup = renderToStaticMarkup(
				<ReviewSection title="Basic info">child</ReviewSection>,
			);
			expect(markup).toContain('Basic info');
		});

		test('renders the description when provided', () => {
			const markup = renderToStaticMarkup(
				<ReviewSection title="Basic info" description="Review before submit">
					child
				</ReviewSection>,
			);
			expect(markup).toContain('Review before submit');
		});

		test('omits the description node when not provided', () => {
			const markup = renderToStaticMarkup(
				<ReviewSection title="Basic info">child</ReviewSection>,
			);
			expect(markup).not.toContain('data-slot="card-description"');
		});
	});

	describe('children slot', () => {
		test('wraps children in a <dl> so nested ReviewRow <dt>/<dd> pairs are valid', () => {
			const markup = renderToStaticMarkup(
				<ReviewSection title="Basic info">
					<span data-test="row">row</span>
				</ReviewSection>,
			);
			expect(markup).toContain('<dl');
			expect(markup).toContain('data-test="row"');
		});
	});

	describe('edit button', () => {
		test('renders the edit button when onEdit is provided', () => {
			function handleEdit() {
				// -- no-op: handler presence is the behavioral contract here.
			}
			const markup = renderToStaticMarkup(
				<ReviewSection title="Basic info" onEdit={handleEdit}>
					child
				</ReviewSection>,
			);
			expect(markup).toContain('Edit');
			expect(markup).toContain('aria-label="Edit Basic info"');
		});

		test('omits the edit button when onEdit is not provided', () => {
			const markup = renderToStaticMarkup(
				<ReviewSection title="Basic info">child</ReviewSection>,
			);
			expect(markup).not.toContain('aria-label="Edit Basic info"');
		});

		test('uses the inline-start icon slot so shadcn Button sizes the Pencil', () => {
			function handleEdit() {
				// -- no-op
			}
			const markup = renderToStaticMarkup(
				<ReviewSection title="Basic info" onEdit={handleEdit}>
					child
				</ReviewSection>,
			);
			expect(markup).toContain('data-icon="inline-start"');
		});
	});

	describe('className merge', () => {
		test('forwards custom className to the root Card', () => {
			const markup = renderToStaticMarkup(
				<ReviewSection title="Basic info" className="custom-marker">
					child
				</ReviewSection>,
			);
			expect(markup).toContain('custom-marker');
		});
	});
});
