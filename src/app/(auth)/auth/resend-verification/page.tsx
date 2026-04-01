import { AuthPageShell } from '../../auth-page-shell';
import { ResendVerificationForm } from './resend-verification-form';

/**
 * Resend Verification Email Page
 *
 * Standalone page where users can request a new verification email.
 * Linked from: verification reminder emails (cron), expired token error state.
 */
export default function ResendVerificationPage() {
	return (
		<AuthPageShell>
			<ResendVerificationForm />
		</AuthPageShell>
	);
}
