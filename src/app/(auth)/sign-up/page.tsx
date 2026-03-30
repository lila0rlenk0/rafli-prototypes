import { Suspense } from 'react';

import { AuthPageShell } from '../auth-page-shell';
import { SignUpForm } from './sign-up-form';

/**
 * Sign Up Page
 *
 * Displays the sign-up form with support for email/password and Google OAuth.
 * Form wrapped in Suspense for useSearchParams() compatibility with static generation.
 */
export default function SignUpPage() {
	return (
		<AuthPageShell>
			<Suspense fallback={null}>
				<SignUpForm />
			</Suspense>
		</AuthPageShell>
	);
}
