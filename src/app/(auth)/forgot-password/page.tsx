import { AuthPageShell } from '@/components/auth/page-shell';
import { ForgotPasswordForm } from '@/components/auth/password/forgot-form';

/**
 * Forgot Password Page
 *
 * Server Component — no data fetching, purely compositional.
 * Displays the forgot password form to request a password reset email.
 *
 * Data flow: no props passed to ForgotPasswordForm — it manages its own state
 * and calls the requestPasswordReset server action directly.
 *
 * @returns AuthPageShell wrapping the forgot password form
 */
export default function ForgotPasswordPage() {
	return (
		<AuthPageShell>
			<ForgotPasswordForm />
		</AuthPageShell>
	);
}
