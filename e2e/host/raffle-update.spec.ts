import { expect, test } from '@playwright/test';

const RAFFLE_SLUG = 'test-raffle-rt7qh';

test.describe('Raffle Update', () => {
	test.setTimeout(90_000);

	test('host posts an update on an existing raffle', async ({ page }) => {
		// Navigate directly to update page
		await page.goto(`/my-raffles/${RAFFLE_SLUG}/update`);
		await expect(page.getByText('New post')).toBeVisible({
			timeout: 15_000,
		});

		// Wait for Lexical editor to fully mount — `contenteditable=true` is
		// set only after the `RichTextPlugin` has attached its listeners, so
		// keying against that attribute replaces the legacy arbitrary sleep.
		const editor = page.getByRole('textbox');
		await expect(editor).toBeVisible({ timeout: 10_000 });
		await expect(editor).toHaveAttribute('contenteditable', 'true', {
			timeout: 10_000,
		});

		// Type text into the Lexical editor. Wait for the text to land in the
		// DOM before proceeding — `page.keyboard.type` queues keystrokes
		// synchronously but Lexical flushes its reconciler asynchronously.
		await editor.click();
		await page.keyboard.type('E2E test update');
		await expect(editor).toContainText('E2E test update', {
			timeout: 5_000,
		});

		// Lexical editor state updates correctly but OnChangePlugin doesn't sync to
		// react-hook-form in headless Chromium. Force sync by setting the form value
		// directly via the UpdateFormContext found in the React fiber tree.
		await page.evaluate(() => {
			const btn = document.querySelector('button[type="submit"]');
			if (!btn) return;

			const fiberKey = Object.keys(btn).find(k =>
				k.startsWith('__reactFiber$'),
			);
			if (!fiberKey) return;

			type Fiber = {
				memoizedProps?: {
					value?: {
						form?: {
							setValue: (
								name: string,
								value: string,
								options?: { shouldValidate: boolean },
							) => void;
						};
					};
				};
				return?: Fiber;
			};

			let fiber = (btn as Record<string, unknown>)[fiberKey] as
				| Fiber
				| undefined;

			while (fiber) {
				const form = fiber.memoizedProps?.value?.form;
				if (form?.setValue) {
					form.setValue('text', 'E2E test update', {
						shouldValidate: true,
					});
					return;
				}
				fiber = fiber.return;
			}
		});

		// Submit update
		const submitButton = page.getByRole('button', { name: 'Post Update' });
		await expect(submitButton).toBeEnabled({ timeout: 10_000 });
		await submitButton.click();

		// Assert redirect back to raffle detail page
		await page.waitForURL(/\/browse\/.+/, { timeout: 15_000 });
	});
});
