import { redirect } from 'next/navigation';

import { AuthPageShell } from '@/components/auth/page-shell';
import { ForgotPasswordForm } from '@/components/auth/password/forgot-form';
import { getCurrentUser } from '@/lib/auth/session';

/**
 * Forgot Password Page
 *
 * Server Component. Redirects already-authenticated users away before
 * rendering the recovery form.
 * Displays the forgot password form to request a password reset email.
 *
 * Data flow: no props passed to ForgotPasswordForm — it manages its own state
 * and calls the requestPasswordReset server action directly.
 *
 * @returns AuthPageShell wrapping the forgot password form
 */
export default async function ForgotPasswordPage() {
	if (await getCurrentUser()) {
		redirect('/browse');
	}

	return (
		<AuthPageShell>
			<ForgotPasswordForm />
		</AuthPageShell>
	);
}
