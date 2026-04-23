import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { AuthPageShell } from '@/components/auth/page-shell';
import { SignInForm } from '@/components/auth/sign-in/form';
import { Spinner } from '@/components/ui/spinner';
import { getCurrentUser } from '@/lib/auth/session';
import { validateReturnTo } from '@/lib/utils/routing/validate-return-to';

interface LoginPageProps {
	// Next.js 15 passes searchParams as a promise for sync I/O boundaries.
	searchParams: Promise<{ returnTo?: string | string[] }>;
}

/**
 * Sign In Page
 *
 * Server Component — no data fetching, purely compositional.
 * Displays the sign-in form with support for email/password, magic link, and Google OAuth.
 *
 * Suspense boundary required: SignInForm uses useSearchParams (for returnTo query param),
 * which triggers a client-side bailout. The Spinner fallback is shown while the client
 * bundle loads and searchParams become available.
 *
 * Data flow: no server-side props. SignInForm reads returnTo from URL client-side
 * and calls server actions (signInUser, sendMagicLink, initiateSocialSignIn) directly.
 *
 * Transient-backend behavior: with valid cookies, `getCurrentUser` still
 * requires a successful `/me` tri-state `ok` (see `fetch-me-with-bearer.ts`).
 * If `/me` is still failing on this request, the user sees the form even
 * though cookies were not evicted. When `/me` succeeds again, this check
 * returns a user and we redirect (honoring validated `returnTo`) — so a
 * refresh after the backend recovers can bounce without a full sign-in.
 * Real `unauthorized` paths evict cookies upstream, so the form is correct.
 * `getCurrentUser` and `getSession` are React-cached, so a single pass does
 * not double-call `/me`.
 *
 * @returns AuthPageShell wrapping Suspense-bounded sign-in form
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
	if (await getCurrentUser()) {
		// Honor `returnTo` on the auto-bounce so users redirected here by a
		// transient `/me` blip land back where they started. `validateReturnTo`
		// rejects absolute/protocol-relative/javascript URLs — required
		// guard since the query param is attacker-controlled.
		const raw = (await searchParams).returnTo;
		const candidate = Array.isArray(raw) ? raw[0] : raw;
		redirect(validateReturnTo(candidate ?? null));
	}
	return (
		<AuthPageShell>
			{/* Suspense needed: SignInForm reads useSearchParams which opts into client rendering */}
			<Suspense
				fallback={
					<div className="flex items-center justify-center">
						<Spinner />
					</div>
				}
			>
				<SignInForm />
			</Suspense>
		</AuthPageShell>
	);
}
