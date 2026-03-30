import { Suspense } from 'react';

import { Spinner } from '@/components/ui/spinner';
import { AuthPageShell } from '../auth-page-shell';
import { SignInForm } from './sign-in-form';

/**
 * Sign In Page
 *
 * Displays the sign-in form with support for email/password and Google OAuth.
 * Wraps the form in Suspense because it uses useSearchParams for returnTo handling.
 */
export default function LoginPage() {
	return (
		<AuthPageShell>
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
