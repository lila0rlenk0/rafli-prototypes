import { Suspense } from 'react';

import { AuthPageShell } from '@/components/auth/auth-page-shell';
import { SignUpForm } from '@/components/auth/sign-up-form';

/**
 * Sign Up Page
 *
 * Server Component — no data fetching, purely compositional.
 * Displays the sign-up form with support for email/password and Google OAuth.
 *
 * Suspense boundary required: SignUpForm uses useSearchParams (for returnTo query param),
 * which triggers a client-side bailout. Fallback is null because the form renders
 * instantly from the client bundle (no async data to wait for).
 *
 * Data flow: no server-side props. SignUpForm reads returnTo from URL client-side.
 *
 * @returns AuthPageShell wrapping Suspense-bounded sign-up form
 */
export default function SignUpPage() {
	return (
		<AuthPageShell>
			{/* Suspense needed: SignUpForm reads useSearchParams which opts into client rendering */}
			<Suspense fallback={null}>
				<SignUpForm />
			</Suspense>
		</AuthPageShell>
	);
}
