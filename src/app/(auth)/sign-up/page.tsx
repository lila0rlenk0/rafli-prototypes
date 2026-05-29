import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { AuthPageShell } from '@/components/auth/page-shell';
import { SignUpForm } from '@/components/auth/sign-up/form';
import { getCurrentUser } from '@/lib/auth/session';
import { validateReturnTo } from '@/lib/utils/routing/validate-return-to';

interface SignUpPageProps {
	searchParams: Promise<{ returnTo?: string | string[] }>;
}

/**
 * Sign Up Page
 *
 * Server Component. Performs the same authoritative `/me` check as sign-in
 * before rendering the client form, so authenticated users do not stay on
 * an auth route after the proxy lets stale-looking cookies through.
 *
 * Suspense boundary required: SignUpForm uses useSearchParams (for returnTo query param),
 * which triggers a client-side bailout. Fallback is null because the form renders
 * instantly from the client bundle (no async data to wait for).
 *
 * Data flow: SignUpForm reads returnTo from URL client-side; the server only
 * uses the query for the authenticated auto-bounce.
 *
 * @returns AuthPageShell wrapping Suspense-bounded sign-up form
 */
export default async function SignUpPage({ searchParams }: SignUpPageProps) {
	if (await getCurrentUser()) {
		const raw = (await searchParams).returnTo;
		const candidate = Array.isArray(raw) ? raw[0] : raw;
		redirect(validateReturnTo(candidate ?? null));
	}

	return (
		<AuthPageShell>
			{/* Suspense needed: SignUpForm reads useSearchParams which opts into client rendering */}
			<Suspense fallback={null}>
				<SignUpForm />
			</Suspense>
		</AuthPageShell>
	);
}
