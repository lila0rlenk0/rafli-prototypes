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

describe('PublicNavbar', () => {
	beforeEach(() => {
		mockUsePathname.mockReset();
		mockUseSearchParams.mockReset();
		mockUsePathname.mockReturnValue('/browse');
		mockUseSearchParams.mockReturnValue(new URLSearchParams());
	});

	test('points guest sign-in at the current page return path', () => {
		mockUseSearchParams.mockReturnValue(
			new URLSearchParams('sort=ending-soon'),
		);

		const markup = renderGuestNavbar();

		expect(markup).toContain(
			'href="/sign-in?returnTo=%2Fbrowse%3Fsort%3Dending-soon"',
		);
	});

	test('renders guest sign-in through the shared button variant', () => {
		const markup = renderGuestNavbar();
		const signInAnchor = getSignInAnchor(markup);

		expect(signInAnchor).toContain('data-slot="button"');
		expect(signInAnchor).toContain('data-variant="default"');
		expect(signInAnchor).toContain('bg-brand-dark');
		expect(signInAnchor).toContain('text-white');
		expect(signInAnchor).toContain('hover:bg-white');
		expect(signInAnchor).toContain('hover:text-brand-dark');
	});
});
