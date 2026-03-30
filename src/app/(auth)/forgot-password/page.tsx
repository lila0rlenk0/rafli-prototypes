import { AuthPageShell } from '../auth-page-shell';
import { ForgotPasswordForm } from './forgot-password-form';

/**
 * Forgot Password Page
 *
 * Displays the forgot password form to request a password reset email.
 */
export default function ForgotPasswordPage() {
	return (
		<AuthPageShell>
			<ForgotPasswordForm />
		</AuthPageShell>
	);
}
