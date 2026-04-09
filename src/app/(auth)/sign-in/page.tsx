import { Suspense } from 'react';

import { Spinner } from '@/components/ui/spinner';
import { AuthPageShell } from '../auth-page-shell';
import { SignInForm } from './sign-in-form';

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
 * @returns AuthPageShell wrapping Suspense-bounded sign-in form
 */
export default function LoginPage() {
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
