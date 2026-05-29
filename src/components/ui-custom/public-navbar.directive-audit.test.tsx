import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

import * as preMockNextNavigation from 'next/navigation';

const mockUsePathname = mock<() => string>(() => '/browse');
const mockUseSearchParams = mock<() => URLSearchParams>(
	() => new URLSearchParams(),
);

mock.module('next/navigation', () => ({
	...preMockNextNavigation,
	usePathname: mockUsePathname,
	useSearchParams: mockUseSearchParams,
}));

const { PublicNavbar } = await import('./public-navbar');

afterAll(() => {
	mock.module('next/navigation', () => preMockNextNavigation);
});

function renderGuestNavbar(): string {
	return renderToStaticMarkup(
		<PublicNavbar isAuthenticated={false}>
			<main>Browse content</main>
		</PublicNavbar>,
	);
}

function getSignInAnchor(markup: string): string {
	return (
		markup.match(/<a[^>]*href="\/sign-in[^"]*"[^>]*>Sign In<\/a>/)?.[0] ?? ''
	);
}

describe('PublicNavbar — directive compliance', () => {
	beforeEach(() => {
		mockUsePathname.mockReset();
		mockUseSearchParams.mockReset();
		mockUsePathname.mockReturnValue('/browse');
		mockUseSearchParams.mockReturnValue(new URLSearchParams());
	});

	test('action surfaces use bg-brand-dark token, not raw bg-black (tailwind-v4.md / styling.md)', () => {
		const markup = renderGuestNavbar();
		const signInAnchor = getSignInAnchor(markup);
		expect(signInAnchor).toContain('bg-brand-dark');
		expect(signInAnchor).not.toMatch(/\bbg-black\b/);
	});

	test('borders match the action surface — brand-dark, not raw black (tailwind-v4.md)', () => {
		const markup = renderGuestNavbar();
		const signInAnchor = getSignInAnchor(markup);
		expect(signInAnchor).toContain('border-brand-dark');
		expect(signInAnchor).not.toMatch(/\bborder-black\b/);
	});
});
