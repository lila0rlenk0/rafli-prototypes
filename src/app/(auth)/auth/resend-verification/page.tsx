import { redirect } from 'next/navigation';

import { AuthPageShell } from '@/components/auth/page-shell';
import { ResendVerificationForm } from '@/components/auth/email/resend-form';
import { getCurrentUser } from '@/lib/auth/session';

/**
 * Resend Verification Email Page
 *
 * Server Component. Redirects already-authenticated users away before
 * rendering the recovery form.
 * Standalone page where users can request a new verification email.
 * Linked from: verification reminder emails (cron), expired token error state.
 *
 * Data flow: no props passed to ResendVerificationForm — it manages its own
 * form state and calls the resendVerificationEmail server action directly.
 *
 * @returns AuthPageShell wrapping the resend verification form
 */
export default async function ResendVerificationPage() {
	if (await getCurrentUser()) {
		redirect('/browse');
	}

	return (
		<AuthPageShell>
			<ResendVerificationForm />
		</AuthPageShell>
	);
}
