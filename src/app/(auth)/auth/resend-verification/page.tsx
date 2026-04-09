import { AuthPageShell } from '../../auth-page-shell';
import { ResendVerificationForm } from './resend-verification-form';

/**
 * Resend Verification Email Page
 *
 * Server Component — no data fetching, purely compositional.
 * Standalone page where users can request a new verification email.
 * Linked from: verification reminder emails (cron), expired token error state.
 *
 * Data flow: no props passed to ResendVerificationForm — it manages its own
 * form state and calls the resendVerificationEmail server action directly.
 *
 * @returns AuthPageShell wrapping the resend verification form
 */
export default function ResendVerificationPage() {
	return (
		<AuthPageShell>
			<ResendVerificationForm />
		</AuthPageShell>
	);
}
